/**
 * 遥测上传模块 v2 — Cloudflare D1 后端
 *
 * 零 API Key：客户端直接 fetch 到 Worker 公开端点。
 * 当 telemetryEnabled = true 时，定期上传用户游戏数据到云端。
 */

import type { PetState, OwnedSkill } from "./state.js";
import { createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { calculateMBTIProfile as calcMBTI } from "./missions.js";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

// Worker URL — deploy 后替换为实际地址
const WORKER_URL = "https://xia.openclawd.qzz.io";

const UPLOAD_INTERVAL_MS = 60 * 1000;    // 60 秒（客户端节流，服务端 MIN_REPORT_INTERVAL_SEC=30）

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TelemetryPayload {
	userId: string;
	characterId: string | null;
	characterName: string | null;
	level: number;
	title: string;
	gold: number;
	totalXp: number;
	totalEdits: number;
	totalCommands: number;
	totalTrainings: number;
	martialSkills: string;    // JSON
	weapon: string | null;
	achievements: string;     // JSON
	bossesDefeated: number;
	createdAt: number;
	lastActiveAt: number;
	reportedAt: number;
	version: string;
	// Ed25519 signature
	publicKey: string;         // base64 DER public key (sent every time for registration)
	signature: string;         // base64 signature of the payload (excluding signature field)
	// User identification
	email: string | null;      // 用户邮箱（开启遥测时必填）
	mbtiType: string | null;    // e.g. "INTJ"
	mbtiScores: string | null; // JSON: {E:0,I:3,...}
	// 新系统
	factionId: string | null;
	factionContribution: number;
	professionId: string | null;
	talents: string;            // JSON array
	talentPoints: number;
}

export interface LeaderboardEntry {
	user_id: string;
	character_name: string | null;
	level: number;
	title: string;
	gold: number;
	total_xp: number;
	total_edits: number;
	total_commands: number;
	total_trainings: number;
	martial_skills: string | null;
	weapon: string | null;
	achievements: string | null;
	bosses_defeated: number;
	last_active_at: number;
	reported_at: number;
}

export interface LeaderboardResponse {
	ok: boolean;
	sort: string;
	offset: number;
	limit: number;
	players: LeaderboardEntry[];
}

export interface PlayerDetail {
	ok: boolean;
	player: Record<string, unknown>;
	rank: number;
}

export interface GlobalStats {
	ok: boolean;
	totalPlayers: number;
	totalReports: number;
	updatedAt: number;
	topPlayers: Array<{ user_id: string; character_name: string | null; level: number; title: string; total_xp: number }>;
	levelDistribution: Array<{ tier: string; count: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD PAYLOAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 从 PetState 构建遥测上传数据
 */
export function buildTelemetryPayload(
	state: PetState,
	getCharacter: (id: string) => { name: string } | null,
	getLevelTitle: (level: number) => string,
	packageVersion: string,
): TelemetryPayload | null {
	if (!state.telemetryEnabled || !state.userId) return null;
	if (!state.SignPublicKey || !state.SignPrivateKey) return null;

	const char = state.characterId ? getCharacter(state.characterId) : null;

	const payload: TelemetryPayload = {
		userId: state.userId,
		characterId: state.characterId,
		characterName: state.nickname || (char?.name ?? null),
		level: state.wuxue.level,
		title: getLevelTitle(state.wuxue.level),
		gold: state.wuxue.gold,
		totalXp: state.wuxue.totalXp,
		totalEdits: state.wuxue.totalEdits,
		totalCommands: state.wuxue.totalCommands,
		totalTrainings: state.wuxue.totalTrainings,
		martialSkills: JSON.stringify(state.martialSkills),
		weapon: state.weapon,
		achievements: JSON.stringify(state.wuxue.achievements),
		bossesDefeated: state.wuxue.bossesDefeated ?? 0,
		createdAt: state.createdAt,
		lastActiveAt: state.lastActiveAt,
		reportedAt: Date.now(),
		version: packageVersion,
		publicKey: state.SignPublicKey,
		signature: "", // placeholder, filled below
		email: state.email,
		mbtiType: null,
		mbtiScores: null,
		factionId: state.factionId ?? null,
		factionContribution: state.factionContribution ?? 0,
		professionId: state.professionId ?? null,
		talents: JSON.stringify(state.talents ?? []),
		talentPoints: state.talentPoints ?? 0,
	};

	// Compute MBTI from missions
	const completedMissions = state.missions.filter(m => m.status === "completed" || m.status === "failed");
	if (completedMissions.length > 0) {
		try {
			const profile = calcMBTI(completedMissions);
			payload.mbtiType = profile.type;
			payload.mbtiScores = JSON.stringify(profile.scores);
		} catch { /* non-critical */ }
	}

	// Sign: Ed25519(payload fields except signature)
	payload.signature = signActionPayload(payload as unknown as Record<string, unknown>, state.SignPrivateKey);

	return payload;
}

/**
 * 用 Ed25519 私钥签名任意 payload（与 Worker 的 verifySignature 对齐）。
 * 签名内容 = JSON.stringify({ ...payload, signature: "" })。
 * 返回 base64 签名。
 */
export function signActionPayload(payload: Record<string, unknown>, privateKeyBase64: string): string {
	const dataToSign = JSON.stringify({ ...payload, signature: "" });
	const privateKey = createPrivateKey({
		key: Buffer.from(privateKeyBase64, "base64"),
		format: "der",
		type: "pkcs8",
	});
	const sig = cryptoSign(null, Buffer.from(dataToSign), privateKey);
	return sig.toString("base64");
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

let lastUploadTime = 0;
let uploadInProgress = false;

/**
 * 从 state 恢复上次上传时间（重启后调用一次）
 */
export function restoreLastUploadTime(state: { lastTelemetryUpload?: number }): void {
	if (state.lastTelemetryUpload && state.lastTelemetryUpload > lastUploadTime) {
		lastUploadTime = state.lastTelemetryUpload;
	}
}

/**
 * 上传遥测数据到 Worker
 */
export async function uploadTelemetry(payload: TelemetryPayload): Promise<{ ok: boolean; error?: string }> {
	if (uploadInProgress) return { ok: false, error: "upload in progress" };
	uploadInProgress = true;

	try {
		const response = await fetch(`${WORKER_URL}/api/upload`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(10_000), // 10s timeout
		});

		const data = await response.json() as { ok: boolean; error?: string; flagged?: boolean };
		lastUploadTime = Date.now(); // 无论成功失败都更新，防止立刻重试
		return data;
	} catch (err: any) {
		lastUploadTime = Date.now();
		return { ok: false, error: err.message ?? "network error" };
	} finally {
		uploadInProgress = false;
	}
}

/**
 * 条件上传：检查间隔后自动上传
 */
export async function maybeUpload(
	state: PetState,
	getCharacter: (id: string) => { name: string } | null,
	getLevelTitle: (level: number) => string,
	packageVersion: string,
): Promise<{ ok: boolean; error?: string }> {
	if (!state.telemetryEnabled) return { ok: false };

	// 初始化恢复（重启后首次调用时）
	if (state.lastTelemetryUpload && state.lastTelemetryUpload > lastUploadTime) {
		lastUploadTime = state.lastTelemetryUpload;
	}

	const now = Date.now();
	// 客户端节流：距上次上传必须超过 UPLOAD_INTERVAL_MS
	if (now - lastUploadTime < UPLOAD_INTERVAL_MS) return { ok: false };

	const payload = buildTelemetryPayload(state, getCharacter, getLevelTitle, packageVersion);
	if (!payload) return { ok: false };

	const result = await uploadTelemetry(payload);
	// 持久化上传时间到 state
	state.lastTelemetryUpload = lastUploadTime;
	return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH PUBLIC DATA (排行榜等)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 获取排行榜
 */
export async function fetchLeaderboard(
	sort: "level" | "gold" | "edits" | "xp" = "level",
	limit = 20,
	offset = 0,
): Promise<LeaderboardResponse | null> {
	try {
		const url = `${WORKER_URL}/api/leaderboard?sort=${sort}&limit=${limit}&offset=${offset}`;
		const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
		return await response.json() as LeaderboardResponse;
	} catch {
		return null;
	}
}

/**
 * 获取 MBTI 性格匹配的真人玩家
 */
export async function fetchMatch(userId: string): Promise<any> {
	try {
		const response = await fetch(`${WORKER_URL}/api/match/${userId}`, { signal: AbortSignal.timeout(10_000) });
		return await response.json();
	} catch {
		return null;
	}
}

/**
 * 获取某玩家详情 + 排名
 */
export async function fetchPlayerProfile(userId: string): Promise<PlayerDetail | null> {
	try {
		const response = await fetch(`${WORKER_URL}/api/player/${userId}`, { signal: AbortSignal.timeout(10_000) });
		return await response.json() as PlayerDetail;
	} catch {
		return null;
	}
}

/**
 * 获取全局统计
 */
export async function fetchGlobalStats(): Promise<GlobalStats | null> {
	try {
		const response = await fetch(`${WORKER_URL}/api/stats`, { signal: AbortSignal.timeout(10_000) });
		return await response.json() as GlobalStats;
	} catch {
		return null;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 服务端权威 API — 遭遇生成 & Boss 战斗
// ═══════════════════════════════════════════════════════════════════════════

export interface ServerEncounterResult {
	ok: boolean;
	type: string;
	name: string;
	description: string;
	goldAmount: number;
	xpAmount: number;
	hpChange?: number;
	skillScrollId?: string;
	weaponId?: string;
	weaponName?: string;
	itemId?: string;
	itemName?: string;
	location?: string;
	battleResult?: string;
	encounterChar?: string;
}

export interface ServerBossFightResult {
	ok: boolean;
	won: boolean;
	bossName: string;
	bossElement: string;
	goldReward: number;
	xpReward: number;
	skillXpReward: number;
	hpChange: number;
	logs: Array<{
		turn: number;
		attacker: string;
		damage: number;
		selfDamage?: number;
		elementBonus?: string;
		isSkillHit?: boolean;
		dice?: { event: string; desc: string };
	}>;
	error?: string;
}

/**
 * 服务端生成遭遇 — 客户端不再本地生成
 * signPublicKey / signPrivateKey：Ed25519 签名凭据（来自 PetState），用于服务端验签 + 权威等级。
 * 缺失时发送未签名请求（服务端对已注册用户会拒绝，触发本地降级）。
 */
export async function serverEncounter(
	userId: string,
	level: number,
	weaponAtk: number,
	currentHp: number,
	maxHp: number,
	signPublicKey?: string | null,
	signPrivateKey?: string | null,
): Promise<ServerEncounterResult | null> {
	try {
		const body: Record<string, unknown> = { userId, level, weaponAtk, currentHp, maxHp };
		if (signPublicKey && signPrivateKey) {
			body.publicKey = signPublicKey;
			body.signature = signActionPayload(body, signPrivateKey);
		}
		const response = await fetch(`${WORKER_URL}/api/encounter`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(15_000),
		});
		const data = await response.json() as ServerEncounterResult;
		return data.ok ? data : null;
	} catch {
		// 网络失败时回退到本地生成（降级模式）
		return null;
	}
}

/**
 * 服务端 Boss 战斗 — 客户端不再本地计算
 * signPublicKey / signPrivateKey：Ed25519 签名凭据（来自 PetState），用于服务端验签 + 权威等级。
 * 缺失时发送未签名请求（服务端对已注册用户会拒绝，触发本地降级）。
 */
export async function serverBossFight(
	userId: string,
	level: number,
	weaponAtk: number,
	weaponElement: string,
	skillLevel: number,
	skillElement: string | undefined,
	bossId: string,
	signPublicKey?: string | null,
	signPrivateKey?: string | null,
): Promise<ServerBossFightResult | null> {
	try {
		const body: Record<string, unknown> = { userId, level, weaponAtk, weaponElement, skillLevel, skillElement: skillElement || "", bossId };
		if (signPublicKey && signPrivateKey) {
			body.publicKey = signPublicKey;
			body.signature = signActionPayload(body, signPrivateKey);
		}
		const response = await fetch(`${WORKER_URL}/api/boss-fight`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(15_000),
		});
		const data = await response.json() as ServerBossFightResult;
		return data.ok ? data : null;
	} catch {
		// 网络失败时回退到本地计算（降级模式）
		return null;
	}
}

/**
 * 获取公开配置（显示用途）
 */
export async function fetchPublicConfig(): Promise<any> {
	try {
		const response = await fetch(`${WORKER_URL}/api/config/public`, { signal: AbortSignal.timeout(10_000) });
		return await response.json();
	} catch {
		return null;
	}
}
