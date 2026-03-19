-- 允许同一用户/品种/任务类型存在多条共享养护计划
-- 通过重建 care_schedule_templates 去掉 UNIQUE(user_id, variety_key, task_type)
CREATE TABLE IF NOT EXISTS care_schedule_templates_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  variety_key TEXT NOT NULL,
  task_type TEXT NOT NULL,
  interval_days INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO care_schedule_templates_new (id, user_id, variety_key, task_type, interval_days, start_date, end_date, note, created_at)
SELECT id, user_id, variety_key, task_type, interval_days, start_date, end_date, note, created_at
FROM care_schedule_templates;

DROP TABLE care_schedule_templates;
ALTER TABLE care_schedule_templates_new RENAME TO care_schedule_templates;

CREATE INDEX IF NOT EXISTS idx_cst_user_variety ON care_schedule_templates(user_id, variety_key);
CREATE INDEX IF NOT EXISTS idx_cst_user_variety_task ON care_schedule_templates(user_id, variety_key, task_type);
