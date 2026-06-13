#!/usr/bin/env npx tsx
/**
 * 🎮 金庸江湖 - 模拟对战脚本
 *
 * 用法:
 *   npx tsx tests/battle-sim.ts                    # 默认: Lv.10 vs 邪派弟子
 *   npx tsx tests/battle-sim.ts --level 30         # 指定等级
 *   npx tsx tests/battle-sim.ts --boss 14          # 指定Boss编号
 *   npx tsx tests/battle-sim.ts --auto             # 自动战斗
 *   npx tsx tests/battle-sim.ts --manual           # 手动战斗(默认)
 *   npx tsx tests/battle-sim.ts --tournament       # 锦标赛: 从Lv.1打到通关
 *   npx tsx tests/battle-sim.ts --element          # 元素克制分析
 *   npx tsx tests/battle-sim.ts --stress 100       # 压力测试: 100场自动战斗
 */

import {
	createInitialState, addXp, getLevelTitle, updateCombatStats,
	getWuli, fightBoss, initBattleState, executeBattleTurn, finalizeBattle,
	BOSS_DEFS, ELEMENT_SYMBOL, getWeaponDef, WEAPON_DEFS,
	getBossForLevel, getSkill, SKILL_POOL, getElementMultiplier,
	rollDice,
} from "../extensions/wuxue.js";
import type { WuxueState, BattleState, DiceEvent, BattleLog } from "../extensions/wuxue-types.js";

// ═══════════════════════════════════════════════════════════════════════════
// 颜色工具
// ═══════════════════════════════════════════════════════════════════════════
const C = {
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
	magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
	cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
	dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
	bg: (s: string) => `\x1b[44m\x1b[37m ${s} \x1b[0m`,
};

// ═══════════════════════════════════════════════════════════════════════════
// 参数解析
// ═══════════════════════════════════════════════════════════════════════════
const args = process.argv.slice(2);
const getArg = (name: string) => {
	const idx = args.indexOf(`--${name}`);
	return idx >= 0 ? args[idx + 1] : undefined;
};
const hasFlag = (name: string) => args.includes(`--${name}`);

const level = parseInt(getArg("level") || "10");
const bossIdx = parseInt(getArg("boss") || "-1");
const mode = hasFlag("auto") ? "auto" : hasFlag("tournament") ? "tournament" : hasFlag("stress") ? "stress" : hasFlag("element") ? "element" : "manual";
const stressCount = parseInt(getArg("stress") || "100");

// ═══════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════
function hpBar(current: number, max: number, width = 20): string {
	const pct = Math.max(0, Math.min(1, current / max));
	const filled = Math.round(pct * width);
	const bar = "█".repeat(filled) + "░".repeat(width - filled);
	const color = pct > 0.5 ? C.green : pct > 0.2 ? C.yellow : C.red;
	return color(bar);
}

function stateLine(label: string, emoji: string, hp: number, maxHp: number, element?: string): string {
	const elStr = element ? ` ${ELEMENT_SYMBOL[element as keyof typeof ELEMENT_SYMBOL]}${element}` : "";
	return `  ${emoji} ${C.bold(label.padEnd(12))} ${hpBar(hp, maxHp)} ${Math.round(hp)}/${maxHp}${elStr}`;
}

function diceEmoji(event: string): string {
	switch (event) {
		case "暴击": return "🔥";
		case "闪避": return "💨";
		case "元素共鸣": return "⚡";
		case "破防": return "💥";
		case "回春": return "💚";
		case "虚弱": return "😵";
		default: return "🎲";
	}
}

function printLog(log: BattleLog, bossName: string) {
	const bonus = log.elementBonus
		? log.elementBonus === "克制" ? C.green(`[${log.elementBonus}]`)
		: log.elementBonus === "被克" ? C.red(`[${log.elementBonus}]`)
		: log.elementBonus === "防御" ? C.blue(`[防御]`)
		: ""
		: "";

	if (log.attacker === "player") {
		if (log.selfDamage && log.selfDamage < 0) {
			console.log(`    ${C.green(`💊 回复 ${-log.selfDamage} 血量`)}`);
		} else {
			const cost = log.selfDamage ? C.yellow(` 耗${log.selfDamage}血`) : "";
			const prefix = log.isSkillHit ? C.magenta("  🗡️ 武功") : C.dim(`  R${log.turn}:`);
			console.log(`    ${prefix} ${C.green(`${log.damage}伤`)}${cost} ${bonus}`);
		}
	} else {
		console.log(`    ${C.dim(`  R${log.turn}:`)} ${C.red(`${log.attacker} ${log.damage}伤`)} ${bonus}`);
	}
}

