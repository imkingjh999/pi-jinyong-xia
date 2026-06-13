/**
 * 武功系统 - 等级、经验、状态管理、成就、校验
 *
 * 等级体系（参考武侠世界）：
 *   1-10:  江湖小虾米
 *   11-20: 初窥门径
 *   21-30: 小有所成
 *   31-40: 身手不凡
 *   41-50: 名动一方
 *   51-60: 威震武林
 *   61-70: 一代宗师
 *   71-80: 登峰造极
 *   81-90: 返璞归真
 *   91-99: 天下无敌
 *   100:   武林至尊
 */

// Re-export everything from sub-modules
export type { Element } from "./wuxue-types.js";
export { ELEMENT_SYMBOL, getElementMultiplier, getElementBonusLabel, OVERCOMES, GENERATES } from "./wuxue-types.js";
export type { WuxueState, Skill, SkillDef, WeaponDef, ItemDef, BossDef, DropResult, BattleLog, BattleResult } from "./wuxue-types.js";

export { SKILL_POOL, MAX_SKILLS, EXCLUSIVE_SKILL_IDS, WEAPON_DEFS, ITEM_DEFS,
	getRandomSkill, getShopSkills, getRandomUnownedSkill, getSkill,
	getSkillXpToNext, addSkillXp, getSkillPrice,
	getWeaponDef, getRaritySymbol, getItemDef, useItem } from "./wuxue-data.js";

export { getLocation, getEvent, generateEncounter } from "./wuxue-encounter.js";

export { BOSS_DEFS, getBossForLevel, fightBoss, initBattleState, executeBattleTurn, finalizeBattle, rollDice } from "./wuxue-boss.js";

// 新系统
export { FACTIONS, getFaction, getAllFactions, getFactionBonus, getFactionRankTitle, getFactionRankIndex, addContribution } from "./wuxue-faction.js";
export type { FactionDef } from "./wuxue-faction.js";
export { PROFESSIONS, getProfession, getAllProfessions, getProfessionBonus } from "./wuxue-profession.js";
export type { ProfessionDef } from "./wuxue-profession.js";
export { TALENTS, getTalent, getAllTalents, getTalentsByBranch, calculateTalentBonuses, canLearnTalent, getTalentPointsPerLevel, getBranchName, getBranchEmoji } from "./wuxue-talent.js";
export type { TalentDef } from "./wuxue-talent.js";
export { ACHIEVEMENT_DEFS, ACHIEVEMENT_CATEGORIES, getAchievementDef, getAllAchievementDefs, getAchievementsByCategory, getRarityLabel, getRarityColor, getRarityEmoji } from "./wuxue-achievements.js";
export type { AchievementDef, AchievementCategory } from "./wuxue-achievements.js";

import type { Element, WuxueState, Skill } from "./wuxue-types.js";
import { getWeaponDef, getSkill, getItemDef } from "./wuxue-data.js";
import { BOSS_DEFS } from "./wuxue-boss.js";

// ═══════════════════════════════════════════════════════════════════════════
// 等级 & 属性
// ═══════════════════════════════════════════════════════════════════════════

const LEVEL_TITLES: [number, string][] = [
	[1, "江湖小虾米"], [11, "初窥门径"], [21, "小有所成"], [31, "身手不凡"],
	[41, "名动一方"], [51, "威震武林"], [61, "一代宗师"], [71, "登峰造极"],
	[81, "返璞归真"], [91, "天下无敌"], [100, "武林至尊"],
];

export function getLevelTitle(level: number): string {
	for (let i = LEVEL_TITLES.length - 1; i >= 0; i--) {
		if (level >= LEVEL_TITLES[i]![0]) return LEVEL_TITLES[i]![1];
	}
	return "江湖小虾米";
}

export function xpForLevel(level: number): number {
	return Math.floor(100 * Math.pow(1.15, level - 1));
}

export function getWuli(state: WuxueState, weaponAttack: number): number {
	const sl = state.skills.filter(s => s.unlocked).reduce((sum, s) => sum + s.level, 0);
	return state.level * 2 + sl * 3 + Math.floor(weaponAttack * 0.5);
}

