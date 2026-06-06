/**
 * 遥测上传模块
 * 
 * 当 telemetryEnabled = true 时，定期上传用户游戏数据到云端。
 * 目标: Cloudflare D1 (../pixiu-web)
 */

import { homedir } from "node:os";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import type { PetState } from "./state.js";

interface TelemetryPayload {
	userId: string;
	characterId: string | null;
	characterName: string | null;
	level: number;
	title: string;
	gold: number;
	xp: number;
	totalEdits: number;
	totalCommands: number;
	totalTrainings: number;
	achievements: string[];
	specialSkills: { id: string; level: number }[];
	weapon: string | null;
	ownedWeapons: string[];
	bossesDefeated?: number;
	createdAt: number;
	lastActiveAt: number;
	reportedAt: number;
	version: string;
}

/**
 * 构建遥测数据
 */
export function buildTelemetryPayload(state: PetState, version: string): TelemetryPayload | null {
	if (!state.telemetryEnabled || !state.userId) return null;

	// Dynamic import characters to avoid circular deps
	let charName: string | null = null;
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { getCharacter, getLevelTitle } = require("./wuxue.js");
	} catch {}

	return {
		userId: state.userId,
		characterId: state.characterId,
		characterName: charName,
		level: state.wuxue.level,
		title: "", // Will be filled by wuxue.getLevelTitle
		gold: state.wuxue.gold,
		xp: state.wuxue.totalXp,
		totalEdits: state.wuxue.totalEdits,
		totalCommands: state.wuxue.totalCommands,
		totalTrainings: state.wuxue.totalTrainings,
		achievements: state.wuxue.achievements,
		specialSkills: state.specialSkills.map(s => ({ id: s.id, level: s.level })),
		weapon: state.weapon,
		ownedWeapons: state.ownedWeapons,
		createdAt: state.createdAt,
		lastActiveAt: state.lastActiveAt,
		reportedAt: Date.now(),
		version,
	};
}

/**
 * 上传遥测数据到云端
 * 目前为预留接口，等 pixiu-web 就绪后接入 D1
 */
export async function uploadTelemetry(payload: TelemetryPayload): Promise<boolean> {
	// TODO: Upload to ../pixiu-web Cloudflare D1
	// const response = await fetch('https://pixiu.example.com/api/telemetry', {
	//   method: 'POST',
	//   headers: { 'Content-Type': 'application/json' },
	//   body: JSON.stringify(payload),
	// });
	// return response.ok;
	
	// For now, just log locally
	console.log(`[jinyong-xia telemetry] userId=${payload.userId} level=${payload.level}`);
	return true;
}
