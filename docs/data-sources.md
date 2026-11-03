# 官方数据源核查结论

核查日期：2026-11-03。范围：个人 ChatGPT Plus、云端 Codex / Work、Codex CLI 0.166.0、官方 App Server 与公开 API 文档。**协议支持和本账户实测是两回事；本账户仍未授权。**

## 五项结论

| 问题 | 已确认的能力 | 尚未验证 / 不支持的承诺 |
| --- | --- | --- |
| Plus 能读取额度吗？ | 官方 ChatGPT 授权后，App Server 提供 `account/rateLimits/read`；窗口包含 `usedPercent`、`resetsAt`，V2 将剩余百分比计算为 `100 - usedPercent`，不会计算虚构的任务次数。[1][2] | 未取得该用户的成功响应；没有确认独立的、可匿名调用的 Plus 云端额度 REST API。接口可能返回多个桶或空窗口。 |
| CLI 是否反映云端？ | 官方说明云端模型消耗计入正常 Codex 额度；接口读取账户额度，并非 CLI 本地 token 计数。[1][2] | 根据两份文档，可推断同一账户 / 工作区、同一计量桶包含相应云端消耗；不是云端任务独立明细。本账户的桶、窗口和官方 Usage 页尚未核对，不能声称已完成云端覆盖验收。 |
| Work 独立接口？ | 官方明确相关 Plus / Pro 等计划的 Work 与 Codex 共享 allowance；具体窗口依计划而异。[3] | 未找到面向个人 Plus 的独立 Work 剩余额度公开接口。`account/usage/read` 是活动统计，不能换算余额；企业 Personal Analytics / Compliance 能力不代表 Plus 已获授权。[1][4] |
| API 与订阅区别？ | Organization Usage / Costs 是 API 组织统计，需要管理员授权；API 按相应 API 规则计费。[5][6] | completions tokens 不覆盖所有 API 类别；支出不等于账户余额，也不能代表 Plus / Work / Codex 剩余额度。SIWC 可将合格推理计入计划，但不因此使组织统计变成订阅额度接口。[3][7] |
| 能不长期保存登录凭据吗？ | 官方支持 `cli_auth_credentials_store=ephemeral`（仅当前进程内存）及实验性外部令牌生命周期模式；受管工作区另有 beta 工作负载身份联邦。[1][8][9] | 这不是免授权、免令牌或个人 Plus 的永久无人值守承诺。内存进程退出即失去会话；外部模式仍须合法授权和续期。WIF 需工作区开通，不能假定本 Plus 账户可用。 |

## 授权方式的边界

SIWC 是官方 OAuth 集成能力，并不是“无需凭据”的入口：公开文档中的 access token 有有效期，持续访问需要续期机制。[7] 对 API 推理授权成功，也不证明同一令牌可以读取 Codex 后端额度，必须验证受众、范围与实际响应。

内存凭据方案在产品上可减少磁盘持久化，但当前 V2 每轮创建只读 App Server 子进程，不能直接添加 ephemeral 配置就获得跨进程登录。可靠接入需要一个经过官方授权的持续会话或外部授权宿主。当前没有这样的会话，不创建假连接，不要求用户复制 auth.json、Token 或 Cookie。

官方浏览器登录与 SSH 转发只解决回调链路，服务器仍需访问认证端点。此前已记录的 403 不是购买电脑或迁移服务器一定有效的证据。本轮不重复登录或探测该错误。

## 当前交付决策

保留已完成 V2、现有 HTTPS 和只读采集器，缺授权时显示未连接。最适合当前 iPhone 的即时真实查看方式是直接访问 [官方 Codex Usage](https://chatgpt.com/codex/settings/usage) 或 ChatGPT 的 Settings → Usage；这不会自动授权 V2，也不会把官方网页抓取进 V2。

V2 自动同步的最短路径仍是：官方确认当前账户 / 环境可以合法认证 → 一次官方授权 → 读取账户额度 → 核对同一账户、工作区、桶和窗口 → 验证页面自动刷新。若要求 OpenAI 凭据完全不长期留在服务器，应在授权前选择持续内存会话方案，并接受重启需重新授权的限制。

不购买设备、不迁移服务器、不启用新增付费服务。保留现有部署的增量基础设施成本为 0；网络和账户授权问题仍未解决。新环境目前没有经过认证成功和额度读取验证，不能证明能解决核心问题，也不报价或推荐采购。

## 官方证据

1. [Codex App Server：账户、额度、活动统计与外部令牌模式](https://developers.openai.com/codex/app-server)
2. [Using Codex with your ChatGPT plan：Plus 可用性与云端额度计费](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
3. [Managing usage with GPT-6 Astra in Work and Codex：共享额度与 API 独立计费](https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex)
4. [Personal Analytics：适用 Enterprise / Edu 的统计能力](https://help.openai.com/en/articles/20001478-reviewing-work-and-codex-usage-and-using-personal-analytics-in-chatgpt-desktop)
5. [Organization Completions Usage](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions)
6. [Organization Costs](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs)
7. [SIWC Quickstart](https://developers.openai.com/siwc/quickstart)；[Token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference)
8. [CLI Configuration Reference：cli_auth_credentials_store](https://developers.openai.com/codex/config-reference/)
9. [Workload identity federation：Codex 需要受管工作区开通 beta](https://developers.openai.com/api/docs/guides/workload-identity-federation#use-workload-identity-with-codex)
