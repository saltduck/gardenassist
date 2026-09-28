-- 养护计划名称；执行后把名称快照和来源计划写入养护记录
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
  ELSE '其他'
END
WHERE trim(name) = '';

UPDATE care_schedule_templates
SET name = CASE task_type
  WHEN 'watering' THEN '浇水'
  WHEN 'fertilizing' THEN '施肥'
  WHEN 'pruning' THEN '修剪'
  WHEN 'repotting' THEN '换盆'
  WHEN 'pest_control' THEN '除虫'
  ELSE '其他'
END
WHERE trim(name) = '';
