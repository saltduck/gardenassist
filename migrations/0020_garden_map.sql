CREATE TABLE IF NOT EXISTS garden_maps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_garden_maps_user ON garden_maps (user_id);

ALTER TABLE plants ADD COLUMN map_x REAL;
ALTER TABLE plants ADD COLUMN map_y REAL;
ALTER TABLE plants ADD COLUMN garden_map_id TEXT;
ALTER TABLE plants ADD COLUMN external_plant_id TEXT;
