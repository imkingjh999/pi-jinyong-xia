// @ts-nocheck
/**
 * xia-render.ts — 渲染函数（图片/ANSI/tmux）
 *
 * 通过 setRenderDeps 注入动态加载的模块引用，
 * 避免顶层 await 或循环依赖。
 */

import type { PetState } from "./state.js";
import type { Mood } from "./characters.js";

import { resolve, dirname } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { getCapabilities, visibleWidth, truncateToWidth, renderImage, allocateImageId } from "@earendil-works/pi-tui";

// ─── 注入的模块引用 ───────────────────────────────────────────────
let _chars: any = null;
let _wuxue: any = null;

/** 由 xia.ts 在 loadDeps() 之后调用 */
export function setRenderDeps(chars: any, wuxue: any) {
	_chars = chars;
	_wuxue = wuxue;
}

// ─── 状态栏 ──────────────────────────────────────────────────────
export function renderBar(current: number, max: number, width: number): string {
	const filled = Math.round(Math.min(1, Math.max(0, current / max)) * width);
	return "█".repeat(filled) + "░".repeat(width - filled);
}

/** 渲染武功摘要（Widget 用） */
export function renderSkillSummary(skills: any[]): string {
	if (!skills || skills.length === 0) return "";
	const first = skills[0];
	const def = _wuxue.getSkill(first.id);
	if (!def) return "";
	const count = skills.length > 1 ? ` +${skills.length - 1}` : "";
	return `武功: ${def.name} Lv.${first.level}${count}`;
}

/** 构建状态文本行（不含头像） */
export function buildStatusLines(state: PetState, mood: Mood, width: number, theme: any): string[] {
	if (state.hidden) return [];
	const char = state.characterId ? _chars.getCharacter(state.characterId) : null;
	const w = state.wuxue;
	const lines: string[] = [];
	const displayName = state.nickname || char?.name || "江湖路人";
	const title = char ? char.title : "籍籍无名";
	lines.push(theme.bold(`${displayName}`) + theme.fg("accent", ` · ${title} · Lv.${w.level} ${_wuxue.getLevelTitle(w.level)}`));
	const weaponDef = state.weapon ? _wuxue.getWeaponDef(state.weapon) : null;
	const weaponAtk = weaponDef ? weaponDef.attack : 0;
	_wuxue.updateCombatStats(w, weaponAtk);
	const wuli = _wuxue.getWuli(w, weaponAtk);
	const barW = Math.max(4, Math.min(16, Math.floor((width - 50) / 2)));
	const hpColor = (w.hp / w.maxHp) > 0.5 ? "success" : (w.hp / w.maxHp) > 0.2 ? "warning" : "error";
	lines.push(theme.fg("accent", "血量") + theme.fg(hpColor, renderBar(w.hp, w.maxHp, barW)) + theme.fg("accent", `${Math.round(w.hp)}/${w.maxHp}`));
	lines.push(theme.fg("accent", "经验") + theme.fg("accent", renderBar(w.xp, w.xpToNext, barW)) + theme.fg("accent", `${w.xp}/${w.xpToNext}`));
	const buffs: string[] = [];
	if (w.attackBuff > 0) buffs.push(`⚔️+${w.attackBuff}`);
	if (w.defenseBuff > 0) buffs.push(`🛡️+${w.defenseBuff}`);
	if (w.xpBonus > 1) buffs.push(`📖×${w.xpBonus}`);
	const buffText = buffs.length > 0 ? theme.fg("accent", ` [${buffs.join(" ")}]`) : "";
	const skillText = renderSkillSummary(state.martialSkills);
	const weaponText = weaponDef ? `${_wuxue.getRaritySymbol(weaponDef.rarity)}${weaponDef.name}(${_wuxue.ELEMENT_SYMBOL[weaponDef.element]}+${weaponDef.attack})` : "赤手空拳";
	const itemCount = Object.values(w.items).reduce((a: number, b: number) => a + b, 0);
	const infoParts: string[] = [];
	if (skillText) infoParts.push(`武功:${skillText.replace("武功: ", "")}`);
	infoParts.push(`💰${w.gold}金`);
	infoParts.push(`⚔️${weaponText}`);
	if (itemCount > 0) infoParts.push(`🎒${itemCount}件`);
	lines.push(truncateToWidth(theme.fg("accent", infoParts.join(" · ")) + buffText, width));
	// 帮派 + 职业 + 天赋
	const systemParts: string[] = [];
	if (state.factionId) {
		const faction = _wuxue.getFaction(state.factionId);
		if (faction) systemParts.push(`${faction.emoji}${faction.name}`);
	}
	if (state.professionId) {
		const prof = _wuxue.getProfession(state.professionId);
		if (prof) systemParts.push(`${prof.emoji}${prof.name}`);
	}
	if (state.talents && state.talents.length > 0) {
		systemParts.push(`🌟${state.talents.length}天赋`);
	}
	if (systemParts.length > 0) {
		lines.push(theme.fg("dim", systemParts.join(" · ")));
	}
	lines.push(theme.fg("accent", `⚔️${w.attack} 🛡️${w.defense}`));
	return lines;
}

