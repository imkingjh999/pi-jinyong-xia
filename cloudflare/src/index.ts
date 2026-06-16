/**
 * xia-leaderboard — Cloudflare Worker
 *
 * 零 API Key 公共排行榜后端 + Ed25519 非对称签名验证
 *
 * 安全模型:
 *   - 每个用户首次运行插件时生成 Ed25519 密钥对，私钥存本地
 *   - 上传时用私钥签名 payload，Worker 用存储的公钥验签
 *   - 攻击者无法伪造已有用户的数据（没有私钥）
 *   - 攻击者可以注册新用户，但无法冒充别人
 *
 * 端点:
 *   POST /api/upload         上传/更新自己的数据 (Ed25519 签名)
 *   GET  /api/leaderboard    排行榜 (sort=level|gold|edits, limit=N, offset=N)
 *   GET  /api/player/:id     查看某玩家详情
 *   GET  /api/stats          全局统计
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Env {
	DB: D1Database;
	BADGES: R2Bucket;
	AVATARS: R2Bucket;
	IP_HASH_SALT?: string;  // 可选：IP 哈希加盐（Worker secret），防止彩虹表反查
}

interface UploadPayload {
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
	martialSkills: string;
	weapon: string | null;
	achievements: string;
	bossesDefeated?: number;
	createdAt: number;
	lastActiveAt: number;
	reportedAt: number;
	version: string;
	// Ed25519 signature fields
	publicKey: string;     // base64 DER SPKI public key
	signature: string;     // base64 Ed25519 signature
	// User profile
	email?: string;
	mbtiType?: string;
	mbtiScores?: string;
	// 门派 / 职业 / 天赋（客户端已签名上传，P3-5 持久化）
	factionId?: string | null;
	professionId?: string | null;
	talents?: string;
	talentPoints?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════════

const RULES = {
	MAX_LEVEL: 200,
	MAX_GOLD: 10_000_000,
	MAX_GOLD_DELTA: 500_000,
	MAX_LEVEL_DELTA: 10,
	MIN_REPORT_INTERVAL_SEC: 30,
	USER_ID_REGEX: /^[0-9a-f]{16}$/,
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			...headers,
		},
	});
}

/** SHA-256(salt + ip) 取前 16 个十六进制字符（64 位）—— 用于限流分桶与反滥用统计，不可逆推原始 IP */
async function hashIp(ip: string, salt: string = ""): Promise<string> {
	const data = new TextEncoder().encode(salt + ip);
	const hashBuf = await crypto.subtle.digest("SHA-256", data);
	const hashHex = Array.from(new Uint8Array(hashBuf))
		.map(b => b.toString(16).padStart(2, '0')).join('');
	return hashHex.substring(0, 16);
}

// ═══════════════════════════════════════════════════════════════════════════
// ED25519 SIGNATURE VERIFICATION (WebCrypto API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Import a DER SPKI Ed25519 public key for WebCrypto verification.
 */
async function importPublicKey(derBase64: string): Promise<CryptoKey> {
	const derBytes = Uint8Array.from(atob(derBase64), c => c.charCodeAt(0));
	return await crypto.subtle.importKey(
		"spki",
		derBytes,
		{ name: "Ed25519" },
		false,
		["verify"],
	);
}

/**
 * Verify an Ed25519 signature against payload data.
 * Returns true if signature is valid.
 */
async function verifySignature(
	publicKeyDer: string,
	signatureBase64: string,
	data: Uint8Array,
): Promise<boolean> {
	try {
		const key = await importPublicKey(publicKeyDer);
		const sigBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
		return await crypto.subtle.verify(
			{ name: "Ed25519" },
			key,
			sigBytes,
			data,
		);
	} catch (err) {
		console.error("Signature verification error:", err);
		return false;
	}
}

/**
 * Build the signed data from the payload (same as client: JSON with signature="").
 * The client signs { ...payload, signature: "" }, so we reconstruct that.
 * Works for any payload shape (upload, encounter, boss-fight).
 */
