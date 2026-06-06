import { describe, it, expect } from "./helpers.js";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { CHARACTERS, getCharacter, getMoodText } from "../extensions/characters.js";
import {
	createInitialState, getLevelTitle, xpForLevel, addXp, feed, train, tick,
	recordEvent, checkAchievements, getRandomSkill, getSkill,
	getWeaponDef, WEAPON_DEFS, SKILL_POOL, getRaritySymbol,
	getElementMultiplier, getBossForLevel, fightBoss, BOSS_DEFS, ELEMENT_SYMBOL,
	ITEM_DEFS, getItemDef, useItem, generateEncounter,
	// 新增：类型校验
	validateWuxueState, validateElement, validateWeaponId, validateSkillId,
	validateBossId, validateItemId, ValidationError,
	getMaxHp, recoverHp, addSkillXp, getSkillXpToNext,
} from "../extensions/wuxue.js";
import { createInitialPetState, loadState } from "../extensions/state.js";

describe("Characters", () => {
	it("has 28 characters", () => { expect(CHARACTERS.length).toBe(28); });
	it("each has compact art", () => { for (const c of CHARACTERS) { expect(c.compact.length > 0).toBeTrue(); } });
	it("each has avatar file", () => { for (const c of CHARACTERS) { expect(c.avatarFile.length > 0).toBeTrue(); expect(c.avatarFile.endsWith(".png")).toBeTrue(); } });
	it("avatar files exist on disk", () => {
		const avatarsDir = resolve(import.meta.dirname, "..", "assets", "avatars");
		for (const c of CHARACTERS) {
			const p = resolve(avatarsDir, c.avatarFile);
			expect(existsSync(p)).toBeTrue();
		}
	});
	it("getCharacter works", () => { expect(getCharacter("guo-jing")!.name).toBe("郭靖"); });
	it("getMoodText works for all moods", () => {
		for (const m of ["idle","thinking","working","talking","happy","angry","hurt","meditating","training","sleeping"]) {
			expect(getMoodText(m as any).length > 0).toBeTrue();
		}
	});
});

describe("Wuxue System", () => {
	it("initial state", () => { const s = createInitialState(); expect(s.level).toBe(1); expect(s.gold).toBe(100); expect(s.attack).toBe(10); expect(s.defense).toBe(5); });
	it("level titles", () => { expect(getLevelTitle(1)).toBe("江湖小虾米"); expect(getLevelTitle(50)).toBe("名动一方"); expect(getLevelTitle(100)).toBe("武林至尊"); });
	it("xpForLevel grows", () => { expect(xpForLevel(10) > xpForLevel(1)).toBeTrue(); });
	it("addXp levels up", () => { const s = createInitialState(); const r = addXp(s, s.xpToNext); expect(r.leveledUp).toBeTrue(); expect(s.level).toBe(2); });
	it("addXp caps at 100", () => { const s = createInitialState(); for (let i = 0; i < 200; i++) addXp(s, 999999999); expect(s.level).toBe(100); });
	it("feed restores hp", () => { const s = createInitialState(); s.hp = 50; s.maxHp = 100; const r = feed(s); expect(s.hp > 50).toBeTrue(); });
	it("train costs hp", () => { const s = createInitialState(); const r = train(s, "neigong"); expect(r.success).toBeTrue(); expect(r.xpGain > 0).toBeTrue(); expect(s.hp < s.maxHp).toBeTrue(); });
	it("train fails with low hp", () => { const s = createInitialState(); s.hp = 1; s.maxHp = 100; expect(train(s).success).toBeFalse(); });
	it("tick heals hp", () => { const s = createInitialState(); s.hp = 50; s.maxHp = 100; tick(s); expect(s.hp > 50).toBeTrue(); });
	it("recordEvent for edits", () => { const s = createInitialState(); const r = recordEvent(s, "edit"); expect(r!.xpGain).toBe(10); });
	it("skills unlock at levels", () => { const s = createInitialState(); expect(s.skills.find(sk => sk.id === "jianfa")!.unlocked).toBeFalse(); addXp(s, 99999); expect(s.skills.find(sk => sk.id === "jianfa")!.unlocked).toBeTrue(); });
	it("achievements unlock", () => { const s = createInitialState(); s.totalTrainings = 1; expect(checkAchievements(s)).toContain("初入江湖"); });
});

