-- 品种共享养护计划：plants 增加 variety_key，并创建 care_schedule_templates

ALTER TABLE plants ADD COLUMN variety_key TEXT;
CREATE INDEX IF NOT EXISTS idx_plants_variety_key ON plants(user_id, variety_key);

-- 先回填：优先用 variety（品种），为空则用 name（名称）
UPDATE plants
SET variety_key = lower(trim(CASE WHEN trim(coalesce(variety, '')) <> '' THEN variety ELSE name END))
WHERE variety_key IS NULL;

CREATE TABLE IF NOT EXISTS care_schedule_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  variety_key TEXT NOT NULL,
  task_type TEXT NOT NULL,
  interval_days INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, variety_key, task_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cst_user_variety ON care_schedule_templates(user_id, variety_key);

