// @ts-nocheck
/**
 * xia-cmd-faction.ts — 帮派/职业/天赋子命令
 */

import { pagedSelect, wrapSelect } from "./xia-select.js";
import { getAllFactions, getFaction, getFactionRankTitle, getFactionBonus } from "./wuxue-faction.js";
import { getAllProfessions, getProfession, getProfessionBonus } from "./wuxue-profession.js";
import { getAllTalents, getTalent, canLearnTalent, calculateTalentBonuses, getBranchName, getBranchEmoji, getTalentPointsPerLevel } from "./wuxue-talent.js";
import { getAchievementDef, getAllAchievementDefs, getAchievementsByCategory, getRarityLabel, getRarityColor, getRarityEmoji, ACHIEVEMENT_CATEGORIES } from "./wuxue-achievements.js";
import { ELEMENT_SYMBOL } from "./wuxue-types.js";
import { resolve, dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderImageWithStatus } from "./xia-render.js";
import { getCapabilities } from "@earendil-works/pi-tui";

export async function handleFactionCmd(
	ctx: any, sub: string, w: any, petState: any, theme: any, deps: any,
) {

	switch (sub) {
		case "faction":
		case "clan":
		case "guild":
		case "门派":
		case "帮派": {
			if (petState.factionId) {
				// 已加入门派 — 显示详情
				const faction = getFaction(petState.factionId);
				if (!faction) { petState.factionId = null; return "ok"; }
				const rank = getFactionRankTitle(petState.factionId, petState.factionContribution);
				const bonus = getFactionBonus(petState.factionId, petState.factionContribution);
				const fLines = ["", theme.bold(`  ═══ ${faction.emoji} ${faction.name} ═══`), ""];
				fLines.push(theme.fg("dim", `  ${faction.description}`));
				fLines.push(theme.fg("dim", `  ${faction.lore}`));
				fLines.push("");
				fLines.push(`  ${ELEMENT_SYMBOL[faction.element]}${faction.element}属性  📜门派称号: ${theme.fg("accent", rank)}`);
				fLines.push(`  🏅贡献度: ${petState.factionContribution}`);
				fLines.push("");
				fLines.push(theme.bold("  门派加成:"));
				if (bonus.attack > 0) fLines.push(`    ⚔️ 攻击 +${bonus.attack}%`);
				if (bonus.defense > 0) fLines.push(`    🛡️ 防御 +${bonus.defense}%`);
				if (bonus.hp > 0) fLines.push(`    ❤️ 血量 +${bonus.hp}%`);
				if (bonus.xp > 0) fLines.push(`    📝 经验 +${bonus.xp}%`);
				if (bonus.gold > 0) fLines.push(`    💰 金币 +${bonus.gold}%`);
				fLines.push("");
				fLines.push(theme.bold("  门派武功:"));
				for (const sid of faction.exclusiveSkills) {
					fLines.push(`    📜 ${sid}`);
				}
				fLines.push("");
				fLines.push(theme.fg("dim", "  每次修炼/战斗/完成任务可增加门派贡献"));
				fLines.push("");
				showLines(ctx, fLines);
			} else {
				// 未加入 — 显示门派列表
				const factionOptions = getAllFactions().map(f => {
					const req = f.requirement;
					const meetsLevel = w.level >= req.level;
					const meetsGold = w.gold >= req.gold;
					const lockIcon = meetsLevel && meetsGold ? "" : " 🔒";
					return `${f.emoji} ${f.name} ${ELEMENT_SYMBOL[f.element]}${f.element}  攻+${f.bonuses.attack}% 防+${f.bonuses.defense}%  Lv.${req.level}+${lockIcon}`;
				});
				const fIdx = await pagedSelect(ctx, "🏛️ 选择门派加入", factionOptions, false);
				if (fIdx === -1 || fIdx === -2) return fIdx === -2 ? "back" : "ok";
				const chosen = getAllFactions()[fIdx];
				if (w.level < chosen.requirement.level) {
					ctx.ui.notify(`❌ 等级不足！需要 Lv.${chosen.requirement.level}，当前 Lv.${w.level}`, "info");
					return "ok";
				}
				if (w.gold < chosen.requirement.gold) {
					ctx.ui.notify(`❌ 金币不足！需要 ${chosen.requirement.gold}金，当前 ${w.gold}金`, "info");
					return "ok";
				}
				petState.factionId = chosen.id;
				petState.factionContribution = 0;
				petState.joinedFactionAt = Date.now();
				ctx.ui.notify(`${chosen.emoji} 拜入${chosen.name}门下！${chosen.description}`, "info");
			}
			return "ok";
		}
		case "profession":
		case "class":
		case "职业": {
			if (petState.professionId) {
				const prof = getProfession(petState.professionId);
				if (!prof) { petState.professionId = null; return "ok"; }
				const bonus = getProfessionBonus(petState.professionId, w.level);
				const pLines = ["", theme.bold(`  ═══ ${prof.emoji} ${prof.name} ═══`), ""];
				pLines.push(theme.fg("dim", `  ${prof.description}`));
				pLines.push("");
				pLines.push(`  ${ELEMENT_SYMBOL[prof.element]}${prof.element}属性`);
				pLines.push(`  🌟特技: ${theme.fg("accent", prof.special)} — ${prof.specialDesc}`);
				pLines.push(`  🎯被动: ${prof.passive}`);
				pLines.push("");
				pLines.push(theme.bold("  职业加成:"));
				if (bonus.attack > 0) pLines.push(`    ⚔️ 攻击 +${bonus.attack}%`);
				if (bonus.defense > 0) pLines.push(`    🛡️ 防御 +${bonus.defense}%`);
				if (bonus.hp > 0) pLines.push(`    ❤️ 血量 +${bonus.hp}%`);
				if (bonus.xp > 0) pLines.push(`    📝 经验 +${bonus.xp}%`);
				if (bonus.gold > 0) pLines.push(`    💰 金币 +${bonus.gold}%`);
				pLines.push("");
				showLines(ctx, pLines);
			} else {
				const profOptions = getAllProfessions().map(p =>
					`${p.emoji} ${p.name} ${ELEMENT_SYMBOL[p.element]}${p.element}  ${p.description}`
				);
				const pIdx = await pagedSelect(ctx, "🎭 选择江湖职业", profOptions, false);
				if (pIdx === -1 || pIdx === -2) return pIdx === -2 ? "back" : "ok";
				const chosen = getAllProfessions()[pIdx];
				petState.professionId = chosen.id;
				petState.joinedProfessionAt = Date.now();
				ctx.ui.notify(`${chosen.emoji} 成为${chosen.name}！${chosen.passive}`, "info");
			}
			return "ok";
		}
		case "talent":
		case "talents":
		case "天赋": {
			if (petState.talentPoints > 0) {
				// 有天赋点 — 直接展示可学习天赋供选择
				const learnable = getAllTalents().filter(t => canLearnTalent(t, petState.talents, petState.talentPoints));
				if (learnable.length === 0) {
					ctx.ui.notify("❌ 没有可学习的天赋", "info");
					return "ok";
				}
				const talentOpts = learnable.map(t => `${getBranchEmoji(t.branch)} ${t.emoji} ${t.name} [Tier ${t.tier}] — ${t.effect}`);
				const tIdx = await pagedSelect(ctx, `🌟 选择天赋学习 (${petState.talentPoints}点可用)`, talentOpts, false);
				if (tIdx === -1 || tIdx === -2) return tIdx === -2 ? "back" : "ok";
				const chosen = learnable[tIdx];
				petState.talents.push(chosen.id);
				petState.talentPoints--;
				ctx.ui.notify(`🌟 习得天赋「${chosen.emoji} ${chosen.name}」！${chosen.effect}`, "info");
			} else {
				// 无天赋点 — 展示天赋总览
				const tLines = ["", theme.bold(`  ═══ 🌟 成长天赋 ═══`), ""];
				tLines.push(`  可用天赋点: ${theme.bold(String(petState.talentPoints))}  已学习: ${petState.talents.length}`);
				tLines.push("");
				const branches: ("combat" | "survival" | "fortune")[] = ["combat", "survival", "fortune"];
				for (const branch of branches) {
					tLines.push(theme.bold(`  ${getBranchEmoji(branch)} ${getBranchName(branch)}`));
					const branchTalents = getAllTalents().filter(t => t.branch === branch);
					for (const t of branchTalents) {
						const learned = petState.talents.includes(t.id);
						const icon = learned ? "✅" : "⬜";
						const nameStr = learned ? theme.fg("accent", `${t.emoji} ${t.name}`) : `${t.emoji} ${t.name}`;
						tLines.push(`    ${icon} ${nameStr} ${theme.fg("dim", `[Tier ${t.tier}] ${t.effect}`)}`);
					}
					tLines.push("");
				}
				showLines(ctx, tLines);
			}
			return "ok";
		}
		case "achievements":
		case "achievement":
		case "成就": {
			const aLines = ["", theme.bold(`  ═══ 🏆 江湖成就 ═══`), ""];
			const unlocked = w.achievements || [];
			const total = getAllAchievementDefs().length;
			aLines.push(theme.fg("dim", `  已解锁: ${unlocked.length}/${total}`));
			aLines.push("");

			// 按分类展示
			for (const cat of ACHIEVEMENT_CATEGORIES) {
				const catAchievements = getAchievementsByCategory(cat.id);
				const catUnlocked = catAchievements.filter(a => unlocked.includes(a.id));
				if (catAchievements.length === 0) continue;
				aLines.push(theme.bold(`  ${cat.emoji} ${cat.name} (${catUnlocked.length}/${catAchievements.length})`));
				for (const ach of catAchievements) {
					const isUnlocked = unlocked.includes(ach.id);
					if (isUnlocked) {
						const rarityStr = getRarityEmoji(ach.rarity);
						aLines.push(`    ${rarityStr} ${theme.fg("accent", `${ach.icon} ${ach.name}`)} ${theme.fg("dim", `— ${ach.description}`)}`);
					} else {
						aLines.push(theme.fg("dim", `    🔒 ??? — ${ach.description}`));
					}
				}
				aLines.push("");
			}

			showLines(ctx, aLines);

			// 提供查看成就勋章选项
			if (unlocked.length > 0) {
				const genChoice = await wrapSelect(ctx, "🏆 成就展示", ["🖼️ 查看成就勋章", "❌ 关闭"]);
				if (genChoice?.includes("勋章")) {
					const unlockedDefs = unlocked.map((id: string) => getAchievementDef(id)).filter(Boolean);
					const achOptions = unlockedDefs.map((a: any) => `${getRarityEmoji(a.rarity)} ${a.icon} ${a.name}`);
					const achIdx = await pagedSelect(ctx, "🖼️ 选择成就查看勋章", achOptions, false);
					if (achIdx >= 0 && achIdx < unlockedDefs.length) {
						const ach = unlockedDefs[achIdx];
						await showAchievementBadgeImage(ctx, ach);
					}
				}
			}

			return "ok";
		}
	}
	return "ok";
}

