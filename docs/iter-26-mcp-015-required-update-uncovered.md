# 迭代 26: MCP 0.1.5 强制更新策略 - 未覆盖测试说明

## 未覆盖场景

- Railway production 实例实际访问 npm registry 的 DNS、TLS、超时与 15 分钟缓存行为属于外部环境。
- 真实 `0.1.4` 和 `0.1.5` MCP 包携带安装 API key 调用生产 `/api/mcp/client-policy` 的结果需要部署后验证。
- MCP host 如何展示并执行升级提示属于宿主与用户行为；服务端只返回策略，不会远程修改客户端。

## 手动测试步骤

1. 部署后使用 MCP `0.1.4` 的安装 API key 请求 `/api/mcp/client-policy`，确认返回 `latestVersion: 0.1.5`、`minimumSupportedVersion: 0.1.5`、`updateRequired: true`。
2. 使用 MCP `0.1.5` 重复请求，确认版本字段不变且 `updateRequired: false`。
3. 暂时阻断 production 到 npm registry 的网络，确认接口仍使用内置 `0.1.5` 发布基线。
4. 确认普通 API key、浏览器 session 或缺少 MCP client header 的请求仍返回 `403 mcp-client-required`。

## 建议补充的测试用例

- 在发布流水线中安装 npm `latest` 和前一版本，分别调用预生产策略接口。
- 模拟多实例冷启动与缓存过期，验证所有实例的发布基线一致。
- 在真实 Claude Desktop、Codex 和 HTTP MCP host 中验证强制更新提示呈现。

## 检查清单

- [x] 服务端内置发布基线为 `0.1.5`
- [x] 低于 `0.1.5` 的有效客户端版本返回 `updateRequired: true`
- [x] `0.1.5` 返回 `updateRequired: false`
- [x] npm 查询失败或返回无效数据时保留 `0.1.5` 策略
- [x] 非 MCP 认证请求仍被拒绝
- [ ] 生产环境旧版/新版客户端端到端验证
- [ ] Railway 到 npm registry 的故障演练
