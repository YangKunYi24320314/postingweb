-- CampusHub PostgreSQL database schema
-- 建议执行方式：
-- 1. 先创建数据库：CREATE DATABASE campushub;
-- 2. 连接到该数据库后，再运行本文件。
-- 注意：本脚本会 DROP 已有同名表，适合开发初期初始化使用。
BEGIN;
DROP TABLE IF EXISTS user_tag_preferences CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS histories CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_attachments CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar_url VARCHAR(500),
  background_url VARCHAR(500),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  bio VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('user', 'admin')),
  CONSTRAINT users_status_check CHECK (status IN (0, 1)),
  CONSTRAINT users_phone_check CHECK (phone IS NULL OR phone ~ '^1[3-9][0-9]{9}$')
);

-- 绑定和找回密码都使用这里的一次性验证码；只保存验证码哈希，避免明文泄露。
CREATE TABLE verification_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(10) NOT NULL,
  target VARCHAR(100) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT verification_codes_channel_check CHECK (channel IN ('phone', 'email')),
  CONSTRAINT verification_codes_purpose_check CHECK (purpose IN ('bind', 'password_reset')),
  CONSTRAINT verification_codes_attempts_check CHECK (attempts >= 0 AND attempts <= 5)
);

CREATE INDEX verification_codes_lookup_idx
  ON verification_codes (user_id, channel, target, purpose, created_at DESC);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  category_id BIGINT REFERENCES categories(id),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT posts_status_check CHECK (status IN (0, 1, 2)),
  CONSTRAINT posts_count_check CHECK (
    view_count >= 0
    AND like_count >= 0
    AND favorite_count >= 0
    AND comment_count >= 0
  )
);

CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE post_tags (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

-- ========== 新增：帖子附件表 ==========
CREATE TABLE post_attachments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 约束：文件大小非负
  CONSTRAINT post_attachments_size_check CHECK (file_size >= 0)
);

CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comments_status_check CHECK (status IN (0, 1)),
  CONSTRAINT comments_like_count_check CHECK (like_count >= 0)
);

CREATE TABLE post_likes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_user_post_unique UNIQUE (user_id, post_id)
);

CREATE TABLE comment_likes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_likes_user_comment_unique UNIQUE (user_id, comment_id)
);

CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT favorites_user_post_unique UNIQUE (user_id, post_id)
);

CREATE TABLE histories (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT histories_user_post_unique UNIQUE (user_id, post_id)
);

CREATE TABLE user_tag_preferences (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  weight INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag_id),
  CONSTRAINT user_tag_preferences_weight_check CHECK (weight >= 0)
);

-- 性能索引
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_hot ON posts(like_count DESC, comment_count DESC, favorite_count DESC, created_at DESC);
CREATE INDEX idx_posts_not_deleted ON posts(is_deleted, status);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
-- 附件表索引
CREATE INDEX idx_post_attachments_post_id ON post_attachments(post_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_favorites_post_id ON favorites(post_id);
CREATE INDEX idx_histories_user_viewed_at ON histories(user_id, viewed_at DESC);

-- 初始化默认分类
INSERT INTO categories (name, description, sort_order) VALUES
  ('课程学业', '课程讨论、选课建议、复习资料、考试经验', 10),
  ('校园生活', '食堂、宿舍、校园服务、日常见闻', 20),
  ('社团活动', '社团招新、活动发布、校园文化生活', 30),
  ('二手闲置', '教材、电子产品、生活用品等闲置流转', 40),
  ('求助问答', '学习、生活、办事流程等问题求助', 50),
  ('组队搭子', '学习组队、运动搭子、比赛和项目招募', 60),
  ('校园资讯', '校内通知、讲座比赛、实用信息汇总', 70),
  ('经验分享', '学习规划、实习就业、竞赛项目等经验沉淀', 80);

-- 初始化默认标签
INSERT INTO tags (name) VALUES
  ('考研'),
  ('自习室'),
  ('课程资料'),
  ('选课'),
  ('期末复习'),
  ('食堂测评'),
  ('宿舍生活'),
  ('二手教材'),
  ('电子产品'),
  ('社团招新'),
  ('活动报名'),
  ('组队学习'),
  ('运动健身'),
  ('实习就业'),
  ('校园通知'),
  ('生活求助'),
  ('经验分享'),
  ('失物招领'),
  ('租房'),
  ('通勤');

COMMIT;
