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

## 机制

- 首次启动随机化身 28 位金庸经典角色之一，可通过群侠录切换
- 五行（金木水火土）武功系统，相生相克
- 编程活动（编辑、工具调用）获得经验和金币
- 每次对话结束随机触发江湖遭遇（战斗、奇遇、掉落）
- 武器、道具、Boss 挑战、成就系统
- Q 版头像支持 Kitty/iTerm2/tmux 图片协议

## 示例

```
/xia
/xia stats
/xia heroes
/xia shop
/xia bosses
```
