# PostWEB · 校园发帖社区

一个给大学校园用的**发帖社区论坛** Web 应用。5 名新手在一门 6 天的短学期课程里从零协作开发。

> **给 AI 的说明书在 [`AGENTS.md`](./AGENTS.md)**，新开 AI 会话请先读它。
> 给团队的正式契约在 [`devdocs/`](./devdocs/) 目录，改代码前务必先读。

---

## 功能模块

1. 用户与认证（注册 / 登录 / 个人信息）
2. 帖子核心（发布 / 删除 / 筛选 / 搜索）
3. 互动系统（评论 / 点赞 / 收藏）
4. 记录中心（浏览历史 / 个人记录）
5. 推荐（可选，基于标签的简化推荐，二期）

## 技术栈

| 端 | 技术 | 端口 |
|----|------|------|
| 前端 | Vue 3 + Vite + Element Plus | 5173 |
| 后端 | Node.js + Express | 3000 |
| 数据库 | PostgreSQL | 5432 |
| 文档/联调 | Apifox（团队：PostWEB） | — |

## 目录结构

```
postingweb/
├── client/      # 前端（Vue3 + Vite，独立 npm 包）
├── server/      # 后端（Express，独立 npm 包）
├── devdocs/     # ★ 契约文档（ER图 / 接口协议 / OpenAPI）
└── AGENTS.md    # ★ AI 协作说明书（新 AI 会话先读它）
```

## 快速开始

**前端（client/）**
```bash
npm install
npm run dev      # http://localhost:5173
```

**后端（server/）**
```bash
npm install
npm run dev      # http://localhost:3000
```

前后端是两个独立 npm 包，各自启动。前端通过 `/api/...` 访问后端，跨域由后端 `cors` 放开。

### 数据库初始化（第一次跑之前必须做）

后端通过 `pg` 连 PostgreSQL，表结构脚本在 `devdocs/campushub_schema.sql`。步骤如下：

```bash
# 1. 先安装并启动 PostgreSQL，然后在终端建库
psql -U postgres -c "CREATE DATABASE campushub;"

# 2. 给刚建的库执行建表脚本（含表、索引、种子数据）
psql -U postgres -d campushub -f devdocs/campushub_schema.sql

# 3. 在 server/ 下把 .env.example 复制成 .env，填你的数据库账号密码
#    Windows: copy .env.example .env    Linux/macOS: cp .env.example .env

# 4. 重启后端即可
cd server && npm run dev
```

> 数据库配置、JWT 密钥都放在 `server/.env`（已被 git 忽略，不会上传），模板见 `server/.env.example`。

## 文档与契约（权威来源）

| 文件 | 作用 |
|------|------|
| [`devdocs/database-schema.md`](./devdocs/database-schema.md) | ER 图 + 表结构，**唯一表结构权威** |
| [`devdocs/api-protocol.md`](./devdocs/api-protocol.md) | 接口协议，**唯一接口权威** |
| [`devdocs/openapi.yaml`](./devdocs/openapi.yaml) | 可直接导入 Apifox 的 OpenAPI 规范 |
| [`devdocs/development-plan.md`](./devdocs/development-plan.md) | 分工 + 排期 + 边界规则（开工必看） |
| [`AGENTS.md`](./AGENTS.md) | 给 AI 助手的项目说明 |

---

## 团队规范（全员守则）

### 一、范围与时间限制（MVP 原则）

- 只做核心链路，时间不够就功能降级。
- 讨论 ER 图和接口时，任何**不在核心链路上**的新字段/新接口，一律记录但不做。先跑通，再优化。

### 二、数据库 ER 图设计规则

- 表名用**复数**（`users`、`posts`）；字段用**蛇形命名**（`created_at`、`user_id`），全小写。
- 每张表必须有 `id`（主键）、`created_at`、`updated_at`。
- 必须写清外键关系。
- **禁用存储过程和复杂触发器**，逻辑都在 Node.js 代码里处理。

### 三、接口文档规范（Apifox）

- 统一返回结构 `{ code, message, data }`。
- RESTful 风格：列表 `GET /posts`，创建 `POST /posts`，删除 `DELETE /posts/:id`。
- 错误码约定：`1001` 参数错 / `1002` 未登录 / `1003` 无权限 / `1005` 冲突重复 / `5000` 服务器错（`0` 成功）。
- **开发必须严格对照 Apifox，不允许私自改字段名。**

### 四、AI 辅助开发与代码规范（重点协调）

- 全员在编辑器装 **Prettier + ESLint**，设置**保存时自动格式化**；提交前必须格式化，避免 AI 生成的缩进/引号不统一导致 Git 冲突。
- **不要直接复制粘贴 AI 生成的整段代码**：让 AI 写代码时要加中文注释，且你自己必须能向队友解释这段代码在做什么。
- 命名：前端 Vue 组件用 **PascalCase**，后端路由/控制器文件用 **camelCase**。

### 五、Git 与协作流程

- `main` 受保护，禁止直接推送。
- 每人从 `develop` 拉自己的功能分支 → 开发完提 **Pull Request** → 其他组员 **Code Review** 通过后合并。

### 六、UI 统一规范

1. **强制用 Element Plus 组件**：禁止原生 `<button>`、`<input>`，一律用 `<el-button>`、`<el-input>`。
2. **用全局设计变量**：禁止在 `.vue` 里写死颜色，只用 `src/styles/tokens.css` 里的 `var(--...)`。
3. **统一 AI 提示词模板**（复制给 AI）：
   > "请用 Vue 3 + Element Plus 帮我写这个组件。要求：只用 `el-` 开头组件（如 `el-card`）；样式用 scoped style，只用全局 CSS 变量（如 `var(--brand-primary)`、`var(--space-md)`）；不写内联样式；注释用中文，简单清晰。"
4. **锁定布局骨架**：直接套用 PM 写的 `BaseLayout.vue`，不允许自己重新搭框架。
