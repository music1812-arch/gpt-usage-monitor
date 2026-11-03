# GPT 用量管家 V2

零手动录入的个人只读用量监控。**目前未完成真实账户授权与额度核对，不是正式上线。**

- Codex：调用本机官方 `codex app-server` 的 `account/read`、`account/rateLimits/read`，自动读取已用百分比、剩余百分比和重置时间；不启动推理，不自动登录，不读取或导出认证文件。
- API：官方组织 completions 用量（输入 / 输出 tokens、请求数）及组织 Costs，最近 24 小时。需要组织管理员密钥；不代表全部 API 产品的 token 总量，也不代表订阅余额。
- Work / 云端：共享额度的官方说明见 [数据源调查](docs/data-sources.md)。未完成账户实测前，不声称返回值覆盖所有云端 / Work 消耗。普通 ChatGPT 功能显示未连接。
- 公开 Pages 只有无数据状态页。真实采集结果仅驻留私有进程内存，不写仓库或公开 JSON。

## 本机运行

Node.js 22+，运行时无第三方依赖。通过受保护的服务环境注入 `MONITOR_PASSWORD`（至少 24 字符），然后 `npm start`。用户名固定为 `monitor`。密码必须随机生成，不要复用 OpenAI 密码。

配置：

| 环境变量 | 含义 |
| --- | --- |
| `MONITOR_PASSWORD` | 监控页面独立访问密码，必需 |
| `MONITOR_PORT` | 默认 `18791`；仅允许 1024–65535 |
| `CODEX_ENABLED=1` | 启用本机已官方授权的 Codex；默认关闭 |
| `OPENAI_ADMIN_KEY` | 可选组织管理员密钥；缺失时不发 API 请求 |

服务只绑定 `127.0.0.1`，白名单只提供页面、脚本及 `GET /v1/usage`。所有请求须验证，禁止跨域和未知 Host，关闭缓存和目录遍历，限制每分钟 120 请求。**Basic 验证仅适用于本机或经加密的私有隧道，不能裸露在公网 HTTP 上。**

每 60 秒后台自动采集，接口只返回内存快照，不由访问请求触发外部采集。瞬时网络、429 和 5xx 最多请求三次；永久错误不重试。单次 API 请求 10 秒超时，Codex 进程 15 秒超时。API 分页上限 100，异常或不完整分页不产生成功汇总。失败保留上次数据并显著标记；超过 15 分钟或跨越额度重置时显示过期。

## 验证

```sh
npm ci
npm run check
npm test
# 可选：安装系统 Chromium 后进行手机尺寸浏览器检查
CHROMIUM_PATH=/usr/bin/chromium npm run test:mobile
```

手机测试自动生成临时随机访问密码，不使用个人用量，截图保存在忽略的 `test-results/`。Chromium 390px / 320px 通过不等于真实 iPhone Safari 已验收。测试中的数值只是隔离的协议夹具，应用不提供演示额度。

安全测试部署和授权边界见 [部署说明](docs/deployment.md)，流程记录见 [交付记录](docs/v2-spec.md)。
