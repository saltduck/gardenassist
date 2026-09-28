-- 每日气温与降水（按用户、按日历日）
CREATE TABLE IF NOT EXISTS daily_weather (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  temp_max_c REAL,
  temp_min_c REAL,
  precipitation_mm REAL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_weather_user_date ON daily_weather (user_id, date);
