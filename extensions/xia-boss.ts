// @ts-nocheck
/**
 * xia-boss.ts — Boss 战斗逻辑（从 xia.ts 拆出）
 */

import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { SelectList, renderImage, allocateImageId, getCapabilities, visibleWidth, truncateToWidth } from "@earendil-works/pi-tui";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bust = (rel: string) => pathToFileURL(resolve(__dirname, rel)).href + `?_t=${Date.now()}`;

// ─── Boss 头像映射 ──────────────────────────────────────────────
const BOSS_AVATAR_FILES: Record<string, string> = {
	"欧阳克": "欧阳克.png", "左冷禅": "左冷禅.png", "裘千仞": "裘千仞.png",
	"成昆": "成昆.png", "公孙止": "公孙止.png", "范遥": "范遥.png",
	"岳不群": "岳不群.png", "韦一笑": "韦一笑.png", "殷天正": "殷天正.png",
	"谢逊": "谢逊.png", "杨逍": "杨逍.png", "东方不败": "东方不败.png",
	"张三丰": "张三丰.png", "金轮法王": "金轮法王.png",
};

// 通用头像缓存（avatarFile → base64）
const _avatarCache = new Map<string, { base64: string; widthPx: number; heightPx: number } | null>();

async function fetchBossAvatar(bossName: string): Promise<{ base64: string; widthPx: number; heightPx: number } | null> {
	const avatarFile = BOSS_AVATAR_FILES[bossName];
	if (!avatarFile) return null;
	const cached = _avatarCache.get(avatarFile);
	if (cached !== undefined) return cached;
	try {
		const url = `https://xia.openclawd.qzz.io/avatars/${encodeURIComponent(avatarFile)}`;
		const r = await fetch(url);
		if (!r.ok) { _avatarCache.set(avatarFile, null); return null; }
		const ab = await r.arrayBuffer();
		const buf = Buffer.from(ab);
		const w = buf.readUInt32BE(16);
		const h = buf.readUInt32BE(20);
		const data = { base64: buf.toString("base64"), widthPx: w, heightPx: h };
		_avatarCache.set(avatarFile, data);
		return data;
	} catch {
		_avatarCache.set(avatarFile, null);
		return null;
	}
}

function renderBattleBar(current: number, max: number, width: number): string {
	const pct = Math.max(0, Math.min(1, current / max));
	return "█".repeat(Math.round(pct * width)) + "░".repeat(width - Math.round(pct * width));
}

