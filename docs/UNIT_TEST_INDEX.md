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

---

*最后更新: 2026-07-12*
