# 迭代 1: 会员分级核心功能（后端限制）- 未覆盖单元测试说明

> 分支: `feat/member-tier-core-enforcement`
> 开发日期: 2026-07-11
> 对应功能: 事件/网站/成员/保留期限制的后端核心实现

---

## 一、覆盖率统计

### 测试文件覆盖情况

| 测试文件 | 测试数 | 状态 |
|---------|-------|------|
| `src/lib/tenant-plan.test.ts` | 28 | ✅ 全部通过 |
| `src/jobs/apply-retention.test.ts` | 18 | ✅ 全部通过 |
| `src/queries/prisma/tenant.test.ts` | 29 | ✅ 全部通过 |
| `src/app/api/websites/route.test.ts` | 7 | ✅ 全部通过 |
| `src/app/api/teams/[teamId]/users/route.test.ts` | 11 | ✅ 全部通过 |
| `src/app/api/send/route.test.ts` | 17 | ✅ 全部通过 |
| **总计** | **110** | **✅ 全部通过** |

---

## 二、无法单元测试的场景（需手动/集成测试）

### 1. 跨月事件计数重置

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 月末事件计数接近上限 | 在月末发送事件至接近上限，等待次月 1 号 | 手动测试 |
| 次月 1 号计数重置 | 验证计数归零，可继续追踪 | 手动测试 |
| 高并发计数准确性 | 使用压测工具同时发送 1000 个事件 | 压测工具 |

**手动测试步骤**:
1. 在 Free 计划下发送事件至 99,000/100,000
2. 等待次月 1 号（或修改系统时间）
3. 验证事件计数重置为 0
4. 继续发送事件，验证可正常追踪

### 2. 用量告警前端展示

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 用量告警 80% | 发送事件至 80% 限制，前端显示黄色警告 | 手动测试 |
| 用量告警 95% | 发送事件至 95% 限制，前端显示红色严重警告 | 手动测试 |
| 超限阻止 | 发送事件超过 100% 限制，返回 403 | 手动测试 |

**手动测试步骤**:
1. 在 Free 计划（100K 事件/月）下发送 80K 事件
2. 查看前端是否有黄色警告提示
3. 继续发送至 95K，查看是否有红色警告
4. 继续发送至 100K+，验证返回 403 错误

### 3. 超期事件不可见

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| Free 保留 7 天 | 查看 8 天前数据，报表不显示 | 手动测试 |
| Starter 保留 180 天 | 查看 181 天前数据，报表不显示 | 手动测试 |
| Pro 保留 730 天 | 查看 731 天前数据，报表不显示 | 手动测试 |
| Team 无限保留 | 查看 3 年前数据，报表显示 | 手动测试 |

**手动测试步骤**:
1. 在 Free 计划下收集网站数据
2. 等待 8 天（或修改数据时间戳）
3. 查看报表，验证 8 天前数据不可见
4. 升级到 Starter，验证 8-180 天数据重新可见

### 4. 数据保留期定时任务

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 每日 sweep | 等待一天后检查 cutoff，日期前进 1 天 | 手动测试 |
| 升级扩大保留 | Free→Starter 后 cutoff 更新 | 手动测试 |
| 降级缩小保留 | Starter→Free 后 cutoff 更新 | 手动测试 |
| resetAt 优先 | 设置 resetAt 晚于 retentionCutoffAt | 手动测试 |

**手动测试步骤**:
1. 运行 `npx tsx scripts/apply-retention.ts`
2. 检查数据库中 `Website.retentionCutoffAt` 字段更新
3. 验证 cutoff 日期 = 当前日期 - 保留天数
4. 升级计划后重新运行，验证 cutoff 扩大

### 5. 网站数量限制

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| Free 创建 5 个网站 | 前 5 个成功，第 6 个返回 403 | 手动测试 |
| 删除释放额度 | 删除 1 个网站后创建新网站 | 手动测试 |
| 团队网站计入 | 在团队下创建网站计入 tenant 总量 | 手动测试 |
| 前端用量显示 | 网站列表页面显示当前用量 X/5 | 手动测试 |

**手动测试步骤**:
1. 在 Free 计划下创建 5 个网站
2. 尝试创建第 6 个，验证返回 403
3. 删除 1 个网站，验证可创建新网站
4. 在网站列表页面验证用量显示

