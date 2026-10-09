import styles from "./styles.module.css";
import { uiClasses } from "../../ui/tool-ui";
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { CopyButton } from "../../bindings/react/tool-ui";
import { CodeWorkspace } from "../../ui/code-workspace";
import { createController } from "./controller";
export default function ToolView() {
  const ports = useServices();
  const { snapshot: s, actions } = useController(() => createController(ports));
  return (
    <CodeWorkspace
      id="js-formatter"
      language="JavaScript"
      input={s.draft.input}
      output={s.output}
      error={s.error?.message ?? ""}
      status={s.status}
      retained={s.retained}
      update={(input) => actions.update({ ...s.draft, input })}
      run={(operation) => {
        void actions.run(operation, s.draft);
      }}
      clear={() => actions.update({ ...s.draft, input: "" })}
      cancel={actions.cancel}
      copy={<CopyButton value={s.output} />}
      settings={
        <div className={styles.settings}>
          <span className={uiClasses("field-label")} id="js-formatter-mode-label">
            压缩方式
          </span>
          <div className={styles.segmented} role="group" aria-labelledby="js-formatter-mode-label">
            {(
              [
                ["mangle", "改名压缩"],
                ["preserve-names", "保留名称"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={s.draft.mode === mode ? styles.active : undefined}
                aria-pressed={s.draft.mode === mode}
                onClick={() => actions.update({ ...s.draft, mode })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
