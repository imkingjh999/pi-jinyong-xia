/**
 * 任务模板数据 — 安全 & 低风险
 */

import type { RiskLevel } from "./state.js";
import type { MBTIDimension } from "./missions-mbti.js";

// ═══════════════════════════════════════════════════════════════════════════
// 任务模板类型
// ═══════════════════════════════════════════════════════════════════════════

export interface MissionTemplate {
	id: string;
	name: string;
	description: string;
	category: "escort" | "retrieval" | "assassination" | "rescue" | "delivery" | "investigation" | "training";
	risk: RiskLevel;
	goldBase: [number, number];
	xpBase: [number, number];
	hpCost: [number, number];
	planSteps: number;
	successRate: number;
	minLevel: number;
	successDesc: string;
	failDesc: string;
	/** MBTI 维度标签 — 选择此任务贡献对应维度分数 */
	mbtiTags: MBTIDimension[];
}

// ── 可用计划选项（每次计划步骤随机抽 4 个展示） ──
export const PLAN_OPTIONS: { id: string; label: string; dimension: MBTIDimension }[] = [
	{ id: "recruit",     label: "🤝 招募帮手",   dimension: "E" },
	{ id: "solo",        label: "🗡️ 独自行动",   dimension: "I" },
	{ id: "scout",       label: "🗺️ 侦查细节",   dimension: "S" },
	{ id: "foresee",     label: "🔮 预判局势",   dimension: "N" },
	{ id: "calculate",   label: "📊 计算收益",   dimension: "T" },
	{ id: "protect",     label: "🛡️ 确保安全",   dimension: "F" },
	{ id: "plan",        label: "📋 严密计划",   dimension: "J" },
	{ id: "improvise",   label: "🎲 随机应变",   dimension: "P" },
];

