// @ts-nocheck
/**
 * xia-cmd-shop-rank.ts — /xia shop/rank/bosses 子命令
 */

import { pagedSelect, RARITY_MULTIPLIER } from "./xia-select.js";
import { doBossFight } from "./xia-boss.js";
import { fetchLeaderboard, fetchGlobalStats, fetchPlayerProfile } from "./telemetry.js";

export async function handleShopRankCmd(
	ctx: any, sub: string, w: any, MAX: number, ES: Record<string, string>, theme: any,
	deps: any,
) {
	const { _chars, _wuxue, petState, addSkillXpToAll, updateWidget, scheduleSave, getBestSkill, showLines, wrapSelect } = deps;

	switch (sub) {
		case "shop": {
			const cat = await wrapSelect(ctx, "🏪 江湖商铺", ["⚔️ 购买武器", "💊 购买道具", "📜 购买武功秘籍"]);
			if (cat === undefined) return "ok";
			if (cat === "⚔️ 购买武器") {
				const buyable = _wuxue.WEAPON_DEFS;
				const shopWeaponItems = buyable.map((wd: any, wi: number) => {
					const mult = RARITY_MULTIPLIER[wd.rarity] ?? 1;
					const price = wd.attack * 10 * mult;
					const alreadyOwned = petState.ownedWeapons.includes(wd.id) ? " ✅" : "";
					return { label: `${_wuxue.getRaritySymbol(wd.rarity)}${wd.name}  ${ES[wd.element]}${wd.element} 攻+${wd.attack}  💰${price}金${alreadyOwned}`, sortKey: price, origIdx: wi };
				});
				const wIdx = await pagedSelect(ctx, `⚔️ 购买武器（💰 ${w.gold}金）`, shopWeaponItems);
				if (wIdx === -1 || wIdx === -2) return wIdx === -2 ? "back" : "ok";
				const target = _wuxue.WEAPON_DEFS[wIdx];
				if (petState.ownedWeapons.includes(target.id)) { ctx.ui.notify("你已拥有此武器", "info"); return "ok"; }
				const wPrice = target.attack * 10 * (RARITY_MULTIPLIER[target.rarity] ?? 1);
				if (w.gold < wPrice) { ctx.ui.notify(`❌ 金币不足！需要 ${wPrice}金，你只有 ${w.gold}金`, "info"); break; }
				w.gold -= wPrice;
				petState.ownedWeapons.push(target.id);
				ctx.ui.notify(`🏪 购入 ${_wuxue.getRaritySymbol(target.rarity)}${target.name}！花了 ${wPrice}金`, "info");
			} else if (cat === "📜 购买武功秘籍") {
				const price = _wuxue.getSkillPrice();
				if (petState.martialSkills.length >= MAX) { ctx.ui.notify(`❌ 武功已满（${MAX}/${MAX}）！`, "info"); return "ok"; }
				const ownedIds = petState.martialSkills.map((s: any) => s.id);
				const shopSkills = _wuxue.getShopSkills(ownedIds);
				if (shopSkills.length === 0) { ctx.ui.notify("所有公共武功都已习得！", "info"); return "ok"; }
				const skillOptions = shopSkills.map((s: any) => `${ES[s.element]}${s.name}  ${s.description}  💰${price}金`);
				const sIdx = await pagedSelect(ctx, `📜 购买武功秘籍（💰 ${w.gold}金）`, skillOptions, false);
				if (sIdx === -1 || sIdx === -2) return sIdx === -2 ? "back" : "ok";
				const chosen = shopSkills[sIdx];
				if (w.gold < price) { ctx.ui.notify(`❌ 金币不足！需要 ${price}金，你只有 ${w.gold}金`, "info"); break; }
				w.gold -= price;
				petState.martialSkills.push({ id: chosen.id, level: 1, xp: 0 });
				ctx.ui.notify(`📜 习得武功「${chosen.name}」！(${petState.martialSkills.length}/${MAX})`, "info");
			} else {
				const shopItemItems = _wuxue.ITEM_DEFS.map((it: any, ii: number) => {
					const price = it.type === "恢复" ? (it.effect.hp ?? 0) * 2 : it.type === "增益" ? 50 : 80;
					const icon = it.type === "恢复" ? "💊" : it.type === "增益" ? "✨" : "📖";
					return { label: `${icon} ${it.name}  ${it.description}  💰${price}金`, sortKey: price, origIdx: ii };
				});
				const iIdx = await pagedSelect(ctx, `💊 购买道具（💰 ${w.gold}金）`, shopItemItems);
				if (iIdx === -1 || iIdx === -2) return iIdx === -2 ? "back" : "ok";
				const targetItem = _wuxue.ITEM_DEFS[iIdx];
				const iPrice = targetItem.type === "恢复" ? (targetItem.effect.hp ?? 0) * 2 : targetItem.type === "增益" ? 50 : 80;
				if (w.gold < iPrice) { ctx.ui.notify(`❌ 金币不足！需要 ${iPrice}金，你只有 ${w.gold}金`, "info"); break; }
				w.gold -= iPrice;
				w.items[targetItem.id] = (w.items[targetItem.id] || 0) + 1;
				ctx.ui.notify(`🏪 购入 ${targetItem.name}！花了 ${iPrice}金`, "info");
			}
			return "ok";
		}
		case "rank":
		case "leaderboard": {
			// 江湖排行榜
			const sortOptions = ["⚔️ 武力排行 (等级)", "💰 富甲天下 (金币)", "📝 笔耕不辍 (编辑)", "💪 修炼达人 (经验)"];
			const sortKeys = ["level", "gold", "edits", "xp"];
			const sortChoice = await wrapSelect(ctx, "🏆 江湖排行榜", sortOptions);
			if (!sortChoice) return "ok";
			const sortIdx = sortOptions.indexOf(sortChoice);
			const sortKey = sortKeys[sortIdx] ?? "level";

			ctx.ui.notify(theme.fg("dim", "📡 正在获取江湖排行..."), "info");
			const [lbData, statsData] = await Promise.all([
				fetchLeaderboard(sortKey as any, 20, 0),
				fetchGlobalStats(),
			]);

			if (!lbData || !lbData.ok) {
				ctx.ui.notify("❌ 无法连接江湖榜，请稍后再试", "info");
				return "ok";
			}
			if (lbData.players.length === 0) {
				ctx.ui.notify("📊 江湖榜暂无侠客上榜，稍后再来查看！", "info");
				return "ok";
			}

			const sortLabel: Record<string, string> = { level: "等级", gold: "金币", edits: "编辑", xp: "经验" };
			const rLines = [""];
			rLines.push(theme.bold(`  ═══ 江湖排行榜 · ${sortLabel[sortKey] ?? sortKey} ═══`));
			if (statsData?.totalPlayers) {
				rLines.push(theme.fg("dim", `  共 ${statsData.totalPlayers} 位侠客行走江湖`));
			}
			rLines.push("");

			for (let i = 0; i < lbData.players.length; i++) {
				const p = lbData.players[i];
				const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${(i + 1).toString().padStart(2, " ")}.`;
				const name = p.character_name ?? "无名侠客";
				const mainStat = sortKey === "gold" ? `💰${p.gold}金` : sortKey === "edits" ? `📝${p.total_edits}次` : sortKey === "xp" ? `💪${p.total_xp}xp` : `Lv.${p.level}`;
				const subStats = `⚔️Lv.${p.level} 💰${p.gold} 📝${p.total_edits}`;
				rLines.push(`  ${medal} ${theme.fg("accent", name)} ${theme.bold(mainStat)} ${theme.fg("dim", subStats)}`);
			}

			// 如果当前用户已开遥测，显示自己的排名
			if (petState.telemetryEnabled && petState.userId) {
				const myProfile = await fetchPlayerProfile(petState.userId);
				if (myProfile?.ok && myProfile.rank > 0) {
					rLines.push("");
					rLines.push(theme.fg("accent", `  📍 你的排名: #${myProfile.rank} / ${statsData?.totalPlayers ?? "?"} 侠客`));
				}
			}

			rLines.push("");
			showLines(ctx, rLines);
			return "ok";
		}
		case "bosses": {
			const bossOptions: string[] = [];
			const ranges = ["Lv.1-5", "Lv.6-10", "Lv.11-20", "Lv.21-30", "Lv.31-40", "Lv.41-50", "Lv.51-65", "Lv.66-80", "Lv.81+"];
			for (let i = 0; i < _wuxue.BOSS_DEFS.length; i++) {
				const b = _wuxue.BOSS_DEFS[i];
				bossOptions.push(`${b.name} · ${b.title}  ${ES[b.element]}${b.element}  ${ranges[i] ?? ""}`);
			}
			const bIdx = await pagedSelect(ctx, "⚔️ 选择Boss挑战", bossOptions);
			if (bIdx === -1 || bIdx === -2) return bIdx === -2 ? "back" : "ok";
			const boss = _wuxue.BOSS_DEFS[bIdx];
			doBossFight(ctx, boss, theme.bold(`  ⚔️ 挑战 ${boss.name}（${boss.title}）— ${ES[boss.element]}${boss.element}属性`), {
				_wuxue, _chars, petState, addSkillXpToAll, updateWidget, scheduleSave, getBestSkill, wrapSelect, _state: deps._state,
			});
			return "ok";
		}
	}
	return "ok";
}
