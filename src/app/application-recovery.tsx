import { useEffect, useRef, useState } from "react";
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
