# 迭代 16: MCP 更新权威策略与本地 npm 回退 - 未覆盖测试说明

## 未覆盖场景

- 服务端 `updateRequired` 依赖生产环境实际收到的 MCP 客户端版本头及 `AMAMI_MCP_MINIMUM_VERSION` 配置，必须通过已发布包验证。
- 当客户端无法访问服务端策略端点时，本地 npm registry 回退的真实 DNS、TLS、网络代理和 dist-tag 传播属于外部环境行为。
- MCP host 如何呈现“确认后执行更新命令”的文字，以及用户是否真的执行该命令，属于宿主和用户行为；MCP 不会、也不能自行执行安装命令。
- 常驻 stdio、HTTP server 和 serverless 实例的进程生命周期不同，单实例的一次性提示和 npm 回退查询频率需在部署环境观察。

## 手动测试步骤

1. 在预生产配置 `AMAMI_MCP_MINIMUM_VERSION` 高于一个已发布旧 MCP 版本，使用该旧包调用 `/api/mcp/client-policy`，确认响应包含 `updateRequired: true`。
2. 使用达到最低版本的 MCP 包重复调用，确认 `updateRequired: false`；确认 `latestVersion` 仍来自 npm `latest` dist-tag。
3. 阻断客户端到 Amami 服务端策略端点的访问、保留 npm 网络，确认本地仅提示可选更新，结果来源标记为 `npm-fallback`，绝不显示强制更新。
4. 同时阻断服务端与 npm，确认业务工具继续可用，显式状态工具返回 `source: unavailable`。
5. 在真实 MCP host 中确认更新文字只给出 `npm install -g amami-analytics-mcp@latest` 建议，没有自动执行；仅在用户明确批准后手工执行并重启 MCP host。

## 建议补充的测试用例

- 在发布流水线中，以旧版和最新版 MCP 包分别调用预生产 client-policy，断言服务端 `updateRequired` 结果。
- 通过网络代理注入服务端 401/403/5xx、npm 429/5xx 和超时，验证来源优先级、回退及无强制标记的约束。
- 在 Claude Desktop、Codex 和 HTTP MCP host 中记录用户确认流程，确保没有宿主将文本命令误解释为自动执行。

## 检查清单

- [x] 服务端向已认证 MCP 客户端下发权威 `updateRequired` 标志
- [x] 客户端优先使用服务端策略和强制升级标志
- [x] 服务端策略失败时才查询本地 npm `latest`
- [x] npm 本地回退永远不产生强制更新
- [x] 输出安装命令只作为用户确认后的建议，不执行安装
- [ ] 预生产旧版/新版客户端端到端验证
- [ ] Railway、npm 和 MCP host 网络故障演练
