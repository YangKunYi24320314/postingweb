-- CampusHub sample data for testing category, tag, hot rank, and recommend rank.
-- Run after devdocs/campushub_schema.sql or after the category/tag seed data is ready.
-- Demo user password: 123456

BEGIN;

INSERT INTO categories (name, description, sort_order) VALUES
  ('课程学业', '课程讨论、选课建议、复习资料、考试经验', 10),
  ('校园生活', '食堂、宿舍、校园服务、日常见闻', 20),
  ('社团活动', '社团招新、活动发布、校园文化生活', 30),
  ('二手闲置', '教材、电子产品、生活用品等闲置流转', 40),
  ('求助问答', '学习、生活、办事流程等问题求助', 50),
  ('组队搭子', '学习组队、运动搭子、比赛和项目招募', 60),
  ('校园资讯', '校内通知、讲座比赛、实用信息汇总', 70),
  ('经验分享', '学习规划、实习就业、竞赛项目等经验沉淀', 80)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

UPDATE posts
SET category_id = (SELECT id FROM categories WHERE name = '校园生活')
WHERE category_id IN (SELECT id FROM categories WHERE name = '随便聊聊');

UPDATE posts
SET category_id = (SELECT id FROM categories WHERE name = '课程学业')
WHERE category_id IN (SELECT id FROM categories WHERE name = '学习交流');

UPDATE posts
SET category_id = (SELECT id FROM categories WHERE name = '二手闲置')
WHERE category_id IN (SELECT id FROM categories WHERE name = '二手交易');

DELETE FROM categories
WHERE name IN ('随便聊聊', '学习交流', '二手交易');

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
  ('通勤')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (username, password_hash, nickname, bio) VALUES
  ('demo_study', '$2a$10$ACSd6ZcgqqJGvEbXqAke4.T.aCllXIDU86ASgD8a2C9.VpRooNhlS', '复习搭子', '偏好课程、考研和自习室内容'),
  ('demo_life', '$2a$10$ACSd6ZcgqqJGvEbXqAke4.T.aCllXIDU86ASgD8a2C9.VpRooNhlS', '校园生活家', '喜欢食堂、宿舍和生活求助'),
  ('demo_activity', '$2a$10$ACSd6ZcgqqJGvEbXqAke4.T.aCllXIDU86ASgD8a2C9.VpRooNhlS', '活动雷达', '关注社团活动和组队'),
  ('demo_trade', '$2a$10$ACSd6ZcgqqJGvEbXqAke4.T.aCllXIDU86ASgD8a2C9.VpRooNhlS', '闲置交换员', '关注二手教材和电子产品')
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nickname = EXCLUDED.nickname,
  bio = EXCLUDED.bio;

DELETE FROM histories
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM favorites
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM post_likes
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM comment_likes
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM comments
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

DELETE FROM posts
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

