/**
 * 武功系统 - Boss 定义与战斗
 */
import type { Element, BossDef, BattleLog, BattleResult, WuxueState } from "./wuxue-types.js";
import { getElementMultiplier } from "./wuxue-types.js";

// ═══════════════════════════════════════════════════════════════════════════
// Boss 数据
// ═══════════════════════════════════════════════════════════════════════════

export const BOSS_DEFS: BossDef[] = [
	{ id: "xiao-mao-zei", name: "小毛贼", title: "街头混混", element: "土", baseHp: 20, baseAttack: 4, baseDefense: 1, description: "偷鸡摸狗的小混混" },
	{ id: "e-ba", name: "恶霸", title: "地头蛇", element: "火", baseHp: 30, baseAttack: 6, baseDefense: 2, description: "横行乡里的恶霸" },
	{ id: "mu-ren-qing", name:"木人桩", title:"少林练功木人", element:"木", baseHp:35,baseAttack:5,baseDefense:8,description:"少林寺练功用的木人桩" },
	{ id: "shan-zei-tou-ling", name: "山贼头领", title: "占山为王", element: "金", baseHp: 40, baseAttack: 7, baseDefense: 3, description: "统领百人的山贼头领" },
	{ id: "shan-zei", name: "山贼头子", title: "拦路劫匪", element: "金", baseHp: 50, baseAttack: 8, baseDefense: 3, description: "占山为王的毛贼" },
	{ id: "xie-pai-di-zi", name: "邪派弟子", title: "旁门左道", element: "木", baseHp: 55, baseAttack: 9, baseDefense: 4, description: "邪派入门弟子" },
	{ id: "ou-yang-ke", name: "欧阳克", title: "白驼山少主", element: "木", baseHp: 65, baseAttack: 10, baseDefense: 4, description: "西毒之侄，风流成性，武功不弱" },
	{ id: "du-shi", name: "毒师", title: "用毒高手", element: "木", baseHp: 70, baseAttack: 11, baseDefense: 5, description: "擅长使毒的江湖人" },
	{ id: "du-xiao-wei", name: "毒小王爷", title: "西域来客", element: "木", baseHp: 80, baseAttack: 12, baseDefense: 5, description: "西毒门下，阴毒无比" },
	{ id: "ding-chun-qiu", name: "丁春秋弟子", title: "星宿派弟子", element: "木", baseHp:85,baseAttack:12,baseDefense:5,description:"星宿老怪门下走狗" },
	{ id: "li-mo-chou", name: "李莫愁弟子", title: "赤练门人", element: "水", baseHp: 90, baseAttack: 13, baseDefense: 5, description: "赤练仙子门下弟子" },
	{ id: "hei-dao-gao-shou", name: "黑道高手", title: "绿林豪杰", element: "土", baseHp: 110, baseAttack: 16, baseDefense: 7, description: "黑道中的佼佼者" },
	{ id: "he-jiao-zhu", name: "黑教主", title: "魔教护法", element: "火", baseHp: 120, baseAttack: 18, baseDefense: 8, description: "邪派高手，功力深厚" },
	{ id: "e-mei-pai-dizi", name: "峨眉叛徒", title: "灭绝师太之敌", element: "火", baseHp: 130, baseAttack: 19, baseDefense: 9, description: "叛出峨眉的弟子" },
	{ id: "ao-bai", name: "鳌拜", title: "满洲第一勇士", element: "土", baseHp: 140, baseAttack: 20, baseDefense: 10, description: "号称满洲第一勇士，力大无穷" },
	{ id: "gai-bang-bai-tuo", name: "丐帮白陀", title: "丐帮败类", element: "水", baseHp: 150, baseAttack: 21, baseDefense: 11, description: "丐帮中的败类" },
	{ id: "tie-zhang", name: "铁掌水上漂", title: "铁掌帮主", element: "土", baseHp: 160, baseAttack: 22, baseDefense: 12, description: "铁掌功夫，刚猛无俦" },
	{ id: "tian-meng-jiao-zhu", name: "天魔教主", title: "天魔教", element: "火", baseHp: 160, baseAttack: 23, baseDefense: 10, description: "天魔教教主" },
	{ id: "wu-dang-pai-ren", name: "武当叛人", title: "武当弃徒", element: "水", baseHp: 170, baseAttack: 24, baseDefense: 12, description: "叛出武当的弟子" },
	{ id: "xue-dao-lao-zu", name: "血刀老祖", title: "血刀门掌门", element: "火", baseHp: 180, baseAttack: 25, baseDefense: 13, description: "血刀大法，邪派中一等一的高手" },
	{ id: "shao-lin-bai-tu", name: "少林叛徒", title: "少林弃僧", element: "火", baseHp: 190, baseAttack: 26, baseDefense: 14, description: "叛出少林的恶僧" },
	{ id: "ming-jiao-hufa", name: "明教法王", title: "紫衫龙王", element: "水", baseHp: 200, baseAttack: 28, baseDefense: 15, description: "明教四大法王之首" },
	{ id: "ri-yue-jiao-zhong", name: "日月教众", title: "魔教信徒", element: "火", baseHp: 210, baseAttack: 30, baseDefense: 15, description: "日月神教忠诚信徒" },
	{ id: "du-gu-jian-ke", name: "毒蛊剑客", title: "苗疆异人", element: "木", baseHp: 220, baseAttack: 31, baseDefense: 14, description: "苗疆用毒高手" },
	{ id: "zuo-leng-chan", name: "左冷禅", title: "嵩山派掌门", element: "金", baseHp: 240, baseAttack: 32, baseDefense: 16, description: "五岳剑派盟主，寒冰真气" },
	{ id: "han-bing-zhen-ren", name: "寒冰真人", title: "全真弟子", element: "水", baseHp: 250, baseAttack: 33, baseDefense: 16, description: "全真教中精通寒冰真气者" },
	{ id: "qiu-qian-ren", name: "裘千仞", title: "铁掌水上漂", element: "土", baseHp: 260, baseAttack: 34, baseDefense: 17, description: "铁掌帮帮主，铁掌功夫了得" },
	{ id: "xing-xiu", name: "星宿老怪", title: "星宿派掌门", element: "木", baseHp: 280, baseAttack: 35, baseDefense: 18, description: "化功大法，令人闻风丧胆" },
	{ id: "huo-du", name: "霍都", title: "金轮弟子", element: "金", baseHp: 300, baseAttack: 38, baseDefense: 20, description: "金轮法王大弟子" },
	{ id: "chi-huo-dao-ren", name: "赤火道人", title: "火龙观主", element: "火", baseHp: 310, baseAttack: 40, baseDefense: 22, description: "火龙观观主" },
	{ id: "cheng-kun", name: "成昆", title: "混元霹雳手", element: "火", baseHp: 320, baseAttack: 40, baseDefense: 22, description: "少林叛徒，幻阴指阴毒无比" },
	{ id: "da-er-ba", name: "达尔巴", title: "金轮弟子", element: "土", baseHp: 340, baseAttack: 42, baseDefense: 23, description: "金轮法王二弟子，力大无穷" },
	{ id: "gong-sun-zhi", name: "公孙止", title: "绝情谷主", element: "土", baseHp: 350, baseAttack: 43, baseDefense: 24, description: "绝情谷谷主，阴阳双刃" },
	{ id: "fan-yao", name: "范遥", title: "光明右使", element: "火", baseHp: 360, baseAttack: 43, baseDefense: 23, description: "明教光明右使" },
	{ id: "sang-jie", name: "桑结", title: "密宗高手", element: "金", baseHp: 370, baseAttack: 44, baseDefense: 24, description: "西藏密宗高手" },
	{ id: "ou-yang-feng", name: "西毒欧阳锋", title: "天下五绝", element: "金", baseHp: 380, baseAttack: 45, baseDefense: 25, description: "蛤蟆功天下一绝" },
	{ id: "yin-feng-gu-zhu", name: "阴风谷主", title: "阴风谷", element: "水", baseHp: 390, baseAttack: 45, baseDefense: 25, description: "阴风谷主人，阴风搜魂手" },
	{ id: "xuan-ming-er-lao", name: "玄冥二老", title: "鹿杖客鹤笔翁", element: "水", baseHp: 400, baseAttack: 46, baseDefense: 26, description: "赵敏手下，玄冥神掌" },
	{ id: "yue-bu-qun", name: "岳不群", title: "伪君子", element: "水", baseHp: 420, baseAttack: 48, baseDefense: 28, description: "辟邪剑法，表面仁义实则阴险" },
	{ id: "wei-yi-xiao", name: "韦一笑", title: "青翼蝠王", element: "水", baseHp: 430, baseAttack: 48, baseDefense: 26, description: "明教四大法王，轻功天下第一" },
	{ id: "yin-tian-zheng", name: "殷天正", title: "白眉鹰王", element: "火", baseHp: 440, baseAttack: 49, baseDefense: 27, description: "明教四大法王" },
	{ id: "xie-xun", name: "谢逊", title: "金毛狮王", element: "金", baseHp: 450, baseAttack: 50, baseDefense: 28, description: "明教四大法王，屠龙刀持有者" },
	{ id: "yang-xiao-boss", name: "杨逍", title: "光明左使", element: "金", baseHp: 460, baseAttack: 51, baseDefense: 29, description: "明教光明左使，弹指神通" },
	{ id: "yi-deng-da-shi", name: "一灯大师(切磋)", title: "南帝", element: "火", baseHp: 480, baseAttack: 52, baseDefense: 30, description: "大理段氏一阳指，以武会友" },
	{ id: "dong-fang", name: "东方不败", title: "日月神教教主", element: "火", baseHp: 500, baseAttack: 55, baseDefense: 30, description: "葵花宝典，天下第一" },
	{ id: "zhang-san-feng", name: "张三丰", title: "武当开派祖师", element: "土", baseHp: 550, baseAttack: 58, baseDefense: 32, description: "百年修为，太极拳剑天下无敌" },
	{ id: "jin-lun-fa-wang", name: "金轮法王", title: "蒙古国师", element: "金", baseHp: 600, baseAttack: 62, baseDefense: 35, description: "龙象般若功第十层，密宗第一高手" },
	{ id: "du-gu-qiu-bai", name: "独孤求败(幻影)", title: "剑魔", element: "金", baseHp: 650, baseAttack: 65, baseDefense: 38, description: "独孤前辈的剑意残留，剑道巅峰" },
	{ id: "sao-di-seng", name: "扫地僧", title: "少林隐世高人", element: "土", baseHp: 800, baseAttack: 70, baseDefense: 50, description: "深藏不露，佛法无边" },
	{ id: "da-mo-zu-shi", name: "达摩祖师(幻影)", title: "禅宗初祖", element: "土", baseHp: 900, baseAttack: 75, baseDefense: 55, description: "少林开山祖师的武学意念" },
];

