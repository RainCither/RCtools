/** @file 展示颜色选择器、HEX 输入、颜色预览和各颜色格式结果，提示无效输入。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 将 HEX 颜色转换为 RGB/HSL，并提供同步的颜色选择与预览界面。 */
import { ToolStatus } from "../../bindings/react/tool-ui";
import styles from "./styles.module.css";

/** 渲染颜色输入、预览以及 HEX/RGB/HSL 转换结果。 */
export default function ToolView() {
  const usePorts = useServices();
  const { snapshot: model, actions } = useController(() => createController(usePorts));
  const { input, normalized, rgb, hsl } = model;
  const { setInput } = actions;

  return (
    <div className={uiClasses("tool-form")}>
      <label className={uiClasses("field-label")} htmlFor="color-text">
        HEX 颜色
      </label>
      <div className={styles.inputRow}>
        <input
          aria-label="选择颜色"
          className={styles.picker}
          type="color"
          value={normalized ?? "#F26B4D"}
          onChange={(event) => setInput(event.target.value.toUpperCase())}
        />
        <input
          id="color-text"
          className={uiClasses("tool-input tool-code")}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="#F26B4D"
        />
      </div>
      <ToolStatus
        error={normalized ? undefined : "请输入 3 位或 6 位 HEX 颜色。"}
        message={normalized ? "颜色转换完成。" : undefined}
      />
      <div
        className={styles.preview}
        style={{ backgroundColor: normalized ?? "#F26B4D" }}
        aria-label={`颜色预览 ${normalized ?? "无效"}`}
      />
      <dl className={uiClasses("result-list")}>
        <div>
          <dt>HEX</dt>
          <dd>{normalized ?? "—"}</dd>
        </div>
        <div>
          <dt>RGB</dt>
          <dd>{rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : "—"}</dd>
        </div>
        <div>
          <dt>HSL</dt>
          <dd>{hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
