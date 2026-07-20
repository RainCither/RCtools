# 添加新工具指南

本文说明如何为 RCtools 添加一个可搜索、按需加载并能通过现有测试的新工具。示例工具 ID 为 `new-tool`，请在实际使用时替换为真实名称。

## 1. 确定名称与目录

- 工具 ID 和目录名使用小写短横线格式，例如 `url-encoder`。
- 工具 ID 必须在 `app/tool-registry.ts` 的 `TOOLS` 中保持唯一。
- 每个工具独占一个目录：`app/tools/<tool-id>/`。
- 组件入口命名为 `<tool-id>-tool.tsx`，并使用默认导出。
- 工具私有的算法、类型和样式也放在该目录内；只有多个工具共同使用的代码才放入 `app/tools/shared/`。

推荐结构：

```text
app/tools/new-tool/
├─ config.ts
├─ new-tool-tool.tsx
├─ new-tool-core.ts       # 可选：与 React 无关的核心逻辑
├─ styles.module.css      # 可选：工具私有样式
└─ types.ts               # 可选：工具私有类型
```

## 2. 创建工具配置

创建 `app/tools/new-tool/config.ts`：

```ts
import { defineTool } from "../../tool-types";

export const newToolConfig = defineTool({
  id: "new-tool",
  title: "新工具",
  summary: "一句话说明这个工具能解决什么问题。",
  category: "dev",
  mark: "N",
  searchTerms: ["新工具", "关键词", "new tool"],
  load: () => import("./new-tool-tool"),
});
```

字段说明：

| 字段 | 要求 |
| --- | --- |
| `id` | 全局唯一，并与目录名保持一致 |
| `title` | 显示在工具卡片和弹窗中的名称 |
| `summary` | 简短说明用途，建议写成完整中文句子 |
| `category` | 使用 `text`、`dev` 或 `date` |
| `mark` | 工具卡片上的简短标记，不要使用过长文本 |
| `searchTerms` | 同时加入中文、英文、别名和常见搜索词 |
| `load` | 动态导入组件入口，路径必须与实际文件名一致 |

`categoryLabel` 会由 `defineTool` 自动生成，不要在工具配置中重复填写。

## 3. 创建工具组件

创建 `app/tools/new-tool/new-tool-tool.tsx`：

```tsx
"use client";

import { useState } from "react";
import { CopyButton, ToolStatus } from "../shared/tool-ui";
import styles from "./styles.module.css";

export default function NewTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function handleConvert() {
    try {
      setOutput(input.trim());
      setError("");
    } catch (cause) {
      setOutput("");
      setError(cause instanceof Error ? cause.message : "处理失败");
    }
  }

  return (
    <div className={`tool-form ${styles.root}`}>
      <label className="field-label" htmlFor="new-tool-input">
        输入
      </label>
      <textarea
        id="new-tool-input"
        className="tool-textarea"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      <div className="tool-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={handleConvert}
        >
          处理
        </button>
        <CopyButton value={output} />
      </div>
      <ToolStatus error={error} message={output ? "处理完成。" : undefined} />
    </div>
  );
}
```

如果不需要专用样式，可以删除 `styles` 的导入和引用，不创建 CSS 文件。需要专用样式时，创建 `styles.module.css`；不要把只属于该工具的选择器加入 `app/globals.css`。

组件应满足以下基本要求：

- 入口文件使用 `export default`，否则动态导入无法交给 React 渲染。
- 输入控件通过 `label`、`htmlFor` 和唯一的 `id` 建立关联。
- 错误状态应清楚显示；需要时使用 `aria-invalid`、`role="alert"` 或 `aria-live`。
- 所有按钮显式设置 `type="button"`。
- 可复制的结果优先复用 `CopyButton`，状态提示优先复用 `ToolStatus`。
- 处理用户输入的核心逻辑尽量放入独立的 `*-core.ts`，便于直接测试。

## 4. 注册工具

在 `app/tool-registry.ts` 中导入配置：

```ts
import { newToolConfig } from "./tools/new-tool/config";
```

再把配置加入 `TOOLS`。数组顺序就是工具在页面中的默认显示顺序：

```ts
export const TOOLS = [
  // 现有工具……
  newToolConfig,
] as const satisfies readonly ToolDefinition[];
```

完成后，`ToolId`、搜索、筛选、预加载和弹窗中的懒加载组件都会从注册表自动推导。不要在 `app/tool-panels.tsx` 中再添加一份组件映射。

如需增加新分类，而不是使用现有的 `text`、`dev` 或 `date`，需要同时修改：

1. `app/tool-types.ts` 中的 `TOOL_CATEGORY_LABELS`。
2. `app/tool-registry.ts` 中的 `TOOL_CATEGORIES`。

## 5. 更新文档与测试

### README 工具清单

在 `README.md` 的“已有工具”表格中加入工具名称和用途。

### 结构与服务端渲染测试

按新工具的实际文件更新 `tests/rendered-html.test.mjs`：

- 在首个渲染测试中断言新工具标题存在。
- 在 `toolFiles` 中加入组件入口、核心逻辑或样式等需要长期保留的文件。
- 在 `configSources` 的目录清单中加入新工具目录。
- 在 `toolChunks` 中加入 `<tool-id>-tool`，验证服务端构建产生独立客户端分块。

### GitHub Pages 构建测试

更新 `tests/pages-build.test.mjs`：

- 在 `toolChunks` 中加入 `<tool-id>-tool`。
- 如果组件导入了 CSS Module，在 `toolStyleChunks` 中也加入 `<tool-id>-tool`。

### 功能测试

复杂转换或计算逻辑应在 `tests/<tool-id>.test.mjs` 中直接测试。当前 `npm test` 会显式列出测试文件，因此新增测试后还要把文件路径加入 `package.json` 的 `test` 脚本。

测试至少覆盖：

- 正常输入和典型输出。
- 空输入、格式错误和边界值。
- 中文、负数、超长值或精度问题等与功能相关的特殊情况。
- 已发现并修复的回归场景。

## 6. 本地验证

依次执行：

```bash
npm run typecheck
npm test
npm run test:pages
git diff --check
```

还应启动开发服务器进行一次交互检查：

```bash
npm run dev
```

在浏览器中确认：

- 工具卡片能通过标题、中文关键词和英文关键词搜索到。
- 分类筛选正确。
- 点击卡片后组件可以加载，终端和浏览器控制台没有错误。
- 输入、清空、复制、报错和重复操作符合预期。
- 键盘可以完成主要操作，焦点和状态提示清楚。
- 窄屏下没有横向溢出或控件遮挡。
- `dist/assets/` 中存在该工具独立的 JavaScript 分块；使用 CSS Module 时也存在对应的 CSS 分块。

## 完成检查表

- [ ] 工具拥有独立目录，ID、目录名和入口文件名一致。
- [ ] `config.ts` 使用 `defineTool`，动态导入指向默认导出的组件。
- [ ] 配置已加入 `TOOLS`，没有修改 `app/tool-panels.tsx` 的自动映射逻辑。
- [ ] 工具私有代码和样式没有放入共享目录或全局样式。
- [ ] README 的工具清单已更新。
- [ ] 结构测试、分块测试和必要的功能测试已更新。
- [ ] 类型检查、完整测试和 Pages 测试全部通过。
- [ ] 已在浏览器中验证搜索、筛选、交互、错误状态和响应式布局。
