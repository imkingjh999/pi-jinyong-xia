/**
 * wuxue-achievements.ts — 成就定义 + 成就图片生成
 * 成就分为多个类别，每个成就可生成 PNG 徽章图片
 */

export interface AchievementCategory {
	id: string;
	name: string;
	emoji: string;
	color: string;  // 主色调
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
	{ id: "training", name: "修炼", emoji: "🏋️", color: "#4A90D9" },
	{ id: "level", name: "等级", emoji: "⬆️", color: "#7B68EE" },
	{ id: "skill", name: "武功", emoji: "武术", color: "#E67E22" },
	{ id: "battle", name: "战斗", emoji: "⚔️", color: "#E74C3C" },
	{ id: "wealth", name: "财富", emoji: "💰", color: "#F1C40F" },
	{ id: "jianghu", name: "江湖", emoji: "🌏", color: "#2ECC71" },
	{ id: "mission", name: "任务", emoji: "📋", color: "#9B59B6" },
	{ id: "item", name: "道具", emoji: "🎁", color: "#1ABC9C" },
];

export interface AchievementDef {
	id: string;
	name: string;
	description: string;
	category: string;
	icon: string;       // emoji 或文字图标
	rarity: "common" | "rare" | "epic" | "legendary";
	check?: (state: any) => boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
	// ── 修炼类 ──
	{ id: "first_train", name: "初入江湖", description: "第一次修炼", category: "training", icon: "🌱", rarity: "common" },
	{ id: "train_10", name: "勤学苦练", description: "修炼10次", category: "training", icon: "📖", rarity: "common" },
	{ id: "train_50", name: "精益求精", description: "修炼50次", category: "training", icon: "📚", rarity: "rare" },
	{ id: "train_100", name: "百炼成钢", description: "修炼100次", category: "training", icon: "⚒️", rarity: "rare" },
	{ id: "train_500", name: "修仙之路", description: "修炼500次", category: "training", icon: "🧙", rarity: "epic" },
	{ id: "train_1000", name: "大道至简", description: "修炼1000次", category: "training", icon: "☯️", rarity: "legendary" },

	// ── 等级类 ──
	{ id: "level_5", name: "初出茅庐", description: "达到5级", category: "level", icon: "🌟", rarity: "common" },
	{ id: "level_10", name: "小有名气", description: "达到10级", category: "level", icon: "⭐", rarity: "common" },
	{ id: "level_30", name: "声名远播", description: "达到30级", category: "level", icon: "💫", rarity: "rare" },
	{ id: "level_50", name: "名震四方", description: "达到50级", category: "level", icon: "🏅", rarity: "rare" },
	{ id: "level_80", name: "登峰造极", description: "达到80级", category: "level", icon: "🏆", rarity: "epic" },
	{ id: "level_100", name: "武林至尊", description: "达到100级", category: "level", icon: "👑", rarity: "legendary" },

	// ── 武功类 ──
	{ id: "skill_first", name: "初窥门径", description: "习得第一门武功", category: "skill", icon: "📜", rarity: "common" },
	{ id: "skill_master_5", name: "武功小成", description: "武功达到5级", category: "skill", icon: "🎯", rarity: "common" },
	{ id: "skill_master_8", name: "武功大成", description: "武功达到8级", category: "skill", icon: "🔥", rarity: "rare" },
	{ id: "skill_master_10", name: "登堂入室", description: "武功达到10级", category: "skill", icon: "⚡", rarity: "rare" },
	{ id: "element_master", name: "五行通晓", description: "拥有3种以上不同元素武功", category: "skill", icon: "🎨", rarity: "epic" },
	{ id: "all_elements", name: "五行俱全", description: "拥有金木水火土五行武功", category: "skill", icon: "🌈", rarity: "legendary" },

	// ── 战斗类 ──
	{ id: "boss_first", name: "初战告捷", description: "第一次击败Boss", category: "battle", icon: "⚔️", rarity: "common" },
	{ id: "boss_10", name: "战无不胜", description: "击败10个Boss", category: "battle", icon: "🗡️", rarity: "common" },
	{ id: "boss_50", name: "百战百胜", description: "击败50个Boss", category: "battle", icon: "💪", rarity: "rare" },
	{ id: "boss_100", name: "杀神", description: "击败100个Boss", category: "battle", icon: "💀", rarity: "epic" },
	{ id: "boss_streak_5", name: "连战连捷", description: "连续击败5个Boss", category: "battle", icon: "🔥", rarity: "rare" },
	{ id: "boss_perfect", name: "完美无缺", description: "无伤击败Boss", category: "battle", icon: "✨", rarity: "epic" },
	{ id: "boss_one_shot", name: "一击必杀", description: "一回合击败Boss", category: "battle", icon: "⚡", rarity: "legendary" },