/** 为一次计划步骤随机选 4 个不重复的选项 */
export function getRandomPlanOptions(count = 4): { id: string; label: string; dimension: MBTIDimension }[] {
	const shuffled = [...PLAN_OPTIONS].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// 安全 & 低风险模板
// ═══════════════════════════════════════════════════════════════════════════

export const SAFE_LOW_TEMPLATES: MissionTemplate[] = [
	// ── 安全 (safe) ──
	{
		id: "local-delivery", name: "同城送信", description: "替本地商户送一封急信",
		category: "delivery", risk: "safe", goldBase: [5, 15], xpBase: [5, 15],
		hpCost: [0, 2], planSteps: 0, successRate: 0.98, minLevel: 1,
		successDesc: "信件安然送达，商户感激不已", failDesc: "途中被顽童嬉闹撞翻，信件沾了泥水",
		mbtiTags: ["S", "J"],
	},
	{
		id: "herb-gathering", name: "采药委托", description: "替药铺采集山中常见草药",
		category: "training", risk: "safe", goldBase: [8, 20], xpBase: [10, 20],
		hpCost: [0, 3], planSteps: 0, successRate: 0.95, minLevel: 1,
		successDesc: "采得满筐草药，药铺掌柜颇为满意", failDesc: "在山间迷了路，空手而归",
		mbtiTags: ["S", "P"],
	},
	{
		id: "tavern-help", name: "酒楼帮工", description: "在醉仙楼帮忙招呼客人一日",
		category: "training", risk: "safe", goldBase: [10, 25], xpBase: [5, 12],
		hpCost: [0, 0], planSteps: 0, successRate: 0.99, minLevel: 1,
		successDesc: "忙碌一日，掌柜赏了银两", failDesc: "打翻了客人的酒壶，被扣了工钱",
		mbtiTags: ["E", "F"],
	},
	{
		id: "escort-villager", name: "送村民归乡", description: "护送迷路的老农回到附近村庄",
		category: "escort", risk: "safe", goldBase: [5, 20], xpBase: [10, 22],
		hpCost: [0, 2], planSteps: 0, successRate: 0.99, minLevel: 2,
		successDesc: "老农平安到家，送了几个鸡蛋作为谢礼", failDesc: "老农半路摔了一跤，自己摸回去了",
		mbtiTags: ["S","P"],
	},
	{
		id: "fetch-kite", name: "取回风筝", description: "帮邻家小妹从树上取回断线风筝",
		category: "retrieval", risk: "safe", goldBase: [8, 20], xpBase: [5, 23],
		hpCost: [1, 4], planSteps: 0, successRate: 0.92, minLevel: 1,
		successDesc: "轻功一跃取回风筝，小妹笑靥如花", failDesc: "脚下一滑摔了个屁股蹲，风筝也没拿到",
		mbtiTags: ["E","F"],
	},
	{
		id: "exterminate-rats", name: "除鼠患", description: "帮粮仓驱除成群的老鼠",
		category: "assassination", risk: "safe", goldBase: [6, 19], xpBase: [5, 23],
		hpCost: [1, 6], planSteps: 0, successRate: 0.97, minLevel: 1,
		successDesc: "老鼠四散而逃，粮仓清净了", failDesc: "被老鼠咬了一口，狼狈不堪",
		mbtiTags: ["I","S"],
	},
	{
		id: "rescue-cat", name: "救猫上树", description: "帮王大娘把她家的猫从树上救下来",
		category: "rescue", risk: "safe", goldBase: [8, 19], xpBase: [11, 26],
		hpCost: [0, 3], planSteps: 0, successRate: 0.92, minLevel: 1,
		successDesc: "猫儿乖巧入怀，王大娘千恩万谢", failDesc: "猫儿挠了一爪子，跑了",
		mbtiTags: ["E","S","J"],
	},
	{
		id: "find-lost-pig", name: "寻猪启事", description: "帮张屠户找回走失的黑猪",
		category: "investigation", risk: "safe", goldBase: [5, 25], xpBase: [11, 29],
		hpCost: [1, 6], planSteps: 0, successRate: 0.96, minLevel: 2,
		successDesc: "循着蹄印在溪边找到了黑猪", failDesc: "找了一天也没找到，张屠户叹了口气",
		mbtiTags: ["I","N","T"],
	},
	{
		id: "deliver-medicine", name: "送药到农家", description: "将配好的草药送到山脚农家",
		category: "delivery", risk: "safe", goldBase: [7, 19], xpBase: [7, 24],
		hpCost: [0, 2], planSteps: 0, successRate: 0.95, minLevel: 1,
		successDesc: "药到病除，农家人感激不尽", failDesc: "路上药包被雨淋湿，白跑一趟",
		mbtiTags: ["T","J"],
	},
	{
		id: "guard-grain", name: "守谷仓一夜", description: "帮村长看管谷仓一晚",
		category: "escort", risk: "safe", goldBase: [8, 21], xpBase: [6, 16],
		hpCost: [1, 5], planSteps: 0, successRate: 0.91, minLevel: 3,
		successDesc: "一夜平安无事，村长给了些铜钱", failDesc: "打了个盹，被麻雀偷了不少谷子",
		mbtiTags: ["S","J"],
	},
	{
		id: "collect-herbs-easy", name: "采集薄荷", description: "在河边采集新鲜薄荷送给茶馆",
		category: "retrieval", risk: "safe", goldBase: [8, 25], xpBase: [6, 21],
		hpCost: [1, 3], planSteps: 0, successRate: 0.96, minLevel: 2,
		successDesc: "薄荷清香扑鼻，茶馆老板很满意", failDesc: "采到了野草而不是薄荷，闹了笑话",
		mbtiTags: ["E","T"],
	},
	{
		id: "patrol-village", name: "村庄巡逻", description: "在村中巡逻一圈，驱赶野狗",
		category: "investigation", risk: "safe", goldBase: [8, 26], xpBase: [6, 24],
		hpCost: [1, 3], planSteps: 0, successRate: 0.9, minLevel: 1,
		successDesc: "村中安宁，村民安心入睡", failDesc: "被野狗追着跑了一圈",
		mbtiTags: ["N","P"],
	},
	{
		id: "help-well", name: "修井打水", description: "帮村里的老井清理淤泥",
		category: "rescue", risk: "safe", goldBase: [9, 23], xpBase: [6, 21],
		hpCost: [1, 3], planSteps: 0, successRate: 0.99, minLevel: 2,
		successDesc: "井水恢复清澈，村民交口称赞", failDesc: "不小心把桶掉进了井里",
		mbtiTags: ["I","F","P"],
	},
	{
		id: "sweep-temple", name: "清扫寺庙", description: "帮山间小庙打扫庭院落叶",
		category: "training", risk: "safe", goldBase: [10, 22], xpBase: [9, 29],
		hpCost: [0, 3], planSteps: 0, successRate: 0.98, minLevel: 2,
		successDesc: "庭院焕然一新，方丈赐了一碗素面", failDesc: "扫着扫着去追蝴蝶了",
		mbtiTags: ["E","N"],
	},
	{
		id: "deliver-lunch", name: "送午饭到田间", description: "帮李大嫂给田间劳力的丈夫送饭",
		category: "delivery", risk: "safe", goldBase: [11, 24], xpBase: [10, 29],
		hpCost: [1, 5], planSteps: 0, successRate: 0.97, minLevel: 2,
		successDesc: "饭菜送到，李大哥吃饱了好干活", failDesc: "半路把汤洒了，只剩干粮",
		mbtiTags: ["I","T"],
	},
	// ── 低风险 (low) ──
	{
		id: "escort-merchant", name: "护送商人", description: "护送商人从临安到苏州",
		category: "escort", risk: "low", goldBase: [20, 50], xpBase: [15, 30],
		hpCost: [2, 8], planSteps: 1, successRate: 0.88, minLevel: 3,
		successDesc: "一路平安抵达，商人重谢", failDesc: "途中遇到小贼骚扰，商人受了惊",
		mbtiTags: ["E", "S", "J"],
	},
	{
		id: "retrieve-relic", name: "寻回遗物", description: "替老妇人找回被盗的家传玉佩",
		category: "retrieval", risk: "low", goldBase: [15, 40], xpBase: [10, 25],
		hpCost: [2, 6], planSteps: 1, successRate: 0.85, minLevel: 3,
		successDesc: "在小偷藏身处找到玉佩，物归原主", failDesc: "线索断了，无功而返",
		mbtiTags: ["N", "F"],
	},
	{
		id: "night-patrol", name: "夜间巡逻", description: "替城中捕快巡逻一夜",
		category: "investigation", risk: "low", goldBase: [15, 35], xpBase: [12, 28],
		hpCost: [3, 8], planSteps: 0, successRate: 0.90, minLevel: 2,
		successDesc: "抓到两个毛贼，捕快头目给了赏银", failDesc: "平安一夜，但也没抓到什么人",
		mbtiTags: ["S", "J", "T"],
	},
	{
		id: "eliminate-bandit-scout", name: "除掉山贼斥候", description: "在官道旁伏击为祸的山贼斥候",
		category: "assassination", risk: "low", goldBase: [18, 45], xpBase: [12, 30],
		hpCost: [3, 10], planSteps: 0, successRate: 0.84, minLevel: 4,
		successDesc: "斥候被擒，山贼动向尽在掌握", failDesc: "斥候警觉溜走了，还报了信",
		mbtiTags: ["S","F"],
	},
	{
		id: "rescue-lost-child", name: "寻回走失孩童", description: "在山林中寻找走失的孩童",
		category: "rescue", risk: "low", goldBase: [15, 49], xpBase: [13, 31],
		hpCost: [4, 8], planSteps: 0, successRate: 0.82, minLevel: 4,
		successDesc: "孩童在山洞中找到，安然无恙", failDesc: "孩童自己走回来了，你白忙一场",
		mbtiTags: ["J","T"],
	},
	{
		id: "deliver-silk", name: "运送丝绸", description: "将一匹上等丝绸从苏州运往杭州",
		category: "delivery", risk: "low", goldBase: [18, 45], xpBase: [15, 40],
		hpCost: [2, 8], planSteps: 1, successRate: 0.84, minLevel: 2,
		successDesc: "丝绸完好送达，东家给了赏银", failDesc: "路上沾了泥，丝绸贬值了三成",
		mbtiTags: ["E","J"],
	},
	{
		id: "basic-sword-drill", name: "剑法入门演练", description: "跟随师父练习华山剑法基础招式",
		category: "training", risk: "low", goldBase: [20, 42], xpBase: [16, 33],
		hpCost: [2, 8], planSteps: 0, successRate: 0.81, minLevel: 4,
		successDesc: "剑法精进，师父点头称赞", failDesc: "劈叉劈过头，拉伤了腿",
		mbtiTags: ["N","F"],
	},
	{
		id: "escort-pilgrim", name: "护送香客", description: "护送一群香客前往灵隐寺进香",
		category: "escort", risk: "low", goldBase: [19, 51], xpBase: [11, 26],
		hpCost: [4, 8], planSteps: 1, successRate: 0.84, minLevel: 6,
		successDesc: "香客平安到寺，上香祈福", failDesc: "路上遇到化缘和尚，香客被缠住不放",
		mbtiTags: ["I","N"],
	},
	{
		id: "retrieve-lost-sword", name: "寻回失落佩剑", description: "帮一位侠客在湖边找回失落的佩剑",
		category: "retrieval", risk: "low", goldBase: [16, 43], xpBase: [11, 27],
		hpCost: [2, 10], planSteps: 1, successRate: 0.85, minLevel: 5,
		successDesc: "在芦苇丛中找到佩剑，侠客重谢", failDesc: "湖中摸了半天只摸到一条鱼",
		mbtiTags: ["S","T","P"],
	},
	{
		id: "deliver-tea", name: "运送龙井茶叶", description: "将新采的龙井茶叶送往京城茶庄",
		category: "delivery", risk: "low", goldBase: [21, 48], xpBase: [12, 29],
		hpCost: [3, 9], planSteps: 0, successRate: 0.82, minLevel: 2,
		successDesc: "茶叶保鲜送达，茶庄掌柜大喜", failDesc: "路上受了潮，茶香减半",
		mbtiTags: ["E","F","P"],
	},
	{
		id: "rescue-trapped-dog", name: "救被困猎犬", description: "从猎人的陷阱中救出一只无辜猎犬",
		category: "rescue", risk: "low", goldBase: [24, 52], xpBase: [10, 26],
		hpCost: [3, 7], planSteps: 1, successRate: 0.89, minLevel: 7,
		successDesc: "猎犬脱困，摇尾跟随了一路", failDesc: "猎犬受了惊，反咬了一口",
		mbtiTags: ["I","J"],
	},
	{
		id: "investigate-smuggler", name: "调查走私小贩", description: "暗中调查集市上贩卖假药的小贩",
		category: "investigation", risk: "low", goldBase: [25, 49], xpBase: [14, 28],
		hpCost: [4, 12], planSteps: 1, successRate: 0.82, minLevel: 5,
		successDesc: "小贩被揭穿，百姓拍手称快", failDesc: "小贩察觉后连夜跑了",
		mbtiTags: ["N","T","J"],
	},
	{
		id: "train-archery", name: "练习射箭", description: "在靶场练习弓箭射击，提升准头",
		category: "training", risk: "low", goldBase: [23, 61], xpBase: [10, 31],
		hpCost: [4, 12], planSteps: 0, successRate: 0.82, minLevel: 2,
		successDesc: "箭箭中靶，教官刮目相看", failDesc: "脱靶三次，被同门笑话",
		mbtiTags: ["S","F","J"],
	},
	{
		id: "escort-elder-home", name: "送老人回家", description: "护送迷路的老者从城中回到乡下",
		category: "escort", risk: "low", goldBase: [22, 45], xpBase: [14, 28],
		hpCost: [4, 9], planSteps: 0, successRate: 0.82, minLevel: 6,
		successDesc: "老者安全到家，硬塞了几个铜板", failDesc: "老者嫌走得太快，自己雇车回去了",
		mbtiTags: ["E","N","P"],
	},
	{
		id: "retrieve-stolen-chicken", name: "追回被盗鸡只", description: "帮村妇追回被偷走的母鸡",
		category: "retrieval", risk: "low", goldBase: [20, 60], xpBase: [14, 32],
		hpCost: [3, 11], planSteps: 0, successRate: 0.84, minLevel: 2,
		successDesc: "母鸡物归原主，村妇破涕为笑", failDesc: "追了三条街也没追上小偷",
		mbtiTags: ["I","S","T"],
	},
	{
		id: "poison-rats-cellar", name: "酒窖除虫", description: "帮酒楼清理地窖中的毒虫",
		category: "assassination", risk: "low", goldBase: [24, 47], xpBase: [14, 34],
		hpCost: [3, 8], planSteps: 0, successRate: 0.88, minLevel: 4,
		successDesc: "毒虫清除干净，美酒保住了", failDesc: "被蜈蚣蜇了一下，肿了三天",
		mbtiTags: ["T","P"],
	},
	{
		id: "deliver-letter-town", name: "送家书", description: "将一封家书从临安送到邻近的镇上",
		category: "delivery", risk: "low", goldBase: [23, 53], xpBase: [10, 30],
		hpCost: [4, 8], planSteps: 1, successRate: 0.81, minLevel: 2,
		successDesc: "家书及时送达，收信人热泪盈眶", failDesc: "信被雨水打湿，字迹模糊了",
		mbtiTags: ["F","J"],
	},
	{
		id: "rescue-drowning-lamb", name: "救落水羔羊", description: "从溪流中救起一只落水的小羊",
		category: "rescue", risk: "low", goldBase: [20, 55], xpBase: [17, 36],
		hpCost: [2, 9], planSteps: 0, successRate: 0.84, minLevel: 4,
		successDesc: "小羊被救起，牧童感恩戴德", failDesc: "小羊自己游上了岸，你白泡了冷水",
		mbtiTags: ["E","S","T"],
	},
	{
		id: "investigate-noise", name: "查探夜半异响", description: "调查镇外夜半传来的诡异声响",
		category: "investigation", risk: "low", goldBase: [19, 56], xpBase: [16, 40],
		hpCost: [3, 7], planSteps: 1, successRate: 0.81, minLevel: 5,
		successDesc: "原来是野猫打架，虚惊一场", failDesc: "查了一夜什么也没发现，白熬了通宵",
		mbtiTags: ["N","J"],
	},
	{
		id: "train-horse-ride", name: "驯马练习", description: "在牧场学习骑马的基本技巧",
		category: "training", risk: "low", goldBase: [15, 44], xpBase: [15, 39],
		hpCost: [3, 11], planSteps: 1, successRate: 0.83, minLevel: 4,
		successDesc: "骑术小有进步，马儿也配合", failDesc: "被马甩了下来，摔得不轻",
		mbtiTags: ["I","F"],
	},
	{
		id: "escort-supply-cart", name: "护送补给车", description: "护送一辆运粮车前往前方驿站",
		category: "escort", risk: "low", goldBase: [26, 46], xpBase: [10, 28],
		hpCost: [3, 9], planSteps: 1, successRate: 0.86, minLevel: 5,
		successDesc: "粮车安全抵达驿站", failDesc: "车轮陷入泥坑，耽误了半日",
		mbtiTags: ["S","T","J"],
	},
	{
		id: "retrieve-jade-pendant", name: "寻回玉佩", description: "帮闺阁小姐找回落入池中的玉佩",
		category: "retrieval", risk: "low", goldBase: [23, 45], xpBase: [16, 39],
		hpCost: [4, 10], planSteps: 0, successRate: 0.83, minLevel: 7,
		successDesc: "玉佩捞回完好无损，小姐红脸道谢", failDesc: "水太深没摸到，小姐急得直哭",
		mbtiTags: ["E","T","J"],
	},
	{
		id: "deliver-herb-batch", name: "运送草药", description: "将一批药材从药圃运往城中百草堂",
		category: "delivery", risk: "low", goldBase: [27, 55], xpBase: [12, 37],
		hpCost: [4, 9], planSteps: 0, successRate: 0.79, minLevel: 7,
		successDesc: "药材新鲜送达，百草堂掌柜称赞", failDesc: "路上被马车撞翻，药材散落一地",
		mbtiTags: ["N","P"],
	},
	{
		id: "investigate-fake-wine", name: "调查假酒案", description: "暗访酒肆中掺水卖酒的勾当",
		category: "investigation", risk: "low", goldBase: [23, 62], xpBase: [15, 38],
		hpCost: [2, 8], planSteps: 0, successRate: 0.82, minLevel: 3,
		successDesc: "掌柜低头认罪，赔偿了酒客", failDesc: "被掌柜发现，撵了出来",
		mbtiTags: ["I","N","F"],
	},
	{
		id: "train-light-skill", name: "轻功入门", description: "在梅花桩上练习轻功基础步法",
		category: "training", risk: "low", goldBase: [20, 55], xpBase: [15, 30],
		hpCost: [3, 10], planSteps: 1, successRate: 0.84, minLevel: 6,
		successDesc: "步法稳健，师傅露出赞许之色", failDesc: "从梅花桩上摔了下来，磕破了膝盖",
		mbtiTags: ["E","S","P"],
	},
];
