# 添加工具

新工具只编辑 `src/tools/<id>`。生成器扫描 JSON，路由和预渲染路径从同一份配置派生，无需修改中央注册表。

## 目录约定

```text
src/tools/example/
├─ tool.json
├─ core.ts
├─ controller.ts
├─ view.tsx
├─ worker.ts           # 重计算时使用
├─ types.ts            # 专用类型，按需
├─ messages.ts         # 校验和操作文案，按需
└─ styles.module.css   # 私有样式，按需
```

ID 与目录名必须一致，使用小写短横线；入口大小写必须精确。视图默认导出无必需 props 的 React 组件。算法规模较大时继续在本工具内部拆分，不能跨工具引用。

## 元数据

```json
{
  "id": "example",
  "title": "示例工具",
  "summary": "一句话说明用途。",
  "category": "dev",
  "mark": "E",
  "searchTerms": ["示例", "example"],
  "order": 170,
  "draft": "session",
  "appearance": { "tone": "blue", "size": 16, "font": "mono" }
}
```

分类必须存在于 `src/catalog/categories.json`。工具、外链 ID 全局唯一。按 `order`、`id` 排序；分类中文名称在展示时派生。草稿默认 `session`；敏感工具设置 `none`，控制器也不声明敏感持久字段。外观参数只能选择 Schema 中的受控枚举和字号范围，不添加依赖 ID 的全局样式。

配置不能包含组件路径、函数或脚本。生成器校验全部配置成功后才写入 `src/generated`，内容没有变化就不重复写入。

## 纯核心与控制器

```ts
// core.ts
export function reverseText(input: string): string {
  return Array.from(input).reverse().join("");
}
```

核心不依赖 React、DOM、页面、存储或其他工具。时间和随机数通过参数注入；文件输入是字节，不能接收 File。空白、编码和数值处理规则要显式定义。

```ts
// controller.ts
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";

export function createController(ports: ControllerPorts) {
  return createOperationController<string, string>({
    id: "example",
    initial: "",
    empty: "",
    ports,
    restore(value, fallback) {
      return typeof value === "string" ? value : fallback;
    },
  });
}
```

控制器必须提供稳定、不可变快照和订阅，激活后才读取草稿或启动任务。输入更新立即取消旧任务并清除旧输出。只序列化主动声明的输入与选项；不能保存结果、错误、文件、缓冲区或任务句柄。

复杂输入模型参考 `time-diff/controller.ts`，多动作 Worker 工具参考 `md5/controller.ts`。轻量工具直接在控制器调用核心；不要为了统一入口强制启动 Worker。

## Worker 与视图

```ts
// worker.ts
import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { reverseText } from "./core";

serveWorker(
  {
    listen(listener) {
      self.onmessage = (event) => listener(event.data);
    },
    send(message) {
      self.postMessage(message);
    },
  },
  (_operation, input) => {
    if (typeof input !== "string") throw failure("validation", "example.input", "请输入文字。");
    return reverseText(input);
  },
);
```

Worker 工厂从约定入口自动生成；视图和适配器不得自行导入其他工具或创建 Worker。算法依赖可以在核心或 Worker 动态加载，加载失败必须保留 `resource` 分类，不能包装成语法错误。协议只传可序列化结果和错误。

```tsx
// view.tsx
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { CopyButton, ToolStatus, uiClasses } from "../../bindings/react/tool-ui";
import { createController } from "./controller";

export default function ExampleTool() {
  const ports = useServices();
  const { snapshot, actions } = useController(() => createController(ports));
  return (
    <div className={uiClasses("tool-form")}>
      <label htmlFor="example-input">输入文字</label>
      <textarea
        id="example-input"
        value={snapshot.draft}
        onChange={(event) => actions.update(event.target.value)}
      />
      <button type="button" onClick={() => void actions.run("reverse", snapshot.draft)}>
        处理
      </button>
      {snapshot.status === "running" && (
        <button type="button" onClick={actions.cancel}>
          取消计算
        </button>
      )}
      <CopyButton value={snapshot.output} />
      <ToolStatus
        error={snapshot.error?.message}
        message={snapshot.status === "running" ? "正在处理…" : undefined}
      />
      {!snapshot.retained && <p role="status">输入过大，离开后不会保留。</p>}
      <label htmlFor="example-output">处理结果</label>
      <textarea id="example-output" readOnly value={snapshot.output} />
    </div>
  );
}
```

`useServices` 提供能力，`useController` 管理订阅与释放。公共 UI 只接收展示值和回调；控件不能调用浏览器存储或业务算法。渲染期间不得创建 Worker、写存储或设置定时器。错误应关联输入标签和说明，运行及错误状态应能够被辅助技术播报。

需要跨刷新保留独立业务状态时，可参考 2048：声明 `draft: "none"`，控制器通过注入的 `PersistentStore` 读写版本化 JSON 存档。存储访问放在激活或用户动作中，校验 `unknown` 后才恢复；适配器负责页面内回退和存储错误，不能把普通工具的结果改为持久草稿。

自动计算工具使用 `automatic` 与 `debounceMs`；正则使用 200 ms/2 秒，其余自动计算使用 150 ms/30 秒。文件读取通过适配能力和 `TaskPreparation`，提供取消信号并转移 ArrayBuffer；不在控制器保存文件缓冲区。

## 验证与约束

```bash
npm run generate
npm run build
npm run test:e2e
git diff --check
```

构建自行生成类型；生成文件被忽略，干净检出可直接构建。非法分类、重复 ID、缺失视图、错误大小写和默认导出不满足契约都会失败。架构门禁阻止跨工具引用、公共 UI 引用实现、核心依赖浏览器、绕过生成入口及循环依赖。

新验证放入 `quality/unit` 或 `quality/browser`，围绕真实行为与边界：空输入、无效输入、专用语义、连续提交、取消、超时、迟到响应、离开页面、资源错误与草稿保留。浏览器验证还应覆盖直接访问/刷新、键盘操作、手机宽度、标签关联和状态播报。

首页及其静态脚本依赖 Gzip 必须在 100 KiB 内；工具专属解析器、压缩器和 WASM 只能按需加载。新增工具不能引入中央导入表、路由表或构建清单编辑。

统一错误、日志字段白名单、输入生命周期及发布要求见 [ARCHITECTURE.md](./ARCHITECTURE.md)。