export function getBossForLevel(level: number): BossDef {
	if (level <= 2) return BOSS_DEFS[0]!;  // 小毛贼
	if (level <= 4) return BOSS_DEFS[1]!;  // 恶霸
	if (level <= 6) return BOSS_DEFS[2]!;  // 
	if (level <= 8) return BOSS_DEFS[3]!;  // 山贼头领
	if (level <= 10) return BOSS_DEFS[4]!;  // 山贼头子
	if (level <= 12) return BOSS_DEFS[5]!;  // 邪派弟子
	if (level <= 14) return BOSS_DEFS[6]!;  // 欧阳克
	if (level <= 16) return BOSS_DEFS[7]!;  // 毒师
	if (level <= 18) return BOSS_DEFS[8]!;  // 毒小王爷
	if (level <= 20) return BOSS_DEFS[9]!;  // 丁春秋弟子
	if (level <= 22) return BOSS_DEFS[10]!;  // 李莫愁弟子
	if (level <= 24) return BOSS_DEFS[11]!;  // 黑道高手
	if (level <= 26) return BOSS_DEFS[12]!;  // 黑教主
	if (level <= 28) return BOSS_DEFS[13]!;  // 峨眉叛徒
	if (level <= 30) return BOSS_DEFS[14]!;  // 鳌拜
	if (level <= 32) return BOSS_DEFS[15]!;  // 丐帮白陀
	if (level <= 34) return BOSS_DEFS[16]!;  // 铁掌水上漂
	if (level <= 36) return BOSS_DEFS[17]!;  // 天魔教主
	if (level <= 38) return BOSS_DEFS[18]!;  // 武当叛人
	if (level <= 40) return BOSS_DEFS[19]!;  // 血刀老祖
	if (level <= 42) return BOSS_DEFS[20]!;  // 少林叛徒
	if (level <= 44) return BOSS_DEFS[21]!;  // 明教法王
	if (level <= 46) return BOSS_DEFS[22]!;  // 日月教众
	if (level <= 48) return BOSS_DEFS[23]!;  // 毒蛊剑客
	if (level <= 50) return BOSS_DEFS[24]!;  // 左冷禅
	if (level <= 52) return BOSS_DEFS[25]!;  // 寒冰真人
	if (level <= 54) return BOSS_DEFS[26]!;  // 裘千仞
	if (level <= 56) return BOSS_DEFS[27]!;  // 星宿老怪
	if (level <= 58) return BOSS_DEFS[28]!;  // 霍都
	if (level <= 60) return BOSS_DEFS[29]!;  // 赤火道人
	if (level <= 62) return BOSS_DEFS[30]!;  // 成昆
	if (level <= 64) return BOSS_DEFS[31]!;  // 达尔巴
	if (level <= 66) return BOSS_DEFS[32]!;  // 公孙止
	if (level <= 68) return BOSS_DEFS[33]!;  // 范遥
	if (level <= 70) return BOSS_DEFS[34]!;  // 桑结
	if (level <= 72) return BOSS_DEFS[35]!;  // 西毒欧阳锋
	if (level <= 74) return BOSS_DEFS[36]!;  // 阴风谷主
	if (level <= 76) return BOSS_DEFS[37]!;  // 玄冥二老
	if (level <= 78) return BOSS_DEFS[38]!;  // 岳不群
	if (level <= 80) return BOSS_DEFS[39]!;  // 韦一笑
	if (level <= 82) return BOSS_DEFS[40]!;  // 殷天正
	if (level <= 84) return BOSS_DEFS[41]!;  // 谢逊
	if (level <= 86) return BOSS_DEFS[42]!;  // 杨逍
	if (level <= 88) return BOSS_DEFS[43]!;  // 一灯大师(切磋)
	if (level <= 90) return BOSS_DEFS[44]!;  // 东方不败
	if (level <= 92) return BOSS_DEFS[45]!;  // 张三丰
	if (level <= 94) return BOSS_DEFS[46]!;  // 金轮法王
	if (level <= 96) return BOSS_DEFS[47]!;  // 独孤求败(幻影)
	if (level <= 98) return BOSS_DEFS[48]!;  // 扫地僧
	return BOSS_DEFS[49]!;  // 达摩祖师(幻影)
}

