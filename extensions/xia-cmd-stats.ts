// @ts-nocheck
/**
 * xia-cmd-stats.ts — /xia stats/skills/heroes/weapons/items 子命令
 */

import { resolve, dirname } from "node:path";
import { renderBar } from "./xia-render.js";
import { pagedSelect, RARITY_MULTIPLIER } from "./xia-select.js";
import { Container, Text, SelectList, Image, matchesKey, Key, getCapabilities, visibleWidth, truncateToWidth, renderImage, allocateImageId } from "@earendil-works/pi-tui";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
const __cmdDir = dirname(fileURLToPath(import.meta.url));
const bust = (rel: string) => pathToFileURL(resolve(__cmdDir, rel)).href + `?_t=${Date.now()}`;

export async function handleStatsCmd(
	ctx: any, sub: string, w: any, MAX: number, ES: Record<string, string>, theme: any,
	deps: any,
) {
	const { _chars, _wuxue, petState, showLines, wrapSelect, __dirname } = deps;

	switch (sub) {
		case "stats": {
			const char = petState.characterId ? _chars.getCharacter(petState.characterId) : null;
			const weaponDef = petState.weapon ? _wuxue.getWeaponDef(petState.weapon) : null;
			const skillSummary = petState.martialSkills.map((sk: any) => {
				const def = _wuxue.getSkill(sk.id);
				return def ? `${ES[def.element]}${def.name}Lv${sk.level}` : null;
			}).filter(Boolean).join(" ") || "未觉醒";
			const allAchDefs = _wuxue.getAchievementDefs();
			const achOptions = allAchDefs.map(ad => {
				const obtained = w.achievements.includes(ad.id);
				return (obtained ? "✅" : "⬜") + ` ${ad.name} — ${ad.description}`;
			});
			const infoTitle = [
				`${petState.nickname || char?.name || "江湖路人"} · Lv.${w.level} ${_wuxue.getLevelTitle(w.level)}`,
			`⚔️${w.attack} 🛡️${w.defense} 💪${_wuxue.getWuli(w, weaponDef ? weaponDef.attack : 0)} ❤️${Math.round(w.hp)}/${w.maxHp} 💰${w.gold}金`,
			`武功: ${skillSummary}`,
			weaponDef ? `武器: ${_wuxue.getRaritySymbol(weaponDef.rarity)}${weaponDef.name} 攻+${weaponDef.attack}` : null,
		].filter(Boolean).join("\n");
			await pagedSelect(ctx, infoTitle, achOptions, false);
			return "ok";
		}
		case "skills": {
			if (petState.martialSkills.length === 0) {
				ctx.ui.notify("尚未习得任何武功，修炼之路才刚开始...", "info");
				return "ok";
			}
			const skillOptions: string[] = [];
			const skillIdxs: number[] = [];
			for (let i = 0; i < petState.martialSkills.length; i++) {
				const sk = petState.martialSkills[i];
				const def = _wuxue.getSkill(sk.id);
				if (!def) continue;
				const xpBar = renderBar(sk.xp, _wuxue.getSkillXpToNext(sk.level), 12);
				skillOptions.push(`${ES[def.element]}${def.name} Lv.${sk.level}  ${xpBar} ${sk.xp}/${_wuxue.getSkillXpToNext(sk.level)}  ${def.description}`);
				skillIdxs.push(i);
			}
			const choice = await pagedSelect(ctx, "📖 武功秘典", skillOptions, false);
			if (choice === -1 || choice === -2) return choice === -2 ? "back" : "ok";
			const skIdx = skillIdxs[choice];
			const sk = petState.martialSkills[skIdx];
			const skDef = _wuxue.getSkill(sk.id);
			const sellPrice = Math.max(50, Math.floor(_wuxue.getSkillPrice() * 0.3));
			const action = await wrapSelect(ctx, `${ES[skDef.element]}${skDef.name} Lv.${sk.level}  ${skDef.description}`, ["📖 查看", `💰 遗忘（返还${sellPrice}金）`, "❌ 取消"]);
			if (!action || action === "❌ 取消") return "ok";
			if (action === "📖 查看") {
				const sLines = [""];
				sLines.push(theme.bold(`  ═══ ${ES[skDef.element]}${skDef.name} ═══`));
				sLines.push(theme.fg("muted", `  ${skDef.description}`));
				sLines.push(theme.fg("accent", `  Lv.${sk.level}`) + `  ` + theme.fg("muted", `${renderBar(sk.xp, _wuxue.getSkillXpToNext(sk.level), 20)} ${sk.xp}/${_wuxue.getSkillXpToNext(sk.level)}`));
				sLines.push("");
				showLines(ctx, sLines);
			} else {
				petState.martialSkills.splice(skIdx, 1);
				w.gold += sellPrice;
				ctx.ui.notify(`🔥 遗忘 ${skDef.name}，返还 ${sellPrice}金`, "info");
			}
			return "ok";
		}
		case "heroes": {
			const allChars = _chars.CHARACTERS;
			const heroItems: string[] = [];
			const heroIds: string[] = [];
			let curNovel = "";
			for (const c of allChars) {
				if (c.novel !== curNovel) { curNovel = c.novel; heroItems.push(`── ${curNovel} ──`); heroIds.push(""); }
				const wuxue = c.compact[1]?.replace(/^\s*╰┬┬╯\s*/, "") ?? "";
				heroItems.push(`${c.name} · ${c.title} · ${wuxue}`);
				heroIds.push(c.id);
			}
			const hIdx = await pagedSelect(ctx, "金庸群侠录", heroItems, false);
			if (hIdx === -1 || hIdx === -2) return hIdx === -2 ? "back" : "ok";
			const selectedId = heroIds[hIdx];
			if (!selectedId) break;
			const selectedChar = allChars.find((c: any) => c.id === selectedId);
			const exclusiveNames = selectedChar.exclusiveSkills.map((sid: string) => {
				const sd = _wuxue.getSkill(sid);
				return sd ? `    ${ES[sd.element] ?? ""}${sd.name} — ${sd.description}` : `    ${sid}`;
			});
			const detailLines = [
				theme.bold(`  ═══ ${selectedChar.name} · ${selectedChar.title} ═══`),
				theme.fg("accent", `  《${selectedChar.novel}》`),
				"",
				theme.bold("  【专属武功】"),
				...exclusiveNames.map((n: string) => theme.fg("accent", n)),
				"",
				theme.fg("muted", `  ${selectedChar.description}`),
			];

			// 尝试加载角色头像
			let charAvatar: { base64: string; widthPx: number; heightPx: number } | null = null;
			try {
				const renderMod = await import(bust("./xia-render.js"));
				charAvatar = await renderMod.fetchAvatarByName(selectedChar.avatarFile);
			} catch { /* ignore */ }

			if (charAvatar) {
				try {
					const renderMod = await import(bust("./xia-render.js"));
					if (renderMod.canShowImages()) {
						// 用自定义 UI 显示头像 + 详情
						await showHeroWithAvatar(ctx, detailLines, charAvatar, theme);
					} else {
						showLines(ctx, ["", ...detailLines, ""]);
					}
				} catch {
					showLines(ctx, ["", ...detailLines, ""]);
				}
			} else {
				showLines(ctx, ["", ...detailLines, ""]);
			}
			return "ok";
		}
		case "weapons": {
			if (petState.ownedWeapons.length === 0) {
				ctx.ui.notify("兵器库空空如也，去商店购买或打败Boss获取掉落吧！", "info");
				return "ok";
			}
			const weaponOptions: string[] = [];
			const weaponIds: string[] = [];
			for (const wid of petState.ownedWeapons) {
				const def = _wuxue.getWeaponDef(wid);
				if (!def) continue;
				const eq = wid === petState.weapon ? " ← 装备中" : "";
				weaponOptions.push(`${_wuxue.getRaritySymbol(def.rarity)}${def.name}  ${ES[def.element]}${def.element} 攻+${def.attack}${eq}`);
				weaponIds.push(wid);
			}
			const choice = await pagedSelect(ctx, "⚔️ 选择武器", weaponOptions);
			if (choice === -1 || choice === -2) return choice === -2 ? "back" : "ok";
			const selectedId = weaponIds[choice];
			const wDef = _wuxue.getWeaponDef(selectedId);
			const sellPrice = Math.max(1, Math.floor(wDef.attack * 10 * (RARITY_MULTIPLIER[wDef.rarity] ?? 1) * 0.5));
			const action = await wrapSelect(ctx, `${_wuxue.getRaritySymbol(wDef.rarity)}${wDef.name}  ${ES[wDef.element]}${wDef.element} 攻+${wDef.attack}`, ["⚔️ 装备", `💰 出售（${sellPrice}金）`, "❌ 取消"]);
			if (!action || action === "❌ 取消") return "ok";
			if (action === "⚔️ 装备") {
				petState.weapon = selectedId;
				ctx.ui.notify(`⚔️ 装备了 ${_wuxue.getRaritySymbol(wDef.rarity)}${wDef.name}！攻+${wDef.attack}`, "info");
			} else {
				if (selectedId === petState.weapon) petState.weapon = null;
				petState.ownedWeapons = petState.ownedWeapons.filter((w: string) => w !== selectedId);
				w.gold += sellPrice;
				ctx.ui.notify(`💰 出售 ${_wuxue.getRaritySymbol(wDef.rarity)}${wDef.name}，获得 ${sellPrice}金`, "info");
			}
			return "ok";
		}
		case "items": {
			const owned = Object.entries(w.items).filter(([_, c]: [string, any]) => c > 0);
			if (owned.length === 0) { ctx.ui.notify("道具栏空空如也，去商店购买或打败Boss获取掉落吧！", "info"); return "ok"; }
			const itemOptions: string[] = [];
			const itemIds: string[] = [];
			for (const [id, count] of owned) {
				const def = _wuxue.getItemDef(id);
				if (!def) continue;
				const icon = def.type === "恢复" ? "💊" : def.type === "增益" ? "✨" : "📖";
				itemOptions.push(`${icon} ${def.name} ×${count}  ${def.description}`);
				itemIds.push(id);
			}
			const choice = await pagedSelect(ctx, "🎒 选择道具", itemOptions);
			if (choice === -1 || choice === -2) return choice === -2 ? "back" : "ok";
			const selectedId = itemIds[choice];
			const itemDef = _wuxue.getItemDef(selectedId);
			const iPrice = itemDef.type === "恢复" ? (itemDef.effect.hp ?? 0) * 2 : itemDef.type === "增益" ? 50 : 80;
			const sellPrice = Math.max(1, Math.floor(iPrice * 0.5));
			const action = await wrapSelect(ctx, `${itemDef.name} ×${w.items[selectedId]}  ${itemDef.description}`, ["💊 使用", `💰 出售1个（${sellPrice}金）`, "❌ 取消"]);
			if (!action || action === "❌ 取消") return "ok";
			if (action === "💊 使用") {
				if (itemDef?.effect.attackBuff) w.attackBuff += itemDef.effect.attackBuff;
				if (itemDef?.effect.defenseBuff) w.defenseBuff += itemDef.effect.defenseBuff;
				if (itemDef?.effect.xpBonus && itemDef.type === "增益") w.xpBonus = Math.max(w.xpBonus, itemDef.effect.xpBonus);
				const r = _wuxue.useItem(w, selectedId);
				if (r.success) { w.items[selectedId]--; ctx.ui.notify(`💊 ${r.msg} — ${r.effect}`, "info"); }
				else ctx.ui.notify(`❌ ${r.msg}`, "info");
			} else {
				w.items[selectedId]--; w.gold += sellPrice;
				ctx.ui.notify(`💰 出售 ${itemDef.name}，获得 ${sellPrice}金`, "info");
			}
			return "ok";
		}
	}
	return "ok";
}

/** 用自定义 UI 显示群侠录角色详情（头像在左，资料在右，同行显示） */
async function showHeroWithAvatar(
	ctx: any, detailLines: string[],
	avatarData: { base64: string; widthPx: number; heightPx: number },
	theme: any,
): Promise<void> {
	return new Promise((resolve) => {
		ctx.ui.custom((tui: any, _theme: any, _kb: any, done: () => void) => {
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
					if (!result) return detailLines;

					const seq = result.sequence;
					const rows = result.rows;
					const isKitty = caps?.images === "kitty";
					// 头像区域占位：用 ANSI 光标右移跳过图片列
					const movePast = `\x1b[${imgCellW + gap}C`;
					// 底部提示行
					const allLines = [...detailLines, "", _theme.fg("dim", "  按 esc 或 enter 返回")];
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
					if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter)) {
						disposed = true;
						done();
					}
				},
			};
		}).then(() => resolve());
	});
}
