# Iteration 28: MCP 使用记录未覆盖场景

## 功能范围

- 在 `/settings/api-keys` 下方展示当前用户的 MCP 请求时间、API Key 名称和可读操作名称。
- 新增 `/api/me/mcp-usage` 分页接口，复用 `mcp_client_access` 审计记录。
- 将已记录的 API 路由和 HTTP 方法映射为 List、View、Query、Create、Update、Delete 操作名称。

## 已覆盖

- 操作名称映射的主要查询、查看、创建、更新、删除路径。
- 查询层的用户隔离、Key 名称关联和倒序分页参数。
- API 鉴权错误短路。
- 设置页的有数据表格、空状态和分页 DataGrid 接入。
- 定向 Vitest：5 个测试文件、20 个测试通过；修改源文件语句覆盖率 100%。

## 未覆盖场景

1. 真实 PostgreSQL 中 `mcp_client_access` 与 `api_key` 关联数据的分页性能和索引命中。
2. 已撤销 API Key 的历史使用记录是否符合产品保留期限和隐私删除要求。
3. 真实 MCP 客户端调用所有工具时，路由映射是否准确表达业务操作名称。
4. 已认证浏览器中的桌面表格横向空间、移动端卡片模式、分页跳转和时区显示。
5. 不同语言和 RTL 布局下的列标题、长 Key 名称和长路由换行。

## 手动测试步骤

1. 使用已登录账户打开 `/settings/api-keys`。
2. 确认 API Keys 面板下方出现 MCP usage 区块；无记录时显示 No MCP requests yet.。
3. 使用 MCP 安装流程生成的 Key 发起一次网站列表、网站统计和创建网站请求。
4. 刷新设置页，确认请求时间、Key name 和对应 Query/List/Create 操作名称出现，并可翻页。
5. 在个人时区与移动视口下确认时间、路由文本和分页控件没有溢出或遮挡。

## 建议补充的测试用例

- 使用测试数据库插入跨用户访问记录，验证接口永远只返回当前用户记录。
- 为所有 MCP 工具建立路由到操作名称的契约样例，避免新增路由回退到原始 HTTP 文本。
- 在 Playwright 中覆盖桌面、移动、RTL 和撤销 Key 后的历史记录行为。

## 检查清单

- [x] 单元测试通过
- [x] TypeScript 检查通过
- [x] Biome 检查通过
- [ ] 认证浏览器视觉验证
- [ ] 真实 PostgreSQL 集成验证
- [ ] 真实 MCP 全工具链路验证
