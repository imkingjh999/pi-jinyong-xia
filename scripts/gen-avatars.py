#!/usr/bin/env python3
"""Batch generate Jin Yong character avatars using MiniMax image-01 API."""

import json, os, sys, time, urllib.request, urllib.error

API_KEY = os.environ.get("MINIMAX_API_KEY", "")
if not API_KEY:
    # Try loading from ~/.zshrc
    with open(os.path.expanduser("~/.zshrc")) as f:
        for line in f:
            if "MINIMAX_API_KEY" in line and "export" in line:
                API_KEY = line.split('="')[1].rstrip('"\n')
                break
if not API_KEY:
    print("ERROR: MINIMAX_API_KEY not found"); sys.exit(1)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "avatars-q")
os.makedirs(OUTPUT_DIR, exist_ok=True)

STYLE = "2D flat illustration, chibi Q-version cute portrait, pure 2D flat vector art style, no shading no 3D rendering, bold clean outlines, flat cel-shaded colors, cute chibi proportions with big head and small body, clean white background, high quality 2D anime illustration"

# 100 Jin Yong characters: (name, novel, appearance description for prompt)
CHARACTERS = [
    # ── 飞狐外传 ──
    ("胡斐", "飞狐外传", "young man with sharp determined eyes, thick eyebrows, wearing a blue martial arts outfit, holding a saber, heroic and spirited"),
    ("苗若兰", "飞狐外传", "elegant young woman in a pale pink flowing dress, delicate gentle face, soft eyes, hair adorned with a simple flower pin, graceful and refined"),
    ("程灵素", "飞狐外传", "young woman with a plain but clever face, bright intelligent eyes, wearing a simple light green dress, carrying a small medicine basket, gentle and kind"),
    ("苗人凤", "飞狐外传", "tall muscular middle-aged man with a fierce scarred face, one eye injured, wild hair, wearing dark rough clothes, holding a golden saber, intimidating warrior"),
    ("袁紫衣", "飞狐外传", "beautiful young woman in purple martial arts dress, lively bright eyes, hair in twin buns, holding a purple whip, bold and playful"),
    ("马春花", "飞狐外传", "pretty young woman with round face, rosy cheeks, wearing a red outfit, innocent and cheerful expression"),

    # ── 雪山飞狐 ──
    ("胡一刀", "雪山飞狐", "ruggedly handsome muscular man with thick beard stubble, fierce heroic eyes, wearing a dark fur-lined coat, holding a heavy saber, imposing presence of a northern warrior"),
    ("田归农", "雪山飞狐", "handsome middle-aged man with a scheming face, thin mustache, wearing elegant dark robes, calculating eyes, aristocratic appearance"),

    # ── 连城诀 ──
    ("狄云", "连城诀", "simple honest young man with a rugged tanned face, short hair, wearing torn gray clothes, iron chains on wrists, stubborn and righteous expression"),
    ("丁典", "连城诀", "pale scholarly man with long disheveled hair, wearing white prison clothes, holding a wilted flower, melancholic romantic eyes, tragic hero"),
    ("水笙", "连城诀", "beautiful young woman in light blue dress, clear innocent eyes, long flowing hair, holding a small sword, pure and brave"),

    # ── 天龙八部 ──
    ("段誉", "天龙八部", "handsome young prince with gentle refined features, wearing elegant white silk robes with golden trim, scholarly and romantic expression, a jade pendant at his waist"),
    ("虚竹", "天龙八部", "plain-looking young monk with a round bald head, simple gray monk robes, naive innocent expression, a string of prayer beads, kind-hearted appearance"),
    ("阿紫", "天龙八部", "mischievous young girl with big bright eyes, wearing colorful exotic ethnic clothing, a small bell bracelet, playful cruel smile, wild and untamed"),
    ("段正淳", "天龙八部", "handsome middle-aged man with a charming romantic face, elegant purple robes, gentle seductive eyes, long flowing hair, royal bearing of a prince"),
    ("鸠摩智", "天龙八部", "Tibetan monk with a round shaved head, fierce ambitious eyes, wearing elaborate golden and red monk robes, holding a flaming jewel, fanatic expression"),
    ("木婉清", "天龙八部", "fierce beautiful young woman in black martial arts outfit, a black veil covering lower face, sharp piercing eyes, holding twin daggers, wild and passionate"),
    ("钟灵", "天龙八部", "cute young girl with bright round eyes, wearing a colorful pink and green outfit, carrying a small golden bell, cheerful innocent smile, playful"),
    ("游坦之", "天龙八部", "tragic young man with a burned disfigured face covered by an iron mask, wearing dark ragged clothes, hunched posture, pitiful obsessed eyes"),
    ("天山童姥", "天龙八部", "small elderly woman appearing as a young girl, white hair in childish twin buns, wearing colorful robes, mischievous cruel grin, holding a cane, ancient power in young form"),
    ("李秋水", "天龙八部", "elegant beautiful woman in flowing white robes, cold haughty expression, long white hair, holding a jade flute, powerful and resentful aura"),

    # ── 射雕英雄传 ──
    ("郭靖", "射雕英雄传", "honest-looking young man with a broad simple face, thick eyebrows, determined earnest eyes, wearing brown rough martial arts clothes, sturdy and muscular, naive but resolute"),
    ("黄蓉", "射雕英雄传", "extremely beautiful clever young girl in a bright yellow dress, sparkling mischievous eyes, hair decorated with yellow flowers, holding a jade-green bamboo staff, witty and charming"),
    ("黄药师", "射雕英雄传", "handsome middle-aged man in a green robe, holding a jade flute, cold arrogant expression, long hair flowing freely, artistic and dangerous aura of a genius"),
    ("欧阳锋", "射雕英雄传", "fierce middle-aged man from the western regions, deep-set eyes, wearing exotic fur robes, holding a snake-headed staff, wild and menacing presence"),
    ("江南七怪柯镇恶", "射雕英雄传", "blind old man with a dark eye bandage, fierce righteous face, holding an iron cane, wearing rough dark clothes, stubborn and loyal"),
    ("华筝", "射雕英雄传", "beautiful Mongolian princess in ornate fur-trimmed dress, braided hair with silver ornaments, bright loyal eyes, bold and free-spirited"),
    ("哲别", "射雕英雄传", "strong Mongolian warrior with a weathered tanned face, wearing leather armor, carrying a large bow, fierce loyal eyes, powerful archer"),
    ("拖雷", "射雕英雄传", "young Mongolian prince with a round strong face, wearing fur-lined coat, warm friendly eyes, brave and loyal expression"),

    # ── 白马啸西风 ──
    ("李文秀", "白马啸西风", "young Han Chinese woman in simple Kazakh-style dress, sad wistful eyes, long black hair blowing in wind, riding a white horse, melancholic beauty"),

    # ── 鹿鼎记 ──
    ("韦小宝", "鹿鼎记", "cunning young man with a cheeky round face, sly mischievous eyes, wearing a flamboyant colorful official robe, a queue hairstyle, confident rogue grin"),
    ("康熙", "鹿鼎记", "young handsome Chinese emperor in magnificent golden dragon robe, intelligent authoritative eyes, small beard, confident imperial bearing"),
    ("阿珂", "鹿鼎记", "stunningly beautiful young woman in white, delicate flawless face, long flowing hair, cold aloof expression, sword at her waist, untouchable beauty"),
    ("双儿", "鹿鼎记", "sweet gentle maid in a simple light blue dress, warm tender eyes, twin hair buns, shy caring smile, loyal and devoted"),
    ("沐剑屏", "鹿鼎记", "cute young girl in a pink dress, innocent bright eyes, small round face, cheerful and naive expression"),
    ("曾柔", "鹿鼎记", "pretty young woman in a light green martial arts outfit, gentle steady eyes, holding a small dagger, quiet and principled"),
    ("建宁公主", "鹿鼎记", "beautiful haughty princess in elaborate red palace dress, fierce wilful eyes, elaborate hairpin, spoiled and passionate expression"),
    ("苏荃", "鹿鼎记", "mature beautiful woman in elegant dark robes, calm wise eyes, tall and dignified, holding a fan, composed and intelligent"),

    # ── 笑傲江湖 ──
    ("令狐冲", "笑傲江湖", "handsome carefree young swordsman with a windswept look, warm laughing eyes, wearing a light blue robe, holding a wine gourd,洒脱 uninhibited expression"),
    ("东方不败", "笑傲江湖", "androgynous beautiful figure in magnificent red and gold robes, long flowing black hair, holding a needle as weapon, cold enchanting smile, eerie charisma"),
    ("岳不群", "笑傲江湖", "middle-aged man appearing scholarly and kind, thin beard, wearing white elegant robes with a sword, gentle smile hiding scheming ambition, hypocritical elegance"),
    ("风清扬", "笑傲江湖", "elderly swordsman with long white beard and wild white hair, wearing simple gray robes, holding a wooden cane that is secretly a sword, wise serene eyes"),
    ("林平之", "笑傲江湖", "handsome young man with a refined face turning vengeful, wearing white martial arts robes, cold determined eyes, holding a thin elegant sword"),
    ("岳灵珊", "笑傲江湖", "cute young woman in a light green dress, lively playful eyes, hair in twin buns, holding a short sword, innocent and cheerful"),
    ("左冷禅", "笑傲江湖", "stern middle-aged man with a powerful build, cold calculating eyes, wearing dark formal martial arts robes, authoritative intimidating presence"),

    # ── 书剑恩仇录 ──
    ("陈家洛", "书剑恩仇录", "handsome young scholar-warrior in white robes, gentle refined face, intelligent eyes, holding a folding fan, noble and idealistic expression"),
    ("霍青桐", "书剑恩仇录", "beautiful Uyghur warrior princess in colorful ethnic dress and armor, fierce proud eyes, holding a curved sword, bold and charismatic leader"),
    ("香香公主", "书剑恩仇录", "extraordinarily beautiful young woman in white, ethereal almost otherworldly beauty, gentle innocent eyes, flowing hair, pure and angelic"),
    ("文泰来", "书剑恩仇录", "rugged muscular man with thick eyebrows, wearing red martial arts outfit, fierce loyal eyes, powerful fists, bold heroic bearing"),

    # ── 神雕侠侣 ──
    ("杨过", "神雕侠侣", "handsome rebellious young man with long wild hair covering one eye, wearing a dark martial arts robe, a giant eagle perched on his shoulder, passionate defiant eyes, holding a heavy dark iron sword"),
    ("小龙女", "神雕侠侣", "ethereally beautiful woman in pure white flowing robes, pale flawless skin, cold serene eyes like ice, long black hair, holding a white silk ribbon, living in an ancient tomb"),
    ("郭襄", "神雕侠侣", "cute lively young woman with bright curious eyes, wearing a light yellow dress, a small sword at her waist, warm adventurous smile, free-spirited"),
    ("郭芙", "神雕侠侣", "pretty but proud young woman in ornate dress, fierce temperamental eyes, elaborate hair decoration, haughty spoiled expression"),
    ("李莫愁", "神雕侠侣", "beautiful but venomous woman in a red dress, cold angry eyes, holding a silver whip with poison needles, long flowing hair, vengeful and dangerous"),
    ("金轮法王", "神雕侠侣", "imposing Tibetan monk with a powerful build, golden skin, wearing ornate monk robes, holding five golden wheels, fierce fanatic eyes"),
    ("陆无双", "神雕侠侣", "pretty young woman with a slight limp, wearing light green clothes, sharp clever eyes, holding a crutch that hides a blade, spirited and witty"),
    ("程英", "神雕侠侣", "gentle elegant young woman in pale green, soft kind eyes, playing a jade flute, calm and gracious demeanor"),

    # ── 侠客行 ──
    ("石破天", "侠客行", "simple honest young man with a tanned rugged face, wearing rough gray clothes, naive trusting eyes, barefoot, pure and uncorrupted"),

    # ── 倚天屠龙记 ──
    ("张无忌", "倚天屠龙记", "handsome young man with warm gentle eyes, wearing white martial arts robes, a warm kind smile, broad shoulders, peaceful but powerful aura"),
    ("赵敏", "倚天屠龙记", "stunningly beautiful Mongolian princess in ornate colorful robes, sharp clever eyes full of mischief, holding a folding fan, bold cunning smile, aristocratic and brilliant"),
    ("周芷若", "倚天屠龙记", "beautiful woman in white Emei sect robes, initially gentle eyes turning cold and fierce, long hair, holding the Heaven Sword, transformation from innocent to dangerous"),
    ("张三丰", "倚天屠龙记", "ancient white-bearded Taoist master with a kind serene face, wearing simple Taoist robes, holding a whisk, wise immortal eyes, gentle grandfatherly smile"),
    ("谢逊", "倚天屠龙记", "huge muscular man with wild golden hair and beard, blind eyes covered by a cloth, wearing animal skins, holding a giant wolf-tooth staff, fierce tragic presence"),
    ("小昭", "倚天屠龙记", "beautiful young Persian-Chinese girl in colorful exotic dress, bright devoted eyes, wearing golden bracelets, sweet loyal smile, mysterious and devoted"),
    ("殷离", "倚天屠龙记", "young woman with a scarred face, wearing dark clothes, fierce obsessive eyes, holding poison needles, tragic and passionate"),
    ("杨逍", "倚天屠龙记", "handsome charismatic middle-aged man in dark elegant robes, sharp intelligent eyes, holding a fan,风流 suave and arrogant bearing"),
    ("韦一笑", "倚天屠龙记", "thin pale man with a gaunt face, wearing a dark cape, cold eerie eyes, eerie grin showing fangs, vampire-like martial arts master"),
    ("殷天正", "倚天屠龙记", "elderly muscular man with thick white eyebrows, wearing white robes, fierce proud eyes, holding a eagle-claw weapon, powerful and dignified"),
    ("成昆", "倚天屠龙记", "middle-aged man with a shaved head and monk robes, sinister scheming eyes hiding behind a calm face, calculating and vengeful"),

    # ── 碧血剑 ──
    ("袁承志", "碧血剑", "handsome young swordsman in blue martial arts robes, determined righteous eyes, holding a golden-tinted sword, brave and principled"),
    ("温青青", "碧血剑", "beautiful young woman who sometimes dresses as a man, clever willful eyes, wearing green clothes, holding a golden snake sword, moody and passionate"),
    ("阿九", "碧血剑", "beautiful princess in elegant palace dress, gentle sad eyes, holding a jade flute, graceful and tragic, a hidden martial arts master"),
    ("夏雪宜", "碧血剑", "handsome mysterious man in dark clothes, cold vengeful eyes, holding a golden snake whip, dangerous and alluring aura, the Golden Snake Swordsman"),

    # ── 鸳鸯刀 ──
    ("萧半和", "鸳鸯刀", "stout middle-aged man with a round friendly face, wearing a colorful robe, holding twin butterfly swords, jolly but skilled martial artist"),

    # ── 越女剑 ──
    ("阿青", "越女剑", "young village girl in simple ancient Zhou dynasty clothes, bright wild eyes, holding a bamboo stick as a weapon, innocent yet unbelievably powerful, natural martial arts genius"),

    # ── Extra characters to reach 100 ──
    ("包惜弱", "射雕英雄传", "gentle beautiful woman in soft pastel robes, kind compassionate eyes, holding a small injured rabbit, caring and tender, scholarly wife of Yang Tiexin"),
    ("洪七公", "射雕英雄传", "elderly beggar with a ruddy face and white stubble beard, wearing patched dirty robes, holding a green bamboo staff and a roast chicken leg, jovial but powerful, missing one finger"),
    ("周伯通", "射雕英雄传", "elderly man with white hair in messy pigtails, childlike mischievous grin, wearing a simple gray robe, playing with his hands like toys, playful and powerful"),
    ("杨康", "射雕英雄传", "handsome young man with a noble face, wearing elegant golden Jurchen prince robes, conflicted ambitious eyes, holding a fan, charismatic but conflicted"),
    ("穆念慈", "射雕英雄传", "pretty young woman in a simple light dress, gentle devoted eyes, a red handkerchief in hand, holding a small spear, loyal and loving"),
    ("瑛姑", "射雕英雄传", "middle-aged woman with dark intense eyes, wearing dark simple robes, holding calculation charts, obsessed and grief-stricken, mathematical genius"),
    ("向问天", "笑傲江湖", "powerful middle-aged man with a broad fierce face, wearing dark robes, iron chains on his wrists, bold defiant laugh, holding a cup of wine, rebellious and loyal"),
    ("任我行", "笑傲江湖", "imposing older man with wild hair and beard, fierce megalomaniac eyes, wearing dark purple robes, an iron mask at his side, overwhelming dominant aura"),
    ("陈近南", "鹿鼎记", "middle-aged man with a resolute face, wearing dark blue martial arts robes, righteous determined eyes, holding a sword, dignified and loyal revolutionary leader"),
    ("慕容复", "天龙八部", "handsome young aristocrat in elegant white and silver robes, cold ambitious eyes, a folding fan in hand, refined but obsessive expression, dreaming of restoring a fallen kingdom"),
    ("王语嫣", "天龙八部", "breathtakingly beautiful young woman in flowing white silk, gentle dreamy eyes, holding a book of martial arts theory, knowing all moves but unable to fight, ethereal beauty"),
    ("阿朱", "天龙八部", "clever pretty young maid in a purple outfit, bright intelligent eyes, warm playful smile, skilled in disguise, devoted and sacrificial"),
    ("戚芳", "连城诀", "pretty young woman in simple village dress, kind sad eyes, holding a pair of scissors, gentle and tragic"),    ("丁珰", "侠客行", "cute mischievous girl in colorful clothes, bright teasing eyes, twin ponytails, holding hidden needles, playful and cunning"),    ("白阿绣", "侠客行", "beautiful gentle girl in pale blue dress, shy sweet eyes, long flowing hair, innocent and pure"),    ("公孙止", "神雕侠侣", "middle-aged man with a neat beard, wearing elegant dark green robes, polite but treacherous smile, holding a golden knife and a jade cup"),    ("耶律齐", "神雕侠侣", "handsome young Mongolian-Chinese warrior in martial arts robes, calm steady eyes, holding a bow, composed and brave"),    ("范遥", "倚天屠龙记", "mysterious man with a scarred disfigured face pretending to be a monk, wearing disguise, sharp cunning eyes beneath the mask, hidden identity"),    ("宋远桥", "倚天屠龙记", "elderly Taoist master with a long white beard, wearing Wudang Taoist robes, serene dignified face, holding a long sword, wise and steady"),    ("方怡", "鹿鼎记", "pretty young woman in dark green martial arts outfit, sharp calculating eyes, holding twin hooks, proud and independent"),    ("何足道", "倚天屠龙记", "handsome young man in white robes carrying a guqin zither, melancholic artistic eyes, long flowing hair, musical genius swordsman"),    ("殷素素", "倚天屠龙记", "beautiful woman in dark purple martial arts dress, sharp cunning eyes, a small beauty mark on her face, holding silver darts, fierce and passionate"),    ("梅超风", "射雕英雄传", "wild scary woman with long disheveled black hair, blind eyes, wearing dark ragged robes, holding nine Yin bone claws pose, eerie and tragic"),    ("裘千仞", "射雕英雄传", "elderly man with white hair, wearing dark robes, iron palms ready to strike, fierce ambitious eyes, the Iron Palm master"),]