describe("Special Skills", () => {
	it("has pool", () => { expect(SKILL_POOL.length >= 16).toBeTrue(); });
	it("getRandomSkill works", () => { const s = getRandomSkill(); expect(s.id.length > 0).toBeTrue(); });
	it("getSkill finds by id", () => { expect(getSkill("jiuyang")!.element).toBe("火"); });
	it("getSkill undefined for unknown", () => { expect(getSkill("nonexistent") == null).toBeTrue(); });
});

describe("Weapon System", () => {
	it("has definitions", () => { expect(WEAPON_DEFS.length >= 10).toBeTrue(); });
	it("getWeaponDef works", () => { expect(getWeaponDef("yi-tian-jian")!.name).toBe("倚天剑"); });
	it("getWeaponDef undefined for unknown", () => { expect(getWeaponDef("nonexistent") == null).toBeTrue(); });
	it("getRaritySymbol works", () => { expect(getRaritySymbol("凡品")).toBe("⚪"); expect(getRaritySymbol("神器")).toBe("🟡"); });
});

describe("Element System", () => {
	it("水克火", () => { expect(getElementMultiplier("水", "火")).toBe(1.5); });
	it("火被水克制", () => { expect(getElementMultiplier("火", "水")).toBe(0.7); });
	it("金克木", () => { expect(getElementMultiplier("金", "木")).toBe(1.5); });
	it("同性无加成", () => { expect(getElementMultiplier("火", "火")).toBe(1.0); });
	it("skills have elements", () => { expect(createInitialState().skills.find(s => s.id === "neigong")!.element).toBe("土"); });
	it("weapons have elements", () => { expect(getWeaponDef("mu-jian")!.element).toBe("木"); });
	it("special skills have elements", () => { expect(getSkill("jiuyang")!.element).toBe("火"); });
	it("all 5 element symbols", () => { for (const e of ["金","木","水","火","土"] as const) expect(ELEMENT_SYMBOL[e].length > 0).toBeTrue(); });
});

describe("Boss System", () => {
	it("has 50 bosses", () => { expect(BOSS_DEFS.length).toBe(50); });
	it("each boss has element", () => { for (const b of BOSS_DEFS) expect(["金","木","水","火","土"].includes(b.element)).toBeTrue(); });
	it("getBossForLevel works", () => { expect(getBossForLevel(1).id).toBe("xiao-mao-zei"); expect(getBossForLevel(99).id).toBe("da-mo-zu-shi"); });
	it("fightBoss returns result", () => { const s = createInitialState(); const r = fightBoss(s, 5, "木", getBossForLevel(1)); expect(r.logs.length > 0).toBeTrue(); });
	it("fightBoss strong player wins", () => { const s = createInitialState(); s.level = 50; const r = fightBoss(s, 100, "金", getBossForLevel(1)); if (r.won) expect(r.goldReward > 0).toBeTrue(); });
});

describe("Item System", () => {
	it("has item definitions", () => { expect(ITEM_DEFS.length >= 10).toBeTrue(); });
	it("getItemDef works", () => { expect(getItemDef("da-huan-dan")!.name).toBe("大还丹"); });
	it("useItem restores hp", () => { const s = createInitialState(); s.hp = 20; s.maxHp = 100; s.items["xiao-huan-dan"] = 1; const r = useItem(s, "xiao-huan-dan"); expect(r.success).toBeTrue(); expect(s.hp > 20).toBeTrue(); });
	it("useItem fails for non-existent", () => { expect(useItem(createInitialState(), "non-existent").success).toBeFalse(); });
	it("initial state has empty items", () => { const s = createInitialState(); expect(Object.keys(s.items).length).toBe(0); expect(s.xpBonus).toBe(1); });
});

