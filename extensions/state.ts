/**
 * 状态持久化
 *
 * 保存/加载侠客状态到 ~/.pi/agent/jinyong-xia-state.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import type { WuxueState } from "./wuxue.js";
import { createInitialState, migrateSkills, getSkill } from "./wuxue.js";
import { CHARACTERS } from "./characters.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** 已拥有的武功 */
export interface OwnedSkill {
	id: string;       // 武功 id，对应 SKILL_POOL
	level: number;    // 武功等级 1-20
	xp: number;       // 当前经验
}

export interface PetState {
	version: number;
	userId: string;                 // OS-based stable user ID
	telemetryEnabled: boolean;     // 是否上传用户资料到云端
	characterId: string | null;      // 随机分配的金庸主角
	nickname: string | null;
	specialSkill: string | null;     // 🗑 旧字段，迁移用
	specialSkillLevel: number;       // 🗑 旧字段，迁移用
	specialSkillXp: number;          // 🗑 旧字段，迁移用
	martialSkills: OwnedSkill[];  // ✅ 新：多武功列表
	hidden: boolean;                 // 是否隐藏
	weapon: string | null;           // 当前装备武器 id
	ownedWeapons: string[];          // 拥有的武器 id 列表
	wuxue: WuxueState;
	createdAt: number;
	lastActiveAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE FILE
// ═══════════════════════════════════════════════════════════════════════════

const STATE_VERSION = 6;

/** Generate a stable OS-based user ID */
export function generateUserId(): string {
	try {
		const os = require("node:os");
		const raw = `${os.hostname()}:${os.userInfo().username}:${os.platform()}:${os.arch()}`;
		return createHash("sha256").update(raw).digest("hex").substring(0, 16);
	} catch {
		return createHash("sha256").update(`unknown:${Date.now()}`).digest("hex").substring(0, 16);
	}
}

function getStatePath(): string {
	return resolve(homedir(), ".pi", "agent", "jinyong-xia-state.json");
}

function ensureDir(filePath: string): void {
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

export function createInitialPetState(): PetState {
	return {
		version: STATE_VERSION,
		userId: generateUserId(),
		telemetryEnabled: false,
		characterId: null,
		nickname: null,
		specialSkill: null,
		specialSkillLevel: 1,
		specialSkillXp: 0,
		martialSkills: [],
		hidden: false,
		weapon: "mu-jian",
		ownedWeapons: ["mu-jian"],
		wuxue: createInitialState(),
		createdAt: Date.now(),
		lastActiveAt: Date.now(),
	};
}

export function loadState(): PetState {
	const path = getStatePath();
	if (!existsSync(path)) {
		return createInitialPetState();
	}

	try {
		const raw = readFileSync(path, "utf8");
		const state = JSON.parse(raw) as PetState;

		// Migration chain
		if (!state.version || state.version < STATE_VERSION) {
			const migrated = state as any;
			delete migrated.mbti;
			delete migrated.mbtiScores;
			delete migrated.conversationTraits;

			// v1→v2: weapons
			if (!state.weapon) state.weapon = "mu-jian";
			if (!state.ownedWeapons) state.ownedWeapons = ["mu-jian"];
			if (state.characterId === undefined) state.characterId = null;

			// v2→v3: 单武功→多武功
			if (!state.martialSkills) state.martialSkills = [];

			// 把旧的单武功字段迁移进新数组
			if (state.martialSkills.length === 0 && state.specialSkill) {
				const oldId = state.specialSkill;
				const oldLevel = state.specialSkillLevel ?? 1;
				const oldXp = state.specialSkillXp ?? 0;
				// 验证旧 id 有效
				if (getSkill(oldId)) {
					state.martialSkills.push({ id: oldId, level: oldLevel, xp: oldXp });
				}
			}

			// 清理旧字段（保留以兼容，但不再使用）
			// 验证所有武功 id 有效
			state.martialSkills = state.martialSkills.filter((s: OwnedSkill) => getSkill(s.id));

		// v3→v4: 血量与体力分离
			if (state.wuxue) {
				if (!('hp' in state.wuxue) || typeof (state.wuxue as any).hp !== 'number' || isNaN((state.wuxue as any).hp)) {
					(state.wuxue as any).hp = 100 + (state.wuxue.level - 1) * 10;
					(state.wuxue as any).maxHp = 100 + (state.wuxue.level - 1) * 10;
				}
				if (typeof state.wuxue.maxHp !== 'number' || isNaN(state.wuxue.maxHp) || state.wuxue.maxHp <= 0) {
					state.wuxue.maxHp = 100 + (state.wuxue.level - 1) * 10;
					state.wuxue.hp = state.wuxue.maxHp;
				}
			}

			// 清理旧单武功残留字段
			delete (state as any).specialSkill;
			delete (state as any).specialSkillLevel;
			delete (state as any).specialSkillXp;

			// v5→v6: userId and telemetry
			if (!state.userId) state.userId = generateUserId();
			if (state.telemetryEnabled === undefined) (state as any).telemetryEnabled = false;

			state.version = STATE_VERSION;
		}

		// Ensure wuxue has all fields (forward compat)
		if (!state.wuxue) state.wuxue = createInitialState();
		const fresh = createInitialState();
		for (const key of Object.keys(fresh) as (keyof WuxueState)[]) {
			if (state.wuxue[key] === undefined) {
				(state.wuxue as any)[key] = fresh[key];
			}
		}

		// 补齐老存档 skills 缺失的 element 等字段
		migrateSkills(state.wuxue.skills);

		return state;
	} catch {
		return createInitialPetState();
	}
}

export function saveState(state: PetState): void {
	state.lastActiveAt = Date.now();
	const path = getStatePath();
	ensureDir(path);
	writeFileSync(path, JSON.stringify(state, null, 2), "utf8");
}
