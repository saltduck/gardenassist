ALTER TABLE care_schedules ADD COLUMN seasonal_watering_adjust INTEGER NOT NULL DEFAULT 0;
ALTER TABLE care_schedule_templates ADD COLUMN seasonal_watering_adjust INTEGER NOT NULL DEFAULT 0;
