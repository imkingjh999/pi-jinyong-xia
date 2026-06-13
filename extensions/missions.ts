/**
 * 任务系统 v2 — MBTI 性格推导 + 风险匹配
 *
 * 核心设计：不从问卷推导 MBTI，而是从游戏行为自动推断
 *   - 选择什么任务 → 任务类型的 MBTI 标签
 *   - 怎么执行（计划选项） → 选项的 MBTI 维度映射
 *
 * 模块拆分：
 *   missions-mbti.ts      — MBTI 类型定义、推导、匹配
 *   missions-templates.ts  — 任务模板数据、标签工具
 *   missions.ts (本文件)   — 核心逻辑 + re-export
 */

import type { RiskLevel } from "./state.js";

// Re-export everything from sub-modules so existing imports keep working
export type { MBTIDimension, MBTIProfile, MBTIPlanOption } from "./missions-mbti.js";
export { calculateMBTIProfile, MBTI_DESCRIPTIONS, calculateMBTICompatibility } from "./missions-mbti.js";

export type { MissionTemplate } from "./missions-templates.js";
export {
	MISSION_TEMPLATES, PLAN_OPTIONS, getRandomPlanOptions,
	getRiskLabel, getCategoryLabel,
} from "./missions-templates.js";

// ═══════════════════════════════════════════════════════════════════════════
// 任务生成 & 匹配
// ═══════════════════════════════════════════════════════════════════════════

import { MISSION_TEMPLATES } from "./missions-templates.js";
import type { MissionTemplate } from "./missions-templates.js";

export function getAvailableMissions(_level: number): MissionTemplate[] {
	return MISSION_TEMPLATES;
}

export function recommendMissions(
	level: number,
	riskProfile: Record<RiskLevel, number>,
	count = 5,
): MissionTemplate[] {
	const available = getAvailableMissions(level);
	if (available.length === 0) return [];

	// 按风险分层
	const tiers: Record<RiskLevel, MissionTemplate[]> = {
		safe: [], low: [], medium: [], high: [], extreme: [],
	};
	for (const m of available) tiers[m.risk]?.push(m);

	// 打乱每层
	for (const k of Object.keys(tiers) as RiskLevel[]) {
		for (let i = tiers[k].length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[tiers[k][i], tiers[k][j]] = [tiers[k][j], tiers[k][i]];
		}
	}

	// 按比例抽取：每层至少填一些，保证多样性
	// 比例 safe:low:medium:high:extreme = 2:3:3:3:3
	const quotas: [RiskLevel, number][] = [
		["safe", 2], ["low", 3], ["medium", 3], ["high", 3], ["extreme", 3],
	];
	const totalWeight = quotas.reduce((s, q) => s + q[1], 0);
	const result: MissionTemplate[] = [];

	// 先按比例从每层取
	for (const [risk, weight] of quotas) {
		const n = Math.max(1, Math.round(count * weight / totalWeight));
		result.push(...tiers[risk].splice(0, n));
	}

	// 如果不够，从剩余任务中随机补
	const remaining = Object.values(tiers).flat();
	for (let i = remaining.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[remaining[i], remaining[j]] = [remaining[j], remaining[i]];
	}
	while (result.length < count && remaining.length > 0) {
		result.push(remaining.shift()!);
	}

	// 打乱最终顺序
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result.slice(0, count);
}

export function calculateMissionRewards(t: MissionTemplate, level: number) {
	const m = 1 + (level - t.minLevel) * 0.1;
	return {
		gold: Math.floor(t.goldBase[0] + Math.random() * (t.goldBase[1] - t.goldBase[0]) * m),
		xp: Math.floor(t.xpBase[0] + Math.random() * (t.xpBase[1] - t.xpBase[0]) * m),
		hpCost: Math.floor(t.hpCost[0] + Math.random() * (t.hpCost[1] - t.hpCost[0])),
	};
}

export function calculateSuccessRate(t: MissionTemplate, level: number): number {
	return Math.min(0.95, t.successRate + Math.min(0.3, (level - t.minLevel) * 0.02));
}

export function generateMissionId(): string {
	return `m_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}
