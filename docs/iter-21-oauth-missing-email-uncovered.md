# 迭代 21：OAuth 缺邮箱身份分流 - 未覆盖测试说明

## 未覆盖场景

- Google/GitHub 在真实浏览器授权中因用户改邮箱、收回授权或隐私设置变化而不返回邮箱的行为。
- 既有绑定账号在 provider 不返回邮箱时的真实 browser callback 与 token exchange。
- provider API 网络失败与“有效 provider ID 但邮箱 endpoint 暂时不可用”的恢复策略。

## 手动测试步骤

1. 在预生产为已有 provider 绑定的测试账号模拟无已验证邮箱回包，确认仍进入原账号。
2. 用从未绑定过的新 provider ID 模拟无已验证邮箱回包，确认回到登录页，数据库无新用户、无 OAuthAccount。
3. 对 Google 的 `email_verified: false` 与 GitHub 的空/未验证邮件数组分别执行回归。

## 检查清单

- [x] 既有 provider 绑定不依赖邮箱直登
- [x] 新 provider 身份无已验证邮箱不创建账号
- [x] callback 不签发登录码或绑定 ticket
- [x] 严格接受 Google/GitHub 布尔验证标志
- [ ] 真实 Google/GitHub 缺邮箱预生产验证
