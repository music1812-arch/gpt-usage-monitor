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