function buildSignedData(payload: Record<string, unknown>): Uint8Array {
	const signed: Record<string, unknown> = { ...payload, signature: "" };
	return new TextEncoder().encode(JSON.stringify(signed));
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

async function checkRateLimit(db: D1Database, userId: string): Promise<{ ok: boolean; reason?: string }> {
	const now = Date.now();

	const userLast = await db.prepare(
		"SELECT reported_at FROM players WHERE user_id = ?"
	).bind(userId).first<{ reported_at: number }>();

	if (userLast?.reported_at) {
		const elapsed = (now - userLast.reported_at) / 1000;
		if (elapsed < RULES.MIN_REPORT_INTERVAL_SEC) {
			return { ok: false, reason: `上报过于频繁，请等待 ${Math.ceil(RULES.MIN_REPORT_INTERVAL_SEC - elapsed)} 秒` };
		}
	}

	return { ok: true };
}

/** Per-action rate limit using action_log (more granular than upload rate limit) */
async function checkActionRateLimit(db: D1Database, userId: string, actionType: string, minIntervalSec: number): Promise<{ ok: boolean; reason?: string }> {
	const now = Date.now();
	const last = await db.prepare(
		"SELECT created_at FROM action_log WHERE user_id = ? AND action_type = ? ORDER BY created_at DESC LIMIT 1"
	).bind(userId, actionType).first<{ created_at: number }>();

	if (last?.created_at) {
		const elapsed = (now - last.created_at) / 1000;
		if (elapsed < minIntervalSec) {
			return { ok: false, reason: `操作过于频繁，请等待 ${Math.ceil(minIntervalSec - elapsed)} 秒` };
		}
	}
	return { ok: true };
}

/**
 * Per-IP global rate limit using the rate_limit table (defense against multi-account farming).
 * Counts all action types within the window for the given IP hash. Uses CREATE TABLE IF NOT EXISTS
 * schema, so it degrades gracefully (try/catch → allow) if the table is missing.
 * Also opportunistically cleans up old entries to bound table growth.
 */
async function checkIpRateLimit(db: D1Database, ipHash: string, windowSec: number, maxCount: number): Promise<{ ok: boolean; reason?: string }> {
	const now = Date.now();
	const since = now - windowSec * 1000;
	const bucket = "ip:" + ipHash;
	try {
		// Opportunistic cleanup of stale entries (cheap, bounds table size)
		await db.prepare("DELETE FROM rate_limit WHERE created_at < ?").bind(since).run();
		const row = await db.prepare("SELECT COUNT(*) as cnt FROM rate_limit WHERE bucket = ? AND created_at > ?")
			.bind(bucket, since).first<{ cnt: number }>();
		if ((row?.cnt ?? 0) >= maxCount) {
			return { ok: false, reason: "该网络请求过于频繁，请稍后再试" };
		}
		await db.prepare("INSERT INTO rate_limit (bucket, created_at) VALUES (?, ?)").bind(bucket, now).run();
	} catch (err) {
		// rate_limit table may be missing on legacy DBs — fail open (allow) rather than blocking
		console.error("IP rate limit check failed:", err);
	}
	return { ok: true };
}

/** Add ±noise% random noise to a numeric value to prevent statistical inference */
function addNoise(value: number, noisePercent: number = 0.10): number {
	if (value === 0) return 0;
	const factor = 1 + (serverRandom() * 2 - 1) * noisePercent;
	return Math.round(value * factor);
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateUpload(payload: UploadPayload): { ok: boolean; reason?: string } {
	if (!RULES.USER_ID_REGEX.test(payload.userId)) {
		return { ok: false, reason: "userId 格式无效" };
	}
	if (payload.level < 1 || payload.level > RULES.MAX_LEVEL) {
		return { ok: false, reason: `等级超出范围 (1-${RULES.MAX_LEVEL})` };
	}
	if (payload.gold < 0 || payload.gold > RULES.MAX_GOLD) {
		return { ok: false, reason: "金币数值异常" };
	}
	if (payload.reportedAt > Date.now() + 60000) {
		return { ok: false, reason: "上报时间来自未来" };
	}
	if (!payload.publicKey || !payload.signature) {
		return { ok: false, reason: "缺少签名或公钥" };
	}
	return { ok: true };
}

function checkIncremental(prev: D1Result<Record<string, unknown>>, payload: UploadPayload): { ok: boolean; reason?: string; flagged: boolean } {
	if (!prev.results || prev.results.length === 0) {
		return { ok: true, flagged: false };
	}

	const row = prev.results[0] as Record<string, number | string>;
	const prevLevel = (row.level as number) ?? 0;
	const prevGold = (row.gold as number) ?? 0;
	const flagged = (row.flagged as number) ?? 0;

	if (flagged >= 2) {
		return { ok: false, reason: "该账户已被封禁", flagged: false };
	}

	const levelDelta = payload.level - prevLevel;
	if (levelDelta > RULES.MAX_LEVEL_DELTA) {
		return { ok: true, flagged: true };
	}

	const goldDelta = Math.abs(payload.gold - prevGold);
	if (goldDelta > RULES.MAX_GOLD_DELTA) {
		return { ok: true, flagged: true };
	}

	return { ok: true, flagged: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME DATA CONSTANTS (server-side authoritative)
// ═══════════════════════════════════════════════════════════════════════════

/** Seeded random using crypto.getRandomValues — returns float [0, 1) */
function serverRandom(): number {
	const buf = new Uint8Array(4);
	crypto.getRandomValues(buf);
	const view = new DataView(buf.buffer);
	return (view.getUint32(0) >>> 0) / 0x100000000;
}

interface BossDef {
	id: string;
	name: string;
	level: number;
	hp: number;
	atk: number;
	def: number;
	element: string;
	goldReward: [number, number]; // [min, max]
	xpReward: number;
}

const BOSSES: BossDef[] = [
	{ id: "boss_01", name: "青城四秀", level: 5, hp: 200, atk: 15, def: 5, element: "wind", goldReward: [50, 120], xpReward: 80 },
	{ id: "boss_02", name: "黑风寨寨主", level: 10, hp: 500, atk: 30, def: 12, element: "earth", goldReward: [100, 250], xpReward: 200 },
	{ id: "boss_03", name: "西域金刚", level: 20, hp: 1200, atk: 55, def: 25, element: "metal", goldReward: [200, 500], xpReward: 500 },
	{ id: "boss_04", name: "桃花岛弟子", level: 30, hp: 2500, atk: 90, def: 40, element: "wood", goldReward: [400, 900], xpReward: 1000 },
	{ id: "boss_05", name: "明教护法", level: 45, hp: 5000, atk: 150, def: 70, element: "fire", goldReward: [800, 1800], xpReward: 2200 },
	{ id: "boss_06", name: "少林方丈", level: 60, hp: 10000, atk: 250, def: 120, element: "earth", goldReward: [1500, 3500], xpReward: 5000 },
	{ id: "boss_07", name: "武当掌门", level: 80, hp: 20000, atk: 400, def: 200, element: "water", goldReward: [3000, 7000], xpReward: 10000 },
	{ id: "boss_08", name: "魔教教主", level: 100, hp: 50000, atk: 700, def: 350, element: "fire", goldReward: [6000, 15000], xpReward: 25000 },
	{ id: "boss_09", name: "剑圣", level: 130, hp: 100000, atk: 1200, def: 600, element: "metal", goldReward: [12000, 30000], xpReward: 60000 },
	{ id: "boss_10", name: "天山童姥", level: 160, hp: 200000, atk: 2000, def: 1000, element: "ice", goldReward: [25000, 60000], xpReward: 150000 },
];

const ENCOUNTER_EVENTS = [
	{ id: "evt_spring", text: "你在路边遇到一位受伤的老者，救治后获得一枚玉佩。", goldMin: 20, goldMax: 80, xpMin: 10, xpMax: 40 },
	{ id: "evt_herbs", text: "你发现了一片珍稀药草，采摘后可卖个好价钱。", goldMin: 30, goldMax: 100, xpMin: 5, xpMax: 20 },
	{ id: "evt_bandit", text: "一伙山贼拦路打劫，你将他们击退！", goldMin: 50, goldMax: 200, xpMin: 30, xpMax: 80 },
	{ id: "evt_treasure", text: "你偶然发现一个古老的山洞，里面藏着宝藏。", goldMin: 100, goldMax: 500, xpMin: 50, xpMax: 150 },
	{ id: "evt_meditation", text: "你在瀑布旁静坐悟道，内力大增。", goldMin: 0, goldMax: 0, xpMin: 80, xpMax: 250 },
	{ id: "evt_challenge", text: "一位神秘剑客向你发起挑战，你险胜！", goldMin: 40, goldMax: 180, xpMin: 60, xpMax: 200 },
	{ id: "evt_market", text: "你在集市上淘到一本武功秘籍的残页。", goldMin: 10, goldMax: 50, xpMin: 40, xpMax: 120 },
	{ id: "evt_rescue", text: "你救下了一位被追杀的武林人士，获得报酬。", goldMin: 60, goldMax: 300, xpMin: 20, xpMax: 80 },
];

const SKILL_IDS = [
	"skill_basic_sword", "skill_basic_fist", "skill_basic_staff",
	"skill_taijiquan", "skill_yiyangzhi", "skill_daguanyin",
	"skill_jianglong18zhang", "skill_duogubitong", "skill_liuyangzhang",
	"skill_jiuyinzhenjing", "skill_jiuyangshengong", "skill_xianglong18zhang",
];

const WEAPON_NAMES_BY_RARITY: Record<string, string[]> = {
	common: ["木剑", "铁刀", "短棍", "铜剑"],
	uncommon: ["青钢剑", "百炼刀", "铁扇", "流星锤"],
	rare: ["碧血剑", "冷月刀", "玉箫", "金蛇剑"],
	epic: ["倚天剑", "屠龙刀", "玄铁重剑", "打狗棒"],
	legendary: ["真武剑", "圣火令", "六脉神剑", "东方不败"],
};

const LOCATIONS = [
	"华山", "武当山", "少林寺", "峨眉山", "昆仑山",
	"天山", "桃花岛", "灵鹫宫", "明教总坛", "黑木崖",
	"大漠", "江南", "中原", "西域", "大理",
];

const ELEMENT_SYMBOLS: Record<string, string> = {
	metal: "⚔", wood: "🌿", water: "💧", fire: "🔥",
	earth: "⛰", wind: "🌪", ice: "❄", thunder: "⚡",
};

const RARITY_NAMES: Record<string, string> = {
	common: "普通 (白)", uncommon: "精良 (绿)", rare: "稀有 (蓝)",
	epic: "史诗 (紫)", legendary: "传说 (橙)",
};

const RARITY_LEVEL_REQ: Record<string, number> = {
	common: 1, uncommon: 10, rare: 25, epic: 50, legendary: 80,
};

const ELEMENT_CHART = {
	metal: { beats: "wood", losesTo: "fire" },
	wood: { beats: "earth", losesTo: "metal" },
	water: { beats: "fire", losesTo: "earth" },
	fire: { beats: "metal", losesTo: "water" },
	earth: { beats: "water", losesTo: "wood" },
};

/** Pick a random element from an array */
function randomPick<T>(arr: readonly T[]): T {
	return arr[Math.floor(serverRandom() * arr.length)];
}

/** Random int in [min, max] inclusive */
function randomInt(min: number, max: number): number {
	return Math.floor(serverRandom() * (max - min + 1)) + min;
}

/** Roll rarity for a weapon drop based on player level */
function rollWeaponRarity(level: number): string {
	const roll = serverRandom();
	if (level >= 80 && roll < 0.03) return "legendary";
	if (level >= 50 && roll < 0.10) return "epic";
	if (level >= 25 && roll < 0.25) return "rare";
	if (level >= 10 && roll < 0.50) return "uncommon";
	return "common";
}

/** Read a numeric config value from game_config, with fallback */
async function getConfigFloat(db: D1Database, key: string, fallback: number): Promise<number> {
	try {
		const row = await db.prepare("SELECT value FROM game_config WHERE key = ?").bind(key).first<{ value: string }>();
		if (row?.value) return parseFloat(JSON.parse(row.value));
	} catch { /* use fallback */ }
	return fallback;
}

/** Read a JSON config value from game_config */
async function getConfigJSON<T>(db: D1Database, key: string, fallback: T): Promise<T> {
	try {
		const row = await db.prepare("SELECT value FROM game_config WHERE key = ?").bind(key).first<{ value: string }>();
		if (row?.value) return JSON.parse(row.value) as T;
	} catch { /* use fallback */ }
	return fallback;
}

/** Log an action to the action_log table */
async function logAction(
	env: Env,
	opts: {
		userId: string; actionType: string; actionId?: string;
		resultJson: Record<string, unknown>;
		goldChange?: number; xpChange?: number; hpChange?: number;
		levelAfter?: number; goldAfter?: number;
	},
): Promise<void> {
	try {
		await env.DB.prepare(`
			INSERT INTO action_log (user_id, action_type, action_id, result_json, gold_change, xp_change, hp_change, level_after, gold_after, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			opts.userId, opts.actionType, opts.actionId ?? null,
			JSON.stringify(opts.resultJson),
			opts.goldChange ?? 0, opts.xpChange ?? 0, opts.hpChange ?? 0,
			opts.levelAfter ?? null, opts.goldAfter ?? null, Date.now(),
		).run();
	} catch (err) {
		console.error("Failed to log action:", err);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/upload — 上传玩家数据（Ed25519 签名）
 */
async function handleUpload(request: Request, env: Env): Promise<Response> {
	let payload: UploadPayload;
	try {
		payload = await request.json() as UploadPayload;
	} catch {
		return json({ ok: false, error: "Invalid JSON" }, 400);
	}

	// 1. Validate payload fields
	const validation = validateUpload(payload);
	if (!validation.ok) {
		return json({ ok: false, error: validation.reason }, 400);
	}

	// 2. Rate limit
	const rateLimit = await checkRateLimit(env.DB, payload.userId);
	if (!rateLimit.ok) {
		return json({ ok: false, error: rateLimit.reason }, 429);
	}

	// 3. Ed25519 signature verification
	//   a) Look up registered public key for this user (if exists)
	const existingPlayer = await env.DB.prepare(
		"SELECT public_key, level, gold, total_xp, reported_at, flagged FROM players WHERE user_id = ?"
	).bind(payload.userId).first<{ public_key: string; level: number; gold: number; total_xp: number; reported_at: number; flagged: number }>();

	let expectedPublicKey: string;

	if (existingPlayer?.public_key) {
		// Existing user: must use the SAME public key
		expectedPublicKey = existingPlayer.public_key;
		if (payload.publicKey !== expectedPublicKey) {
			return json({ ok: false, error: "公钥不匹配 — 身份验证失败" }, 403);
		}
	} else {
		// New user: register this public key
		expectedPublicKey = payload.publicKey;
	}

	// Verify signature
	const signedData = buildSignedData(payload as unknown as Record<string, unknown>);
	const sigValid = await verifySignature(expectedPublicKey, payload.signature, signedData);
	if (!sigValid) {
		return json({ ok: false, error: "签名验证失败 — 数据可能被篡改" }, 403);
	}

	// 4. Incremental validity check
	const prev = await env.DB.prepare(
		"SELECT level, gold, flagged FROM players WHERE user_id = ?"
	).bind(payload.userId).all();

	const incremental = checkIncremental(prev, payload);
	if (!incremental.ok) {
		return json({ ok: false, error: incremental.reason }, 403);
	}

	// 4.5. Action-log balance validation (anti-cheat)
	// Sum all server-validated gold/xp changes and compare with claimed totals
	if (existingPlayer) {
		const prevGold = existingPlayer.gold ?? 0;
		const prevXp = existingPlayer.total_xp ?? 0;
		const goldDelta = payload.gold - prevGold;
		const xpDelta = payload.totalXp - prevXp;

		// Sum server-validated income from action_log since last report
		// Wrapped in try/catch: action_log table may be missing on legacy DBs (schema-v2 not applied).
		// On failure, skip flagging rather than blocking the upload (degrade gracefully).
		const lastReport = existingPlayer.reported_at ?? 0;
		let validatedGold = 0;
		let validatedXp = 0;
		try {
			const validatedIncome = await env.DB.prepare(
				`SELECT COALESCE(SUM(gold_change), 0) as total_gold, COALESCE(SUM(xp_change), 0) as total_xp FROM action_log WHERE user_id = ? AND created_at > ?`
			).bind(payload.userId, lastReport).first<{ total_gold: number; total_xp: number }>();
			validatedGold = validatedIncome?.total_gold ?? 0;
			validatedXp = validatedIncome?.total_xp ?? 0;
		} catch (err) {
			console.error("action_log query failed (table may be missing):", err);
		}

		// Allow 3x tolerance for unvalidated local encounters (offline/fallback)
		// If server-validated income is significant but player claims way more, flag
		if (validatedGold > 0 && goldDelta > validatedGold * 5) {
			incremental.flagged = true;
		}
		if (validatedXp > 0 && xpDelta > validatedXp * 5) {
			incremental.flagged = true;
		}
	}

	// 5. Upsert
	const newFlag = incremental.flagged ? 1 : (existingPlayer?.flagged ?? 0);
	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	const ipHash = await hashIp(ip, env.IP_HASH_SALT ?? "");

	try {
		await env.DB.prepare(`
			INSERT INTO players (
				user_id, character_id, character_name, level, title,
				gold, total_xp, total_edits, total_commands, total_trainings,
				martial_skills, weapon, achievements, bosses_defeated,
				created_at, last_active_at, reported_at, version,
				ip_hash, report_count, flagged, public_key, user_email, mbti_type, mbti_scores,
				faction_id, profession_id, talents, talent_points
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(user_id) DO UPDATE SET
				character_id = excluded.character_id,
				character_name = excluded.character_name,
				level = excluded.level,
				title = excluded.title,
				gold = excluded.gold,
				total_xp = excluded.total_xp,
				total_edits = excluded.total_edits,
				total_commands = excluded.total_commands,
				total_trainings = excluded.total_trainings,
				martial_skills = excluded.martial_skills,
				weapon = excluded.weapon,
				achievements = excluded.achievements,
				bosses_defeated = excluded.bosses_defeated,
				last_active_at = excluded.last_active_at,
				reported_at = excluded.reported_at,
				version = excluded.version,
				ip_hash = excluded.ip_hash,
				report_count = report_count + 1,
				flagged = excluded.flagged,
				user_email = excluded.user_email,
				mbti_type = excluded.mbti_type,
				mbti_scores = excluded.mbti_scores,
				faction_id = excluded.faction_id,
				profession_id = excluded.profession_id,
				talents = excluded.talents,
				talent_points = excluded.talent_points
		`).bind(
			payload.userId, payload.characterId, payload.characterName,
			payload.level, payload.title,
			payload.gold, payload.totalXp, payload.totalEdits,
			payload.totalCommands, payload.totalTrainings,
			payload.martialSkills, payload.weapon, payload.achievements,
			payload.bossesDefeated ?? 0,
			payload.createdAt, payload.lastActiveAt, payload.reportedAt,
			payload.version, ipHash, newFlag, expectedPublicKey,
			payload.email ?? null, payload.mbtiType ?? null, payload.mbtiScores ?? null,
			payload.factionId ?? null, payload.professionId ?? null, payload.talents ?? null, payload.talentPoints ?? 0
		).run();

		// Update global stats
		await env.DB.prepare(`
			UPDATE global_stats SET
				total_players = (SELECT COUNT(*) FROM players WHERE flagged < 2),
				total_reports = total_reports + 1,
				updated_at = ?
			WHERE id = 1
		`).bind(Date.now()).run();

		return json({ ok: true, flagged: incremental.flagged });
	} catch (err) {
		console.error("DB error:", err);
		return json({ ok: false, error: "Database error" }, 500);
	}
}

/**
 * GET /api/leaderboard — 排行榜
 */
async function handleLeaderboard(url: URL, env: Env): Promise<Response> {
	const sort = url.searchParams.get("sort") ?? "level";
	const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
	const offset = parseInt(url.searchParams.get("offset") ?? "0");

	let orderBy: string;
	switch (sort) {
		case "gold": orderBy = "gold DESC"; break;
		case "edits": orderBy = "total_edits DESC"; break;
		case "xp": orderBy = "total_xp DESC"; break;
		case "trainings": orderBy = "total_trainings DESC"; break;
		case "level":
		default: orderBy = "level DESC, total_xp DESC"; break;
	}

	const results = await env.DB.prepare(`
		SELECT user_id, character_name, level, title, gold, total_xp,
		       total_edits, total_commands, total_trainings,
		       martial_skills, weapon, achievements, bosses_defeated,
		       last_active_at, reported_at
		FROM players
		WHERE flagged < 2
		ORDER BY ${orderBy}
		LIMIT ? OFFSET ?
	`).bind(limit, offset).all();

	return json({
		ok: true,
		sort,
		offset,
		limit,
		players: results.results,
	});
}

/**
 * GET /api/player/:id — 查看某玩家详情
 */
async function handlePlayer(userId: string, env: Env): Promise<Response> {
	// 最小披露原则：只返回排行榜可见的列，剔除 user_email / ip_hash / public_key /
	// report_count / flagged / created_at 等敏感或内部字段（与 handleLeaderboard 列集一致）
	const player = await env.DB.prepare(`
		SELECT user_id, character_name, level, title, gold, total_xp,
		       total_edits, total_commands, total_trainings,
		       martial_skills, weapon, achievements, bosses_defeated,
		       last_active_at, reported_at
		FROM players WHERE user_id = ? AND flagged < 2
	`).bind(userId).first<{ level: number; total_xp: number }>();

	if (!player) {
		return json({ ok: false, error: "玩家不存在" }, 404);
	}

	const rankResult = await env.DB.prepare(`
		SELECT COUNT(*) + 1 as rank FROM players
		WHERE flagged < 2 AND (level > ? OR (level = ? AND total_xp > ?))
	`).bind(player.level, player.level, player.total_xp).first<{ rank: number }>();

	return json({
		ok: true,
		player,
		rank: rankResult?.rank ?? -1,
	});
}

/**
 * GET /api/stats — 全局统计
 */
async function handleStats(env: Env): Promise<Response> {
	const stats = await env.DB.prepare(
		"SELECT * FROM global_stats WHERE id = 1"
	).first();

	const topPlayers = await env.DB.prepare(`
		SELECT user_id, character_name, level, title, total_xp
		FROM players WHERE flagged < 2
		ORDER BY level DESC, total_xp DESC LIMIT 5
	`).all();

	const levelDist = await env.DB.prepare(`
		SELECT
			CASE
				WHEN level BETWEEN 1 AND 10 THEN '1-10'
				WHEN level BETWEEN 11 AND 20 THEN '11-20'
				WHEN level BETWEEN 21 AND 40 THEN '21-40'
				WHEN level BETWEEN 41 AND 60 THEN '41-60'
				WHEN level BETWEEN 61 AND 80 THEN '61-80'
				WHEN level > 80 THEN '81+'
			END as tier,
			COUNT(*) as count
		FROM players WHERE flagged < 2
		GROUP BY tier
		ORDER BY MIN(level)
	`).all();

	return json({
		ok: true,
		totalPlayers: (stats as Record<string, number>)?.total_players ?? 0,
		totalReports: (stats as Record<string, number>)?.total_reports ?? 0,
		updatedAt: (stats as Record<string, number>)?.updated_at ?? 0,
		topPlayers: topPlayers.results,
		levelDistribution: levelDist.results,
	});
}

/**
 * GET /api/match/:id — MBTI 性格匹配
 * 返回与指定玩家性格最匹配的共他玩家
 */
async function handleMatch(userId: string, env: Env): Promise<Response> {
	// Get the user's MBTI
	const me = await env.DB.prepare(
		"SELECT mbti_type, character_name, level FROM players WHERE user_id = ? AND flagged < 2"
	).bind(userId).first<{ mbti_type: string; character_name: string; level: number }>();

	if (!me?.mbti_type) {
		return json({ ok: false, error: "性格数据不足" }, 404);
	}

	const myType = me.mbti_type;

	// Get all players with MBTI data
	const allPlayers = await env.DB.prepare(`
		SELECT user_id, character_name, level, mbti_type
		FROM players
		WHERE flagged < 2 AND mbti_type IS NOT NULL AND user_id != ?
		LIMIT 100
	`).bind(userId).all();

	// Calculate compatibility scores
	const matches = (allPlayers.results as Array<{ user_id: string; character_name: string; level: number; mbti_type: string }>)
		.map(p => {
			let score = 0;
			const reasons: string[] = [];

			// N/S complement (most valuable)
			if (myType[1] !== p.mbti_type[1]) { score += 1.5; reasons.push("思维互补"); }
			else { score += 1; reasons.push("思维相似"); }

			// T/F complement
			if (myType[2] !== p.mbti_type[2]) { score += 1.2; reasons.push("判断互补"); }
			else { score += 0.8; }

			// E/I similarity preferred
			if (myType[0] === p.mbti_type[0]) { score += 0.8; reasons.push("能量同频"); }
			else { score += 1; reasons.push("内外互补"); }

			// J/P similarity preferred
			if (myType[3] === p.mbti_type[3]) { score += 0.8; reasons.push("节奏合拍"); }
			else { score += 0.7; }

			return { ...p, score: Math.round(score * 10) / 10, reasons };
		})
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);

	return json({
		ok: true,
		myType,
		myName: me.character_name,
		matches,
	});
}

/**
 * POST /api/encounter — Server-side encounter generation
 *
 * Input: { userId, level, weaponAtk, currentHp, maxHp }
 */
async function handleEncounter(request: Request, env: Env): Promise<Response> {
	let body: { userId: string; level: number; weaponAtk: number; currentHp: number; maxHp: number; publicKey?: string; signature?: string };
	try {
		body = await request.json() as typeof body;
	} catch {
		return json({ ok: false, error: "Invalid JSON" }, 400);
	}

	const { userId, level, weaponAtk, currentHp, maxHp, publicKey, signature } = body;
	if (!userId || level < 1) {
		return json({ ok: false, error: "Missing required fields" }, 400);
	}

	// ── Auth: Ed25519 signature verification ──
	// Look up the player to get the authoritative level + registered public key.
	const player = await env.DB.prepare(
		"SELECT level, public_key FROM players WHERE user_id = ?"
	).bind(userId).first<{ level: number; public_key: string }>();

	// Authoritative level: use the DB-recorded level for registered users (anti-inflation).
	// For new users (not yet uploaded), trust the client level as the starting point.
	const authoritativeLevel = player?.level ?? level;

	// Verify signature against the registered key (if registered) or the provided key (new users).
	const expectedKey = player?.public_key ?? publicKey;
	if (!expectedKey || !signature) {
		return json({ ok: false, error: "缺少签名或公钥" }, 403);
	}
	const sigValid = await verifySignature(expectedKey, signature, buildSignedData(body as Record<string, unknown>));
	if (!sigValid) {
		return json({ ok: false, error: "签名验证失败" }, 403);
	}

	// ── Rate limiting ──
	// Per-action (per-user): min 8 seconds between encounters
	const actionLimit = await checkActionRateLimit(env.DB, userId, "encounter", 8);
	if (!actionLimit.ok) {
		return json({ ok: false, error: actionLimit.reason }, 429);
	}
	// Per-IP global: prevents multi-account reward farming (30 actions / 60s)
	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	const ipLimit = await checkIpRateLimit(env.DB, await hashIp(ip, env.IP_HASH_SALT ?? ""), 60, 30);
	if (!ipLimit.ok) {
		return json({ ok: false, error: ipLimit.reason }, 429);
	}

	// Use authoritative level for all reward calculations
	const lvl = authoritativeLevel;

	// Read encounter weights from config
	const weights = await getConfigJSON<number[]>(env.DB, "encounter_weights", [0.30, 0.20, 0.10, 0.10, 0.15, 0.15]);
	const encounterTypes = ["character_encounter", "event", "skill_scroll", "weapon_drop", "item_drop", "gold"];

	// Roll encounter type
	const roll = serverRandom();
	let cumulative = 0;
	let chosenType = encounterTypes[encounterTypes.length - 1];
	for (let i = 0; i < weights.length && i < encounterTypes.length; i++) {
		cumulative += weights[i];
		if (roll < cumulative) {
			chosenType = encounterTypes[i];
			break;
		}
	}

	// Skill scrolls only available above configured min level (P2-5: read from game_config)
	const skillScrollMinLevel = await getConfigFloat(env.DB, "skill_scroll_min_level", 5);
	if (chosenType === "skill_scroll" && lvl < skillScrollMinLevel) {
		chosenType = "gold";
	}

	const location = randomPick(LOCATIONS);
	let result: Record<string, unknown>;

	switch (chosenType) {
		case "character_encounter": {
			const goldReward = addNoise(randomInt(10, 30 + lvl * 3));
			const xpReward = addNoise(randomInt(15, 40 + lvl * 2));
			result = {
				type: "character_encounter",
				location,
				description: `你在${location}遇到了一位江湖人士，切磋武艺后获益良多。`,
				goldReward,
				xpReward,
			};
			await logAction(env, { userId, actionType: "encounter", actionId: "character_encounter", resultJson: result, goldChange: goldReward, xpChange: xpReward, levelAfter: lvl });
			break;
		}
		case "event": {
			const evt = randomPick(ENCOUNTER_EVENTS);
			const goldReward = randomInt(evt.goldMin, evt.goldMax);
			const xpReward = randomInt(evt.xpMin, evt.xpMax);
			result = {
				type: "event",
				location,
				eventId: evt.id,
				description: evt.text,
				goldReward,
				xpReward,
			};
			await logAction(env, { userId, actionType: "encounter", actionId: evt.id, resultJson: result, goldChange: goldReward, xpChange: xpReward, levelAfter: lvl });
			break;
		}
		case "skill_scroll": {
			const skill = randomPick(SKILL_IDS);
			const goldReward = randomInt(5, 30);
			const xpReward = randomInt(50, 100 + lvl * 3);
			result = {
				type: "skill_scroll",
				location,
				skillId: skill,
				description: `你在${location}的一个古墓中发现了一卷武功秘籍残页，上面记载着「${skill}」的修炼法门。`,
				goldReward,
				xpReward,
			};
			await logAction(env, { userId, actionType: "encounter", actionId: "skill_scroll", resultJson: result, goldChange: goldReward, xpChange: xpReward, levelAfter: lvl });
			break;
		}
		case "weapon_drop": {
			const rarity = rollWeaponRarity(lvl);
			const weaponName = randomPick(WEAPON_NAMES_BY_RARITY[rarity] ?? WEAPON_NAMES_BY_RARITY.common);
			const elements = Object.keys(ELEMENT_SYMBOLS);
			const weaponElement = randomPick(elements);
			const atkBonus = Math.floor(lvl * (rarity === "legendary" ? 3 : rarity === "epic" ? 2.2 : rarity === "rare" ? 1.5 : rarity === "uncommon" ? 1.1 : 0.8) * serverRandom());
			const xpReward = randomInt(10, 30 + lvl);
			result = {
				type: "weapon_drop",
				location,
				description: `你在${location}的密室中发现了一把${RARITY_NAMES[rarity]}武器——${weaponName}！`,
				weapon: { name: weaponName, rarity, element: weaponElement, atkBonus },
				xpReward,
			};
			await logAction(env, { userId, actionType: "encounter", actionId: "weapon_drop", resultJson: result, xpChange: xpReward, levelAfter: lvl });
			break;
		}
		case "item_drop": {
			const itemName = serverRandom() < 0.5 ? "疗伤丹" : "回气丸";
			const healAmount = itemName === "疗伤丹" ? Math.floor(maxHp * 0.3) : Math.floor(maxHp * 0.15);
			const hpRestore = Math.min(healAmount, maxHp - currentHp);
			const xpReward = randomInt(5, 20 + lvl);
			result = {
				type: "item_drop",
				location,
				description: `你在${location}发现了丹药「${itemName}」，服用后恢复了${hpRestore}点气血。`,
				item: { name: itemName, hpRestore },
				xpReward,
			};
			await logAction(env, { userId, actionType: "encounter", actionId: "item_drop", resultJson: result, xpChange: xpReward, hpChange: hpRestore, levelAfter: lvl });
			break;
		}
		case "gold":
		default: {
			const goldReward = randomInt(10 + lvl, 30 + lvl * 5);
			result = {
				type: "gold",
				location,
				description: `你在${location}的路上捡到了一个钱袋，里面有${goldReward}两银子。`,
				goldReward,
			};
			await logAction(env, { userId, actionType: "encounter", actionId: "gold", resultJson: result, goldChange: goldReward, levelAfter: lvl });
			break;
		}
	}

	// Add noise to rewards to prevent statistical inference of game parameters
	if (result.goldReward) result.goldReward = addNoise(result.goldReward as number, 0.12);
	if (result.xpReward) result.xpReward = addNoise(result.xpReward as number, 0.12);

	return json({ ok: true, encounter: result });
}

/**
 * POST /api/boss-fight — Server-side boss fight (auto mode)
 *
 * Input: { userId, level, weaponAtk, weaponElement, skillLevel, skillElement, bossId }
 */
async function handleBossFight(request: Request, env: Env): Promise<Response> {
	let body: { userId: string; level: number; weaponAtk: number; weaponElement: string; skillLevel: number; skillElement: string; bossId: string; publicKey?: string; signature?: string };
	try {
		body = await request.json() as typeof body;
	} catch {
		return json({ ok: false, error: "Invalid JSON" }, 400);
	}

	const { userId, level, weaponAtk, weaponElement, skillLevel, skillElement, bossId, publicKey, signature } = body;
	if (!userId || !bossId || level < 1) {
		return json({ ok: false, error: "Missing required fields" }, 400);
	}

	// ── Auth: Ed25519 signature verification ──
	const player = await env.DB.prepare(
		"SELECT level, public_key FROM players WHERE user_id = ?"
	).bind(userId).first<{ level: number; public_key: string }>();

	// Authoritative level: DB level for registered users, client level for new users
	const authoritativeLevel = player?.level ?? level;

	const expectedKey = player?.public_key ?? publicKey;
	if (!expectedKey || !signature) {
		return json({ ok: false, error: "缺少签名或公钥" }, 403);
	}
	const sigValid = await verifySignature(expectedKey, signature, buildSignedData(body as Record<string, unknown>));
	if (!sigValid) {
		return json({ ok: false, error: "签名验证失败" }, 403);
	}

	// ── Rate limiting ──
	// Per-action (per-user): min 15 seconds between boss fights
	const actionLimit = await checkActionRateLimit(env.DB, userId, "boss_fight", 15);
	if (!actionLimit.ok) {
		return json({ ok: false, error: actionLimit.reason }, 429);
	}
	// Per-IP global: prevents multi-account reward farming
	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	const ipLimit = await checkIpRateLimit(env.DB, await hashIp(ip, env.IP_HASH_SALT ?? ""), 60, 30);
	if (!ipLimit.ok) {
		return json({ ok: false, error: ipLimit.reason }, 429);
	}

	const boss = BOSSES.find(b => b.id === bossId);
	if (!boss) {
		return json({ ok: false, error: "Unknown boss" }, 400);
	}

	// Level gate: use authoritative level to prevent level spoofing
	const lvl = authoritativeLevel;
	if (lvl < boss.level - 5) {
		return json({ ok: false, error: `等级不足，挑战${boss.name}需要至少${Math.max(1, boss.level - 5)}级` }, 400);
	}

	// Read damage multipliers from game_config (P2-5: use schema-v2 keys)
	// boss_atk_scale: Boss 攻击力全局缩放；boss_hp_scale: Boss 血量全局缩放
	// element_overcome_multiplier: 克制伤害倍率；element_overcome_reduction: 被克制衰减系数
	const bossAtkScale = await getConfigFloat(env.DB, "boss_atk_scale", 1.0);
	const bossHpScale = await getConfigFloat(env.DB, "boss_hp_scale", 1.0);
	const elementBonusMult = await getConfigFloat(env.DB, "element_overcome_multiplier", 1.5);
	const elementReduction = await getConfigFloat(env.DB, "element_overcome_reduction", 0.7);

	// --- Auto Battle Simulation ---
	const logs: string[] = [];

	// Player stats (scale with authoritative level)
	const playerBaseAtk = 10 + lvl * 3 + weaponAtk;
	const playerBaseDef = 5 + lvl * 1.5;
	const playerHpMax = 100 + lvl * 15;
	let playerHp = playerHpMax;

	// Boss stats (apply config scaling)
	let bossHp = Math.floor(boss.hp * bossHpScale);
	const bossAtk = Math.floor(boss.atk * bossAtkScale);

	const maxRounds = 30;
	let round = 0;

	logs.push(`⚔ 挑战开始！你 VS ${boss.name} (Lv.${boss.level})`);

	while (playerHp > 0 && bossHp > 0 && round < maxRounds) {
		round++;

		// --- Player attack ---
		let playerDmg = Math.max(1, playerBaseAtk - boss.def * 0.5);

		// Element advantage check for weapon
		const weaponChart = ELEMENT_CHART[weaponElement as keyof typeof ELEMENT_CHART];
		if (weaponChart && weaponChart.beats === boss.element) {
			playerDmg = Math.floor(playerDmg * elementBonusMult);
			logs.push(`🔄 第${round}回合: 你的武器属性克制${boss.name}！造成 ${Math.floor(playerDmg)} 伤害`);
		} else if (weaponChart && weaponChart.losesTo === boss.element) {
			playerDmg = Math.floor(playerDmg * elementReduction);
			logs.push(`💨 第${round}回合: 你的武器属性被克制，仅造成 ${Math.floor(playerDmg)} 伤害`);
		} else {
			logs.push(`🗡 第${round}回合: 你造成 ${Math.floor(playerDmg)} 伤害`);
		}

		// Skill bonus (every 3 rounds)
		if (round % 3 === 0 && skillLevel > 0) {
			const skillDmg = Math.floor(playerBaseAtk * 0.5 + skillLevel * 8);
			playerDmg += skillDmg;
			logs.push(`✨ 技能发动！额外造成 ${skillDmg} 伤害`);
		}

		bossHp -= Math.floor(playerDmg);

		if (bossHp <= 0) {
			logs.push(`🎉 ${boss.name} 被击败！`);
			break;
		}

		// --- Boss attack --- (bossAtk already includes boss_atk_scale scaling)
		let bossDmg = Math.max(1, bossAtk - playerBaseDef * 0.4);

		// Skill element defense bonus
		const skillChart = ELEMENT_CHART[skillElement as keyof typeof ELEMENT_CHART];
		if (skillChart && skillChart.beats === boss.element) {
			bossDmg = Math.floor(bossDmg * 0.75);
		}

		// Crit roll (10% chance)
		if (serverRandom() < 0.10) {
			bossDmg = Math.floor(bossDmg * 1.5);
			logs.push(`💥 ${boss.name} 暴击！对你造成 ${bossDmg} 伤害`);
		} else {
			logs.push(`👊 ${boss.name} 对你造成 ${bossDmg} 伤害`);
		}

		playerHp -= bossDmg;

		if (playerHp <= 0) {
			logs.push(`💀 你被 ${boss.name} 击败了...`);
			break;
		}
	}

	if (round >= maxRounds && bossHp > 0 && playerHp > 0) {
		logs.push("⏰ 回合耗尽，战斗平局");
	}

	const won = bossHp <= 0;
	let goldReward = won ? randomInt(boss.goldReward[0], boss.goldReward[1]) : 0;
	let xpReward = won ? boss.xpReward : Math.floor(boss.xpReward * 0.1);
	// Add noise to rewards to prevent statistical inference
	goldReward = addNoise(goldReward, 0.10);
	xpReward = addNoise(xpReward, 0.10);
	const skillXpReward = addNoise(Math.floor(xpReward * 0.3), 0.10);
	const hpChange = won ? Math.floor(playerHpMax * 0.5 - playerHp) : -Math.floor(playerHpMax * 0.3);

	const fightResult = {
		won,
		bossName: boss.name,
		bossId: boss.id,
		goldReward,
		xpReward,
		skillXpReward,
		hpChange,
		playerHpRemaining: Math.max(0, playerHp),
		bossHpRemaining: Math.max(0, bossHp),
		roundsUsed: round,
		logs,
	};

	await logAction(env, {
		userId, actionType: "boss_fight", actionId: bossId,
		resultJson: fightResult,
		goldChange: goldReward, xpChange: xpReward,
		hpChange, levelAfter: lvl,
	});

	return json({ ok: true, fight: fightResult });
}

/**
 * GET /api/config/public — Return non-sensitive display config
 */
function handlePublicConfig(): Response {
	return json({
		ok: true,
		elementSymbols: ELEMENT_SYMBOLS,
		rarityNames: RARITY_NAMES,
		rarityLevelReq: RARITY_LEVEL_REQ,
		locations: LOCATIONS,
		bosses: BOSSES.map(b => ({ id: b.id, name: b.name, level: b.level, element: b.element })),
	});
}

/**
 * GET /badges/:id.png — 成就勋章图片 (从 R2 读取)
 */
async function handleBadge(achId: string, env: Env): Promise<Response> {

	// 只允许已知的 achievement ID
	if (!/^[a-z_\d]+$/.test(achId)) {
		return new Response("Invalid ID", { status: 400 });
	}

	const obj = await env.BADGES.get(`${achId}.png`);
	if (!obj) {
		return new Response("Not found", { status: 404 });
	}

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
	headers.set("Access-Control-Allow-Origin", "*");
	return new Response(obj.body, { headers });
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		try {
			if (path === "/api/upload" && request.method === "POST") {
				return await handleUpload(request, env);
			}

			if (path === "/api/encounter" && request.method === "POST") {
				return await handleEncounter(request, env);
			}

			if (path === "/api/boss-fight" && request.method === "POST") {
				return await handleBossFight(request, env);
			}

			if (path === "/api/config/public" && request.method === "GET") {
				return handlePublicConfig();
			}

			// GET /badges/:id — 成就勋章图片 (R2)
			const badgeMatch = path.match(/^\/badges\/(\w+)\.png$/);
			if (badgeMatch && request.method === "GET") {
				return await handleBadge(badgeMatch[1], env);
			}

			// GET /avatars/:name.png — 角色头像图片 (R2)
			// 支持 URL-encoded 中文文件名
			const avatarMatch = path.match(/^\/avatars\/(.+\.png)$/);
			if (avatarMatch && request.method === "GET") {
				const avatarName = decodeURIComponent(avatarMatch[1]);
				const obj = await env.AVATARS.get(avatarName);
				if (!obj) return new Response("Not found", { status: 404 });
				const headers = new Headers();
				obj.writeHttpMetadata(headers);
				headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
				headers.set("Access-Control-Allow-Origin", "*");
				return new Response(obj.body, { headers });
			}

			if (path === "/api/leaderboard" && request.method === "GET") {
				return await handleLeaderboard(url, env);
			}

			const playerMatch = path.match(/^\/api\/player\/([0-9a-f]{16})$/);
			if (playerMatch && request.method === "GET") {
				return await handlePlayer(playerMatch[1], env);
			}

			if (path === "/api/stats" && request.method === "GET") {
				return await handleStats(env);
			}

			// GET /api/match/:userId — MBTI 性格匹配
			const matchMatch = path.match(/^\/api\/match\/([0-9a-f]{16})$/);
			if (matchMatch && request.method === "GET") {
				return await handleMatch(matchMatch[1], env);
			}

			if (path === "/" || path === "/health") {
				return json({
					ok: true,
					service: "xia-leaderboard",
					version: "2.1.0",
					auth: "Ed25519 per-user signing",
					endpoints: [
						"POST /api/upload  (Ed25519 signed)",
						"GET  /api/leaderboard?sort=level&limit=20&offset=0",
						"GET  /api/player/:userId",
						"GET  /api/stats",
						"GET  /api/match/:userId (MBTI matching)",
						"POST /api/encounter (server-side encounter)",
						"POST /api/boss-fight (server-side boss fight)",
						"GET  /badges/:id.png (achievement badge image)",
						"GET  /avatars/:name.png (character avatar image)",
						"GET  /api/config/public (display config)",
					],
				});
			}

			return json({ ok: false, error: "Not found" }, 404);
		} catch (err) {
			console.error("Unhandled error:", err);
			return json({ ok: false, error: "Internal server error" }, 500);
		}
	},
};
