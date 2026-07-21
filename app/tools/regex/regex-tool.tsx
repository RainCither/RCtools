"use client";

import {
  Fragment,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";
import { CopyButton } from "../shared/tool-ui";
import {
  DEFAULT_REGEX_FLAGS,
  evaluateRegex,
  REGEX_FLAGS,
  type RegexFlag,
  type RegexFlagState,
  type RegexMatch,
  serializeRegexFlags,
} from "./regex-core";
import {
  COMMON_REGEX_CATEGORIES,
  COMMON_REGEXES,
  REGEX_SYNTAX_SECTIONS,
  type CommonRegexEntry,
  type RegexView,
} from "./regex-reference";
import styles from "./styles.module.css";

const FLAG_OPTIONS: Array<{
  flag: RegexFlag;
  label: string;
  description: string;
}> = [
  { flag: "g", label: "全局", description: "查找全部匹配" },
  { flag: "i", label: "忽略大小写", description: "大小写视为相同" },
  { flag: "m", label: "多行", description: "^ 与 $ 按行生效" },
  { flag: "s", label: "点匹配换行", description: ". 可匹配换行符" },
  { flag: "u", label: "Unicode", description: "按 Unicode 代码点处理" },
];

const VIEW_OPTIONS: ReadonlyArray<{ id: RegexView; label: string }> = [
  { id: "tester", label: "正则测试" },
  { id: "syntax", label: "语法速查" },
  { id: "common", label: "常用正则" },
];

type RegexTesterProps = {
  pattern: string;
  source: string;
  replacement: string;
  flags: RegexFlagState;
  setPattern: (value: string) => void;
  setSource: (value: string) => void;
  setReplacement: (value: string) => void;
  setFlags: Dispatch<SetStateAction<RegexFlagState>>;
  onClear: () => void;
};

function MatchValue({ value }: { value: string | undefined }) {
  if (value === undefined) {
    return <span className={styles.unmatched}>未参与匹配</span>;
  }
  if (value === "") {
    return <span className={styles.emptyValue}>空字符串</span>;
  }
  return <>{value}</>;
}

function HighlightedSource({
  source,
  matches,
}: {
  source: string;
  matches: RegexMatch[];
}) {
  if (!source) {
    return <span className={styles.previewEmpty}>输入测试文本后在此查看匹配位置。</span>;
  }

  const fragments: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.index > cursor) {
      fragments.push(
        <Fragment key={`text-${index}`}>
          {source.slice(cursor, match.index)}
        </Fragment>,
      );
    }

    if (match.value) {
      fragments.push(
        <mark className={styles.highlight} key={`match-${index}`}>
          {match.value}
        </mark>,
      );
    } else {
      fragments.push(
        <mark
          className={styles.zeroWidth}
          key={`match-${index}`}
          aria-label={`索引 ${match.index} 处的零长度匹配`}
        >
          <span aria-hidden="true">¦</span>
        </mark>,
      );
    }
    cursor = match.end;
  });

  if (cursor < source.length) {
    fragments.push(<Fragment key="text-tail">{source.slice(cursor)}</Fragment>);
  }

  return <>{fragments}</>;
}