// ─── ANSI 头像 ────────────────────────────────────────────────────
export function buildAnsiArtLines(state: PetState): string[] | null {
	const char = state.characterId ? _chars.getCharacter(state.characterId) : null;
	if (!char) return null;
	try {
		const portraitPaths = [
			resolve(dirname(import.meta.dirname!), '..', '..', 'assets', 'portrait-ansi', 'portraits.json'),
			resolve(dirname(import.meta.dirname!), '..', 'assets', 'portrait-ansi', 'portraits.json'),
		];
		for (const pp of portraitPaths) {
			if (existsSync(pp)) {
				const portraitData = JSON.parse(readFileSync(pp, "utf8"));
				if (portraitData[char.id]) return portraitData[char.id];
				break;
			}
		}
	} catch { /* ignore */ }
	return char.compact || null;
}

// ─── 终端检测 ─────────────────────────────────────────────────────
function supportsImages(): boolean {
	try { return !!getCapabilities()?.images; } catch { return false; }
}

function isTmux(): boolean {
	return !!process.env.TMUX;
}

/** 是否运行在「全屏缓冲型」环境（tmux / cmux / zellij 等多路复用器）。
 *  这些环境由缓冲管理 widget 行数变化：ansi→image 行数增长不会触发 pi-tui inline diff
 *  的 append 抖动，因此 ansi 模式可直接紧凑输出「内容 + 分隔线」，无需 normalize 到
 *  FIXED_WIDGET_ROWS 补空白（否则头像未加载时会留下大片尾部空行）。
 *  裸跑终端（raw Ghostty / kitty 等）无此缓冲保护，行数增长会导致状态栏重叠，必须 normalize 防抖。 */
function hasManagedBuffer(): boolean {
	if (isTmux()) return true;
	if (process.env.ZELLIJ) return true;
	// cmux 基于 Ghostty（TERM_PROGRAM=ghostty、GHOSTTY_RESOURCES_DIR 指向 cmux.app），
	// 但不设独立 env；通过 GHOSTTY_RESOURCES_DIR 路径里的 cmux.app 识别，以区别于裸 Ghostty
	// （裸 Ghostty 的该路径为 /Applications/Ghostty.app/... 或 homebrew 路径，不含 cmux）。
	const ghosttyDir = process.env.GHOSTTY_RESOURCES_DIR || "";
	return ghosttyDir.includes("cmux");
}

let _cachedOuterTerminal: string | undefined;

function detectViaProcessTree(): string {
	try {
		const clientOut = execSync("tmux list-clients -F '#{client_pid}' 2>/dev/null", { encoding: "utf8", timeout: 2000 }).trim();
		const clientPids = clientOut.split("\n");
		for (const pidStr of clientPids) {
			let pid = parseInt(pidStr.trim(), 10);
			if (isNaN(pid)) continue;
			for (let i = 0; i < 15 && pid > 1; i++) {
				const comm = execSync(`ps -o comm= -p ${pid} 2>/dev/null`, { encoding: "utf8", timeout: 500 }).trim();
				if (comm.includes("iTerm") || comm.includes("iterm")) return "iterm2";
				if (comm.includes("kitty")) return "kitty";
				if (comm.includes("ghostty") || comm.includes("Ghostty")) return "kitty";
				if (comm.includes("WezTerm") || comm.includes("wezterm")) return "kitty";
				const ppid = execSync(`ps -o ppid= -p ${pid} 2>/dev/null`, { encoding: "utf8", timeout: 500 }).trim();
				const next = parseInt(ppid, 10);
				if (next === pid || isNaN(next)) break;
				pid = next;
			}
		}
	} catch { /* ignore */ }
	return "unknown";
}