function setupPlayer(targetLevel: number): { state: WuxueState; weaponAtk: number; weaponElement: string; skillElement: string; skillLevel: number; skillName: string } {
	const state = createInitialState();
	// 升级到目标等级
	while (state.level < targetLevel) {
		addXp(state, state.xpToNext);
	}
	// 找一个合适的武器
	// 武器攻击力匹配等级（模拟真实游戏进度）
	const weaponAtk = Math.min(200, Math.floor(targetLevel * 1.2) + 5);
	state.gold = 9999;
	// 找一个武功
	const skill = SKILL_POOL.find(s => s.element === "火") || SKILL_POOL[0];
	return {
		state,
		weaponAtk: weaponAtk,
		weaponElement: "土",
		skillElement: skill.element,
		skillLevel: Math.min(20, Math.max(1, Math.floor(targetLevel / 3))),
		skillName: skill.name,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// 模式: 手动战斗
// ═══════════════════════════════════════════════════════════════════════════
function runManualBattle() {
	const boss = bossIdx >= 0 ? BOSS_DEFS[bossIdx] : getBossForLevel(level);
	const p = setupPlayer(level);

	console.log("");
	console.log(C.bg("⚔️ 金庸江湖 · 模拟对战"));
	console.log("");
	console.log(C.bold("  ═══ 战斗配置 ═══"));
	console.log(`  👤 玩家: Lv.${p.state.level} ${getLevelTitle(p.state.level)}`);
	console.log(`     武器: ${getWeaponDef("mu-jian")?.name || "木剑"} 攻+${p.weaponAtk} ${ELEMENT_SYMBOL[p.weaponElement as keyof typeof ELEMENT_SYMBOL]}${p.weaponElement}`);
	console.log(`     武功: ${p.skillName} Lv.${p.skillLevel} ${ELEMENT_SYMBOL[p.skillElement as keyof typeof ELEMENT_SYMBOL]}${p.skillElement}`);
	console.log(stateLine("血量", "👤", p.state.hp, p.state.maxHp));
	console.log("");
	console.log(`  👹 Boss: ${boss.name}（${boss.title}）`);
	console.log(`     ${boss.description}`);
	console.log(stateLine(boss.name, "👹", boss.baseHp, boss.baseHp, boss.element));
	console.log("");

	// 检查克制关系
	const pm = getElementMultiplier(p.weaponElement as any, boss.element);
	const sm = getElementMultiplier(p.skillElement as any, boss.element);
	const bm = getElementMultiplier(boss.element, p.weaponElement as any);
	console.log(C.bold("  ═══ 元素分析 ═══"));
	console.log(`  武器 ${ELEMENT_SYMBOL[p.weaponElement as keyof typeof ELEMENT_SYMBOL]}${p.weaponElement} → ${ELEMENT_SYMBOL[boss.element as keyof typeof ELEMENT_SYMBOL]}${boss.element}: ${pm > 1 ? C.green("克制 ✓") : pm < 1 ? C.red("被克 ✗") : "无加成"}`);
	console.log(`  武功 ${ELEMENT_SYMBOL[p.skillElement as keyof typeof ELEMENT_SYMBOL]}${p.skillElement} → ${ELEMENT_SYMBOL[boss.element as keyof typeof ELEMENT_SYMBOL]}${boss.element}: ${sm > 1 ? C.green("克制 ✓") : sm < 1 ? C.red("被克 ✗") : "无加成"}`);
	console.log(`  Boss  ${ELEMENT_SYMBOL[boss.element as keyof typeof ELEMENT_SYMBOL]}${boss.element} → ${ELEMENT_SYMBOL[p.weaponElement as keyof typeof ELEMENT_SYMBOL]}${p.weaponElement}: ${bm > 1 ? C.red("克制你！") : bm < 1 ? C.green("被你克") : "无加成"}`);
	console.log("");

	// 开始战斗
	const bs = initBattleState(p.state, p.weaponAtk, p.weaponElement as any, boss, p.skillLevel, p.skillElement as any);
	console.log(C.bg("⚔️ 战斗开始！"));
	console.log("");

	let turn = 0;
	const actions = ["attack", "skill", "defend", "item", "attack", "skill", "attack", "defend", "skill", "attack"];
	let totalDiceEvents: Record<string, number> = {};

	while (bs.playerHp > 0 && bs.bossHp > 0 && turn < 20) {
		turn++;
		// 模拟不同策略：按顺序选择行动
		const actionIdx = (turn - 1) % actions.length;
		const action = actions[actionIdx] as any;

		const actionLabel = action === "attack" ? "⚔️ 普通攻击"
			: action === "skill" ? `🗡️ ${p.skillName}`
			: action === "defend" ? "🛡️ 防御"
			: "💊 使用道具";

		console.log(C.bold(`  ── 第 ${turn} 回合 ──`) + `  ${C.cyan(actionLabel)}`);

		// 血量状态
		console.log(stateLine("玩家", "👤", bs.playerHp, bs.playerMaxHp));
		console.log(stateLine(boss.name, "👹", bs.bossHp, bs.bossMaxHp, boss.element));

		const result = executeBattleTurn(bs, action, getElementMultiplier);

		// 显示骰子
		if (result.dice && result.dice.event !== "普通") {
			const de = diceEmoji(result.dice.event);
			const color = result.dice.target === "player" ? C.green : result.dice.target === "boss" ? C.red : C.dim;
			console.log(`    ${de} ${color(result.dice.desc)}`);
			totalDiceEvents[result.dice.event] = (totalDiceEvents[result.dice.event] || 0) + 1;
		}

		// 显示回合日志
		for (const log of result.logs) {
			printLog(log, boss.name);
		}
		console.log("");

		if (result.over) {
			if (result.won) {
				console.log(C.bg("🎉 胜利！"));
				console.log(C.green(`  ✅ 击败 ${boss.name}！`));
			} else {
				console.log(C.bg("💀 战败..."));
				console.log(C.red(`  ❌ 不敌 ${boss.name}...`));
			}
			break;
		}
	}

	// 结算
	const finalResult = finalizeBattle(p.state, bs, boss, bs.bossHp <= 0, false);
	console.log("");
	console.log(C.bold("  ═══ 战斗结算 ═══"));
	console.log(`  ${finalResult.won ? C.green("胜利") : C.red("战败")}`);
	console.log(`  回合数: ${bs.turn}`);
	console.log(`  剩余血量: ${Math.round(Math.max(0, bs.playerHp))}/${bs.playerMaxHp}`);
	if (finalResult.won) {
		console.log(`  ${C.yellow(`💰 +${finalResult.goldReward}金`)}  ${C.cyan(`📖 +${finalResult.xpReward}经验`)}  ${C.magenta(`🔥 +${finalResult.skillXpReward}武功经验`)}`);
	}
	console.log("");
	console.log(C.bold("  ═══ 骰子统计 ═══"));
	for (const [evt, count] of Object.entries(totalDiceEvents)) {
		console.log(`  ${diceEmoji(evt)} ${evt}: ${count}次`);
	}
	console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// 模式: 自动战斗
// ═══════════════════════════════════════════════════════════════════════════
function runAutoBattle() {
	const boss = bossIdx >= 0 ? BOSS_DEFS[bossIdx] : getBossForLevel(level);
	const p = setupPlayer(level);

	console.log("");
	console.log(C.bg("⚔️ 自动战斗"));
	console.log(`  👤 Lv.${p.state.level} vs 👹 ${boss.name}（${boss.title}）`);
	console.log("");

	const result = fightBoss(p.state, p.weaponAtk, p.weaponElement as any, boss, p.skillLevel, p.skillElement as any);

	for (const log of result.logs) {
		printLog(log, boss.name);
	}

	console.log("");
	if (result.won) {
		console.log(C.green(`  ✅ 胜利！ +${result.goldReward}金 +${result.xpReward}经验`));
	} else {
		console.log(C.red(`  ❌ 战败... +${result.xpReward}经验`));
	}
	console.log(`  剩余血量: ${result.playerHp}  Boss剩余: ${result.bossHpLeft}`);
	console.log(`  回合数: ${result.logs.length}`);
	console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// 模式: 锦标赛
// ═══════════════════════════════════════════════════════════════════════════
function runTournament() {
	console.log("");
	console.log(C.bg("🏆 金庸江湖 · 锦标赛"));
	console.log(C.bold("  从 Lv.1 一路打到最终Boss！"));
	console.log("");

	let wins = 0;
	let losses = 0;
	let currentLevel = 1;

	for (let i = 0; i < BOSS_DEFS.length; i++) {
		const boss = BOSS_DEFS[i];
		const p = setupPlayer(currentLevel);
		p.state.hp = p.state.maxHp; // 满血开始

		const result = fightBoss(p.state, p.weaponAtk, p.weaponElement as any, boss, Math.max(1, Math.floor(currentLevel / 3)), p.skillElement as any);

		const resultIcon = result.won ? C.green("✅") : C.red("❌");
		const hpPct = Math.round(result.playerHp / p.state.maxHp * 100);
		const hpColor = hpPct > 50 ? C.green : hpPct > 20 ? C.yellow : C.red;

		console.log(`  ${resultIcon} R${String(i + 1).padStart(2)} Lv.${String(currentLevel).padStart(2)} vs ${boss.name.padEnd(10)}（${boss.title}）${hpColor(`${hpPct}%`)}HP  ${result.logs.length}回合`);

		if (result.won) {
			wins++;
			currentLevel = Math.min(100, currentLevel + 2);
		} else {
			losses++;
			currentLevel = Math.min(100, currentLevel + 1);
		}
	}

	console.log("");
	console.log(C.bold("  ═══ 锦标赛结果 ═══"));
	console.log(`  ${C.green(`胜利: ${wins}`)}  ${C.red(`战败: ${losses}`)}  胜率: ${Math.round(wins / (wins + losses) * 100)}%`);
	console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// 模式: 元素克制分析
// ═══════════════════════════════════════════════════════════════════════════
function runElementAnalysis() {
	console.log("");
	console.log(C.bg("⚡ 元素克制分析"));
	console.log("");

	const elements = ["金", "木", "水", "火", "土"] as const;
	const emojis: Record<string, string> = { "金": "🤍", "木": "💚", "水": "💙", "火": "❤️", "土": "🟤" };

	// 克制表
	console.log(C.bold("  五行克制矩阵:"));
	console.log(`       ${elements.map(e => `${emojis[e]}${e}`).join("  ")}`);
	for (const a of elements) {
		const row = elements.map(b => {
			const m = getElementMultiplier(a, b);
			if (m > 1) return C.green(" 克 ");
			if (m < 1) return C.red(" 被克 ");
			return " ─ ";
		});
		console.log(`  ${emojis[a]}${a}  ${row.join("")}`);
	}
	console.log("");

	// 骰子概率模拟
	console.log(C.bold("  🎲 骰子事件概率 (1000次模拟):"));
	const events: Record<string, number> = {};
	for (let i = 0; i < 1000; i++) {
		const d = rollDice("金" as any, "木" as any);
		events[d.event] = (events[d.event] || 0) + 1;
	}
	const sorted = Object.entries(events).sort((a, b) => b[1] - a[1]);
	for (const [evt, count] of sorted) {
		const pct = Math.round(count / 10);
		const bar = "█".repeat(Math.ceil(pct / 2));
		console.log(`    ${diceEmoji(evt)} ${evt.padEnd(4)} ${bar} ${pct}%`);
	}
	console.log("");

	// 武器元素分布
	console.log(C.bold("  武器元素分布:"));
	for (const el of elements) {
		const weapons = WEAPON_DEFS.filter(w => w.element === el);
		console.log(`    ${emojis[el]}${el}: ${weapons.length}把武器`);
	}
	console.log("");

	// Boss元素分布
	console.log(C.bold("  Boss元素分布:"));
	for (const el of elements) {
		const bosses = BOSS_DEFS.filter(b => b.element === el);
		console.log(`    ${emojis[el]}${el}: ${bosses.length}个Boss`);
	}
	console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// 模式: 压力测试
// ═══════════════════════════════════════════════════════════════════════════
function runStressTest() {
	console.log("");
	console.log(C.bg(`🔥 压力测试 · ${stressCount}场自动战斗`));
	console.log("");

	let wins = 0;
	let totalTurns = 0;
	let diceEvents: Record<string, number> = {};
	let bossWins: Record<string, number> = {};

	for (let i = 0; i < stressCount; i++) {
		const testLevel = Math.floor(Math.random() * 50) + 1;
		const boss = BOSS_DEFS[Math.floor(Math.random() * BOSS_DEFS.length)];
		const p = setupPlayer(testLevel);
		p.state.hp = p.state.maxHp;

		// 手动战斗模拟
		const bs = initBattleState(p.state, p.weaponAtk, p.weaponElement as any, boss, Math.max(1, Math.floor(testLevel / 3)), p.skillElement as any);
		let over = false;
		let won = false;
		const actions: any[] = ["attack", "skill", "defend"];
		let turnCount = 0;

		while (!over && turnCount < 20) {
			const action = actions[turnCount % actions.length];
			const result = executeBattleTurn(bs, action, getElementMultiplier);

			if (result.dice) {
				diceEvents[result.dice.event] = (diceEvents[result.dice.event] || 0) + 1;
			}

			if (result.over) {
				over = true;
				won = !!result.won;
			}
			turnCount++;
		}

		if (won) {
			wins++;
		} else {
			bossWins[boss.name] = (bossWins[boss.name] || 0) + 1;
		}
		totalTurns += turnCount;
	}

	const winRate = Math.round(wins / stressCount * 100);
	console.log(C.bold("  ═══ 压力测试结果 ═══"));
	console.log(`  总场次: ${stressCount}`);
	console.log(`  ${C.green(`胜利: ${wins}`)}  ${C.red(`战败: ${stressCount - wins}`)}  胜率: ${winRate}%`);
	console.log(`  平均回合数: ${(totalTurns / stressCount).toFixed(1)}`);
	console.log("");

	console.log(C.bold("  🎲 骰子事件分布:"));
	const totalDice = Object.values(diceEvents).reduce((a, b) => a + b, 0);
	for (const [evt, count] of Object.entries(diceEvents).sort((a, b) => b[1] - a[1])) {
		const pct = Math.round(count / totalDice * 100);
		console.log(`    ${diceEmoji(evt)} ${evt.padEnd(4)} ${count}次 (${pct}%)`);
	}
	console.log("");

	// 最多击杀玩家的Boss
	const topBosses = Object.entries(bossWins).sort((a, b) => b[1] - a[1]).slice(0, 5);
	if (topBosses.length > 0) {
		console.log(C.bold("  💀 击杀玩家最多的Boss:"));
		for (const [name, count] of topBosses) {
			console.log(`    ${C.red(name.padEnd(12))} ${count}杀`);
		}
		console.log("");
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Boss 列表
// ═══════════════════════════════════════════════════════════════════════════
function listBosses() {
	console.log("");
	console.log(C.bg("👹 Boss 列表"));
	console.log("");
	for (let i = 0; i < BOSS_DEFS.length; i++) {
		const b = BOSS_DEFS[i];
		const el = ELEMENT_SYMBOL[b.element as keyof typeof ELEMENT_SYMBOL];
		console.log(`  ${C.dim(`#${String(i).padStart(2)}`)} ${el}${b.element} ${C.bold(b.name.padEnd(14))} ${b.title.padEnd(10)} HP:${String(b.baseHp).padStart(4)} 攻:${String(b.baseAttack).padStart(3)} 防:${String(b.baseDefense).padStart(3)}`);
	}
	console.log("");
	console.log(`  共 ${BOSS_DEFS.length} 个Boss`);
	console.log("");
}

// ═══════════════════════════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════════════════════════
if (hasFlag("list") || hasFlag("bosses")) {
	listBosses();
} else if (mode === "tournament") {
	runTournament();
} else if (mode === "stress") {
	runStressTest();
} else if (mode === "element") {
	runElementAnalysis();
} else if (mode === "auto") {
	runAutoBattle();
} else {
	runManualBattle();
}
