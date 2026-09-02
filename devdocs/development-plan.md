# 并行开发计划（分工 + 排期）

> 前提：契约已冻结（`docs/database-schema.md`、`docs/api-protocol.md`、`docs/openapi.yaml`），
> 后端参考模块（`server/routes/auth.js` + `utils/response.js` + `middleware/auth.js`）已就绪。
> 大家**严格照 `auth.js` 的写法**写自己的模块，风格就统一了。

## 一、分工原则：后端按"模块"拆，前端按"页面"拆

每个人在 `server/routes/` 写自己的路由文件，在 `client/src/` 写自己的页面，**接口和表结构都不许动别人的**。

## 二、后端依赖顺序

```
auth(参考/已有) → categories/tags(无依赖，先做) → posts → comments → like/favorite → history → recommend(二期可选)
```

- 下游依赖上游：`comments`/`likes`/`favorites` 都引 `posts.id`，所以 **posts 必须先在**。
- `recommend` 有时间再做。

## 三、关键边界

1. **接口地址/字段只能按 `docs/api-protocol.md`**，新增=改合同=必须开会同步。
2. **表结构只能按 `docs/database-schema.md`**，加列=先改文档。
3. 每个路由文件 = `express.Router()` + 用 `ok/fail` + 参数化查询 + 需要登录就挂 `auth`。**照抄 `auth.js`。**
4. 前端页面放 `client/src/views/`，请求全部走 `src/api/xxx.js`，**页面里禁止直接 `fetch/axios`**。

## 四、提交与协作（README 第五节已有规则）

- 从 `develop` 拉功能分支 → 开发 → 提 PR → 组员 Code Review → 合并。
- 多人并行时**少改同一个文件**；若必须改，先跟对方打招呼。
