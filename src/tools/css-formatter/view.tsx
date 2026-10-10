/** @file 用公共代码面板展示 CSS 输入输出，并连接格式化、压缩、取消和复制操作。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { CopyButton } from "../../bindings/react/tool-ui";
import { CodeWorkspace } from "../../ui/code-workspace";
import { createController } from "./controller";
/** 渲染CSS 格式化压缩的受控界面，将状态读取和用户操作连接到当前工具控制器。 */
export default function ToolView() {
  const ports = useServices();
  const { snapshot: s, actions } = useController(() => createController(ports));
  return (
    <CodeWorkspace
      id="css-formatter"
      language="CSS"
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
