/**
 * wuxue-talent.ts — 成长天赋系统
 * 升级获得天赋点，从三条天赋路线中选择
 */

export interface TalentDef {
	id: string;
	name: string;
	emoji: string;
	branch: "combat" | "survival" | "fortune";  // 战斗/生存/财运
	tier: number;           // 层级 1-5（需要前一层解锁）
	description: string;
	effect: string;         // 效果描述
	bonuses: {
		attack?: number;
		defense?: number;
		hp?: number;
		xp?: number;
		gold?: number;
		critRate?: number;   // 暴击率+%
		dodgeRate?: number;  // 闪避率+%
		xpMulti?: number;    // 经验倍率+
		goldMulti?: number;  // 金币倍率+
	};
}

export const TALENTS: TalentDef[] = [
	// ── 战斗之路 (combat) ──
	{
		id: "c1-power", name: "蛮力", emoji: "💪", branch: "combat", tier: 1,
		description: "力大无穷，攻击提升",
		effect: "攻击+8%",
		bonuses: { attack: 8 },
	},
	{
		id: "c1-fury", name: "狂怒", emoji: "🔥", branch: "combat", tier: 1,
		description: "战斗中越战越勇",
		effect: "暴击率+5%",
		bonuses: { critRate: 5 },
	},
	{
		id: "c2-precision", name: "精准", emoji: "🎯", branch: "combat", tier: 2,
		description: "攻击精准致命",
		effect: "攻击+12%, 暴击率+5%",
		bonuses: { attack: 12, critRate: 5 },
	},
	{
		id: "c2-element", name: "元素亲和", emoji: "✨", branch: "combat", tier: 2,
		description: "与五行之力共鸣",
		effect: "元素克制加成提升至1.7倍",
		bonuses: { attack: 5 },
	},
	{
		id: "c3-swordmaster", name: "剑意通神", emoji: "⚔️", branch: "combat", tier: 3,
		description: "剑法达到化境",
		effect: "攻击+20%, 暴击率+10%",
		bonuses: { attack: 20, critRate: 10 },
	},
	{
		id: "c3-berserker", name: "狂战士", emoji: "👹", branch: "combat", tier: 3,
		description: "血量越低攻击越强",
		effect: "攻击+15%, HP<50%时攻击额外+15%",
		bonuses: { attack: 15 },
	},
	{
		id: "c4-wargod", name: "战神", emoji: "⚡", branch: "combat", tier: 4,
		description: "战神降世，所向披靡",
		effect: "攻击+25%, 暴击率+15%, 防御+10%",
		bonuses: { attack: 25, critRate: 15, defense: 10 },
	},
	{
		id: "c5-supreme", name: "无上剑道", emoji: "🗡️", branch: "combat", tier: 5,
		description: "剑道巅峰，万物为剑",
		effect: "攻击+35%, 暴击率+20%",
		bonuses: { attack: 35, critRate: 20 },
	},
	// ── 生存之路 (survival) ──
	{
		id: "s1-iron", name: "铁骨", emoji: "🛡️", branch: "survival", tier: 1,
		description: "筋骨如铁，防御提升",
		effect: "防御+8%, HP+5%",
		bonuses: { defense: 8, hp: 5 },
	},
	{
		id: "s1-heal", name: "自愈", emoji: "💚", branch: "survival", tier: 1,
		description: "身体恢复能力增强",
		effect: "HP回复速度+50%",
		bonuses: { hp: 5 },
	},
	{
		id: "s2-evasion", name: "闪避", emoji: "💨", branch: "survival", tier: 2,
		description: "身法灵动，闪避攻击",
		effect: "闪避率+8%, 防御+10%",
		bonuses: { dodgeRate: 8, defense: 10 },
	},
	{
		id: "s2-endurance", name: "耐力", emoji: "🫀", branch: "survival", tier: 2,
		description: "持久作战能力大增",
		effect: "HP+15%, 防御+8%",
		bonuses: { hp: 15, defense: 8 },
	},
	{
		id: "s3-regen", name: "生生不息", emoji: "🌿", branch: "survival", tier: 3,
		description: "内力生生不息",
		effect: "HP+20%, 防御+15%, 每回合回复8%HP",
		bonuses: { hp: 20, defense: 15 },
	},
	{
		id: "s3-immortal", name: "不坏金身", emoji: "🗿", branch: "survival", tier: 3,
		description: "练就不坏金身",
		effect: "防御+25%, HP+10%",
		bonuses: { defense: 25, hp: 10 },
	},
	{
		id: "s4-phoenix", name: "凤凰涅槃", emoji: "🔥", branch: "survival", tier: 4,
		description: "濒死时浴火重生",
		effect: "HP+25%, 防御+20%, 每场战斗免死一次",
		bonuses: { hp: 25, defense: 20 },
	},
	{
		id: "s5-immortal-body", name: "金刚不坏", emoji: "🛡️", branch: "survival", tier: 5,
		description: "万法不侵，金刚不坏",
		effect: "HP+35%, 防御+30%, 闪避+10%",
		bonuses: { hp: 35, defense: 30, dodgeRate: 10 },
	},
	// ── 财运之路 (fortune) ──
	{
		id: "f1-lucky", name: "幸运星", emoji: "🍀", branch: "fortune", tier: 1,
		description: "气运加身，好事连连",
		effect: "金币+8%, 经验+5%",
		bonuses: { gold: 8, xp: 5 },
	},
	{
		id: "f1-merchant", name: "商人眼光", emoji: "💰", branch: "fortune", tier: 1,
		description: "买卖精明，财运亨通",
		effect: "金币+12%",
		bonuses: { gold: 12 },
	},
	{
		id: "f2-scholar", name: "博学", emoji: "📚", branch: "fortune", tier: 2,
		description: "学贯中西，融会贯通",
		effect: "经验+15%, 金币+5%",
		bonuses: { xp: 15, gold: 5 },
	},
	{
		id: "f2-treasure", name: "寻宝", emoji: "💎", branch: "fortune", tier: 2,
		description: "总能发现隐藏的宝藏",
		effect: "金币+15%, 掉落物品品质提升",
		bonuses: { gold: 15 },
	},
	{
		id: "f3-enlighten", name: "悟性", emoji: "🧠", branch: "fortune", tier: 3,
		description: "天资聪颖，举一反三",
		effect: "经验+25%, 金币+10%",
		bonuses: { xp: 25, gold: 10 },
	},
	{
		id: "f3-fortune", name: "财运亨通", emoji: "🤑", branch: "fortune", tier: 3,
		description: "财源广进，日进斗金",
		effect: "金币+25%, 商铺折扣",
		bonuses: { gold: 25 },
	},
	{
		id: "f4-sage", name: "大智慧", emoji: "🌟", branch: "fortune", tier: 4,
		description: "通达世理，大智若愚",
		effect: "经验+30%, 金币+20%",
		bonuses: { xp: 30, gold: 20 },
	},
	{
		id: "f5-transcend", name: "天命所归", emoji: "👑", branch: "fortune", tier: 5,
		description: "天命在身，万事如意",
		effect: "经验+40%, 金币+30%, 全属性+10%",
		bonuses: { xp: 40, gold: 30, attack: 10, defense: 10, hp: 10 },
	},
];

