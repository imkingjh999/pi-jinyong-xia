-- 金庸江湖公共排行榜 D1 Schema
-- 零 API Key：客户端通过公开 URL 直接读写

DROP TABLE IF EXISTS players;

CREATE TABLE players (
  user_id       TEXT PRIMARY KEY,       -- SHA256 hash of OS info (16 hex chars)
  character_id  TEXT,                   -- 金庸角色 ID
  character_name TEXT,                  -- 角色名 (denormalized for fast reads)
  level         INTEGER NOT NULL DEFAULT 1,
  title         TEXT NOT NULL DEFAULT '',  -- 等级称号 (e.g. "江湖小虾")
  gold          INTEGER NOT NULL DEFAULT 0,
  total_xp      INTEGER NOT NULL DEFAULT 0,
  total_edits   INTEGER NOT NULL DEFAULT 0,
  total_commands INTEGER NOT NULL DEFAULT 0,
  total_trainings INTEGER NOT NULL DEFAULT 0,
  martial_skills TEXT,                  -- JSON: [{id, level, xp}]
  weapon        TEXT,                   -- 当前装备武器 ID
  achievements  TEXT,                   -- JSON: string[]
  bosses_defeated INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,       -- first seen timestamp (ms)
  last_active_at INTEGER NOT NULL,      -- last active timestamp (ms)
  reported_at   INTEGER NOT NULL,       -- last upload timestamp (ms)
  version       TEXT NOT NULL DEFAULT '1.0.0',
  -- anti-abuse
  ip_hash       TEXT,                   -- SHA256 of client IP (no raw IP stored)
  report_count  INTEGER NOT NULL DEFAULT 0,
  flagged       INTEGER NOT NULL DEFAULT 0,  -- 0=normal, 1=suspicious, 2=banned
  -- Ed25519 non-repudiation
  public_key    TEXT UNIQUE,               -- base64 Ed25519 public key (registered on first upload)
  -- User profile
  user_email       TEXT,
  mbti_type     TEXT,                       -- e.g. "INTJ"
  mbti_scores   TEXT                        -- JSON: {E:0,I:3,S:2,...}
);

-- Indexes for leaderboard queries
CREATE INDEX idx_players_level ON players(level DESC, total_xp DESC);
CREATE INDEX idx_players_gold ON players(gold DESC);
CREATE INDEX idx_players_edits ON players(total_edits DESC);
CREATE INDEX idx_players_reported ON players(reported_at DESC);
CREATE INDEX idx_players_flagged ON players(flagged);

-- Global stats table (single row, updated by worker)
DROP TABLE IF EXISTS global_stats;
CREATE TABLE global_stats (
  id            INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton
  total_players INTEGER NOT NULL DEFAULT 0,
  total_reports INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);
INSERT INTO global_stats (id) VALUES (1);
