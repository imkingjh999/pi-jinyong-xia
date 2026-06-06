/**
 * 武功系统 - 数据定义（武功池、武器、道具）
 */
import type { Element, SkillDef, WeaponDef, ItemDef, WuxueState, Skill } from "./wuxue-types.js";
import { ELEMENT_SYMBOL } from "./wuxue-types.js";

// ═══════════════════════════════════════════════════════════════════════════
// 武功
// ═══════════════════════════════════════════════════════════════════════════

export const SKILL_POOL: SkillDef[] = [
	{ id: "jiuyang", name: "九阳神功", description: "至阳至刚，内力生生不息", element: "火" },
	{ id: "jiuyin", name: "九阴真经", description: "天下武学总纲，博大精深", element: "水" },
	{ id: "beiming", name: "北冥神功", description: "海纳百川，吸纳万物内力", element: "水" },
	{ id: "lingbo", name: "凌波微步", description: "按易理行走，飘然若仙", element: "水" },
	{ id: "qiankun", name: "乾坤大挪移", description: "移星换斗，扭转乾坤", element: "土" },
	{ id: "yiyang", name: "一阳指", description: "大理段氏武功，一指点乾坤", element: "火" },
	{ id: "taiji-quan", name: "太极拳", description: "以柔克刚，四两拨千斤", element: "土" },
	{ id: "taiji-jian", name: "太极剑法", description: "剑随心动，圆转如意", element: "土" },
	{ id: "tanzhi", name: "弹指神通", description: "弹指间制敌，无坚不摧", element: "金" },
	{ id: "bihai", name: "碧海潮生曲", description: "以音律攻心，防不胜防", element: "水" },
	{ id: "anran", name: "黯然销魂掌", description: "至情至性，掌力无穷", element: "木" },
	{ id: "liumai", name: "六脉神剑", description: "无形气剑，隔空伤人", element: "金" },
	{ id: "xianglong", name: "降龙十八掌", description: "天下第一阳刚掌法", element: "火" },
	{ id: "dugu", name: "独孤九剑", description: "无招胜有招，破尽天下武功", element: "金" },
	{ id: "xixing", name: "吸星大法", description: "吸取他人内力为己用", element: "木" },
	{ id: "zuoyou", name: "左右互搏", description: "一心二用，双倍战力", element: "木" },
	{ id: "yirong", name: "蛤蟆功", description: "蓄力一击，势不可挡", element: "土" },
	{ id: "shenxing", name: "金刚不坏体", description: "刀枪不入，万法不侵", element: "金" },
	{ id: "huagu", name: "化骨绵掌", description: "绵里藏针，阴柔至极", element: "土" },
	{ id: "dagou", name: "打狗棒法", description: "丐帮镇帮武功，变化多端", element: "木" },
	// 角色专属武功
	{ id: "douzhuan", name: "斗转星移", description: "以彼之道还施彼身", element: "金" },
	{ id: "wuxue-dianpin", name: "武学点评", description: "熟读天下武学，指点乾坤", element: "水" },
	{ id: "bingxue", name: "冰雪聪明", description: "聪慧灵巧，变化莫测", element: "水" },
	{ id: "jiuyin-zhuazhao", name: "九阴白骨爪", description: "九阴真经邪功，阴毒无比", element: "水" },
	{ id: "eymei-jianfa", name: "峨眉剑法", description: "峨眉派镇山剑法", element: "金" },
	{ id: "moulue", name: "谋略无双", description: "运筹帷幄，决胜千里", element: "土" },
	{ id: "qinyin", name: "琴音化剑", description: "以琴音驭剑，音波伤人", element: "水" },
	{ id: "ningbi", name: "凝碧剑法", description: "天地会总舵主绝学", element: "水" },
	{ id: "hujiadao", name: "胡家刀法", description: "胡一刀家传刀法", element: "金" },
	{ id: "lanxin", name: "兰心蕙质", description: "大家闺秀，慧质兰心", element: "木" },
	{ id: "yangjia-qiang", name: "杨家枪法", description: "杨家将世代相传枪法", element: "金" },
	{ id: "nizhao", name: "泥沼遁术", description: "泥沼中如鱼得水", element: "土" },
];

/** 最大武功持有数 */
export const MAX_SKILLS = 5;

export function getRandomSkill(): SkillDef {
	return SKILL_POOL[Math.floor(Math.random() * SKILL_POOL.length)]!;
}

/** 获取一个未拥有的随机武功 */
// 所有角色的专属武功 ID 集合
export const EXCLUSIVE_SKILL_IDS: Set<string> = new Set([
	"douzhuan", "wuxue-dianpin", "liumai", "lingbo", "xianglong", "dagou",
	"bingxue", "jiuyin", "bihai", "zuoyou", "jiuyin-zhuazhao", "anran",
	"dugu", "yirong", "eymei-jianfa", "qiankun", "jiuyang", "moulue",
	"tanzhi", "qinyin", "huagu", "ningbi", "hujiadao", "lanxin",
	"yangjia-qiang", "nizhao",
]);

/** 获取公共武功（shop 可购买的，不含角色专属） */
export function getShopSkills(ownedIds: string[]): SkillDef[] {
	return SKILL_POOL.filter(s => !EXCLUSIVE_SKILL_IDS.has(s.id) && !ownedIds.includes(s.id));
}

export function getRandomUnownedSkill(ownedIds: string[]): SkillDef | null {
	const unowned = SKILL_POOL.filter(s => !ownedIds.includes(s.id));
	if (unowned.length === 0) return null;
	return unowned[Math.floor(Math.random() * unowned.length)]!;
}

