-- 植物归档：死亡/迁走等不再参与待办，但保留历史记录
ALTER TABLE plants ADD COLUMN archived_at TEXT;
ALTER TABLE plants ADD COLUMN archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_plants_user_archived_at ON plants(user_id, archived_at);

