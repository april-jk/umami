# 迭代 15: MCP npm 最新版本发现 - 未覆盖测试说明

## 未覆盖场景

- npm registry 的真实可用性、DNS、TLS 和 `latest` dist-tag 的发布传播属于外部服务行为，不能由单元测试覆盖。
- 生产进程中的 15 分钟成功缓存和 1 分钟失败缓存以单个进程为边界；Railway 多实例扩缩容时每个新实例会独立首次查询 npm。
- npm 包发布权限与 `npm publish` 流程不在 Amami 服务端运行时权限范围内，服务端只读取公开的 `amami-analytics-mcp` 包元数据。

## 手动测试步骤

1. 将新版 `amami-analytics-mcp` 发布到 npm 的 `latest` dist-tag，确认 `npm view amami-analytics-mcp@latest version` 返回发布版本。
2. 使用 MCP 安装 API key 调用 `/api/mcp/client-policy`，确认响应的 `latestVersion` 与 npm `latest` 相同，且不需要设置 `AMAMI_MCP_LATEST_VERSION`。
3. 在 15 分钟缓存窗口内重复调用，确认无需频繁查询 registry；缓存过期后确认读取新 dist-tag。
4. 阻断服务端到 registry.npmjs.org 的网络连接或模拟超时，确认接口仍返回 200，只省略 `latestVersion`，MCP 正常工具调用不受影响。
5. 设置合法的 `AMAMI_MCP_MINIMUM_VERSION`，确认其仍可独立标记强制升级；设置高于 npm latest 的值，确认服务端配置错误被明确报告。

## 建议补充的测试用例

- 在预生产环境以代理模拟 registry 200、429、5xx、超时和无效 JSON，收集缓存及降级日志。
- 增加发布流水线检查：npm publish 成功后读取 dist-tag，再调用预生产 client-policy 端点比较版本。
- 为 registry 查询耗时、缓存命中率和失败降级次数增加运行时指标与告警。

## 检查清单

- [x] 最新版本从 npm package `latest` dist-tag 读取
- [x] 不再读取人工 `AMAMI_MCP_LATEST_VERSION`
- [x] registry 失败或无效版本时安全降级
- [x] 并发请求去重且成功/失败结果分别缓存
- [ ] npm 发布后预生产端到端核验
- [ ] Railway registry 失败演练与监控验证
