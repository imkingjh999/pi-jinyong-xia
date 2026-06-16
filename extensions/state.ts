/**
 * 状态持久化
 *
 * 保存/加载侠客状态到 ~/.pi/agent/jinyong-xia-state.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir, hostname, userInfo, platform, arch } from "node:os";
import { createHash, generateKeyPairSync } from "node:crypto";
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

/** 任务风险等级 */
export type RiskLevel = "safe" | "low" | "medium" | "high" | "extreme";

/** 任务状态 */
export type MissionStatus = "available" | "active" | "completed" | "failed" | "abandoned";

/** 任务记录 */
export interface MissionRecord {
	id: string;              // 任务实例 ID
	templateId: string;      // 任务模板 ID
	name: string;
	description: string;
	risk: RiskLevel;
	status: MissionStatus;
	goldReward: number;
	xpReward: number;
	hpCost: number;          // 消耗/损失的血量
	startedAt: number;
	completedAt: number | null;
	requiredPlanSteps: number; // 需要的计划步骤数
	completedPlanSteps: number; // 已完成的计划步骤
	planChoices: string[];     // 计划步骤选项 ID (MBTI 映射)
}

/** 任务偏好追踪 */
export interface MissionPreferences {
	totalCompleted: number;    // 完成总数
	totalFailed: number;      // 失败总数
	riskProfile: {            // 风险偏好统计
		safe: number;
		low: number;
		medium: number;
		high: number;
		extreme: number;
	};
	favoriteType: string | null;  // 最喜欢的任务类型 (templateId)
	lastMissionAt: number;     // 上次任务时间
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
	// Ed25519 non-repudiation (generated on first run)
	SignPublicKey: string | null;    // base64 Ed25519 public key
	SignPrivateKey: string | null;   // base64 Ed25519 private key (never leaves this machine)
	// Telemetry (上传需邮箱)
	email: string | null;            // 用户邮箱（开启遥测时必须填写）
	// 任务系统
	missions: MissionRecord[];       // 已完成/进行中的任务记录
	missionPreferences: MissionPreferences;  // 任务偏好追踪
	// 帮派系统
	factionId: string | null;        // 加入的门派 ID
	factionContribution: number;     // 门派贡献度
	joinedFactionAt: number | null;  // 加入门派时间
	// 职业系统
	professionId: string | null;     // 选择的职业 ID
	joinedProfessionAt: number | null; // 选择职业时间
	// 成长天赋
	talents: string[];               // 已学习天赋 ID 列表
	talentPoints: number;            // 可用天赋点
	lastTelemetryUpload: number;     // 上次成功上传遥测的时间戳
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE FILE
// ═══════════════════════════════════════════════════════════════════════════

const STATE_VERSION = 9;

/** Generate a stable OS-based user ID */
export function generateUserId(): string {
	try {
		const raw = `${hostname()}:${userInfo().username}:${platform()}:${arch()}`;
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
		SignPublicKey: null,
		SignPrivateKey: null,
		email: null,
		missions: [],
		missionPreferences: {
			totalCompleted: 0,
			totalFailed: 0,
			riskProfile: { safe: 0, low: 0, medium: 0, high: 0, extreme: 0 },
			favoriteType: null,
			lastMissionAt: 0,
		},
		// 帮派
		factionId: null,
		factionContribution: 0,
		joinedFactionAt: null,
		// 职业
		professionId: null,
		joinedProfessionAt: null,
		// 天赋
		talents: [],
		talentPoints: 0,
		lastTelemetryUpload: 0,
	};
}

/** Generate Ed25519 key pair for payload signing */
export function generateSigningKeys(): { publicKey: string; privateKey: string } {
	const { publicKey, privateKey } = generateKeyPairSync("ed25519");
	// Export as base64 for JSON serialization
	const pubB64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
	const privB64 = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
	return { publicKey: pubB64, privateKey: privB64 };
}

/** Ensure signing keys exist, generating if needed */
export function ensureSigningKeys(state: PetState): void {
	if (state.SignPublicKey && state.SignPrivateKey) return;
	const keys = generateSigningKeys();
	state.SignPublicKey = keys.publicKey;
	state.SignPrivateKey = keys.privateKey;
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

			// v6→v7: Ed25519 signing keys
			if (!state.SignPublicKey) {
				const keys = generateSigningKeys();
				(state as any).SignPublicKey = keys.publicKey;
				(state as any).SignPrivateKey = keys.privateKey;
			}

			// v7→v8: email, missions, mission preferences
			if (!state.email) (state as any).email = null;
			if (!state.missions) (state as any).missions = [];
			if (!state.missionPreferences) (state as any).missionPreferences = {
				totalCompleted: 0, totalFailed: 0,
				riskProfile: { safe: 0, low: 0, medium: 0, high: 0, extreme: 0 },
				favoriteType: null, lastMissionAt: 0,
			};

			// v8→v9: faction, profession, talents
			if ((state as any).factionId === undefined) (state as any).factionId = null;
			if ((state as any).factionContribution === undefined) (state as any).factionContribution = 0;
			if ((state as any).joinedFactionAt === undefined) (state as any).joinedFactionAt = null;
			if ((state as any).professionId === undefined) (state as any).professionId = null;
			if ((state as any).joinedProfessionAt === undefined) (state as any).joinedProfessionAt = null;
			if (!Array.isArray((state as any).talents)) (state as any).talents = [];
			if ((state as any).talentPoints === undefined) (state as any).talentPoints = 0;

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
	} catch (err) {
		// 存档损坏：备份原始内容供排查，再返回初始态（避免静默清档丢失证据）
		try {
			const raw = readFileSync(path, "utf8");
			copyFileSync(path, path + ".corrupt.bak");
			console.error(`[jinyong-xia] 存档损坏，已备份到 ${path}.corrupt.bak（错误: ${err}）`);
			void raw; // 保留 raw 引用以便调试
		} catch (bakErr) {
			console.error(`[jinyong-xia] 存档损坏且备份失败: ${bakErr}`);
		}
		return createInitialPetState();
	}
}

export function saveState(state: PetState): void {
	state.lastActiveAt = Date.now();
	const path = getStatePath();
	ensureDir(path);
	// 原子写：先写 .tmp 再 rename，避免写入中途崩溃导致存档损坏
	const tmp = path + ".tmp";
	writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
	renameSync(tmp, path);
}