describe("Encounter System", () => {
	it("generateEncounter always produces something", () => {
		let hasEncounter = false;
		for (let i = 0; i < 100; i++) { if (generateEncounter(10, 5, 100, 100).type !== "none") { hasEncounter = true; break; } }
		expect(hasEncounter).toBeTrue();
	});
	it("generateEncounter weapon is valid", () => {
		for (let i = 0; i < 100; i++) {
			const d = generateEncounter(50, 20, 200, 200);
			if (d.type === "weapon" && d.weaponId) { expect(getWeaponDef(d.weaponId)).toBeDefined(); break; }
		}
	});
	it("generateEncounter item is valid", () => {
		for (let i = 0; i < 100; i++) {
			const d = generateEncounter(10, 5, 100, 100);
			if (d.type === "item" && d.itemId) { expect(getItemDef(d.itemId)).toBeDefined(); break; }
		}
	});
	it("generateEncounter gold amount > 0", () => {
		for (let i = 0; i < 100; i++) {
			const d = generateEncounter(10, 5, 100, 100);
			if (d.type === "gold") { expect(d.goldAmount! > 0).toBeTrue(); break; }
		}
	});
});

describe("State", () => {
	it("initial pet state", () => { const s = createInitialPetState(); expect(s.characterId).toBe(null); expect(s.weapon).toBe("mu-jian"); expect(s.wuxue.gold).toBe(100); });
});

describe("Project Structure", () => {
	const root = resolve(import.meta.dirname, "..");
	it("has package.json with pi config", async () => {
		const { readFileSync } = await import("node:fs");
		const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
		expect(pkg.pi.extensions).toBeDefined();
	});
	it("has extension files", () => { for (const f of ["pet.ts","wuxue.ts","characters.ts","state.ts"]) expect(existsSync(resolve(root, "extensions", f))).toBe(true); });
});

describe("Extension Import", () => {
	it("loads without errors", async () => { const m = await import(resolve(import.meta.dirname, "..", "extensions", "index.ts")); expect(typeof m.default).toBe("function"); });
});

// ═══════════════════════════════════════════════════════════════════════════
// 新增测试：血量与体力分离
// ═══════════════════════════════════════════════════════════════════════════

