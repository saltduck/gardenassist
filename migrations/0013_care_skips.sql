-- 跳过养护任务（用于把“本次到期”推进到下一周期，但不计入“已完成”列表）
CREATE TABLE IF NOT EXISTS care_skips (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  skipped_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_care_skips_plant_task_time ON care_skips (plant_id, task_type, skipped_at);