function detectOuterTerminal(): string {
	if (_cachedOuterTerminal !== undefined) return _cachedOuterTerminal;
	const termProgram = (process.env.TERM_PROGRAM || "").toLowerCase();
	const term = (process.env.TERM || "").toLowerCase();
	if (termProgram.includes("kitty") || termProgram.includes("ghostty")) { _cachedOuterTerminal = "kitty"; return "kitty"; }
	if (termProgram.includes("wezterm")) { _cachedOuterTerminal = "kitty"; return "kitty"; }
	if (termProgram.includes("iterm")) { _cachedOuterTerminal = "iterm2"; return "iterm2"; }
	if (term.includes("xterm-kitty")) { _cachedOuterTerminal = "kitty"; return "kitty"; }
	if (process.env.ITERM_SESSION_ID || process.env.ITERM_PROFILE) { _cachedOuterTerminal = "iterm2"; return "iterm2"; }
	if (isTmux()) { const r = detectViaProcessTree(); _cachedOuterTerminal = r; return r; }
	_cachedOuterTerminal = "unknown";
	return "unknown";
}

function wrapTmuxPassthrough(sequence: string): string {
	const escaped = sequence.replace(/\x1b/g, "\x1b\x1b");
	return `\x1bPtmux;\x1b${escaped}\x1b\\`;
}

/** 是否支持图片显示（包括 tmux passthrough） */
export function canShowImages(): boolean {
	let capImages: string | undefined;
	try { capImages = getCapabilities()?.images; } catch { capImages = undefined; }
	// iTerm2 裸跑（非 tmux）：1337 内联图片协议与 pi-tui 的 inline diff 渲染不兼容，
	// 头像出现后会导致状态栏错乱（重复/残留/乱位）。直接禁用 PNG，回退 ANSI art。
	// tmux 下的 iTerm2（DCS passthrough）由 tmux 全屏缓冲管理，渲染正常，保留。
	if (capImages === "iterm2" && !isTmux()) return false;
	return !!capImages || (isTmux() && detectOuterTerminal() !== "unknown");
}

// ─── Avatar 缓存（R2 URL → base64）
const _avatarCache = new Map<string, { base64: string; widthPx: number; heightPx: number }>();
let _prefetchDone = false;
// 头像预取失败后的退避重试定时器（单例）。避免在 widget render 路径上每帧重新发起请求。
let _prefetchRetryTimer: ReturnType<typeof setTimeout> | null = null;
let _onAvatarReady: (() => void) | null = null;

// 通用头像缓存（用于 boss / 群侠录等非角色 ID 查找）
const _generalAvatarCache = new Map<string, { base64: string; widthPx: number; heightPx: number } | null>();

/** 设置头像下载就绪回调（用于触发 Widget 刷新） */
export function onAvatarReady(cb: () => void) {
	_onAvatarReady = cb;
	// 如果头像已经缓存好了（回调注册晚了），立即触发。不置空：与 prefetchAvatars 的
	// checkDone 保持一致，允许后续退避重试完成后再刷新（切到图片模式）。
	if (_avatarCache.size > 0) {
		cb();
	}
}

/** 异步预缓存头像（在后台下载） */
export function prefetchAvatars(): void {
	if (_prefetchDone) return;
	_prefetchDone = true;
	const chars = _chars?.CHARACTERS;
	if (!chars) return;
	let pending = 0;
	let anySucceeded = false;
	const checkDone = () => {
		// 等整批下载完成后再触发回调，避免每个角色下载成功都重建 widget。
		// 不置空 _onAvatarReady：允许后续退避重试 prefetch 完成后再次触发刷新。
		if (pending > 0) return;
		if (anySucceeded && _onAvatarReady) {
			_onAvatarReady();
		}
	};
	for (const c of chars) {
		if (_avatarCache.has(c.id)) continue;
		pending++;
		const url = `https://xia.openclawd.qzz.io/avatars/${encodeURIComponent(c.avatarFile)}`;
		fetch(url).then(r => {
			if (!r.ok) return null;
			return r.arrayBuffer();
		}).then(ab => {
			if (!ab) { pending--; checkDone(); return; }
			const buf = Buffer.from(ab);
			const w = buf.readUInt32BE(16);
			const h = buf.readUInt32BE(20);
			_avatarCache.set(c.id, { base64: buf.toString("base64"), widthPx: w, heightPx: h });
			anySucceeded = true;
			pending--;
			checkDone();
		}).catch(err => {
			pending--;
			checkDone();
		});
	}
	if (pending === 0) checkDone(); // 全部已缓存
}

