/**
 * wuxue-faction.ts — 帮派/门派系统
 * 经典金庸门派，每个门派有属性加成、专属武功、等级称号
 */

import type { Element } from "./wuxue-types.js";

export interface FactionDef {
	id: string;
	name: string;
	emoji: string;
	description: string;
	element: Element;
	bonuses: {
		attack: number;
		defense: number;
		hp: number;
		xp: number;
		gold: number;
	};
	exclusiveSkills: string[];
	rankTitles: string[];
	lore: string;
	requirement: { level: number; gold: number };
}

export const FACTIONS: FactionDef[] = [
	{
		id: "shaolin",
		name: "少林寺",
		emoji: "🏛️",
		description: "天下武功出少林，七十二绝技威震武林",
		element: "金",
		bonuses: { attack: 5, defense: 15, hp: 10, xp: 0, gold: 0 },
		exclusiveSkills: ["yijin-jing", "luohan-fist", "vajra-palm"],
		rankTitles: ["俗家弟子", "武僧", "护院武僧", "达摩院首座", "方丈"],
		lore: "嵩山少林，千年古刹。达摩面壁九年，创七十二绝技，为武林正宗。",
		requirement: { level: 5, gold: 0 },
	},
	{
		id: "wudang",
		name: "武当派",
		emoji: "⛰️",
		description: "以柔克刚，太极之道，道法自然",
		element: "水",
		bonuses: { attack: 8, defense: 10, hp: 5, xp: 5, gold: 0 },
		exclusiveSkills: ["taiji-quan", "taiji-sword", "wudang-neigong"],
		rankTitles: ["记名弟子", "入室弟子", "真武殿弟子", "武当七侠", "掌门"],
		lore: "张三丰百岁创太极，以柔克刚，以静制动，开武当一派，与少林齐名。",
		requirement: { level: 5, gold: 0 },
	},
	{
		id: "emei",
		name: "峨眉派",
		emoji: "🏔️",
		description: "峨眉天下秀，剑法凌厉，女侠辈出",
		element: "木",
		bonuses: { attack: 12, defense: 5, hp: 5, xp: 8, gold: 0 },
		exclusiveSkills: ["emei-sword", "emei-thorn", "four-sword"],
		rankTitles: ["弟子", "师姐", "长老", "掌门师姐", "祖师"],
		lore: "郭襄创峨眉派，以剑法闻名天下，门下弟子多为女侠，刚柔并济。",
		requirement: { level: 3, gold: 0 },
	},
	{
		id: "gaibang",
		name: "丐帮",
		emoji: "🦯",
		description: "天下第一大帮，降龙十八掌震古烁今",
		element: "土",
		bonuses: { attack: 10, defense: 8, hp: 12, xp: 0, gold: 5 },
		exclusiveSkills: ["xianglong", "dagou", "beggar-qi"],
		rankTitles: ["一袋弟子", "三袋弟子", "五袋长老", "八袋长老", "帮主"],
		lore: "丐帮弟子遍布天下，行侠仗义，降龙十八掌与打狗棒法名震武林。",
		requirement: { level: 1, gold: 0 },
	},
	{
		id: "mingjiao",
		name: "明教",
		emoji: "🔥",
		description: "焚我残躯，熊熊圣火，生亦何欢，死亦何苦",
		element: "火",
		bonuses: { attack: 15, defense: 3, hp: 5, xp: 5, gold: 0 },
		exclusiveSkills: ["qiankun", "jiuyang", "shenghuo-ling"],
		rankTitles: ["火焰旗众", "五行旗使", "护教法王", "光明使者", "教主"],
		lore: "明教源自波斯，以圣火为尊。张无忌携九阳神功与乾坤大挪移登教主之位。",
		requirement: { level: 10, gold: 100 },
	},
	{
		id: "tianshan",
		name: "天山派",
		emoji: "❄️",
		description: "天山雪莲，冰清玉洁，八荒六合唯我独尊",
		element: "水",
		bonuses: { attack: 10, defense: 8, hp: 5, xp: 10, gold: 0 },
		exclusiveSkills: ["liuyang-palm", "zhemei-hand", "tianshan-sword"],
		rankTitles: ["雪女", "冰使", "灵鹫宫侍从", "天山童姥传人", "天山掌门"],
		lore: "天山灵鹫宫，八荒六合唯我独尊功，天山折梅手精妙绝伦。",
		requirement: { level: 8, gold: 50 },
	},
	{
		id: "huashan",
		name: "华山派",
		emoji: "⚔️",
		description: "华山论剑，剑气纵横，五岳独尊",
		element: "金",
		bonuses: { attack: 12, defense: 6, hp: 5, xp: 5, gold: 2 },
		exclusiveSkills: ["huashan-sword", "zixia-gong", "dugu-nine"],
		rankTitles: ["外门弟子", "内门弟子", "剑宗弟子", "长老", "掌门"],
		lore: "华山论剑，天下五绝。华山派剑法凌厉，分剑宗气宗，各有所长。",
		requirement: { level: 3, gold: 0 },
	},
	{
		id: "xiaoyao",
		name: "逍遥派",
		emoji: "🌊",
		description: "逍遥天地间，无拘无束，随心所欲",
		element: "木",
		bonuses: { attack: 8, defense: 5, hp: 5, xp: 15, gold: 5 },
		exclusiveSkills: ["beiming", "xiaoyao-you", "lingbo"],
		rankTitles: ["记名弟子", "入室弟子", "传人", "逍遥使者", "逍遥子"],
		lore: "逍遥派武功博大精深，北冥神功吸人内力，凌波微步飘然若仙。",
		requirement: { level: 12, gold: 200 },
	},
	{
		id: "taohua",
		name: "桃花岛",
		emoji: "🌸",
		description: "桃花影落飞神剑，碧海潮生按玉箫",
		element: "木",
		bonuses: { attack: 8, defense: 5, hp: 5, xp: 10, gold: 8 },
		exclusiveSkills: ["bihai", "tanzhi", "qimen"],
		rankTitles: ["门客", "弟子", "亲传弟子", "岛主传人", "岛主"],
		lore: "黄药师文武全才，奇门遁甲五行八卦无一不精，碧海潮生曲暗藏杀机。",
		requirement: { level: 8, gold: 100 },
	},
	{
		id: "riyue",
		name: "日月神教",
		emoji: "🌑",
		description: "千秋万载，一统江湖，日月神教，文成武德",
		element: "火",
		bonuses: { attack: 15, defense: 3, hp: 8, xp: 5, gold: 10 },
		exclusiveSkills: ["xixing", "kuixin-zhua", "heixin-zhua"],
		rankTitles: ["教众", "香主", "堂主", "长老", "教主"],
		lore: "日月神教，亦正亦邪。任我行吸星大法独步武林，东方不败葵花宝典天下无敌。",
		requirement: { level: 10, gold: 150 },
	},
];

