/**
 * MBTI 性格推导 + 匹配
 */

import { MISSION_TEMPLATES } from "./missions-templates.js";
import { PLAN_OPTIONS } from "./missions-templates.js";

// ═══════════════════════════════════════════════════════════════════════════
// MBTI 类型
// ═══════════════════════════════════════════════════════════════════════════

export type MBTIDimension = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

export interface MBTIProfile {
	type: string;           // e.g. "INTJ"
	scores: {               // 每个维度的累计分数
		E: number; I: number;
		S: number; N: number;
		T: number; F: number;
		J: number; P: number;
	};
	confidence: number;     // 0-1, 数据量越多越高
	sampleSize: number;     // 基于多少次任务
}

export interface MBTIPlanOption {
	id: string;
	label: string;           // UI 显示文本
	dimension: MBTIDimension; // 选择的 MBTI 维度
}

// ═══════════════════════════════════════════════════════════════════════════
// MBTI 推导
// ═══════════════════════════════════════════════════════════════════════════

/** 从任务历史 + 计划选项推导 MBTI profile */
export function calculateMBTIProfile(
	missions: Array<{ templateId: string; planChoices?: string[] }>,
): MBTIProfile {
	const scores: MBTIProfile["scores"] = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

	for (const mission of missions) {
		// 任务类型贡献 (权重 1)
		const tmpl = MISSION_TEMPLATES.find(t => t.id === mission.templateId);
		if (tmpl) {
			for (const tag of tmpl.mbtiTags) {
				scores[tag] += 1;
			}
		}

		// 计划选项贡献 (权重 2 — 行为比选择更重要)
		if (mission.planChoices) {
			for (const choiceId of mission.planChoices) {
				const opt = PLAN_OPTIONS.find(o => o.id === choiceId);
				if (opt) {
					scores[opt.dimension] += 2;
				}
			}
		}
	}

	// 推导 4 字母
	const type =
		(scores.E >= scores.I ? "E" : "I") +
		(scores.S >= scores.N ? "S" : "N") +
		(scores.T >= scores.F ? "T" : "F") +
		(scores.J >= scores.P ? "J" : "P");

	const sampleSize = missions.length;
	const confidence = Math.min(1, sampleSize / 15); // 15 次任务达到 100% 置信度

	return { type, scores, confidence, sampleSize };
}

/** MBTI 类型描述 */
export const MBTI_DESCRIPTIONS: Record<string, { name: string; trait: string }> = {
	ISTJ: { name: "检查者", trait: "严谨可靠，按规矩办事" },
	ISFJ: { name: "守护者", trait: "忠诚温暖，默默守护他人" },
	INFJ: { name: "提倡者", trait: "深邃理想主义者，洞察人心" },
	INTJ: { name: "策略家", trait: "独立思考，长于战略布局" },
	ISTP: { name: "鉴赏家", trait: "冷静务实，擅长临场应变" },
	ISFP: { name: "探险家", trait: "温和随性，活在当下" },
	INFP: { name: "调停者", trait: "理想主义，内心世界丰富" },
	INTP: { name: "逻辑学家", trait: "理性分析，追求真理" },
	ESTP: { name: "企业家", trait: "大胆果断，享受冒险" },
	ESFP: { name: "表演者", trait: "热情洋溢，活在当下" },
	ENFP: { name: "竞选者", trait: "热忱创意，感染力强" },
	ENTP: { name: "辩论家", trait: "机智灵活，喜欢挑战常规" },
	ESTJ: { name: "总经理", trait: "高效务实，组织力强" },
	ESFJ: { name: "执政官", trait: "热心关怀，重视和谐" },
	ENFJ: { name: "主人公", trait: "感召力强，天生的领袖" },
	ENTJ: { name: "指挥官", trait: "果断强势，运筹帷幄" },
};

/** MBTI 匹配分数 (0-5) */
export function calculateMBTICompatibility(a: string, b: string): { score: number; desc: string } {
	if (a === b) return { score: 5, desc: "灵魂伙伴 — 完全相同的性格类型" };

	let matchScore = 0;
	const reasons: string[] = [];

	// N/S 互补最有价值
	if (a[1] !== b[1]) { matchScore += 1.5; reasons.push("思维互补"); }
	else { matchScore += 1; reasons.push("思维相似"); }

	// T/F 互补
	if (a[2] !== b[2]) { matchScore += 1.2; reasons.push("判断互补"); }
	else { matchScore += 0.8; }

	// E/I 相似更好
	if (a[0] === b[0]) { matchScore += 0.8; reasons.push("能量同频"); }
	else { matchScore += 1; reasons.push("内外互补"); }

	// J/P 相似更好
	if (a[3] === b[3]) { matchScore += 0.8; reasons.push("节奏合拍"); }
	else { matchScore += 0.7; reasons.push("节奏互补"); }

	return { score: Math.round(matchScore * 10) / 10, desc: reasons.join("·") };
}
