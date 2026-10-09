import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 提供 UTF-8 文本与 Base64 字符串之间的浏览器端转换界面。 */
import { CopyButton, ToolStatus } from "../../bindings/react/tool-ui";

/** 渲染 Base64 编解码工具并管理结果与错误状态。 */
export default function ToolView() {
  const usePorts = useServices();
  const { snapshot: s, actions } = useController(() => createController(usePorts));
  const input = s.draft,
    output = s.output,
    error = s.error?.message ?? "";
  const setInput = actions.update;
  const transform = (mode: "encode" | "decode") => {
    void actions.run(mode, input);
  };

  return (
    <div className={uiClasses("tool-form")}>
      <label className={uiClasses("field-label")} htmlFor="base64-input">
        原始内容
      </label>
      <textarea
        id="base64-input"
        className={uiClasses("tool-textarea")}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="支持中文与 Emoji"
      />
      <div className={uiClasses("tool-actions")}>
        <button
          className={uiClasses("button button-primary")}
          type="button"
          onClick={() => transform("encode")}
        >
          编码
        </button>
        <button
          className={uiClasses("button button-secondary")}
          type="button"
          onClick={() => transform("decode")}
        >
          解码
        </button>
        {s.status === "running" && (
          <button
            type="button"
            className={uiClasses("button button-secondary")}
            onClick={actions.cancel}
          >
            取消计算
          </button>
        )}
        <CopyButton value={output} />
      </div>
      <ToolStatus
        error={error}
        message={s.status === "running" ? "正在处理…" : output ? "处理完成。" : undefined}
      />
      {!s.retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <label className={uiClasses("field-label")} htmlFor="base64-output">
        处理结果
      </label>
      <textarea
        id="base64-output"
        className={uiClasses("tool-textarea tool-code")}
        value={output}
        readOnly
        placeholder="结果"
      />
    </div>
  );
}
