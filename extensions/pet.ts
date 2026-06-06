/**
 * 金庸江湖 - Pi Extension
 *
 * Commands:
 *   /xia              查看状态
 *   /xia stats        详细数据面板
 *   /xia skills       武功
 *   /xia weapons      选择武器装备
 *   /xia items        选择道具使用
 *   /xia shop         商店购买
 *   /xia bosses       选择Boss挑战
 *
 * 注意：子模块通过动态 import 加载，确保 /reload 时能完整刷新缓存。
 * 类型通过 import type 独立引入（编译时擦除，不影响运行时缓存）。
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { Mood } from "./characters.js";
import type { Element, SkillDef, BossDef, WuxueState } from "./wuxue.js";
import type { PetState, OwnedSkill } from "./state.js";

import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { setRenderDeps, renderBar, buildStatusLines, buildWidgetComponent, renderSkillSummary, renderAnsiWithStatus } from "./pet-render.js";
import { setSelectDeps, pagedSelect, doBossFight, PagedItem, PAGE_SIZE, RARITY_MULTIPLIER } from "./pet-select.js";
import { setCommandDeps, runSubCommand } from "./pet-commands.js";


// ═══════════════════════════════════════════════════════════════════════════
// 动态 import 子模块（cache-bust friendly）
// ═══════════════════════════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const bust = (rel: string) => pathToFileURL(resolve(__dirname, rel)).href + `?_t=${Date.now()}`;

// 延迟加载的模块引用（any 类型，因为动态 import）
let _chars: any = null;
let _wuxue: any = null;
let _state: any = null;

async function loadDeps() {
	if (_chars && _wuxue && _state) return;
	[_chars, _wuxue, _state] = await Promise.all([
		import(bust("./characters.js")),
		import(bust("./wuxue.js")),
		import(bust("./state.js")),
	]);
}

// ═══════════════════════════════════════════════════════════════════════════
// 多行输出辅助
// ═══════════════════════════════════════════════════════════════════════════

function showLines(ctx: ExtensionCommandContext, lines: string[]): void {
	ctx.ui.notify(lines.join("\n"), "info");
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

let currentMood: Mood = "idle";
let petState: PetState;
let updateTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => { _state.saveState(petState); saveTimer = null; }, 5000);
}

function updateWidget(ctx: any) {
	if (!ctx?.hasUI || !petState) return;
	const state = petState;
	const mood = currentMood;
	const theme = ctx.ui.theme;

	ctx.ui.setWidget("jinyong-xia", (_tui: any, tuiTheme: any) => {
		const t = tuiTheme || theme;
		return buildWidgetComponent(state, mood, t);
	}, { placement: "belowEditor" });
}

function buildWidgetComponent(state: PetState, mood: Mood, theme: any): any {
	if (state.hidden) return { render: () => [], invalidate: () => {} };

	const _can = canShowImages();
	const imgData = _can ? loadPortraitPng(state) : null;

	if (imgData) {
		return {
			_kittyImageId: undefined as number | undefined,
			render(width: number) {
				const statusLines = buildStatusLines(state, mood, width, theme);
				return renderImageWithStatus(imgData, statusLines, width);
			},
			invalidate() {},
		};
	}

	// Fallback: ANSI art side-by-side with status
	return {
		render: (width: number) => {
			const statusLines = buildStatusLines(state, mood, width, theme);
			return renderAnsiWithStatus(state, statusLines, width);
		},
		invalidate: () => {},
	};
}

function setMood(mood: Mood, ctx: any) {
	if (currentMood === mood) return;
	currentMood = mood;
	updateWidget(ctx);
}

function assignRandomCharacter(state: PetState) {
	if (state.characterId) return;
	const charList = _chars.CHARACTERS;
	const char = charList[Math.floor(Math.random() * charList.length)]!;
	state.characterId = char.id;
	return { charName: char.name };
}

/** 初始分配第一个武功 */
function assignInitialSkill(state: PetState): string | null {
	if (state.martialSkills.length > 0) return null;
	const skill = _wuxue.getRandomSkill() as SkillDef;
	state.martialSkills.push({ id: skill.id, level: 1, xp: 0 });
	return skill.name;
}

/** 获取最高等级武功（战斗用） */
function getBestSkill(skills: OwnedSkill[]): OwnedSkill | null {
	if (skills.length === 0) return null;
	return skills.reduce((best, s) => s.level > best.level ? s : best, skills[0]!);
}

