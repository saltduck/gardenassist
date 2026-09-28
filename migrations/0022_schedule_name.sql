-- 养护计划名称，以及完成时写入养护记录的名称快照与来源计划 id。
-- 云端若已由误编号的 0012_schedule_name.sql 加上这些列，本文件的 ALTER 会报 duplicate column，
-- 此时只执行文末 UPDATE，并手工记入 d1_migrations。

ALTER TABLE care_schedules ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE care_schedule_templates ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE care_logs ADD COLUMN name TEXT;
ALTER TABLE care_logs ADD COLUMN schedule_id TEXT;

UPDATE care_schedules
SET name = CASE task_type
  WHEN 'watering' THEN '浇水'
  WHEN 'fertilizing' THEN '施肥'
  WHEN 'pruning' THEN '修剪'
  WHEN 'repotting' THEN '换盆'
  WHEN 'pest_control' THEN '除虫'
  WHEN 'mulch' THEN '铺盖'
  WHEN 'mowing' THEN '割草'
  ELSE '其他'
END
WHERE name IS NULL OR trim(name) = '';

UPDATE care_schedule_templates
SET name = CASE task_type
  WHEN 'watering' THEN '浇水'
  WHEN 'fertilizing' THEN '施肥'
  WHEN 'pruning' THEN '修剪'
  WHEN 'repotting' THEN '换盆'
  WHEN 'pest_control' THEN '除虫'
  WHEN 'mulch' THEN '铺盖'
  WHEN 'mowing' THEN '割草'
  ELSE '其他'
END
WHERE name IS NULL OR trim(name) = '';
