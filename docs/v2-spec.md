# GPT 用量管家 V2 — 技术规格与验收

## 目标
零手动录入；仅展示来自官方认证数据源的实际额度和重置时间。任何未授权、未连接、读取失败的来源显示明确状态，不用估算值冒充真实值。

## 数据源
1. Codex App Server: 官方 `account/rateLimits/read`，可获取 `rateLimits`、`rateLimitsByLimitId` 中的 `usedPercent`、`windowDurationMins`、`resetsAt`。官方 `account/usage/read` 可获取 token 汇总（视权限和服务响应而定）。需要已登录且受控的 App Server；**不可在 GitHub Pages 中放认证凭据**。
2. OpenAI API: 组织用量/成本接口，需要管理员授权；API 消费与 ChatGPT 订阅额度不可混为一谈。
3. ChatGPT 普通消息、图片、文件、语音等额度：仅在有官方支持的授权数据源后接入。不要推断或伪造。
4. Work/Codex 可能共享配额；必须按返回的 `limitId` 去重，不能把同一额度显示成两份。

## 结构
GitHub Pages 公开静态前端 -> 用户授权的 HTTPS 只读桥接 API -> 已认证的 Codex App Server / API 组织用量接口。
桥接 API 必须校验访问授权、保护凭据、限制来源与频率、避免记录敏感令牌。默认不开放到互联网。
**当前只实现静态端和协议，不部署桥接，不触碰腾讯云生产环境。**

## 统一只读响应契约
`GET /v1/usage` 返回 JSON:
```json
{
  "schemaVersion":1,
  "observedAt":"2026-11-02T12:00:00Z",
  "sources":[
    {"id":"codex","state":"ok","limits":[
      {"id":"codex-primary","usedPercent":25,"windowDurationMins":300,"resetsAt":1793630400}
    ]},
    {"id":"api","state":"not_connected","limits":[]}
  ]
}
```
仅示例，不能当成实际账户数据。状态: ok / not_connected / error / stale。时间必须用 UTC 或 Unix 秒；不显示假数据。

## 验收
- 连接官方授权数据源，真实读取至少一项额度并核对官方页面；
- 定时更新、错误重试、断网状态、来源时间戳、失效数据提醒；
- 手机 Safari 可访问，凭据不出现在仓库或浏览器；
- 无手工录入；无授权时诚实显示未连接。
