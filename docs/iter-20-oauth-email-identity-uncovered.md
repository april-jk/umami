# 迭代 20：OAuth 独立邮箱身份与唯一约束 - 未覆盖测试说明

## 未覆盖场景

- migration 30 的 PostgreSQL 回填、`LOWER(email)` 唯一索引、大小写冲突保留为 `NULL` 与应用回滚保留数据，须在预生产真实数据库演练。
- Google/GitHub 的真实授权、Redis 一次性凭据和 PostgreSQL 并发事务不能由单元测试完全替代。
- 本地注册尚无邮箱验证或恢复流程；预注册邮箱导致的可用性风险已记录，但不能在当前实现内自动恢复。
- `src/queries/prisma/user.ts` 是既有大型模块，OAuth 新增路径有定向测试，完整历史文件覆盖率仍低于新增文件标准。

## 手动测试步骤

1. 在预生产先执行 migration 30，确认 `user.email`、`user_email_key`、`user_email_lower_key` 存在，再启动新应用。
2. 新建两个仅大小写不同的邮箱，确认第二次注册和管理员创建均被拒绝。
3. 使用同邮箱密码账号 OAuth 登录，输入错误原密码，确认不创建 OAuth 绑定或新用户；输入正确密码后只创建一个绑定。
4. 对历史 `email = NULL` 的 OAuth 账号使用原 provider 登录，确认仍可直接登录。
5. 制造 provider 唯一键冲突或事务失败，确认不会留下 email 被占用但没有 OAuthAccount 的用户。
6. 回退应用版本，确认 `email` 列与既有数据仍保留。

## 检查清单

- [x] `username` 保持原账号字段，`email` 为独立可空唯一字段
- [x] 新注册、管理员创建与新 OAuth 使用规范化小写邮箱
- [x] 原密码在服务端复核，API Key 不能绑定 OAuth
- [x] OAuth provisioning 在单一事务内完成
- [x] 回滚脚本不删除身份数据
- [ ] PostgreSQL migration 30 预生产演练
- [ ] 真实 OAuth / Redis / 并发事务预生产验证
- [ ] 邮箱验证与账户恢复产品决策
