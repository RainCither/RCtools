/** @file 展示 8–40 位长度滑块、字符类别开关、生成按钮、密码结果和复制按钮。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 使用 Web Crypto 生成覆盖所选字符类别的无偏随机密码。 */
import { CopyButton, ToolStatus } from "../../bindings/react/tool-ui";
import styles from "./styles.module.css";

/** 渲染密码规则选择器并生成满足每类至少一个字符的密码。 */
import { PASSWORD_POOLS } from "./core";
/** 渲染密码生成的受控界面，将状态读取和用户操作连接到当前工具控制器。 */
export default function ToolView() {
  const usePorts = useServices();
  const { snapshot: model, actions } = useController(() => createController(usePorts));
  const { length, options, password, error } = model;
  const { setLength, setOptions, generate } = actions;

  return (
    <div className={uiClasses("tool-form")}>
      <div className={styles.rangeHeading}>
        <label className={uiClasses("field-label")} htmlFor="password-length">
          密码长度
        </label>
        <strong>{length}</strong>
      </div>
      <input
        id="password-length"
        className={styles.range}
        type="range"
        min="8"
        max="40"
        value={length}
        onChange={(event) => setLength(Number(event.target.value))}
      />
      <fieldset className={styles.optionGrid}>
        <legend className={uiClasses("field-label")}>包含字符</legend>
        {(Object.keys(PASSWORD_POOLS) as Array<keyof typeof PASSWORD_POOLS>).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(event) =>
                setOptions((current) => ({ ...current, [key]: event.target.checked }))
              }
            />
            {{ lower: "小写字母", upper: "大写字母", number: "数字", symbol: "符号" }[key]}
          </label>
        ))}
      </fieldset>
      <div className={uiClasses("tool-actions")}>
        <button className={uiClasses("button button-primary")} type="button" onClick={generate}>
          生成密码
        </button>
        <CopyButton value={password} />
      </div>
      <ToolStatus error={error} message={password ? "已使用浏览器安全随机数生成。" : undefined} />
      <output className={styles.output} aria-label="生成的密码">
        {password || "点击“生成密码”开始"}
      </output>
    </div>
  );
}
