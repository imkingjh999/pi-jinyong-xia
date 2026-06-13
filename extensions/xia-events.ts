// @ts-nocheck
/**
 * xia-events.ts — 事件处理、状态管理、辅助函数（从 xia.ts 拆出）
 */

import type { PetState } from "./state.js";

import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { matchesKey, Key, getCapabilities, visibleWidth, truncateToWidth, renderImage, allocateImageId } from "@earendil-works/pi-tui";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bust = (rel: string) => pathToFileURL(resolve(__dirname, rel)).href + `?_t=${Date.now()}`;

// ═══════════════════════════════════════════════════════════════════════════
// Module-level state (set by xia.ts activate)
// ═══════════════════════════════════════════════════════════════════════════
let _chars: any = null;
let _wuxue: any = null;
let _state: any = null;
let petState: PetState;

let currentMood = "idle";
let updateTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let widgetHidden = false;
const INTERACTIVE_TOOLS = new Set(["ask_user_question", "image_review"]);

// Pending notifications (queued when ctx is unavailable, flushed on next ctx)
let pendingNotifications: string[] = [];

export function flushNotifications(ctx: any) {
	if (!ctx?.ui?.notify || pendingNotifications.length === 0) return;
	for (const msg of pendingNotifications) ctx.ui.notify(msg, "info");
	pendingNotifications = [];
}

// Re-exported for xia.ts to use in cmdDeps
export function getState() { return { _chars, _wuxue, _state, petState, currentMood, updateTimer, saveTimer, widgetHidden }; }
export function setState(s: any) {
	_chars = s._chars; _wuxue = s._wuxue; _state = s._state; petState = s.petState;
	currentMood = s.currentMood ?? "idle";
	updateTimer = s.updateTimer ?? null;
	saveTimer = s.saveTimer ?? null;
	widgetHidden = s.widgetHidden ?? false;
}
export function setPetState(ps: PetState) { petState = ps; }
export function setUpdateTimer(t: any) { updateTimer = t; }
export function setSaveTimer(t: any) { saveTimer = t; }

// ═══════════════════════════════════════════════════════════════════════════
// Module loading
// ═══════════════════════════════════════════════════════════════════════════
let _xiaRender: any = null;
let _xiaSelect: any = null;
let _xiaCommands: any = null;

export async function loadSubModules() {
	_xiaRender = await import(bust("./xia-render.js"));
	_xiaSelect = await import(bust("./xia-select.js"));
	_xiaCommands = await import(bust("./xia-commands.js"));
	// 后台预缓存头像，确保选人时能立即展示
	try { _xiaRender.prefetchAvatars(); } catch { /* ignore */ }
}

