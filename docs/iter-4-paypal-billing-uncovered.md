# 迭代 4: PayPal 自动续费 - 未覆盖测试说明

## 未覆盖场景

| 场景 | 原因 | 验证方式 |
|---|---|---|
| PayPal Sandbox 批准回跳 | 需要真实 PayPal 账户批准 | Sandbox 手动测试 |
| 订阅取消与周期结束 | 依赖 PayPal 异步订阅状态 | Sandbox 手动测试 |
| Live 环境 | 禁止自动创建真实收费资源 | 生产发布前受控验证 |
| Webhook 验签与事件处理 | `PAYPAL_WEBHOOKS_ENABLED` 默认关闭 | 配置 webhook 后集成测试 |

## 手动测试步骤

1. 以全局 admin 登录，打开 `/membership/upgrade`。
2. 选择 Starter、Pro 或 Team 的年付计划，确认跳转到 PayPal Sandbox。
3. 批准订阅并确认回跳后租户计划与订阅周期更新。
4. 取消订阅，确认权益保持到当前周期结束。
5. 在未设置 `PAYPAL_WEBHOOKS_ENABLED=true` 时确认 `/api/webhooks/paypal` 返回 404。

## 建议补充测试

- 使用 PayPal Sandbox 测试用户覆盖创建、批准、取消与续费失败。
- 配置 webhook 后覆盖重复事件、乱序事件及无效签名。