def generate_avatar(name, novel, desc, idx):
    """Generate one avatar using MiniMax API."""
    out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
    if os.path.exists(out_path):
        print(f"[{idx+1}/100] SKIP {name} (already exists)")
        return True

    prompt = f"{STYLE}. {name} from Jin Yongs novel {novel}. {desc}"

    payload = json.dumps({
        "model": "image-01",
        "prompt": prompt,
        "aspect_ratio": "1:1",
        "response_format": "url",
        "n": 1,
        "prompt_optimizer": True,
    }).encode()

    req = urllib.request.Request(
        "https://api.minimaxi.com/v1/image_generation",
        data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
            url = data["data"]["image_urls"][0]
            urllib.request.urlretrieve(url, '/tmp/_avatar_tmp.jpg')
            # Convert to PNG via Pillow
            import subprocess
            subprocess.run(['python3', '-c', f'''
from PIL import Image
img = Image.open("/tmp/_avatar_tmp.jpg").convert("RGBA")
img = img.resize((256, 256), Image.LANCZOS)
img.save("{out_path}", "PNG", optimize=True)
'''], check=True, capture_output=True)
            size = os.path.getsize(out_path)
            print(f"[{idx+1}/100] OK   {name} ({size:,} bytes)")
            return True
        except Exception as e:
            print(f"[{idx+1}/100] RETRY {name} (attempt {attempt+1}): {e}")
            time.sleep(5)

    print(f"[{idx+1}/100] FAIL {name}")
    return False

def main():
    print(f"Generating {len(CHARACTERS)} character avatars...")
    print(f"Output: {OUTPUT_DIR}")
    print()

    ok = 0
    fail = 0
    for i, (name, novel, desc) in enumerate(CHARACTERS):
        if generate_avatar(name, novel, desc, i):
            ok += 1
        else:
            fail += 1
        # Rate limit: ~2 requests per second
        time.sleep(0.5)

    print(f"\nDone: {ok} ok, {fail} failed")

if __name__ == "__main__":
    main()
