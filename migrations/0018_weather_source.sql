ALTER TABLE daily_weather ADD COLUMN source TEXT NOT NULL DEFAULT 'user';
ALTER TABLE daily_weather ADD COLUMN fetched_at TEXT;
