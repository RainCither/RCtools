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
      id="html-formatter"
      language="HTML"
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
    />
  );
}
