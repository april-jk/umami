# 会员分级核心功能 - 测试检查清单

> 分支: `feat/member-tier-core-enforcement`
> 提交: 3 commits (core + API + tests)
> 单元测试: 110 tests, 全部通过

---

## 一、计划配置检查

### 1.1 各等级限制值验证

| 等级 | 月事件量 | 网站数量 | 团队成员 | 数据保留(天) | 状态 |
|-----|---------|---------|---------|------------|------|
| free | 100,000 | 5 | 1 | 7 | ⬜ |
| starter ($9/月) | 500,000 | 10 | 1 | 180 | ⬜ |
| pro ($29/月) | 2,000,000 | 25 | 5 | 730 | ⬜ |
| team ($99/月) | 10,000,000 | 50 | 20 | 无限 | ⬜ |
| enterprise | 无限 | 无限 | 无限 | 无限 | ⬜ |

**检查方式**: 查看 `src/lib/tenant-plan.ts` 第 1-7 行

### 1.2 升级提示文案验证

| 当前计划 | 超限类型 | 期望提示文案 |
|---------|---------|------------|
| free | 事件/网站/成员 | "Upgrade to Starter for X..." |
| starter | 事件/网站/成员 | "Upgrade to Pro for X..." |
| pro | 事件/网站/成员 | "Upgrade to Team for X..." |
| team | 事件/网站/成员 | "Upgrade to Enterprise for unlimited..." |
| enterprise | 任何 | "Contact sales for custom limits." |

**检查方式**: 运行 `pnpm vitest run src/lib/tenant-plan.test.ts`

---

## 二、单元测试验证

### 2.1 运行全部测试

```bash
pnpm vitest run \
  src/lib/tenant-plan.test.ts \
  src/jobs/apply-retention.test.ts \
  src/queries/prisma/tenant.test.ts \
  src/app/api/websites/route.test.ts \
  src/app/api/teams/\[teamId\]/users/route.test.ts \
  src/app/api/send/route.test.ts
```

**期望结果**: 110 tests passed, 0 failed

### 2.2 各测试文件检查项

#### `src/lib/tenant-plan.test.ts` (28 tests)
- ⬜ `TENANT_PLAN_LIMITS` 各等级配置值正确
- ⬜ `getTenantPlanLimits()` 默认值回退到 free
- ⬜ `isWithinLimit()` 正确处理 null(无限) 和 bigint
- ⬜ `getRetentionCutoff()` 各等级计算正确
- ⬜ `getUsagePercentage()` 0-100 边界处理
- ⬜ `getNextPlanId()` 升级路径正确
- ⬜ `getPlanUpgradeMessage()` 各等级提示正确
- ⬜ `getUsageAlertLevel()` 80%/95%/100% 分级
- ⬜ `getLimitErrorPayload()` 错误响应格式统一

#### `src/jobs/apply-retention.test.ts` (18 tests)
- ⬜ `applyRetentionSweep()` 每日更新 cutoff
- ⬜ 无 cutoff 的网站设置初始值
- ⬜ cutoff 已最新的网站跳过更新
- ⬜ team/enterprise 无限保留不设置 cutoff
- ⬜ 多计划混合场景处理正确
- ⬜ `updateRetentionCutoffForTenant()` 升级扩大保留期
- ⬜ 升级到无限保留清除 cutoff
- ⬜ 降级缩小保留期
- ⬜ 已正确 cutoff 的网站跳过
- ⬜ `getWebsiteRetentionCutoff()` 仅 retention 设置
- ⬜ resetAt 晚于 retentionCutoffAt 时优先
- ⬜ retentionCutoffAt 晚于 resetAt 时优先
- ⬜ 两者都为 null 返回 null

#### `src/queries/prisma/tenant.test.ts` (29 tests)
- ⬜ `getTenantPlan()` 返回计划
- ⬜ `getTenantWebsiteCount()` 计数非删除网站
- ⬜ `canCreateTenantWebsite()` 低于限制允许
- ⬜ `canCreateTenantWebsite()` 达到限制阻止
- ⬜ `canAddTeamMember()` 低于限制允许
- ⬜ `canAddTeamMember()` 达到限制阻止
- ⬜ `reserveTenantEvent()` 允许时返回用量信息
- ⬜ `reserveTenantEvent()` 阻止时返回用量信息
- ⬜ `reserveTenantEvent()` 月初首次事件处理
- ⬜ `reserveTenantEvent()` tenant 不存在默认 free
- ⬜ `reserveWebsiteEvent()` 委托到 tenant 事件
- ⬜ `getTenantUsage()` 返回所有维度统计
- ⬜ `createTenant()` 创建带 owner 和 subscription
- ⬜ `updateTenant()` 更新数据
- ⬜ `deleteTenant()` 软删除