INSERT INTO posts (user_id, category_id, title, content, view_count, created_at, updated_at)
SELECT u.id, c.id, v.title, v.content, v.view_count, v.created_at, v.created_at
FROM (
  VALUES
    ('demo_study', '课程学业', '高数期末复习资料整理：重点题型和错题清单', '整理了高数期末常见题型、易错点和几套练习题，适合最后一周快速查漏补缺。', 138, now() - interval '2 hours'),
    ('demo_study', '课程学业', '考研自习室座位体验：图书馆三楼和教学楼 B 区对比', '最近跑了几个自习点，简单比较安静程度、插座数量和晚间开放情况。', 96, now() - interval '8 hours'),
    ('demo_study', '课程学业', '选课避坑：通识课 workload 和给分体验汇总', '欢迎大家补充自己上过的通识课体验，主要从作业量、课堂参与和期末形式来写。', 72, now() - interval '1 day'),
    ('demo_life', '校园生活', '新学期食堂测评：二食堂窗口更新后哪些值得冲', '试了几家新窗口，记录价格、排队时间和口味，给选择困难的同学参考。', 210, now() - interval '5 hours'),
    ('demo_life', '校园生活', '宿舍降噪小经验：不伤和气的沟通方式和耳塞推荐', '晚睡和早起作息不一样时，沟通比硬忍更有效，也整理了一些实用工具。', 84, now() - interval '2 days'),
    ('demo_activity', '社团活动', '摄影社秋季招新：周末校园夜景外拍报名', '本周六晚上会从图书馆出发拍校园夜景，新手也可以参加，会有人带基础参数。', 155, now() - interval '4 hours'),
    ('demo_activity', '社团活动', '校园音乐会志愿者招募：需要现场引导和摄影记录', '活动在周五晚，需要 8 名志愿者，参与后可开志愿证明。', 65, now() - interval '3 days'),
    ('demo_trade', '二手闲置', '出大一公共课教材和几本考研数学资料', '书保存较好，可单本出，也可以打包带走，校内当面交易。', 118, now() - interval '7 hours'),
    ('demo_trade', '二手闲置', '出 27 寸显示器和蓝牙键盘，适合宿舍桌面', '显示器无坏点，键盘电池健康，想换设备所以出掉。', 142, now() - interval '1 day 4 hours'),
    ('demo_life', '求助问答', '有人在东门附近捡到校园卡吗？卡套是蓝色的', '今天中午从东门到图书馆路上丢了校园卡，找到了请联系我，感谢。', 230, now() - interval '1 hour'),
    ('demo_study', '求助问答', '数据库实验连接 PostgreSQL 一直失败，可能是什么原因？', '已经确认服务启动了，但是应用还是连不上，想问问大家一般从哪里排查。', 56, now() - interval '6 hours'),
    ('demo_activity', '组队搭子', '找考研晚自习搭子：每晚 7 点到 10 点图书馆', '希望互相监督，不聊天也可以，主要是保持稳定学习节奏。', 134, now() - interval '12 hours'),
    ('demo_activity', '组队搭子', '周三晚羽毛球缺两个人，水平不限', '体育馆 3 号场，主要是出汗放松，拍子可以借。', 88, now() - interval '10 hours'),
    ('demo_life', '校园资讯', '本周讲座整理：AI 应用、就业规划和竞赛经验分享', '整理了本周校内几个值得关注的讲座时间地点，方便大家选择参加。', 176, now() - interval '9 hours'),
    ('demo_trade', '校园资讯', '校园巴士晚间班次调整，通勤同学注意时间变化', '晚间最后一班提前了 15 分钟，建议大家提前规划路线。', 64, now() - interval '4 days'),
    ('demo_study', '经验分享', '从零开始做 Web 课程项目：分支、接口和日报怎么安排', '总结这两天做项目的经验，包括分工、接口联调、Git 冲突和每日记录。', 190, now() - interval '30 minutes')
) AS v(username, category_name, title, content, view_count, created_at)
JOIN users u ON u.username = v.username
JOIN categories c ON c.name = v.category_name;

