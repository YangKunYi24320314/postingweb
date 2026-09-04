# 账号绑定与密码安全实施计划

> **For agentic workers:** Execute this plan task-by-task in the current session with test-first checkpoints.

**Goal:** 为现有认证模块增加真实手机号/邮箱验证码绑定、联系方式登录、修改密码和找回密码。

**Architecture:** 在 Express 认证路由旁增加可注入的验证码服务与短信/邮件 provider；验证码哈希存入 PostgreSQL，联系方式存入 `users`。Vue 通过现有 API 封装提供登录和个人中心账号安全界面。

**Tech Stack:** Node.js + Express 5 + PostgreSQL + bcryptjs + JWT；Vue 3 + Element Plus + Vite；阿里云 SMS SDK；Nodemailer SMTP。

## Global Constraints

- 接口统一返回 `{ code, message, data }`，沿用现有错误码。
- 前端请求必须经过 `client/src/api/request.js`，页面不得直接调用 fetch/axios。
- 前端只使用 Element Plus 组件和现有 CSS 变量。
- 密钥只从后端 `.env` 读取，禁止提交真实凭据。
- 保持 `feature/login` 分支，不推送 `main`；不重新启用分类、评论、点赞、收藏、推荐功能。
- 每次开发前先 `git fetch origin develop`，契约以 `devdocs` 为准。

### Task 1: 认证数据契约和校验工具

**Files:**
- Modify: `devdocs/database-schema.md`, `devdocs/campushub_schema.sql`, `devdocs/api-protocol.md`, `devdocs/openapi.yaml`
- Create: `server/utils/contact-validation.js`, `server/utils/verification-code.js`
- Test: `server/test/contact-validation.test.js`, `server/test/verification-code.test.js`

- [ ] 写手机号、邮箱规范化和验证码生成/校验的失败测试。
- [ ] 运行指定测试确认因工具尚不存在而失败。
- [ ] 实现格式校验、目标规范化、6 位安全随机码、过期和尝试次数判断。
- [ ] 更新 schema/API/OpenAPI，加入 `users.phone` 和 `verification_codes` 及认证接口。
- [ ] 运行工具测试并提交 `test: add contact auth contracts`。

### Task 2: Provider 和验证码服务

**Files:**
- Modify: `server/package.json`, `server/package-lock.json`, `server/.env copy.example`
- Create: `server/services/sms-provider.js`, `server/services/email-provider.js`, `server/services/verification-service.js`
- Test: `server/test/verification-service.test.js`

- [ ] 写假 provider 测试，覆盖发送参数、冷却时间、旧码失效和统一错误。
- [ ] 运行测试确认失败。
- [ ] 接入阿里云 SMS SDK 和 Nodemailer SMTP，配置缺失时明确报错但不泄露密钥。
- [ ] 实现验证码数据库读写服务，并支持测试注入 provider/clock。
- [ ] 运行服务测试并提交 `feat: add real contact verification providers`。

### Task 3: 后端认证接口

**Files:**
- Modify: `server/routes/auth.js`, `server/utils/user-profile.js`
- Test: `server/test/contact-auth-routes.test.js`, `server/test/auth-validation.test.js`

- [ ] 写登录标识、绑定、修改密码、重置密码的失败测试。
- [ ] 运行后端测试确认失败。
- [ ] 扩展登录查询支持 username/phone/email，加入绑定和密码接口及脱敏输出。
- [ ] 验证旧密码、验证码消费、联系方式唯一冲突和新 JWT 签发。
- [ ] 运行后端全量测试并提交 `feat: add contact auth endpoints`。

### Task 4: 前端认证界面

**Files:**
- Modify: `client/src/api/auth.js`, `client/src/views/LoginView.vue`, `client/src/views/ProfileView.vue`
- Test: `client/test/contact-auth.test.js`, `client/test/auth-navigation.test.js`

- [ ] 写登录标识、绑定表单和密码表单的失败测试。
- [ ] 运行客户端测试确认失败。
- [ ] 增加验证码倒计时、脱敏联系方式、绑定/改密/找回交互和错误提示。
- [ ] 保留用户名登录兼容，并让登录成功/改密后更新 token。
- [ ] 运行客户端测试、lint 和 build，提交 `feat: add contact auth ui`。

### Task 5: 集成验证

**Files:**
- Modify: `progress.md`, `findings.md`
- Test: server and client test suites

- [ ] 执行 `git fetch origin develop` 并确认没有新的契约冲突。
- [ ] 运行后端 `npm test`。
- [ ] 运行前端 `node --test test/*.test.js`、`npm run lint`、`npm run build`。
- [ ] 检查 `git diff --check` 和 `git status`，确认无 `.env` 或真实凭据。
- [ ] 记录结果并准备在 `feature/login` 提交/推送。
