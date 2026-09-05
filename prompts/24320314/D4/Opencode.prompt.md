## 本次会话任务（按顺序执行）
1. 实现并落地**局域网部署**，让任意组员电脑变成"一台可访问服务器"：
   - 草拟 `devdocs/lan-deploy.md` 联机指南（原理 / 首次配置 / 每次启动 / 访问者视角 / FAQ / 改动清单）。
   - 修改 `server/server.js`：托管前端 `client/dist` + SPA 回退 + 未匹配 `/api` 按契约返回 `{code:1004}`；`PORT` 从 `.env` 读取（默认 3000）；旧版 `/upload` 图片地址改用请求方 `host` 拼接。
   - 新增 `server/serve-lan.ps1` 一键脚本（自动排除 WSL/虚拟网卡打印本机局域网 IPv4、放行防火墙 TCP 3000、启动后端）。
   - `server/package.json` 增加 `serve:lan` 脚本；规范命名 `server/.env.example`。
2. 统一并修正**契约文档**：字段名统一驼峰（`avatar_url` → `avatarUrl`）；移除未实现的独立接口 `/recommend/posts`，推荐并入 `GET /api/posts?rank=recommend`；修正 `rank` 参数 YAML 语法；同步 `AGENTS.md` / `README.md` / `database-schema.md`（`users.background_url` 类型改 `TEXT`）。
3. 更新依赖 `cropperjs` 1.6.2 → 1.6.3（头像裁剪用到），同步 `client/package.json` + `package-lock.json`。
5. 在任务结束时总结本次会话。
