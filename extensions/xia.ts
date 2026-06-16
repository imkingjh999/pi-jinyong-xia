// @ts-nocheck
/**
 * 金庸江湖 - Pi Extension (entry point)
 *
 * Commands:
 *   /xia              查看状态
 *   /xia stats        详细数据面板
 *   /xia skills       武功
 *   /xia weapons      选择武器装备
 *   /xia items        选择道具使用
 *   /xia shop         商店购买
 *   /xia bosses       选择Boss挑战
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Dynamic import with cache-bust for hot-reload */
function bust(rel: string) {
	return pathToFileURL(resolve(__dirname, rel)).href + `?_t=${Date.now()}`;
}

// 所有子模块用动态 import + cache-bust，避免 ESM 缓存问题
let _bossMod: any = null;
let _eventsMod: any = null;

async function loadModules() {
	try {
		_bossMod = await import(bust("./xia-boss.js"));
		_eventsMod = await import(bust("./xia-events.js"));
	} catch (e) {
		console.error("[xia] loadModules failed:", e);
		throw e;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION ACTIVATE
// ═══════════════════════════════════════════════════════════════════════════
export default async function (pi: ExtensionAPI) {
	await loadModules();

	// 热重载安全：递增全局 generation，旧实例的 handler 会检测到过期并退出。
	// （pi.on 返回 void、无 pi.off、ExtensionFactory 不支持返回 disposer，
	//  /reload 会在同一个 pi 上叠加注册 handler；用 generation guard 使旧 handler 失活。）
	const g = globalThis as any;
	g.__xia_gen__ = (g.__xia_gen__ ?? 0) + 1;
	const myGen = g.__xia_gen__;
	const alive = () => (globalThis as any).__xia_gen__ === myGen;

	const { loadDeps, loadSubModules, setPetState, setRenderDeps, setSelectDeps,
		pagedSelect, wrapSelect, runSubCommand,
		showLines, scheduleSave, updateWidget,
		onSessionStart, onSessionShutdown, onMessageEnd,
		onTurnStart, onTurnEnd, onToolExecutionStart, onToolExecutionEnd, onToolResult,
		getBestSkill, addSkillXpToAll, getState, onAvatarReady,
		ensureCharacter,
	} = _eventsMod;
	const { doBossFight } = _bossMod;
	await loadDeps();
	await loadSubModules();

	// Load initial state via the events module's _state reference
	const stateMod = await import("./state.js");
	setPetState(stateMod.loadState());

	const { _chars, _wuxue, petState } = getState();
	stateMod.ensureSigningKeys(petState);
	setRenderDeps(_chars, _wuxue);
	setSelectDeps(_wuxue, petState);

	pi.on("session_start", async (event: any, ctx: any) => {
		if (!alive()) return;
		onSessionStart(event, ctx, doBossFight);
	});

	pi.on("session_shutdown", async () => {
		if (!alive()) return;
		onSessionShutdown();
	});

	pi.on("message_end", async (event: any, ctx: any) => {
		if (!alive()) return;
		onMessageEnd(event, ctx);
	});

	pi.on("turn_start", async (event: any, ctx: any) => {
		if (!alive()) return;
		onTurnStart(event, ctx);
	});

	pi.on("turn_end", async (event: any, ctx: any) => {
		if (!alive()) return;
		onTurnEnd(event, ctx, doBossFight);
	});

	pi.on("tool_execution_start", async (event: any, ctx: any) => {
		if (!alive()) return;
		onToolExecutionStart(event, ctx);
	});

	pi.on("tool_execution_end", async (event: any, ctx: any) => {
		if (!alive()) return;
		onToolExecutionEnd(event, ctx, doBossFight);
	});

	pi.on("tool_result", async (event: any, ctx: any) => {
		if (!alive()) return;
		onToolResult(event, ctx, doBossFight);
	});

	pi.registerCommand("xia", {
		description: "金庸武侠。/xia [status|stats|skills|heroes|weapons|items|shop|bosses|rank|missions|faction|profession|talent|achievements|profile|config]",
		getArgumentCompletions(prefix: string) {
			return [
				{ value: "stats", label: "stats - 详细数据" },
				{ value: "skills", label: "skills - 武功" },
				{ value: "heroes", label: "heroes - 群侠录" },
				{ value: "weapons", label: "weapons - 选择武器装备" },
				{ value: "items", label: "items - 选择道具使用" },
				{ value: "shop", label: "shop - 商店购买" },
				{ value: "bosses", label: "bosses - 选择Boss挑战" },
				{ value: "rank", label: "rank - 江湖排行榜" },
				{ value: "missions", label: "missions - 江湖任务" },
				{ value: "faction", label: "faction - 门派系统" },
				{ value: "profession", label: "profession - 江湖职业" },
				{ value: "talent", label: "talent - 成长天赋" },
				{ value: "achievements", label: "achievements - 江湖成就" },
				{ value: "profile", label: "profile - 性格分析" },
				{ value: "config", label: "config - 江湖设置" },
			].filter(c => c.value.startsWith(prefix));
		},
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			if (!ctx.hasUI) return;
			// 首次进入 /xia 时才触发角色选择
			await ensureCharacter(ctx);
			const { _chars, _wuxue, _state, petState } = getState();
			const sub = args.trim().split(/\s+/)[0] || "status";
			const w = petState.wuxue;
			const MAX = _wuxue.MAX_SKILLS;
			const ES = _wuxue.ELEMENT_SYMBOL;
			const theme = ctx.ui.theme;
		const cmdDeps = { _chars, _wuxue, _state, petState, addSkillXpToAll, updateWidget, scheduleSave, getBestSkill, showLines, wrapSelect, __dirname };
			if (sub === "status") {
				const menuOptions = [
					{ value: "stats", label: "📊 详细数据" },
					{ value: "skills", label: "📖 武功管理" },
					{ value: "heroes", label: "👥 金庸群侠录" },
					{ value: "weapons", label: "⚔️ 武器装备" },
					{ value: "items", label: "🎒 道具背包" },
					{ value: "shop", label: "🏪 江湖商铺" },
					{ value: "bosses", label: "👹 挑战Boss" },
					{ value: "rank", label: "🏆 江湖排行榜" },
					{ value: "missions", label: "🗡️ 江湖任务" },
					{ value: "faction", label: "🏛️ 门派系统" },
				{ value: "profession", label: "💼 江湖职业" },
				{ value: "talent", label: "🌟 成长天赋" },
				{ value: "achievements", label: "🏆 江湖成就" },
					{ value: "profile", label: "🧠 性格分析" },
					{ value: "config", label: "⚙️ 江湖设置" },
				];
				let menuIdx = await pagedSelect(ctx, "金庸江湖", menuOptions.map(o => o.label), false);
				while (menuIdx >= 0) {
					const chosen = menuOptions[menuIdx];
					if (!chosen) break;
					const result = await runSubCommand(ctx, chosen.value, w, MAX, ES, theme, cmdDeps);
					if (result === "back") menuIdx = await pagedSelect(ctx, "金庸江湖", menuOptions.map(o => o.label), false);
					else break;
				}
				updateWidget(ctx);
				scheduleSave();
				return;
			}
			await runSubCommand(ctx, sub, w, MAX, ES, theme, cmdDeps);
			updateWidget(ctx);
			scheduleSave();
		},
	});

	pi.on("agent_end", async () => {
		if (!alive()) return;
		const { _state, petState } = getState();
		_state.saveState(petState);
	});
}