export function updateCombatStats(state: WuxueState, weaponAttack: number): void {
	const sl = state.skills.filter(s => s.unlocked).reduce((sum, s) => sum + s.level, 0);
	state.attack = state.level + sl * 2 + weaponAttack;

	// 确保 hp/maxHp 存在且有效
	if (!state.maxHp || typeof state.maxHp !== 'number' || state.maxHp <= 0) {
		state.maxHp = 100 + (state.level - 1) * 10;
	}
	if (typeof state.hp !== 'number' || isNaN(state.hp) || state.hp <= 0) {
		state.hp = state.maxHp;
	}
	state.hp = Math.min(state.hp, state.maxHp);

	state.defense = Math.floor((state.hp / state.maxHp) * (10 + state.level));
}

// ═══════════════════════════════════════════════════════════════════════════
// 技能
// ═══════════════════════════════════════════════════════════════════════════

const SKILL_DEFS: Omit<Skill, "xp">[] = [
	{ id: "neigong", name: "内功心法", level: 0, description: "调息吐纳，积蓄内力", unlocked: false, element: "土" },
	{ id: "qinggong", name: "轻功身法", level: 0, description: "身轻如燕，步履轻盈", unlocked: false, element: "水" },
	{ id: "quanfa", name: "拳脚功夫", level: 0, description: "拳拳到肉，脚脚生风", unlocked: false, element: "火" },
	{ id: "jianfa", name: "剑法精要", level: 0, description: "剑走偏锋，出神入化", unlocked: false, element: "金" },
	{ id: "zhangfa", name: "掌法奥义", level: 0, description: "掌力雄浑，开山裂石", unlocked: false, element: "火" },
	{ id: "zhenfa", name: "阵法韬略", level: 0, description: "排兵布阵，运筹帷幄", unlocked: false, element: "土" },
	{ id: "yixue", name: "医术丹道", level: 0, description: "悬壶济世，妙手回春", unlocked: false, element: "木" },
	{ id: "anqi", name: "暗器手法", level: 0, description: "百步穿杨，暗器无双", unlocked: false, element: "金" },
];

const SKILL_UNLOCK_LEVEL: Record<string, number> = {
	neigong: 1, quanfa: 1, qinggong: 5, jianfa: 10,
	zhangfa: 15, yixue: 20, anqi: 25, zhenfa: 35,
};

// ═══════════════════════════════════════════════════════════════════════════
// 状态管理
// ═══════════════════════════════════════════════════════════════════════════

export function createInitialState(): WuxueState {
	const skills = SKILL_DEFS.map(def => ({ ...def, xp: 0 }));
	for (const skill of skills) skill.unlocked = (SKILL_UNLOCK_LEVEL[skill.id] ?? 999) <= 1;

	return {
		level: 1, xp: 0, xpToNext: xpForLevel(1), totalXp: 0,
		hp: 100, maxHp: 100,
		attack: 10, defense: 5, gold: 100,
		skills, achievements: [],
		totalTrainings: 0, totalFeeds: 0, totalCommands: 0, totalEdits: 0, totalErrors: 0,
		items: {}, attackBuff: 0, defenseBuff: 0, xpBonus: 1,
	};
}

/** 补齐老存档中 skills 缺失的 element 等字段 */
export function migrateSkills(skills: Skill[]): void {
	for (const skill of skills) {
		const def = SKILL_DEFS.find(d => d.id === skill.id);
		if (def) {
			if (!skill.element) skill.element = def.element;
			if (!skill.description) skill.description = def.description;
		}
	}
}

export function addXp(state: WuxueState, amount: number): { leveledUp: boolean; newLevel: number } {
	state.xp += amount;
	state.totalXp += amount;
	let leveledUp = false;

	while (state.xp >= state.xpToNext && state.level < 100) {
		state.xp -= state.xpToNext;
		state.level++;
		state.xpToNext = xpForLevel(state.level);
		leveledUp = true;

		// 升级时提升最大血量并恢复部分血量（非满血）
		const oldMaxHp = state.maxHp;
		state.maxHp = 100 + (state.level - 1) * 10;
		// 按旧血量比例恢复，额外回复 20%
		state.hp = Math.min(state.maxHp, Math.floor(state.hp / oldMaxHp * state.maxHp) + Math.floor(state.maxHp * 0.2));

		for (const skill of state.skills) {
			if (!skill.unlocked && (SKILL_UNLOCK_LEVEL[skill.id] ?? 999) <= state.level) {
				skill.unlocked = true;
				skill.level = 1;
			}
		}
	}
	return { leveledUp, newLevel: state.level };
}