INSERT INTO post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM (
  VALUES
    ('高数期末复习资料整理：重点题型和错题清单', '期末复习'),
    ('高数期末复习资料整理：重点题型和错题清单', '课程资料'),
    ('高数期末复习资料整理：重点题型和错题清单', '经验分享'),
    ('考研自习室座位体验：图书馆三楼和教学楼 B 区对比', '考研'),
    ('考研自习室座位体验：图书馆三楼和教学楼 B 区对比', '自习室'),
    ('选课避坑：通识课 workload 和给分体验汇总', '选课'),
    ('选课避坑：通识课 workload 和给分体验汇总', '课程资料'),
    ('新学期食堂测评：二食堂窗口更新后哪些值得冲', '食堂测评'),
    ('新学期食堂测评：二食堂窗口更新后哪些值得冲', '校园通知'),
    ('宿舍降噪小经验：不伤和气的沟通方式和耳塞推荐', '宿舍生活'),
    ('宿舍降噪小经验：不伤和气的沟通方式和耳塞推荐', '生活求助'),
    ('摄影社秋季招新：周末校园夜景外拍报名', '社团招新'),
    ('摄影社秋季招新：周末校园夜景外拍报名', '活动报名'),
    ('校园音乐会志愿者招募：需要现场引导和摄影记录', '活动报名'),
    ('出大一公共课教材和几本考研数学资料', '二手教材'),
    ('出大一公共课教材和几本考研数学资料', '考研'),
    ('出 27 寸显示器和蓝牙键盘，适合宿舍桌面', '电子产品'),
    ('出 27 寸显示器和蓝牙键盘，适合宿舍桌面', '宿舍生活'),
    ('有人在东门附近捡到校园卡吗？卡套是蓝色的', '失物招领'),
    ('有人在东门附近捡到校园卡吗？卡套是蓝色的', '生活求助'),
    ('数据库实验连接 PostgreSQL 一直失败，可能是什么原因？', '课程资料'),
    ('数据库实验连接 PostgreSQL 一直失败，可能是什么原因？', '生活求助'),
    ('找考研晚自习搭子：每晚 7 点到 10 点图书馆', '考研'),
    ('找考研晚自习搭子：每晚 7 点到 10 点图书馆', '自习室'),
    ('找考研晚自习搭子：每晚 7 点到 10 点图书馆', '组队学习'),
    ('周三晚羽毛球缺两个人，水平不限', '运动健身'),
    ('周三晚羽毛球缺两个人，水平不限', '组队学习'),
    ('本周讲座整理：AI 应用、就业规划和竞赛经验分享', '校园通知'),
    ('本周讲座整理：AI 应用、就业规划和竞赛经验分享', '实习就业'),
    ('本周讲座整理：AI 应用、就业规划和竞赛经验分享', '经验分享'),
    ('校园巴士晚间班次调整，通勤同学注意时间变化', '通勤'),
    ('校园巴士晚间班次调整，通勤同学注意时间变化', '校园通知'),
    ('从零开始做 Web 课程项目：分支、接口和日报怎么安排', '经验分享'),
    ('从零开始做 Web 课程项目：分支、接口和日报怎么安排', '课程资料')
) AS v(title, tag_name)
JOIN posts p ON p.title = v.title
JOIN tags t ON t.name = v.tag_name
ON CONFLICT DO NOTHING;

INSERT INTO comments (post_id, user_id, content, created_at, updated_at)
SELECT p.id, u.id, v.content, v.created_at, v.created_at
FROM (
  VALUES
    ('高数期末复习资料整理：重点题型和错题清单', 'demo_life', '这个错题清单很有用，期末周救命。', now() - interval '90 minutes'),
    ('新学期食堂测评：二食堂窗口更新后哪些值得冲', 'demo_study', '二食堂那个砂锅确实排队很久，但味道不错。', now() - interval '3 hours'),
    ('有人在东门附近捡到校园卡吗？卡套是蓝色的', 'demo_activity', '可以问一下东门保安亭，之前有人捡到会放那里。', now() - interval '40 minutes'),
    ('找考研晚自习搭子：每晚 7 点到 10 点图书馆', 'demo_trade', '我也想加入，主要复习数学。', now() - interval '6 hours'),
    ('从零开始做 Web 课程项目：分支、接口和日报怎么安排', 'demo_activity', 'Git 冲突这段太真实了，可以写进日报。', now() - interval '20 minutes')
) AS v(title, username, content, created_at)
JOIN posts p ON p.title = v.title
JOIN users u ON u.username = v.username;

INSERT INTO post_likes (user_id, post_id)
SELECT u.id, p.id
FROM (
  VALUES
    ('demo_study', '高数期末复习资料整理：重点题型和错题清单'),
    ('demo_life', '高数期末复习资料整理：重点题型和错题清单'),
    ('demo_activity', '高数期末复习资料整理：重点题型和错题清单'),
    ('demo_trade', '高数期末复习资料整理：重点题型和错题清单'),
    ('demo_study', '新学期食堂测评：二食堂窗口更新后哪些值得冲'),
    ('demo_life', '新学期食堂测评：二食堂窗口更新后哪些值得冲'),
    ('demo_activity', '新学期食堂测评：二食堂窗口更新后哪些值得冲'),
    ('demo_study', '从零开始做 Web 课程项目：分支、接口和日报怎么安排'),
    ('demo_life', '从零开始做 Web 课程项目：分支、接口和日报怎么安排'),
    ('demo_activity', '摄影社秋季招新：周末校园夜景外拍报名'),
    ('demo_trade', '出 27 寸显示器和蓝牙键盘，适合宿舍桌面'),
    ('demo_study', '找考研晚自习搭子：每晚 7 点到 10 点图书馆')
) AS v(username, title)
JOIN users u ON u.username = v.username
JOIN posts p ON p.title = v.title
ON CONFLICT DO NOTHING;

