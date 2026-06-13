// @ts-nocheck
/**
 * xia-select.ts — 分页选择 & Boss 战斗
 */

import { matchesKey, Key, parseKey, Container, Text, type SelectItem, SelectList } from "@earendil-works/pi-tui";

// ─── 注入的模块引用 ───────────────────────────────────────────────
let _wuxue: any = null;
let _petState: any = null;

export function setSelectDeps(wuxue: any, petState: any) {
	_wuxue = wuxue;
	_petState = petState;
}

// ─── 常量 ─────────────────────────────────────────────────────────
export const PAGE_SIZE = 15;
export const RARITY_MULTIPLIER: Record<string, number> = { "凡品": 1, "良品": 2, "精品": 5, "极品": 12, "神器": 30 };

export interface PagedItem {
	label: string;
	origIdx: number;
	sortKey?: number;
}

// ─── wrapSelect ──────────────────────────────────────────────────
/** 循环导航的简单选择器。返回选中的 label，取消返回 undefined。 */
export async function wrapSelect(ctx: any, title: string, options: string[]): Promise<string | undefined> {
	if (options.length === 0) return undefined;
	return new Promise((resolve) => {
		ctx.ui.custom((tui: any, theme: any, _kb: any, done: (v: string | undefined) => void) => {
			const container = new Container();
			let disposed = false;
			const selectItems = options.map((label, i) => ({ value: String(i), label }));
			let selectList: any;

			const render = () => {
				container.clear();
				container.addChild(new Text(theme.fg("accent", theme.bold(`  ${title}`))));
				container.addChild(new Text(theme.fg("dim", `  ↑↓ 选择 • enter 确认 • esc 取消`)));
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
				container.addChild(selectList);
			};
			render();

			return {
				render(width: number) { return container.render(width); },
				invalidate() { container.invalidate(); },
				handleInput(data: Buffer) {
					if (selectList) { selectList.handleInput(data); tui.requestRender(); }
				},
			};
		}).then((result: string | undefined) => resolve(result));
	});
}

// ─── pagedSelect ──────────────────────────────────────────────────
/** 返回值: >=0 选中索引, -1 取消, -2 按b返回上一级 */
export async function pagedSelect(ctx: any, title: string, rawItems: (string | PagedItem)[], sort = true): Promise<number> {
	const items: PagedItem[] = (typeof rawItems[0] === "string")
		? (rawItems as string[]).map((label, i) => ({ label, origIdx: i }))
		: (rawItems as PagedItem[]).map((it, i) => ({ ...it, origIdx: it.origIdx ?? i }));
	if (sort && items.some(it => it.sortKey !== undefined)) {
		items.sort((a, b) => (a.sortKey ?? 0) - (b.sortKey ?? 0));
	}
	const labels = items.map((it, i) => `${i + 1}. ${it.label}`);
	const totalPages = Math.max(1, Math.ceil(labels.length / PAGE_SIZE));
	let page = 0;
	let selectedIdx = 0;
	let jumpMode = false;
	let jumpBuf = "";
	let jumpError = "";
	return new Promise((resolve) => {
		ctx.ui.custom((tui: any, theme: any, _kb: any, done: (v: number) => void) => {
			const container = new Container();
			let disposed = false;
			const renderPage = () => {
				container.clear();
				const start = page * PAGE_SIZE;
				const end = Math.min(start + PAGE_SIZE, labels.length);
				const pageItems: { value: string; label: string }[] = [];
				for (let i = start; i < end; i++) {
					pageItems.push({ value: String(i), label: labels[i] });
				}
				container.addChild(new Text(theme.fg("accent", theme.bold(`  ${title}`))));
				container.addChild(new Text(theme.fg("dim", `  ← → 翻页 • ↑↓ 选择 • / 序号 • enter 确认 • b 返回 • esc 取消`)));
				container.addChild(new Text(theme.fg("muted", `  📄 第${page + 1}/${totalPages}页 (共${labels.length}项)`)));
				const selectList = new SelectList(pageItems, Math.min(pageItems.length, 15), {
					selectedPrefix: (t: string) => theme.fg("accent", t),
					selectedText: (t: string) => theme.fg("accent", t),
					description: (t: string) => theme.fg("muted", t),
					scrollInfo: (t: string) => theme.fg("dim", t),
					noMatch: (t: string) => theme.fg("warning", t),
				});
				selectList.setSelectedIndex(selectedIdx);
				selectList.onSelect = (item: { value: string }) => {
					if (disposed) return;
					disposed = true;
					done(items[parseInt(item.value, 10)].origIdx);
				};
				selectList.onCancel = () => {
					if (disposed) return;
					disposed = true;
					done(-1);
				};
				container.addChild(selectList);
				(container as any)._selectList = selectList;
				(container as any)._pageStart = start;
				(container as any)._pageEnd = end;
				if (jumpMode) {
					const errPart = jumpError ? theme.fg("warning", `  ${jumpError}`) : "";
					container.addChild(new Text(theme.fg("accent", `  🔢 序号(${start + 1}~${end}): ${jumpBuf}█`) + errPart));
				}
			};
			renderPage();
			return {
				render(width: number) { return container.render(width); },
				invalidate() { container.invalidate(); },
				handleInput(data: Buffer) {
					if (jumpMode) {
						if (matchesKey(data, Key.enter)) {
							const pStart = (container as any)._pageStart;
							const pEnd = (container as any)._pageEnd;
							const num = parseInt(jumpBuf, 10);
							if (num >= pStart + 1 && num <= pEnd) {
								if (disposed) return;
								disposed = true;
								done(items[num - 1].origIdx);
							} else {
								jumpError = `请输入 ${pStart + 1}~${pEnd}`;
								renderPage();
								tui.requestRender();
							}
						} else if (matchesKey(data, Key.escape)) {
							jumpMode = false; jumpBuf = ""; jumpError = "";
							renderPage(); tui.requestRender();
						} else if (matchesKey(data, Key.backspace)) {
							jumpBuf = jumpBuf.slice(0, -1); jumpError = "";
							renderPage(); tui.requestRender();
						} else {
							const ch = parseKey(data);
							if (ch && /^[0-9]$/.test(ch)) {
								jumpBuf += ch; jumpError = "";
								renderPage(); tui.requestRender();
							}
						}
						return;
					}
					if (matchesKey(data, Key.left)) {
						page = page > 0 ? page - 1 : totalPages - 1; selectedIdx = 0;
						renderPage(); tui.requestRender();
					} else if (matchesKey(data, Key.right)) {
						page = page < totalPages - 1 ? page + 1 : 0; selectedIdx = 0;
						renderPage(); tui.requestRender();
					} else if (matchesKey(data, Key.slash)) {
						jumpMode = true; jumpBuf = ""; jumpError = "";
						renderPage(); tui.requestRender();
					} else {
						const ch = parseKey(data);
						if (ch === "b" || ch === "B") {
							if (disposed) return;
							disposed = true; done(-2); return;
						}
						const sl = (container as any)._selectList;
						if (sl) { sl.handleInput(data); tui.requestRender(); }
					}
				},
			};
		}).then((result: number) => resolve(result));
	});
}