export async function doBossFight(
	ctx: any, boss: any, header: string | undefined,
	deps: { _wuxue: any; _chars: any; petState: any; addSkillXpToAll: Function; updateWidget: Function; scheduleSave: Function; getBestSkill: Function; wrapSelect: Function; _state: any },
) {
	const { _wuxue: wx, petState, addSkillXpToAll, updateWidget, scheduleSave, getBestSkill, wrapSelect, _state } = deps;
	const w = petState.wuxue;
	const weaponDef = petState.weapon ? wx.getWeaponDef(petState.weapon) : null;
	const weaponAttack = weaponDef ? weaponDef.attack : 0;
	const weaponElement = weaponDef ? weaponDef.element : "土";
	const bestSk = getBestSkill(petState.martialSkills);
	const ES = wx.ELEMENT_SYMBOL;
	const theme = ctx.ui.theme;
	const hpBeforeBattle = Math.round(w.hp);

	// 尝试加载 Boss 头像
	const bossAvatar = await fetchBossAvatar(boss.name);

	const bossTitle = `⚔️ 遭遇 ${boss.name}（${boss.title}）${ES[boss.element]}${boss.element}`;

	// 如果有头像且终端支持，显示带头像的遭遇界面
	let mode: string | undefined;
	const caps = getCapabilities();
	if (bossAvatar && caps?.images) {
		mode = await wrapSelectWithAvatar(ctx, bossTitle, ["⚔️ 自动战斗", "🎮 手动战斗", "❌ 逃跑"], bossAvatar);
	} else {
		mode = await wrapSelect(ctx, bossTitle, ["⚔️ 自动战斗", "🎮 手动战斗", "❌ 逃跑"]);
	}
	if (!mode || mode === "❌ 逃跑") { ctx.ui.notify(theme.fg("dim", `🏃 你选择了回避 ${boss.name}。`), "info"); return; }

	let result: any;
	if (mode === "⚔️ 自动战斗") {
		// 优先使用服务端 Boss 战斗（隐藏 Boss 属性），失败回退本地
		let serverResult: any = null;
		try {
			const { serverBossFight } = await import(bust("./telemetry.js"));
			const userId = _state.getStateHash ? _state.getStateHash(petState) : "local";
			serverResult = await serverBossFight(
				userId, w.level, weaponAttack, weaponElement,
				bestSk?.level ?? 1, bestSk ? wx.getSkill(bestSk.id)?.element : undefined,
				boss.id,
			);
		} catch { /* fallback */ }
		if (serverResult) {
			// 服务端结果转成客户端兼容格式
			result = {
				won: serverResult.won,
				bossName: serverResult.bossName,
				bossElement: serverResult.bossElement || boss.element,
				goldReward: serverResult.goldReward,
				xpReward: serverResult.xpReward,
				skillXpReward: serverResult.skillXpReward || Math.floor(serverResult.xpReward * 0.3),
				hpChange: serverResult.hpChange,
				logs: (serverResult.logs || []).map((l: any) =>
					typeof l === "string" ? { turn: 0, attacker: "", damage: 0, log: l } : l
				),
			};
			w.hp = Math.max(1, w.hp + (serverResult.hpChange || 0));
			if (result.won) wx.addXp(w, result.xpReward);
		} else {
			result = wx.fightBoss(w, weaponAttack, weaponElement, boss, bestSk?.level ?? 1, bestSk ? wx.getSkill(bestSk.id)?.element : undefined);
			if (result.won) wx.addXp(w, result.xpReward);
		}
	} else {
		// ── 手动战斗 ──
		const bs = wx.initBattleState(w, weaponAttack, weaponElement, boss, bestSk?.level ?? 1, bestSk ? wx.getSkill(bestSk.id)?.element : undefined);
		// 收集所有武功
		const allSkills = (petState.martialSkills || [])
			.filter((sk: any) => !!wx.getSkill(sk.id))
			.map((sk: any) => { const d = wx.getSkill(sk.id); return { name: d.name, level: sk.level, element: d.element, dmgBase: sk.level * 10 }; });
		let over = false, won = false, fled = false;
		while (!over) {
			const playerBar = renderBattleBar(bs.playerHp, bs.playerMaxHp, 16);
			const bossBar = renderBattleBar(Math.max(0, bs.bossHp), bs.bossMaxHp, 16);
			const hpColor = bs.playerHp / bs.playerMaxHp > 0.5 ? "success" : bs.playerHp / bs.playerMaxHp > 0.2 ? "warning" : "error";
			const status = [theme.bold(`  ⚔️ 第${bs.turn + 1}回合`), theme.fg(hpColor, `  👤 ${playerBar} ${Math.max(0, Math.round(bs.playerHp))}/${bs.playerMaxHp}`), theme.fg("accent", `  👹 ${bossBar} ${Math.max(0, Math.round(bs.bossHp))}/${bs.bossMaxHp}`)].join("\n");

			// 主菜单
			const mainOpts = ["⚔️ 普通攻击"];
			if (allSkills.length > 0) mainOpts.push("🗡️ 使用武功");
			mainOpts.push("🛡️ 防御");
			if (Object.values(w.items).some((v: any) => v > 0)) mainOpts.push("💊 使用道具");
			mainOpts.push("🏃 逃跑");

			const action = await wrapSelect(ctx, status, mainOpts);
			if (!action || action === "🏃 逃跑") { fled = true; over = true; break; }

			let turnAction: any = "attack";
			let chosenSkill: any = null;

			if (action.includes("武功") || action.includes("🗡️")) {
				// 武功子列表
				const skOpts = allSkills.map((sk: any) => {
					const cost = Math.max(1, Math.floor(sk.dmgBase * 0.15));
					const pm = wx.getElementMultiplier(sk.element, boss.element);
					const elLabel = wx.getElementBonusLabel(sk.element, boss.element);
					const elTag = elLabel === "克制" ? " ✓克制" : elLabel === "被克" ? " ✗被克" : "";
					return `  ${ES[sk.element]}${sk.name} Lv.${sk.level}${elTag}（耗${cost}血）`;
				});
				skOpts.push("↩️ 返回");
				const skChoice = await wrapSelect(ctx, "🗡️ 选择武功", skOpts);
				if (!skChoice || skChoice === "↩️ 返回") continue;
				chosenSkill = allSkills.find((sk: any) => skChoice.includes(sk.name));
				if (!chosenSkill) continue;
				bs.skillElement = chosenSkill.element; bs.skillLevel = chosenSkill.level; bs.skillDmgBase = chosenSkill.dmgBase;
				turnAction = "skill";
			} else if (action.includes("防御") || action.includes("🛡️")) {
				turnAction = "defend";
			} else if (action.includes("道具") || action.includes("💊")) {
				turnAction = "item";
			}

			const skName = chosenSkill ? chosenSkill.name : (bestSk ? wx.getSkill(bestSk.id)?.name : "");
			const tr = wx.executeBattleTurn(bs, turnAction, wx.getElementMultiplier);
			if (tr.fled) { fled = true; over = true; break; }

			const lines: string[] = [];
			if (tr.dice && tr.dice.event !== "普通") {
				const e = { "暴击": "🔥", "闪避": "💨", "元素共鸣": "⚡", "破防": "💥", "回春": "💚", "虚弱": "😵" }[tr.dice.event] || "🎲";
				lines.push(theme.fg("accent", `  ${e} ${tr.dice.desc}`));
			}
			for (const log of tr.logs) {
				const b = log.elementBonus ? (log.elementBonus === "克制" ? theme.fg("accent", "[克制]") : log.elementBonus === "被克" ? theme.fg("error", "[被克]") : "") : "";
				if (log.attacker === "player") {
					if (log.selfDamage && log.selfDamage < 0) { lines.push(theme.fg("success", `  💊 回复 ${-log.selfDamage} 血量`)); }
					else { const c = log.selfDamage ? theme.fg("warning", `耗${log.selfDamage}血 `) : ""; const p = log.isSkillHit ? theme.fg("accent", `  ${skName}`) : theme.fg("dim", `  R${log.turn}: `); lines.push(p + theme.fg("success", ` ${log.damage}伤 `) + c + b); }
				} else { lines.push(theme.fg("dim", `  R${log.turn}: `) + theme.fg("error", `${log.attacker} ${log.damage}伤 `) + b); }
			}
			if (lines.length > 0) ctx.ui.notify(lines.join("\n"), "info");
			if (tr.over) { over = true; won = !!tr.won; }
		}
		result = wx.finalizeBattle(w, bs, boss, won, fled);
		if (fled) { ctx.ui.notify(theme.fg("dim", `🏃 你逃离了 ${boss.name} 的战斗。`), "info"); updateWidget(ctx); scheduleSave(); return; }
		if (result.won) wx.addXp(w, result.xpReward);
	}

	// ── 结果展示 ──
	const fl: string[] = [];
	if (header) fl.push(header);
	if (result.won) fl.push(theme.fg("success", `  ⚔️ 胜利！击败 ${result.bossName}！ +${result.goldReward}金 +${result.xpReward}经验`));
	else fl.push(theme.fg("error", `  💀 战败... ${result.bossName}更胜一筹 +${result.xpReward}经验`));
	fl.push(theme.fg("dim", `  ❤️${hpBeforeBattle}→${Math.round(w.hp)}`));
	if (mode === "⚔️ 自动战斗") {
		const sn = bestSk ? wx.getSkill(bestSk.id)?.name : "";
		for (const log of result.logs) {
			const b = log.elementBonus ? (log.elementBonus === "克制" ? theme.fg("accent", "[克制]") : log.elementBonus === "被克" ? theme.fg("error", "[被克]") : "") : "";
			if (log.attacker === "player") { const c = log.selfDamage ? theme.fg("warning", `耗${log.selfDamage}血 `) : ""; const p = log.isSkillHit ? theme.fg("accent", `  ${sn || "武功"}`) : theme.fg("dim", `  R${log.turn}: `); fl.push(p + theme.fg("success", ` ${log.damage}伤 `) + c + b); }
			else { fl.push(theme.fg("dim", `  R${log.turn}: `) + theme.fg("error", `${log.attacker} ${log.damage}伤 `) + b); }
		}
	}
	if (petState.martialSkills.length > 0) { for (const m of addSkillXpToAll(petState.martialSkills, result.skillXpReward)) ctx.ui.notify(`🔥 武功突破！${m}！`, "info"); }
	if (fl.length > 0) ctx.ui.notify(fl.join("\n"), "info");
	wx.checkAchievements(w); updateWidget(ctx); scheduleSave();
}

