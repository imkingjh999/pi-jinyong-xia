// @ts-nocheck
/**
 * xia-commands.ts — /xia 子命令处理（入口分发）
 */

import { renderSkillSummary } from "./xia-render.js";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
const __cmdDir = dirname(fileURLToPath(import.meta.url));

// 动态加载子命令模块（避免 ESM 缓存问题）
let _stats: any = null;
let _missionsCmd: any = null;
let _shopRank: any = null;
let _factionCmd: any = null;
function bust(rel: string) {
	return pathToFileURL(resolve(__cmdDir, rel)).href + `?_t=${Date.now()}`;
}
async function ensureCmdModules() {
	_stats = await import(bust("./xia-cmd-stats.js"));
	_missionsCmd = await import(bust("./xia-cmd-missions.js"));
	_shopRank = await import(bust("./xia-cmd-shop-rank.js"));
	_factionCmd = await import(bust("./xia-cmd-faction.js"));
}

// 动态加载 missions 模块（避免 ESM 缓存问题）
let _missions: any = null;
async function loadMissions(dirname: string) {
	if (_missions) return;
	const { pathToFileURL } = await import("node:url");
	const { resolve } = await import("node:path");
	const url = pathToFileURL(resolve(dirname, "missions.js")).href + `?_t=${Date.now()}`;
	_missions = await import(url);
}
function mis() { return _missions; }

/**
 * /xia 子命令分发。
 * deps 对象传入运行时依赖，避免循环引用。
 */
export async function runSubCommand(
	ctx: any, sub: string, w: any, MAX: number, ES: Record<string, string>, theme: any,
	deps: { _chars: any; _wuxue: any; petState: any; addSkillXpToAll: Function; updateWidget: Function; scheduleSave: Function; getBestSkill: Function; showLines: Function; wrapSelect: Function; __dirname: string },
) {
	const { _chars, _wuxue, petState, showLines, __dirname } = deps;
	await loadMissions(__dirname);
	await ensureCmdModules();
	const fullDeps = { ...deps, mis };

	switch (sub) {
		case "stats":
		case "skills":
		case "heroes":
		case "weapons":
		case "items":
			return _stats.handleStatsCmd(ctx, sub, w, MAX, ES, theme, fullDeps);
		case "missions":
		case "mission":
		case "quest":
		case "profile":
			return _missionsCmd.handleMissionsCmd(ctx, sub, w, MAX, ES, theme, fullDeps);
		case "config":
		case "settings":
		case "设置":
			return handleConfigCmd(ctx, w, theme, fullDeps);
		case "shop":
		case "rank":
		case "leaderboard":
		case "bosses":
			return _shopRank.handleShopRankCmd(ctx, sub, w, MAX, ES, theme, fullDeps);
		case "faction":
		case "clan":
		case "guild":
		case "门派":
		case "帮派":
		case "profession":
		case "class":
		case "职业":
		case "talent":
		case "talents":
		case "天赋":
		case "achievements":
		case "achievement":
		case "成就":
			return _factionCmd.handleFactionCmd(ctx, sub, w, petState, theme, fullDeps);
		default: {
			const char = petState.characterId ? _chars.getCharacter(petState.characterId) : null;
			const weaponDef = petState.weapon ? _wuxue.getWeaponDef(petState.weapon) : null;
			const skillSummary = renderSkillSummary(petState.martialSkills);
			const dLines = [
				``, `${char ? `${char.name} · ${char.title} · ${char.novel}` : "江湖路人"}`,
				`Lv.${w.level} ${_wuxue.getLevelTitle(w.level)}   ⚔️攻${w.attack}  🛡️防${w.defense}  💪武力${_wuxue.getWuli(w, weaponDef ? weaponDef.attack : 0)}`,
				`血量 ${Math.round(w.hp)}/${w.maxHp}   💰 ${w.gold}金   武器: ${weaponDef ? `${weaponDef.name}(攻+${weaponDef.attack})` : "无"}`,
				skillSummary ? `${skillSummary}（${petState.martialSkills.length}/${MAX}）` : "武功: 未习得",
				`成就:${w.achievements.length}/${_wuxue.getAchievementDefs().length}`, ``,
			];
			showLines(ctx, dLines);
			return "ok";
		}
	}
}

async function handleConfigCmd(ctx: any, w: any, theme: any, deps: any): Promise<string> {
	const { petState, scheduleSave, wrapSelect } = deps;

	const options: string[] = [];
	options.push(petState.telemetryEnabled ? "📧 江湖通缉令: 已开启" : "📧 江湖通缉令: 未开启");
	options.push(petState.nickname ? `✏️ 昵称: ${petState.nickname}` : "✏️ 设置昵称");
	options.push("❌ 关闭");

	const choice = await wrapSelect(ctx, "⚙️ 江湖设置", options);
	if (!choice || choice.includes("关闭")) return "ok";

	if (choice.includes("江湖通缉令")) {
		if (petState.telemetryEnabled) {
			// 关闭遥测
			const confirm = await wrapSelect(ctx, "📧 关闭江湖通缉令？", ["确认关闭", "取消"]);
			if (confirm === "确认关闭") {
				petState.telemetryEnabled = false;
				ctx.ui.notify("📧 江湖通缉令已关闭", "info");
				scheduleSave();
			}
		} else {
			// 开启遥测
			const email = await ctx.ui.input("📧 请输入你的邮箱（用于身份验证，开启排行榜上传）:");
			if (!email || !email.includes("@")) { ctx.ui.notify("❌ 邮箱格式无效", "info"); return "ok"; }
			petState.email = email.trim();
			petState.telemetryEnabled = true;
			ctx.ui.notify(`✅ 江湖通缉令已开启！邮箱: ${email}`, "info");
			scheduleSave();
		}
	} else if (choice.includes("昵称")) {
		const name = await ctx.ui.input("请输入新昵称（当前: " + (petState.nickname || "未设置") + "）:");
		if (name && name.trim()) {
			petState.nickname = name.trim().slice(0, 12);
			ctx.ui.notify("昵称已改为 " + petState.nickname, "info");
			scheduleSave();
		}
	}

	return "ok";
}
