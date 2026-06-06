/**
 * 武功系统 - 江湖遭遇、地点事件
 */
import type { SkillDef, DropResult } from "./wuxue-types.js";
import { ELEMENT_SYMBOL } from "./wuxue-types.js";
import { SKILL_POOL, WEAPON_DEFS, ITEM_DEFS, getRaritySymbol } from "./wuxue-data.js";

// ═══════════════════════════════════════════════════════════════════════════
// 地点与随机事件
// 地点与随机事件
// ═══════════════════════════════════════════════════════════════════════════

interface LocationDef { id: string; name: string; description: string; }
interface EventDef { id: string; name: string; description: string; goldMin: number; goldMax: number; xpMin: number; xpMax: number; }

const LOCATIONS: LocationDef[] = [
	{ id: "taohua-island", name: "桃花岛", description: "碧海蓝天，桃花盛开" },
	{ id: "wudang-mountain", name: "武当山", description: "云雾缭绕，仙气飘飘" },
	{ id: "shaolin-temple", name: "少林寺", description: "千年古刹，钟声悠扬" },
	{ id: "emei-mountain", name: "峨眉山", description: "金顶佛光，秀甲天下" },
	{ id: "huashan", name: "华山", description: "奇险天下第一山" },
	{ id: "kunlun-mountain", name: "昆仑山", description: "雪山连绵，冰川遍布" },
	{ id: "mingjiao-hq", name: "光明顶", description: "明教总坛，气势恢宏" },
	{ id: "gaibang-hq", name: "丐帮总舵", description: "天下第一大帮" },
	{ id: "xueshan", name: "雪山", description: "白雪皑皑，寒风刺骨" },
	{ id: "dali", name: "大理", description: "风花雪月，四季如春" },
	{ id: "jiangnan", name: "江南", description: "小桥流水，烟雨蒙蒙" },
	{ id: "xiyu", name: "西域", description: "黄沙漫漫，驼铃悠悠" },
	{ id: "xingxiu-sea", name: "星宿海", description: "毒虫遍布，瘴气弥漫" },
	{ id: "gumu", name: "古墓", description: "终南山下，活死人墓" },
	{ id: "lumenzhen", name: "绿柳山庄", description: "赵敏私宅，暗藏玄机" },
	{ id: "jueqing-gu", name: "绝情谷", description: "情花遍地，断肠崖前" },
	{ id: "lingjiu-gong", name: "灵鹫宫", description: "天山飘渺，八荒六合" },
	{ id: "mantuo-shanzhuang", name: "曼陀山庄", description: "茶花满园，王语嫣居所" },
	{ id: "xixia-yipintang", name: "西夏一品堂", description: "西夏招贤纳士之所" },
	{ id: "yanzi-wu", name: "燕子坞", description: "姑苏慕容世家" },
	{ id: "wanan-si", name: "万安寺", description: "大都名刹，藏经万千" },
	{ id: "juxian-zhuang", name: "聚贤庄", description: "英雄聚会，血战之地" },
	{ id: "yanmen-guan", name: "雁门关", description: "塞外雄关，胡汉交融" },
	{ id: "tianlong-si", name: "天龙寺", description: "大理皇家寺院，六脉神剑传承" },
	{ id: "xiangyang-cheng", name: "襄阳城", description: "铁血守城，郭靖黄蓉驻守" },
	{ id: "linan", name: "临安", description: "南宋都城，繁华似锦" },
	{ id: "niujia-cun", name: "牛家村", description: "临安郊外，郭杨两家故居" },
	{ id: "jiaxing", name: "嘉兴", description: "醉仙楼下，江南七怪聚义" },
	{ id: "luoyang", name: "洛阳", description: "古都名邑，天下之中" },
	{ id: "kaifeng", name: "开封", description: "东京汴梁，武林荟萃" },
	{ id: "changan", name: "长安", description: "千年帝都，龙脉所在" },
	{ id: "chengdu", name: "成都", description: "天府之国，蜀中武林" },
	{ id: "hangzhou", name: "杭州", description: "西湖歌舞，人间天堂" },
	{ id: "dadu", name: "大都", description: "元朝帝都，蒙古王廷" },
	{ id: "yingtian-fu", name: "应天府", description: "六朝古都，虎踞龙盘" },
	{ id: "menggu-caoyuan", name: "蒙古草原", description: "天苍苍野茫茫，铁木真起兵之地" },
	{ id: "tianshan", name: "天山", description: "终年积雪，灵鹫宫所在" },
	{ id: "mei-zhuang", name: "梅庄", description: "西湖畔，江南四友隐居" },
	{ id: "xihu", name: "西湖", description: "水光潋滟，梅庄比剑" },
	{ id: "longmen-kezhan", name: "龙门客栈", description: "大漠孤烟，各路豪杰汇聚" },
	{ id: "heimu-ya", name: "黑木崖", description: "日月神教总坛，东方不败居所" },
	{ id: "wubu-gang", name: "五霸冈", description: "群豪聚会，令狐冲扬名" },
	{ id: "siguo-ya", name: "思过崖", description: "华山绝壁，面壁思过之地" },
	{ id: "yaowang-gu", name: "药王谷", description: "毒医程灵素居所，百草丰茂" },
	{ id: "baihua-gu", name: "百花谷", description: "老顽童周伯通隐居之处" },
	{ id: "motian-ya", name: "摩天崖", description: "石破天流落之地，谢烟客居所" },
	{ id: "binghuo-dao", name: "冰火岛", description: "张翠山殷素素流落之孤岛" },
	{ id: "wangpan-shan", name: "王盘山", description: "天鹰教扬刀立威之地" },
	{ id: "qiantang-jiang", name: "钱塘江", description: "潮信如雷，观潮胜地" },
	{ id: "diaoyu-cheng", name: "钓鱼城", description: "合州孤城，抗蒙雄关" },
	{ id: "quanzhen-jiao", name: "全真教", description: "终南山重阳宫，天下正宗" },
	{ id: "tiezhang-feng", name: "铁掌峰", description: "裘千仞铁掌水上漂" },
	{ id: "guiyun-zhuang", name: "归云庄", description: "太湖之畔，陆乘风庄主" },
	{ id: "yalong-zhuang", name: "压龙庄", description: "太行山中，武林秘境" },
	{ id: "zhujian-gu", name: "铸剑谷", description: "剑气冲天，神兵出世" },
	{ id: "yandang-shan", name: "雁荡山", description: "海上名山，寰中绝胜" },
	{ id: "wuyue", name: "五岳", description: "泰山之雄，华山之险" },
	{ id: "taishan", name: "泰山", description: "五岳之首，东岳大帝" },
	{ id: "hengshan-nan", name: "南岳衡山", description: "五岳之中，衡山派所在" },
	{ id: "hengshan-bei", name: "北岳恒山", description: "悬空寺上，令狐冲掌门" },
	{ id: "songshan", name: "嵩山", description: "中岳峻极，左冷禅图霸" },
	{ id: "taihang-shan", name: "太行山", description: "巍峨太行，北国雄山" },
	{ id: "qilianshan", name: "祁连山", description: "河西走廊，丝路要冲" },
	{ id: "tianchi", name: "天池", description: "天山明珠，碧波如镜" },
	{ id: "qiankun-gu", name: "乾坤谷", description: "深谷幽壑，乾坤大挪移传承" },
	{ id: "shenlong-dao", name: "神龙岛", description: "神龙教总坛，洪安通居所" },
	{ id: "taihu", name: "太湖", description: "烟波浩渺，归云庄畔" },
	{ id: "dongting-hu", name: "洞庭湖", description: "八百里洞庭，君山丐帮大会" },
	{ id: "junshan", name: "君山", description: "洞庭湖中，丐帮论剑" },
	{ id: "poyang-hu", name: "鄱阳湖", description: "水战之地，群雄争霸" },
	{ id: "changjiang", name: "长江", description: "大江东去，浪淘尽英雄" },
	{ id: "huanghe", name: "黄河", description: "九曲黄河万里沙" },
	{ id: "jinghu", name: "镜湖", description: "水如明镜，阿碧泛舟" },
	{ id: "cangshan", name: "苍山", description: "大理苍山，雪峰入云" },
	{ id: "erhai", name: "洱海", description: "大理洱海，风花雪月" },
	{ id: "nanjiang", name: "南疆", description: "大漠戈壁，胡杨不朽" },
	{ id: "beijiang", name: "北疆", description: "冰天雪地，驯鹿游牧" },
	{ id: "hexi-zoulang", name: "河西走廊", description: "丝路咽喉，敦煌莫高" },
	{ id: "dunhuang", name: "敦煌", description: "千佛洞窟，藏经万卷" },
	{ id: "yumen-guan", name: "玉门关", description: "春风不度，边塞雄关" },
	{ id: "yangguan", name: "阳关", description: "西出阳关无故人" },
	{ id: "jiayu-guan", name: "嘉峪关", description: "天下第一雄关" },
	{ id: "baoji", name: "宝鸡", description: "陈仓古道，暗度之策" },
	{ id: "hanzhong", name: "汉中", description: "蜀道咽喉，兵家必争" },
	{ id: "shu-dao", name: "蜀道", description: "难于上青天，剑阁峥嵘" },
	{ id: "jiange", name: "剑阁", description: "一夫当关，万夫莫开" },
	{ id: "emei-jinding", name: "峨眉金顶", description: "云海佛光，灭绝师太修行" },
	{ id: "qingcheng-shan", name: "青城山", description: "青城天下幽，余沧海据守" },
	{ id: "shushan", name: "蜀山", description: "剑仙传说，云雾缭绕" },
	{ id: "wuyi-shan", name: "武夷山", description: "丹霞碧水，茶香四溢" },
	{ id: "huangshan", name: "黄山", description: "奇松怪石，云海温泉" },
	{ id: "lushan", name: "庐山", description: "飞流直下三千尺" },
	{ id: "jiuhua-shan", name: "九华山", description: "佛教名山，地藏道场" },
	{ id: "putuo-shan", name: "普陀山", description: "海天佛国，观音道场" },
	{ id: "dali-huangcheng", name: "大理皇城", description: "段氏世袭，天龙八部之根" },
	{ id: "tianzhu-si", name: "天竺寺", description: "西域佛国，梵音袅袅" },
	{ id: "bosiy-guo", name: "波斯", description: "明教圣火令来源之地" },
	{ id: "gaoli", name: "高丽", description: "半岛之国，武风亦盛" },
	{ id: "liugiu", name: "琉球", description: "海上仙山，侠客流落" },
	{ id: "nanyang", name: "南洋", description: "碧波万顷，海盗出没" },
	{ id: "fuguimen", name: "鬼门", description: "鬼门关前，生死一线" },
	{ id: "jiuyin-shan", name: "九阴山", description: "阴风阵阵，九阴真经出世" },
	{ id: "duan-chang-ya", name: "断肠崖", description: "十六年后，绝情谷底" },
	{ id: "fairy-cave", name: "仙人洞", description: "洞天福地，秘籍藏于此" },
	{ id: "jianzhong", name: "剑冢", description: "独孤求败埋剑之地" },
	{ id: "huoyan-dong", name: "火焰洞", description: "昆仑山中，烈焰熊熊" },
	{ id: "bingku", name: "冰窟", description: "千年寒冰，寒气逼人" },
	{ id: "zang-jing-ge", name: "藏经阁", description: "少林七十二绝技秘藏之所" },
	{ id: "da-mo-dong", name: "达摩洞", description: "面壁九年，影入石中" },
	{ id: "jinfeng-xi", name: "金风细雨楼", description: "汴京第一酒楼，群侠聚会" },
	{ id: "zui-xian-lou", name: "醉仙楼", description: "嘉兴名楼，七怪赌约" },
	{ id: "fei-hu-wai-chuan-shan", name: "雪山飞狐山", description: "辽东雪山，胡斐追杀之路" },
	{ id: "yuan-yang-dao-cun", name: "鸳鸯刀村", description: "江湖传言鸳鸯宝刀出没之地" },
	{ id: "bai-ma-xi-feng-guan", name: "白马西风关", description: "大漠黄沙，李文秀故乡" },
	{ id: "yue-nv-jian-tai", name: "越女剑台", description: "春秋遗迹，越女剑法传承" },
];