/** 给所有武功加经验（平分） */
function addSkillXpToAll(skills: OwnedSkill[], totalXp: number): string[] {
	if (skills.length === 0) return [];
	const perSkill = Math.floor(totalXp / skills.length);
	const leveledUp: string[] = [];
	for (const sk of skills) {
		const def = _wuxue.getSkill(sk.id) as SkillDef | undefined;
		const result = _wuxue.addSkillXp(sk.level, sk.xp, perSkill);
		sk.level = result.level;
		sk.xp = result.xp;
		if (result.leveledUp && def) {
			leveledUp.push(`${def.name} Lv.${sk.level}`);
		}
	}
	return leveledUp;
}


function getEquippedWeaponAtk(): number {
	if (!petState.weapon) return 0;
	const w = _wuxue.WEAPON_DEFS.find((d: any) => d.id === petState.weapon);
	return w ? w.attack : 0;
}

function handleDrop(ctx: any) {
	const drop = _wuxue.generateEncounter(
		petState.wuxue.level,
		getEquippedWeaponAtk(),
		petState.wuxue.hp,
		petState.wuxue.maxHp,
	);
	if (drop.type === "none") return;
	const MAX = _wuxue.MAX_SKILLS as number;

	// 通用：加金币 + 加经验 + 扣血
	const gold = drop.goldAmount || 0;
	if (gold !== 0) petState.wuxue.gold += gold;
	const xp = drop.xpAmount || 0;
	if (xp > 0) {
		const { leveledUp } = _wuxue.addXp(petState.wuxue, xp);
		if (leveledUp) ctx.ui.notify(`🎉 升级！Lv.${petState.wuxue.level}！`, "info");
	}
	if (drop.hpChange && drop.hpChange !== 0) {
		petState.wuxue.hp = Math.max(1, petState.wuxue.hp + drop.hpChange);
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
		} else if (petState.martialSkills.some((s: OwnedSkill) => s.id === drop.skillScrollId)) {
			const existing = petState.martialSkills.find((s: OwnedSkill) => s.id === drop.skillScrollId)!;
			const def = _wuxue.getSkill(existing.id) as SkillDef | undefined;
			const xpAmount = 40;
			const r = _wuxue.addSkillXp(existing.level, existing.xp, xpAmount);
			existing.level = r.level;
			existing.xp = r.xp;
			ctx.ui.notify(`📜 ${drop.name} — 已习得，转化经验 +${xpAmount}`, "info");
			if (r.leveledUp && def) ctx.ui.notify(`🌟 ${def.name} Lv.${r.level}！`, "info");
		} else {
			petState.martialSkills.push({ id: drop.skillScrollId, level: 1, xp: 0 });
			const def = _wuxue.getSkill(drop.skillScrollId) as SkillDef | undefined;
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

export default async function (pi: ExtensionAPI) {
	// 加载子模块依赖
	await loadDeps();

	petState = _state.loadState() as PetState;
	setRenderDeps(_chars, _wuxue);
	setSelectDeps(_wuxue, petState);
	setCommandDeps(_chars, _wuxue, petState);

	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		if (!petState.characterId) {
			const r = assignRandomCharacter(petState);
			if (r) {
				const skillName = assignInitialSkill(petState);
				ctx.ui.notify(`🎭 命运抉择！你化身为 ${r.charName}${skillName ? `，习得武功「${skillName}」` : ""}！`, "info");
			}
		}
		if (petState.martialSkills.length === 0) {
			const skillName = assignInitialSkill(petState);
			if (skillName) ctx.ui.notify(`🔥 习得武功「${skillName}」！`, "info");
		}
		if (petState.wuxue.hp <= 0) { petState.wuxue.hp = petState.wuxue.maxHp; }  // 死亡自动复活
		_wuxue.tick(petState.wuxue);
		updateWidget(ctx);
		updateTimer = setInterval(() => { _wuxue.tick(petState.wuxue); updateWidget(ctx); scheduleSave(); }, 60000);
	});

	pi.on("session_shutdown", async () => {
		if (updateTimer) clearInterval(updateTimer);
		if (saveTimer) clearTimeout(saveTimer);
		_state.saveState(petState);
	});

	pi.on("message_end", async (event, ctx) => {
		if (event.message.role !== "user") return;
		setMood("talking", ctx);
		handleDrop(ctx);
		setTimeout(() => setMood("idle", ctx), 3000);
		updateWidget(ctx); scheduleSave();
	});

	pi.on("turn_start", async (_event, ctx) => { setMood("meditating", ctx); });

	pi.on("turn_end", async (_event, ctx) => {
		if (currentMood === "meditating") setMood("idle", ctx);
		handleDrop(ctx);
		updateWidget(ctx); scheduleSave();
	});

	pi.on("tool_execution_start", async (_event, ctx) => { setMood("training", ctx); });

	pi.on("tool_execution_end", async (_event, ctx) => {
		const result = _wuxue.recordEvent(petState.wuxue, "tool");
		if (result?.leveledUp && ctx.hasUI) {
			const boss = _wuxue.getBossForLevel(petState.wuxue.level) as BossDef;
			doBossFight(ctx, boss, `🎉 升级挑战！Lv.${petState.wuxue.level} — ${_wuxue.getLevelTitle(petState.wuxue.level)}，Boss 来袭！`);
		}
		setMood("working", ctx);
		setTimeout(() => setMood("idle", ctx), 2000);
		updateWidget(ctx); scheduleSave();
	});

	pi.on("tool_result", async (event, ctx) => {
		if (["edit", "write", "create"].includes(event.toolName)) {
			const result = _wuxue.recordEvent(petState.wuxue, "edit");
			if (result?.leveledUp && ctx.hasUI) {
				const boss = _wuxue.getBossForLevel(petState.wuxue.level) as BossDef;
				doBossFight(ctx, boss, `🎉 升级挑战！Lv.${petState.wuxue.level} — ${_wuxue.getLevelTitle(petState.wuxue.level)}，Boss 来袭！`);
			}
		}
		if (event.isError) {
			_wuxue.recordEvent(petState.wuxue, "error");
			setMood("hurt", ctx);
			setTimeout(() => setMood("idle", ctx), 3000);
		}
		updateWidget(ctx); scheduleSave();
	});

	// ════════════════════════════════════════════════════════════════
	// /xia 命令
	// ════════════════════════════════════════════════════════════════

	pi.registerCommand("xia", {
		description: "金庸武侠。/xia [status|stats|skills|heroes|weapons|items|shop|bosses]",

		getArgumentCompletions(prefix: string) {
			return [
				{ value: "stats", label: "stats - 详细数据" },
				{ value: "skills", label: "skills - 武功" },
				{ value: "heroes", label: "heroes - 群侠录" },
				{ value: "weapons", label: "weapons - 选择武器装备" },
				{ value: "items", label: "items - 选择道具使用" },
				{ value: "shop", label: "shop - 商店购买" },
				{ value: "bosses", label: "bosses - 选择Boss挑战" },
			].filter(c => c.value.startsWith(prefix));
		},

		handler: async (args, ctx) => {
			if (!ctx.hasUI) return;
			const sub = args.trim().split(/\s+/)[0] || "status";
			const w = petState.wuxue;
			const MAX = _wuxue.MAX_SKILLS as number;
			const ES = _wuxue.ELEMENT_SYMBOL as Record<string, string>;
			const theme = ctx.ui.theme;

			// /xia 不带参数时，进入交互菜单
			if (sub === "status") {
				const menuOptions = [
					{ value: "stats", label: "📊 详细数据" },
					{ value: "skills", label: "📖 武功管理" },
					{ value: "heroes", label: "👥 金庸群侠录" },
					{ value: "weapons", label: "⚔️ 武器装备" },
					{ value: "items", label: "🎒 道具背包" },
					{ value: "shop", label: "🏪 江湖商铺" },
					{ value: "bosses", label: "👹 挑战Boss" },
				];
				let menuIdx = await pagedSelect(ctx, "金庸江湖", menuOptions.map(o => o.label), false);
				while (menuIdx >= 0) {
					const chosen = menuOptions[menuIdx];
					if (!chosen) break;
					const result = await runSubCommand(ctx, chosen.value, w, MAX, ES, theme);
					if (result === "back") {
						menuIdx = await pagedSelect(ctx, "金庸江湖", menuOptions.map(o => o.label), false);
					} else {
						break;
					}
				}
				updateWidget(ctx); scheduleSave();
				return;
			}

			// /xia <子命令> 直接执行
			await runSubCommand(ctx, sub, w, MAX, ES, theme);
			updateWidget(ctx); scheduleSave();
		},
	});

		// (已在各 case 中处理)

	pi.on("agent_end", async () => { _state.saveState(petState); });
}