INSERT INTO favorites (user_id, post_id)
SELECT u.id, p.id
FROM (
  VALUES
    ('demo_study', '考研自习室座位体验：图书馆三楼和教学楼 B 区对比'),
    ('demo_study', '找考研晚自习搭子：每晚 7 点到 10 点图书馆'),
    ('demo_life', '新学期食堂测评：二食堂窗口更新后哪些值得冲'),
    ('demo_life', '宿舍降噪小经验：不伤和气的沟通方式和耳塞推荐'),
    ('demo_activity', '摄影社秋季招新：周末校园夜景外拍报名'),
    ('demo_activity', '校园音乐会志愿者招募：需要现场引导和摄影记录'),
    ('demo_trade', '出大一公共课教材和几本考研数学资料'),
    ('demo_trade', '出 27 寸显示器和蓝牙键盘，适合宿舍桌面'),
    ('demo_study', '从零开始做 Web 课程项目：分支、接口和日报怎么安排')
) AS v(username, title)
JOIN users u ON u.username = v.username
JOIN posts p ON p.title = v.title
ON CONFLICT DO NOTHING;

INSERT INTO histories (user_id, post_id, viewed_at, created_at, updated_at)
SELECT u.id, p.id, v.viewed_at, v.viewed_at, v.viewed_at
FROM (
  VALUES
    ('demo_study', '高数期末复习资料整理：重点题型和错题清单', now() - interval '50 minutes'),
    ('demo_study', '考研自习室座位体验：图书馆三楼和教学楼 B 区对比', now() - interval '45 minutes'),
    ('demo_study', '找考研晚自习搭子：每晚 7 点到 10 点图书馆', now() - interval '30 minutes'),
    ('demo_study', '从零开始做 Web 课程项目：分支、接口和日报怎么安排', now() - interval '15 minutes'),
    ('demo_life', '新学期食堂测评：二食堂窗口更新后哪些值得冲', now() - interval '70 minutes'),
    ('demo_life', '宿舍降噪小经验：不伤和气的沟通方式和耳塞推荐', now() - interval '60 minutes'),
    ('demo_life', '有人在东门附近捡到校园卡吗？卡套是蓝色的', now() - interval '35 minutes'),
    ('demo_activity', '摄影社秋季招新：周末校园夜景外拍报名', now() - interval '80 minutes'),
    ('demo_activity', '校园音乐会志愿者招募：需要现场引导和摄影记录', now() - interval '55 minutes'),
    ('demo_activity', '周三晚羽毛球缺两个人，水平不限', now() - interval '25 minutes'),
    ('demo_trade', '出大一公共课教材和几本考研数学资料', now() - interval '2 hours'),
    ('demo_trade', '出 27 寸显示器和蓝牙键盘，适合宿舍桌面', now() - interval '90 minutes')
) AS v(username, title, viewed_at)
JOIN users u ON u.username = v.username
JOIN posts p ON p.title = v.title
ON CONFLICT (user_id, post_id) DO UPDATE SET
  viewed_at = EXCLUDED.viewed_at,
  updated_at = EXCLUDED.updated_at;

UPDATE posts p
SET
  like_count = COALESCE(l.count_value, 0),
  favorite_count = COALESCE(f.count_value, 0),
  comment_count = COALESCE(c.count_value, 0),
  updated_at = p.updated_at
FROM (
  SELECT p2.id
  FROM posts p2
  JOIN users u2 ON u2.id = p2.user_id
  WHERE u2.username LIKE 'demo_%'
) demo_posts
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS count_value FROM post_likes pl WHERE pl.post_id = demo_posts.id
) l ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS count_value FROM favorites f WHERE f.post_id = demo_posts.id
) f ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS count_value FROM comments c WHERE c.post_id = demo_posts.id AND c.status = 1
) c ON true
WHERE p.id = demo_posts.id;

COMMIT;