	// ── 财富类 ──
	{ id: "gold_100", name: "初涉商海", description: "拥有100金币", category: "wealth", icon: "🪙", rarity: "common" },
	{ id: "gold_1000", name: "小有积蓄", description: "拥有1000金币", category: "wealth", icon: "💰", rarity: "common" },
	{ id: "gold_10000", name: "富甲一方", description: "拥有10000金币", category: "wealth", icon: "💎", rarity: "rare" },
	{ id: "gold_100000", name: "富可敌国", description: "拥有100000金币", category: "wealth", icon: "🏦", rarity: "legendary" },
	{ id: "shop_first", name: "初次购物", description: "第一次在商铺购买", category: "wealth", icon: "🛒", rarity: "common" },
	{ id: "shop_50", name: "老主顾", description: "商铺购买50次", category: "wealth", icon: "🏪", rarity: "rare" },

	// ── 江湖类 ──
	{ id: "encounter_50", name: "行走江湖", description: "遭遇50次江湖事件", category: "jianghu", icon: "🌏", rarity: "common" },
	{ id: "encounter_500", name: "浪迹天涯", description: "遭遇500次江湖事件", category: "jianghu", icon: "🗺️", rarity: "rare" },
	{ id: "command_100", name: "命令达人", description: "执行100条命令", category: "jianghu", icon: "⌨️", rarity: "common" },
	{ id: "command_500", name: "命令大师", description: "执行500条命令", category: "jianghu", icon: "🏅", rarity: "rare" },
	{ id: "edit_100", name: "笔耕不辍", description: "编辑100次", category: "jianghu", icon: "📝", rarity: "common" },
	{ id: "edit_1000", name: "著作等身", description: "编辑1000次", category: "jianghu", icon: "📚", rarity: "epic" },

	// ── 任务类 ──
	{ id: "mission_first", name: "初领任务", description: "完成第一个任务", category: "mission", icon: "📋", rarity: "common" },
	{ id: "mission_10", name: "任务达人", description: "完成10个任务", category: "mission", icon: "✅", rarity: "common" },
	{ id: "mission_50", name: "使命必达", description: "完成50个任务", category: "mission", icon: "🎖️", rarity: "rare" },
	{ id: "mission_100", name: "功成名就", description: "完成100个任务", category: "mission", icon: "🏆", rarity: "epic" },
	{ id: "mission_streak_5", name: "连战连胜", description: "连续完成5个任务", category: "mission", icon: "🔥", rarity: "rare" },
	{ id: "extreme_risk", name: "虎口拔牙", description: "完成极限风险任务", category: "mission", icon: "☠️", rarity: "epic" },

	// ── 道具类 ──
	{ id: "first_weapon", name: "初获兵器", description: "获得第一把武器", category: "item", icon: "🗡️", rarity: "common" },
	{ id: "weapon_rare", name: "良兵入手", description: "获得良品武器", category: "item", icon: "⚔️", rarity: "common" },
	{ id: "weapon_epic", name: "神兵利器", description: "获得极品武器", category: "item", icon: "🔱", rarity: "rare" },
	{ id: "weapon_legendary", name: "绝世神兵", description: "获得神器", category: "item", icon: "💎", rarity: "legendary" },
	{ id: "item_50", name: "道具收藏家", description: "使用50个道具", category: "item", icon: "🎁", rarity: "rare" },
];

const ACHIEVEMENT_MAP = new Map(ACHIEVEMENT_DEFS.map(a => [a.id, a]));

export function getAchievementDef(id: string): AchievementDef | undefined {
	return ACHIEVEMENT_MAP.get(id);
}

export function getAllAchievementDefs(): AchievementDef[] {
	return ACHIEVEMENT_DEFS;
}

export function getAchievementsByCategory(category: string): AchievementDef[] {
	return ACHIEVEMENT_DEFS.filter(a => a.category === category);
}

export function getRarityLabel(rarity: AchievementDef["rarity"]): string {
	return rarity === "common" ? "普通" : rarity === "rare" ? "稀有" : rarity === "epic" ? "史诗" : "传说";
}

export function getRarityColor(rarity: AchievementDef["rarity"]): string {
	return rarity === "common" ? "#9E9E9E" : rarity === "rare" ? "#2196F3" : rarity === "epic" ? "#9C27B0" : "#FF9800";
}

export function getRarityEmoji(rarity: AchievementDef["rarity"]): string {
	return rarity === "common" ? "⬜" : rarity === "rare" ? "🟦" : rarity === "epic" ? "🟪" : "🟧";
}
