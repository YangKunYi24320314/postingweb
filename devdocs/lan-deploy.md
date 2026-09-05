# 局域网服务器部署与联机指南

> 本文档说明：**如何把任意一台组员的电脑变成"一台可访问服务器"**，在同一局域网内通过浏览器直接访问。
> 方案 B（单端口发布）：后端 Express 同时托管「编译后的前端 `client/dist`」和「`/api` 接口」，所以**不需要跑 vite**，一台机器只开放一个 `3000` 端口。
> 依赖：Node.js ≥ 18、PostgreSQL；服务器机器需联网（同一 WiFi/网段）。

## 0. 原理

```
组员电脑A(服务器):  Express(托管 client/dist + /api) + PostgreSQL(本地 campushub)  →  监听 3000
你的电脑(浏览器):    只访问 http://<A的局域网IP>:3000  （数据都在 A 的本机，无需装数据库）
```

- 每台服务器机器的数据库**各有一份**（各自 `campushub`），互不干扰，适合演示不同功能。
- 前端请求走相对路径 `/api`，天然跟随页面 origin，局域网下不用改任何前端代码。
- 数据库不用对外开放，只需放行 `3000` 端口。

---

## 1. 首次配置（每台要当服务器的机器做一次）

### 1.1 初始化数据库（本机 PostgreSQL）

用你本机安装的 psql 建库并执行建表脚本（路径按各机实际安装目录修改）：

```powershell
# 一行建库（已存在可忽略）
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE campushub;"
# 建表 + 索引 + 种子数据
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d campushub -f "D:\path\to\postingweb\devdocs\campushub_schema.sql"
```

> 提示：`psql --version` 确认路径；`campushub_schema.sql` 是唯一建表权威，别改动它。

### 1.2 配置 `.env`

- 复制 `server\.env.example` 为 `server\.env`
- 修改 `DB_PASSWORD`（你本机 postgres 密码）、`DB_NAME=campushub`、`JWT_SECRET`（长随机串）
- `.env` 已在 `.gitignore` 里，各机唯一，不会互相覆盖

### 1.3 安装依赖

```powershell
cd server; npm install
cd client; npm install
```

### 1.4 编译前端（每次前端代码有改动都要重跑一次）

```powershell
cd client; npm run build   # 产出 client/dist，后端会托管它
```

### 1.5 （推荐）用一键脚本放行防火墙

防火墙默认会拦截局域网访问。执行下面的脚本会自动放行 `3000` 端口并打印访问地址：

```powershell
cd server; npm run serve:lan   # 等价于 powershell -File serve-lan.ps1
```

以后 **1.4 的前端构建 + 1.5 的脚本** 就是每次"当服务器"要做的全部事情。

---

## 2. 每次启动（当服务器）

```powershell
cd server
npm run serve:lan      # 推荐：打印局域网地址 + 放行防火墙 + 启动后端
# or
npm start              # 只启动后端（node server.js）
```

看到控制台输出局域网访问地址后，把它发给组员即可。

---

## 3. 访问者视角

1. 确保与服务器在**同一 WiFi / 同一网段**（用 `ipconfig` 看 IPv4 是否为同网段）。
2. 浏览器打开 `http://<服务器IP>:3000`，如 `http://192.168.10.45:3000`。
3. 正常注册/登录使用即可，无需安装任何环境。

---

## 4. 常见问题（FAQ）

**Q：别的设备打不开网站？**
- 优先检查：双方是否同一网段；服务器防火墙是否放行 `3000`（跑一次 `npm run serve:lan`）。
- 用 `ipconfig` 确认对方访问的 IP 是"局域网网卡的 IPv4"，别用 `127.0.0.1` 或 WSL/虚拟网卡地址。

**Q：页面能开但图片/头像不显示？**
- 背景图/头像接口返回的是相对访问者 host 的地址（`req.get('host')`），局域网下可正常加载。
- 若用的是旧版 `/upload`（契约外，仅兼容），现已改为相对 host 拼地址，不再写死 `127.0.0.1`。

**Q：`client/dist` 找不到？**
- 先 `cd client && npm run build`。后端检测不到 `dist` 会先启动、只提供 API、不返回页面（并打日志提示）。

**Q：想开后端而不构建前端，用开发模式？**
- 那是另一条链路：后端 `npm run dev`，前端 `cd client && npm run dev`（vite 在 5173，代理 `/api`、`/static` 到 3000）。局域网联机时访问 `http://<IP>:5173`，需额外放行 5173。
- 本文档是**生产/发布**模式（单端口 3000），更适合给组员演示。

**Q：数据库口令写在 `.env` 会被提交吗？**
- 不会，`.env` 已 gitignore；只提交 `.env.example`（占位值）。即便局域网联机，数据库也只监听 `localhost`。

---

