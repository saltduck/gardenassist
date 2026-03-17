-- 全局设置（无登录版本）
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 初始化一行
INSERT OR IGNORE INTO app_settings (id, location, updated_at)
VALUES ('global', '', strftime('%Y-%m-%dT%H:%M:%fZ','now'));

