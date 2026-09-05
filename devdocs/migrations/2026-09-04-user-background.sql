-- 个人主页背景图：为旧库补充 users.background_url 列。
-- 新库直接跑 devdocs/campushub_schema.sql 已自带此列，无需执行本迁移。
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS background_url VARCHAR(500);
