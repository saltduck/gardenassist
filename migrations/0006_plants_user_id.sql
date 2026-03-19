-- 植物归属用户（已有数据无 user_id 时将不可见，需手动分配或迁移）
ALTER TABLE plants ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