const TALENT_MAP = new Map(TALENTS.map(t => [t.id, t]));

export function getTalent(id: string): TalentDef | undefined {
	return TALENT_MAP.get(id);
}

export function getAllTalents(): TalentDef[] {
	return TALENTS;
}

export function getTalentsByBranch(branch: "combat" | "survival" | "fortune"): TalentDef[] {
	return TALENTS.filter(t => t.branch === branch);
}

/** 计算已选天赋的总加成 */
export function calculateTalentBonuses(talentIds: string[]): TalentDef["bonuses"] {
	const total: TalentDef["bonuses"] = {};
	for (const id of talentIds) {
		const talent = TALENT_MAP.get(id);
		if (!talent) continue;
		for (const [key, val] of Object.entries(talent.bonuses)) {
			if (val !== undefined) {
				(total as any)[key] = ((total as any)[key] || 0) + val;
			}
		}
	}
	return total;
}

/** 检查是否可以学习某天赋（前置条件） */
export function canLearnTalent(talentId: string, learnedIds: string[], availablePoints: number): { ok: boolean; reason?: string } {
	const talent = TALENT_MAP.get(talentId);
	if (!talent) return { ok: false, reason: "天赋不存在" };
	if (learnedIds.includes(talentId)) return { ok: false, reason: "已学习此天赋" };
	if (availablePoints <= 0) return { ok: false, reason: "天赋点不足" };

	// 检查前置：需要同 branch 的 tier-1 已解锁
	if (talent.tier > 1) {
		const prevTier = TALENTS.filter(t => t.branch === talent.branch && t.tier === talent.tier - 1);
		const hasPrev = prevTier.some(t => learnedIds.includes(t.id));
		if (!hasPrev) return { ok: false, reason: `需要先解锁${talent.branch === "combat" ? "战斗" : talent.branch === "survival" ? "生存" : "财运"}之路第${talent.tier - 1}层天赋` };
	}

	return { ok: true };
}

/** 获取每级获得的天赋点数 */
export function getTalentPointsPerLevel(): number {
	return 1; // 每级1点
}

/** 获取天赋路线中文名 */
export function getBranchName(branch: "combat" | "survival" | "fortune"): string {
	return branch === "combat" ? "战斗之路" : branch === "survival" ? "生存之路" : "财运之路";
}

/** 获取天赋路线 emoji */
export function getBranchEmoji(branch: "combat" | "survival" | "fortune"): string {
	return branch === "combat" ? "⚔️" : branch === "survival" ? "🛡️" : "💰";
}