/** 根据 avatarFile 名称同步获取头像数据（先查角色缓存，再查通用缓存） */
export function getAvatarByName(avatarFile: string): { base64: string; widthPx: number; heightPx: number } | null {
	// 先在角色 ID 缓存中查找
	const chars = _chars?.CHARACTERS;
	if (chars) {
		for (const c of chars) {
			if (c.avatarFile === avatarFile && _avatarCache.has(c.id)) {
				return _avatarCache.get(c.id)!;
			}
		}
	}
	// 再查通用缓存
	return _generalAvatarCache.get(avatarFile) ?? null;
}

/** 异步加载头像（用于 boss / 群侠录详情等场景） */
export async function fetchAvatarByName(avatarFile: string): Promise<{ base64: string; widthPx: number; heightPx: number } | null> {
	// 先同步查找
	const cached = getAvatarByName(avatarFile);
	if (cached) return cached;
	// 通用缓存中已标记为 null 则不再尝试
	if (_generalAvatarCache.has(avatarFile) && _generalAvatarCache.get(avatarFile) === null) return null;
	// 从 R2 下载
	try {
		const url = `https://xia.openclawd.qzz.io/avatars/${encodeURIComponent(avatarFile)}`;
		const r = await fetch(url);
		if (!r.ok) { _generalAvatarCache.set(avatarFile, null); return null; }
		const ab = await r.arrayBuffer();
		const buf = Buffer.from(ab);
		const w = buf.readUInt32BE(16);
		const h = buf.readUInt32BE(20);
		const data = { base64: buf.toString("base64"), widthPx: w, heightPx: h };
		_generalAvatarCache.set(avatarFile, data);
		return data;
	} catch {
		_generalAvatarCache.set(avatarFile, null);
		return null;
	}
}

// ─── PNG 加载（同步读缓存）───────────────────────────────────────
export function loadPortraitPng(state: PetState): { base64: string; widthPx: number; heightPx: number } | null {
	const char = state.characterId ? _chars.getCharacter(state.characterId) : null;
	if (!char) return null;
	const cached = _avatarCache.get(char.id) ?? null;
	// 当前角色头像缺失且预取已完成：安排一次（单例）退避重试。
	// 关键：不在 widget render 路径上重置 _prefetchDone + 重新 fetch 全部头像——
	// 那会让每帧 render 都发起 25 个网络请求，且头像随网络时序在 null↔data 间抖动，
	// 导致 widget 在 图片↔ANSI 分支反复切换、行数抖动，inline TUI（iTerm2 裸跑）下
	// 表现为状态栏重复/不停输出。预取由 onSessionStart 一次性触发。
	if (!cached && _prefetchDone && !_prefetchRetryTimer) {
		_prefetchRetryTimer = setTimeout(() => {
			_prefetchRetryTimer = null;
			_prefetchDone = false; // 允许 prefetchAvatars 再执行一次
			prefetchAvatars();
		}, 30000);
	}
	return cached;
}

// ─── Kitty 分块传输 ───────────────────────────────────────────────
function buildKittyChunkedSequence(imgId: number, base64: string): string {
	const CHUNK = 4096;
	const parts: string[] = [];
	for (let offset = 0; offset < base64.length; offset += CHUNK) {
		const chunk = base64.substring(offset, offset + CHUNK);
		const isLast = offset + CHUNK >= base64.length;
		if (offset === 0) {
			const more = isLast ? "" : ",m=1";
			parts.push(`\x1b_Ga=T,f=100,i=${imgId},U=1,q=2${more};${chunk}\x1b\\`);
		} else {
			const more = isLast ? "" : ",m=1";
			parts.push(`\x1b_Gm=1${more};${chunk}\x1b\\`);
		}
	}
	return parts.join("");
}

// ─── 三种渲染函数 ─────────────────────────────────────────────────

/** tmux DCS passthrough 渲染 */
function renderTmuxImageWithStatus(
	imgData: { base64: string; widthPx: number; heightPx: number },
	statusLines: string[], maxWidth: number, outerTerm: string, fixedImageId?: number,
): string[] {
	const imgCellW = 12;
	const gap = 2;
	let seq: string;
	let rows: number;
	if (outerTerm === "kitty") {
		const imgId = fixedImageId ?? allocateImageId();
		const kittySeq = buildKittyChunkedSequence(imgId, imgData.base64);
		seq = wrapTmuxPassthrough(kittySeq);
		rows = 12;
	} else if (outerTerm === "iterm2") {
		const itermSeq = `\x1b]1337;File=inline=1;width=${imgCellW};height=12:${imgData.base64}\x07`;
		seq = wrapTmuxPassthrough(itermSeq);
		rows = 12;
	} else {
		return statusLines;
	}
	const cols = imgCellW;
	const maxRows = Math.max(rows, statusLines.length);
	const lines: string[] = [];
	for (let i = 0; i < maxRows; i++) {
		const stat = statusLines[i] || "";
		const statAvail = Math.max(0, maxWidth - cols - gap);
		const statCut = statAvail > 0 ? truncateToWidth(stat, statAvail) : "";
		const padW = Math.max(0, statAvail - visibleWidth(statCut));
		if (i === 0) {
			lines.push(statCut + " ".repeat(padW + gap) + seq);
		} else if (i < rows) {
			lines.push(statCut + " ".repeat(padW + gap));
		} else {
			lines.push(statCut);
		}
	}
	return lines;
}

