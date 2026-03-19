-- 将旧的“按 plant_id 的 care_schedules”合并迁移到“按品种的 care_schedule_templates”
-- 合并策略：同 user_id + variety_key + task_type 取 interval_days 最大值；
--           start_date 取最小（更早开始）；end_date 取最大；note 取任意非空（max）

INSERT OR IGNORE INTO care_schedule_templates (id, user_id, variety_key, task_type, interval_days, start_date, end_date, note, created_at)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-8' || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))) AS id,
  p.user_id AS user_id,
  lower(trim(CASE WHEN trim(coalesce(p.variety, '')) <> '' THEN p.variety ELSE p.name END)) AS variety_key,
  s.task_type AS task_type,
  max(s.interval_days) AS interval_days,
  min(s.start_date) AS start_date,
  max(s.end_date) AS end_date,
  max(coalesce(s.note, '')) AS note,
  strftime('%Y-%m-%dT%H:%M:%fZ','now') AS created_at
FROM care_schedules s
JOIN plants p ON p.id = s.plant_id
WHERE p.user_id IS NOT NULL
GROUP BY p.user_id, variety_key, s.task_type;