export function getSkill(id: string): SkillDef | undefined {
	return SKILL_POOL.find(s => s.id === id);
}

/** 武功升到下一级所需经验 */
export function getSkillXpToNext(level: number): number {
	return level * 80;
}

/** 给武功加经验，返回是否升级 */
export function addSkillXp(currentLevel: number, currentXp: number, amount: number): { level: number; xp: number; leveledUp: boolean } {
	let level = currentLevel;
	let xp = currentXp + amount;
	let leveledUp = false;
	while (xp >= getSkillXpToNext(level) && level < 20) {
		xp -= getSkillXpToNext(level);
		level++;
		leveledUp = true;
	}
	return { level, xp, leveledUp };
}

/** 武功商店价格表 */
export function getSkillPrice(): number {
	return 500;
}

// ═══════════════════════════════════════════════════════════════════════════
// 武器
// ═══════════════════════════════════════════════════════════════════════════

export const WEAPON_DEFS: WeaponDef[] = [
	// ── 凡品 ──
	{ id: "mu-jian", name: "木剑", type: "剑", attack: 4, rarity: "凡品", description: "木制长剑，习武练功之用", element: "木" },
	{ id: "cai-dao", name: "菜刀", type: "刀", attack: 3, rarity: "凡品", description: "厨房用刀，勉强可战", element: "金" },
	{ id: "tie-jian", name: "铁剑", type: "剑", attack: 8, rarity: "凡品", description: "精铁铸造，初入江湖", element: "金" },
	{ id: "sheng-xiu-tie-dao", name: "生锈铁刀", type: "刀", attack: 5, rarity: "凡品", description: "锈迹斑斑，但仍有杀伤力", element: "金" },
	{ id: "chun-gang-jian", name: "纯钢剑", type: "剑", attack: 10, rarity: "凡品", description: "纯钢所铸，坚硬锋利", element: "金" },
	{ id: "dan-dao", name: "单刀", type: "刀", attack: 10, rarity: "凡品", description: "五尺单面刀，厚重实用", element: "金" },
	{ id: "xi-yang-jian", name: "西洋剑", type: "剑", attack: 11, rarity: "凡品", description: "西洋传来的细长刺剑", element: "金" },
	{ id: "gang-dao", name: "钢刀", type: "刀", attack: 12, rarity: "凡品", description: "百炼钢锻造，锋利耐用", element: "金" },
	{ id: "bai-la-gan", name: "白蜡杆", type: "枪", attack: 11, rarity: "凡品", description: "一寸长一寸强", element: "木" },
	{ id: "qi-mei-gun", name: "齐眉棍", type: "棍", attack: 9, rarity: "凡品", description: "少林入门兵器", element: "木" },
	{ id: "mu-gun", name: "木棍", type: "棍", attack: 5, rarity: "凡品", description: "随手捡来的木棍", element: "木" },
	{ id: "tie-bi-shou", name: "铁匕首", type: "匕", attack: 8, rarity: "凡品", description: "寻常铁匠打造，短小精悍", element: "金" },
	{ id: "lu-ye-bian", name: "绿竹棒", type: "棒", attack: 7, rarity: "凡品", description: "翠竹削成，轻便灵巧", element: "木" },
	{ id: "fei-huang-shi", name: "飞蝗石", type: "暗", attack: 6, rarity: "凡品", description: "普通石子，暗器入门", element: "土" },
	{ id: "jin-qian-biao", name: "金钱镖", type: "暗", attack: 8, rarity: "凡品", description: "铜钱磨制而成的暗器", element: "金" },
	{ id: "fei-dao", name: "飞刀", type: "暗", attack: 10, rarity: "凡品", description: "小巧飞刀，百步之内伤人", element: "金" },
	{ id: "pu-ti-zi", name: "菩提子", type: "暗", attack: 12, rarity: "凡品", description: "菩提树籽制成，佛门暗器", element: "木" },
	{ id: "du-ji-li", name: "毒蒺藜", type: "暗", attack: 11, rarity: "凡品", description: "四角淬毒铁蒺藜", element: "土" },
	{ id: "liu-ye-dao", name: "柳叶刀", type: "刀", attack: 14, rarity: "凡品", description: "柳叶状薄钢刀，轻灵优美", element: "金" },
	{ id: "yan-ling-dao", name: "燕翎刀", type: "刀", attack: 15, rarity: "凡品", description: "状如燕翅，多为女子所用", element: "金" },
	{ id: "zhan-ma-dao", name: "斩马刀", type: "刀", attack: 16, rarity: "凡品", description: "沉重长刀，可斩战马", element: "金" },
	// ── 良品 ──
	{ id: "jiu-huan-dao", name: "九环刀", type: "刀", attack: 17, rarity: "良品", description: "九环大刀，声威赫赫", element: "金" },
	{ id: "tu-niu-dao", name: "屠牛刀", type: "刀", attack: 18, rarity: "良品", description: "屠牛所用，刀锋厚重", element: "金" },
	{ id: "po-feng-dao", name: "破风刀", type: "刀", attack: 19, rarity: "良品", description: "刀势破风，势如破竹", element: "金" },
	{ id: "ning-bi-jian", name: "凝碧剑", type: "剑", attack: 18, rarity: "良品", description: "碧光莹莹，寒气逼人", element: "木" },
	{ id: "bi-shui-jian", name: "碧水剑", type: "剑", attack: 19, rarity: "良品", description: "碧水寒潭所铸，清波流转", element: "水" },
	{ id: "long-quan-jian", name: "龙泉剑", type: "剑", attack: 20, rarity: "良品", description: "龙泉宝剑，千年名剑", element: "金" },
	{ id: "leng-ning-jian", name: "冷凝剑", type: "剑", attack: 21, rarity: "良品", description: "寒气凝结，触之冰手", element: "水" },
	{ id: "huo-long-jian", name: "火龙剑", type: "剑", attack: 22, rarity: "良品", description: "赤红如焰，灼热逼人", element: "火" },
	{ id: "song-wen-jian", name: "松纹剑", type: "剑", attack: 20, rarity: "良品", description: "剑身松纹密布，古朴典雅", element: "木" },
	{ id: "zi-wei-ruan-jian", name: "紫薇软剑", type: "剑", attack: 23, rarity: "良品", description: "三十岁前所用，误伤义士", element: "金" },
	{ id: "bai-jian", name: "白剑", type: "剑", attack: 22, rarity: "良品", description: "通体雪白，峨眉之物", element: "金" },
	{ id: "hei-jian", name: "黑剑", type: "剑", attack: 22, rarity: "良品", description: "通体漆黑，无名之剑", element: "水" },
	{ id: "qin-jian", name: "秦剑", type: "剑", attack: 21, rarity: "良品", description: "古秦制式长剑", element: "金" },
	{ id: "bai-long-jian", name: "白龙剑", type: "剑", attack: 23, rarity: "良品", description: "白龙吐珠，剑气如虹", element: "金" },
	{ id: "jin-she-jian", name: "金蛇剑", type: "剑", attack: 24, rarity: "良品", description: "金蛇秘笈所载，诡异莫测", element: "金" },
	{ id: "zhou-gong-jian", name: "周公剑", type: "剑", attack: 22, rarity: "良品", description: "周公所遗之剑，厚重古朴", element: "土" },
	{ id: "bing-po-yin-zhen", name: "冰魄银针", type: "暗", attack: 20, rarity: "良品", description: "李莫愁暗器，寒毒入骨", element: "水" },
	{ id: "hei-xue-shen-zhen", name: "黑血神针", type: "暗", attack: 22, rarity: "良品", description: "魔教至宝，见血封喉", element: "土" },
	{ id: "yu-feng-zhen", name: "玉蜂针", type: "暗", attack: 18, rarity: "良品", description: "古墓派暗器，玉蜂尾针所制", element: "木" },
	{ id: "jin-she-zhui", name: "金蛇锥", type: "暗", attack: 23, rarity: "良品", description: "金蛇秘传暗器，诡异莫测", element: "金" },
	{ id: "fei-yan-yin-suo", name: "飞燕银梭", type: "暗", attack: 21, rarity: "良品", description: "银光飞梭，速度极快", element: "金" },
	{ id: "xue-dao", name: "血刀", type: "刀", attack: 24, rarity: "良品", description: "血刀门至宝，邪气凛然", element: "火" },
	{ id: "shu-nv-jian", name: "淑女剑", type: "剑", attack: 23, rarity: "良品", description: "古墓传承，柔美含锋", element: "水" },
	// ── 精品 ──
	{ id: "chu-wang-jian", name: "楚王剑", type: "剑", attack: 28, rarity: "精品", description: "楚国名剑，王者之气", element: "金" },
	{ id: "fu-chai-jian", name: "夫差剑", type: "剑", attack: 29, rarity: "精品", description: "吴王夫差佩剑，锋芒毕露", element: "金" },
	{ id: "gong-bu-jian", name: "工布剑", type: "剑", attack: 30, rarity: "精品", description: "欧冶子所铸，削铁如泥", element: "金" },
	{ id: "ju-que-jian", name: "巨阙剑", type: "剑", attack: 32, rarity: "精品", description: "穿透巨阙，天下利器", element: "金" },
	{ id: "long-yuan-jian", name: "龙渊剑", type: "剑", attack: 31, rarity: "精品", description: "欧冶子与干将合铸，七星龙渊", element: "金" },
	{ id: "yuan-yang-dao", name: "鸳鸯刀", type: "刀", attack: 30, rarity: "精品", description: "仁者无敌，双刀合璧天下无双", element: "火" },
	{ id: "pi-li-kuang-dao", name: "霹雳狂刀", type: "刀", attack: 33, rarity: "精品", description: "霹雳堂宝刀，雷霆万钧", element: "火" },
	{ id: "bai-hong-jian", name: "白虹剑", type: "剑", attack: 31, rarity: "精品", description: "白虹贯日，剑气横空", element: "金" },
	{ id: "xuan-tie-jian", name: "玄铁重剑", type: "剑", attack: 35, rarity: "精品", description: "重剑无锋，大巧不工", element: "金" },
	{ id: "bi-xue-jian", name: "碧血剑", type: "剑", attack: 34, rarity: "精品", description: "忠义之剑，浩气长存", element: "木" },
	// ── 极品 ──
	{ id: "jun-zi-jian", name: "君子剑", type: "剑", attack: 42, rarity: "极品", description: "谦谦君子，温润如玉", element: "水" },
	{ id: "zhen-wu-jian", name: "真武剑", type: "剑", attack: 45, rarity: "极品", description: "武当镇派之宝，真武大帝赐剑", element: "水" },
	{ id: "yi-tian-jian", name: "倚天剑", type: "剑", attack: 50, rarity: "极品", description: "武林至尊，倚天不出", element: "金" },
	{ id: "tu-long-dao", name: "屠龙刀", type: "刀", attack: 52, rarity: "极品", description: "号令天下，莫敢不从", element: "火" },
	{ id: "da-gou-bang", name: "打狗棒", type: "棒", attack: 44, rarity: "极品", description: "丐帮历代帮主信物", element: "木" },
	{ id: "sheng-huo-ling", name: "圣火令", type: "令", attack: 46, rarity: "极品", description: "明教圣物，诡异莫测", element: "火" },
	{ id: "she-zhang", name: "蛇杖", type: "杖", attack: 47, rarity: "极品", description: "欧阳锋随身兵器，杖头双蛇翻飞", element: "木" },
	{ id: "yu-xiao-jian", name: "玉箫剑", type: "剑", attack: 43, rarity: "极品", description: "黄药师以箫代剑，音波伤人", element: "水" },
	{ id: "jin-lun", name: "金轮", type: "轮", attack: 48, rarity: "极品", description: "金轮法王法器，金铁交鸣震人心魄", element: "金" },
	{ id: "xuan-tie-ling", name: "玄铁令", type: "令", attack: 44, rarity: "极品", description: "谢烟客信物，持此令者有求必应", element: "金" },
	{ id: "wu-lun", name: "五轮", type: "轮", attack: 49, rarity: "极品", description: "金银铜铁铅五轮齐出", element: "金" },
	{ id: "tai-ji-jian", name: "太极剑", type: "剑", attack: 46, rarity: "极品", description: "张三丰所铸，太极阴阳之剑", element: "土" },
	// ── 神器 ──
	{ id: "dugu-jian", name: "独孤求败之剑", type: "剑", attack: 70, rarity: "神器", description: "四十岁后，不滞于物", element: "金" },
	{ id: "pi-li-dan", name: "霹雳弹", type: "暗", attack: 55, rarity: "神器", description: "霹雳堂镇堂之宝，一弹惊天", element: "火" },
	{ id: "jia-yi-tian-jian", name: "假倚天剑", type: "剑", attack: 35, rarity: "精品", description: "仿倚天剑所铸，形似神不似", element: "金" },
	{ id: "lv-bo-bai-he", name: "绿波竹棒", type: "棒", attack: 60, rarity: "神器", description: "丐帮帮主至宝，翠竹通灵", element: "木" },
	{ id: "xuan-tie-zhui", name: "玄铁匕首", type: "匕", attack: 65, rarity: "神器", description: "玄铁所铸，削铁如泥", element: "金" },
	{ id: "tai-a-jian", name: "太阿剑", type: "剑", attack: 75, rarity: "神器", description: "上古名剑，威道之剑", element: "火" },
	{ id: "zhan-lu-jian", name: "湛卢剑", type: "剑", attack: 78, rarity: "神器", description: "仁道之剑，不杀而屈人", element: "水" },
	{ id: "tai-xu-jian", name: "太虚剑", type: "剑", attack: 72, rarity: "神器", description: "太虚天道之剑", element: "土" },
	{ id: "pu-dao", name: "朴刀", type: "刀", attack: 10, rarity: "凡品", description: "朴素无华，实用可靠", element: "金" },
	{ id: "pi-feng-bian", name: "劈风鞭", type: "鞭", attack: 8, rarity: "凡品", description: "软鞭如蛇，变化莫测", element: "水" },
	{ id: "tie-qiang", name: "铁枪", type: "枪", attack: 9, rarity: "凡品", description: "军中铁枪", element: "金" },
	{ id: "shi-tou", name: "石子", type: "暗", attack: 5, rarity: "凡品", description: "随手可得的石子", element: "土" },
	{ id: "he-jin-dao", name: "鹤嘴刀", type: "刀", attack: 13, rarity: "凡品", description: "形如鹤嘴，刺击为主", element: "金" },
	{ id: "tian-shan-jian", name: "天山剑", type: "剑", attack: 13, rarity: "凡品", description: "天山派制式长剑", element: "水" },
	{ id: "e-mei-ci", name: "峨眉刺", type: "暗", attack: 14, rarity: "凡品", description: "峨眉派暗器", element: "金" },
	{ id: "tong-chui", name: "铜锤", type: "锤", attack: 12, rarity: "凡品", description: "铜制短锤", element: "金" },
	{ id: "kong-ming-quan", name: "孔明锁", type: "暗", attack: 11, rarity: "凡品", description: "机关暗器，巧妙异常", element: "金" },
	{ id: "tai-hu-dao", name: "太湖刀", type: "刀", attack: 16, rarity: "凡品", description: "太湖水匪所用", element: "金" },
	{ id: "hei-dao", name: "黑道刀", type: "刀", attack: 15, rarity: "凡品", description: "黑道中人常用", element: "火" },
	{ id: "da-mo-jian", name: "达摩剑", type: "剑", attack: 25, rarity: "良品", description: "少林达摩所传剑法配合之剑", element: "金" },
	{ id: "tian-shan-zhe-mei-shou", name: "天山折梅手", type: "暗", attack: 24, rarity: "良品", description: "天山童姥暗器手法配合", element: "水" },
	{ id: "pi-xie-jian", name: "辟邪剑", type: "剑", attack: 26, rarity: "良品", description: "林家祖传辟邪剑法配合", element: "金" },
	{ id: "wu-dang-chang-jian", name: "武当长剑", type: "剑", attack: 17, rarity: "良品", description: "武当弟子制式剑", element: "水" },
	{ id: "ming-jiao-dao", name: "明教刀", type: "刀", attack: 23, rarity: "良品", description: "明教锐金旗所用", element: "火" },
	{ id: "pi-li-an-qi", name: "霹雳暗器", type: "暗", attack: 25, rarity: "良品", description: "霹雳堂特制火器", element: "火" },
	{ id: "gu-mu-jian", name: "古墓剑", type: "剑", attack: 27, rarity: "良品", description: "古墓派佩剑", element: "水" },
	{ id: "tai-chang-jian", name: "太常剑", type: "剑", attack: 26, rarity: "良品", description: "朝廷太常寺所用", element: "金" },
	{ id: "qi-xing-jian", name: "七星剑", type: "剑", attack: 28, rarity: "良品", description: "北斗七星图案长剑", element: "金" },
	{ id: "tian-shan-xue-jian", name: "天山雪剑", type: "剑", attack: 33, rarity: "精品", description: "天山冰雪所淬之剑", element: "水" },
	{ id: "tie-zhang", name: "铁掌", type: "拳", attack: 32, rarity: "精品", description: "铁掌帮帮主装备", element: "金" },
	{ id: "ming-wang-fa-zhang", name: "明王法杖", type: "杖", attack: 34, rarity: "精品", description: "金刚宗法王所持", element: "金" },
	{ id: "kui-hua-bao-dian", name: "葵花针", type: "暗", attack: 48, rarity: "极品", description: "葵花宝典所载暗器", element: "火" },
	{ id: "tai-xu-jian", name: "太虚剑", type: "剑", attack: 72, rarity: "神器", description: "太虚天道之剑", element: "土" },
	{ id: "qian-kun-jian", name: "乾坤一剑", type: "剑", attack: 15, rarity: "凡品", description: "乾坤派制式长剑", element: "土" },

];
const WEAPON_MAP = new Map(WEAPON_DEFS.map(w => [w.id, w]));
export function getWeaponDef(id: string): WeaponDef | undefined { return WEAPON_MAP.get(id); }

