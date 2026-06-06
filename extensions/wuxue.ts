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
export { ELEMENT_SYMBOL, getElementMultiplier, OVERCOMES, GENERATES } from "./wuxue-types.js";
export type { WuxueState, Skill, SkillDef, WeaponDef, ItemDef, BossDef, DropResult, BattleLog, BattleResult } from "./wuxue-types.js";

export { SKILL_POOL, MAX_SKILLS, EXCLUSIVE_SKILL_IDS, WEAPON_DEFS, ITEM_DEFS,
	getRandomSkill, getShopSkills, getRandomUnownedSkill, getSkill,
	getSkillXpToNext, addSkillXp, getSkillPrice,
	getWeaponDef, getRaritySymbol, getItemDef, useItem } from "./wuxue-data.js";

export { getLocation, getEvent, generateEncounter } from "./wuxue-encounter.js";

export { BOSS_DEFS, getBossForLevel, fightBoss } from "./wuxue-boss.js";

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

		// 升级时提升最大血量并恢复满血
		state.maxHp = 100 + (state.level - 1) * 10;
		state.hp = state.maxHp;

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

