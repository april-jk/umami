# Iteration 23: Dashboard 空状态多语言文案

## 未覆盖场景

- 浏览器中的空 Dashboard 布局无法由 JSON 解析检查覆盖，包括提示文案与右上角 `Design` 按钮是否在同一视口内清晰可见。
- 各语言的排版、右到左文本方向和 `Design` 产品操作名在真实浏览器中的断行与可读性未进行视觉回归测试。

## 已完成的自动验证

- 使用 Node.js 解析全部 52 个 `public/intl/messages/*.json` 文件，确认每个文件都有 `message.empty-dashboard`，且每个值均包含 `Design`。
- 运行 `pnpm check-missing-messages`。该脚本报告 701 个既有的其他翻译键缺失，`empty-dashboard` 不在其中。

## 手动测试步骤

1. 登录后打开 `/dashboard`，确保 Dashboard 没有任何组件。
2. 确认空状态显示“Click Design to add your first component.”，并且右上角按钮显示 `Design`。
3. 点击 `Design`，确认进入 `/dashboard/edit`。
4. 至少切换到 `zh-CN`、`ar-SA` 和 `ja-JP`，确认提示不再引用“编辑”，且 `Design` 与实际按钮文字一致。

## 建议补充的测试

- 为 `DashboardViewPage` 增加渲染测试，覆盖无组件时的空状态消息键。
- 在 Playwright 中建立空 Dashboard 的多语言视觉回归测试，至少覆盖 LTR、CJK 与 RTL 语言。

## 检查清单

- [x] 所有消息文件可解析为 JSON。
- [x] 所有已支持地区的 `empty-dashboard` 均使用 `Design`。
- [ ] 浏览器视觉回归测试。
- [ ] 真实环境多语言手动验证。