export function feed(state: WuxueState): { xpGain: number; goldGain: number; leveledUp: boolean } {
	// 喂食恢复少量血量
	state.hp = Math.min(state.maxHp, state.hp + state.maxHp * 0.1);
	state.totalFeeds++;
	const goldGain = 2;
	state.gold += goldGain;
	const xpGain = 20;
	const { leveledUp } = addXp(state, xpGain);
	return { xpGain, goldGain, leveledUp };
}

/** 获取最大血量（随等级增长） */
export function getMaxHp(level: number): number {
	return 100 + (level - 1) * 10;
}

/** 恢复血量到满（用于tick自然回复或复活） */
export function recoverHp(state: WuxueState): void {
	state.hp = state.maxHp;
}

export function train(state: WuxueState, skillId?: string): { success: boolean; xpGain: number; goldGain: number; leveledUp: boolean; skillUp: boolean; msg: string } {
	if (state.hp < state.maxHp * 0.1) return { success: false, xpGain: 0, goldGain: 0, leveledUp: false, skillUp: false, msg: "血量不足，无法修炼！" };
	state.hp = Math.max(1, state.hp - state.maxHp * 0.05);
	state.totalTrainings++;

	const multiplier = state.xpBonus;
	state.xpBonus = 1;
	const baseXp = Math.floor((30 + Math.floor(Math.random() * 20)) * multiplier);
	const goldGain = 3 + Math.floor(Math.random() * 6);
	state.gold += goldGain;
	const { leveledUp } = addXp(state, baseXp);

	let skillUp = false;
	let skillName = "";
	if (skillId) {
		const skill = state.skills.find(s => s.id === skillId && s.unlocked);
		if (skill) {
			skill.xp += 15;
			skillName = skill.name;
			if (skill.xp >= skill.level * 50 && skill.level < 10) { skill.xp = 0; skill.level++; skillUp = true; }
		}
	}

	const msg = skillId && skillName ? `修炼${skillName}${skillUp ? "，技能提升！" : ""}` : "修炼内力中...";
	return { success: true, xpGain: baseXp, goldGain, leveledUp, skillUp, msg };
}

export function tick(state: WuxueState): void {
	state.hp = Math.min(state.maxHp, state.hp + state.maxHp * 0.01);
	// 自然回血：每tick回复少量血量
	const mhp = state.maxHp || (100 + (state.level - 1) * 10);
	if (!state.hp || isNaN(state.hp)) state.hp = mhp;
	state.hp = Math.min(mhp, state.hp + Math.max(1, Math.floor(mhp * 0.02)));
}

export function recordEvent(state: WuxueState, type: "command" | "edit" | "error" | "tool"): { xpGain: number; goldGain: number; leveledUp: boolean } | null {
	let xp = 0, goldGain = 0;
	switch (type) {
		case "command": state.totalCommands++; xp = 5; goldGain = 2; break;
		case "edit": state.totalEdits++; xp = 10; goldGain = 5; break;
		case "error": state.totalErrors++; xp = 2; break;
		case "tool": xp = 3; goldGain = 1; break;
		default: return null;
	}
	state.gold += goldGain;
	const { leveledUp } = addXp(state, xp);
	return { xpGain: xp, goldGain, leveledUp };
}


// ═══════════════════════════════════════════════════════════════════════════
// 成就
// ═══════════════════════════════════════════════════════════════════════════

interface AchievementDef { id: string; name: string; description: string; check: (state: WuxueState) => boolean; }

