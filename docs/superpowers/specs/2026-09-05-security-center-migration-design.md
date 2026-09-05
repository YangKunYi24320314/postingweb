# 个人安全中心迁移设计

**目标**：将手机号绑定、邮箱绑定和修改密码统一放入 `/security` 的“个人安全中心”，个人中心只保留个人资料与帖子内容。

## 范围

- `/security` 页面展示当前手机号、邮箱绑定状态，并提供绑定手机号、绑定邮箱、修改密码表单。
- 复用现有认证 API：`getMe`、`sendContactCode`、`bindContact`、`changePassword` 和 `saveToken`，不改后端协议。
- `/profile` 删除“账号安全”卡片、相关状态、处理函数和样式。
- 保留个人中心右上角“三个点”菜单进入安全中心的现有入口和返回个人中心行为。
- 不新增找回密码、评论、点赞、收藏或其他认证功能。

## 数据流与行为

安全中心挂载时调用 `getMe()` 获取当前用户信息。发送验证码时按 `phone` 或 `email` 调用 `sendContactCode`；提交绑定时调用 `bindContact`，成功后保存返回 token（若接口返回）并重新获取用户信息；修改密码调用 `changePassword`，成功后同样保存 token（若接口返回）并清空表单。接口错误沿用现有 `ElMessage.error` 提示，按钮 loading 和验证码倒计时沿用个人中心已有行为。

## 验证

- 结构测试断言安全控件存在于 `SecurityCenterView.vue`，且不再存在于 `ProfileView.vue`。
- 运行前端全部 Node 测试、Lint 和生产构建。
- 启动前端后检查 `/profile` 不显示安全表单、`/security` 显示三组功能，未登录访问仍受路由鉴权保护。
