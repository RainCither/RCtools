# 工具匣

一个完全在浏览器中运行的个人小工具站，当前包含 JSON 格式化、时间戳转换、文本统计、密码生成、Base64 编解码和颜色转换。

## 分支

- `dev`：源码与自动部署脚本。
- `main`：由 GitHub Actions 自动生成的 GitHub Pages 静态文件，请勿手动编辑。

## 本地开发

需要 Node.js `>=22.13.0`。

```bash
npm ci
npm run dev
```

执行完整验证：

```bash
npm test
npm run test:pages
```

每次推送 `dev` 后，工作流会重新生成静态站点并覆盖 `main` 分支。

## 添加工具

1. 在 `app/tool-registry.ts` 注册工具信息。
2. 在 `app/tools/` 创建独立组件，并在 `app/tool-panels.tsx` 添加动态导入。
