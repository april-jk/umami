# 迭代 3: 用户菜单集合构建修复 - 未覆盖单元测试说明

> 开发日期: 2026-07-12
> 对应功能: UserButton 菜单项渲染

## 未覆盖场景

| 场景 | 原因 | 验证方式 |
|---|---|---|
| Language 子菜单的语言切换 | 依赖 Popover 定位与键盘导航行为 | 浏览器手动测试 |
| Theme 子菜单的主题切换 | 依赖 `useTheme` 的持久化及 DOM 主题同步 | 浏览器手动测试 |
| Cloud 模式链接 | 依赖运行时 `cloudUrl` 配置 | Cloud 环境手动测试 |

## 手动测试步骤

1. 登录任意用户并打开 UserButton。
2. 确认 Settings、Membership、Language、Theme 和 Logout 均显示且可聚焦。
3. 分别打开 Language 与 Theme 子菜单，选择一项并确认菜单行为正常。
4. 在 Cloud 模式下确认 Documentation、Support 和 Logout 链接使用配置的 Cloud URL。

## 建议补充测试用例

- 使用 Playwright 覆盖两个子菜单的键盘导航和选择。
- 在 Cloud 配置的集成环境中断言外部链接地址。

## 检查清单

- [x] 本地 UserButton 菜单项集合渲染
- [ ] 浏览器子菜单交互
- [ ] Cloud 模式链接