const ACHIEVEMENT_DEFS: AchievementDef[] = [
	// ── 原有成就 ──
	{ id: "first_train", name: "初入江湖", description: "第一次修炼", check: s => s.totalTrainings >= 1 },
	{ id: "train_10", name: "勤学苦练", description: "修炼10次", check: s => s.totalTrainings >= 10 },
	{ id: "train_50", name: "百折不挠", description: "修炼50次", check: s => s.totalTrainings >= 50 },
	{ id: "level_10", name: "崭露头角", description: "达到10级", check: s => s.level >= 10 },
	{ id: "level_30", name: "名动一方", description: "达到30级", check: s => s.level >= 30 },
	{ id: "level_50", name: "威震武林", description: "达到50级", check: s => s.level >= 50 },
	{ id: "level_100", name: "武林至尊", description: "达到100级", check: s => s.level >= 100 },
	{ id: "edit_100", name: "勤修代码", description: "编辑100次", check: s => s.totalEdits >= 100 },
	{ id: "gold_1000", name: "小有积蓄", description: "1000金币", check: s => s.gold >= 1000 },
	{ id: "gold_10000", name: "富甲一方", description: "10000金币", check: s => s.gold >= 10000 },

	// ══════════════════════════════════════════════════════════════════════
	// 武功类 (20)
	// ══════════════════════════════════════════════════════════════════════
	{ id: "skill_master_5", name: "武功小成", description: "任一武功升至5级", check: s => s.skills.some(sk => sk.unlocked && sk.level >= 5) },
	{ id: "skill_master_8", name: "武功大成", description: "任一武功升至8级", check: s => s.skills.some(sk => sk.unlocked && sk.level >= 8) },
	{ id: "skill_master_10", name: "武功圆满", description: "任一武功升至10级满级", check: s => s.skills.some(sk => sk.unlocked && sk.level >= 10) },
	{ id: "element_master", name: "五行精通", description: "习得全部五行属性武功", check: s => { const els = new Set(s.skills.filter(sk => sk.unlocked).map(sk => sk.element)); return ["金","木","水","火","土"].every(e => els.has(e as any)); } },
	{ id: "dual_element", name: "双元素师", description: "掌握2种不同元素武功", check: s => new Set(s.skills.filter(sk => sk.unlocked).map(sk => sk.element)).size >= 2 },
	{ id: "tri_element", name: "三元素师", description: "掌握3种不同元素武功", check: s => new Set(s.skills.filter(sk => sk.unlocked).map(sk => sk.element)).size >= 3 },
	{ id: "all_elements", name: "五行归一", description: "掌握全部5种元素武功", check: s => new Set(s.skills.filter(sk => sk.unlocked).map(sk => sk.element)).size >= 5 },
	{ id: "skill_diversity_3", name: "博采众长", description: "同时掌握3门武功", check: s => s.skills.filter(sk => sk.unlocked).length >= 3 },
	{ id: "skill_diversity_5", name: "融会贯通", description: "同时掌握5门武功", check: s => s.skills.filter(sk => sk.unlocked).length >= 5 },
	{ id: "skill_diversity_7", name: "万法归宗", description: "同时掌握7门武功", check: s => s.skills.filter(sk => sk.unlocked).length >= 7 },
	{ id: "first_skill_lv5", name: "初窥堂奥", description: "首个武功达到5级", check: s => s.skills.filter(sk => sk.unlocked).some(sk => sk.level >= 5) },
	{ id: "first_skill_lv10", name: "登峰造极", description: "首个武功达到10级", check: s => s.skills.filter(sk => sk.unlocked).some(sk => sk.level >= 10) },
	{ id: "skill_xp_1000", name: "内力初聚", description: "武功经验累计1000", check: s => s.skills.reduce((a, sk) => a + sk.xp, 0) >= 1000 },
	{ id: "skill_xp_5000", name: "内力浑厚", description: "武功经验累计5000", check: s => s.skills.reduce((a, sk) => a + sk.xp, 0) >= 5000 },
	{ id: "skill_xp_10000", name: "内力如海", description: "武功经验累计10000", check: s => s.skills.reduce((a, sk) => a + sk.xp, 0) >= 10000 },
	{ id: "max_skills_reached", name: "武功满载", description: "武功栏位已满", check: s => s.skills.filter(sk => sk.unlocked).length >= 5 },
	{ id: "exclusive_skill", name: "独门绝学", description: "获得一门专属武功", check: s => { const excl = new Set(["douzhuan","wuxue-dianpin","liumai","lingbo","xianglong","dagou","bingxue","jiuyin","bihai","zuoyou","jiuyin-zhuazhao","anran","dugu","yirong","eymei-jianfa","qiankun","jiuyang","moulue","tanzhi","qinyin","huagu","ningbi","hujiadao","lanxin","yangjia-qiang","nizhao"]); return s.skills.some(sk => sk.unlocked && excl.has(sk.id)); } },
	{ id: "rare_skill", name: "稀有绝技", description: "习得一门稀有武功", check: s => { const rare = new Set(["jiuyang","jiuyin","dugu","xianglong","qiankun","liumai"]); return s.skills.some(sk => sk.unlocked && rare.has(sk.id)); } },
	{ id: "legendary_skill", name: "旷世奇功", description: "同时拥有九阳神功和九阴真经", check: s => { const ids = new Set(s.skills.filter(sk => sk.unlocked).map(sk => sk.id)); return ids.has("jiuyang") && ids.has("jiuyin"); } },
	{ id: "total_xp_10000", name: "经验丰富", description: "累计经验达到10000", check: s => s.totalXp >= 10000 },
	{ id: "total_xp_100000", name: "经验大师", description: "累计经验达到100000", check: s => s.totalXp >= 100000 },

	// ══════════════════════════════════════════════════════════════════════
	// 战斗类 (15)
	// ══════════════════════════════════════════════════════════════════════
	{ id: "boss_10_wins", name: "十战十胜", description: "击败10个Boss", check: s => (s as any).bossesDefeated >= 10 },
	{ id: "boss_25_wins", name: "百战之师", description: "击败25个Boss", check: s => (s as any).bossesDefeated >= 25 },
	{ id: "boss_50_wins", name: "战无不胜", description: "击败50个Boss", check: s => (s as any).bossesDefeated >= 50 },
	{ id: "boss_100_wins", name: "天下无敌", description: "击败100个Boss", check: s => (s as any).bossesDefeated >= 100 },
	{ id: "boss_streak_3", name: "三连胜", description: "连续击败3个Boss", check: s => (s as any).bossStreak >= 3 },
	{ id: "boss_streak_5", name: "五连胜", description: "连续击败5个Boss", check: s => (s as any).bossStreak >= 5 },
	{ id: "boss_streak_10", name: "十连胜", description: "连续击败10个Boss", check: s => (s as any).bossStreak >= 10 },
	{ id: "boss_perfect", name: "毫发无损", description: "满血击败Boss", check: s => !!(s as any).bossPerfectWin },
	{ id: "boss_low_hp_win", name: "绝地反击", description: "血量低于10%时击败Boss", check: s => !!(s as any).bossLowHpWin },
	{ id: "boss_underdog", name: "以弱胜强", description: "击败高于自身等级的Boss", check: s => !!(s as any).bossUnderdogWin },
	{ id: "boss_element_counter", name: "五行克制", description: "以克制属性击败Boss", check: s => !!(s as any).bossElementCounterWin },
	{ id: "boss_one_shot", name: "一击必杀", description: "一回合击败Boss", check: s => !!(s as any).bossOneShotWin },
	{ id: "survived_boss", name: "死里逃生", description: "Boss战失败后幸存", check: s => !!(s as any).bossSurvived },
	{ id: "boss_all_types", name: "全能斗士", description: "击败所有种类Boss", check: s => !!(s as any).bossAllTypesDefeated },
	{ id: "boss_legendary", name: "传说猎手", description: "击败传说级Boss", check: s => !!(s as any).bossLegendaryDefeated },

	// ══════════════════════════════════════════════════════════════════════
	// 财富类 (15)
	// ══════════════════════════════════════════════════════════════════════
	{ id: "gold_100", name: "初识金银", description: "持有100金币", check: s => s.gold >= 100 },
	{ id: "gold_500", name: "小有所获", description: "持有500金币", check: s => s.gold >= 500 },
	{ id: "gold_5000", name: "腰缠万贯", description: "持有5000金币", check: s => s.gold >= 5000 },
	{ id: "gold_50000", name: "富可敌国", description: "持有50000金币", check: s => s.gold >= 50000 },
	{ id: "gold_100000", name: "财神转世", description: "持有100000金币", check: s => s.gold >= 100000 },
	{ id: "first_purchase", name: "初次消费", description: "第一次在商店购买", check: s => !!(s as any).totalPurchases },
	{ id: "shop_10_buys", name: "常客光临", description: "商店购买10次", check: s => ((s as any).totalPurchases ?? 0) >= 10 },
	{ id: "shop_50_buys", name: "购物达人", description: "商店购买50次", check: s => ((s as any).totalPurchases ?? 0) >= 50 },
	{ id: "shop_100_buys", name: "挥金如土", description: "商店购买100次", check: s => ((s as any).totalPurchases ?? 0) >= 100 },
	{ id: "sell_weapon", name: "弃旧迎新", description: "出售过一把武器", check: s => !!(s as any).weaponsSold },
	{ id: "go_bankrupt", name: "一贫如洗", description: "金币归零", check: s => s.gold <= 0 && s.totalTrainings > 0 },
	{ id: "gold_from_boss", name: "战利品", description: "从Boss战获得金币", check: s => !!(s as any).goldFromBoss },
	{ id: "gold_from_encounter", name: "意外之财", description: "从奇遇获得金币", check: s => !!(s as any).goldFromEncounter },
	{ id: "generous", name: "一掷千金", description: "累计消费10000金币以上", check: s => ((s as any).totalGoldSpent ?? 0) >= 10000 },
	{ id: "gold_earned_total", name: "日进斗金", description: "累计获得50000金币", check: s => ((s as any).totalGoldEarned ?? 0) >= 50000 },

	// ══════════════════════════════════════════════════════════════════════
	// 江湖类 (15)
	// ══════════════════════════════════════════════════════════════════════
	{ id: "level_5", name: "初出茅庐", description: "达到5级", check: s => s.level >= 5 },
	{ id: "level_20", name: "小有所成", description: "达到20级", check: s => s.level >= 20 },
	{ id: "level_40", name: "身手不凡", description: "达到40级", check: s => s.level >= 40 },
	{ id: "level_60", name: "威震武林", description: "达到60级", check: s => s.level >= 60 },
	{ id: "level_80", name: "登峰造极", description: "达到80级", check: s => s.level >= 80 },
	{ id: "first_encounter", name: "江湖初遇", description: "第一次触发奇遇", check: s => !!(s as any).totalEncounters },
	{ id: "encounter_50", name: "见多识广", description: "触发50次奇遇", check: s => ((s as any).totalEncounters ?? 0) >= 50 },
	{ id: "encounter_100", name: "阅历丰富", description: "触发100次奇遇", check: s => ((s as any).totalEncounters ?? 0) >= 100 },
	{ id: "encounter_500", name: "阅尽千帆", description: "触发500次奇遇", check: s => ((s as any).totalEncounters ?? 0) >= 500 },
	{ id: "lucky_encounter", name: "福星高照", description: "触发稀有奇遇", check: s => !!(s as any).luckyEncounter },
	{ id: "unlucky_encounter", name: "霉运当头", description: "奇遇中丢失金币", check: s => !!(s as any).unluckyEncounter },
	{ id: "wanderer", name: "浪迹天涯", description: "到访所有地点", check: s => !!(s as any).allLocationsVisited },
	{ id: "veteran", name: "老江湖", description: "游戏超过100个回合", check: s => s.totalTrainings + s.totalCommands + s.totalEdits >= 100 },
	{ id: "command_500", name: "勤勉修行", description: "执行500次命令", check: s => s.totalCommands >= 500 },
	{ id: "edit_1000", name: "代码大师", description: "编辑1000次", check: s => s.totalEdits >= 1000 },

	// ══════════════════════════════════════════════════════════════════════
	// 任务类 (15)
	// ══════════════════════════════════════════════════════════════════════
	{ id: "first_mission", name: "初领使命", description: "完成第一个任务", check: s => !!(s as any).missionsCompleted },
	{ id: "mission_10", name: "身经百战", description: "完成10个任务", check: s => ((s as any).missionsCompleted ?? 0) >= 10 },
	{ id: "mission_25", name: "使命必达", description: "完成25个任务", check: s => ((s as any).missionsCompleted ?? 0) >= 25 },
	{ id: "mission_50", name: "功勋卓著", description: "完成50个任务", check: s => ((s as any).missionsCompleted ?? 0) >= 50 },
	{ id: "mission_100", name: "一代传奇", description: "完成100个任务", check: s => ((s as any).missionsCompleted ?? 0) >= 100 },
	{ id: "mission_all_types", name: "全能行者", description: "完成所有类型任务", check: s => !!(s as any).allMissionTypesCompleted },
	{ id: "mission_perfect_success", name: "十全十美", description: "完美完成任务", check: s => !!(s as any).missionPerfectSuccess },
	{ id: "mission_failed", name: "功亏一篑", description: "任务失败一次", check: s => !!(s as any).missionFailedOnce },
	{ id: "mission_high_risk", name: "虎口拔牙", description: "完成高风险任务", check: s => !!(s as any).highRiskMissionCompleted },
	{ id: "mission_extreme_risk", name: "刀尖起舞", description: "完成极高风险任务", check: s => !!(s as any).extremeRiskMissionCompleted },
	{ id: "mission_planned", name: "运筹帷幄", description: "使用计划完成任务", check: s => !!(s as any).missionWithPlan },
	{ id: "mbti_analyzed", name: "知己知彼", description: "完成MBTI性格分析", check: s => !!(s as any).mbtiAnalyzed },
	{ id: "profile_completed", name: "江湖名帖", description: "完成个人档案", check: s => !!(s as any).profileCompleted },
	{ id: "mission_streak_3", name: "三连捷报", description: "连续完成3个任务", check: s => ((s as any).missionStreak ?? 0) >= 3 },
	{ id: "mission_streak_5", name: "五连捷报", description: "连续完成5个任务", check: s => ((s as any).missionStreak ?? 0) >= 5 },

	// ══════════════════════════════════════════════════════════════════════
	// 道具/装备类 (12)
	// ══════════════════════════════════════════════════════════════════════
	{ id: "first_weapon", name: "初获利器", description: "获得第一把武器", check: s => Object.keys(s.items).some(k => k.startsWith("weapon_")) },
	{ id: "weapon_rare", name: "良品在手", description: "获得良品武器", check: s => !!(s as any).rareWeaponObtained },
	{ id: "weapon_epic", name: "精品利器", description: "获得精品武器", check: s => !!(s as any).epicWeaponObtained },
	{ id: "weapon_legendary", name: "神器降临", description: "获得极品或神器武器", check: s => !!(s as any).legendaryWeaponObtained },
	{ id: "weapon_all_elements", name: "五行利器", description: "收集全部五行属性武器", check: s => !!(s as any).allElementWeapons },
	{ id: "first_item", name: "初次拾取", description: "获得第一个道具", check: s => Object.keys(s.items).length > 0 },
	{ id: "item_50_used", name: "道具达人", description: "使用50个道具", check: s => ((s as any).totalItemsUsed ?? 0) >= 50 },
	{ id: "owned_weapons_10", name: "兵甲入库", description: "拥有10把武器", check: s => ((s as any).totalWeaponsOwned ?? 0) >= 10 },
	{ id: "owned_weapons_20", name: "兵器库满", description: "拥有20把武器", check: s => ((s as any).totalWeaponsOwned ?? 0) >= 20 },
	{ id: "hp_full_restore", name: "妙手回春", description: "使用道具满血回复", check: s => !!(s as any).hpFullRestore },
	{ id: "all_items_collected", name: "收藏大家", description: "收集所有种类道具", check: s => !!(s as any).allItemsCollected },
	{ id: "train_100", name: "铁杵磨针", description: "修炼100次", check: s => s.totalTrainings >= 100 },
];

