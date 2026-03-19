-- 将现有植物与全局设置迁移到 hongshuning@gmail.com 用户下
-- 若该用户不存在则创建（临时密码: ChangeMe1，登录后请尽快修改）

-- 1. 确保用户存在（临时密码 ChangeMe1，对应 salt 全0 的 SHA-256）
INSERT OR IGNORE INTO users (id, email, password_hash, salt, created_at)
VALUES (
  'a0000001-0000-4000-8000-000000000001',
  'hongshuning@gmail.com',
  '9204bd5eee181d29e1365b2d7dcc1b5979a852990e02cfb54a85b0b196dbed0b',
  '00000000000000000000000000000000',
  coalesce((SELECT created_at FROM users WHERE email = 'hongshuning@gmail.com' LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 2. 将所有未归属的植物划给该用户
UPDATE plants
SET user_id = (SELECT id FROM users WHERE email = 'hongshuning@gmail.com' LIMIT 1)
WHERE user_id IS NULL;

-- 3. 将原全局所在地设置写入该用户的 user_settings
INSERT OR REPLACE INTO user_settings (user_id, location, updated_at)
SELECT
  u.id,
  coalesce((SELECT location FROM app_settings WHERE id = 'global' LIMIT 1), ''),
  coalesce((SELECT updated_at FROM app_settings WHERE id = 'global' LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now'))
FROM users u
WHERE u.email = 'hongshuning@gmail.com';