export function getRaritySymbol(rarity: string): string {
	switch (rarity) {
		case "凡品": return "⚪"; case "良品": return "🟢"; case "精品": return "🔵";
		case "极品": return "🟣"; case "神器": return "🟡"; default: return "⚪";
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 道具
// ═══════════════════════════════════════════════════════════════════════════

export const ITEM_DEFS: ItemDef[] = [
	// ── 原版伤药/补品 ──
	{ id: "kang-bei-te", name: "康倍特", type: "恢复", description: "恢复20血量", effect: { hp: 20 } },
	{ id: "jing-qi-wan", name: "精气丸", type: "恢复", description: "恢复15血量", effect: { hp: 15 } },
	{ id: "xiao-huan-dan", name: "小还丹", type: "恢复", description: "恢复60血量", effect: { hp: 60 } },
	{ id: "yu-dong-hei-shi-dan", name: "玉洞黑石丹", type: "恢复", description: "恢复50血量", effect: { hp: 50 } },
	{ id: "yu-zhen-san", name: "玉真散", type: "恢复", description: "少林伤科圣药，恢复60血量", effect: { hp: 60 } },
	{ id: "san-huang-bao-la-wan", name: "三黄宝腊丸", type: "恢复", description: "恢复50血量", effect: { hp: 50 } },
	{ id: "yu-ling-san", name: "玉灵散", type: "恢复", description: "少林伤科圣药，恢复80血量", effect: { hp: 80 } },
	{ id: "tian-xiang-duan-xu-jiao", name: "天香断续胶", type: "恢复", description: "续筋接骨，恢复100血量", effect: { hp: 100 } },
	{ id: "hei-yu-duan-xu-gao", name: "黑玉断续膏", type: "恢复", description: "续筋接骨，恢复全部血量", effect: { hp: 1049 } },
	{ id: "jin-niu-yun-gong-san", name: "金牛运功散", type: "恢复", description: "恢复100血量", effect: { hp: 100 } },
	{ id: "ren-shen", name: "人参", type: "恢复", description: "名贵补品，恢复40血量", effect: { hp: 40 } },
	{ id: "bai-yun-xiong-dan-wan", name: "白云熊胆丸", type: "恢复", description: "恢复90血量", effect: { hp: 90 } },
	{ id: "jiu-hua-yu-lu-wan", name: "九花玉露丸", type: "恢复", description: "桃花岛秘药，恢复110血量", effect: { hp: 110 } },
	{ id: "jiu-zhuan-ling-bao-wan", name: "九转灵宝丸", type: "恢复", description: "恢复100血量", effect: { hp: 100 } },
	{ id: "tian-qi-sha-dan-san", name: "田七鲨胆散", type: "恢复", description: "恢复100血量", effect: { hp: 100 } },
	{ id: "jiu-zhuan-xiong-she-wan", name: "九转熊蛇丸", type: "恢复", description: "逍遥派疗伤圣药，补满血量", effect: { hp: 999 } },
	{ id: "wu-chang-dan", name: "无常丹", type: "恢复", description: "恢复120血量", effect: { hp: 120 } },
	{ id: "zhen-xin-li-qi-wan", name: "镇心理气丸", type: "恢复", description: "调理内息，恢复100血量", effect: { hp: 100 } },
	{ id: "sheng-sheng-zao-hua-dan", name: "生生造化丹", type: "恢复", description: "疗伤圣药，有起死回生之效，恢复全部血量", effect: { hp: 999 } },
	{ id: "tian-wang-bao-ming-dan", name: "天王保命丹", type: "恢复", description: "神奇丹药，起死回生，恢复全部血量", effect: { hp: 999 } },
	{ id: "bao-ji-wan", name: "宝济丸", type: "恢复", description: "恢复30血量", effect: { hp: 30 } },
	{ id: "huang-lian-jie-du-wan", name: "黄连解毒丸", type: "恢复", description: "清热解毒，恢复40血量", effect: { hp: 40 } },
	{ id: "tian-xin-jie-du-dan", name: "天心解毒丹", type: "恢复", description: "解毒良药，恢复50血量", effect: { hp: 50 } },
	{ id: "hui-yang-yu-long-gao", name: "回阳玉龙膏", type: "恢复", description: "回阳救逆，恢复80血量", effect: { hp: 80 } },
	{ id: "niu-huang-xue-jie-dan", name: "牛黄血竭丹", type: "恢复", description: "活血化瘀，恢复70血量", effect: { hp: 70 } },
	{ id: "liu-yang-zheng-qi-dan", name: "六阳正气丹", type: "恢复", description: "少林秘药，恢复100血量", effect: { hp: 100 } },
	{ id: "zhu-jing-bing-chan", name: "朱睛冰蟾", type: "恢复", description: "万毒之克星，恢复全部血量", effect: { hp: 999 } },
	{ id: "fu-ling-shou-wu-wan", name: "茯苓首乌丸", type: "恢复", description: "千年奇药，恢复全部血量", effect: { hp: 999 } },
	{ id: "qian-nian-ling-zhi", name: "千年灵芝", type: "恢复", description: "千年灵药，恢复100血量", effect: { hp: 100 } },
	{ id: "qian-nian-ren-shen", name: "千年人参", type: "恢复", description: "千岁人参，恢复全部血量", effect: { hp: 999 } },
	{ id: "tian-shan-xue-lian", name: "天山雪莲", type: "恢复", description: "极寒之花，恢复全部血量", effect: { hp: 999 } },
	{ id: "tong-xi-di-long-wan", name: "通犀地龙丸", type: "恢复", description: "至阳之药，恢复全部血量", effect: { hp: 999 } },
	{ id: "qian-nian-bing-chong", name: "千年冰虫", type: "恢复", description: "极寒之物，恢复全部血量", effect: { hp: 999 } },
	{ id: "mang-gu-zhu-ha", name: "莽牯朱蛤", type: "恢复", description: "万毒之王，服之百毒不侵，恢复全部血量", effect: { hp: 999 } },
	{ id: "she-dan", name: "蛇胆", type: "恢复", description: "异蛇之胆，恢复20血量", effect: { hp: 20 } },
	{ id: "wu-bao-hua-mi-jiu", name: "五宝花蜜酒", type: "恢复", description: "恢复100血量", effect: { hp: 100 } },
	{ id: "la-ba-zhou", name: "腊八粥", type: "恢复", description: "少林腊八粥，恢复130血量", effect: { hp: 130 } },
	{ id: "da-pan-tao", name: "大蟠桃", type: "恢复", description: "仙桃，恢复全部血量", effect: { hp: 999 } },
	{ id: "xu-ming-ba-wan", name: "续命八丸", type: "恢复", description: "起死回生，恢复全部血量", effect: { hp: 999 } },
	{ id: "qing-hua-du-jie-yao", name: "情花毒解药", type: "恢复", description: "解情花之毒，恢复100血量", effect: { hp: 100 } },
	// ── 原版食物 ──
	{ id: "rou-bu-rou", name: "肉脯", type: "恢复", description: "恢复15血量", effect: { hp: 15 } },
	{ id: "jiao-hua-ji", name: "叫花鸡", type: "恢复", description: "洪七公最爱，恢复40血量", effect: { hp: 40 } },
	{ id: "nuo-mi-jiu", name: "糯米酒", type: "恢复", description: "香甜糯米酒，恢复18血量", effect: { hp: 18 } },
	{ id: "fo-tiao-qiang", name: "佛跳墙", type: "恢复", description: "人间美味，恢复60血量", effect: { hp: 60 } },
	{ id: "hong-shao-rou", name: "红烧肉", type: "恢复", description: "肥而不腻，恢复30血量", effect: { hp: 30 } },
	// ── 增益 ──
	{ id: "bao-tai-yi-jin-wan", name: "豹胎易筋丸", type: "增益", description: "下次Boss战攻防+25", effect: { attackBuff: 25, defenseBuff: 25 } },
	{ id: "shi-xiang-ruan-jin-san", name: "十香软筋散", type: "增益", description: "下次Boss战防御+20", effect: { defenseBuff: 20 } },
	{ id: "bei-su-qing-feng", name: "悲酥清风", type: "增益", description: "下次Boss战攻击+25", effect: { attackBuff: 25 } },
	{ id: "san-shi-nao-shen-dan", name: "三尸脑神丹", type: "增益", description: "日月神教禁药，攻击+30", effect: { attackBuff: 30 } },
	{ id: "xi-sui-dan", name: "洗髓丹", type: "增益", description: "下次Boss战攻防+20", effect: { attackBuff: 20, defenseBuff: 20 } },
	{ id: "tie-bi-san", name: "铁壁散", type: "增益", description: "下次Boss战防御+10", effect: { defenseBuff: 10 } },
	{ id: "wu-gong-san", name: "悟性散", type: "增益", description: "下次修炼经验×2", effect: { xpBonus: 2 } },
	{ id: "wu-du-mi-yao", name: "五毒秘药", type: "增益", description: "五毒教秘制，攻击+12", effect: { attackBuff: 12 } },
	{ id: "ming-wang-huo-dan", name: "明王火丹", type: "增益", description: "金刚明王之力，攻击+28", effect: { attackBuff: 28 } },
	{ id: "hua-gong-san", name: "化功散", type: "增益", description: "削敌内力，攻击+15", effect: { attackBuff: 15 } },
	// ── 武功秘籍 ──
	{ id: "zi-xia-mi-ji", name: "紫霞秘笈", type: "武功", description: "华山派内功心法，内功经验+30", effect: { xpBonus: 30 } },
	{ id: "xiao-wu-xiang-gong", name: "小无相功", type: "武功", description: "逍遥派心法，内功经验+40", effect: { xpBonus: 40 } },
	{ id: "shi-ba-ni-ou", name: "十八泥偶", type: "武功", description: "神秘泥偶藏有武功，内功经验+50", effect: { xpBonus: 50 } },
	{ id: "shen-zhao-jing", name: "神照经", type: "武功", description: "起死回生之术，内功经验+60", effect: { xpBonus: 60 } },
	{ id: "yi-jin-jing-quan", name: "易筋经", type: "武功", description: "少林至宝，内功经验+120", effect: { xpBonus: 120 } },
	{ id: "xi-sui-jing", name: "洗髓经", type: "武功", description: "少林秘传，内功经验+100", effect: { xpBonus: 100 } },
	{ id: "jiu-yang-zhen-jing", name: "九阳真经", type: "武功", description: "至高无上内功心法，内功经验+100", effect: { xpBonus: 100 } },
	{ id: "jiu-yin-zhen-jing-ye", name: "九阴真经残页", type: "武功", description: "天下武学总纲，掌法经验+60", effect: { xpBonus: 60 } },
	{ id: "bei-ming-shen-gong-can", name: "北冥神功残页", type: "武功", description: "逍遥派至宝，内功经验+80", effect: { xpBonus: 80 } },
	{ id: "liu-mai-shen-jian-tu", name: "六脉神剑图", type: "武功", description: "段氏秘传，剑法经验+50", effect: { xpBonus: 50 } },
	{ id: "xiang-long-shi-ba-zhang-tu", name: "降龙十八掌图", type: "武功", description: "丐帮武功，掌法经验+50", effect: { xpBonus: 50 } },
	{ id: "qian-kun-da-na-yi-can", name: "乾坤大挪移残页", type: "武功", description: "明教至宝，内功经验+70", effect: { xpBonus: 70 } },
	{ id: "an-ran-xiao-hun-can", name: "黯然销魂掌谱", type: "武功", description: "杨过所创，掌法经验+80", effect: { xpBonus: 80 } },
	{ id: "yu-nv-xin-jing-can", name: "玉女心经残页", type: "武功", description: "古墓秘传，内功经验+60", effect: { xpBonus: 60 } },
	{ id: "ling-bo-wei-bu-tu", name: "凌波微步图", type: "武功", description: "轻功秘籍，经验+60", effect: { xpBonus: 60 } },
	{ id: "xi-xing-da-fa-tu", name: "吸星大法图", type: "武功", description: "日月神教秘传，内功经验+60", effect: { xpBonus: 60 } },
	{ id: "zuo-you-hu-bo-tu", name: "左右互搏图", type: "武功", description: "老顽童自创，经验+50", effect: { xpBonus: 50 } },
	{ id: "tan-zhi-shen-tong-tu", name: "弹指神通图", type: "武功", description: "桃花岛武功，经验+60", effect: { xpBonus: 60 } },
	{ id: "bi-hai-chao-sheng-pu", name: "碧海潮生曲谱", type: "武功", description: "黄药师所创，内功经验+60", effect: { xpBonus: 60 } },
	{ id: "yi-yang-zhi-tu", name: "一阳指图", type: "武功", description: "大理段氏武功，经验+60", effect: { xpBonus: 60 } },
	{ id: "tai-ji-jian-fa-can", name: "太极剑法残谱", type: "武功", description: "武当武功，剑法经验+60", effect: { xpBonus: 60 } },
	{ id: "tai-ji-quan-jing", name: "太极拳经", type: "武功", description: "张三丰所创，拳法经验+60", effect: { xpBonus: 60 } },
	{ id: "long-xiang-ban-ruo-gong", name: "龙象般若功", type: "武功", description: "密宗至高护法神功，内功经验+70", effect: { xpBonus: 70 } },
	{ id: "qi-shang-quan-pu", name: "七伤拳谱", type: "武功", description: "崆峒派独门拳法，拳法经验+40", effect: { xpBonus: 40 } },
	{ id: "xue-dao-mi-ji", name: "血刀秘笈", type: "武功", description: "血刀门武术集成，刀法经验+40", effect: { xpBonus: 40 } },
	{ id: "bi-xie-jian-pu", name: "辟邪剑谱", type: "武功", description: "林家祖传剑法，剑法经验+50", effect: { xpBonus: 50 } },
	{ id: "xun-lei-jian-pu", name: "迅雷剑谱", type: "武功", description: "昆仑派剑法，剑法经验+40", effect: { xpBonus: 40 } },
	// ── 金庸小说补充道具 ──
	{ id: "jin-chuang-yao", name: "金创药", type: "恢复", description: "外伤良药，恢复30血量", effect: { hp: 30 } },
	{ id: "hu-gu-wan", name: "虎骨丸", type: "恢复", description: "虎骨炼制，恢复45血量", effect: { hp: 45 } },
	{ id: "yu-feng-wan", name: "玉蜂丸", type: "恢复", description: "古墓派秘制，恢复70血量", effect: { hp: 70 } },
	{ id: "xiong-dan-jiu", name: "熊胆丸", type: "恢复", description: "恢复40血量", effect: { hp: 40 } },
	{ id: "wu-gong-jiu", name: "蜈蚣酒", type: "恢复", description: "以毒攻毒，恢复30血量", effect: { hp: 30 } },
	{ id: "hu-gu-gao", name: "虎骨膏", type: "恢复", description: "接骨续筋，恢复60血量", effect: { hp: 60 } },
	{ id: "tian-shan-bing-can", name: "天山冰蚕", type: "恢复", description: "极寒之物，恢复全部血量", effect: { hp: 999 } },
	{ id: "he-ding-hong-jie-yao", name: "鹤顶红解药", type: "恢复", description: "解鹤顶红之毒，恢复50血量", effect: { hp: 50 } },
	{ id: "jin-can-gu-jie", name: "金蚕蛊解药", type: "恢复", description: "苗疆解蛊良药，恢复40血量", effect: { hp: 40 } },
	{ id: "jiao-zi", name: "饺子", type: "恢复", description: "热腾腾的饺子，恢复8血量", effect: { hp: 8 } },
	{ id: "shao-bing", name: "烧饼", type: "恢复", description: "饱腹之物，恢复12血量", effect: { hp: 12 } },
	{ id: "zhu-rou-bao", name: "猪肉包", type: "恢复", description: "美味肉包，恢复15血量", effect: { hp: 15 } },
	{ id: "qing-tang-mian", name: "清汤面", type: "恢复", description: "暖心暖胃，恢复10血量", effect: { hp: 10 } },
	{ id: "wan-du-bu-qin-dan", name: "万毒不侵丹", type: "增益", description: "百毒不侵，攻防+15", effect: { attackBuff: 15, defenseBuff: 15 } },
	{ id: "bao-ji-wan", name: "爆击丸", type: "增益", description: "攻击+15", effect: { attackBuff: 15 } },
	{ id: "wu-lin-mi-ji", name: "武林秘籍", type: "武功", description: "随机经验+50", effect: { xpBonus: 50 } },
	{ id: "du-gu-jiu-jian-can", name: "独孤九剑残谱", type: "武功", description: "独孤前辈遗物，剑法经验+70", effect: { xpBonus: 70 } },
	{ id: "da-gou-bang-fa-tu", name: "打狗棒法图", type: "武功", description: "丐帮秘籍，棍法经验+50", effect: { xpBonus: 50 } },
];

const ITEM_MAP = new Map(ITEM_DEFS.map(i => [i.id, i]));
export function getItemDef(id: string): ItemDef | undefined { return ITEM_MAP.get(id); }

/** 使用道具 */
export function useItem(state: WuxueState, itemId: string): { success: boolean; msg: string; effect: string } {
	const def = getItemDef(itemId);
	if (!def) return { success: false, msg: "没找到这个道具", effect: "" };

	let effectDesc = "";

	// 血量恢复
	if (def.effect.hp) {
		const before = Math.round(state.hp);
		state.hp = Math.min(state.maxHp, state.hp + def.effect.hp);
		const healed = Math.round(state.hp) - before;
		effectDesc = `血量 +${healed}`;
	}

	if (def.effect.attackBuff) state.attackBuff += def.effect.attackBuff;
	if (def.effect.defenseBuff) state.defenseBuff += def.effect.defenseBuff;
	if (def.effect.xpBonus && def.type === "增益") state.xpBonus = Math.max(state.xpBonus, def.effect.xpBonus);

	if (def.effect.xpBonus && def.type === "武功") {
		if (def.id === "yi-jin-jing") {
			const neigong = state.skills.find(s => s.id === "neigong" && s.unlocked);
			if (neigong) {
				neigong.xp += 80;
				effectDesc = "内功心法经验 +80";
				if (neigong.xp >= neigong.level * 50 && neigong.level < 10) { neigong.xp = 0; neigong.level++; effectDesc += "，技能提升！"; }
			} else return { success: false, msg: "内功心法尚未解锁", effect: "" };
		} else if (def.id === "shao-lin-xiao-huan-dan") {
			// 少林小还丹：随机技能经验+30，恢复血量
			const unlocked = state.skills.filter(s => s.unlocked);
			if (unlocked.length === 0) return { success: false, msg: "没有已解锁的技能", effect: "" };
			const target = unlocked[Math.floor(Math.random() * unlocked.length)]!;
			target.xp += 30;
			effectDesc = `${target.name}经验 +30`;
			if (target.xp >= target.level * 50 && target.level < 10) { target.xp = 0; target.level++; effectDesc += "，技能提升！"; }
		} else if (def.id === "jiu-yang-zhen-jing") {
			// 九阳真经残页：内功心法经验+100
			const neigong = state.skills.find(s => s.id === "neigong" && s.unlocked);
			if (neigong) {
				neigong.xp += 100;
				effectDesc = "内功心法经验 +100";
				if (neigong.xp >= neigong.level * 50 && neigong.level < 10) { neigong.xp = 0; neigong.level++; effectDesc += "，技能提升！"; }
			} else return { success: false, msg: "内功心法尚未解锁", effect: "" };
		} else if (def.id === "san-shi-nao-shen-dan") {
			// 三尸脑神丹：攻击+30但只恢复少量血量
			if (def.effect.hp) {
				const before = Math.round(state.hp);
				state.hp = Math.min(state.maxHp, def.effect.hp);
				const healed = Math.round(state.hp) - before;
				if (healed > 0) effectDesc = `血量 +${healed}`;
			}
		} else {
			const unlocked = state.skills.filter(s => s.unlocked);
			if (unlocked.length === 0) return { success: false, msg: "没有已解锁的技能", effect: "" };
			const target = unlocked[Math.floor(Math.random() * unlocked.length)]!;
			target.xp += 50;
			effectDesc = `${target.name}经验 +50`;
			if (target.xp >= target.level * 50 && target.level < 10) { target.xp = 0; target.level++; effectDesc += "，技能提升！"; }
		}
	}

	return { success: true, msg: `使用了「${def.name}」`, effect: effectDesc || def.description };
}