export function fightBoss(state: WuxueState, weaponAttack: number, weaponElement: Element, boss: BossDef, skillLevel?: number, skillElement?: Element): BattleResult {
	const logs: BattleLog[] = [];
	const scaling = 1 + Math.floor(state.level / 10) * 0.15;
	const bossHp = Math.floor(boss.baseHp * scaling);
	const bossAtk = Math.floor(boss.baseAttack * scaling);
	const bossDef = Math.floor(boss.baseDefense * scaling);

	const sl = state.skills.filter(s => s.unlocked).reduce((sum, s) => sum + s.level, 0);
	const skLvl = skillLevel ?? 1;
	const playerAtk = state.level + sl * 2 + weaponAttack + 5 + (skLvl - 1) * 4 + state.attackBuff;
	state.attackBuff = 0;
	const playerDef = 10 + state.level + Math.floor(sl * 0.5) + Math.floor((skLvl - 1) * 1.5) + state.defenseBuff;
	state.defenseBuff = 0;

	// 武功伤害倍率：武功等级越高触发越频繁，伤害 = 武功等级 * 10
	const skillDmgBase = skLvl * 10;
	const skillTriggerInterval = Math.max(2, 5 - Math.floor(skLvl / 4));  // Lv1=每5回合, Lv4=每4回合, Lv8=每3回合, Lv12=每2回合

	let playerHp = (state.hp && !isNaN(state.hp)) ? state.hp : state.maxHp || 100, bossHpCurrent = bossHp, turn = 0;
	while (playerHp > 0 && bossHpCurrent > 0 && turn < 20) {
		turn++;

		// 武功攻击（消耗自身血量）
		if (skillElement && turn % skillTriggerInterval === 0) {
			const selfCost = Math.max(1, Math.floor(skillDmgBase * 0.15));
			if (playerHp > selfCost) {
				playerHp -= selfCost;
				const skMul = getElementMultiplier(skillElement, boss.element);
				const skDmg = Math.max(1, Math.floor(skillDmgBase * skMul * (0.9 + Math.random() * 0.2)));
				bossHpCurrent -= skDmg;
				logs.push({ turn, attacker: "player", damage: skDmg, elementBonus: skMul > 1 ? "克制" : skMul < 1 ? "被克" : "", isSkillHit: true, selfDamage: selfCost });
				if (bossHpCurrent <= 0) break;
			}
		}

		// 普通攻击
		const pm = getElementMultiplier(weaponElement, boss.element);
		const pd = Math.max(1, Math.floor((playerAtk - bossDef * 0.4) * pm * (0.85 + Math.random() * 0.3)));
		bossHpCurrent -= pd;
		logs.push({ turn, attacker: "player", damage: pd, elementBonus: pm > 1 ? "克制" : pm < 1 ? "被克" : "" });
		if (bossHpCurrent <= 0) break;

		// Boss攻击
		const bm = getElementMultiplier(boss.element, weaponElement);
		const bd = Math.max(1, Math.floor((bossAtk - playerDef * 0.4) * bm * (0.85 + Math.random() * 0.3)));
		playerHp -= bd;
		logs.push({ turn, attacker: boss.name, damage: bd, elementBonus: bm > 1 ? "克制" : bm < 1 ? "被克" : "" });
	}

	// 战后扣除实际血量
	state.hp = Math.max(0, playerHp);

	const won = bossHpCurrent <= 0;
	const goldReward = won ? Math.floor(boss.baseHp * 0.3 + boss.baseAttack * 2) : 0;
	const xpReward = won ? Math.floor(boss.baseHp * 0.5) : Math.floor(boss.baseHp * 0.1);
	const skillXpReward = won ? Math.floor(15 + boss.baseAttack * 0.5) : Math.floor(5 + boss.baseAttack * 0.2);
	if (won) { state.gold += goldReward; }
	// 战败额外扣血
	if (!won) state.hp = Math.max(1, state.hp - state.maxHp * 0.1);

	return { won, playerHp: Math.max(0, Math.floor(playerHp)), bossHpLeft: Math.max(0, bossHpCurrent), bossName: boss.name, bossElement: boss.element, logs, goldReward, xpReward, skillXpReward };
}

