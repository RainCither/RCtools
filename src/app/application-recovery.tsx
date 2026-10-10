/** @file 全局错误页面中的恢复辅助组件。记录应用渲染失败，允许用户复制诊断信息，并显示复制反馈。 */
import { useEffect, useRef, useState } from "react";
/** 渲染应用错误页的诊断复制入口，并在 effect 中记录一次渲染失败。 */
export default function ApplicationRecovery() {
  const [copied, setCopied] = useState(false);
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    void import("./browser-runtime.client")
      .then((module) => module.reportApplicationFailure())
      .catch(() => {});
  }, []);
  /** 发起用户触发的复制操作，并在完成后更新当前仍挂载界面的成功或失败反馈。 */
  function copy() {
    void import("./browser-runtime.client")
      .then((module) => module.copyApplicationDiagnostics())
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }
  return (
    <button type="button" onClick={copy}>
      {copied ? "诊断信息已复制" : "复制诊断信息"}
    </button>
  );
}
