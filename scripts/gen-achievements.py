#!/usr/bin/env python3
"""Batch generate achievement badge images using MiniMax API.

Generates small (128x128) achievement badge PNGs for all wuxue achievements.
Output: assets/achievements/{achievement_id}.png
"""

import json, os, sys, time, urllib.request, urllib.error

API_KEY = os.environ.get("MINIMAX_API_KEY", "")
if not API_KEY:
    with open(os.path.expanduser("~/.zshrc")) as f:
        for line in f:
            if "MINIMAX_API_KEY" in line and "export" in line:
                API_KEY = line.split('="')[1].rstrip('"\n')
                break
if not API_KEY:
    print("ERROR: MINIMAX_API_KEY not found"); sys.exit(1)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "achievements")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Size target: small badges
STYLE = "game UI achievement badge icon, flat 2D vector style, simple clean design, symmetrical composition, centered icon, small badge shape, bold outlines, minimal detail, no text, no letters, no words, no characters, no writing, solid background"

RARITY_STYLE = {
    "common": "simple bronze/silver border, plain design",
    "rare": "blue crystal border with subtle glow, slightly ornate",
    "epic": "purple glowing border with flame accents, elaborate",
    "legendary": "golden divine border with radiant light rays, ultra ornate, holy aura",
}

RARITY_COLOR = {
    "common": "#9E9E9E",
    "rare": "#2196F3",
    "epic": "#9C27B0",
    "legendary": "#FF9800",
}

# All achievements from wuxue-achievements.ts
ACHIEVEMENTS = [
    # training
    ("first_train", "初入江湖", "第一次修炼", "🌱", "common"),
    ("train_10", "勤学苦练", "修炼10次", "📖", "common"),
    ("train_50", "精益求精", "修炼50次", "📚", "rare"),
    ("train_100", "百炼成钢", "修炼100次", "⚒️", "rare"),
    ("train_500", "修仙之路", "修炼500次", "🧙", "epic"),
    ("train_1000", "大道至简", "修炼1000次", "☯️", "legendary"),
    # level
    ("level_5", "初出茅庐", "达到5级", "🌟", "common"),
    ("level_10", "小有名气", "达到10级", "⭐", "common"),
    ("level_30", "声名远播", "达到30级", "💫", "rare"),
    ("level_50", "名震四方", "达到50级", "🏅", "rare"),
    ("level_80", "登峰造极", "达到80级", "🏆", "epic"),
    ("level_100", "武林至尊", "达到100级", "👑", "legendary"),
    # skill
    ("skill_first", "初窥门径", "习得第一门武功", "📜", "common"),
    ("skill_master_5", "武功小成", "武功达到5级", "🎯", "common"),
    ("skill_master_8", "武功大成", "武功达到8级", "🔥", "rare"),
    ("skill_master_10", "登堂入室", "武功达到10级", "⚡", "rare"),
    ("element_master", "五行通晓", "拥有3种以上不同元素武功", "🎨", "epic"),
    ("all_elements", "五行俱全", "拥有金木水火土五行武功", "🌈", "legendary"),
    # battle
    ("boss_first", "初战告捷", "第一次击败Boss", "⚔️", "common"),
    ("boss_10", "战无不胜", "击败10个Boss", "🗡️", "common"),
    ("boss_50", "百战百胜", "击败50个Boss", "💪", "rare"),
    ("boss_100", "杀神", "击败100个Boss", "💀", "epic"),
    ("boss_streak_5", "连战连捷", "连续击败5个Boss", "🔥", "rare"),
    ("boss_perfect", "完美无缺", "无伤击败Boss", "✨", "epic"),
    ("boss_one_shot", "一击必杀", "一回合击败Boss", "⚡", "legendary"),
    # wealth
    ("gold_100", "初涉商海", "拥有100金币", "🪙", "common"),
    ("gold_1000", "小有积蓄", "拥有1000金币", "💰", "common"),
    ("gold_10000", "富甲一方", "拥有10000金币", "💎", "rare"),
    ("gold_100000", "富可敌国", "拥有100000金币", "🏦", "legendary"),
    ("shop_first", "初次购物", "第一次在商铺购买", "🛒", "common"),
    ("shop_50", "老主顾", "商铺购买50次", "🏪", "rare"),
    # jianghu
    ("encounter_50", "行走江湖", "遭遇50次江湖事件", "🌏", "common"),
    ("encounter_500", "浪迹天涯", "遭遇500次江湖事件", "🗺️", "rare"),
    ("command_100", "命令达人", "执行100条命令", "⌨️", "common"),
    ("command_500", "命令大师", "执行500条命令", "🏅", "rare"),
    ("edit_100", "笔耕不辍", "编辑100次", "📝", "common"),
    ("edit_1000", "著作等身", "编辑1000次", "📚", "epic"),
    # mission
    ("mission_first", "初领任务", "完成第一个任务", "📋", "common"),
    ("mission_10", "任务达人", "完成10个任务", "✅", "common"),
    ("mission_50", "使命必达", "完成50个任务", "🎖️", "rare"),
    ("mission_100", "功成名就", "完成100个任务", "🏆", "epic"),
    ("mission_streak_5", "连战连胜", "连续完成5个任务", "🔥", "rare"),
    ("extreme_risk", "虎口拔牙", "完成极限风险任务", "☠️", "epic"),
    # item
    ("first_weapon", "初获兵器", "获得第一把武器", "🗡️", "common"),
    ("weapon_rare", "良兵入手", "获得良品武器", "⚔️", "common"),
    ("weapon_epic", "神兵利器", "获得极品武器", "🔱", "rare"),
    ("weapon_legendary", "绝世神兵", "获得神器", "💎", "legendary"),
    ("item_50", "道具收藏家", "使用50个道具", "🎁", "rare"),
]