#### `src/app/api/websites/route.test.ts` (7 tests)
- ⬜ POST 创建网站成功
- ⬜ POST 达到限制返回 403
- ⬜ 403 响应包含 code/current/limit/upgradeMessage
- ⬜ free→starter→pro→team→enterprise 升级提示正确

#### `src/app/api/teams/[teamId]/users/route.test.ts` (11 tests)
- ⬜ GET 返回团队成员列表
- ⬜ POST 邀请成员成功
- ⬜ POST 非 owner/manager 返回 401
- ⬜ POST 成员已存在返回 400
- ⬜ POST 达到限制返回 403
- ⬜ 403 响应包含 code/current/limit/upgradeMessage
- ⬜ free→starter→pro→team→enterprise 升级提示正确

#### `src/app/api/send/route.test.ts` (17 tests)
- ⬜ 事件追踪成功
- ⬜ 网站不存在返回 400
- ⬜ 达到月事件限制返回 403
- ⬜ 403 响应包含 code/current/limit/upgradeMessage
- ⬜ 允许时继续追踪
- ⬜ 各计划等级升级提示正确
- ⬜ 无 tenant 网站不检查限制
- ⬜ Cloud 模式关闭不检查限制
- ⬜ link/pixel 事件不检查限制
- ⬜ performance 事件追踪成功
- ⬜ performance 事件超限阻止
- ⬜ identify 事件不检查限制
- ⬜ bot 请求返回 beep boop
- ⬜ 无效请求体返回 400
- ⬜ 服务器错误返回 500

---

## 三、手动测试清单

### 3.1 事件量限制

| # | 测试场景 | 操作步骤 | 期望结果 | 状态 |
|---|---------|---------|---------|------|
| 1 | 跨月重置 | 在月末发送事件至接近上限，等待次月1号 | 次月1号事件计数重置为0，可继续追踪 | ⬜ |
| 2 | 高并发计数 | 使用压测工具同时发送1000个事件 | 计数准确，无重复/丢失 | ⬜ |
| 3 | 用量告警80% | 发送事件至80%限制 | 前端显示警告提示（黄色） | ⬜ |
| 4 | 用量告警95% | 发送事件至95%限制 | 前端显示严重警告（红色） | ⬜ |
| 5 | 超限阻止 | 发送事件超过100%限制 | 返回403，事件不记录，提示升级 | ⬜ |
| 6 | 超期事件不可见 | 查询保留期之前的数据 | 报表不显示超期事件 | ⬜ |

### 3.2 网站数量限制

| # | 测试场景 | 操作步骤 | 期望结果 | 状态 |
|---|---------|---------|---------|------|
| 7 | free创建5个网站 | 在free计划下创建5个网站 | 前5个成功，第6个返回403 | ⬜ |
| 8 | 删除释放额度 | 删除1个网站后创建新网站 | 创建成功 | ⬜ |
| 9 | 团队网站计入 | 在团队下创建网站 | 计入tenant总量 | ⬜ |
| 10 | 前端用量显示 | 查看网站列表页面 | 显示当前用量 X/5 | ⬜ |

### 3.3 团队成员限制

| # | 测试场景 | 操作步骤 | 期望结果 | 状态 |
|---|---------|---------|---------|------|
| 11 | free邀请成员 | free计划邀请第2个成员 | 返回403，提示升级Starter | ⬜ |
| 12 | pro邀请5个成员 | pro计划邀请5个成员 | 前5个成功，第6个返回403 | ⬜ |
| 13 | 多团队累计 | 创建2个团队，各邀请3人(pro) | 第6人成功，第7人失败 | ⬜ |
| 14 | 删除释放额度 | 删除1个成员后邀请新成员 | 邀请成功 | ⬜ |

### 3.4 数据保留

| # | 测试场景 | 操作步骤 | 期望结果 | 状态 |
|---|---------|---------|---------|------|
| 15 | free保留7天 | free计划查看8天前数据 | 报表不显示 | ⬜ |
| 16 | starter保留180天 | starter计划查看181天前数据 | 报表不显示 | ⬜ |
| 17 | pro保留730天 | pro计划查看731天前数据 | 报表不显示 | ⬜ |
| 18 | team无限保留 | team计划查看3年前数据 | 报表显示 | ⬜ |
| 19 | 升级扩大保留 | free→starter后查看8-180天数据 | 数据重新可见 | ⬜ |
| 20 | 降级缩小保留 | starter→free后查看8-180天数据 | 数据不可见 | ⬜ |
| 21 | resetAt优先 | 设置resetAt晚于retentionCutoffAt | 以resetAt为准 | ⬜ |
| 22 | 每日sweep | 等待一天后检查cutoff | cutoff日期前进1天 | ⬜ |

### 3.5 计划变更集成

