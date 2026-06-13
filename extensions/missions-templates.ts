/**
 * 任务模板数据 — 统一导出
 *
 * 本文件是 missions-templates 的公共入口，重新导出所有类型、常量和函数。
 * 消费者仍通过 import { MISSION_TEMPLATES, ... } from "./missions-templates.js" 引用。
 */

import type { RiskLevel } from "./state.js";

export type { MissionTemplate } from "./missions-templates-safe.js";
export { PLAN_OPTIONS, getRandomPlanOptions } from "./missions-templates-safe.js";

import { SAFE_LOW_TEMPLATES } from "./missions-templates-safe.js";
import { DANGER_TEMPLATES } from "./missions-templates-danger.js";

// ═══════════════════════════════════════════════════════════════════════════
// 合并模板数组
// ═══════════════════════════════════════════════════════════════════════════

export const MISSION_TEMPLATES = [...SAFE_LOW_TEMPLATES, ...DANGER_TEMPLATES];

// ═══════════════════════════════════════════════════════════════════════════
// 标签 & 工具
// ═══════════════════════════════════════════════════════════════════════════

const RISK_LABELS: Record<RiskLevel, string> = {
	safe: "🟢 安全", low: "🔵 低风险", medium: "🟡 中风险", high: "🟠 高风险", extreme: "🔴 极高风险",
};
const CATEGORY_LABELS: Record<string, string> = {
	escort: "🛡️ 护送", retrieval: "🔍 寻物", assassination: "⚔️ 刺杀",
	rescue: "救命", delivery: "📦 送货", investigation: "🕵️ 刺探", training: "📚 历练",
};

export function getRiskLabel(risk: RiskLevel): string { return RISK_LABELS[risk]; }
export function getCategoryLabel(cat: string): string { return CATEGORY_LABELS[cat] ?? cat; }