def generate_badge(ach_id, name, desc, icon, rarity, idx, total):
    out_path = os.path.join(OUTPUT_DIR, f"{ach_id}.png")
    if os.path.exists(out_path):
        print(f"[{idx+1}/{total}] SKIP {ach_id} (exists)")
        return True

    rarity_style = RARITY_STYLE.get(rarity, "")
    rarity_color = RARITY_COLOR.get(rarity, "#9E9E9E")

    prompt = f"{STYLE}. Chinese wuxia martial arts theme. Badge name: {name}. {rarity_style}. Color accent: {rarity_color}. Small 128x128 game icon badge."

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
            tmp_path = out_path + ".tmp"
            urllib.request.urlretrieve(url, tmp_path)
            # Convert to small PNG via sips (macOS)
            subprocess_run = __import__('subprocess').run
            # Resize to 128x128 and convert to PNG
            subprocess_run([
                'sips', '-z', '128', '128',
                '-s', 'format', 'png',
                tmp_path, '--out', out_path
            ], check=True, capture_output=True)
            os.unlink(tmp_path)
            size = os.path.getsize(out_path)
            print(f"[{idx+1}/{total}] OK   {ach_id} ({size:,} bytes)")
            return True
        except Exception as e:
            print(f"[{idx+1}/{total}] RETRY {ach_id} (attempt {attempt+1}): {e}")
            time.sleep(3)

    print(f"[{idx+1}/{total}] FAIL {ach_id}")
    return False

def main():
    print(f"Generating {len(ACHIEVEMENTS)} achievement badges...")
    print(f"Output: {OUTPUT_DIR}")
    print()

    ok = 0
    fail = 0
    for i, (ach_id, name, desc, icon, rarity) in enumerate(ACHIEVEMENTS):
        if generate_badge(ach_id, name, desc, icon, rarity, i, len(ACHIEVEMENTS)):
            ok += 1
        else:
            fail += 1
        time.sleep(0.5)  # ~2 req/s rate limit

    print(f"\nDone: {ok} ok, {fail} failed")

if __name__ == "__main__":
    main()
