# 首页帖子入口与页脚 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留认证功能的前提下，将 `develop` 的帖子模块接入 `update`，并完成首页推荐/热门/最新入口和信息页脚。

**Architecture:** 合并 `origin/develop` 的帖子相关代码，冲突时保留 `update` 的认证实现。首页复用 `getPostList({ rank })`，布局层提供全站页脚，帖子广场承载完整筛选和分页。

**Tech Stack:** Vue 3、Vue Router 4、Vite、Element Plus、Node.js、Express 5、PostgreSQL、node:test。

## Global Constraints

- 不覆盖用户名登录、手机号/邮箱绑定、验证码和修改密码。
- 推荐排序复用 `rank=recommend`，不新增推荐算法。
- GitHub：`https://github.com/YangKunYi24320314/postingweb`。
- 团队联系及帮助/建议/投诉：`mailto:205613196@qq.com`。
- 不新增评论、点赞、收藏业务逻辑。

### Task 1: 合并 develop 帖子模块并保留认证

**Files:** `client/src/api/*`, `client/src/components/*`, `client/src/views/PostsView.vue`, `client/src/views/PostDetailView.vue`, `client/src/views/WritePostView.vue`, `client/src/views/RecordsView.vue`, `client/src/router/index.js`, `client/src/layouts/BaseLayout.vue`, `client/vite.config.js`, `server/routes/posts.js`, `server/routes/catalog.js`, `server/routes/attachments.js`, `server/routes/history.js`, `server/routes/me.js`, `server/routes/interactions.js`, `server/server.js`。

**Interfaces:** 输入为 `origin/develop@03499ad` 和 `update@36cd92d`；输出为 `/post-page`、`/post/:id`、`/write`、`/records`、`/api/posts`、`/api/categories`、`/api/tags`，并保留所有 contact-auth 端点。

- [ ] **Step 1: Merge without committing.**

```powershell
git merge origin/develop --no-commit --no-ff
```

- [ ] **Step 2: Resolve shared files.** 保留 `update` 的 `client/src/api/auth.js`、登录/个人中心、`server/routes/auth.js`、contact-auth 服务和认证工具；采用 `develop` 的帖子、分类、附件、记录模块；共享入口同时保留认证中间件并注册新路由。
- [ ] **Step 3: Install dependencies and inspect staged scope.**

```powershell
cd server; npm install
cd ..\client; npm install
git diff --name-status --cached
```

- [ ] **Step 4: Run the pre-UI checks.**

```powershell
cd server; npm test
cd ..\client; npm run lint; npm run build
```

- [ ] **Step 5: Commit the merge.**

```powershell
git add client server devdocs package.json package-lock.json
git commit -m "feat: integrate post modules into update"
```

### Task 2: Add homepage content tabs

**Files:** Modify `client/src/views/HomeView.vue`; create `client/test/home-content.test.js`。

**Interfaces:** 消费 `getPostList(params)`，产出 `recommend`、`hot`、`latest` 三个模式、加载态、空态和帖子详情链接。

- [ ] **Step 1: Add the failing source contract test.**

```js
test('home page exposes ranking modes', async () => {
  const source = await readFile(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
  assert.match(source, /recommend/)
  assert.match(source, /hot/)
  assert.match(source, /latest/)
  assert.match(source, /getPostList/)
})
```

- [ ] **Step 2: Run it and confirm the expected failure.**

```powershell
cd client; node --test test/home-content.test.js
```

- [ ] **Step 3: Implement the feed.** 加载 `getPostList({ page: 1, pageSize: 6, rank: activeRank })`，展示标题、分类、作者和时间；推荐接口未登录时提供登录入口。
- [ ] **Step 4: Run focused and frontend checks.**

```powershell
cd client; node --test test/home-content.test.js; npm run lint; npm run build
```

- [ ] **Step 5: Commit.**

```powershell
git add client/src/views/HomeView.vue client/test/home-content.test.js
git commit -m "feat: add home post ranking tabs"
```

### Task 3: Build the information footer

**Files:** Modify `client/src/layouts/BaseLayout.vue`; create `client/test/footer.test.js`。

**Interfaces:** 产出可访问的 GitHub、团队联系、帮助/建议/投诉链接。

- [ ] **Step 1: Add the failing footer contract test.**

```js
test('footer exposes repository and feedback links', async () => {
  const source = await readFile(new URL('../src/layouts/BaseLayout.vue', import.meta.url), 'utf8')
  assert.match(source, /github\.com\/YangKunYi24320314\/postingweb/)
  assert.match(source, /mailto:205613196@qq\.com/)
  assert.match(source, /帮助|建议|投诉/)
})
```

- [ ] **Step 2: Run it and confirm the expected failure.**

```powershell
cd client; node --test test/footer.test.js
```

- [ ] **Step 3: Implement the footer.** 使用现有 Element Plus 图标，深色全宽区域展示仓库、团队邮箱、帮助/建议/投诉邮箱；移动端单列，不嵌套卡片，保留版权行。
- [ ] **Step 4: Run checks and browser verification.**

```powershell
cd client; npm run lint; npm run build
```

使用 Playwright 检查桌面和移动端首页的三个模式、空态/帖子以及 footer href。

- [ ] **Step 5: Commit.**

```powershell
git add client/src/layouts/BaseLayout.vue client/test/footer.test.js
git commit -m "feat: add homepage information footer"
```

### Task 4: Final verification and upload

- [ ] **Step 1:** 运行 `server/npm test`、`client/npm run lint`、`client/npm run build`。
- [ ] **Step 2:** 用 `111 / 123456` 登录，打开首页，切换三个模式并检查页脚链接。
- [ ] **Step 3:** 用 `git status --short --branch` 和 `git diff --stat origin/update...HEAD` 检查没有密钥或生成文件。
- [ ] **Step 4:** 推送 `update`。

```powershell
git push origin update
```
