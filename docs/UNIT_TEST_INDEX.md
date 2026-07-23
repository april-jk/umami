# 单元测试索引文档

> 本文档汇总所有开发迭代中未覆盖的单元测试场景，便于后续补充测试，避免遗漏。
>
> **维护规则**: 每次开发迭代完成后，将未覆盖的测试场景写入对应的迭代文档，并在本文档中添加索引条目。

---

## 索引目录

| 迭代 | 分支 | 功能模块 | 测试文档 | 状态 |
|-----|------|---------|---------|------|
| 1 | `feat/member-tier-core-enforcement` | 会员分级核心功能（后端限制） | [iter-1-member-tier-core-uncovered.md](iter-1-member-tier-core-uncovered.md) | ⬜ 待补充 |
| 2 | `feat/member-tier-frontend-ui` | 前端会员页面和用量展示 | [iter-2-member-frontend-uncovered.md](iter-2-member-frontend-uncovered.md) | ⬜ 待补充 |
| 3 | 当前分支 | 用户菜单集合构建修复 | [iter-3-user-menu-collection-uncovered.md](iter-3-user-menu-collection-uncovered.md) | ⬜ 待补充 |
| 4 | 当前分支 | PayPal 自动续费 | [iter-4-paypal-billing-uncovered.md](iter-4-paypal-billing-uncovered.md) | ⬜ 待补充 |
| 5 | 当前分支 | 定价 v2.1、配额和多语言对齐 | [iter-5-pricing-v21-uncovered.md](iter-5-pricing-v21-uncovered.md) | ⬜ 待补充 |
| 6 | 当前分支 | 管理员会员、配额和权益管理 | [iter-6-admin-membership-uncovered.md](iter-6-admin-membership-uncovered.md) | ✅ 已完成 |
| 7 | 当前分支 | 动态会员配置、升级页和后端限额联动 | [iter-7-dynamic-membership-config-uncovered.md](iter-7-dynamic-membership-config-uncovered.md) | ✅ 已完成 |
| 8 | 当前分支 | 激活码会员权益及管理 | [iter-8-activation-codes-uncovered.md](iter-8-activation-codes-uncovered.md) | ✅ 单元测试完成 |
| 9 | 当前分支 | 会员到期时间展示 | [iter-9-membership-expiration-uncovered.md](iter-9-membership-expiration-uncovered.md) | ⬜ 待补充浏览器验证 |
| 10 | 当前分支 | 复合会员权益与到期回退 | [iter-10-composite-membership-uncovered.md](iter-10-composite-membership-uncovered.md) | ⬜ 待补充支付沙箱验证 |
| 11 | 当前分支 | Google 与 GitHub 一键登录 | [iter-11-oauth-sign-in-uncovered.md](iter-11-oauth-sign-in-uncovered.md) | ⬜ 待补充真实 OAuth 浏览器验证 |
| 12 | 当前分支 | PayPal EUR 订阅结账 | [iter-12-paypal-eur-checkout-uncovered.md](iter-12-paypal-eur-checkout-uncovered.md) | ⬜ 待补充 PayPal Sandbox 验证 |
| 13 | 当前分支 | MCP 安装识别、访问记录和客户端策略 | [iter-13-mcp-access-control-uncovered.md](iter-13-mcp-access-control-uncovered.md) | ⬜ 待补充预生产迁移与真实 MCP 链路验证 |
| 14 | 当前分支 | MCP 调用内更新提示 | [iter-14-mcp-inline-update-notice-uncovered.md](iter-14-mcp-inline-update-notice-uncovered.md) | ⬜ 待补充真实 MCP host 与网络超时验证 |
| 15 | 当前分支 | MCP npm 最新版本发现 | [iter-15-mcp-npm-version-discovery-uncovered.md](iter-15-mcp-npm-version-discovery-uncovered.md) | ⬜ 待补充 npm 发布和 Railway 网络验证 |
| 16 | 当前分支 | MCP 更新权威策略与 npm 本地回退 | [iter-16-mcp-update-authority-and-npm-fallback-uncovered.md](iter-16-mcp-update-authority-and-npm-fallback-uncovered.md) | ⬜ 待补充预生产版本与网络故障验证 |
| 19 | 当前分支 | OAuth 显式账户绑定与真实邮箱 | [iter-19-oauth-explicit-linking-uncovered.md](iter-19-oauth-explicit-linking-uncovered.md) | ⬜ 待补充真实 OAuth、Redis 与 PostgreSQL 预生产验证 |
| 20 | 当前分支 | OAuth 独立邮箱身份与唯一约束 | [iter-20-oauth-email-identity-uncovered.md](iter-20-oauth-email-identity-uncovered.md) | ⬜ 待补充 migration 30、真实 OAuth、Redis 与 PostgreSQL 预生产验证 |
| 21 | 当前分支 | OAuth 缺邮箱身份分流 | [iter-21-oauth-missing-email-uncovered.md](iter-21-oauth-missing-email-uncovered.md) | ⬜ 待补充真实 Google/GitHub 缺邮箱预生产验证 |
| 23 | 当前分支 | Dashboard 空状态多语言文案 | [iter-23-dashboard-empty-state-localization-uncovered.md](iter-23-dashboard-empty-state-localization-uncovered.md) | ⬜ 待补充浏览器视觉与 RTL 验证 |
| 24 | 当前分支 | 实时页 30 分钟范围标注与空状态 | [iter-24-realtime-range-clarity-uncovered.md](iter-24-realtime-range-clarity-uncovered.md) | ⬜ 待补充浏览器视觉与 RTL 验证 |
| 25 | 当前分支 | 浏览器统一日期范围与 Last X 边界修复 | [iter-25-browser-owned-date-ranges-uncovered.md](iter-25-browser-owned-date-ranges-uncovered.md) | ⬜ 待补充真实浏览器网络、DST 与图表视觉验证 |
| 26 | 当前分支 | MCP 0.1.5 强制更新策略 | [iter-26-mcp-015-required-update-uncovered.md](iter-26-mcp-015-required-update-uncovered.md) | ⬜ 待补充生产旧版/新版客户端与 Railway 网络验证 |
| 27 | `chore/detach-upstream-umami` | 原项目运行时、发布与仓库身份隔离 | [iter-27-upstream-isolation-uncovered.md](iter-27-upstream-isolation-uncovered.md) | ⬜ 待补充 Railway、容器与 UI 依赖迁移验证 |
| 28 | 当前分支 | API Keys 页面 MCP 使用记录 | [iter-28-mcp-usage-history-uncovered.md](iter-28-mcp-usage-history-uncovered.md) | ⬜ 待补充认证浏览器、真实 PostgreSQL 与 MCP 全工具链路验证 |
| 29 | 当前分支 | 会员 MCP 日/月配额强制执行 | [iter-29-mcp-membership-quota-uncovered.md](iter-29-mcp-membership-quota-uncovered.md) | ⬜ 待补充 Railway migration、真实 MCP、并发与浏览器验证 |

