# 个人安全中心迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将联系方式绑定和密码修改从个人中心迁移到 `/security`，保持现有认证接口和登录行为不变。

**Architecture:** `SecurityCenterView.vue` 成为安全功能的唯一页面容器，复用 `ProfileView.vue` 中已经验证过的响应式状态、表单处理和 Element Plus 控件。`ProfileView.vue` 只保留资料编辑、头像/背景和帖子内容；路由与 API 不变。

**Tech Stack:** Vue 3 `<script setup>`、Vue Router、Element Plus、现有 `src/api/auth.js`、Node built-in test runner、Vite。

## Global Constraints

- 不修改后端认证接口。
- 不影响用户名、手机号、邮箱登录、验证码、修改密码和找回密码。
- 保留现有首页与底部“校园贴吧 · 第1组 · © 2026”文案改动。
- 本次只提交本地改动，不推送远程仓库。

---

### Task 1: 更新安全中心结构测试

**Files:**
- Modify: `client/test/contact-auth.test.js`
- Read: `client/src/views/SecurityCenterView.vue`
- Read: `client/src/views/ProfileView.vue`

**Interfaces:**
- Test consumes the two Vue source files as text.
- Test produces a regression contract: all three security controls are in `SecurityCenterView.vue`; `ProfileView.vue` has no security card or security form labels.

- [ ] **Step 1: Write the failing test**

Replace the profile-only assertion with:

```js
const securityView = fs.readFileSync(
  new URL('../src/views/SecurityCenterView.vue', import.meta.url),
  'utf8'
)

test('security center owns contact binding and password change controls', () => {
  assert.match(securityView, /绑定手机号/)
  assert.match(securityView, /绑定邮箱/)
  assert.match(securityView, /修改密码/)
  assert.match(securityView, /phoneBound/)
  assert.match(securityView, /emailBound/)
  assert.doesNotMatch(profileView, /profile__security/)
  assert.doesNotMatch(profileView, /绑定手机号/)
  assert.doesNotMatch(profileView, /绑定邮箱/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/contact-auth.test.js` from `client`.

Expected: FAIL because the placeholder security view does not contain the controls and the profile view still contains them.

### Task 2: Move security behavior into `/security`

**Files:**
- Modify: `client/src/views/SecurityCenterView.vue`
- Modify: `client/src/views/ProfileView.vue`

**Interfaces:**
- Security view consumes `getMe`, `sendContactCode`, `bindContact`, `changePassword` from `src/api/auth.js` and `saveToken` from `src/api/request`.
- Security view exposes the existing three form behaviors and redirects back through its existing `goBack` handler.

- [ ] **Step 1: Write minimal implementation**

Copy the existing contact/password state, handlers, imports, and security template from `ProfileView.vue` into `SecurityCenterView.vue`; call `loadMe` from `onMounted`; keep the existing return bar and security card. Remove those imports, state, handlers, template block, and styles from `ProfileView.vue` without changing unrelated profile behavior.

- [ ] **Step 2: Run focused test to verify it passes**

Run: `node --test test/contact-auth.test.js` from `client`.

Expected: PASS.

### Task 3: Verify the frontend integration

**Files:**
- Read: `client/src/router/index.js`
- Read: `client/package.json`

- [ ] **Step 1: Run all tests**

Run: `node --test test/*.test.js` from `client`.

Expected: all tests pass with exit code 0.

- [ ] **Step 2: Run lint and build**

Run: `npm run lint` and `npm run build` from `client`.

Expected: both commands exit 0 without new errors.

- [ ] **Step 3: Check rendered routes**

Start the existing Vite dev server and inspect `/profile` and `/security`: profile has no account-security card; security shows phone, email, and password forms; direct unauthenticated navigation to `/security` redirects to `/login`.
