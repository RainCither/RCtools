import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 在 Unix 时间戳、可解析日期、本地时间与 ISO 时间之间转换。 */
import { ToolStatus } from "../../bindings/react/tool-ui";

/** 渲染时间输入和多种标准化时间表示。 */
export default function ToolView() {
  const usePorts = useServices();
  const { snapshot: model, actions } = useController(() => createController(usePorts));
  const { input, result, error } = model;
  const { setInput, convert, useNow } = actions;

  return (
    <div className={uiClasses("tool-form")}>
      <label className={uiClasses("field-label")} htmlFor="timestamp-input">
        时间戳或日期
      </label>
      <input
        id="timestamp-input"
        className={uiClasses("tool-input")}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="例如：1720584000 或 2026-07-10 14:00"
      />
      <div className={uiClasses("tool-actions")}>
        <button
          className={uiClasses("button button-primary")}
          type="button"
          onClick={() => convert()}
        >
          转换
        </button>
        <button className={uiClasses("button button-secondary")} type="button" onClick={useNow}>
          使用当前时间
        </button>
      </div>
      <ToolStatus error={error} message={result ? "转换完成。" : undefined} />
      <dl className={uiClasses("result-list")}>
        <div>
          <dt>本地时间</dt>
          <dd>{result?.local ?? "—"}</dd>
        </div>
        <div>
          <dt>ISO 8601</dt>
          <dd>{result?.iso ?? "—"}</dd>
        </div>
        <div>
          <dt>秒</dt>
          <dd>{result?.seconds ?? "—"}</dd>
        </div>
        <div>
          <dt>毫秒</dt>
          <dd>{result?.milliseconds ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
