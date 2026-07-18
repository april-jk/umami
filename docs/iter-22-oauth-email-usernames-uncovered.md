# 迭代 22：OAuth 邮箱用户名 - 未覆盖测试说明

## 未覆盖场景

- Railway production 中真实 Google/GitHub 浏览器授权后的账户创建、登录和界面用户名展示。
- 两个并发 OAuth 回调争用同一邮箱时 PostgreSQL 实际唯一索引的报错类型与事务回滚。
- 历史密码账号 `email IS NULL` 的身份补录、核验和迁移策略；本迭代不会将未核验的旧用户名推断为身份邮箱。

## 手动测试步骤

1. 在预生产使用全新且已验证的 Google 和 GitHub 邮箱登录，确认 `User.username` 和 `User.email` 都是规范化小写邮箱，且只创建一个 provider 绑定。
2. 创建一个 `username` 等于待 OAuth 邮箱、但 `email` 不匹配的密码账号；OAuth 回调应回到登录页且不签发代码、不新建用户、不绑定 provider。
3. 对已有同邮箱密码账号走专用绑定页，分别验证密码正确与错误、provider 已绑定和一次性凭据过期的提示与数据不变性。
4. 确认历史 Google 账号 `c574048a-2d3c-41ed-9036-a6da808ce99a` 仍通过原 provider ID 登录，且后台展示邮箱用户名。

## 建议补充的测试用例

- 使用 PostgreSQL 集成测试覆盖 `User.email`、`User.username` 和 `OAuthAccount` 三个唯一约束的并发错误映射。
- 为 OAuth 绑定确认页面补充浏览器级错误反馈与重新授权流程测试。
- 在邮箱验证能力落地后，为历史密码账号邮箱补录增加迁移与身份验证集成测试。

## 检查清单

- [x] 全新 OAuth 账号以已验证邮箱作为 `username` 和 `email`
- [x] 已有 provider 绑定优先登录，不依赖回调邮箱
- [x] 同邮箱账号不自动合并，要求密码确认绑定
- [x] 仅用户名冲突拒绝创建，不签发登录代码或绑定凭据
- [x] 定向 Vitest 覆盖新建、冲突与并发冲突分支
- [ ] 预生产真实 OAuth 与 PostgreSQL 并发演练
- [ ] 用户批准后部署应用并进行生产浏览器回归