const EVENTS: EventDef[] = [
	{ id: "lu-jian-bu-ping", name: "路见不平", description: "拔刀相助，击败恶人", goldMin: 5, goldMax: 20, xpMin: 10, xpMax: 30 },
	{ id: "cang-bao-tu", name: "藏宝图", description: "偶得藏宝图，寻得宝物", goldMin: 20, goldMax: 80, xpMin: 5, xpMax: 15 },
	{ id: "gao-ren-zhi-dian", name: "偶遇高人", description: "高人指点一二，获益良多", goldMin: 0, goldMax: 10, xpMin: 30, xpMax: 80 },
	{ id: "zhong-du", name: "中毒", description: "误中剧毒，花费金币解毒", goldMin: -30, goldMax: -5, xpMin: 5, xpMax: 15 },
	{ id: "wu-lin-da-hui", name: "武林大会", description: "比武招亲，大展身手", goldMin: 30, goldMax: 100, xpMin: 20, xpMax: 60 },
	{ id: "shang-ren-jiao-yi", name: "行商交易", description: "与西域商人交易，赚取差价", goldMin: 10, goldMax: 50, xpMin: 0, xpMax: 5 },
	{ id: "shan-dong-qi-yu", name: "山洞奇遇", description: "发现隐秘山洞，获得秘宝", goldMin: 0, goldMax: 20, xpMin: 15, xpMax: 50 },
	{ id: "zao-fu-ji", name: "遭受埋伏", description: "山路遇伏，奋力突围", goldMin: -10, goldMax: 5, xpMin: 20, xpMax: 40 },
	{ id: "cha-guan-chuan-wen", name: "茶馆传闻", description: "茶馆听书，获得江湖消息", goldMin: 0, goldMax: 5, xpMin: 5, xpMax: 15 },
	{ id: "jiu-zhu-qi-gai", name: "救助乞丐", description: "施舍银两，乞丐感恩", goldMin: -5, goldMax: 0, xpMin: 10, xpMax: 25 },
	{ id: "cai-yao", name: "采药", description: "山间采药，收获颇丰", goldMin: 5, goldMax: 15, xpMin: 5, xpMax: 10 },
	{ id: "yue-ye-xiu-lian", name: "月夜修炼", description: "月圆之夜，灵气充沛", goldMin: 0, goldMax: 5, xpMin: 30, xpMax: 60 },
	{ id: "tou-xue-wu-gong", name: "偷学武功", description: "暗中窥探高人过招，偷得一招半式", goldMin: 0, goldMax: 5, xpMin: 20, xpMax: 50 },
	{ id: "bi-wu-zhao-qin", name: "比武招亲", description: "穆念慈擂台比武，英雄竞逐", goldMin: 10, goldMax: 50, xpMin: 15, xpMax: 40 },
	{ id: "mi-ji-can-ye", name: "发现秘籍残页", description: "破庙墙缝中发现武功残页", goldMin: 0, goldMax: 10, xpMin: 25, xpMax: 60 },
	{ id: "jiu-ren", name: "解救被困之人", description: "从恶人手中救出无辜百姓", goldMin: 5, goldMax: 30, xpMin: 15, xpMax: 35 },
	{ id: "bei-ren-pian", name: "被人欺骗", description: "假扮高人的骗子骗走了银两", goldMin: -30, goldMax: -5, xpMin: 5, xpMax: 15 },
	{ id: "jian-he-qi-shi", name: "剑河奇石", description: "河滩上捡到一块玄铁奇石", goldMin: 10, goldMax: 40, xpMin: 5, xpMax: 15 },
	{ id: "qie-qu-bao-wu", name: "夜探宝库", description: "潜入富贵人家，窃得财物", goldMin: 20, goldMax: 80, xpMin: 10, xpMax: 25 },
	{ id: "zhao-yao-zhan-mo", name: "斩妖除魔", description: "遇上邪派弟子作恶，将其击退", goldMin: 5, goldMax: 25, xpMin: 20, xpMax: 45 },
	{ id: "bi-jian-lun-dao", name: "比剑论道", description: "与路过的剑客切磋武艺", goldMin: 0, goldMax: 10, xpMin: 20, xpMax: 40 },
	{ id: "shan-zhong-mi-jing", name: "山中迷径", description: "误入深山密林，偶然发现隐秘山洞", goldMin: 0, goldMax: 15, xpMin: 10, xpMax: 30 },
	{ id: "he-shui-meng-zhu", name: "河水猛涨", description: "山洪暴发，紧急逃生", goldMin: -20, goldMax: -5, xpMin: 10, xpMax: 20 },
	{ id: "qiang-jie-shang-ren", name: "护卫商队", description: "商队遭劫，挺身而出护送到底", goldMin: 15, goldMax: 50, xpMin: 10, xpMax: 30 },
	{ id: "gu-mu-xiu-lian", name: "古墓修炼", description: "进入荒废古墓，静心修炼内功", goldMin: 0, goldMax: 5, xpMin: 30, xpMax: 70 },
	{ id: "meng-gu-she-diao", name: "弯弓射雕", description: "在草原上射落雄鹰，大汗赞赏", goldMin: 5, goldMax: 20, xpMin: 10, xpMax: 25 },
	{ id: "xing-xiu-yao-guai", name: "星宿老怪", description: "丁春秋弟子出没，被迫交手", goldMin: -15, goldMax: 10, xpMin: 15, xpMax: 40 },
	{ id: "sha-hei-dian", name: "夜袭黑店", description: "发现黑店，与黑店老板恶斗", goldMin: 10, goldMax: 35, xpMin: 15, xpMax: 35 },
	{ id: "xue-zhong-song-tan", name: "雪中送炭", description: "大雪封山，救助迷路行商", goldMin: -5, goldMax: 0, xpMin: 15, xpMax: 30 },
	{ id: "si-da-huai-ren", name: "遇上四大恶人", description: "段延庆等人拦路，险象环生", goldMin: -40, goldMax: -10, xpMin: 20, xpMax: 50 },
	{ id: "gu-dao-qiu-sheng", name: "孤岛求生", description: "漂流至荒岛，自力更生", goldMin: -10, goldMax: 0, xpMin: 20, xpMax: 45 },
	{ id: "zhen-jing-bao-tu", name: "争夺宝图", description: "各路豪杰争夺藏宝图，混战一场", goldMin: -20, goldMax: 30, xpMin: 15, xpMax: 40 },
	{ id: "jiao-hua-yi-shi", name: "叫花鸡盛宴", description: "洪七公传授降龙十八掌要诀", goldMin: 0, goldMax: 10, xpMin: 40, xpMax: 80 },
	{ id: "zhen-jing-bi-jiu", name: "争经比酒", description: "与全真道士赌酒论道", goldMin: -10, goldMax: 15, xpMin: 10, xpMax: 30 },
	{ id: "tong-meng-luan-dao", name: "江湖帮派械斗", description: "江湖帮派械斗，卷入其中", goldMin: -15, goldMax: 20, xpMin: 15, xpMax: 35 },
	{ id: "shao-lin-shi-ta", name: "少林石塔", description: "在少林石塔中发现武功壁画", goldMin: 0, goldMax: 5, xpMin: 25, xpMax: 55 },
	{ id: "wu-dang-lun-jian", name: "武当论剑", description: "与武当弟子切磋太极剑法", goldMin: 0, goldMax: 10, xpMin: 20, xpMax: 45 },
	{ id: "emei-shou-jing", name: "峨眉守经", description: "协助峨眉弟子守护经书", goldMin: 5, goldMax: 20, xpMin: 15, xpMax: 35 },
	{ id: "hua-shan-lun-jian", name: "华山论剑", description: "恰逢华山论剑，观摩绝顶高手过招", goldMin: 0, goldMax: 5, xpMin: 50, xpMax: 100 },
	{ id: "hei-mu-ya-zhi-zhan", name: "黑木崖之战", description: "潜入黑木崖，目睹神教内斗", goldMin: -25, goldMax: 15, xpMin: 25, xpMax: 55 },
	{ id: "ming-jiao-qi-yi", name: "明教起义", description: "加入明教义军，攻城拔寨", goldMin: 10, goldMax: 60, xpMin: 20, xpMax: 50 },
	{ id: "xi-xia-gong-zhu", name: "西夏驸马", description: "西夏招亲大会，一试身手", goldMin: 30, goldMax: 100, xpMin: 15, xpMax: 40 },
	{ id: "tian-long-si-bi-jian", name: "天龙寺比剑", description: "天龙寺高僧以六脉神剑相试", goldMin: 0, goldMax: 10, xpMin: 30, xpMax: 65 },
	{ id: "xiang-yang-shou-cheng", name: "襄阳守城", description: "蒙古大军压境，协助守城", goldMin: 20, goldMax: 80, xpMin: 30, xpMax: 60 },
	{ id: "gui-yun-zhuang-qi-yu", name: "归云庄奇遇", description: "太湖归云庄中遇到前辈高人", goldMin: 5, goldMax: 20, xpMin: 20, xpMax: 50 },
	{ id: "tie-zhang-pi-shi", name: "铁掌劈石", description: "铁掌峰上习得铁掌功皮毛", goldMin: 0, goldMax: 5, xpMin: 20, xpMax: 45 },
	{ id: "tai-hu-lun-jian", name: "太湖论剑", description: "太湖畔群豪比武，一展身手", goldMin: 10, goldMax: 40, xpMin: 15, xpMax: 35 },
	{ id: "dong-ting-shui-zhan", name: "洞庭水战", description: "洞庭湖上水战，刀光剑影", goldMin: -20, goldMax: 25, xpMin: 20, xpMax: 45 },
	{ id: "chang-jiang-du-he", name: "长江渡河", description: "渡河时遭遇水匪袭击", goldMin: -15, goldMax: 10, xpMin: 10, xpMax: 30 },
	{ id: "huang-he-jue-dou", name: "黄河决斗", description: "黄河岸边与仇家决一死战", goldMin: -25, goldMax: 30, xpMin: 20, xpMax: 50 },
	{ id: "si-guo-ya-wu-gong", name: "思过崖发现武功", description: "在思过崖石壁上发现五岳剑法", goldMin: 0, goldMax: 5, xpMin: 35, xpMax: 75 },
	{ id: "du-gu-qiu-bai-jian-zhong", name: "剑冢寻剑", description: "独孤求败剑冢中寻得玄铁重剑", goldMin: 0, goldMax: 10, xpMin: 40, xpMax: 80 },
	{ id: "yao-wang-gu-cai-yao", name: "药王谷采药", description: "在药王谷中寻得珍稀药材", goldMin: 10, goldMax: 40, xpMin: 10, xpMax: 25 },
	{ id: "bai-hua-gu-mi-feng", name: "百花谷遇蜂", description: "玉蜂群起攻之，狼狈而逃", goldMin: -10, goldMax: 0, xpMin: 5, xpMax: 15 },
	{ id: "mei-zhuang-bi-jian", name: "梅庄比剑", description: "与江南四友比剑，大获全胜", goldMin: 10, goldMax: 35, xpMin: 25, xpMax: 55 },
	{ id: "xi-hu-yue-ye", name: "西湖月夜", description: "月夜泛舟西湖，心境空明", goldMin: 0, goldMax: 5, xpMin: 15, xpMax: 35 },
	{ id: "bing-huo-dao-liu-luo", name: "冰火岛奇遇", description: "海上漂流至火山岛，发现奇珍", goldMin: 5, goldMax: 30, xpMin: 15, xpMax: 40 },
	{ id: "wang-pan-shan-yang-dao", name: "王盘山扬刀", description: "屠龙刀现世，群雄争夺", goldMin: -30, goldMax: 50, xpMin: 20, xpMax: 50 },
	{ id: "tian-chi-qi-yu", name: "天池奇遇", description: "天池边打坐，顿悟内功心法", goldMin: 0, goldMax: 5, xpMin: 30, xpMax: 65 },
	{ id: "long-men-kezhan-qi-yu", name: "龙门客栈风云", description: "大漠龙门客栈中卷入江湖恩怨", goldMin: -20, goldMax: 30, xpMin: 15, xpMax: 40 },
	{ id: "da-mo-mian-bi", name: "达摩面壁", description: "在达摩洞中静坐参悟，心有所得", goldMin: 0, goldMax: 5, xpMin: 35, xpMax: 75 },
	{ id: "zang-jing-ge-tou-shu", name: "藏经阁偷书", description: "夜潜少林藏经阁，盗得武功秘籍", goldMin: 0, goldMax: 15, xpMin: 30, xpMax: 65 },
	{ id: "quan-zhen-nei-gong", name: "全真内功心法", description: "偶遇全真道人传授内功要诀", goldMin: 0, goldMax: 5, xpMin: 25, xpMax: 55 },
	{ id: "qiao-feng-da-hui", name: "乔峰打虎", description: "与乔峰并肩作战击退猛兽", goldMin: 5, goldMax: 20, xpMin: 25, xpMax: 55 },
	{ id: "xu-zhu-po-zhen", name: "虚竹破珍珑", description: "破解珍珑棋局，获得无崖子传功", goldMin: 0, goldMax: 10, xpMin: 50, xpMax: 100 },
	{ id: "duan-yu-xi-xue", name: "段誉吸功", description: "无意中触发北冥神功，吸人内力", goldMin: 0, goldMax: 5, xpMin: 30, xpMax: 60 },
	{ id: "ling-hu-chong-chuan-jian", name: "令狐冲传剑", description: "风清扬现身传授独孤九剑", goldMin: 0, goldMax: 5, xpMin: 45, xpMax: 90 },
	{ id: "zhang-wuji-xue-yi", name: "张无忌学医", description: "蝴蝶谷中学习医术，妙手回春", goldMin: 5, goldMax: 20, xpMin: 15, xpMax: 35 },
	{ id: "guo-jing-xue-gong", name: "郭靖学武", description: "江南七怪联手传授外家功夫", goldMin: 0, goldMax: 10, xpMin: 20, xpMax: 50 },
	{ id: "yang-guo-duan-bi", name: "杨过断臂奇遇", description: "悲愤中悟出黯然销魂掌", goldMin: 0, goldMax: 5, xpMin: 40, xpMax: 85 },
	{ id: "huang-rong-po-zhen", name: "黄蓉破阵", description: "协助黄蓉破解桃花岛阵法", goldMin: 10, goldMax: 30, xpMin: 20, xpMax: 45 },
	{ id: "ou-yang-feng-fa-kuang", name: "欧阳锋发狂", description: "逆练九阴真经走火入魔的欧阳锋突然出现", goldMin: -20, goldMax: 15, xpMin: 15, xpMax: 40 },
	{ id: "huang-ya-shi-shi-cao", name: "黄药师试招", description: "桃花岛主亲自试招，受益匪浅", goldMin: 0, goldMax: 10, xpMin: 30, xpMax: 60 },
	{ id: "yi-deng-da-shi-zhi-shang", name: "一灯大师治伤", description: "受重伤后被一灯大师以一阳指救治", goldMin: -10, goldMax: 0, xpMin: 15, xpMax: 35 },
	{ id: "zhou-bo-tong-dao-luan", name: "老顽童捣乱", description: "周伯通纠缠比试，左右互搏", goldMin: 0, goldMax: 5, xpMin: 20, xpMax: 45 },
	{ id: "hong-qi-gong-chi-ji", name: "洪七公吃鸡", description: "以叫花鸡换取降龙十八掌一招", goldMin: -5, goldMax: 0, xpMin: 25, xpMax: 55 },
	{ id: "dong-fang-bu-bai", name: "遭遇东方不败", description: "东方不败以绣花针力战群雄", goldMin: -40, goldMax: 10, xpMin: 30, xpMax: 65 },
	{ id: "ren-wo-xing-xi-na", name: "任我行吸星", description: "任我行以吸星大法吸取内力", goldMin: -20, goldMax: 0, xpMin: 15, xpMax: 40 },
	{ id: "xie-xun-fa-feng", name: "谢逊发狂", description: "金毛狮王发狂，大杀四方", goldMin: -30, goldMax: 5, xpMin: 20, xpMax: 50 },
	{ id: "wei-xiao-bao-du", name: "韦小宝赌钱", description: "与韦小宝掷骰子赌银子", goldMin: -30, goldMax: 50, xpMin: 0, xpMax: 10 },
	{ id: "chen-jia-luo-fan-qing", name: "陈家洛反清", description: "红花会群雄密谋反清复明", goldMin: 10, goldMax: 40, xpMin: 15, xpMax: 35 },
	{ id: "di-long-dian-nao", name: "地牢脱困", description: "被困地牢，以内力震断锁链", goldMin: -5, goldMax: 10, xpMin: 20, xpMax: 45 },
	{ id: "an-qi-ming-pai", name: "暗器名家", description: "偶遇暗器高手，习得暗器手法", goldMin: 0, goldMax: 10, xpMin: 15, xpMax: 40 },
	{ id: "shen-bing-chu-shi", name: "神兵出世", description: "铁匠铺中亲眼见证绝世宝剑铸造", goldMin: -20, goldMax: 0, xpMin: 10, xpMax: 30 },
	{ id: "mi-lin-zhui-sha", name: "密林追杀", description: "被仇家追杀入密林，九死一生", goldMin: -25, goldMax: 5, xpMin: 20, xpMax: 45 },
	{ id: "gu-dao-chuan-gong", name: "高人传功", description: "垂死高人临终前传授毕生功力", goldMin: 0, goldMax: 5, xpMin: 40, xpMax: 90 },
	{ id: "du-quan-jiao-dou", name: "毒犬夹攻", description: "恶人放出毒犬围攻", goldMin: -15, goldMax: 5, xpMin: 10, xpMax: 25 },
	{ id: "yi-rong-shu", name: "习得易容术", description: "偶遇江湖术士，学会易容术", goldMin: 0, goldMax: 5, xpMin: 10, xpMax: 25 },
	{ id: "da-si-bu-tou", name: "打探消息", description: "在酒馆打探到有价值的江湖消息", goldMin: -5, goldMax: 0, xpMin: 5, xpMax: 15 },
	{ id: "she-shen-jiu-ren", name: "舍身救人", description: "从悬崖边救回落难少女", goldMin: -10, goldMax: 5, xpMin: 15, xpMax: 35 },
	{ id: "wu-gong-qie-cuo", name: "武林切磋", description: "与各派弟子友好切磋，互相学习", goldMin: 0, goldMax: 10, xpMin: 15, xpMax: 35 },
	{ id: "jing-biao-hu-song", name: "镖局护送", description: "接受镖局委托，押送货物", goldMin: 15, goldMax: 60, xpMin: 10, xpMax: 30 },
	{ id: "shan-dao-jie-dao", name: "山盗截道", description: "山路遇劫匪，奋力抵抗", goldMin: -25, goldMax: 10, xpMin: 15, xpMax: 35 },
	{ id: "pu-sa-youshan", name: "菩萨保佑", description: "寺庙上香后好运连连", goldMin: 5, goldMax: 25, xpMin: 5, xpMax: 15 },
	{ id: "jiang-hu-zhui-sha-ling", name: "江湖追杀令", description: "被人悬赏追杀，四处逃亡", goldMin: -40, goldMax: -10, xpMin: 15, xpMax: 35 },
	{ id: "qi-men-dun-jia", name: "奇门遁甲", description: "误入奇门阵法，费尽心力破阵而出", goldMin: -10, goldMax: 5, xpMin: 20, xpMax: 50 },
	{ id: "long-quan-bao-jian", name: "龙泉宝剑", description: "在铸剑谷觅得一把上好宝剑", goldMin: -15, goldMax: 0, xpMin: 10, xpMax: 25 },
	{ id: "ye-zhan-qun-lang", name: "夜战群狼", description: "雪原上遭遇狼群围攻", goldMin: -15, goldMax: 5, xpMin: 15, xpMax: 40 },
	{ id: "du-jing-wu-dao", name: "毒经悟道", description: "研读毒经，领悟以毒攻毒之法", goldMin: 0, goldMax: 10, xpMin: 20, xpMax: 50 },
	{ id: "shan-chuan-xing-lv", name: "山川行旅", description: "翻山越岭，体魄日益强健", goldMin: 0, goldMax: 5, xpMin: 10, xpMax: 25 },
	{ id: "gu-dao-chuan-qi", name: "孤岛传奇", description: "在无人海洞中发现前朝高人遗物", goldMin: 10, goldMax: 50, xpMin: 15, xpMax: 40 },
	{ id: "qian-ceng-ta-shi", name: "千层塔试炼", description: "登上千层石塔顶端，获得传承", goldMin: 5, goldMax: 20, xpMin: 30, xpMax: 65 },
	{ id: "wu-ming-lao-ren", name: "无名老人", description: "路旁无名老翁竟是隐世高手", goldMin: 0, goldMax: 10, xpMin: 25, xpMax: 55 },
	{ id: "bing-xue-qi-yuan", name: "冰雪奇缘", description: "冰窟中发现千年寒玉，修炼事半功倍", goldMin: 0, goldMax: 5, xpMin: 30, xpMax: 70 },
	{ id: "yi-jing-jing-can-ye", name: "易筋经残页", description: "在废墟中发现易筋经残页", goldMin: 0, goldMax: 5, xpMin: 35, xpMax: 75 },
	{ id: "mo-ya-shi-bi", name: "摩崖石壁", description: "悬崖石壁上刻有上乘武功图谱", goldMin: 0, goldMax: 5, xpMin: 25, xpMax: 55 },
	{ id: "shaolin-seng-bing", name: "少林僧兵", description: "协助少林武僧巡逻，击退山贼", goldMin: 5, goldMax: 25, xpMin: 15, xpMax: 35 },
	{ id: "tai-chi-quan-wu", name: "太极拳悟", description: "观张三丰打太极，若有所悟", goldMin: 0, goldMax: 5, xpMin: 30, xpMax: 60 },
	{ id: "hei-feng-shuang-sha", name: "黑风双煞", description: "遭遇铜尸铁尸，凶险万分", goldMin: -35, goldMax: -10, xpMin: 20, xpMax: 45 },
	{ id: "xiang-long-shi-ba-zhang", name: "降龙十八掌", description: "洪七公心情大好，传授一掌", goldMin: 0, goldMax: 5, xpMin: 35, xpMax: 75 },
	{ id: "liu-mai-shen-jian", name: "六脉神剑", description: "天龙寺中偶见六脉神剑残谱", goldMin: 0, goldMax: 5, xpMin: 30, xpMax: 65 },
	{ id: "xuan-ming-er-lao", name: "玄冥二老", description: "玄冥神掌寒毒入体，耗费银两求医", goldMin: -50, goldMax: -15, xpMin: 15, xpMax: 40 },
];