---

## 测试覆盖要求

### 硬性要求
- **单元测试覆盖率必须 ≥ 95%**（语句覆盖）
- 所有测试必须通过后方可提交
- 未覆盖的部分必须编写说明文档并编入本索引

### 覆盖范围定义
- 新创建的源文件（`.ts`, `.tsx`）必须达到 95%+
- 测试文件（`.test.ts`, `.test.tsx`）不计入覆盖统计
- 第三方库和生成的代码不计入覆盖统计

### 未覆盖场景分类

| 类别 | 说明 | 处理方式 |
|-----|------|---------|
| 难以单元测试 | 涉及浏览器 API、WebSocket、Canvas 等 | 编写说明文档 + 手动测试清单 |
| 依赖外部服务 | 涉及 Stripe、邮件服务、第三方 API | 编写说明文档 + 集成测试清单 |
| 状态机复杂交互 | 多步骤状态转换、异步竞态 | 编写说明文档 + E2E 测试清单 |
| 边界条件 | 极端数值、异常数据格式 | 优先补充单元测试，无法覆盖则文档化 |
| 视觉/UI 验证 | 颜色、布局、动画效果 | 编写说明文档 + 视觉回归测试清单 |

---

## 补充测试流程

1. **开发完成后**: 运行 `pnpm vitest run --coverage` 检查覆盖率
2. **识别缺口**: 查看覆盖率报告中未覆盖的行和分支
3. **编写文档**: 将无法单元测试的场景写入迭代未覆盖文档
4. **更新索引**: 在本文档中添加新条目
5. **手动测试**: 按照未覆盖文档中的清单执行手动验证
6. **归档**: 补充测试完成后，更新对应条目状态为 ✅ 已完成

