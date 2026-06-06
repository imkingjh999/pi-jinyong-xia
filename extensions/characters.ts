/**
 * 金庸小说人物
 * 28 个金庸经典角色，主要头像来自 Q 版金庸群侠传 (huaidan.org)
 */

export type Mood = "idle" | "thinking" | "working" | "talking" | "happy" | "angry" | "hurt" | "meditating" | "training" | "sleeping";

export interface Character {
	id: string;
	name: string;
	novel: string;
	title: string;
	description: string;
	compact: string[];
	avatarFile: string;
	exclusiveSkills: string[];
}

export const CHARACTERS: Character[] = [
	// ── 天龙八部 ──
	{ id: "murong-fu", name: "慕容复", novel: "天龙八部", title: "南慕容", description: "姑苏慕容氏，以彼之道还施彼身，复国大梦一生执念", compact: ["  │🎭│  南慕容·慕容复", "  ╰┬┬╯  斗转星移"], avatarFile: "慕容复.png", exclusiveSkills: ["douzhuan"] },
	{ id: "wang-yuyan", name: "王语嫣", novel: "天龙八部", title: "神仙姐姐", description: "熟读天下武学典籍，虽不会武功却能指点乾坤", compact: ["  │🌸│  神仙姐姐·王语嫣", "  ╰┬┬╯  武学活典"], avatarFile: "王语嫣.png", exclusiveSkills: ["wuxue-dianpin"] },
	{ id: "duan-yu", name: "段誉", novel: "天龙八部", title: "大理世子", description: "大理国王子，天真浪漫，以仁心行侠仗义", compact: ["  │🤴│  段誉", "  ╰┬┬╯  六脉神剑"], avatarFile: "段誉.png", exclusiveSkills: ["liumai", "lingbo"] },
	{ id: "xiao-feng", name: "萧峰", novel: "天龙八部", title: "丐帮帮主", description: "义薄云天，豪气干云，天下第一英雄", compact: ["  │🔥│  萧峰", "  ╰┬┬╯  降龙十八掌"], avatarFile: "萧峰.png", exclusiveSkills: ["xianglong", "dagou"] },
	{ id: "a-zhu", name: "阿朱", novel: "天龙八部", title: "慕容侍婢", description: "聪慧灵巧，善解人意，冰雪聪明", compact: ["  │🎭│  阿朱", "  ╰┬┬╯  冰雪聪明"], avatarFile: "阿朱.png", exclusiveSkills: ["bingxue"] },
	// ── 射雕英雄传 ──
	{ id: "guo-jing", name: "郭靖", novel: "射雕英雄传", title: "北侠", description: "忠厚老实，为国为民，侠之大者", compact: ["  │🐉│  郭靖", "  ╰┬┬╯  降龙十八掌"], avatarFile: "郭靖.png", exclusiveSkills: ["xianglong", "jiuyin"] },
	{ id: "huang-rong", name: "黄蓉", novel: "射雕英雄传", title: "丐帮帮主", description: "桃花岛主之女，聪慧绝顶，丐帮女帮主", compact: ["  │🌸│  黄蓉", "  ╰┬┬╯  打狗棒法"], avatarFile: "黄蓉.png", exclusiveSkills: ["dagou", "bihai"] },
	{ id: "hong-qi-gong", name: "洪七公", novel: "射雕英雄传", title: "北丐", description: "丐帮帮主，嫉恶如仇，嗜吃如命", compact: ["  │🍗│  洪七公", "  ╰┬┬╯  降龙十八掌"], avatarFile: "洪七公.png", exclusiveSkills: ["xianglong", "dagou"] },
	{ id: "zhou-botong", name: "周伯通", novel: "射雕英雄传", title: "老顽童", description: "天真烂漫，嗜武如命，左右互搏自得其乐", compact: ["  │🎮│  周伯通", "  ╰┬┬╯  左右互搏"], avatarFile: "周伯通.png", exclusiveSkills: ["zuoyou"] },
	{ id: "yang-kang", name: "杨康", novel: "射雕英雄传", title: "金国小王爷", description: "聪慧俊朗，认贼作父，亦正亦邪", compact: ["  │🐺│  杨康", "  ╰┬┬╯  九阴白骨爪"], avatarFile: "杨康.png", exclusiveSkills: ["jiuyin-zhuazhao"] },
	{ id: "ying-gu", name: "瑛姑", novel: "射雕英雄传", title: "刘瑛", description: "大理段智兴之妃，因丧子之痛性情大变", compact: ["  │🖤│  瑛姑", "  ╰┬┬╯  泥沼遁术"], avatarFile: "瑛姑.png", exclusiveSkills: ["nizhao"] },
	// ── 神雕侠侣 ──
	{ id: "yang-guo", name: "杨过", novel: "神雕侠侣", title: "神雕大侠", description: "至情至性，亦狂亦侠，西狂之名震天下", compact: ["  │🦅│  杨过", "  ╰┬┬╯  黯然销魂掌"], avatarFile: "杨过.png", exclusiveSkills: ["anran", "dugu"] },
	{ id: "xiaolongnv", name: "小龙女", novel: "神雕侠侣", title: "古墓派传人", description: "冰肌玉骨，清冷如仙，不染凡尘", compact: ["  │❄️│  小龙女", "  ╰┬┬╯  玉女心经"], avatarFile: "小龙女.png", exclusiveSkills: ["yirong"] },
	{ id: "guo-xiang", name: "郭襄", novel: "神雕侠侣", title: "小东邪", description: "郭靖之女，豪爽磊落，后创峨眉派", compact: ["  │🌟│  郭襄", "  ╰┬┬╯  峨眉剑法"], avatarFile: "郭襄.png", exclusiveSkills: ["eymei-jianfa"] },
	// ── 倚天屠龙记 ──
	{ id: "zhang-wuji", name: "张无忌", novel: "倚天屠龙记", title: "明教教主", description: "天赋异禀，机缘巧合集九阳神功与乾坤大挪移于一身", compact: ["  │☯️│  张无忌", "  ╰┬┬╯  乾坤大挪移"], avatarFile: "张无忌.png", exclusiveSkills: ["qiankun", "jiuyang"] },
	{ id: "zhao-min", name: "赵敏", novel: "倚天屠龙记", title: "汝阳王郡主", description: "聪明机敏，雄才大略，不让须眉", compact: ["  │👑│  赵敏", "  ╰┬┬╯  谋略无双"], avatarFile: "赵敏.png", exclusiveSkills: ["moulue"] },
	{ id: "zhou-zhiruo", name: "周芷若", novel: "倚天屠龙记", title: "峨眉派掌门", description: "清丽脱俗，后习九阴白骨爪，亦正亦邪", compact: ["  │🌙│  周芷若", "  ╰┬┬╯  九阴白骨爪"], avatarFile: "周芷若.png", exclusiveSkills: ["jiuyin-zhuazhao", "eymei-jianfa"] },
	{ id: "yang-xiao", name: "杨逍", novel: "倚天屠龙记", title: "明教光明左使", description: "风流倜傥，文武双全，弹指神通惊天下", compact: ["  │⚡│  杨逍", "  ╰┬┬╯  弹指神通"], avatarFile: "杨逍.png", exclusiveSkills: ["tanzhi"] },
	// ── 笑傲江湖 ──
	{ id: "linghu-chong", name: "令狐冲", novel: "笑傲江湖", title: "恒山派掌门", description: "放荡不羁，嗜酒如命，以剑证道", compact: ["  │⚔️│  令狐冲", "  ╰┬┬╯  独孤九剑"], avatarFile: "令狐冲.png", exclusiveSkills: ["dugu"] },
	{ id: "ren-yingying", name: "任盈盈", novel: "笑傲江湖", title: "日月神教圣姑", description: "琴艺绝伦，温柔深情，令狐冲挚爱", compact: ["  │🎵│  任盈盈", "  ╰┬┬╯  琴音化剑"], avatarFile: "任盈盈.png", exclusiveSkills: ["qinyin"] },
	// ── 鹿鼎记 ──
	{ id: "wei-xiaobao", name: "韦小宝", novel: "鹿鼎记", title: "鹿鼎公", description: "机灵狡诈，七窍玲珑，周旋于各方势力之间", compact: ["  │🦊│  韦小宝", "  ╰┬┬╯  化骨绵掌"], avatarFile: "韦小宝.png", exclusiveSkills: ["huagu"] },
	{ id: "chen-jinnan", name: "陈近南", novel: "鹿鼎记", title: "天地会总舵主", description: "反清复明，忠义两全，武艺高强", compact: ["  │🗡️│  陈近南", "  ╰┬┬╯  凝碧剑法"], avatarFile: "陈近南.png", exclusiveSkills: ["ningbi"] },
	// ── 飞狐外传 ──
	{ id: "hu-fei", name: "胡斐", novel: "飞狐外传", title: "飞狐", description: "胡一刀之子，侠义心肠，刀法凌厉", compact: ["  │🗡️│  胡斐", "  ╰┬┬╯  胡家刀法"], avatarFile: "胡斐.png", exclusiveSkills: ["hujiadao"] },
	{ id: "miao-ruolan", name: "苗若兰", novel: "飞狐外传", title: "苗人凤之女", description: "大家闺秀，温婉端庄，宛如空谷幽兰", compact: ["  │🌺│  苗若兰", "  ╰┬┬╯  兰心蕙质"], avatarFile: "苗若兰.png", exclusiveSkills: ["lanxin"] },
	// ── 其他 ──
	{ id: "mu-nianci", name: "穆念慈", novel: "射雕英雄传", title: "杨康之妻", description: "外柔内刚，痴情不悔，一生悲苦", compact: ["  │💐│  穆念慈", "  ╰┬┬╯  杨家枪法"], avatarFile: "穆念慈.png", exclusiveSkills: ["yangjia-qiang"] },
];

export const CHARACTER_MAP = new Map(CHARACTERS.map(c => [c.id, c]));

export function getCharacter(id: string): Character | undefined {
	return CHARACTER_MAP.get(id);
}

const MOOD_TEXTS: Record<Mood, string> = {
	idle: "闲庭信步", thinking: "运功打坐 🧘", working: "修炼武功 💪", talking: "谈笑风生",
	happy: "心旷神怡 😊", angry: "怒发冲冠 😤", hurt: "身受内伤 🩸", meditating: "闭关修炼 🏔️",
	training: "勤练不辍 ⚔️", sleeping: "沉沉睡去 💤",
};

export function getMoodText(mood: Mood): string {
	return MOOD_TEXTS[mood] || "闲庭信步";
}
