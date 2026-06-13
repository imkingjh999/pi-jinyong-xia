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
	return supportsImages() || (isTmux() && detectOuterTerminal() !== "unknown");
}

// ─── Avatar 缓存（R2 URL → base64）
const _avatarCache = new Map<string, { base64: string; widthPx: number; heightPx: number }>();
let _prefetchDone = false;
let _onAvatarReady: (() => void) | null = null;

// 通用头像缓存（用于 boss / 群侠录等非角色 ID 查找）
const _generalAvatarCache = new Map<string, { base64: string; widthPx: number; heightPx: number } | null>();

/** 设置头像下载就绪回调（用于触发 Widget 刷新） */
export function onAvatarReady(cb: () => void) {
	_onAvatarReady = cb;
	// 如果头像已经缓存好了（回调注册晚了），立即触发
	if (_avatarCache.size > 0) {
		cb();
		_onAvatarReady = null;
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
		if (anySucceeded && _onAvatarReady) {
			_onAvatarReady();
			_onAvatarReady = null; // 只触发一次
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
	// 如果缓存为空且 prefetch 已完成（说明之前 fetch 可能失败了），重置标记以允许重试
	if (_prefetchDone && _avatarCache.size === 0) {
		_prefetchDone = false;
	}
	prefetchAvatars();
	return _avatarCache.get(char.id) ?? null;
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

/** 构建 Widget 组件（render 每次调用时动态检查头像缓存，避免首次加载时序问题） */
export function buildWidgetComponent(state: PetState, mood: Mood, theme: any) {
	if (state.hidden) return { render: () => [], invalidate: () => {} };
	return {
		_kittyImageId: undefined as number | undefined,
		render(width: number) {
			const statusLines = buildStatusLines(state, mood, width, theme);
			// 每次 render 时重新检查图片能力（避免创建时捕获导致过期）
			if (canShowImages()) {
				const imgData = loadPortraitPng(state);
				if (imgData) return renderImageWithStatus(imgData, statusLines, width);
			}
			return renderAnsiWithStatus(state, statusLines, width);
		},
		invalidate() {},
	};
}