// ─── 带头像的选择器 ──────────────────────────────────────────────

/** 带头像的选择器：头像在左，选择列表在右 */
async function wrapSelectWithAvatar(
	ctx: any, title: string, options: string[],
	avatarData: { base64: string; widthPx: number; heightPx: number },
): Promise<string | undefined> {
	if (options.length === 0) return undefined;
	return new Promise((resolve) => {
		ctx.ui.custom((tui: any, theme: any, _kb: any, done: (v: string | undefined) => void) => {
			let disposed = false;
			const selectItems = options.map((label, i) => ({ value: String(i), label }));
			let selectList: any;

			// 预渲染图片序列
			const imgCellW = 10;
			const imgMaxRows = 8;
			const caps = getCapabilities();
			const imageId = caps?.images === "kitty" ? allocateImageId() : undefined;
			const imgResult = renderImage(avatarData.base64, avatarData, {
				maxWidthCells: imgCellW, maxHeightCells: imgMaxRows, imageId, moveCursor: false,
			});
			const hasImage = !!imgResult;
			const seq = imgResult?.sequence ?? "";
			const imgRows = imgResult?.rows ?? 0;
			const isKitty = caps?.images === "kitty";
			const movePast = hasImage ? `\x1b[${imgCellW + 2}C` : "";
			const leftPad = hasImage ? " ".repeat(imgCellW + 2) : "";

			// 构建选择列表组件（无容器，手动渲染）
			selectList = new SelectList(selectItems, Math.min(options.length, 14), {
				selectedPrefix: (t: string) => theme.fg("accent", t),
				selectedText: (t: string) => theme.fg("accent", t),
				description: (t: string) => theme.fg("muted", t),
				scrollInfo: (t: string) => theme.fg("dim", t),
				noMatch: (t: string) => theme.fg("warning", t),
			});
			selectList.onSelect = (item: { value: string }) => {
				if (disposed) return;
				disposed = true;
				done(options[parseInt(item.value, 10)]);
			};
			selectList.onCancel = () => {
				if (disposed) return;
				disposed = true;
				done(undefined);
			};

			return {
				render(width: number) {
					const gap = 2;
					const textW = hasImage ? Math.max(10, width - imgCellW - gap) : width;
					// 渲染标题和列表
					const headerLines = [
						theme.fg("accent", theme.bold(`  ${title}`)),
						theme.fg("dim", `  ↑↓ 选择 • enter 确认 • esc 取消`),
					];
					const listLines = selectList.render(textW);
					const allText = [...headerLines, ...listLines];

					if (!hasImage) return allText;

					const maxRows = Math.max(imgRows, allText.length);
					const lines: string[] = [];
					for (let i = 0; i < maxRows; i++) {
						const text = allText[i] || "";
						const textCut = truncateToWidth(text, textW);
						const padW = Math.max(0, textW - visibleWidth(textCut));
						if (isKitty) {
							if (i === 0) lines.push(seq + movePast + textCut + " ".repeat(padW));
							else if (i < imgRows) lines.push(leftPad + textCut + " ".repeat(padW));
							else lines.push(textCut);
						} else {
							if (i < imgRows - 1) lines.push(leftPad + textCut + " ".repeat(padW));
							else if (i === imgRows - 1) lines.push(seq + movePast + textCut + " ".repeat(padW));
							else lines.push(textCut);
						}
					}
					return lines;
				},
				invalidate() { selectList.invalidate(); },
				handleInput(data: Buffer) {
					if (selectList) { selectList.handleInput(data); tui.requestRender(); }
				},
			};
		}).then((result: string | undefined) => resolve(result));
	});
}