export function getLocation(): LocationDef {
	return LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]!;
}
export function getEvent(): EventDef {
	return EVENTS[Math.floor(Math.random() * EVENTS.length)]!;
}

/** 生成一次江湖遭遇（100% 触发） */
export function generateEncounter(level: number, equippedWeaponAtk: number, currentHp: number, maxHp: number): DropResult {
	const loc = getLocation();
	const evt = getEvent();
	const gold = Math.floor(evt.goldMin + Math.random() * (evt.goldMax - evt.goldMin));
	const xp = Math.floor(evt.xpMin + Math.random() * (evt.xpMax - evt.xpMin));

	const roll = Math.random();
	const playerPower = level * 3 + equippedWeaponAtk + Math.floor(currentHp / 10);

	// 30% 遭遇角色
	if (roll < 0.30) {
		const char = getRandomCharacterName();
		const friendly = Math.random() > 0.4;
		if (friendly) {
			// 友好遭遇：切磋、指点、赠送
			const subRoll = Math.random();
			if (subRoll < 0.4) {
				// 切磋武艺
				const xpGain = 10 + Math.floor(Math.random() * 30) + level * 2;
				return { type: "encounter", location: loc.name, name: `📍${loc.name} · 遇见${char}`,
					description: `${char}邀请你切磋武艺，双方过招数回合，获益良多`,
					xpAmount: xpGain, goldAmount: 0, encounterChar: char };
				} else if (subRoll < 0.7) {
					// 赠送银两
					const goldGift = 5 + Math.floor(Math.random() * 20) + level;
					return { type: "encounter", location: loc.name, name: `📍${loc.name} · ${char}赠银`,
					description: `${char}见你行走江湖不易，赠予${goldGift}两白银`,
					xpAmount: 5, goldAmount: goldGift, encounterChar: char };
				} else {
					// 指点武功
					const xpGain = 20 + Math.floor(Math.random() * 40) + level * 3;
					return { type: "encounter", location: loc.name, name: `📍${loc.name} · ${char}指点`,
					description: `${char}见你根骨不错，指点了一招半式，顿觉功力精进`,
					xpAmount: xpGain, goldAmount: 0, encounterChar: char };
				}
		} else {
			// 敌对遭遇 → 战斗
			const enemyPower = Math.max(5, playerPower + Math.floor((Math.random() - 0.3) * playerPower * 0.5));
			const win = playerPower + Math.random() * playerPower * 0.5 >= enemyPower;
			if (win) {
				const goldLoot = 5 + Math.floor(Math.random() * 25) + level * 2;
				const xpGain = 15 + Math.floor(Math.random() * 30) + level * 2;
				const hpLoss = Math.floor(Math.random() * maxHp * 0.15) + 1;
				return { type: "battle", location: loc.name, name: `⚔️${loc.name} · 战${char}`,
					description: `${char}拦路挑衅！激战数合，你使出看家本领将其击退`,
					xpAmount: xpGain, goldAmount: goldLoot, battleResult: "win", hpChange: -hpLoss, encounterChar: char };
			} else {
				const hpLoss = Math.floor(Math.random() * maxHp * 0.25) + 1;
				const goldLoss = Math.min(Math.floor(Math.random() * 15) + 5, level * 2);
				return { type: "battle", location: loc.name, name: `⚔️${loc.name} · 战${char}败`,
					description: `${char}武功高强，你招架不住，负伤败退`,
					xpAmount: 5, goldAmount: -goldLoss, battleResult: "lose", hpChange: -hpLoss, encounterChar: char };
			}
		}
	}

	// 20% 江湖事件（纯事件）
	if (roll < 0.50) {
		return { type: "event", location: loc.name, name: `📍${loc.name} · ${evt.name}`,
			description: `${loc.description}——${evt.description}`,
			goldAmount: gold, xpAmount: xp };
	}

	// 10% 武功秘籍掉落（需要 Lv.5+）
	if (roll < 0.60 && level >= 5) {
		const skill = SKILL_POOL[Math.floor(Math.random() * SKILL_POOL.length)]!;
		return { type: "skill_scroll", name: `📜${skill.name}秘籍`,
			description: `${skill.description} · ${ELEMENT_SYMBOL[skill.element]}${skill.element}`,
			skillScrollId: skill.id, xpAmount: 0, goldAmount: 0 };
	}

	// 10% 武器掉落
	if (roll < 0.70) {
		const candidates = WEAPON_DEFS.filter(w => {
			if (w.rarity === "凡品") return level >= 1;
			if (w.rarity === "良品") return level >= 5;
			if (w.rarity === "精品") return level >= 15;
			if (w.rarity === "极品") return level >= 30;
			if (w.rarity === "神器") return level >= 50;
			return false;
		});
		if (candidates.length > 0) {
			const weapon = candidates[Math.floor(Math.random() * candidates.length)]!;
			return { type: "weapon", name: `${getRaritySymbol(weapon.rarity)}${weapon.name}`,
				description: `${weapon.rarity} · ${ELEMENT_SYMBOL[weapon.element]}${weapon.element} · 攻+${weapon.attack}`,
				weaponId: weapon.id, xpAmount: 0, goldAmount: 0 };
		}
	}

	// 15% 道具掉落
	if (roll < 0.85) {
		const item = ITEM_DEFS[Math.floor(Math.random() * ITEM_DEFS.length)]!;
		return { type: "item", name: item.name, description: item.description,
			itemId: item.id, xpAmount: 0, goldAmount: 0 };
	}

	// 15% 金币掉落
	const amount = Math.floor(5 + Math.random() * (10 + level * 2));
	return { type: "gold", name: `${amount} 金币`, description: `路遇散落银两`, goldAmount: amount };
}

