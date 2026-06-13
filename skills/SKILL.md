---
description: 金庸武侠终端宠物，随机化身 28 位金庸角色，修炼武功、挑战Boss、探索江湖
---

# Pi 金庸武侠宠物

一个住在你终端里的金庸武侠角色宠物，支持 Q 版头像显示（Kitty/iTerm2 图片协议）。

## 命令

- `/xia` — 交互菜单（查看状态、武功、商店等）
- `/xia stats` — 详细数据面板
- `/xia skills` — 查看和管理武功
- `/xia heroes` — 金庸群侠录（浏览、切换角色）
- `/xia weapons` — 选择武器装备
- `/xia items` — 选择道具使用
- `/xia shop` — 江湖商铺（武器、道具、武功秘籍）
- `/xia bosses` — 选择Boss挑战
- `/xia rank` — 🏆 江湖排行榜（等级/金币/编辑/经验排行）
- `/xia missions` — 🗡️ 江湖任务（护镖/寻物/刺杀/解救/送货）
- `/xia profile` — 🧠 性格分析（MBTI + 最佳拍档匹配）

## 机制

- 首次启动随机化身 28 位金庸经典角色之一，可通过群侠录切换
- 五行（金木水火土）武功系统，相生相克
- 编程活动（编辑、工具调用）获得经验和金币
- 每次对话结束随机触发江湖遭遇（战斗、奇遇、掉落）
- 武器、道具、Boss 挑战、成就系统
- 🎲 战斗骰子系统：暴击/闪避/元素共鸣/破防/回春/虚弱
- 手动战斗：每回合选择 攻击/武功/防御/道具/逃跑
- Q 版头像支持 Kitty/iTerm2/tmux 图片协议

## 对战模式

`/xia bosses` 选择 Boss 后可选择：
- **⚔️ 自动战斗** — 一键出结果
- **🎮 手动战斗** — 逐回合选择行动+🎲骰子随机事件
- **❌ 逃跑** — 不打

### 🎲 骰子事件（每回合自动触发）
| 骰子 | 事件 | 效果 |
|------|------|------|
| 6 | 🔥 暴击 | 伤害×1.5 |
| 6+克制 | ⚡ 元素共鸣 | 伤害×1.4 |
| 5 | 💥 破防 | 无视Boss 50%防御 |
| 4 | 💚 回春 | 回复8%血量 |
| 3+被克 | 😵 虚弱 | Boss伤害+50% |
| 2 | 💨 闪避 | 伤害降至30% |
| 1 | 🔥 Boss暴走 | Boss攻击×1.5 |

## 模拟对战

终端运行独立测试脚本：
```bash
npx tsx tests/battle-sim.ts                    # Lv.10 vs Boss
npx tsx tests/battle-sim.ts --level 50 --boss 44  # Lv.50 vs 东方不败
npx tsx tests/battle-sim.ts --tournament       # 锦标赛: 50个Boss通关
npx tsx tests/battle-sim.ts --stress 200       # 压力测试: 200场
npx tsx tests/battle-sim.ts --element          # 元素克制分析
npx tsx tests/battle-sim.ts --list             # Boss列表
```

## 示例

```
/xia
/xia stats
/xia heroes
/xia shop
/xia bosses
/xia rank
```

## 排行榜系统

零 API Key 的公共排行榜，基于 Cloudflare Workers + D1。

- 用户通过 `/xia rank` 查看全服排行榜
- 在 `~/.pi/agent/jinyong-xia-state.json` 中设置 `telemetryEnabled: true` 开启数据上传
- 上传完全匿名（仅发送 SHA256 哈希的 userId）
- 每 5 分钟自动上报一次，无需手动操作
- 后端部署: `cd cloudflare && npm run deploy`
