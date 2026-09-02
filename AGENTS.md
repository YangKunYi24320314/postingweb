# AGENTS.md — 给 AI 协作助手的项目说明

> 本文件是给在全新会话里空降项目AI的快速说明。
> 目的：让 AI 不误解上下文、少犯与团队约定冲突的错误、能直接上手改代码。
> 人读的话，建议直接看根目录 `README.md` 和 `docs/` 下的契约文档。

## 1. 这是什么项目

一个给大学校园用的**发帖社区论坛** Web 应用。5 名新手在一门 6 天的短学期课程里从零开发，你的任务是尽可能帮他们写出**一致、可运行、新手看得懂**的代码。

**核心功能模块**：用户与认证、帖子（发布/删除/筛选/搜索）、互动（评论/点赞/收藏）、记录中心（浏览历史/个人记录）、推荐（可选，基于标签的简化推荐）。

## 2. 必须遵守的硬约束

1. **接口是一份合同**，地址/入参/出参只能以 `docs/api-protocol.md` 和 `docs/openapi.yaml` 为准，**不要自行发明**或改动接口。改接口 = 改合同 = 必须先改文档并同步全队。
2. **数据库表结构只能以 `docs/database-schema.md` 为准**，不要在没有文档变更的情况下加列/改列。
3. **前端写样式只能用 `src/styles/tokens.css` 里的 CSS 变量**（`--brand-primary`、`--space-md` 等），禁止写死 `#xxxxxx`/`8px` 之类的魔法值。
4. **前端页面必须放 `src/views/`，可复用组件放 `src/components/`**，不要随手在页面里塞一个"只给这一个页面用"的大组件。
5. **前端调后端接口必须走封装层**。约定新建 `src/api/` 目录（统一 axios 封装 + 每模块一个文件），页面里禁止直接写 `fetch/axios`。
6. **全队统一用 Element Plus**，它已在 `main.js` 全局注册，任何 `.vue` 模板里**直接写 `<el-xxx>` 即可，不要重复 import 组件**。图标从 `@element-plus/icons-vue` 按需 import。
7. **统一响应格式**是 `{ code, message, data }`，`code === 0` 表示成功。后端无论多简单都必须保持这三层。
8. **认证用 JWT**，前端存 token，请求头 `Authorization: Bearer <token>`。
9. **不要给提交的代码乱加混乱的风格**。全队用 ESLint + Prettier + .editorconfig，写完跑 `npm run format` 和 `npm run lint`。
10. **代码要"看得懂"**：关键业务逻辑用简短中文注释说明意图（团队要求成员能向队友解释），但别写 `// 递增变量` 这种废话注释。
11. **保持简单、面向新手**。不要引入额外复杂库、不要炫技抽象（比如上微服务/复杂状态管理器），除非被明确要求。

## 3. 技术栈与版本

| 端 | 技术 | 关键依赖 | 入口 | 端口 |
|----|------|----------|------|------|
| 前端 | Vue 3 + Vite | element-plus、@element-plus/icons-vue、vue-router@4 | `client/src/main.js` | 5173（vite 默认） |
| 后端 | Node.js + Express | express@5、cors、dotenv、pg | `server/server.js` | 3000（`process.env.PORT` 或默认） |
| 数据库 | PostgreSQL | pg（node-postgres） | 尚未建 schema | 默认 5432 |

**说明**：后端骨架已就绪（`server/utils/response.js` 统一返回、`server/middleware/auth.js` JWT 认证、`server/routes/auth.js` 是**全队参考实现**）；数据库建表脚本 `docs/campushub_schema.sql` 已提供，但**还没实际建库**（需各人本地跑一次，见 README"数据库初始化"）。

## 4. 仓库结构

```
postingweb/
├── client/                 # 前端（Vue3 + Vite）
│   ├── src/
│   │   ├── main.js         # 注册 ElementPlus(中文包) + 路由 + 全局样式
│   │   ├── App.vue         # 只放 <router-view/>
│   │   ├── style.css       # 全局样式重置 + 公共类(.page-container/.card)
│   │   ├── styles/tokens.css  # ★ 唯一设计变量来源（颜色/间距/圆角/阴影）
│   │   ├── api/            # ★ 调后端的封装层（request.js 是统一封装，每模块一个文件）
│   │   ├── layouts/BaseLayout.vue  # ★ 统一顶部导航 + 内容区，页面放在里面
│   │   ├── router/index.js # 路由表 + 页面标题
│   │   ├── views/          # 每个页面一个文件（Home/Posts/Records/Profile/Login…）
│   │   └── components/     # 可复用组件
│   ├── eslint.config.js    # ESLint 扁平配置
│   ├── .prettierrc.json    # Prettier 配置
│   └── package.json
├── server/                 # 后端（Express）
│   ├── server.js           # 入口：中间件 + 挂载路由 + 404/错误处理
│   ├── db.js               # pg 连接池
│   ├── .env.example        # 环境变量模板
│   ├── utils/response.js   # 统一返回 ok/fail + 错误码
│   ├── middleware/auth.js  # JWT 认证中间件
│   ├── routes/             # 每模块一个文件，server.js 自动加载（auth.js 是参考实现）
│   └── package.json
├── devdocs/                # 契约与文档
│   ├── database-schema.md  # ER 图 + 建表说明（唯一表结构权威）
│   ├── api-protocol.md     # 接口协议（唯一接口权威）
│   ├── openapi.yaml        # 可直接导入 Apifox 的 OpenAPI 规范
│   ├── campushub_schema.sql# 可执行建表脚本（含索引/种子数据）
│   └── development-plan.md # 分工 + 排期 + 边界规则
├── docs/                   # 老师要求的文件夹（非开发参考）
├── daily/                  # 老师要求的文件夹（非开发参考）
├── prompts/                # 老师要求的文件夹（非开发参考）
├── node_modules/           # 根目录遗留文件（gitignored，无实际作用）
├── AGENTS.md               # 给 AI 助手的项目说明
├── README.md               # 项目介绍 + 快速开始
├── .editorconfig           # 编辑器统一配置
├── .gitignore              # git 忽略规则
└── LICENSE                 # 许可证
```

