/**
 * wuxue-profession.ts — 职业系统
 * 江湖职业，每个职业有属性加成方向和专属被动
 */

import type { Element } from "./wuxue-types.js";

export interface ProfessionDef {
	id: string;
	name: string;
	emoji: string;
	description: string;
	element: Element;
	bonuses: {
		attack: number;   // 攻击加成%
		defense: number;  // 防御加成%
		hp: number;       // 血量加成%
		xp: number;       // 经验加成%
		gold: number;     // 金币加成%
	};
	special: string;      // 职业特技名称
	specialDesc: string;  // 职业特技描述
	passive: string;      // 被动效果描述
}

export const PROFESSIONS: ProfessionDef[] = [
	{
		id: "swordsman",
		name: "剑客",
		emoji: "⚔️",
		description: "剑走偏锋，一剑封喉",
		element: "金",
		bonuses: { attack: 15, defense: 3, hp: 0, xp: 5, gold: 0 },
		special: "剑意",
		specialDesc: "剑法伤害+20%",
		passive: "每10次编辑触发「剑气纵横」，额外+15经验",
	},
	{
		id: "boxer",
		name: "拳师",
		emoji: "👊",
		description: "拳拳到肉，刚猛无俦",
		element: "火",
		bonuses: { attack: 12, defense: 8, hp: 5, xp: 0, gold: 0 },
		special: "铁拳",
		specialDesc: "近战伤害+15%，防御+10%",
		passive: "Boss战暴击率+10%",
	},
	{
		id: "assassin",
		name: "暗器手",
		emoji: "🎯",
		description: "百步穿杨，杀人于无形",
		element: "金",
		bonuses: { attack: 10, defense: 0, hp: 0, xp: 0, gold: 10 },
		special: "暗影突袭",
		specialDesc: "首回合伤害+30%",
		passive: "遭遇战斗时20%概率先手制敌，额外+10金币",
	},
	{
		id: "healer",
		name: "医者",
		emoji: "💊",
		description: "悬壶济世，妙手回春",
		element: "木",
		bonuses: { attack: 0, defense: 5, hp: 15, xp: 10, gold: 0 },
		special: "妙手回春",
		specialDesc: "每回合恢复5%最大HP",
		passive: "使用道具效果+50%，经验获取+10%",
	},
	{
		id: "strategist",
		name: "谋士",
		emoji: "📜",
		description: "运筹帷幄，决胜千里",
		element: "水",
		bonuses: { attack: 5, defense: 10, hp: 5, xp: 15, gold: 5 },
		special: "智谋",
		specialDesc: "骰子事件触发率+20%",
		passive: "任务完成奖励+20%金币和经验",
	},
	{
		id: "rogue",
		name: "刺客",
		emoji: "🥷",
		description: "来无影去无踪，十步杀一人",
		element: "水",
		bonuses: { attack: 18, defense: 0, hp: 0, xp: 5, gold: 8 },
		special: "致命一击",
		specialDesc: "15%概率造成双倍伤害",
		passive: "逃跑必定成功，逃跑时+5金币",
	},
	{
		id: "blacksmith",
		name: "铸师",
		emoji: "🔨",
		description: "千锤百炼，锻造神兵",
		element: "土",
		bonuses: { attack: 5, defense: 12, hp: 8, xp: 0, gold: 15 },
		special: "神兵锻造",
		specialDesc: "武器攻击力+15%",
		passive: "商铺购买武器8折，卖出道具价格+25%",
	},
	{
		id: "qimen",
		name: "奇门",
		emoji: "🔮",
		description: "奇门遁甲，五行八卦，无所不通",
		element: "土",
		bonuses: { attack: 8, defense: 8, hp: 5, xp: 12, gold: 8 },
		special: "五行轮转",
		specialDesc: "元素克制加成提升至1.8倍",
		passive: "所有属性小幅提升，无弱点属性",
	},
];

const PROFESSION_MAP = new Map(PROFESSIONS.map(p => [p.id, p]));

export function getProfession(id: string): ProfessionDef | undefined {
	return PROFESSION_MAP.get(id);
}

export function getAllProfessions(): ProfessionDef[] {
	return PROFESSIONS;
}

/** 计算职业加成 */
export function getProfessionBonus(professionId: string, level: number): {
	attack: number; defense: number; hp: number; xp: number; gold: number;
} {
	const prof = PROFESSION_MAP.get(professionId);
	if (!prof) return { attack: 0, defense: 0, hp: 0, xp: 0, gold: 0 };
	// 每10级加成+10%，上限+100%
	const mult = 1 + Math.min(level / 100, 1);
	return {
		attack: Math.round(prof.bonuses.attack * mult),
		defense: Math.round(prof.bonuses.defense * mult),
		hp: Math.round(prof.bonuses.hp * mult),
		xp: Math.round(prof.bonuses.xp * mult),
		gold: Math.round(prof.bonuses.gold * mult),
	};
}