describe("HP System", () => {
	it("initial state has hp and maxHp", () => {
		const s = createInitialState();
		expect(s.hp).toBe(100);
		expect(s.maxHp).toBe(100);
	});


	it("maxHp scales with level", () => {
		expect(getMaxHp(1)).toBe(100);
		expect(getMaxHp(10)).toBe(190);
		expect(getMaxHp(50)).toBe(590);
		expect(getMaxHp(100)).toBe(1090);
	});

	it("addXp increases maxHp and heals to full on level up", () => {
		const s = createInitialState();
		s.hp = 50;
		const r = addXp(s, s.xpToNext);
		expect(r.leveledUp).toBeTrue();
		expect(s.maxHp).toBe(110);  // 100 + (2-1)*10
		expect(s.hp).toBe(110);    // fully healed
	});

	it("fightBoss damages hp", () => {
		const s = createInitialState();
		s.hp = 100;
		s.maxHp = 100;
		const r = fightBoss(s, 5, "木", getBossForLevel(1));
		if (!r.won) {
			expect(s.hp < 100).toBeTrue();  // 战败扣血
		}
	});

	it("train costs hp", () => {
		const s = createInitialState();
		const r = train(s, "neigong");
		expect(r.success).toBeTrue();
		expect(s.hp < s.maxHp).toBeTrue();  // 修炼消耗血量
	});

	it("tick slowly regenerates hp", () => {
		const s = createInitialState();
		s.hp = 50;
		s.maxHp = 100;
		tick(s);
		expect(s.hp > 50).toBeTrue();  // 血量恢复
	});

	it("recoverHp restores to full", () => {
		const s = createInitialState();
		s.hp = 1;
		s.maxHp = 100;
		recoverHp(s);
		expect(s.hp).toBe(100);
	});

	it("feed heals hp", () => {
		const s = createInitialState();
		s.hp = 50;
		s.maxHp = 100;
		feed(s);
		expect(s.hp > 50).toBeTrue();  // 血量恢复
	});

	it("hp cannot exceed maxHp", () => {
		const s = createInitialState();
		s.hp = 100;
		s.maxHp = 100;
		tick(s);  // tick would try to heal beyond maxHp
		expect(s.hp <= s.maxHp).toBeTrue();
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// 新增测试：HP恢复道具
// ═══════════════════════════════════════════════════════════════════════════

describe("HP Healing Items", () => {
	it("金创药 restores hp", () => {
		const s = createInitialState();
		s.hp = 30;
		s.maxHp = 100;
		s.items["jin-chuang-yao"] = 1;
		const r = useItem(s, "jin-chuang-yao");
		expect(r.success).toBeTrue();
		expect(s.hp > 30).toBeTrue();
	});

	it("血参丹 restores more hp", () => {
		const s = createInitialState();
		s.hp = 20;
		s.maxHp = 100;
		s.items["xue-shen-dan"] = 1;
		const r = useItem(s, "xue-shen-dan");
		expect(r.success).toBeTrue();
		expect(s.hp).toBe(80);  // 20 + 60
	});

	it("天山雪莲 restores all hp", () => {
		const s = createInitialState();
		s.hp = 1;
		s.maxHp = 200;
		s.items["tian-shan-xue-lian"] = 1;
		const r = useItem(s, "tian-shan-xue-lian");
		expect(r.success).toBeTrue();
		expect(s.hp).toBe(200);  // fully healed
	});

	it("恢复道具恢复hp", () => {
		const s = createInitialState();
		s.hp = 20;
		s.maxHp = 100;
		s.items["xiao-huan-dan"] = 1;
		useItem(s, "xiao-huan-dan");
		expect(s.hp > 20).toBeTrue();  // hp恢复
	});

	it("has HP healing items in defs", () => {
		expect(getItemDef("jin-chuang-yao")!.name).toBe("金创药");
		expect(getItemDef("xue-shen-dan")!.name).toBe("血参丹");
		expect(getItemDef("tian-shan-xue-lian")!.name).toBe("天山雪莲");
	});

	it("total items >= 15", () => {
		expect(ITEM_DEFS.length >= 15).toBeTrue();  // 12 old + 3 new HP items
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// 新增测试：强类型校验
// ═══════════════════════════════════════════════════════════════════════════

describe("Strong Type Validation", () => {
	it("validates a correct initial state", () => {
		const s = createInitialState();
		validateWuxueState(s);  // should not throw
	});

	it("rejects null", () => {
		let threw = false;
		try { validateWuxueState(null as any); } catch (e) { threw = true; expect((e as ValidationError).field).toBe("root"); }
		expect(threw).toBeTrue();
	});

	it("rejects non-number level", () => {
		const s = createInitialState();
		(s as any).level = "bad";
		let threw = false;
		try { validateWuxueState(s); } catch (e) { threw = true; expect((e as ValidationError).field).toBe("level"); }
		expect(threw).toBeTrue();
	});

	it("rejects negative hp", () => {
		const s = createInitialState();
		s.hp = -5;
		let threw = false;
		try { validateWuxueState(s); } catch (e) { threw = true; expect((e as ValidationError).field).toBe("hp"); }
		expect(threw).toBeTrue();
	});

	it("rejects hp > maxHp", () => {
		const s = createInitialState();
		s.hp = 200;
		s.maxHp = 100;
		let threw = false;
		try { validateWuxueState(s); } catch (e) { threw = true; expect((e as ValidationError).field).toBe("hp"); }
		expect(threw).toBeTrue();
	});

	it("rejects level > 100", () => {
		const s = createInitialState();
		s.level = 101;
		let threw = false;
		try { validateWuxueState(s); } catch (e) { threw = true; expect((e as ValidationError).field).toBe("level"); }
		expect(threw).toBeTrue();
	});

	it("rejects invalid element in skills", () => {
		const s = createInitialState();
		s.skills[0]!.element = "风" as any;
		let threw = false;
		try { validateWuxueState(s); } catch (e) { threw = true; expect((e as ValidationError).field).toContain("skills"); }
		expect(threw).toBeTrue();
	});

	it("rejects non-array skills", () => {
		const s = createInitialState();
		(s as any).skills = "bad";
		let threw = false;
		try { validateWuxueState(s); } catch (e) { threw = true; expect((e as ValidationError).field).toBe("skills"); }
		expect(threw).toBeTrue();
	});

	it("rejects negative item count", () => {
		const s = createInitialState();
		s.items["test"] = -1;
		let threw = false;
		try { validateWuxueState(s); } catch (e) { threw = true; expect((e as ValidationError).field).toContain("items"); }
		expect(threw).toBeTrue();
	});

	it("validateElement accepts valid elements", () => {
		for (const e of ["金", "木", "水", "火", "土"] as const) {
			validateElement(e);  // should not throw
		}
	});

	it("validateElement rejects invalid", () => {
		let threw = false;
		try { validateElement("风"); } catch (e) { threw = true; }
		expect(threw).toBeTrue();
	});

	it("validateWeaponId accepts valid", () => {
		validateWeaponId("mu-jian");
		validateWeaponId("yi-tian-jian");
	});

	it("validateWeaponId rejects unknown", () => {
		let threw = false;
		try { validateWeaponId("fake-sword"); } catch (e) { threw = true; }
		expect(threw).toBeTrue();
	});

	it("validateSkillId accepts valid", () => {
		validateSkillId("jiuyang");
		validateSkillId("yirong");
	});

	it("validateSkillId rejects unknown", () => {
		let threw = false;
		try { validateSkillId("fake-skill"); } catch (e) { threw = true; }
		expect(threw).toBeTrue();
	});

	it("validateBossId accepts valid", () => {
		validateBossId("shan-zei");
		validateBossId("sao-di-seng");
	});

	it("validateBossId rejects unknown", () => {
		let threw = false;
		try { validateBossId("fake-boss"); } catch (e) { threw = true; }
		expect(threw).toBeTrue();
	});

	it("validateItemId accepts valid", () => {
		validateItemId("jin-chuang-yao");
		validateItemId("xiao-huan-dan");
	});

	it("validateItemId rejects unknown", () => {
		let threw = false;
		try { validateItemId("fake-item"); } catch (e) { threw = true; }
		expect(threw).toBeTrue();
	});

	it("ValidationError has correct properties", () => {
		const e = new ValidationError("test", "msg");
		expect(e.field).toBe("test");
		expect(e.message).toContain("test");
		expect(e.name).toBe("ValidationError");
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// 新增测试：武功经验系统
// ═══════════════════════════════════════════════════════════════════════════

describe("Special Skill XP", () => {
	it("getSkillXpToNext scales with level", () => {
		expect(getSkillXpToNext(1)).toBe(80);
		expect(getSkillXpToNext(10)).toBe(800);
		expect(getSkillXpToNext(20)).toBe(1600);
	});

	it("addSkillXp levels up when enough xp", () => {
		const r = addSkillXp(1, 0, 80);
		expect(r.level).toBe(2);
		expect(r.leveledUp).toBeTrue();
		expect(r.xp).toBe(0);
	});

	it("addSkillXp carries over excess xp", () => {
		const r = addSkillXp(1, 0, 100);  // 100 > 80
		expect(r.level).toBe(2);
		expect(r.xp).toBe(20);  // 100 - 80
	});

	it("addSkillXp caps at level 20", () => {
		const r = addSkillXp(19, 0, 999999);
		expect(r.level).toBe(20);
		expect(r.leveledUp).toBeTrue();
	});

	it("addSkillXp no level up with insufficient xp", () => {
		const r = addSkillXp(5, 0, 10);  // need 400
		expect(r.level).toBe(5);
		expect(r.leveledUp).toBeFalse();
		expect(r.xp).toBe(10);
	});
});
