/** @file 将 JSON 控制器接入公共代码面板，提供格式化、压缩、清空、取消与结果复制。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { CopyButton } from "../../bindings/react/tool-ui";
import { CodeWorkspace } from "../../ui/code-workspace";
import { createController } from "./controller";
/** 渲染JSON 格式化的受控界面，将状态读取和用户操作连接到当前工具控制器。 */
export default function ToolView() {
  const ports = useServices();
  const { snapshot: s, actions } = useController(() => createController(ports));
  return (
    <CodeWorkspace
      id="json"
      language="JSON"
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
