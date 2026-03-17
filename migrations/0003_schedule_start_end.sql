-- 养护计划增加可选开始/截止日期
ALTER TABLE care_schedules ADD COLUMN start_date TEXT;
ALTER TABLE care_schedules ADD COLUMN end_date TEXT;

