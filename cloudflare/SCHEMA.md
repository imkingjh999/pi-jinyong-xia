# Cloudflare Worker — D1 数据库 Schema

## ⚠️ 必须应用全部 schema 文件

D1 数据库需要**两个** schema 文件，缺一不可。`action_log` / `game_config` 表缺失会导致
upload 端点对已注册用户报 500（P1-3 事故），以及服务端配置不生效。

## 首次部署 / 全新数据库

```bash
# 1. 基础表（players + global_stats）
wrangler d1 execute xia-leaderboard --remote --file=schema.sql

# 2. 扩展表（game_config + action_log）— 可安全重复执行（幂等）
wrangler d1 execute xia-leaderboard --remote --file=schema-v2.sql
```

## 存量数据库补救（已部署 schema.sql 但缺少 schema-v2.sql）

```bash
# schema-v2.sql 使用 CREATE TABLE IF NOT EXISTS + INSERT OR IGNORE，可安全重复执行
wrangler d1 execute xia-leaderboard --remote --file=schema-v2.sql
```

执行后可验证：

```bash
wrangler d1 execute xia-leaderboard --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
# 期望输出包含: action_log, game_config, global_stats, players
```

## Schema 文件说明

| 文件 | 内容 | 幂等？ |
|------|------|--------|
| `schema.sql` | `players` + `global_stats` 基础表 | 否（含 DROP TABLE，仅首次） |
| `schema-v2.sql` | `game_config`（服务端权威参数）+ `action_log`（反作弊日志） | ✅ 是（IF NOT EXISTS / OR IGNORE） |

## game_config 键值语义

代码读取这些键（见 `src/index.ts`）：

| 键 | 语义 | 读取处 |
|----|------|--------|
| `encounter_weights` | 遭遇类型权重数组 | `handleEncounter` |
| `skill_scroll_min_level` | 武功秘籍掉落最低等级 | `handleEncounter` |
| `boss_atk_scale` | Boss 攻击力全局缩放 | `handleBossFight` |
| `boss_hp_scale` | Boss 血量全局缩放 | `handleBossFight` |
| `element_overcome_multiplier` | 克制时伤害倍率 | `handleBossFight` |
| `element_overcome_reduction` | 被克制时伤害衰减系数 | `handleBossFight` |

修改这些键的值即可实时调整游戏平衡，无需重新部署 Worker。
