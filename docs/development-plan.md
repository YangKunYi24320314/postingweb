# 并行开发计划（分工 + 排期）

> 前提：契约已冻结（`docs/database-schema.md`、`docs/api-protocol.md`、`docs/openapi.yaml`），
> 后端参考模块（`server/routes/auth.js` + `utils/response.js` + `middleware/auth.js`）已就绪。
> 大家**严格照 `auth.js` 的写法**写自己的模块，风格就统一了。

## 一、分工原则：后端按"模块"拆，前端按"页面"拆

每个人在 `server/routes/` 写自己的路由文件，在 `client/src/` 写自己的页面，**接口和表结构都不许动别人的**。

| 成员 | 后端负责 | 前端负责 | 说明 |
|------|----------|----------|------|
| （成员A） | `auth`（已完成，作参考） | Login / Profile 页 | 已由 PM 打好地基，其他人照抄 |
| （成员B） | `categories.js` + `tags.js` | — | 最轻，先练手 |
| （成员C） | `posts.js` | Posts 列表 + 发帖页 | 核心 |
| （成员D） | `comments.js` + `comment_likes.js` | — | 依赖 posts |
| （成员E） | `likes.js` + `favorites.js` | — | 依赖 posts |
| （成员A/PM） | `history.js` + `me.js` | Records / Home 页 | 记录中心 |

## 二、后端依赖顺序（决定谁先做完）

```
auth(参考/已有) → categories/tags(无依赖，先做) → posts → comments → like/favorite → history → recommend(二期可选)
```

- 下游依赖上游：`comments`/`likes`/`favorites` 都引 `posts.id`，所以 **posts 必须先在**。
- `recommend` 二期做，别卡主线。

## 三、关键边界（谁都不许越界）

1. **接口地址/字段只能按 `docs/api-protocol.md`**，新增=改合同=必须开会同步。
2. **表结构只能按 `docs/database-schema.md`**，加列=先改文档。
3. 每个路由文件 = `express.Router()` + 用 `ok/fail` + 参数化查询 + 需要登录就挂 `auth`。**照抄 `auth.js`。**
4. 前端页面放 `client/src/views/`，请求全部走 `src/api/xxx.js`（统一封装），**页面里禁止直接 `fetch/axios`**。

## 四、每日节奏（6 天）

| 天 | 目标 |
|----|------|
| Day1 | 全员配好环境（装依赖、建库、跑通 `auth`）；确认成员A的 auth 能注册/登录 |
| Day2 | 后端：categories/tags + posts 全部接口完成 |
| Day3 | 前端：帖子列表 + 发帖/详情页调通；后端：comments 完成 |
| Day4 | 后端：like/favorite 完成；前端：评论/点赞/收藏组件 |
| Day5 | 后端：history/me 完成；前端：记录中心/个人中心；整体联调 |
| Day6 | 联调 + 找 bug + 演示准备；推荐（二期）如果来得及才做 |

## 五、提交与协作（README 第五节已有规则）

- 从 `develop` 拉功能分支 → 开发 → 提 PR → 组员 Code Review → 合并。
- 多人并行时**少改同一个文件**；若必须改（如 `server.js` 挂载点、`BaseLayout.vue`），先跟对方打招呼。

## 六、给每个成员的"第一件事"

1. `git pull` 拿到最新。
2. 看 `AGENTS.md` 前三节 + 自己的模块接口（`docs/api-protocol.md`）。
3. 复制 `server/.env.example` → `.env`，跑 `npm install` + `npm run dev`，确认 `/api/auth/login` 能通。
4. 打开 `server/routes/auth.js`，照着写自己的路由文件；写完跑 `npm run format`。
