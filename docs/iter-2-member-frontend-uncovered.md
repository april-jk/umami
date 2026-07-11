# 迭代 2: 前端会员页面和用量展示 - 未覆盖单元测试说明

> 分支: `feat/member-tier-frontend-ui`
> 开发日期: 2026-07-11 ~ 2026-07-12
> 对应功能: 前端会员菜单、用量统计页、升级页面

---

## 一、覆盖率统计

### 新文件覆盖情况

| 文件 | 语句覆盖 | 分支覆盖 | 函数覆盖 | 行覆盖 | 状态 |
|-----|---------|---------|---------|-------|------|
| `MembershipPage.tsx` | 100% | 85.45% | 100% | 100% | ✅ |
| `UpgradePage.tsx` | 96.29% | 87.5% | 100% | 100% | ✅ |
| `UsageBar.tsx` | 100% | 100% | 100% | 100% | ✅ |
| `PlanBadge.tsx` | 100% | 100% | 100% | 100% | ✅ |
| `useTenantQuery.ts` | 100% | 100% | 100% | 100% | ✅ |
| `useTenantUsageQuery.ts` | 100% | 100% | 100% | 100% | ✅ |
| `useUpdateTenantPlanQuery.ts` | 100% | 100% | 100% | 100% | ✅ |
| `src/app/api/tenants/[tenantId]/usage/route.ts` | 100% | 100% | 100% | 100% | ✅ |

**总体新文件覆盖率**: 语句覆盖 ≥ 96%，满足 95% 要求。

### 未覆盖分支说明

#### MembershipPage.tsx (分支 85.45%)

未覆盖分支行:
- **Line 117**: `usage?.events?.limit ?? limits.eventLimit` 中 `usage?.events?.limit` 为 null 时走 `limits.eventLimit` 的分支
- **Line 135, 141, 147**: `getUsageAlertLevel` 返回 `warning` 和 `critical` 的分支（已覆盖 `none` 和 `exceeded`）

**原因**: 测试数据已覆盖 `none` 和 `exceeded` 场景，`warning` 和 `critical` 的中间状态需要更精确的数据构造。

**建议补充测试**:
```typescript
// 测试 warning 状态 (80% <= pct < 95%)
events: { used: 82_000, limit: 100_000 }, // 82%
websites: { used: 2, limit: 5 },         // 40%
members: { used: 1, limit: 5 },           // 20%

// 测试 critical 状态 (95% <= pct < 100%)
events: { used: 96_000, limit: 100_000 }, // 96%
websites: { used: 2, limit: 5 },          // 40%
members: { used: 1, limit: 5 },           // 20%
```

#### UpgradePage.tsx (分支 87.5%)

未覆盖分支行:
- **Line 48-76**: `handleUpgrade` 函数中 `plan === currentPlan` 的早期返回分支
- **Line 187-193**: Button `onPress` 中 `!isCurrent` 条件为 false 的分支（即当前计划按钮的点击）

**原因**: `handleUpgrade` 的 `plan === currentPlan` 分支在实际 UI 中不会被触发（因为当前计划按钮被 `isDisabled` 禁用），但代码中保留了防御性检查。

---

## 二、无法单元测试的场景（需手动/E2E测试）

### 1. 实际升级流程交互

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 点击升级按钮后调用 `mutateAsync` | 涉及 React state 更新和异步请求 | E2E 测试 |
| 升级成功后页面数据刷新 | 涉及 `onSuccess` 回调和 `touch` 缓存失效 | E2E 测试 |
| 升级中的 loading 状态 | 按钮禁用、显示 "Upgrading..." | E2E 测试 |
| 升级失败错误处理 | 网络错误、权限不足 | E2E 测试 + 手动测试 |

**手动测试步骤**:
1. 进入 `/membership/upgrade` 页面
2. 选择一个非当前计划（如 Free → Starter）
3. 点击 Upgrade 按钮
4. 验证：
   - 按钮变为禁用状态
   - 显示 "Upgrading..." 文本
   - 网络面板显示 POST `/api/tenants/{tenantId}` 请求
   - 请求成功后页面刷新，当前计划更新

### 2. Cloud 模式下的会员展示

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| Cloud 模式下 UserButton 菜单路径 | `cloudMode` 为 true 时菜单链接指向 cloudUrl | 手动测试 |
| Cloud 模式下 auth/verify 返回 subscription | 包含 isPro/isBusiness 等字段 | 手动测试 |
| Cloud 模式下 plan 信息来源 | 从 subscription 而非 tenant 获取 | 手动测试 |

**手动测试步骤**:
1. 设置 `CLOUD_MODE=1` 启动应用
2. 登录后点击用户头像
3. 验证 Membership 菜单项显示正确
4. 验证点击后跳转路径包含 `cloudUrl`
5. 验证 plan badge 显示正确（基于 subscription 信息）