/** 获取随机角色名（从 100 个角色中随机选） */
const _CHAR_NAMES: string[] = [
	"胡斐", "苗若兰", "程灵素", "苗人凤", "袁紫衣", "马春花",
	"胡一刀", "田归农",
	"狄云", "丁典", "水笙", "戚芳",
	"萧峰", "段誉", "虚竹", "王语嫣", "阿朱", "阿紫", "慕容复", "段正淳",
	"鸠摩智", "木婉清", "钟灵", "游坦之", "天山童姥", "李秋水",
	"郭靖", "黄蓉", "洪七公", "黄药师", "欧阳锋", "周伯通", "杨康", "穆念慈",
	"包惜弱", "瑛姑", "华筝", "哲别", "拖雷", "梅超风", "江南七怪柯镇恶",
	"李文秀",
	"韦小宝", "康熙", "陈近南", "阿珂", "双儿", "沐剑屏", "曾柔", "建宁公主", "苏荃", "方怡",
	"令狐冲", "任盈盈", "东方不败", "岳不群", "风清扬", "林平之", "岳灵珊",
	"左冷禅", "任我行", "向问天",
	"陈家洛", "霍青桐", "香香公主", "文泰来",
	"杨过", "小龙女", "郭襄", "郭芙", "李莫愁", "金轮法王", "陆无双", "程英",
	"公孙止", "耶律齐",
	"石破天", "丁珰", "白阿绣",
	"张无忌", "赵敏", "周芷若", "张三丰", "杨逍", "范遥", "殷天正", "谢逊",
	"韦一笑", "小昭", "殷离", "成昆", "宋远桥", "何足道", "殷素素",
	"袁承志", "温青青", "阿九", "夏雪宜",
	"萧半和", "阿青",
];
function getRandomCharacterName(): string {
	return _CHAR_NAMES[Math.floor(Math.random() * _CHAR_NAMES.length)]!;
}

