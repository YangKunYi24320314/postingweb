# Apifox 接口协议（前后端唯一契约）

> 全队约定：**前端一律走这里定义的接口**，后端按这里实现。不许私自改接口。
> 你在 Apifox 里照着本手册建"项目 → 文件夹 → 接口"即可，建议文件夹结构与本手册一致。

## 一、通用约定

- **Base URL**：`http://localhost:3000/api`
- **请求格式**：`Content-Type: application/json`
- **认证方式**：JWT。登录/注册后拿到 `token`，之后的请求放在请求头：
  ```
  Authorization: Bearer <token>
  ```
- **统一返回结构**（所有接口都长这样）：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {}
  }
  ```
  - `code`：0 = 成功；非 0 = 失败。`message` 为给用户看的提示。

- **错误码约定**（code + HTTP 状态码对照）：
  | code | HTTP | 含义 | 示例 |
  |------|------|------|------|
  | 0 | 200 | 成功 | |
  | 1001 | 400 | 参数错误 | 用户名格式不对 |
  | 1002 | 401 | 未登录/Token失效 | 需重新登录 |
  | 1003 | 403 | 无权限 | 只能删自己的帖子 |
  | 1004 | 404 | 资源不存在 | 帖子不存在 |
  | 1005 | 409 | 冲突/重复 | 已点过赞、用户名已存在 |
  | 5000 | 500 | 服务器内部错误 | 数据库报错 |

- **分页**：列表接口统一传 `page`（默认1）、`pageSize`（默认10）。返回：
  ```json
  "data": {
    "list": [ ... ],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
  ```

---

## 二、认证 Auth（模块1：用户与认证）

### 2.1 `POST /auth/register` — 注册
**请求**
```json
{ "username": "scu123", "password": "123456", "nickname": "东门猛男" }
```
**响应 data**：注册成功即返回 token 和用户信息
```json
{ "token": "xxx", "user": { "id": 1, "username": "scu123", "nickname": "东门猛男" } }
```

### 2.2 `POST /auth/login` — 登录
**请求**
```json
{ "username": "scu123", "password": "123456" }
```
**响应 data**：同上，返回 token + user。

### 2.3 `GET /auth/me` — 获取当前登录用户（需登录）
**响应 data**
```json
{ "id": 1, "username": "scu123", "nickname": "东门猛男", "avatarUrl": "...", "bio": "...", "role": "user" }
```

### 2.4 `PUT /auth/profile` — 更新个人信息（需登录）
**请求**
```json
{ "nickname": "新昵称", "bio": "新的简介", "avatarUrl": "https://..." }
```
**响应 data**：更新后的用户信息。

### 2.5 `GET /users/:id` — 查看某用户公开信息（无需登录）
**响应 data**：该用户的公开信息。

```json
{
  "id": 1, "username": "24320326", "nickname": "昵称",
  "avatarUrl": "http://host/static/avatars/xxx.png",
  "backgroundUrl": "http://host/static/backgrounds/xxx.jpg",
  "bio": "简介", "postCount": 3, "totalLikes": 12, "totalFavorites": 5
}
```

### 2.6 `GET /users/:id/posts` — 查看某用户发布的帖子（无需登录，分页）
**响应 data**：`{ list, total, page, pageSize }`，`list` 项结构与「我的内容」列表一致（见 7.2）。

### 2.6 `POST /auth/contact/send-code` — 发送绑定验证码（需登录）
**请求**：`{ "channel": "phone" | "email", "target": "13800138000 | x@y.com" }`
**响应 data**：`{ "cooldownSeconds": 60, "expiresInSeconds": 300 }`（60 秒内不可重发，验证码 5 分钟有效）

### 2.7 `POST /auth/contact/bind` — 绑定手机号 / 邮箱（需登录）
**请求**：`{ "channel": "phone" | "email", "target": "...", "code": "123456" }`
**响应 data**：绑定后的用户信息（含 `phone` / `phoneBound` / `email` / `emailBound`）。
> 同一联系方式已被其他账号绑定会返回 `1005` 冲突。

### 2.8 `POST /auth/password/change` — 修改密码（需登录）
**请求**：`{ "currentPassword": "旧密码", "newPassword": "新密码" }`（新密码不少于 6 位，且不能与当前密码相同）
**响应 data**：`{ "token": "...", "user": {...} }`（改密后重新签发 token，前端需更新保存）

### 2.9 `POST /auth/password/reset/send-code` — 发送找回密码验证码（无需登录）
**请求**：`{ "channel": "phone" | "email", "target": "..." }`
**响应 data**：`{ "accepted": true }`（为防账号探测，无论账号是否存在都返回成功，验证码只发到已绑定的联系方式）

### 2.10 `POST /auth/password/reset` — 使用验证码重置密码（无需登录）
**请求**：`{ "channel": "phone" | "email", "target": "...", "code": "123456", "newPassword": "新密码" }`
**响应 data**：`{ "token": "...", "user": {...} }`（重置成功即签发 token）。

---

## 三、分类 + 标签（帖子用）

### 3.1 `GET /categories` — 分类列表
**响应 data**：`[ { "id": 1, "name": "随便聊聊", "description": "..." }, ... ]`
示例：`["随便聊聊","校园生活","学习交流","二手交易","社团活动"]`

### 3.2 `GET /tags` — 标签列表
**响应 data**：`[ "考研", "租房", "社团", "食堂", ... ]`

---

## 四、帖子 Posts（模块2：帖子核心）

### 4.1 `POST /posts` — 发布帖子（需登录）
**请求**
```json
{
  "title": "求 9 月考研自习室推荐",
  "content": "有没有安静又便宜的自习室推荐？",
  "categoryId": 2,
  "tags": ["考研", "自习室"]
}
```
**响应 data**：新建的帖子对象。

### 4.2 `GET /posts` — 帖子列表（筛选/搜索/排序）
**请求参数（query）**
| 参数 | 说明 |
|------|------|
| page | 页码，默认 1 |
| pageSize | 每页条数，默认 10 |
| categoryId | 按分类筛选 |
| tag | 按标签筛选（单个标签名） |
| keyword | 关键词搜标题+正文 |
| rank | 组合排序，逗号分隔，可选 latest / hot / recommend，默认 latest |
| sort | 兼容旧参数：new / hot；新功能建议用 rank |

**排序规则**
- `latest`：按发布时间新鲜度计分，越新的帖子分越高。
- `hot`：按互动热度计分，公式为 `浏览数*1 + 点赞数*3 + 收藏数*4 + 评论数*5`。
- `recommend`：按当前用户兴趣计分，浏览过的帖子标签 +1，点赞过的帖子标签 +3，收藏过的帖子标签 +4。
- 多个排序因子可以一起使用，例如 `rank=latest,hot,recommend`，后端会把各项得分相加后排序。
- `rank` 包含 `recommend` 时必须登录；如果用户暂无浏览/点赞/收藏记录，先按热门分兜底推荐。

**响应 data**：分页结构，`list` 每项：
```json
{ "id": 12, "title": "...", "tags": ["考研"], "categoryId": 2, "user": { "id":1, "nickname":"..." }, "likeCount": 5, "commentCount": 2, "createdAt": "2026-09-01T..." }
```

### 4.3 `GET /posts/:id` — 帖子详情
**响应 data**：帖子全字段（含 content / isFavorite / isLiked，若已登录）。

### 4.4 `PUT /posts/:id` — 编辑帖子（需登录，仅作者）
**请求**：同发布接口（title / content / categoryId / tags）。
**响应 data**：更新后的帖子。

### 4.5 `DELETE /posts/:id` — 删除帖子（需登录，仅作者或 admin）
**响应 data**：`null`。注：为软删除。

---

## 五、评论 Comments

### 5.1 `GET /posts/:id/comments` — 帖子的评论列表
**响应 data**：`[ { "id": 3, "user": {"id":2,"nickname":"..."}, "content":"...", "likeCount": 5, "isLiked": false, "createdAt":"..." }, ... ]`

### 5.2 `POST /posts/:id/comments` — 发表评论（需登录）
**请求**
```json
{ "content": "我也蹲一个，找到了踢我", "parentId": null }
```
**响应 data**：新建评论对象。

### 5.3 `PUT /comments/:id` — 编辑评论（需登录，仅作者，可选）
### 5.4 `DELETE /comments/:id` — 删除评论（需登录，仅作者或 admin，可选）

---

## 六、点赞 + 收藏（模块3：互动系统）

### 6.1 点赞
- `POST /posts/:id/like`（需登录）— 点赞
- `DELETE /posts/:id/like`（需登录）— 取消点赞
**响应 data**：`{ "liked": true, "likeCount": 6 }`（返回最新状态和数量，前端直接更新数字）。

### 6.2 收藏
- `POST /posts/:id/favorite`（需登录）— 收藏
- `DELETE /posts/:id/favorite`（需登录）— 取消收藏
**响应 data**：`{ "isFavorite": true, "favoriteCount": 12 }`

### 6.3 评论点赞
- `POST /comments/:id/like`（需登录）— 点赞评论
- `DELETE /comments/:id/like`（需登录）— 取消点赞评论
**响应 data**：`{ "liked": true, "likeCount": 6 }`

---

## 七、记录中心 Records（模块4）

### 7.1 浏览记录
- `POST /posts/:id/view`（需登录）— 进入帖子详情时上报一次浏览
- `GET /me/history` — 我的浏览记录（分页；可选 `keyword` 参数，对标题/正文/作者昵称做模糊匹配）
- `DELETE /me/history` — 清空浏览记录
- `DELETE /me/history/:postId`（需登录）— 删除单条浏览记录（`:postId` 为帖子 id）

### 7.2 我的内容
- `GET /me/posts` — 我发布的帖子（分页）
- `GET /me/favorites` — 我收藏的帖子（分页）
- `GET /me/likes` — 我点赞的帖子（分页，可选）

> 三个接口都支持可选 `keyword` 参数，对标题/正文/作者昵称做模糊匹配。

三个接口返回的分页列表项结构一致（复用 `Post` 结构，另含个人主页渲染专用字段）：

```json
{
  "id": 1, "title": "标题", "categoryId": 2, "categoryName": "分类名",
  "content": "帖子正文", "tags": ["标签1", "标签2"],
  "author": { "id": 1, "nickname": "作者昵称" },
  "viewCount": 10, "likeCount": 3, "favoriteCount": 2, "commentCount": 5,
  "createdAt": "2026-09-03T08:00:00.000Z",
  "favoritedAt": "2026-09-03T09:00:00.000Z",
  "likedAt": "2026-09-03T10:00:00.000Z"
}
```

> 说明：
> - 列表项作者字段用 `author`（等价于 `Post` 结构里的 `user`，只含 `id` + `nickname`）。
> - `content` / `categoryName` / `tags` 是个人主页卡片渲染与悬浮预览正文所需字段。
> - `favoritedAt` 仅 `/me/favorites` 返回；`likedAt` 仅 `/me/likes` 返回，其余接口省略这两个字段。

### 7.3 头像上传
- `POST /me/avatar`（需登录）— 上传头像

**请求**：`multipart/form-data`，字段名固定为 `file`（单张图片，最大 5MB）。

**响应 data**：

```json
{ "url": "http://host/static/avatars/avatar-xxx.png" }
```

> 头像文件存到后端 `server/static/avatars/`，前端用返回的 `url` 直接显示（通过 `/static/avatars/...` 访问）。

### 7.4 收获统计
- `GET /me/stats`（需登录）— 我发布的帖子收获的赞/收藏总数

**响应 data**：

```json
{ "totalLikes": 12, "totalFavorites": 5 }
```

> `totalLikes` = 我所有帖子的 `like_count` 之和；`totalFavorites` = 我所有帖子的 `favorite_count` 之和（只统计未删除的帖子）。

### 7.5 背景图
- `POST /me/background`（需登录）— 上传并保存个人信息背景图
- `GET /me/background`（需登录）— 获取我的背景图

**上传请求**：`multipart/form-data`，字段名固定为 `file`（单张图片，最大 5MB）。

**上传响应 data**：

```json
{ "url": "http://host/static/backgrounds/bg-xxx.png" }
```

**获取响应 data**：

```json
{ "backgroundUrl": "http://host/static/backgrounds/bg-xxx.png" }
```

> 背景图文件存到后端 `server/static/backgrounds/`；`POST` 会把 `url` 直接写进 `users.background_url`。未设置自定义背景时，`GET` 返回默认背景 `/static/default-background.jpg`。

---

## 八、附件 Attachments（帖子附件）

> 附件用于帖子里的文件/图片/视频。上传后返回附件 id，前端再把 `post_id` 绑定到帖子。
> 上传的原始文件存放在后端 `server/static/attachments/`，通过 `/static/...` 或下载接口访问。

### 8.1 `POST /attachments/upload` — 上传附件（需登录）
**请求**：`multipart/form-data`，字段名固定为 `file`（单文件，最大 100MB）。
**响应 data**：新建附件对象
```json
{ "id": 1, "original_filename": "课件.pdf", "file_size": 2048000 }
```

### 8.2 `GET /attachments/:id/download` — 下载附件（公开，无需登录）
**响应**：以原始文件名返回文件二进制流（`Content-Disposition` 为附件下载）。

---

## 九、推荐（模块5，可选，二期）

### 9.1 帖子广场个性化排序
推荐能力合并在 `GET /posts` 中，通过 `rank=recommend` 或 `rank=hot,recommend` 使用。

示例：
- `GET /posts?rank=recommend`：按当前用户兴趣推荐。
- `GET /posts?rank=latest,recommend`：综合发布时间和用户兴趣。
- `GET /posts?categoryId=1&tag=考研&rank=hot,recommend`：先筛选分类和标签，再综合热度与兴趣排序。

> 简化实现：根据用户浏览、点赞、收藏过的帖子标签统计偏好，再给带有相同标签的候选帖子加权。

---

## 十、给后端/前端的提示

1. **后端实现顺序建议**：`auth` → `posts` → `comments` → `like/favorite` → `history` → `attachments` → `recommend`。
2. **前端调接口**：永远通过封装好的 `src/api/xxx.js`，不要在页面里直接写请求（见前端架构约定）。
3. **返回结构固定**：后端再简单也要返回 `{ code, message, data }` 三层，方便前端统一处理 `message`。
