-- 金庸江湖 D1 Schema v2 — 游戏参数 + 行动日志 + 反作弊
--
-- ⚠️ 必须在应用 schema.sql 之后应用本文件。两个文件都需要应用到同一个 D1 数据库：
--     wrangler d1 execute <DB> --file=schema.sql      (基础表: players, global_stats)
--     wrangler d1 execute <DB> --file=schema-v2.sql   (扩展表: game_config, action_log)
--
-- 本文件使用 IF NOT EXISTS，可安全重复执行（幂等）。首次部署时 game_config 会写入初始参数。

-- ═══════════════════════════════════════════════════════════════
-- 游戏配置表（服务端权威参数，客户端不可见）
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS game_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,       -- JSON blob
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- 初始化核心参数（INSERT OR IGNORE 保证幂等：已存在的 key 不会被覆盖）
INSERT OR IGNORE INTO game_config (key, value) VALUES
-- 遭遇权重: [角色遭遇, 江湖事件, 武功秘籍, 武器掉落, 道具掉落, 金币]
('encounter_weights', '[0.30, 0.20, 0.10, 0.10, 0.15, 0.15]'),
-- Boss 基础属性倍率（boss_atk_scale: Boss 攻击力全局缩放；boss_hp_scale: Boss 血量全局缩放）
('boss_atk_scale', '1.0'),
('boss_hp_scale', '1.0'),
-- 元素克制倍率（element_overcome_multiplier: 克制时伤害倍率；element_overcome_reduction: 被克制时伤害衰减系数）
('element_overcome_multiplier', '1.5'),
('element_overcome_reduction', '0.7'),
-- 掉落稀有度权重
('weapon_rarity_weights', '{"凡品":50,"良品":30,"精品":15,"极品":4,"神器":1}'),
-- 武功秘籍掉落最低等级门槛（encounter 的 skill_scroll 类型在此等级之上才可能出现）
('skill_scroll_min_level', '5'),
-- 经验/金币公式系数
('xp_event_scale', '1.0'),
('gold_event_scale', '1.0'),
('boss_gold_scale', '1.0'),
('boss_xp_scale', '1.0'),
-- HP 公式
('hp_base', '100'),
('hp_per_level', '12'),
-- 战斗骰子事件概率
('dice_crit_chance', '0.10'),
('dice_dodge_chance', '0.10'),
('dice_break_chance', '0.08'),
('dice_regen_chance', '0.08'),
('dice_weak_chance', '0.08'),
('dice_boss_rage_chance', '0.10'),
('dice_element_echo_chance', '0.06');

-- ═══════════════════════════════════════════════════════════════
-- 行动日志表（服务端验证的关键操作记录）
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS action_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL,
  action_type TEXT NOT NULL,       -- encounter | boss_fight | shop_buy | mission
  action_id   TEXT,                -- encounter/boss/mission 的唯一 ID
  result_json TEXT NOT NULL,       -- JSON: 服务端返回的完整结果
  gold_change INTEGER NOT NULL DEFAULT 0,
  xp_change   INTEGER NOT NULL DEFAULT 0,
  hp_change   INTEGER NOT NULL DEFAULT 0,
  level_after INTEGER,
  gold_after  INTEGER,
  created_at  INTEGER NOT NULL,
  signature   TEXT                 -- 客户端签名（可选，用于验证请求来源）
);
CREATE INDEX IF NOT EXISTS idx_action_user ON action_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_type ON action_log(user_id, action_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- IP 限流表（防多账号刷取奖励；bucket 格式 "ip:<hash>"）
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rate_limit (
  bucket     TEXT NOT NULL,        -- e.g. "ip:<sha256-prefix>"
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket ON rate_limit(bucket, created_at);
