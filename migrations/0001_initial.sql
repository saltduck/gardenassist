-- 花园助手 D1 初始 schema
CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  variety TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  planted_at TEXT NOT NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS growth_records (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL,
  date TEXT NOT NULL,
  height REAL,
  leaf_count INTEGER,
  health_score INTEGER,
  photo_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_logs (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  done_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_schedules (
  id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  interval_days INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_growth_plant ON growth_records(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_logs_plant ON care_logs(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_logs_done_at ON care_logs(done_at);
CREATE INDEX IF NOT EXISTS idx_care_schedules_plant ON care_schedules(plant_id);