### 3. 无 tenant 用户的降级体验

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 无 tenantId 用户访问 `/membership` | 显示 "No membership information available" | 手动测试 |
| 非 cloud 模式下无 tenant 关联 | 用户未加入任何 tenant | 手动测试 |

**手动测试步骤**:
1. 创建一个没有 tenant 关联的用户（或修改数据库）
2. 登录后访问 `/membership`
3. 验证显示空状态提示

### 4. 视觉和交互细节

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 用量进度条颜色渐变 | 绿色 → 黄色 → 橙色 → 红色 | 视觉检查 |
| 计划卡片边框高亮 | 当前计划紫色边框、推荐计划蓝色边框 | 视觉检查 |
| 响应式布局 | 移动端 1 列、平板 2 列、桌面 5 列 | 手动测试 |
| 告警面板背景色 | exceeded 红色、warning 黄色 | 视觉检查 |
| 会员徽章颜色 | 5 种计划对应 5 种颜色 | 视觉检查 |

### 5. 数据保留期超期逻辑

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 超期事件在报表中不可见 | 保留期 cutoff 过滤 | 手动测试 + 定时任务验证 |
| 升级后扩大保留期 | cutoff 日期更新 | 手动测试 |
| 降级后缩小保留期 | 旧数据被过滤 | 手动测试 |
| 每日 retention sweep | 定时任务更新 cutoff | 手动触发脚本测试 |

**手动测试步骤**:
1. 在 Free 计划下创建网站并收集数据
2. 等待 8 天后（或修改系统时间）
3. 查看报表，验证 8 天前的数据不可见
4. 升级到 Starter（180 天保留）
5. 验证 8 天前的数据重新可见
6. 运行 `npx tsx scripts/apply-retention.ts` 验证 sweep 逻辑

### 6. 跨月事件计数重置

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 月末事件计数接近上限 | 验证月末不超限 | 手动测试 |
| 次月 1 号计数重置 | 验证计数归零 | 手动测试 |
| 高并发计数准确性 | 1000 并发事件计数 | 压测工具 |

**手动测试步骤**:
1. 在月末发送事件至接近上限（如 99,000/100,000）
2. 等待次月 1 号
3. 验证事件计数重置为 0
4. 可继续发送事件

---

## 三、建议补充的单元测试

### 1. UsageBar 组件 - 中间告警状态

```typescript
// 新增测试文件: UsageBar.test.tsx
test('renders with warning color at 85%', () => {
  render(<UsageBar label="Events" used={85} limit={100} />);
  // 验证进度条颜色为黄色 #eab308
});

test('renders with critical color at 96%', () => {
  render(<UsageBar label="Events" used={96} limit={100} />);
  // 验证进度条颜色为橙色 #f97316
});
```

### 2. MembershipPage - 中间告警状态

```typescript
// 在 MembershipPage.test.tsx 中补充
test('shows warning alert at 85% events usage', () => {
  // events: 85%, websites: 40%, members: 20%
  // 期望: 显示 "Usage approaching limit"
});

test('shows critical alert at 96% events usage', () => {
  // events: 96%, websites: 40%, members: 20%
  // 期望: 显示 "Usage approaching limit"（critical 也显示 approaching）
});
```

### 3. PlanBadge - 颜色验证

```typescript
// 在 PlanBadge.test.tsx 中补充
test('renders starter plan with blue color', () => {
  const { container } = render(<PlanBadge plan="starter" />);
  // 验证 style 包含 backgroundColor: #3b82f6
});
```

---

## 四、集成测试建议

### E2E 测试场景（使用 Playwright/Cypress）

```typescript
// 示例: 会员升级流程 E2E 测试
describe('Membership Upgrade Flow', () => {
  test('user can upgrade from free to starter', async () => {
    await page.goto('/membership');
    await expect(page.locator('text=Free Plan')).toBeVisible();
    await page.click('text=Upgrade');
    await page.goto('/membership/upgrade');
    await page.click('text=Starter').locator('..').locator('button:has-text("Upgrade")');
    await expect(page.locator('text=Upgrading...')).toBeVisible();
    await expect(page.locator('text=Starter Plan')).toBeVisible();
  });
});
```

---

## 五、检查清单

### 手动测试验证项

- [ ] UserButton 头像菜单显示 Membership 项和 plan badge
- [ ] `/membership` 页面显示正确用量统计
- [ ] `/membership/upgrade` 页面显示 5 个计划对比卡片
- [ ] 当前计划高亮显示
- [ ] 升级按钮触发 API 调用
- [ ] 降级显示警告提示
- [ ] 用量超限显示红色告警面板
- [ ] 用量接近限制显示黄色告警面板
- [ ] 无 tenant 用户显示空状态
- [ ] Cloud 模式下菜单路径正确
- [ ] 响应式布局在移动端正常显示

---

*文档创建日期: 2026-07-12*
*对应分支: feat/member-tier-frontend-ui*
