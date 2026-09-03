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
{ "id": 1, "username": "scu123", "nickname": "东门猛男", "avatar_url": "...", "bio": "...", "role": "user" }
```

### 2.4 `PUT /auth/profile` — 更新个人信息（需登录）
**请求**
```json
{ "nickname": "新昵称", "bio": "新的简介", "avatar_url": "https://..." }
```
**响应 data**：更新后的用户信息。

### 2.5 `GET /users/:id` — 查看某用户公开信息（无需登录）
**响应 data**：该用户的 id / nickname / avatar_url / bio / post 数量。

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
| sort | new(最新,默认) / hot(最热) |

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

## 五、评论 Comments（模块3：互动系统）

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

### 5.5 评论点赞
- `POST /comments/:id/like`（需登录）— 点赞评论
- `DELETE /comments/:id/like`（需登录）— 取消点赞评论
**响应 data**：`{ "liked": true, "likeCount": 6 }`

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

---

## 七、记录中心 Records（模块4）

### 7.1 浏览记录
- `POST /posts/:id/view`（需登录）— 进入帖子详情时上报一次浏览
- `GET /me/history` — 我的浏览记录（分页）
- `DELETE /me/history` — 清空浏览记录

### 7.2 我的内容
- `GET /me/posts` — 我发布的帖子（分页）
- `GET /me/favorites` — 我收藏的帖子（分页）
- `GET /me/likes` — 我点赞的帖子（分页，可选）

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

### 9.1 `GET /recommend/posts` — 个性化推荐（需登录）
**请求参数**：`page` / `pageSize`
**响应 data**：分页结构，按用户偏好的标签排序推荐。
> 简化实现：根据用户点赞/收藏/浏览过的帖子标签统计偏好，返回偏好标签下的相似帖子。

---

## 十、给后端/前端的提示

1. **后端实现顺序建议**：`auth` → `posts` → `comments` → `like/favorite` → `history` → `attachments` → `recommend`。
2. **前端调接口**：永远通过封装好的 `src/api/xxx.js`，不要在页面里直接写请求（见前端架构约定）。
3. **返回结构固定**：后端再简单也要返回 `{ code, message, data }` 三层，方便前端统一处理 `message`。
4. **在 Apifox 建 6 个文件夹**：认证 / 分类标签 / 帖子 / 评论 / 互动 / 记录，跟本手册一致，沟通对表更顺。