> **注意**：`docs/`、`daily/`、`prompts/` 三个文件夹是**老师要求的交材料目录**（存放老师给的立项文档等），**不属于开发项目的一部分**，不要在里面放/改开发代码，也不要作为接口或表结构的参考。**开发相关的唯一权威文档都在 `devdocs/`。**

## 5. 常用命令

**前端（client/）**
```
npm install        # 首次安装依赖
npm run dev        # 启动开发服务器 (http://localhost:5173)
npm run build      # 生产构建
npm run lint       # 代码检查
npm run lint:fix   # 自动修复可修问题
npm run format     # Prettier 统一格式化
```

**后端（server/）**
```
npm install
npm run dev / npm start   # 即 node server.js (http://localhost:3000)
```

项目内交互说明：前端 `client/` 与后端 `server/` 是**两个独立的 npm 包**，各自装依赖、各自启动。前端通过 `/api/...` 访问后端，跨域由后端 `cors` 中间件放开。

## 6. 关键契约速查（详细版见 devdocs/）

- **返回包裹**：`{ code, message, data }`；`code=0` 成功。
- **错误码**：`1001`参数错误/`1002`未登录或token失效/`1003`无权限/`1004`资源不存在/`1005`冲突重复/`5000`服务器错误。
- **分页**：请求 `page`(默认1) `pageSize`(默认10)；返回 `data = { list, total, page, pageSize }`。
- **主要接口**：
  - 认证：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`、`PUT /api/auth/profile`
  - 帖子：`GET/POST /api/posts`、`GET/PUT/DELETE /api/posts/{id}`
  - 评论：`GET/POST /api/posts/{id}/comments`、`PUT/DELETE /api/comments/{id}`
  - 互动：`POST/DELETE /api/posts/{id}/like`、`POST/DELETE /api/posts/{id}/favorite`
  - 记录：`POST /api/posts/{id}/view`、`GET /api/me/history` 等
  - 其他：`GET /api/categories`、`GET /api/tags`、`GET /api/recommend/posts`
- **数据库核心表**：`users`、`categories`、`posts`、`tags`、`post_tags`、`comments`、`post_likes`、`favorites`、`histories`（+ 可选的 `user_tag_preferences`）。
- **关键业务规则**：帖子**软删除**（`is_deleted`）；帖子表 `*_count` 计数在写入时同事务更新（别每次 COUNT）；点赞/收藏/浏览记录用唯一约束防重复。

## 7. 前端 UI 约定

- 全部界面基于 Element Plus，统一走 `tokens.css` 变量控制配色/间距/圆角/阴影，保证 5 人审美不同也风格统一。
- 顶部导航在 `BaseLayout.vue` 统一维护，新增导航项改它，别在每个页面重复写。
- 页面主体内容用 `.page-container`（自动居中定宽）包住，卡片用 `.card` 类。
- 目标观感：干净、浅色、以品牌蓝 `#3a6df0` 为主色（已映射到 Element Plus 的 `--el-color-primary`）。

## 8. 团队/进度背景

- 4 名新手 + 1 名 PM，6 天短学期项目，全员用不同 AI 协作开发 → **统一和协调是最大挑战**，所以本文件 + `docs/` 契约 + 统一的代码规范必须遵守。
- 建议后端实现顺序：auth → posts → comments → like/favorite → history → recommend。

## 9. 当你被要求改代码时

1. **先读 `docs/*.md`** 了解契约，再动手，别凭空设计。
2. 改前端页面 → 在 `src/views/` 加/改，用 `tokens.css` 变量和 Element Plus 组件。
3. 改后端 → 在 `server/routes/` 加一个文件、导出 `express.Router()`，路由路径以 `/` 开头（如 `/posts`）。**server.js 会自动把 routes/ 下所有文件挂到 `/api` 前缀**，所以加新模块别改 server.js。保持 `{ code, message, data }`。
4. 新增前端请求 → 建 `src/api/` 下的模块函数，放入统一封装，别在页面写请求。
5. 写完跑 `npm run format` + `npm run lint`（前端），确保不引入规范问题。
6. 若不确定某个约定，**停下来问 PM/用户**，不要自己猜一个"更聪明的"实现。

## 10. 前端调接口的统一方式

- 所有请求都走 `src/api/request.js`（axios 封装），**页面里禁止直接写 `axios/fetch`**。
- 每个功能模块一个文件放在 `src/api/`，例如 `auth.js` 里：
  ```js
  import request from './request'
  export function login(data) {
    return request.post('/auth/login', data) // 相对路径，以 /api 为前缀
  }
  ```
- `request.js` 已自动处理三件事：**①带 token ②解开 `{code,message,data}`（调用方直接拿到 `data`）③登录失效(1002)自动清 token 跳登录页**。
- 页面里这么用（`login()` 返回的即 `data`，不用再取 `.data`）：
  ```js
  const data = await login({ username, password })
  saveToken(data.token) // token 从 src/api/request 拿
  ```
- `token` 存于 `localStorage`（key 为 `token`），用 `src/api/request.js` 导出的 `saveToken/getToken/clearToken` 管理。
- 开发时 `vite.config.js` 已把 `/api` 代理到 `http://localhost:3000`，所以前端不用管跨域、也不用写死后端地址。
