# =====================================================================
# CampuHub 一键局域网服务器启动脚本（Windows PowerShell）
#
# 作用：
#   1. 打印本机局域网访问地址（排除 WSL/虚拟网卡/回环）
#   2. 放行防火墙 TCP 端口（只需一次，已存在则自动跳过）
#   3. 启动后端：托管前端构建产物 client/dist + 提供 /api 接口
#
# 前置准备（部署的机器上做过一次即可）：
#   - client 已 npm run build（生成 client/dist）
#   - server 已配置 .env（数据库密码等）
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File serve-lan.ps1
#   或：npm run serve:lan
# =====================================================================

param(
  [int]$Port = 3000
)

# 1) 打印本机局域网 IPv4（排除回环、WSL/虚拟网卡）
$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notmatch '^(127\.|169\.)' -and
    $_.InterfaceAlias -notmatch 'WSL|Loopback|vEthernet'
  } | Select-Object -ExpandProperty IPAddress -Unique

Write-Host ""
Write-Host "========  CampuHub 局域网访问地址  ========" -ForegroundColor Cyan
foreach ($ip in $ips) {
  Write-Host "   http://$ip`:$Port" -ForegroundColor Yellow
}
Write-Host "本机测试:    http://localhost:$Port" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 2) 放行防火墙（Windows 专用；重复执行会静默跳过）
New-NetFirewallRule -DisplayName "campushub-server" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -ErrorAction SilentlyContinue
Write-Host "防火墙已放行 TCP $Port（如已存在则跳过）" -ForegroundColor Gray

# 3) 启动后端
Write-Host "正在启动后端... (按 Ctrl+C 停止)" -ForegroundColor Green
node server.js
