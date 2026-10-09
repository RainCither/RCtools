# 工具匣（RCtools）

一个由 JSON 自动发现工具的浏览器平台。全部计算在本地完成，不上传输入、文件、密码或诊断记录。

[在线使用](https://tool.raincither.top/) · [架构与约束](./ARCHITECTURE.md) · [添加工具指南](./ADDTOOL.md)

保留 16 个工具的 ID、独立访问路径、默认排序、输入输出格式和原有视觉风格：JSON、CSS、JavaScript、HTML、正则、时间戳、连续时间差、文本统计、故障文字、密码、Base64、MD5、SHA、进制、IEEE-754 和颜色。

## 开发

需要 Node.js **22.22.0 或以上**、npm 和现代浏览器。

```bash
npm ci --include=dev
npm run dev
```

开发命令自动生成目录与入口映射，配置和入口增删后重新扫描；配置错误保留上一份合法生成结果。通常访问 http://127.0.0.1:5173，以启动输出为准。

| 命令                         | 用途                                                     |
| ---------------------------- | -------------------------------------------------------- |
| `npm run generate`           | 校验 JSON 并生成目录、精确类型、视图加载器与 Worker 工厂 |
| `npm run typecheck`          | 生成配置、路由类型并执行严格 TypeScript 检查             |
| `npm run lint`               | ESLint 检查                                              |
| `npm run check:architecture` | AST 依赖与循环检查                                       |
| `npm test`                   | 类型、架构和核心/生命周期验证                            |
| `npm run check`              | 类型、规范、格式、架构及 Vitest 门禁                     |
| `npm run build`              | 完整门禁、客户端构建、预渲染与产物验证                   |
| `npm run preview`            | 预览 `dist/client`                                       |
| `npm run test:e2e`           | Playwright 桌面与手机浏览器验证                          |

`quality/unit` 和 `quality/browser` 是质量验证入口。浏览器验证默认使用本机 Chrome；CI 使用 Playwright Chromium。首次在 CI 风格环境运行时：

```bash
npx playwright install --with-deps chromium
npm run build
npm run test:e2e
```

截图与失败追踪默认保存在系统临时目录的 `rctools-quality`，不进入源码目录；可用 `QA_ARTIFACTS_DIR` 指定其他输出位置。

提交源码、配置、`quality` 验证、构建脚本和 `package-lock.json`。依赖目录、构建产物、生成目录、缓存、报告、日志和本地环境文件由 `.gitignore` 排除；生成文件会在开发、检查或构建时重新创建。

## 结构

```text
src/
├─ contracts/       # Schema、能力、结果、控制器与 Worker 协议
├─ catalog/         # 分类/外链 JSON，纯目录查询
├─ tools/<id>/      # tool.json / core / controller / view / worker
├─ bindings/react/  # 生命周期订阅与能力注入
├─ ui/              # 受控控件、布局与 CSS Modules
├─ adapters/        # 浏览器能力与资源管理
├─ app/             # Framework 路由、预渲染页面与工具宿主
└─ generated/       # 自动生成，不提交、不手工编辑
build/              # 配置生成、架构与静态产物检查
quality/            # 新行为与浏览器验证
dist/client/        # 唯一发布目录
```

新增工具只需要自身目录，具体模板见 [ADDTOOL.md](./ADDTOOL.md)。分类编辑 `src/catalog/categories.json`；外链编辑 `src/catalog/links.json`，字段模型与工具相同，并包含有效的 HTTP(S) `href`。不维护中央导入表、路由表或静态路径清单。

## 输入和执行

普通输入与选项在当前页面会话内恢复，刷新清除。密码、文件、结果、错误和运行任务不进入草稿。草稿总预算 16 MiB，超额淘汰最久未使用项，单份过大输入会提示离开后不保留。

重计算在 Worker 执行，支持取消、超时和旧结果隔离。正则超时 2 秒，其他任务默认 30 秒；文件哈希保留 20 MiB 上限。最近使用保留原存储键，去重后最多展示 3 项，存储不可用时降级到内存。

生产诊断仅保留页面内存最近 500 条白名单事件，错误界面可主动复制；不包含输入、输出、密码、文件名、异常堆栈或完整查询参数。

## 静态发布

React Router 8.4.0 Framework 使用 `ssr: false`、`routeDiscovery: initial`，构建时生成首页和全部工具页的标题、简介、导航、目录或交互占位。发布目录是 **dist/client**，不发布临时服务器产物。

默认域名仍为 `tool.raincither.top`。子路径发布可设置：

```powershell
$env:PAGES_BASE_PATH = "/RCtools"
$env:PAGES_CUSTOM_DOMAIN = ""
npm run build
```

Base Path 同时控制资源、路由和预渲染。空自定义域名不生成 CNAME。未知地址的静态 404 提供返回首页的入口。

GitHub 工作流对 `dev` 的推送、PR 和手动触发执行验证；PR 只验证，推送和手动触发在成功后部署 Pages 产物。首次切换需在 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。旧 `main` 的最后一份产物保留，工作流不再强推该分支。

每次产物保存 `build-info.json`（构建版本、源码提交与锁文件摘要）。回滚稳定源码提交并使用对应锁文件重建，部署整套页面与资源。

首屏脚本、模块预加载与静态依赖的 Gzip 总量限制为 100 KiB，重型解析器和 WASM 不得进入此加载链路。更多依赖、错误、日志和代码约束见 [ARCHITECTURE.md](./ARCHITECTURE.md)。
