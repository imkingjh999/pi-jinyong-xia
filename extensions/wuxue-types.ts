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
	if (GENERATES[atk] === def) return 0.9;
	return 1.0;
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