/** 直接图片渲染（kitty / iTerm2） */
export function renderImageWithStatus(
	imgData: { base64: string; widthPx: number; heightPx: number },
	statusLines: string[], maxWidth: number, fixedImageId?: number,
): string[] {
	const imgCellW = 12;
	const gap = 2;
	const imageId = fixedImageId ?? (getCapabilities()?.images === "kitty" ? allocateImageId() : undefined);
	const inTmux = isTmux();
	const outerTerm = detectOuterTerminal();
	if (inTmux && !supportsImages()) {
		return renderTmuxImageWithStatus(imgData, statusLines, maxWidth, outerTerm, fixedImageId);
	}
	const result = renderImage(imgData.base64, imgData, {
		maxWidthCells: imgCellW, maxHeightCells: 12, imageId, moveCursor: false,
	});
	if (!result) return statusLines;
	const seq = result.sequence;
	const rows = result.rows;
	const cols = imgCellW;
	const caps = getCapabilities();
	const isKitty = caps?.images === "kitty";
	const maxRows = Math.max(rows, statusLines.length);
	const lines: string[] = [];
	for (let i = 0; i < maxRows; i++) {
		const stat = statusLines[i] || "";
		const statAvail = Math.max(0, maxWidth - cols - gap);
		const statCut = statAvail > 0 ? truncateToWidth(stat, statAvail) : "";
		const padW = Math.max(0, statAvail - visibleWidth(statCut));
		if (isKitty) {
			if (i === 0) lines.push(statCut + " ".repeat(padW + gap) + seq);
			else if (i < rows) lines.push(statCut + " ".repeat(padW + gap));
			else lines.push(statCut);
		} else {
			if (i < rows - 1) lines.push(statCut + " ".repeat(padW + gap));
			else if (i === rows - 1) lines.push(statCut + " ".repeat(padW + gap) + seq);
			else lines.push(statCut);
		}
	}
	return lines;
}

/** ANSI 头像（无图片）渲染：stats LEFT, art RIGHT */
export function renderAnsiWithStatus(state: PetState, statusLines: string[], maxWidth = 80): string[] {
	const artLines = buildAnsiArtLines(state) || ["  ╭──╮", "  │👤│  江湖路人", "  ╰┬┬╯  初入江湖"];
	const lines: string[] = [];
	const GAP = "  ";
	const artWidth = Math.max(...artLines.map((l) => visibleWidth(l)));
	const maxRows = Math.max(artLines.length, statusLines.length);
	for (let i = 0; i < maxRows; i++) {
		const art = artLines[i] || "";
		const stat = statusLines[i] || "";
		const statAvail = maxWidth - artWidth - GAP.length;
		const statCut = truncateToWidth(stat, Math.max(0, statAvail));
		const pad = Math.max(0, statAvail - visibleWidth(statCut));
		const line = statCut + " ".repeat(pad) + GAP + art;
		lines.push(truncateToWidth(line, maxWidth));
	}
	return lines;
}

// ─── Boss 头像文件映射 ──────────────────────────────────────────
const BOSS_AVATAR_MAP: Record<string, string> = {
	"欧阳克": "欧阳克.png",
	"左冷禅": "左冷禅.png",
	"裘千仞": "裘千仞.png",
	"成昆": "成昆.png",
	"公孙止": "公孙止.png",
	"范遥": "范遥.png",
	"岳不群": "岳不群.png",
	"韦一笑": "韦一笑.png",
	"殷天正": "殷天正.png",
	"谢逊": "谢逊.png",
	"杨逍": "杨逍.png",
	"东方不败": "东方不败.png",
	"张三丰": "张三丰.png",
	"金轮法王": "金轮法王.png",
};