export async function loadDeps() {
	if (_chars && _wuxue && _state) return;
	[_chars, _wuxue, _state] = await Promise.all([
		import(bust("./characters.js")),
		import(bust("./wuxue.js")),
		import(bust("./state.js")),
	]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Proxy helpers
// ═══════════════════════════════════════════════════════════════════════════
export const setRenderDeps = (...args: any[]) => _xiaRender.setRenderDeps(...args);
export const renderSkillSummary = (...args: any[]) => _xiaRender.renderSkillSummary(...args);
export const buildWidgetComponent = (...args: any[]) => _xiaRender.buildWidgetComponent(...args);
export const onAvatarReady = (...args: any[]) => _xiaRender.onAvatarReady(...args);
export const setSelectDeps = (...args: any[]) => _xiaSelect.setSelectDeps(...args);
export const pagedSelect = (...args: any[]) => _xiaSelect.pagedSelect(...args);
export const wrapSelect = (...args: any[]) => _xiaSelect.wrapSelect(...args);
export const runSubCommand = (...args: any[]) => _xiaCommands.runSubCommand(...args);

// ═══════════════════════════════════════════════════════════════════════════
// Utility functions
// ═══════════════════════════════════════════════════════════════════════════
export function showLines(ctx: any, lines: string[]) {
	ctx.ui.notify(lines.join("\n"), "info");
}

/** 升级时奖励天赋点 */
function grantTalentPointOnLevelUp() {
	if (petState) {
		petState.talentPoints = (petState.talentPoints || 0) + 1;
	}
}

export function scheduleSave() {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(async () => { _state.saveState(petState); saveTimer = null; tryTelemetryUpload(); }, 5000);
}

let _telemetryMod: any = null;

async function tryTelemetryUpload() {
	try {
		if (!petState?.telemetryEnabled) return;
		if (!_chars?.getCharacter || !_wuxue?.getLevelTitle) return;
		// 缓存 telemetry 模块，避免 bust() 每次创建新实例导致 lastUploadTime 重置
		if (!_telemetryMod) _telemetryMod = await import(bust("./telemetry.js"));
		const { maybeUpload } = _telemetryMod;
		const { readFileSync } = await import("node:fs");
		const version: string = JSON.parse(readFileSync(resolve(__dirname, "..", "..", "package.json"), "utf8")).version;
		const result = await maybeUpload(petState, _chars.getCharacter, _wuxue.getLevelTitle, version);
		if (!result.ok && result.error) {
			if (!/频繁|wait|rate/i.test(result.error)) {
				pendingNotifications.push(`⚠️ 江湖巡查异常：${result.error}`);
			}
		}
	} catch {
	}
}

export function updateWidget(ctx: any) {
	if (!ctx?.hasUI || !petState) return;
	if (widgetHidden) {
		ctx.ui.setWidget("jinyong-xia", undefined, { placement: "belowEditor" });
		return;
	}
	const theme = ctx.ui.theme;
	ctx.ui.setWidget("jinyong-xia", (_tui: any, tuiTheme: any) => {
		return buildWidgetComponent(petState, currentMood, tuiTheme || theme);
	}, { placement: "belowEditor" });
}

export function setMood(mood: string, ctx: any) {
	if (currentMood === mood) return;
	currentMood = mood;
	updateWidget(ctx);
}

// ═══════════════════════════════════════════════════════════════════════════
// 角色与武功分配
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 让玩家在首次使用时选择英雄角色
 * 返回选中的角色名，取消/异常则回退到随机分配
 */
export async function selectCharacter(ctx: any): Promise<{ charName: string } | null> {
	if (petState.characterId) return null;
	const charList: any[] = _chars.CHARACTERS;
	const theme = ctx.ui.theme;
	// 按小说分组显示
	const labels = charList.map(c => {
		const skills = c.exclusiveSkills.map((sid: string) => {
			const def = _wuxue.getSkill(sid);
			return def ? def.name : sid;
		}).join("、");
		return `${c.name}「${c.title}」— ${c.novel} — ${skills}`;
	});

	// 循环选择：选角色 → 看头像 → 确认/返回
	while (true) {
		const idx = await pagedSelect(ctx, "🎭 选择你的江湖身份", labels, false);
		if (idx >= 0 && idx < charList.length) {
			const char = charList[idx];

			// 尝试加载头像并展示预览
			let avatarData: { base64: string; widthPx: number; heightPx: number } | null = null;
			let canImg = false;
			try {
				avatarData = await _xiaRender.fetchAvatarByName(char.avatarFile);
				canImg = !!avatarData && _xiaRender.canShowImages();
			} catch { /* ignore */ }

			// 构建详情行
			const ES = _wuxue.ELEMENT_SYMBOL;
			const exclusiveNames = char.exclusiveSkills.map((sid: string) => {
				const sd = _wuxue.getSkill(sid);
				return sd ? `    ${ES[sd.element] ?? ""}${sd.name} — ${sd.description}` : `    ${sid}`;
			});
			const detailLines = [
				theme.bold(`  ═══ ${char.name} · ${char.title} ═══`),
				theme.fg("accent", `  《${char.novel}》`),
				"",
				theme.bold("  【专属武功】"),
				...exclusiveNames.map((n: string) => theme.fg("accent", n)),
				"",
				theme.fg("muted", `  ${char.description}`),
			];

			if (canImg) {
				// 展示头像预览，ESC 返回选人
				const confirmed = await showAvatarPreview(ctx, detailLines, avatarData, theme);
				if (confirmed) {
					petState.characterId = char.id;
					return { charName: char.name };
				}
				// 未确认，回到选择列表继续
				continue;
			} else {
				// 无头像时用文字确认
				const detailWithHint = [...detailLines, "", theme.fg("dim", "  ✅ enter 确认选择 · ↩️ esc 返回重选")];
				const confirmed = await showTextPreview(ctx, detailWithHint, theme);
				if (confirmed) {
					petState.characterId = char.id;
					return { charName: char.name };
				}
				continue;
			}
		}
		// 取消则随机
		const char = charList[Math.floor(Math.random() * charList.length)];
		petState.characterId = char.id;
		return { charName: char.name };
	}
}

/** 显示带头像的角色预览（头像在左，资料在右），enter 确认，esc 返回 */
function showAvatarPreview(
	ctx: any, detailLines: string[],
	avatarData: { base64: string; widthPx: number; heightPx: number },
	theme: any,
): Promise<boolean> {
	return new Promise((resolve) => {
		ctx.ui.custom((tui: any, _theme: any, _kb: any, done: (v: boolean) => void) => {
			let disposed = false;
			return {
				render(width: number) {
					const imgCellW = 10;
					const gap = 2;
					const caps = getCapabilities();
					const imageId = caps?.images === "kitty" ? allocateImageId() : undefined;
					const result = renderImage(avatarData.base64, avatarData, {
						maxWidthCells: imgCellW, maxHeightCells: 10, imageId, moveCursor: false,
					});
					if (!result) return [...detailLines, "", _theme.fg("dim", "  ✅ enter 确认选择 · ↩️ esc 返回重选")];

					const seq = result.sequence;
					const rows = result.rows;
					const isKitty = caps?.images === "kitty";
					const movePast = `\x1b[${imgCellW + gap}C`;
					const allLines = [...detailLines, "", _theme.fg("dim", "  ✅ enter 确认选择 · ↩️ esc 返回重选")];
					const maxRows = Math.max(rows, allLines.length);
					const lines: string[] = [];
					for (let i = 0; i < maxRows; i++) {
						const text = allLines[i] || "";
						const textAvail = Math.max(0, width - imgCellW - gap);
						const textCut = textAvail > 0 ? truncateToWidth(text, textAvail) : "";
						const padW = Math.max(0, textAvail - visibleWidth(textCut));
						if (isKitty) {
							if (i === 0) lines.push(seq + movePast + textCut + " ".repeat(padW));
							else if (i < rows) lines.push(" ".repeat(imgCellW + gap) + textCut + " ".repeat(padW));
							else lines.push(textCut);
						} else {
							if (i < rows - 1) lines.push(" ".repeat(imgCellW + gap) + textCut + " ".repeat(padW));
							else if (i === rows - 1) lines.push(seq + movePast + textCut + " ".repeat(padW));
							else lines.push(textCut);
						}
					}
					return lines;
				},
				invalidate() {},
				handleInput(data: Buffer) {
					if (disposed) return;
					if (matchesKey(data, Key.enter)) {
						disposed = true;
						done(true); // 确认
					} else if (matchesKey(data, Key.escape)) {
						disposed = true;
						done(false); // 返回重选
					}
				},
			};
		}).then((result: boolean) => resolve(result));
	});
}

/** 纯文字预览（无头像时），enter 确认，esc 返回 */
function showTextPreview(
	ctx: any, detailLines: string[],
	theme: any,
): Promise<boolean> {
	return new Promise((resolve) => {
		ctx.ui.custom((tui: any, _theme: any, _kb: any, done: (v: boolean) => void) => {
			let disposed = false;
			return {
				render(width: number) {
					return detailLines;
				},
				invalidate() {},
				handleInput(data: Buffer) {
					if (disposed) return;
					if (matchesKey(data, Key.enter)) {
						disposed = true;
						done(true);
					} else if (matchesKey(data, Key.escape)) {
						disposed = true;
						done(false);
					}
			},
			};
		}).then((result: boolean) => resolve(result));
	});
}

/** 为所选角色分配专属武功 */
export function assignCharacterSkills(state: PetState, characterId: string): string[] {
	if (state.martialSkills.length > 0) return [];
	const char = _chars.getCharacter(characterId);
	if (!char || !char.exclusiveSkills || char.exclusiveSkills.length === 0) {
		// 回退：随机分配一个武功
		const skill = _wuxue.getRandomSkill();
		state.martialSkills.push({ id: skill.id, level: 1, xp: 0 });
		return [skill.name];
	}
	const names: string[] = [];
	for (const sid of char.exclusiveSkills) {
		if (_wuxue.getSkill(sid)) {
			state.martialSkills.push({ id: sid, level: 1, xp: 0 });
			names.push(_wuxue.getSkill(sid).name);
		}
	}
	return names;
}

export function assignInitialSkill(state: PetState) {
	if (state.martialSkills.length > 0) return null;
	const skill = _wuxue.getRandomSkill();
	state.martialSkills.push({ id: skill.id, level: 1, xp: 0 });
	return skill.name;
}

export function getBestSkill(skills: any[]) {
	if (skills.length === 0) return null;
	return skills.reduce((best: any, s: any) => s.level > best.level ? s : best, skills[0]);
}

export function addSkillXpToAll(skills: any[], totalXp: number): string[] {
	if (skills.length === 0) return [];
	const perSkill = Math.floor(totalXp / skills.length);
	const leveledUp: string[] = [];
	for (const sk of skills) {
		const def = _wuxue.getSkill(sk.id);
		const result = _wuxue.addSkillXp(sk.level, sk.xp, perSkill);
		sk.level = result.level;
		sk.xp = result.xp;
		if (result.leveledUp && def) leveledUp.push(`${def.name} Lv.${sk.level}`);
	}
	return leveledUp;
}

// ═══════════════════════════════════════════════════════════════════════════
// 掉落处理
// ═══════════════════════════════════════════════════════════════════════════
function getEquippedWeaponAtk() {
	if (!petState.weapon) return 0;
	const w = _wuxue.WEAPON_DEFS.find((d: any) => d.id === petState.weapon);
	return w ? w.attack : 0;
}

export async function handleDrop(ctx: any) {
	// 优先使用服务端遭遇（隐藏掉率参数），失败回退本地
	let drop: any = null;
	try {
		const { serverEncounter } = await import(bust("./telemetry.js"));
		const userId = _state.getStateHash ? _state.getStateHash(petState) : "local";
		const serverResult = await serverEncounter(userId, petState.wuxue.level, getEquippedWeaponAtk(), petState.wuxue.hp, petState.wuxue.maxHp);
		if (serverResult) {
			drop = serverResult;
		}
	} catch { /* fallback to local */ }
	if (!drop) {
		drop = _wuxue.generateEncounter(petState.wuxue.level, getEquippedWeaponAtk(), petState.wuxue.hp, petState.wuxue.maxHp);
	}
	if (drop.type === "none") return;
	const MAX = _wuxue.MAX_SKILLS;
	const gold = drop.goldAmount || 0;
	if (gold !== 0) petState.wuxue.gold += gold;
	const xp = drop.xpAmount || 0;
	if (xp > 0) {
		const { leveledUp } = _wuxue.addXp(petState.wuxue, xp);
		if (leveledUp) { ctx.ui.notify(`🎉 升级！Lv.${petState.wuxue.level}！+1天赋点`, "info"); grantTalentPointOnLevelUp(); }
	}
	if (drop.hpChange && drop.hpChange !== 0) {
		petState.wuxue.hp = Math.max(1, petState.wuxue.hp + drop.hpChange);
	}
	// 门派贡献
	if (gold > 0 && petState.factionId) {
		const { addContribution } = await import(bust("./wuxue-faction.js"));
		addContribution(petState, Math.ceil(gold / 10));
	}
	const goldText = gold > 0 ? ` +${gold}金` : gold < 0 ? ` ${gold}金` : "";
	const xpText = xp > 0 ? ` +${xp}经验` : "";
	const hpText = drop.hpChange && drop.hpChange < 0 ? ` ❤${drop.hpChange}` : "";
	if (drop.type === "encounter") {
		ctx.ui.notify(`${drop.name} — ${drop.description}${goldText}${xpText}`, "info");
	} else if (drop.type === "battle") {
		const result = drop.battleResult === "win" ? "胜利" : "战败";
		ctx.ui.notify(`${drop.name}【${result}】 — ${drop.description}${goldText}${xpText}${hpText}`, "info");
	} else if (drop.type === "event") {
		ctx.ui.notify(`${drop.name} — ${drop.description}${goldText}${xpText}`, "info");
	} else if (drop.type === "skill_scroll" && drop.skillScrollId) {
		if (petState.martialSkills.length >= MAX) {
			const xpAmount = 30;
			const leveledUp = addSkillXpToAll(petState.martialSkills, xpAmount);
			ctx.ui.notify(`📜 ${drop.name} — 武功已满，转化经验 +${xpAmount}`, "info");
			if (leveledUp.length > 0) ctx.ui.notify(`🔥 武功突破！${leveledUp.join("、")}！`, "info");
		} else if (petState.martialSkills.some((s: any) => s.id === drop.skillScrollId)) {
			const existing = petState.martialSkills.find((s: any) => s.id === drop.skillScrollId);
			const def = _wuxue.getSkill(existing.id);
			const xpAmount = 40;
			const r = _wuxue.addSkillXp(existing.level, existing.xp, xpAmount);
			existing.level = r.level; existing.xp = r.xp;
			ctx.ui.notify(`📜 ${drop.name} — 已习得，转化经验 +${xpAmount}`, "info");
			if (r.leveledUp && def) ctx.ui.notify(`🌟 ${def.name} Lv.${r.level}！`, "info");
		} else {
			petState.martialSkills.push({ id: drop.skillScrollId, level: 1, xp: 0 });
			const def = _wuxue.getSkill(drop.skillScrollId);
			ctx.ui.notify(`📜 获得武功秘籍！习得「${def?.name ?? drop.skillScrollId}」！(${petState.martialSkills.length}/${MAX})`, "info");
		}
	} else if (drop.type === "weapon" && drop.weaponId && !petState.ownedWeapons.includes(drop.weaponId)) {
		petState.ownedWeapons.push(drop.weaponId);
		ctx.ui.notify(`🎁 获得武器！${drop.name} — ${drop.description}`, "info");
	} else if (drop.type === "item" && drop.itemId) {
		petState.wuxue.items[drop.itemId] = (petState.wuxue.items[drop.itemId] || 0) + 1;
		ctx.ui.notify(`🎁 获得道具！${drop.name} — ${drop.description}`, "info");
	} else if (drop.type === "gold") {
		ctx.ui.notify(`💰 拾获 ${drop.goldAmount} 金币`, "info");
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Event handlers (called from xia.ts)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 首次进入 /xia 时触发角色选择，返回 true 表示已就绪
 */
export async function ensureCharacter(ctx: any): Promise<boolean> {
	if (!petState.characterId) {
		const r = await selectCharacter(ctx);
		if (r) {
			const skillNames = assignCharacterSkills(petState, petState.characterId!);
			const char = _chars.getCharacter(petState.characterId!);
			const titleStr = char ? `「${char.title}」` : "";
			const skillStr = skillNames.length > 0 ? `，习得武功「${skillNames.join("、")}」` : "";
			ctx.ui.notify(`🎭 命运抉择！你化身为 ${r.charName}${titleStr}${skillStr}！`, "info");
		}
	}
	if (petState.martialSkills.length === 0) {
		// 玩家有角色但武功为空（旧数据迁移场景）
		if (petState.characterId) {
			const skillNames = assignCharacterSkills(petState, petState.characterId);
			if (skillNames.length > 0) ctx.ui.notify(`🔥 习得武功「${skillNames.join("、")}」！`, "info");
		} else {
			const skillName = assignInitialSkill(petState);
			if (skillName) ctx.ui.notify(`🔥 习得武功「${skillName}」！`, "info");
		}
	}
	scheduleSave();
	return !!petState.characterId;
}

export async function onSessionStart(_event: any, ctx: any, doBossFight: Function) {
	if (!ctx.hasUI) return;
	flushNotifications(ctx);
	try {
		// 注册头像就绪回调：R2 下载完成后刷新 Widget 以显示 PNG 头像
		onAvatarReady(() => updateWidget(ctx));
		// 角色选择延迟到首次 /xia 命令时触发，不再在 session_start 自动弹出
		if (petState.wuxue.hp <= 0) petState.wuxue.hp = petState.wuxue.maxHp;
		_wuxue.tick(petState.wuxue);
		updateWidget(ctx);
		updateTimer = setInterval(() => { _wuxue.tick(petState.wuxue); updateWidget(ctx); scheduleSave(); }, 60000);
	} catch (err: any) {
		if (!/stale/i.test(err?.message)) throw err;
	}
}


export async function onSessionShutdown() {
	if (updateTimer) clearInterval(updateTimer);
	if (saveTimer) clearTimeout(saveTimer);
	_state.saveState(petState);
}

export async function onMessageEnd(event: any, ctx: any) {
	flushNotifications(ctx);
	if (event.message.role !== "user") return;
	try {
		setMood("talking", ctx);
		await handleDrop(ctx);
		setTimeout(() => setMood("idle", ctx), 3000);
		updateWidget(ctx);
		scheduleSave();
	} catch (err: any) {
		if (!/stale/i.test(err?.message)) throw err;
		scheduleSave();
	}
}

export async function onTurnStart(_event: any, ctx: any) {
	flushNotifications(ctx);
	try { setMood("meditating", ctx); } catch {}
}

export async function onTurnEnd(_event: any, ctx: any, doBossFight: Function) {
	flushNotifications(ctx);
	try {
		if (currentMood === "meditating") setMood("idle", ctx);
		await handleDrop(ctx);
		updateWidget(ctx);
		scheduleSave();
	} catch (err: any) {
		if (!/stale/i.test(err?.message)) throw err;
		scheduleSave();
	}
}

export async function onToolExecutionStart(event: any, ctx: any) {
	flushNotifications(ctx);
	try {
		if (INTERACTIVE_TOOLS.has(event.toolName)) {
			widgetHidden = true;
			updateWidget(ctx);
		}
		setMood("training", ctx);
	} catch {}
}

export async function onToolExecutionEnd(event: any, ctx: any, doBossFight: Function) {
	flushNotifications(ctx);
	try {
		if (widgetHidden) {
			widgetHidden = false;
		}
		const result = _wuxue.recordEvent(petState.wuxue, "tool");
		if (result?.leveledUp && ctx.hasUI) {
			grantTalentPointOnLevelUp();
			const boss = _wuxue.getBossForLevel(petState.wuxue.level);
			await doBossFight(ctx, boss, `🎉 升级挑战！Lv.${petState.wuxue.level} — ${_wuxue.getLevelTitle(petState.wuxue.level)}，Boss 来袭！`, {
				_wuxue, _chars, petState, addSkillXpToAll, updateWidget, scheduleSave, getBestSkill, wrapSelect, _state,
			});
		}
		setMood("working", ctx);
		setTimeout(() => setMood("idle", ctx), 2000);
		updateWidget(ctx);
		scheduleSave();
	} catch (err: any) {
		if (!/stale/i.test(err?.message)) throw err;
		scheduleSave();
	}
}

export async function onToolResult(event: any, ctx: any, doBossFight: Function) {
	flushNotifications(ctx);
	try {
		if (widgetHidden) {
			widgetHidden = false;
		}
		if (["edit", "write", "create"].includes(event.toolName)) {
			const result = _wuxue.recordEvent(petState.wuxue, "edit");
			if (result?.leveledUp && ctx.hasUI) {
				grantTalentPointOnLevelUp();
				const boss = _wuxue.getBossForLevel(petState.wuxue.level);
				await doBossFight(ctx, boss, `🎉 升级挑战！Lv.${petState.wuxue.level} — ${_wuxue.getLevelTitle(petState.wuxue.level)}，Boss 来袭！`, {
					_wuxue, _chars, petState, addSkillXpToAll, updateWidget, scheduleSave, getBestSkill, wrapSelect, _state,
				});
			}
		}
		if (event.isError) {
			_wuxue.recordEvent(petState.wuxue, "error");
			setMood("hurt", ctx);
			setTimeout(() => setMood("idle", ctx), 3000);
		}
		updateWidget(ctx);
		scheduleSave();
	} catch (err: any) {
		if (!/stale/i.test(err?.message)) throw err;
		scheduleSave();
	}
}
