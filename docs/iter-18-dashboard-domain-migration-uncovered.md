# 迭代 18: Dashboard 域名迁移 - 未覆盖测试说明

## 未覆盖场景

- `dashboard.amami.dev` 的历史 tracker 与采集端点继续保留，实际已嵌入网站的长期流量与浏览器兼容性需要持续观察后才能退役。
- Google 与 GitHub OAuth 控制台中的 callback URI 需要人工确认同时登记了新的 `https://analytics.amami.dev` 回调地址；运行时 `OAUTH_BASE_URL` 已切换为新域名。
- `amami.dev` 到 `analytics.amami.dev` 的跳转按产品决定暂不在本次迭代实施。

## 手动测试步骤

1. 在浏览器访问 `https://dashboard.amami.dev/login?returnTo=%2Fdashboard`，确认返回 308 并保留路径与查询参数。
2. 用历史 dashboard 域名的 tracker snippet 加载 `/script.js` 并发送事件，确认网络请求未被跨域重定向。
3. 运行 Google 和 GitHub OAuth 登录，确认 provider 回调可到达新的 analytics 域名。
4. 在 Search Console 重新提交 `https://analytics.amami.dev/sitemap.xml`。

## 建议补充的测试用例

- 在 Playwright 中以真实浏览器加载旧 tracker snippet，断言 collect POST 成功。
- 为 Cloudflare 与 Railway 的转发头建立部署后探针，验证 public Host 与 Location 头。

## 检查清单

- [x] 旧 dashboard 页面 308 到新 analytics 域名
- [x] 旧 tracker script 继续返回 200
- [x] 旧采集端点 CORS preflight 返回 204 且不重定向
- [x] 新域名登录页返回 200
- [ ] Google/GitHub provider 控制台 callback URI 复核
- [ ] 历史 tracker 流量退役评估