---

## 常用测试命令

```bash
# 运行全部测试
pnpm vitest run

# 运行特定模块测试
pnpm vitest run src/app/(main)/membership

# 运行覆盖率报告
pnpm vitest run --coverage src/app/(main)/membership

# 运行后端 API 测试
pnpm vitest run src/app/api/tenants

# 运行全部会员相关测试
pnpm vitest run \
  src/lib/tenant-plan.test.ts \
  src/jobs/apply-retention.test.ts \
  src/queries/prisma/tenant.test.ts \
  src/app/api/websites/route.test.ts \
  src/app/api/teams/\[teamId\]/users/route.test.ts \
  src/app/api/send/route.test.ts \
  src/app/api/tenants/\[tenantId\]/usage/route.test.ts \
  src/app/\(main\)/membership \
  src/components/hooks/queries/useTenantQuery.test.ts
```

---

## 历史记录

- **2026-07-11**: 创建本文档，收录迭代 1（会员分级核心功能）未覆盖场景
- **2026-07-12**: 收录迭代 2（前端会员页面和用量展示）未覆盖场景
- **2026-07-12**: 收录迭代 3（用户菜单集合构建修复）未覆盖场景
- **2026-07-12**: 收录迭代 4（PayPal 自动续费）未覆盖场景
- **2026-07-12**: 收录迭代 5（定价 v2.1、配额和多语言对齐）未覆盖场景
- **2026-07-12**: 收录迭代 6（管理员会员、配额和权益管理）未覆盖场景
- **2026-07-12**: 收录迭代 7（动态会员配置、升级页和后端限额联动）未覆盖场景
- **2026-07-15**: 收录迭代 8（激活码会员权益及管理）未覆盖场景
- **2026-07-16**: 收录迭代 9（会员到期时间展示）未覆盖场景
- **2026-07-16**: 收录迭代 10（复合会员权益与到期回退）未覆盖场景
- **2026-07-16**: 收录迭代 11（Google 与 GitHub 一键登录）未覆盖场景
- **2026-07-17**: 收录迭代 12（PayPal EUR 订阅结账）未覆盖场景
- **2026-07-18**: 收录迭代 13（MCP 安装识别、访问记录和客户端策略）未覆盖场景
- **2026-07-18**: 收录迭代 14（MCP 调用内更新提示）未覆盖场景
- **2026-07-18**: 收录迭代 15（MCP npm 最新版本发现）未覆盖场景
- **2026-07-18**: 收录迭代 16（MCP 更新权威策略与 npm 本地回退）未覆盖场景
- **2026-07-18**: 收录迭代 17（OAuth 账户绑定安全修复）未覆盖场景
- **2026-07-18**: 收录迭代 18（Dashboard 域名迁移）未覆盖场景
- **2026-07-18**: 收录迭代 19（OAuth 显式账户绑定与真实邮箱）未覆盖场景
- **2026-07-19**: 收录迭代 20（OAuth 独立邮箱身份与唯一约束）未覆盖场景
- **2026-07-19**: 收录迭代 21（OAuth 缺邮箱身份分流）未覆盖场景
- **2026-07-19**: 收录迭代 22（OAuth 邮箱用户名）未覆盖场景
- **2026-07-19**: 收录迭代 23（Dashboard 空状态多语言文案）未覆盖场景
- **2026-07-20**: 收录迭代 24（实时页 30 分钟范围标注与空状态）未覆盖场景
- **2026-07-20**: 收录迭代 25（浏览器统一日期范围与 Last X 边界修复）未覆盖场景
- **2026-07-20**: 收录迭代 26（MCP 0.1.5 强制更新策略）未覆盖场景
- **2026-07-22**: 收录迭代 27（原项目运行时、发布与仓库身份隔离）未覆盖场景
- **2026-07-22**: 收录迭代 28（API Keys 页面 MCP 使用记录）未覆盖场景
- **2026-07-23**: 收录迭代 29（会员 MCP 日/月配额强制执行）未覆盖场景

---

*最后更新: 2026-07-23*
