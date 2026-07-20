# 工具匣（RCtools）

一个简洁、可扩展的浏览器工具箱。所有输入都在浏览器本地处理，无需上传内容，也不依赖后端服务。

[在线使用](https://tool.raincither.top/) · [添加新工具指南](./ADDTOOL.md)

## 功能特点

- 常用文本、开发和日期工具集中在一个页面中。
- 支持标题、中文关键词、英文关键词和别名搜索。
- 工具组件按需加载，避免在首屏加载全部工具代码。
- 输入数据仅在本地处理，最近使用记录保存在当前浏览器中。
- 可构建为纯静态站点并部署到 GitHub Pages。

## 工具列表

| 类别 | 工具 | 功能 |
| --- | --- | --- |
| 开发 | JSON 格式化 | 校验、格式化或压缩 JSON 数据 |
| 开发 | CSS 格式化压缩 | 格式化或压缩标准 CSS 样式代码 |
| 开发 | JavaScript 格式化压缩 | 格式化或压缩现代 JavaScript 与 ES Modules |
| 开发 | HTML 格式化压缩 | 格式化或保守压缩 HTML，并处理内嵌 CSS 与 JavaScript |
| 日期 | 时间戳转换 | 在时间戳、日期与标准时间之间转换 |
| 日期 | 连续时间差 | 连续或成对输入时间，计算分段差值与累计总时长 |
| 文本 | 文本统计 | 统计字数、字符、单词和行数 |
| 文本 | 故障文字生成 | 用 Unicode 组合符生成可复制的故障、错位文字 |
| 开发 | 密码生成 | 按长度和字符规则生成随机密码 |
| 开发 | Base64 编解码 | 编码或解码包含中文的文本 |
| 开发 | 进制转换 | 在二、八、十、十六进制整数之间精确转换 |
| 开发 | IEEE-754 浮点数转换 | 在十进制数与 Float32/Float64 位模式之间双向转换 |
| 开发 | 颜色转换 | 将 HEX 颜色转换为 RGB 与 HSL |

## 本地开发

### 环境要求

- Node.js `>= 22.13.0`
- npm（随 Node.js 安装）
- Chrome、Edge、Firefox 或 Safari 等现代浏览器

### 快速开始

```bash
git clone https://github.com/RainCither/RCtools.git
cd RCtools
git switch dev
npm ci
npm run dev
```

开发服务器默认运行在 [http://localhost:3000](http://localhost:3000)。如果端口被占用，请以终端显示的地址为准。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vinext 开发服务器 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm test` | 运行类型检查、服务端构建和功能测试 |
| `npm run build` | 生成 GitHub Pages 静态文件到 `dist/` |
| `npm run pages:build` | GitHub Pages 构建命令，等同于 `npm run build` |
| `npm run test:pages` | 构建并验证 GitHub Pages 静态产物 |
| `npm run build:server` | 构建用于专项验证的 Vinext 服务端版本 |
| `npm run start` | 启动已构建的 Vinext 服务端版本 |

构建并预览静态站点：

```bash
npm run build
npx vite preview --config vite.pages.config.ts
```

提交代码前建议运行：

```bash
npm test
npm run test:pages
git diff --check
```

## 项目结构

```text
RCtools/
├─ app/
│  ├─ tools/
│  │  ├─ json/                 # 一个工具一个目录
│  │  │  ├─ config.ts          # 元数据与动态导入入口
│  │  │  ├─ json-tool.tsx      # 工具组件
│  │  │  └─ styles.module.css  # 工具私有样式（按需）
│  │  ├─ time-diff/            # 可包含专用算法、类型和样式
│  │  └─ shared/               # 跨工具复用的 UI 与逻辑
│  ├─ page.tsx                 # Vinext 页面入口
│  ├─ pages-entry.tsx          # GitHub Pages 客户端入口
│  ├─ toolbox-app.tsx          # 工具箱主界面
│  ├─ tool-types.ts            # 工具类型与分类名称
│  ├─ tool-registry.ts         # 工具配置注册表
│  └─ tool-panels.tsx          # 懒加载与预加载管理
├─ public/                     # favicon 等公共静态资源
├─ tests/                      # 功能、结构与静态构建测试
├─ .github/workflows/          # GitHub Pages 自动部署工作流
├─ ADDTOOL.md                  # 添加新工具的完整指南
├─ index.html                  # Vite 静态页面入口
├─ vite.config.ts              # Vinext 开发配置
└─ vite.pages.config.ts        # GitHub Pages 静态构建配置
```

每个工具的配置、组件、算法和专用样式都收拢在自己的目录中。工具 ID、分类、搜索和懒加载组件从注册表自动推导；只有被多个工具共同使用的代码才放入 `app/tools/shared/`。

## 添加新工具

完整步骤、代码模板、测试要求和验收清单见 [`ADDTOOL.md`](./ADDTOOL.md)。基本流程是：

1. 在 `app/tools/<tool-id>/` 中创建配置和组件。
2. 使用 `defineTool` 声明元数据与动态导入入口。
3. 将配置加入 `app/tool-registry.ts` 的 `TOOLS`。
4. 更新工具清单、功能测试和独立分块测试。
5. 运行完整验证并在浏览器中检查交互和响应式布局。

`app/tool-panels.tsx` 会从注册表自动生成组件映射，添加工具时不需要在其中维护第二份清单。

## GitHub Pages 部署

### 分支约定

- `dev`：保存源码、测试和部署工作流，是日常开发分支。
- `main`：由 GitHub Actions 自动生成，只保存 `dist/` 中的静态产物。

推送到 `dev` 后，`.github/workflows/deploy-pages.yml` 会安装依赖、构建静态站点，并将 `dist/` 强制发布到 `main`。不要直接编辑或提交到 `main`，下一次部署会覆盖其中的内容。

首次部署 Fork 后的仓库时，在 GitHub 中打开：

`Settings → Pages → Build and deployment`

设置为：

- Source：`Deploy from a branch`
- Branch：`main`
- Folder：`/ (root)`

工作流需要 `contents: write` 权限。如果组织策略禁止写入，请在仓库的 Actions 设置中允许工作流写入仓库内容。

### 域名与 Base Path

当前部署使用自定义域名 `tool.raincither.top`：

```yaml
PAGES_BASE_PATH: /
PAGES_CUSTOM_DOMAIN: tool.raincither.top
```

`vite.pages.config.ts` 会把资源路径设置为根路径，并生成 `dist/CNAME`。

使用其他自定义域名时：

1. 将工作流中的 `PAGES_CUSTOM_DOMAIN` 改为目标域名。
2. 保持 `PAGES_BASE_PATH: /`。
3. 在 GitHub Pages 设置中填写相同域名。
4. 按 GitHub 提示配置 DNS，检查通过后启用 HTTPS。

不使用自定义域名、通过 `https://<用户名>.github.io/<仓库名>/` 访问时：

1. 将 `PAGES_BASE_PATH` 改为 `/<仓库名>`，例如 `/RCtools`。
2. 修改 `vite.pages.config.ts`，在没有自定义域名时不生成 `CNAME`。
3. 确认 GitHub Pages 仍从 `main` 分支根目录发布。

Base Path 必须以 `/` 开头；除根路径 `/` 外，末尾不要添加 `/`。

## 数据与隐私

- 工具输入在浏览器本地处理。
- 项目没有数据库和上传接口。
- 最近使用记录仅保存在当前浏览器的本地存储中。
- 清除浏览器站点数据会同时清除最近使用记录。

## 常见问题

### 页面打开后样式或脚本返回 404

检查 `PAGES_BASE_PATH` 是否与访问地址一致：自定义域名使用 `/`，仓库子路径使用 `/<仓库名>`。

### 自定义域名在重新部署后失效

确认 `PAGES_CUSTOM_DOMAIN` 与 GitHub Pages 设置中的域名一致，并检查构建产物中是否存在内容正确的 `CNAME`。

### `main` 中看不到源码

这是正常现象。源码位于 `dev`，`main` 只用于 GitHub Pages 静态部署。

### 新工具没有出现在页面中

确认工具配置已经导入 `app/tool-registry.ts` 并加入 `TOOLS`，同时检查 `config.ts` 中的动态导入路径是否指向默认导出的组件。

### 安装依赖失败

确认 Node.js 版本满足要求，然后重新执行：

```bash
npm ci
```

不要手动修改 `node_modules`。如果依赖目录损坏，可以删除后重新执行 `npm ci`。
