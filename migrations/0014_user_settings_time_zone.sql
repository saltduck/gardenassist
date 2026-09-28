-- 用户设置：日历/待办日期对齐用 IANA 时区（可与所在地联动）
ALTER TABLE user_settings ADD COLUMN time_zone TEXT NOT NULL DEFAULT '';
