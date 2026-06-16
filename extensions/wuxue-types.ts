/**
 * 武功系统 - 类型定义与五行系统
 */

// ═══════════════════════════════════════════════════════════════════════════
// 五行
// ═══════════════════════════════════════════════════════════════════════════

export type Element = "金" | "木" | "水" | "火" | "土";

export const OVERCOMES: Record<Element, Element> = {
	"金": "木", "木": "土", "土": "水", "水": "火", "火": "金",
};
export const GENERATES: Record<Element, Element> = {
	"木": "火", "火": "土", "土": "金", "金": "水", "水": "木",
};

export const ELEMENT_SYMBOL: Record<Element, string> = {
	"金": "🤍", "木": "💚", "水": "💙", "火": "❤️", "土": "🟤",
};

export function getElementMultiplier(atk: Element, def: Element): number {
	if (OVERCOMES[atk] === def) return 1.5;
	if (OVERCOMES[def] === atk) return 0.7;
	return 1.0;
}

/** 返回元素加成标签："克制" | "被克" | "" */
export function getElementBonusLabel(atk: Element, def: Element): string {
	if (OVERCOMES[atk] === def) return "克制";
	if (OVERCOMES[def] === atk) return "被克";
	return "";
}

// ═══════════════════════════════════════════════════════════════════════════
// 核心类型
// ═══════════════════════════════════════════════════════════════════════════

export interface WuxueState {
	level: number;
	xp: number;
	xpToNext: number;
	totalXp: number;
	hp: number;
	maxHp: number;
	attack: number;
	defense: number;
	gold: number;
	skills: Skill[];
	achievements: string[];
	totalTrainings: number;
	totalFeeds: number;
	totalCommands: number;
	totalEdits: number;
	totalErrors: number;
	items: Record<string, number>;
	attackBuff: number;
	defenseBuff: number;
	xpBonus: number;
	bossesDefeated: number;   // 累计击败 Boss 次数（用于成就 + 遥测上报）
}

export interface Skill {
	id: string;
	name: string;
	level: number;
	xp: number;
	description: string;
	unlocked: boolean;
	element: Element;
}

export interface SkillDef {
	id: string;
	name: string;
	description: string;
	element: Element;
}

export interface WeaponDef {
	id: string;
	name: string;
	type: string;
	attack: number;
	rarity: "凡品" | "良品" | "精品" | "极品" | "神器";
	description: string;
	element: Element;
}

export interface ItemDef {
	id: string;
	name: string;
	type: "恢复" | "增益" | "武功";
	description: string;
	effect: { hp?: number; attackBuff?: number; defenseBuff?: number; xpBonus?: number };
}

export interface BossDef {
	id: string; name: string; title: string; element: Element;
	baseHp: number; baseAttack: number; baseDefense: number; description: string;
}

export interface DropResult {
	type: "encounter" | "battle" | "event" | "weapon" | "item" | "gold" | "skill_scroll" | "none";
	location?: string;
	name: string;
	description: string;
	weaponId?: string;
	itemId?: string;
	goldAmount?: number;
	xpAmount?: number;
	skillScrollId?: string;
	battleResult?: "win" | "lose" | "flee";
	hpChange?: number;
	encounterChar?: string;
}

export interface BattleLog { turn: number; attacker: string; damage: number; elementBonus: string; isSkillHit?: boolean; selfDamage?: number; }
export interface BattleResult {
	won: boolean; playerHp: number; bossHpLeft: number; bossName: string; bossElement: Element;
	logs: BattleLog[]; goldReward: number; xpReward: number; skillXpReward: number;
}

/** 手动战斗状态 */
export type TurnAction = "attack" | "skill" | "defend" | "item" | "flee";
export interface BattleState {
	playerHp: number;
	playerMaxHp: number;
	bossHp: number;
	bossMaxHp: number;
	bossName: string;
	bossElement: Element;
	turn: number;
	playerAtk: number;
	playerDef: number;
	bossAtk: number;
	bossDef: number;
	weaponElement: Element;
	skillElement?: Element;
	skillLevel: number;
	skillDmgBase: number;
	skillTriggerInterval: number;
	weaponAttack: number;
	logs: BattleLog[];
}
export interface TurnResult {
	logs: BattleLog[];
	over: boolean;        // 战斗是否结束
	won?: boolean;        // 如果结束，是否胜利
	fled?: boolean;       // 是否逃跑
	dice?: DiceEvent;     // 本回合骰子事件
}

/** 🎲 骰子随机事件 */
export type DiceEventType = "暴击" | "闪避" | "元素共鸣" | "破防" | "回春" | "虚弱" | "普通";
export interface DiceEvent {
	roll: number;          // 1-6
	event: DiceEventType;  // 触发的事件
	target: "player" | "boss" | "both";  // 谁受影响
	desc: string;          // 描述文本
}
export interface BattleAction {
	id: string;
	label: string;        // UI 显示文本
	type: TurnAction;
	desc: string;         // 行动描述
	emoji: string;        // 显示图标
}