export function checkAchievements(state: WuxueState): string[] {
	const newA: string[] = [];
	for (const d of ACHIEVEMENT_DEFS) {
		if (!state.achievements.includes(d.id) && d.check(state)) { state.achievements.push(d.id); newA.push(d.name); }
	}
	return newA;
}
export function getAchievementDefs(): AchievementDef[] { return ACHIEVEMENT_DEFS; }

// ═══════════════════════════════════════════════════════════════════════════
// 强类型校验 (Runtime Validation)
// ═══════════════════════════════════════════════════════════════════════════

export class ValidationError extends Error {
	constructor(public readonly field: string, message: string) {
		super(`Validation error [${field}]: ${message}`);
		this.name = "ValidationError";
	}
}

/** 校验 WuxueState 的完整性 */
export function validateWuxueState(state: unknown): asserts state is WuxueState {
	if (typeof state !== "object" || state === null) throw new ValidationError("root", "state must be an object");
	const s = state as Record<string, unknown>;

	// 数值字段
	const numFields: (keyof WuxueState)[] = [
		"level", "xp", "xpToNext", "totalXp", "hp", "maxHp",
		"attack", "defense", "gold", "totalTrainings", "totalFeeds",
		"totalCommands", "totalEdits", "totalErrors", "attackBuff", "defenseBuff", "xpBonus",
	];
	for (const key of numFields) {
		if (typeof s[key] !== "number") throw new ValidationError(key, `expected number, got ${typeof s[key]}`);
		if ((s[key] as number) < 0) throw new ValidationError(key, `expected non-negative, got ${s[key]}`);
	}

	// 等级范围
	if ((s.level as number) < 1 || (s.level as number) > 100) throw new ValidationError("level", `level must be 1-100, got ${s.level}`);

	// HP 范围
	if ((s.hp as number) > (s.maxHp as number)) throw new ValidationError("hp", `hp (${s.hp}) cannot exceed maxHp (${s.maxHp})`);

	// 能量范围

	// xpBonus 范围
	if ((s.xpBonus as number) < 1) throw new ValidationError("xpBonus", `xpBonus must be >= 1, got ${s.xpBonus}`);

	// 数组字段
	if (!Array.isArray(s.skills)) throw new ValidationError("skills", "expected array");
	if (!Array.isArray(s.achievements)) throw new ValidationError("achievements", "expected array");

	// items 是 Record<string, number>
	if (typeof s.items !== "object" || s.items === null) throw new ValidationError("items", "expected object");
	for (const [k, v] of Object.entries(s.items as Record<string, unknown>)) {
		if (typeof v !== "number" || v < 0) throw new ValidationError(`items.${k}`, `expected non-negative number, got ${v}`);
	}

	// skills 验证
	for (let i = 0; i < (s.skills as unknown[]).length; i++) {
		const sk = (s.skills as Record<string, unknown>[])[i]!;
		if (typeof sk.id !== "string") throw new ValidationError(`skills[${i}].id`, "expected string");
		if (typeof sk.name !== "string") throw new ValidationError(`skills[${i}].name`, "expected string");
		if (typeof sk.level !== "number" || sk.level < 0) throw new ValidationError(`skills[${i}].level`, "expected non-negative number");
		if (typeof sk.xp !== "number" || sk.xp < 0) throw new ValidationError(`skills[${i}].xp`, "expected non-negative number");
		if (typeof sk.unlocked !== "boolean") throw new ValidationError(`skills[${i}].unlocked`, "expected boolean");
		const validElements = ["金", "木", "水", "火", "土"];
		if (!validElements.includes(sk.element as string)) throw new ValidationError(`skills[${i}].element`, `invalid element: ${sk.element}`);
	}
}

/** 校验 Element 类型 */
export function validateElement(el: string): asserts el is Element {
	const valid: Element[] = ["金", "木", "水", "火", "土"];
	if (!valid.includes(el as Element)) throw new ValidationError("element", `invalid element: ${el}`);
}

/** 校验武器 ID 有效性 */
export function validateWeaponId(id: string): void {
	if (!getWeaponDef(id)) throw new ValidationError("weaponId", `unknown weapon: ${id}`);
}

/** 校验武功 ID 有效性 */
export function validateSkillId(id: string): void {
	if (!getSkill(id)) throw new ValidationError("skillId", `unknown skill: ${id}`);
}

/** 校验 Boss ID 有效性 */
export function validateBossId(id: string): void {
	if (!BOSS_DEFS.find(b => b.id === id)) throw new ValidationError("bossId", `unknown boss: ${id}`);
}

/** 校验道具 ID 有效性 */
export function validateItemId(id: string): void {
	if (!getItemDef(id)) throw new ValidationError("itemId", `unknown item: ${id}`);
}