function MatchDetails({ match, number }: { match: RegexMatch; number: number }) {
  const namedGroups = Object.entries(match.namedGroups);

  return (
    <article className={styles.matchCard}>
      <header className={styles.matchHeading}>
        <strong>匹配 {number}</strong>
        <span>
          索引 {match.index}–{match.end}
        </span>
      </header>
      <dl className={styles.groupList}>
        <div>
          <dt>完整匹配</dt>
          <dd><MatchValue value={match.value} /></dd>
        </div>
        {match.captures.map((capture, index) => (
          <div key={`capture-${index}`}>
            <dt>捕获组 ${index + 1}</dt>
            <dd><MatchValue value={capture} /></dd>
          </div>
        ))}
        {namedGroups.map(([name, value]) => (
          <div key={`named-${name}`}>
            <dt>命名组 {name}</dt>
            <dd><MatchValue value={value} /></dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function RegexTester({
  pattern,
  source,
  replacement,
  flags,
  setPattern,
  setSource,
  setReplacement,
  setFlags,
  onClear,
}: RegexTesterProps) {
  const flagString = serializeRegexFlags(flags);
  const evaluation = useMemo(
    () => evaluateRegex(pattern, flagString, source, replacement),
    [flagString, pattern, replacement, source],
  );

  function updateFlag(flag: RegexFlag, checked: boolean) {
    setFlags((current) => ({ ...current, [flag]: checked }));
  }

  const error = evaluation.status === "error" ? evaluation.error : "";
  const matches = evaluation.status === "success" ? evaluation.matches : [];
  const replacedText = evaluation.status === "success"
    ? evaluation.replacedText
    : "";
  const statusMessage = evaluation.status === "idle"
    ? "输入正则表达式后会实时显示结果。"
    : evaluation.status === "error"
      ? evaluation.error
      : evaluation.truncated
        ? `已显示前 ${evaluation.matches.length} 个匹配，更多结果已截断。`
        : `找到 ${evaluation.matches.length} 个匹配。`;

  return (
    <div className={styles.viewContent}>
      <section className={styles.section} aria-labelledby="regex-pattern-label">
        <div className={styles.sectionHeading}>
          <div>
            <h3 id="regex-pattern-label">正则表达式</h3>
            <p>使用浏览器原生 JavaScript RegExp 语法。</p>
          </div>
          <button className="button button-secondary" type="button" onClick={onClear}>
            清空
          </button>
        </div>
        <div className={styles.patternInput}>
          <span aria-hidden="true">/</span>
          <input
            id="regex-pattern"
            className="tool-input tool-code"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="例如：(?<word>\\w+)"
            aria-invalid={Boolean(error)}
            aria-describedby="regex-pattern-help regex-status"
            spellCheck={false}
          />
          <span aria-hidden="true">/</span>
          <code aria-label={`当前标志 ${flagString || "无"}`}>{flagString}</code>
        </div>
        <p className={styles.help} id="regex-pattern-help">
          只输入表达式主体，不要包含首尾斜杠；标志请在下方选择。
        </p>
      </section>

      <fieldset className={styles.flags}>
        <legend className="field-label">匹配标志</legend>
        <div className={styles.flagGrid}>
          {FLAG_OPTIONS.map((option) => (
            <label className={styles.flagOption} key={option.flag}>
              <input
                type="checkbox"
                checked={flags[option.flag]}
                onChange={(event) => updateFlag(option.flag, event.target.checked)}
              />
              <span>
                <strong>{option.flag} · {option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className={styles.section} aria-labelledby="regex-source-label">
        <label className="field-label" id="regex-source-label" htmlFor="regex-source">
          测试文本
        </label>
        <textarea
          id="regex-source"
          className={`tool-textarea tool-code ${styles.sourceInput}`}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="粘贴需要匹配的文本"
          spellCheck={false}
        />
      </section>

      <p
        className={error ? styles.statusError : styles.status}
        id="regex-status"
        role={error ? "alert" : "status"}
        aria-live="polite"
      >
        {statusMessage}
      </p>

      <section className={styles.section} aria-labelledby="regex-preview-heading">
        <div className={styles.sectionHeading}>
          <div>
            <h3 id="regex-preview-heading">匹配预览</h3>
            <p>高亮显示完整匹配；竖线表示零长度匹配。</p>
          </div>
          <span className={styles.matchCount}>{matches.length} 项</span>
        </div>
        <pre className={styles.preview} aria-label="匹配高亮预览">
          <HighlightedSource source={source} matches={matches} />
        </pre>
      </section>

      {evaluation.status === "success" && matches.length > 0 ? (
        <section className={styles.section} aria-labelledby="regex-details-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h3 id="regex-details-heading">匹配与捕获组</h3>
              <p>索引按 JavaScript UTF-16 字符位置计算。</p>
            </div>
          </div>
          <div className={styles.matchList}>
            {matches.map((match, index) => (
              <MatchDetails
                key={`${match.index}-${match.end}-${index}`}
                match={match}
                number={index + 1}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="regex-replacement-heading">
        <div className={styles.sectionHeading}>
          <div>
            <h3 id="regex-replacement-heading">替换预览</h3>
            <p>支持 $&amp;、$1、$&lt;name&gt;、$$、$` 与 $&apos;；留空会删除匹配内容。</p>
          </div>
          <CopyButton value={replacedText} label="替换结果" />
        </div>
        <label className="field-label" htmlFor="regex-replacement">替换文本</label>
        <textarea
          id="regex-replacement"
          className={`tool-textarea tool-code ${styles.replacementInput}`}
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
          placeholder="例如：[$&]"
          spellCheck={false}
        />
        <label className="field-label" htmlFor="regex-output">替换结果</label>
        <textarea
          id="regex-output"
          className={`tool-textarea tool-code ${styles.output}`}
          value={replacedText}
          readOnly
          placeholder={pattern ? "替换结果会显示在这里" : "先输入正则表达式"}
        />
      </section>
    </div>
  );
}

function SyntaxReference() {
  return (
    <div className={styles.referenceView}>
      <header className={styles.referenceIntro}>
        <h3>JavaScript 正则语法速查</h3>
        <p>示例均按本工具的表达式主体输入方式编写，不需要添加首尾斜杠。</p>
      </header>
      {REGEX_SYNTAX_SECTIONS.map((section) => (
        <section className={styles.referenceSection} key={section.id} aria-labelledby={`syntax-${section.id}`}>
          <div className={styles.referenceHeading}>
            <h3 id={`syntax-${section.id}`}>{section.title}</h3>
            <p>{section.description}</p>
          </div>
          <div className={styles.syntaxGrid}>
            {section.entries.map((entry) => (
              <article className={styles.syntaxCard} key={entry.id}>
                <div className={styles.syntaxTitle}>
                  <code>{entry.syntax}</code>
                  <strong>{entry.title}</strong>
                </div>
                <p>{entry.description}</p>
                <span className={styles.syntaxExample}>{entry.example}</span>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CommonRegexReference({
  onLoad,
}: {
  onLoad: (entry: CommonRegexEntry) => void;
}) {
  return (
    <div className={styles.referenceView}>
      <header className={styles.referenceIntro}>
        <h3>24 个常用 JavaScript 正则</h3>
        <p>这些表达式适合常见格式处理；涉及业务有效性时，请结合解析、校验或服务端规则。</p>
      </header>
      {COMMON_REGEX_CATEGORIES.map((category) => {
        const entries = COMMON_REGEXES.filter((entry) => entry.category === category.id);
        return (
          <section className={styles.referenceSection} key={category.id} aria-labelledby={`common-${category.id}`}>
            <div className={styles.referenceHeading}>
              <h3 id={`common-${category.id}`}>{category.title}</h3>
              <p>{category.description}</p>
            </div>
            <div className={styles.commonGrid}>
              {entries.map((entry) => (
                <article className={styles.commonCard} key={entry.id}>
                  <header className={styles.commonHeading}>
                    <h4>{entry.title}</h4>
                    <span>{entry.flags.length ? entry.flags.join("") : "无 flags"}</span>
                  </header>
                  <p>{entry.description}</p>
                  <pre className={styles.patternCode}><code>{entry.pattern}</code></pre>
                  <dl className={styles.exampleList}>
                    <div>
                      <dt>匹配示例</dt>
                      <dd>{JSON.stringify(entry.positiveExample)}</dd>
                    </div>
                    <div>
                      <dt>不匹配</dt>
                      <dd>{JSON.stringify(entry.negativeExample)}</dd>
                    </div>
                  </dl>
                  {entry.note ? <p className={styles.referenceNote}>{entry.note}</p> : null}
                  <div className={styles.commonActions}>
                    <CopyButton value={entry.pattern} label={`${entry.title}表达式`} idleText="复制表达式" />
                    <button className="button button-primary" type="button" onClick={() => onLoad(entry)}>
                      载入测试器
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function createFlagState(selectedFlags: readonly RegexFlag[]): RegexFlagState {
  const selected = new Set(selectedFlags);
  return Object.fromEntries(
    REGEX_FLAGS.map((flag) => [flag, selected.has(flag)]),
  ) as RegexFlagState;
}

export default function RegexTool() {
  const [view, setView] = useState<RegexView>("tester");
  const [pattern, setPattern] = useState("");
  const [source, setSource] = useState("");
  const [replacement, setReplacement] = useState("");
  const [flags, setFlags] = useState<RegexFlagState>({
    ...DEFAULT_REGEX_FLAGS,
  });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function clearAll() {
    setPattern("");
    setSource("");
    setReplacement("");
    setFlags({ ...DEFAULT_REGEX_FLAGS });
  }

  function loadCommonRegex(entry: CommonRegexEntry) {
    setPattern(entry.pattern);
    setFlags(createFlagState(entry.flags));
    setSource(entry.positiveExample);
    setReplacement("");
    setView("tester");
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % VIEW_OPTIONS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + VIEW_OPTIONS.length) % VIEW_OPTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = VIEW_OPTIONS.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    setView(VIEW_OPTIONS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={`tool-form ${styles.tool}`}>
      <div className={styles.tabs} role="tablist" aria-label="正则工具页面" aria-orientation="horizontal">
        {VIEW_OPTIONS.map((option, index) => (
          <button
            className={view === option.id ? styles.activeTab : undefined}
            id={`regex-tab-${option.id}`}
            key={option.id}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            aria-controls={`regex-panel-${option.id}`}
            tabIndex={view === option.id ? 0 : -1}
            onClick={() => setView(option.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section
        className={styles.tabPanel}
        id={`regex-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`regex-tab-${view}`}
        tabIndex={0}
      >
        {view === "tester" ? (
          <RegexTester
            pattern={pattern}
            source={source}
            replacement={replacement}
            flags={flags}
            setPattern={setPattern}
            setSource={setSource}
            setReplacement={setReplacement}
            setFlags={setFlags}
            onClear={clearAll}
          />
        ) : view === "syntax" ? (
          <SyntaxReference />
        ) : (
          <CommonRegexReference onLoad={loadCommonRegex} />
        )}
      </section>
    </div>
  );
}