const FACTION_MAP = new Map(FACTIONS.map(f => [f.id, f]));

export function getFaction(id: string): FactionDef | undefined {
	return FACTION_MAP.get(id);
}

export function getAllFactions(): FactionDef[] {
	return FACTIONS;
}

/** 计算门派加成（随贡献度递增） */
export function getFactionBonus(factionId: string, contribution: number): {
	attack: number; defense: number; hp: number; xp: number; gold: number;
} {
	const faction = FACTION_MAP.get(factionId);
	if (!faction) return { attack: 0, defense: 0, hp: 0, xp: 0, gold: 0 };
	const mult = 1 + Math.min(contribution / 1000, 1);
	return {
		attack: Math.round(faction.bonuses.attack * mult),
		defense: Math.round(faction.bonuses.defense * mult),
		hp: Math.round(faction.bonuses.hp * mult),
		xp: Math.round(faction.bonuses.xp * mult),
		gold: Math.round(faction.bonuses.gold * mult),
	};
}

/** 获取门派内等级称号 */
export function getFactionRankTitle(factionId: string, contribution: number): string {
	const faction = FACTION_MAP.get(factionId);
	if (!faction) return "散人";
	const titles = faction.rankTitles;
	if (contribution < 100) return titles[0];
	if (contribution < 500) return titles[1];
	if (contribution < 2000) return titles[2];
	if (contribution < 5000) return titles[3];
	return titles[4];
}

/** 获取门派等级索引 (0-4) */
export function getFactionRankIndex(contribution: number): number {
	if (contribution < 100) return 0;
	if (contribution < 500) return 1;
	if (contribution < 2000) return 2;
	if (contribution < 5000) return 3;
	return 4;
}

/** 增加门派贡献 */
export function addContribution(state: any, amount: number): void {
	if (!state.factionId) return;
	state.factionContribution = (state.factionContribution || 0) + amount;
}
