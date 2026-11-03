# V2 开发交付记录

## Intent

Issue #1：真实额度自动读取，API 与订阅分离，无手动录入，不碰生产服务，不发布私人用量。

## Spec

`GET /v1/usage`：schemaVersion=1；sources 包含 codex/api/chatgpt。每个来源独立 observedAt / lastAttemptAt、origin、state（ok/not_connected/error/stale）、limits、可选 metrics/message。API 没有 limits 也可以成功。Codex 多额度桶按 limitId/window 去重。无数据不合成数值；重置时间未知不能变成 1970 年。

## Plan

审计与官方来源核查 → 只读采集器 → 内存刷新与鉴权后端 → 手机 UI 与公开占位分离 → 测试 / CI → 独立 loopback 测试部署 → 授权边界报告。全部运行时逻辑不依赖外部 npm 包。

## Code

实现 Codex stdio 生命周期与官方只读握手；组织 completions + costs 有界分页、超时和重试；每来源新鲜度、刷新合并、失败保留旧值；loopback + 密码鉴权 + Host / Origin 检查 + 限频；手机页面自动重试与回到前台刷新；移除手工记录与旧离线缓存。

## Test

2026-11-03：`npm test` 24/24，通过；`npm run check` 通过。真实 HTTP 进程测试覆盖身份验证、Host / Origin 拒绝、只读限制、文件白名单和限频。子进程夹具验证 Codex 握手、API-key 模式拒绝和超时。API 测试仅使用协议夹具，无真实管理员授权调用。

`npm run test:mobile`：系统 Chromium，390×844 与 320×700，受保护页面加载、无水平溢出、无手工输入、无 Cache Storage、网络失败及恢复、无 JS 异常。未进行实体 iPhone Safari 测试。

## Deploy / Verify

以最终 PR / 交付回复中的实测记录为准。没有官方账户授权，不具备真实额度验收条件；没有经过验证的私有 HTTPS 或手机 VPN 入口，不得宣称手机端正式上线。不会合并 PR 或修改生产服务。

### 实际独立测试部署结果

2026-11-03，在已连接 VM 上通过 DMI 确认为 Tencent Cloud CVM。使用系统用户 chatgpt-agent 的独立目录 `/home/chatgpt-agent/gpt-usage-monitor-v2-test`，Node.js 22.23.4；`node --test` 24/24、静态检查通过。独立后台测试进程仅监听 `127.0.0.1:18791`。随机访问密码和 PID / 日志保存在仓库外 `/home/chatgpt-agent/gpt-usage-monitor-v2-runtime`；环境文件权限 0600，目录 0700。服务未启用 Codex 或管理员 API 采集。

实测：未鉴权 401；鉴权 JSON 200；跨域 403；POST 405；敏感文件路径 404；响应 no-store。三个来源均为 not_connected、空 limits。后续独立请求仍返回预期 401，确认进程持续运行。没有调用 Docker、修改 Nginx / 数据库、开放端口或操作 80/443。

该 loopback 地址只能在服务器或已建立的受控隧道中使用，不是可直接在 iPhone 打开的交付链接。当前授权用户 PATH / 常见位置未发现 codex，本次不使用其他系统用户会话或搬运 Token；需在测试进程同一用户下部署并完成官方登录。没有可用的已验证 VPN / 私有 HTTPS 入口，因此没有生成公开手机测试地址。实体 iPhone 验收、真实额度核对及正式上线均未完成。

### HTTPS 与最终代码增量

保留原实现，补充单个明确 HTTPS origin 配置、HSTS、Codex 独立可执行文件路径及对子进程移除无关监控 / API 凭据；新增 origin / 转发头测试。单元与 HTTP 测试增至 **25/25 通过**，腾讯云同样通过。手机检查新增 WebKit，并加入 CI；本地 WebKit / Chromium 390px、320px 通过。具体独立 HTTPS 验证、临时入口限制及生产域名审批边界见 deployment.md。没有实体 iPhone 实测或已授权真实额度，不宣称完整账户验收。

持续运行检查发现固定 setInterval 与采集器冷却时间存在边界竞争，可能把某些刷新延迟到两分钟。已改为每轮采集完成后安排下一次刷新，并新增回归测试；最终自动化测试 **26/26 通过**。手机 Chromium / WebKit 检查再次通过。此变更只重启独立监控进程。