// ─── doBossFight ──────────────────────────────────────────────────
export async function doBossFight(ctx: any, boss: any, header: string | undefined, deps: { _wuxue: any; _chars: any; petState: any; addSkillXpToAll: Function; updateWidget: Function; scheduleSave: Function; getBestSkill: Function }) {
	const { _wuxue: wx, petState, addSkillXpToAll, updateWidget, scheduleSave, getBestSkill } = deps;
	const w = petState.wuxue;
	const weaponDef = petState.weapon ? wx.getWeaponDef(petState.weapon) : null;
	const weaponAttack = weaponDef ? weaponDef.attack : 0;
	const weaponElement = weaponDef ? weaponDef.element : "土";
	const bestSk = getBestSkill(petState.martialSkills);
	const skillLevel = bestSk?.level ?? 1;
	const skillDef = bestSk ? wx.getSkill(bestSk.id) : undefined;
	const skillElement = skillDef?.element;
	const ES = wx.ELEMENT_SYMBOL;
	const theme = ctx.ui.theme;

	// 选择战斗模式
	const hpBeforeBattle = Math.round(w.hp);  // 战斗前血量
	const mode = await wrapSelect(ctx, 
		`⚔️ 遭遇 ${boss.name}（${boss.title}）${ES[boss.element]}${boss.element}`,
		["⚔️ 自动战斗", "🎮 手动战斗", "❌ 逃跑"],
	);
	if (!mode || mode === "❌ 逃跑") {
		ctx.ui.notify(theme.fg("dim", `🏃 你选择了回避 ${boss.name}。`), "info");
		return;
	}

	let result: any;
	if (mode === "⚔️ 自动战斗") {
		result = wx.fightBoss(w, weaponAttack, weaponElement, boss, skillLevel, skillElement);
		if (result.won) wx.addXp(w, result.xpReward);
	} else {
		// 手动战斗
		const bs = wx.initBattleState(w, weaponAttack, weaponElement, boss, skillLevel, skillElement);
		let over = false;
		let won = false;
		let fled = false;

		// 收集所有武功信息
		const allSkills = (petState.martialSkills || [])
			.filter((sk: any) => {
				const def = wx.getSkill(sk.id);
				return !!def;  // 只保留有定义的武功
			})
			.map((sk: any) => {
				const def = wx.getSkill(sk.id);
				return { id: sk.id, name: def?.name || sk.id, level: sk.level, element: def?.element || "土", dmgBase: sk.level * 10 };
			});

		// 调试：如果没武功则通知
		if (allSkills.length === 0 && petState.martialSkills?.length > 0) {
			ctx.ui.notify(`⚠️ 武功列表为空！martialSkills=${JSON.stringify(petState.martialSkills?.map((s: any) => s.id))}`, "info");
		}

		while (!over) {
			// 显示当前状态
			const hpPct = Math.round(bs.playerHp / bs.playerMaxHp * 100);
			const bossPct = Math.round(Math.max(0, bs.bossHp) / bs.bossMaxHp * 100);
			const hpColor = hpPct > 50 ? "success" : hpPct > 20 ? "warning" : "error";
			const playerBar = renderBattleBar(bs.playerHp, bs.playerMaxHp, 16);
			const bossBar = renderBattleBar(Math.max(0, bs.bossHp), bs.bossMaxHp, 16);

			const statusLine = [
				theme.bold(`  ⚔️ 第${bs.turn + 1}回合`),
				theme.fg(hpColor, `  👤 ${playerBar} ${Math.max(0, Math.round(bs.playerHp))}/${bs.playerMaxHp}`),
				theme.fg("accent", `  👹 ${bossBar} ${Math.max(0, Math.round(bs.bossHp))}/${bs.bossMaxHp}`),
			].join("\n");

			const options = ["⚔️ 普通攻击"];
			if (allSkills.length > 0) options.push("🗡️ 使用武功");
			options.push("🛡️ 防御（伤害减半）");
			const itemCount = Object.values(w.items).reduce((a: number, b: number) => a + b, 0);
			if (itemCount > 0) options.push("💊 使用道具（回复20%血量）");
			options.push("🏃 逃跑");

			const action = await wrapSelect(ctx, statusLine, options);
			if (!action || action === "🏃 逃跑") { fled = true; over = true; break; }

			let turnAction: any = "attack";
			let chosenSkill: any = null;
			if (action.includes("武功") || action.includes("🗡️")) {
				// 弹出武功子列表
				const skOptions = allSkills.map((sk: any) => {
					const cost = Math.max(1, Math.floor(sk.dmgBase * 0.15));
					const pm = wx.getElementMultiplier(sk.element, boss.element);
					const bonus = pm > 1 ? " ✓克制" : pm === 0.7 ? " ✗被克" : "";
					return `  ${ES[sk.element]}${sk.name} Lv.${sk.level}${bonus}（耗${cost}血）`;
				});
				skOptions.push("↩️ 返回");
				const skChoice = await wrapSelect(ctx, "🗡️ 选择武功", skOptions);
				if (!skChoice || skChoice === "↩️ 返回") continue;
				chosenSkill = allSkills.find((sk: any) => skChoice.includes(sk.name));
				if (chosenSkill) {
					bs.skillElement = chosenSkill.element;
					bs.skillLevel = chosenSkill.level;
					bs.skillDmgBase = chosenSkill.dmgBase;
					turnAction = "skill";
				} else { continue; }
			} else if (action.includes("防御") || action.includes("🛡️")) {
				turnAction = "defend";
			} else if (action.includes("道具") || action.includes("💊")) {
				turnAction = "item";
			}

			const turnSkillName = chosenSkill ? chosenSkill.name : (bestSk ? wx.getSkill(bestSk.id)?.name : "");
			const turnResult = wx.executeBattleTurn(bs, turnAction, wx.getElementMultiplier);

			// 显示回合结果
			if (turnResult.fled) {
				fled = true; over = true; break;
			}
			const turnLines: string[] = [];
			// 🎲 显示骰子事件
			if (turnResult.dice && turnResult.dice.event !== "普通") {
				const diceEmoji = turnResult.dice.event === "暴击" ? "🔥" : turnResult.dice.event === "闪避" ? "💨" : turnResult.dice.event === "元素共鸣" ? "⚡" : turnResult.dice.event === "破防" ? "💥" : turnResult.dice.event === "回春" ? "💚" : turnResult.dice.event === "虚弱" ? "😵" : "🎲";
				turnLines.push(theme.fg("accent", `  ${diceEmoji} ${turnResult.dice.desc}`));
			}
			for (const log of turnResult.logs) {
				const bonus = log.elementBonus ? (log.elementBonus === "克制" ? theme.fg("accent", "[克制]") : log.elementBonus === "被克" ? theme.fg("error", "[被克]") : "") : "";
				if (log.attacker === "player") {
					if (log.selfDamage && log.selfDamage < 0) {
						// 道具回复
						turnLines.push(theme.fg("success", `  💊 回复 ${-log.selfDamage} 血量`));
					} else {
						const costStr = log.selfDamage ? theme.fg("warning", `耗${log.selfDamage}血 `) : "";
						const prefix = log.isSkillHit ? theme.fg("accent", `  ${turnSkillName || "武功"}`) : theme.fg("dim", `  R${log.turn}: `);
						turnLines.push(prefix + theme.fg("success", ` ${log.damage}伤 `) + costStr + bonus);
					}
				} else {
					turnLines.push(theme.fg("dim", `  R${log.turn}: `) + theme.fg("error", `${log.attacker} ${log.damage}伤 `) + bonus);
				}
			}
			if (turnLines.length > 0) ctx.ui.notify(turnLines.join("\n"), "info");

			if (turnResult.over) {
				over = true;
				won = !!turnResult.won;
			}
		}

		result = wx.finalizeBattle(w, bs, boss, won, fled);
		if (fled) {
			ctx.ui.notify(theme.fg("dim", `🏃 你逃离了 ${boss.name} 的战斗。`), "info");
			updateWidget(ctx); scheduleSave(); return;
		}
		if (result.won) wx.addXp(w, result.xpReward);
	}

	// ─── 结果展示（自动/手动共用） ────────────────────────────
	const fightLines: string[] = [];
	if (header) fightLines.push(header);
	const hpBefore = hpBeforeBattle;
	const skillName = bestSk ? wx.getSkill(bestSk.id)?.name : "";
	if (result.won) {
		fightLines.push(theme.fg("success", `  ⚔️ 胜利！击败 ${result.bossName}！ +${result.goldReward}金 +${result.xpReward}经验`));
	} else {
		fightLines.push(theme.fg("error", `  💀 战败... ${result.bossName}更胜一筹 +${result.xpReward}经验`));
	}
	fightLines.push(theme.fg("dim", `  ❤️${hpBefore}→${Math.round(w.hp)}`));
	const pm = wx.getElementMultiplier(weaponElement, result.bossElement);
	if (pm > 1) fightLines.push(theme.fg("accent", `  ${ES[weaponElement]}${weaponElement} 克 ${ES[result.bossElement]}${result.bossElement}，伤害+50%！`));
	else if (pm === 0.7) fightLines.push(theme.fg("error", `  ${ES[weaponElement]}${weaponElement} 被 ${ES[result.bossElement]}${result.bossElement} 克制，伤害-30%`));
	else if (pm < 1) fightLines.push(theme.fg("dim", `  ${ES[weaponElement]}${weaponElement} vs ${ES[result.bossElement]}${result.bossElement}`));

	// 自动模式才显示逐回合日志（手动模式已逐回合显示）
	if (mode === "⚔️ 自动战斗") {
		for (const log of result.logs) {
			const bonus = log.elementBonus ? (log.elementBonus === "克制" ? theme.fg("accent", "[克制]") : log.elementBonus === "被克" ? theme.fg("error", "[被克]") : "") : "";
			if (log.attacker === "player") {
				const costStr = log.selfDamage ? theme.fg("warning", `耗${log.selfDamage}血 `) : "";
				const prefix = log.isSkillHit ? theme.fg("accent", `  ${skillName || "武功"}`) : theme.fg("dim", `  R${log.turn}: `);
				fightLines.push(prefix + theme.fg("success", ` ${log.damage}伤 `) + costStr + bonus);
			} else {
				fightLines.push(theme.fg("dim", `  R${log.turn}: `) + theme.fg("error", `${log.attacker} ${log.damage}伤 `) + bonus);
			}
		}
	}

	if (petState.martialSkills.length > 0) {
		const leveledUp = addSkillXpToAll(petState.martialSkills, result.skillXpReward);
		for (const msg of leveledUp) ctx.ui.notify(`🔥 武功突破！${msg}！`, "info");
	}
	if (fightLines.length > 0) ctx.ui.notify(fightLines.join("\n"), "info");
	wx.checkAchievements(w);
	updateWidget(ctx);
	scheduleSave();
}

/** 血量进度条（手动战斗用） */
function renderBattleBar(current: number, max: number, width: number): string {
	const pct = Math.max(0, Math.min(1, current / max));
	const filled = Math.round(pct * width);
	return "█".repeat(filled) + "░".repeat(width - filled);
}
