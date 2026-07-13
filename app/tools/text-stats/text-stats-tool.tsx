"use client";

import { useMemo, useState } from "react";
import styles from "./styles.module.css";

export default function TextStatsTool() {
  const [input, setInput] = useState("");
  const stats = useMemo(() => {
    const words = input.match(/[A-Za-z0-9]+|[\u3400-\u9fff]/g) ?? [];
    return {
      characters: input.length,
      noSpaces: input.replace(/\s/g, "").length,
      words: words.length,
      lines: input ? input.split(/\r\n|\r|\n/).length : 0,
    };
  }, [input]);

  return (
    <div className="tool-form">
      <label className="field-label" htmlFor="stats-input">输入文本</label>
      <textarea id="stats-input" className="tool-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="粘贴或输入要统计的文本…" />
      <div className={styles.statGrid} aria-live="polite">
        <div><span>字符数</span><strong>{stats.characters}</strong></div>
        <div><span>不含空格</span><strong>{stats.noSpaces}</strong></div>
        <div><span>字词数</span><strong>{stats.words}</strong></div>
        <div><span>行数</span><strong>{stats.lines}</strong></div>
      </div>
    </div>
  );
}