/** 获取 Boss 头像文件名 */
export function getBossAvatarFile(bossName: string): string | null {
	return BOSS_AVATAR_MAP[bossName] ?? null;
}

/** 渲染带头像的自定义视图（用于 boss 遭遇 / 群侠录详情） */
export function renderAvatarWithLines(
	imgData: { base64: string; widthPx: number; heightPx: number },
	lines: string[], maxWidth: number,
): string[] {
	return renderImageWithStatus(imgData, lines, maxWidth);
}

/**
 * Widget 固定输出行数：与 image 模式的 maxHeightCells(12) 一致。
 * 关键：widget 行数必须在整个生命周期恒定。若 ANSI(6行)→image(12行) 发生行数增加，
 * pi-tui 的 inline diff 会把更新当作「追加」处理而不清除旧行，导致 iTerm2 裸跑下
 * 状态栏出现两份重叠（静止一段时间、头像下载完成后触发）。
 * 因此无论哪种模式，render 都 normalize 到 FIXED_WIDGET_ROWS：不足补空行，超出截断。
 */
const FIXED_WIDGET_ROWS = 12;

function normalizeRows(lines: string[], n: number): string[] {
	if (lines.length === n) return lines;
	if (lines.length > n) return lines.slice(0, n);
	return [...lines, ...Array<string>(n - lines.length).fill("")];
}

/** 横向分隔线：纯 ANSI 模式下作为 widget 最后一行，隔开本 widget 与下方其他 widget（如 pi-a2a）。 */
function renderSeparatorLine(width: number, theme: any): string {
	return theme.fg("dim", "─".repeat(Math.max(0, width)));
}

/**
 * 构建 Widget 组件。
 * 渲染模式（图片/ANSI）在首次 render 确定后固定，避免头像异步下载过程中每帧在
 * 分支间切换导致 widget 行数抖动（图片 12 行 / ANSI art / fallback 纯文字 行数不同），
 * inline TUI（iTerm2 裸跑）下行数抖动会表现为状态栏重复/不停输出。
 * 头像就绪后由 onAvatarReady → updateWidget(force) 重建组件切换到图片模式。
 * 无论何种模式，输出行数恒定 normalize 到 FIXED_WIDGET_ROWS，避免行数变化触发
 * pi-tui 的 append 逻辑（旧行残留）。
 */
export function buildWidgetComponent(state: PetState, mood: Mood, theme: any) {
	if (state.hidden) return { render: () => [], invalidate: () => {} };
	return {
		_mode: undefined as "image" | "ansi" | undefined,
		_kittyImageId: undefined as number | undefined,
		render(width: number) {
			const statusLines = buildStatusLines(state, mood, width, theme);
			if (this._mode === undefined) {
				this._mode = (canShowImages() && loadPortraitPng(state)) ? "image" : "ansi";
			}
			let lines: string[];
			if (this._mode === "image") {
				const imgData = loadPortraitPng(state);
				if (imgData) {
					// 复用 imageId：kitty 协议下避免每次 render 分配新 id 导致图片泄漏/重传堆积
					if (this._kittyImageId === undefined) this._kittyImageId = allocateImageId();
					lines = renderImageWithStatus(imgData, statusLines, width, this._kittyImageId);
				} else {
					this._mode = "ansi"; // 头像被逐出（罕见），回退文字
					lines = renderAnsiWithStatus(state, statusLines, width);
				}
			} else {
				lines = renderAnsiWithStatus(state, statusLines, width);
			}
			// 防抖（normalize 12 行）只在「裸跑 + 支持图」时需要：ansi 可能异步切 image，
			// 裸跑环境无全屏缓冲保护，行数增加会触发 pi-tui inline diff 的 append 导致状态栏重叠。
			// image 与 ansi 模式统一走此判断——之前 image 模式有无条件 normalize，导致 cmux/tmux 等
			// 多路复用器在头像下载后切到 image 模式仍被撑到 12 行，留下大片尾部空白。
			// tmux/cmux/zellij 等多路复用器有全屏缓冲管理行数变化，无抖动；iTerm2 裸跑 canShowImages 恒 false 不切 image，无抖动。
			if (!hasManagedBuffer() && canShowImages()) {
				return normalizeRows(lines, FIXED_WIDGET_ROWS);
			}
			// 其余情况（多路复用器下 ansi/image / 不支持图环境）：紧凑输出「内容 + 分隔线」，去掉尾部空 padding。
			return [...lines, renderSeparatorLine(width, theme)];
		},
		invalidate() {},
	};
}
