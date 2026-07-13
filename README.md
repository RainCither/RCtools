# 工具匣（RCtools）

一个简洁、可扩展的浏览器工具箱。工具在浏览器本地运行，不需要上传输入内容，也不依赖后端服务。

- 在线使用：[https://tool.raincither.top/](https://tool.raincither.top/)
- 源码分支：`dev`
- GitHub Pages 产物分支：`main`

## 已有工具

| 工具 | 功能 |
| --- | --- |
| JSON 格式化 | 校验、格式化或压缩 JSON 数据 |
| 时间戳转换 | 在时间戳、日期与标准时间之间转换 |
| 连续时间差 | 连续或成对输入时间，计算分段差值与累计总时长 |
| 文本统计 | 统计字数、字符、单词和行数 |
| 故障文字生成 | 用 Unicode 组合符生成可复制的故障、错位文字 |
| 密码生成 | 按长度和字符规则生成随机密码 |
| Base64 编解码 | 编码或解码包含中文的文本 |
| 颜色转换 | 将 HEX 颜色转换为 RGB 与 HSL |

## 环境要求

- Node.js `>= 22.13.0`
- npm（随 Node.js 安装）
- 现代浏览器，如 Chrome、Edge、Firefox 或 Safari

## 快速开始

```bash
git clone https://github.com/RainCither/RCtools.git
cd RCtools
git switch dev
npm ci
npm run dev
```

开发服务器默认运行在 [http://localhost:3000](http://localhost:3000)。如果端口被占用，请以终端显示的地址为准。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vinext 开发服务器 |
| `npm run build` | 直接生成 GitHub Pages 静态文件到 `dist/` |
| `npm run pages:build` | GitHub Pages 构建命令，等同于 `npm run build` |
| `npm run build:server` | 构建用于专项验证的 Vinext 服务端版本 |
| `npm run start` | 启动已构建的 Vinext 服务端版本 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm test` | 运行类型检查、服务端构建和功能测试 |
| `npm run test:pages` | 构建并验证 GitHub Pages 静态产物 |

本地预览静态产物：

```bash
npm run build
npx vite preview --config vite.pages.config.ts
```

## 项目结构

```text
RCtools/
├─ app/
│  ├─ tools/
│  │  ├─ json/              # 一个工具一个目录
│  │  │  ├─ config.ts       # 元数据与工具组件懒加载入口
│  │  │  ├─ json-tool.tsx   # 工具组件入口
│  │  │  └─ styles.module.css # 仅该工具使用的样式（按需）
│  │  ├─ time-diff/         # 可同时包含专用算法、CSS、测试辅助等
│  │  └─ shared/            # 仅存放跨工具复用的 UI 与逻辑
│  ├─ pages-entry.tsx       # GitHub Pages 客户端入口
│  ├─ tool-panels.tsx       # 从注册表生成懒加载组件并复用预加载结果
│  ├─ tool-registry.ts      # 工具名称、分类和搜索信息
│  └─ toolbox-app.tsx       # 工具箱主界面
├─ public/                  # favicon 等公共静态资源
├─ tests/                   # 功能与静态构建测试
├─ .github/workflows/       # GitHub Pages 自动部署工作流
├─ index.html               # Vite 静态页面入口
├─ vite.config.ts           # Vinext 开发配置
└─ vite.pages.config.ts     # GitHub Pages 静态构建配置
```

每个工具的配置、实现和专用样式收拢在自己的目录中，功能组件通过动态导入按需加载。工具可以在目录内继续添加专用的 CSS Module、算法、类型和辅助文件；只有被多个工具使用的代码才放入 `app/tools/shared/`。工具 ID 会从注册清单自动推导，分类中文名也由公共映射统一生成，避免重复维护。随着工具数量增加，首屏不会一次加载所有工具代码。

## 添加新工具

### 1. 创建工具目录与配置

创建 `app/tools/new-tool/`，并在其中添加 `config.ts`：

```ts
import { defineTool } from "../../tool-types";

export const newToolConfig = defineTool({
  id: "new-tool",
  title: "新工具",
  summary: "一句话说明用途。",
  category: "dev",
  mark: "N",
  searchTerms: ["关键词", "keyword"],
  load: () => import("./new-tool"),
});
```

然后在 `app/tool-registry.ts` 中导入 `newToolConfig` 并加入 `TOOLS`；`ToolId` 会自动包含 `"new-tool"`。`app/tool-panels.tsx` 会从注册表自动生成懒加载组件，不需要再维护第二份工具映射。用户悬停或用键盘聚焦工具卡片时会提前加载对应分块，打开弹窗时复用同一个加载结果。如需新分类，同时更新 `app/tool-types.ts` 的分类映射和 `TOOL_CATEGORIES`。

### 2. 创建工具组件

在同一目录创建 `new-tool.tsx` 并导出工具组件。专用样式、算法、类型或配置也放在这个目录内，例如 `styles.module.css`、`core.ts`、`types.ts`；组件通过 CSS Module 引用专用样式，不把工具私有选择器放回 `app/globals.css`。

```tsx
"use client";

export default function NewTool() {
  return <div>工具内容</div>;
}
```

### 3. 注册工具

只需在 `app/tool-registry.ts` 导入配置并加入 `TOOLS`：

```ts
import { newToolConfig } from "./tools/new-tool/config";

export const TOOLS = [
  // 现有工具…
  newToolConfig,
] as const satisfies readonly ToolDefinition[];
```

### 4. 更新测试并验证

如果新工具需要独立构建分块，请在 `tests/pages-build.test.mjs` 的 `toolChunks` 中加入对应文件名前缀，然后执行：

```bash
npm run typecheck
npm test
npm run test:pages
```

## GitHub Pages 部署

仓库采用双分支结构：

- `dev`：保存源码、测试和部署工作流，是日常开发分支。
- `main`：由 GitHub Actions 自动生成，只保存 `dist/` 中的静态产物。

推送到 `dev` 后，`.github/workflows/deploy-pages.yml` 会：

1. 安装依赖。
2. 构建纯客户端静态站点。
3. 将 `dist/` 强制推送到 `main`。
4. 由 GitHub Pages 从 `main` 根目录发布。

不要直接编辑或提交到 `main`，下一次部署会覆盖其中的内容。

首次部署 Fork 后的仓库时，请在 GitHub 中打开：

`Settings → Pages → Build and deployment`

选择：

- Source：`Deploy from a branch`
- Branch：`main`
- Folder：`/ (root)`

工作流已经声明 `contents: write` 权限。如果组织策略禁止写入，请在仓库的 Actions 设置中允许工作流写入仓库内容。

## 配置域名与 Base Path

当前配置用于自定义域名 `tool.raincither.top`：

```yaml
PAGES_BASE_PATH: /
PAGES_CUSTOM_DOMAIN: tool.raincither.top
```

构建会生成 `dist/CNAME`，避免自动部署覆盖 `main` 后丢失域名绑定。

### 使用自己的自定义域名

1. 在 `.github/workflows/deploy-pages.yml` 中将 `PAGES_CUSTOM_DOMAIN` 改为自己的域名。
2. 保持 `PAGES_BASE_PATH: /`。
3. 在 GitHub Pages 设置中填写相同的域名。
4. 按 GitHub 提示配置 DNS，等待检查通过后启用 HTTPS。

### 不使用自定义域名

如果站点地址是 `https://<用户名>.github.io/<仓库名>/`：

1. 将 `PAGES_BASE_PATH` 改为 `/<仓库名>`，例如 `/RCtools`。
2. 删除工作流中的 `PAGES_CUSTOM_DOMAIN`。
3. 在 `vite.pages.config.ts` 中禁用 `CNAME` 文件的生成。

Base Path 末尾不要添加 `/`。根路径使用单独的 `/`。

## 数据与隐私

- 工具输入在浏览器本地处理。
- 项目没有数据库和上传接口。
- 最近使用记录仅保存在当前浏览器的本地存储中。
- 清除浏览器站点数据会同时清除最近使用记录。

## 常见问题

### 页面打开后没有样式或脚本 404

检查 `PAGES_BASE_PATH` 是否与访问地址一致：自定义域名使用 `/`，仓库子路径使用 `/<仓库名>`。

### 自定义域名在重新部署后失效

确认 `PAGES_CUSTOM_DOMAIN` 与 GitHub Pages 设置中的域名一致，并检查构建产物中是否存在内容正确的 `CNAME` 文件。

### `main` 中看不到源码

这是正常现象。源码位于 `dev`，`main` 只用于 GitHub Pages 静态部署。

### 安装依赖失败

确认 Node.js 版本满足要求，然后重新执行：

```bash
npm ci
```

不要手动修改 `node_modules`。如果依赖目录损坏，可以删除后重新执行 `npm ci`。
