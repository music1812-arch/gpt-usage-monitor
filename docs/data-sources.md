# 官方数据源调查（2026-11-03）

## 证据与边界

1. [Codex App Server 官方文档](https://developers.openai.com/codex/app-server)：stdio 初始化顺序为 initialize / initialized；`account/read` 可检查 ChatGPT 登录；`account/rateLimits/read` 获取 ChatGPT 额度，含 usedPercent、windowDurationMins、Unix 秒 resetsAt。多桶 rateLimitsByLimitId 优先，兼容单桶 rateLimits；同一 limitId 不重复计数。`account/usage/read` 目前也有官方说明，但活动 tokens 不能直接转换成订阅剩余额度，本次不混入额度。
2. [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)：云端模型使用计入适用 Codex 额度；部分计划有共享 allowance / credits，CLI `/status` 与官方 Usage 页面可核查。
3. [Managing usage with GPT-6 Astra in Work and Codex](https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex)：Work / Codex 使用共享 allowance，窗口依计划而异；不能固定假设每个账户都有五小时额度，不能将任务数或 tokens 估算成额度。
4. [API Completions Usage](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions) 与 [Costs](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs)：组织管理员 API Key 授权、start/end 时间、has_more / next_page 分页。API 独立计费；costs 为支出，不是账户信用余额。completions 不覆盖所有 API 类别。
5. [Personal Analytics](https://help.openai.com/en/articles/20001478-reviewing-work-and-codex-usage-and-using-personal-analytics-in-chatgpt-desktop)：产品具备只读统计能力，并不因此向本项目授予同等后端访问。不能移植内部接口、复制浏览器 Cookie 或声称已自动连接。

## 可做与不能宣称的事

已接入公开文档中的官方本机 App Server 只读协议。官方材料支持“账户共享额度可能反映云端消耗”的推断，**尚无该用户的已授权账户响应与官方 Usage 页面比对**，因此覆盖范围仍待验证。不会把本地任务 tokens 当云端额度，也不会将同一桶复制成 Work 独立额度。

没有找到本次可直接使用、已授权且经过验证的独立 Work 云端剩余额度接口。未调用内部 ChatGPT 接口或绕过 Cloudflare。Issue 报告腾讯云 device-auth 403；本次不重试绕过或搬运认证文件。

## 唯一必要的账户交互

如要启用订阅额度，账户持有人必须在允许访问 OpenAI 的受信设备 / 独立测试环境中完成官方 Codex 登录；运行服务的同一系统用户须拥有该官方登录会话。不得将 Token / Cookie / auth.json 发到聊天或 GitHub。授权后启用 CODEX_ENABLED，核对官方 Settings → Usage / CLI `/status` 的同一账户与窗口，才可确认云端共享范围。

API 是可选独立来源；需要组织管理员通过服务器受保护的服务环境配置管理员密钥。普通项目 API Key 或 ChatGPT 订阅均不替代此授权。密钥不属于浏览器输入项。