function showLines(ctx: any, lines: string[]) {
	ctx.ui.notify(lines.join("\n"), "info");
}

// ═══════════════════════════════════════════════════════════════
// 成就勋章图片 — 从 Cloudflare CDN 加载预生成的徽章
// ═══════════════════════════════════════════════════════════════

const _achDir = dirname(fileURLToPath(import.meta.url));
const BADGE_CDN_URL = "https://xia.openclawd.qzz.io/badges";

/** 获取成就图片本地缓存路径 */
function getBadgeCachePath(achId: string): string {
	const cacheDir = resolve(_achDir, '..', '.cache', 'badges');
	if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
	return resolve(cacheDir, `${achId}.png`);
}

/** 加载 PNG buffer 为 renderImageWithStatus 所需格式 */
function pngToImageData(buf: Buffer): { base64: string; widthPx: number; heightPx: number } | null {
	try {
		const w = buf.readUInt32BE(16);
		const h = buf.readUInt32BE(20);
		return { base64: buf.toString("base64"), widthPx: w, heightPx: h };
	} catch { return null; }
}

/** 从本地缓存或 CDN 加载成就勋章图片并展示 */
async function showAchievementBadgeImage(ctx: any, ach: any): Promise<void> {
	const rarityLabel = getRarityLabel(ach.rarity);

	// 1) 尝试本地缓存
	const cachePath = getBadgeCachePath(ach.id);
	if (existsSync(cachePath)) {
		const buf = readFileSync(cachePath);
		const imgData = pngToImageData(buf);
		if (imgData) {
			renderBadge(ctx, ach, imgData);
			return;
		}
	}

	// 2) 从 CDN 下载
	ctx.ui.notify(`🖼️ 加载成就勋章「${ach.icon} ${ach.name}」...`, "info");
	try {
		const resp = await fetch(`${BADGE_CDN_URL}/${ach.id}.png`, {
			signal: AbortSignal.timeout(10_000),
		});
		if (!resp.ok) throw new Error(`CDN ${resp.status}`);
		const buf = Buffer.from(await resp.arrayBuffer());

		// 缓存到本地
		try {
			const { writeFileSync: ws } = await import("node:fs");
			ws(cachePath, buf);
		} catch { /* ignore cache write failure */ }

		const imgData = pngToImageData(buf);
		if (imgData) {
			renderBadge(ctx, ach, imgData);
		} else {
			ctx.ui.notify(`✅ 成就「${ach.icon} ${ach.name}」(${rarityLabel})`, "info");
		}
	} catch {
		// CDN 不可用时纯文字展示
		ctx.ui.notify(`🏆 ${ach.icon} ${ach.name} (${rarityLabel}) — ${ach.description}`, "info");
	}
}

/** 在终端中渲染成就勋章图片 */
function renderBadge(ctx: any, ach: any, imgData: { base64: string; widthPx: number; heightPx: number }): void {
	const rarityLabel = getRarityLabel(ach.rarity);
	const rarityEmoji = getRarityEmoji(ach.rarity);
	const statusLines = [
		`  ═══ 🏆 成就勋章 ═══`,
		``,
		`  ${rarityEmoji} ${ach.icon} ${ach.name}  (${rarityLabel})`,
		`  「${ach.description}」`,
		``,
	];

	const caps = getCapabilities();
	if (caps?.images) {
		try {
			const rendered = renderImageWithStatus(imgData, statusLines, 80);
			ctx.ui.notify(rendered.join("\n"), "info");
		} catch {
			ctx.ui.notify(statusLines.join("\n"), "info");
		}
	} else {
		ctx.ui.notify(statusLines.join("\n"), "info");
	}
}
