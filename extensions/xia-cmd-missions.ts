// @ts-nocheck
/**
 * xia-cmd-missions.ts — /xia missions/profile 子命令
 */

export async function handleMissionsCmd(
	ctx: any, sub: string, w: any, MAX: number, ES: Record<string, string>, theme: any,
	deps: any,
) {
	const { _wuxue, petState, updateWidget, scheduleSave, showLines, wrapSelect, mis } = deps;

	switch (sub) {
		case "profile": {
			// MBTI 性格分析
			const profile = mis().calculateMBTIProfile(petState.missions.filter(m => m.status === "completed" || m.status === "failed"));
			const desc = mis().MBTI_DESCRIPTIONS[profile.type];
			const pref = petState.missionPreferences;
			const s = profile.scores;

			const pLines = ["", theme.bold(`  ═══ 江湖性格分析 ═══`), ""];

			if (profile.sampleSize === 0) {
				pLines.push(theme.fg("dim", "  完成任务后将自动分析你的性格..."));
				pLines.push(theme.fg("dim", "  去接取任务吧！ /xia missions"));
			} else {
				// MBTI 类型
				pLines.push(theme.bold(`  你的性格类型: ${profile.type}`) + (desc ? theme.fg("accent", ` — ${desc.name}`) : ""));
				if (desc) pLines.push(theme.fg("muted", `  "${desc.trait}"`));
				pLines.push("");

				// 维度条形图
				const dimBars = [
					{ left: "I 内向", right: "E 外向", lv: s.I, rv: s.E },
					{ left: "N 直觉", right: "S 实感", lv: s.N, rv: s.S },
					{ left: "T 理性", right: "F 感性", lv: s.T, rv: s.F },
					{ left: "J 计划", right: "P 随性", lv: s.J, rv: s.P },
				];
				for (const dim of dimBars) {
					const total = dim.lv + dim.rv || 1;
					const lPct = Math.round(dim.lv / total * 100);
					const rPct = 100 - lPct;
					const bar = theme.fg("accent", `${dim.left} ${lPct}%`) + " | " + theme.fg("muted", `${rPct}% ${dim.right}`);
					pLines.push(`  ${bar}`);
				}

				// 置信度
				pLines.push("");
				const confPct = Math.round(profile.confidence * 100);
				const confBar = "█".repeat(Math.round(profile.confidence * 10)) + "░".repeat(10 - Math.round(profile.confidence * 10));
				pLines.push(theme.fg("dim", `  置信度: ${confBar} ${confPct}% (基于 ${profile.sampleSize} 次任务)`));

				// 匹配建议
				if (profile.sampleSize > 0) {
					pLines.push("");
					pLines.push(theme.bold("  ═══ 最佳拍档（理论） ═══"));
					const allTypes = Object.keys(mis().MBTI_DESCRIPTIONS);
					const matches = allTypes
						.map(t => ({ type: t, ...mis().calculateMBTICompatibility(profile.type, t) }))
						.sort((a, b) => b.score - a.score);
					for (const m of matches.slice(0, 3)) {
						const mDesc = mis().MBTI_DESCRIPTIONS[m.type];
						const stars = "★".repeat(Math.round(m.score)) + "☆".repeat(5 - Math.round(m.score));
						pLines.push(theme.fg("accent", `  ${stars} ${m.type} ${mDesc?.name ?? ""}`) + theme.fg("dim", ` — ${m.desc}`));
					}

					// 真实江湖侠客匹配
					if (petState.telemetryEnabled && petState.userId) {
						pLines.push("");
						pLines.push(theme.bold("  ═══ 江湖知己（真人匹配） ═══"));
						pLines.push(theme.fg("dim", "  📡 正在寻觅江湖知音..."));
						showLines(ctx, pLines);
						pLines.length = pLines.length - 1; // remove loading line

						try {
							const { fetchMatch } = await import("./telemetry.js");
							const matchData = await fetchMatch(petState.userId);
							if (matchData?.ok && matchData.matches.length > 0) {
								pLines.push(theme.fg("dim", `  你的类型: ${matchData.myType} | 为你匹配到 ${matchData.matches.length} 位侠客`));
								pLines.push("");
								for (const pm of matchData.matches.slice(0, 5)) {
									const stars = "★".repeat(Math.min(5, Math.round(pm.score))) + "☆".repeat(5 - Math.min(5, Math.round(pm.score)));
									const name = pm.character_name ?? "无名侠客";
									const reasons = (pm.reasons as string[]).join("·");
									pLines.push(`  ${stars} ${theme.fg("accent", name)} ${theme.fg("dim", `Lv.${pm.level} ${pm.mbti_type}`)}`);
									pLines.push(theme.fg("muted", `       ${reasons}`));
								}
							} else {
								pLines.push(theme.fg("dim", "  暂无足够侠客数据，江湖尚需壮大！"));
							}
						} catch {
							pLines.push(theme.fg("dim", "  ❌ 无法连接江湖匹配服务"));
						}
					}
				}
			}

			pLines.push("");
			showLines(ctx, pLines);
			return "ok";
		}
		case "missions":
		case "mission":
		case "quest": {
			// 江湖任务
			const pref = petState.missionPreferences;
			const missionMenu = ["📋 接取任务", "📜 任务历史", "📊 我的偏好"];
			const mChoice = await wrapSelect(ctx, "🗡️ 江湖任务", missionMenu);
			if (!mChoice) return "ok";

			if (mChoice.includes("任务历史") || mChoice.includes("📜")) {
				if (petState.missions.length === 0) { ctx.ui.notify("📜 尚无任务记录", "info"); return "ok"; }
				const recent = petState.missions.slice(-10).reverse();
				const hLines = ["", theme.bold("  ═══ 最近任务记录 ═══")];
				for (const m of recent) {
					const statusIcon = m.status === "completed" ? "✅" : m.status === "failed" ? "❌" : m.status === "active" ? "🔄" : "⬜";
					const resultText = m.status === "completed" ? `+${m.goldReward}金 +${m.xpReward}经验` : m.status === "failed" ? `-${m.hpCost}血` : "";
					hLines.push(`  ${statusIcon} ${m.name} ${mis().getRiskLabel(m.risk)} ${resultText}`);
				}
				hLines.push("");
				showLines(ctx, hLines);
				return "ok";
			}

			if (mChoice.includes("我的偏好") || mChoice.includes("📊")) {
				const pLines = ["", theme.bold("  ═══ 任务偏好分析 ═══"), ""];
				pLines.push(`  完成任务: ${pref.totalCompleted}  失败: ${pref.totalFailed}`);
				const rp = pref.riskProfile;
				pLines.push(`  🟢安全: ${rp.safe}  🔵低风险: ${rp.low}  🟡中风险: ${rp.medium}  🟠高风险: ${rp.high}  🔴极高风险: ${rp.extreme}`);
				const total = rp.safe + rp.low + rp.medium + rp.high + rp.extreme;
				if (total > 0) {
					const highRatio = (rp.high + rp.extreme) / total;
					const playStyle = highRatio > 0.4 ? "⚔️ 冒险型" : highRatio < 0.15 ? "🛡️ 保守型" : "⚖️ 均衡型";
					pLines.push(`  游戏风格: ${playStyle}`);
				} else {
					pLines.push(theme.fg("dim", "  完成更多任务以分析偏好"));
				}
				pLines.push("");
				showLines(ctx, pLines);
				return "ok";
			}

			// 接取任务
			const recommendations = mis().recommendMissions(w.level, pref.riskProfile, 14);
			if (recommendations.length === 0) { ctx.ui.notify("当前没有可用任务", "info"); return "ok"; }

			const missionOptions = recommendations.map(m => {
				const rewards = mis().calculateMissionRewards(m, w.level);
				const rate = Math.round(mis().calculateSuccessRate(m, w.level) * 100);
				const planTag = m.planSteps > 0 ? ` [需${m.planSteps}步计划]` : "";
				return `${mis().getRiskLabel(m.risk)} ${m.name}  💰${rewards.gold} +${rewards.xp}xp  成功率${rate}%${planTag}`;
			});

			const mIdx = await wrapSelect(ctx, "🗡️ 可接任务", missionOptions);
			if (!mIdx) return "ok";
			const selectedIdx = missionOptions.indexOf(mIdx as string);
			if (selectedIdx >= recommendations.length) return "ok";
			const selected = recommendations[selectedIdx];

			// 任务确认
			const rewards = mis().calculateMissionRewards(selected, w.level);
			const rate = Math.round(mis().calculateSuccessRate(selected, w.level) * 100);
			const planTag = selected.planSteps > 0 ? `\n  📋 需要${selected.planSteps}步计划` : "";
			const confirmMsg = `${selected.name}\n  ${selected.description}\n  ${mis().getRiskLabel(selected.risk)}  成功率: ${rate}%\n  💰 ${rewards.gold}金  +${rewards.xp}经验  ❤${rewards.hpCost > 0 ? `-${rewards.hpCost}血` : "无消耗"}${planTag}`;
			const action = await wrapSelect(ctx, confirmMsg, ["✅ 接取", "❌ 算了"]);
			if (!action || action === "❌ 算了") return "ok";

			// 执行任务
			const missionId = mis().generateMissionId();
			const missionRecord = {
				id: missionId, templateId: selected.id, name: selected.name, description: selected.description,
				risk: selected.risk, status: "active" as const,
				goldReward: rewards.gold, xpReward: rewards.xp, hpCost: rewards.hpCost,
				startedAt: Date.now(), completedAt: null,
				requiredPlanSteps: selected.planSteps, completedPlanSteps: 0, planChoices: [],
			};

			if (selected.planSteps > 0) {
				// 需要计划的任务：MBTI 反射型选项
				const planChoices: string[] = [];
				ctx.ui.notify(theme.fg("accent", `📋 任务开始: ${selected.name} — 需制定${selected.planSteps}步计划`), "info");
				for (let step = 1; step <= selected.planSteps; step++) {
					const stepOpts = mis().getRandomPlanOptions(4);
					const labels = stepOpts.map(o => o.label);
					labels.push("↩️ 放弃");
					const planChoice = await wrapSelect(ctx, `📋 计划步骤 ${step}/${selected.planSteps}`, labels);
					if (!planChoice || planChoice === "↩️ 放弃") { missionRecord.status = "abandoned"; break; }
					const chosenOpt = stepOpts.find(o => o.label === planChoice);
					if (chosenOpt) planChoices.push(chosenOpt.id);
					missionRecord.completedPlanSteps = step;
				}
				missionRecord.planChoices = planChoices;
				if (missionRecord.status === "abandoned") {
					petState.missions.push(missionRecord);
					ctx.ui.notify(theme.fg("dim", `🏃 放弃了任务: ${selected.name}`), "info");
					scheduleSave(); return "ok";
				}
			}

			// 判定结果
			const finalRate = mis().calculateSuccessRate(selected, w.level);
			const success = Math.random() < finalRate;

			if (success) {
				missionRecord.status = "completed";
				missionRecord.completedAt = Date.now();
				w.gold += rewards.gold;
				const { leveledUp } = _wuxue.addXp(w, rewards.xp);
				pref.totalCompleted++;
				pref.riskProfile[selected.risk]++;
				pref.lastMissionAt = Date.now();
				if (!pref.favoriteType || petState.missions.filter(m => m.templateId === selected.id).length > petState.missions.filter(m => m.templateId === pref.favoriteType).length) {
					pref.favoriteType = selected.id;
				}
				const lvUpText = leveledUp ? `\n🎉 升级！Lv.${w.level}！` : "";
				ctx.ui.notify(theme.fg("success", `✅ ${selected.successDesc}\n  💰+${rewards.gold}金 +${rewards.xp}经验${lvUpText}`), "info");
			} else {
				missionRecord.status = "failed";
				missionRecord.completedAt = Date.now();
				w.hp = Math.max(1, w.hp - rewards.hpCost);
				pref.totalFailed++;
				pref.riskProfile[selected.risk]++;
				pref.lastMissionAt = Date.now();
				ctx.ui.notify(theme.fg("error", `❌ ${selected.failDesc}\n  ❤-${rewards.hpCost}血`), "info");
			}

			petState.missions.push(missionRecord);
			_wuxue.checkAchievements(w);
			updateWidget(ctx);
			scheduleSave();
			return "ok";
		}
	}
	return "ok";
}