### 6. 团队成员限制

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| Free 邀请成员 | Free 计划邀请第 2 个成员，返回 403 | 手动测试 |
| Pro 邀请 5 个成员 | 前 5 个成功，第 6 个返回 403 | 手动测试 |
| 多团队累计 | 2 个团队各邀请 3 人（Pro），第 7 人失败 | 手动测试 |
| 删除释放额度 | 删除 1 个成员后邀请新成员 | 手动测试 |

**手动测试步骤**:
1. 在 Free 计划下邀请第 2 个成员
2. 验证返回 403，提示升级 Starter
3. 升级到 Pro，邀请 5 个成员
4. 尝试邀请第 6 个，验证返回 403

### 7. 计划变更集成

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| Free→Starter 升级 | 事件限制升至 500K，网站升至 10，保留 180 天 | 手动测试 |
| Starter→Pro 升级 | 事件限制升至 2M，网站升至 25，成员升至 5 | 手动测试 |
| Pro→Team 升级 | 事件限制升至 10M，网站升至 50，成员升至 20，保留无限 | 手动测试 |
| Team→Enterprise 升级 | 所有限制解除 | 手动测试 |
| 降级处理（已有网站） | 从 Pro 降级到 Starter，已有 25 个网站保留但不可新建 | 手动测试 |
| 降级处理（已有成员） | 从 Pro 降级到 Starter，已有 5 个成员保留但不可新增 | 手动测试 |

### 8. 边界条件

| 场景 | 说明 | 测试方式 |
|-----|------|---------|
| 非 Cloud 模式 | 关闭 CLOUD_MODE，创建网站/邀请成员无限制 | 手动测试 |
| 无 tenant 网站 | 创建无 tenant 关联的网站，正常追踪无事件限制 | 手动测试 |
| tenant 不存在 | 使用不存在的 tenant ID，默认使用 Free 计划限制 | 手动测试 |
| link 事件不计费 | 发送 link 类型事件，不占用事件配额 | 手动测试 |
| pixel 事件不计费 | 发送 pixel 类型事件，不占用事件配额 | 手动测试 |
| 错误响应格式 | 触发任意限制，返回标准格式 | 手动测试 |

---

## 三、API 响应格式验证（手动 curl 测试）

### 事件超限响应

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

### 网站超限响应

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

### 成员超限响应

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

## 四、数据库迁移验证

### 迁移文件检查

```bash
ls prisma/migrations/23_tenant_plan_entitlements/
# 期望输出: migration.sql
```

### 迁移内容验证

```sql
-- 检查 migration.sql 包含:
-- 1. TenantUsageMonthly 表创建
-- 2. Website.retentionCutoffAt 字段添加
-- 3. 必要的索引
```

### 应用迁移

```bash
# 开发环境
npx prisma migrate dev

# 生产环境
npx prisma migrate deploy
```

---

## 五、定时任务配置

### Retention Sweep 任务

```bash
# 手动执行测试
npx tsx scripts/apply-retention.ts

# 期望输出: 更新了多少个网站的 cutoff
```

### 生产环境定时配置

| 环境 | 配置方式 | 执行频率 | 命令 |
|-----|---------|---------|------|
| Vercel | Cron Job | 每日 00:00 | `curl /api/jobs/retention` |
| Docker | cron | 每日 00:00 | `node scripts/apply-retention.ts` |
| 自托管 | systemd timer | 每日 00:00 | 同上 |

---

## 六、检查清单

### 手动测试验证项

- [ ] 各计划等级配置值正确（Free/Starter/Pro/Team/Enterprise）
- [ ] 升级提示文案正确（各等级间升级路径）
- [ ] 事件超限返回 403，包含 code/current/limit/upgradeMessage
- [ ] 网站超限返回 403，包含正确升级提示
- [ ] 成员超限返回 403，包含正确升级提示
- [ ] 跨月事件计数重置
- [ ] 高并发计数准确
- [ ] 用量告警 80% 前端显示
- [ ] 用量告警 95% 前端显示
- [ ] 超期事件不可见（各保留期等级）
- [ ] 升级扩大保留期后数据重新可见
- [ ] 降级缩小保留期后数据不可见
- [ ] 每日 retention sweep 更新 cutoff
- [ ] 非 Cloud 模式无限制检查
- [ ] 无 tenant 网站无事件限制
- [ ] link/pixel 事件不计费
- [ ] 错误响应格式统一
- [ ] 数据库迁移已应用
- [ ] 定时任务已配置

---

*文档创建日期: 2026-07-12*
*对应分支: feat/member-tier-core-enforcement*
*原始检查清单: MEMBER_TIER_TEST_CHECKLIST.md*