| # | 测试场景 | 操作步骤 | 期望结果 | 状态 |
|---|---------|---------|---------|------|
| 23 | free→starter | 升级计划 | 事件限制升至500K，网站升至10，保留180天 | ⬜ |
| 24 | starter→pro | 升级计划 | 事件限制升至2M，网站升至25，成员升至5 | ⬜ |
| 25 | pro→team | 升级计划 | 事件限制升至10M，网站升至50，成员升至20，保留无限 | ⬜ |
| 26 | team→enterprise | 升级计划 | 所有限制解除 | ⬜ |
| 27 | 降级处理 | 从pro降级到starter，已有25个网站 | 现有网站保留，但不可新建 | ⬜ |
| 28 | 降级处理 | 从pro降级到starter，已有5个成员 | 现有成员保留，但不可新增 | ⬜ |

### 3.6 边界条件

| # | 测试场景 | 操作步骤 | 期望结果 | 状态 |
|---|---------|---------|---------|------|
| 29 | 非Cloud模式 | 关闭CLOUD_MODE，创建网站/邀请成员 | 无限制检查，正常操作 | ⬜ |
| 30 | 无tenant网站 | 创建无tenant关联的网站 | 正常追踪，无事件限制 | ⬜ |
| 31 | tenant不存在 | 使用不存在的tenant ID | 默认使用free计划限制 | ⬜ |
| 32 | link事件不计费 | 发送link类型事件 | 不占用事件配额 | ⬜ |
| 33 | pixel事件不计费 | 发送pixel类型事件 | 不占用事件配额 | ⬜ |
| 34 | 错误响应格式 | 触发任意限制 | 返回 `{error: {message, code, current, limit, upgradeMessage}}` | ⬜ |

---

## 四、数据库迁移检查

### 4.1 迁移文件

```bash
# 检查迁移文件存在
ls prisma/migrations/23_tenant_plan_entitlements/

# 期望输出:
# migration.sql
```

### 4.2 迁移内容验证

```sql
-- 检查 migration.sql 包含:
-- 1. TenantUsageMonthly 表创建
-- 2. Website.retentionCutoffAt 字段添加
-- 3. 必要的索引
```

### 4.3 应用迁移

```bash
# 开发环境
npx prisma migrate dev

# 生产环境
npx prisma migrate deploy
```

---

## 五、定时任务配置

### 5.1 Retention Sweep 任务

```bash
# 手动执行测试
npx tsx scripts/apply-retention.ts

# 期望输出: 更新了多少个网站的 cutoff
```

### 5.2 生产环境定时配置

| 环境 | 配置方式 | 执行频率 | 命令 |
|-----|---------|---------|------|
| Vercel | Cron Job | 每日 00:00 | `curl /api/jobs/retention` |
| Docker | cron | 每日 00:00 | `node scripts/apply-retention.ts` |
| 自托管 | systemd timer | 每日 00:00 | 同上 |

---

## 六、API 响应格式验证

### 6.1 事件超限响应

```bash
curl -X POST /api/send \
  -H "Content-Type: application/json" \
  -d '{"type":"event","payload":{"website":"ws-id","url":"/"}}'

# 期望响应 (403):
{
  "error": {
    "message": "Event limit reached.",
    "code": "event-limit-reached",
    "status": 403,
    "current": 100000,
    "limit": 100000,
    "upgradeMessage": "Upgrade to Starter for 500,000 events."
  }
}
```

### 6.2 网站超限响应

```bash
curl -X POST /api/websites \
  -H "Content-Type: application/json" \
  -d '{"name":"test","domain":"example.com"}'

# 期望响应 (403):
{
  "error": {
    "message": "Website limit reached.",
    "code": "website-limit-reached",
    "status": 403,
    "current": 5,
    "limit": 5,
    "upgradeMessage": "Upgrade to Starter for 10 websites."
  }
}
```

### 6.3 成员超限响应

```bash
curl -X POST /api/teams/team-id/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","role":"member"}'

# 期望响应 (403):
{
  "error": {
    "message": "Member limit reached.",
    "code": "member-limit-reached",
    "status": 403,
    "current": 1,
    "limit": 1,
    "upgradeMessage": "Upgrade to Starter for 1 member."
  }
}
```

---

## 七、提交记录

```bash
git log --oneline feat/member-tier-core-enforcement

# 期望输出:
# abc1234 test(member-tier): add comprehensive unit tests...
# def5678 feat(member-tier): enhance API error responses...
# ghi9012 feat(member-tier): implement core plan limits...
```

---

## 八、检查完成确认

- [ ] 全部 110 个单元测试通过
- [ ] 全部 34 个手动测试场景完成
- [ ] 数据库迁移已应用
- [ ] 定时任务已配置
- [ ] API 响应格式验证通过
- [ ] 提交记录完整

**检查人**: _______________  **日期**: _______________

**备注**: ________________________________________________
