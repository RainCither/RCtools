"use client";

import { Fragment, useRef, useState, type KeyboardEvent } from "react";
import {
  calculateAdjacentDifference,
  formatClockTime,
  formatDuration,
  formatDurationText,
  parseTimeInput,
  sumCalculatedDifferences,
  type TimeFormat,
} from "./time-diff-core";
import styles from "./styles.module.css";

type TimeDiffMode = "continuous" | "pairs";
type PairSide = "start" | "end";

type TimeEntry = {
  id: string;
  raw: string;
  touched: boolean;
};

type TimePair = {
  id: number;
  start: TimeEntry;
  end: TimeEntry;
};

function createEntry(id: string): TimeEntry {
  return { id, raw: "", touched: false };
}

function freshContinuousEntries() {
  return [createEntry("continuous-1"), createEntry("continuous-2")];
}

function createPair(id: number): TimePair {
  return {
    id,
    start: createEntry(`pair-${id}-start`),
    end: createEntry(`pair-${id}-end`),
  };
}

function freshPairs() {
  return [createPair(1)];
}

export default function TimeDiffTool() {
  const [mode, setMode] = useState<TimeDiffMode>("continuous");
  const [format, setFormat] = useState<TimeFormat>("HH:mm");
  const [omitSeparator, setOmitSeparator] = useState(false);
  const [entries, setEntries] = useState<TimeEntry[]>(freshContinuousEntries);
  const [pairs, setPairs] = useState<TimePair[]>(freshPairs);
  const nextEntryIdRef = useRef(3);
  const nextPairIdRef = useRef(2);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  const parsedEntries = entries.map((entry) =>
    parseTimeInput(entry.raw, format, omitSeparator),
  );
  const adjacentDifferences = parsedEntries.slice(0, -1).map((parsed, index) =>
    calculateAdjacentDifference(parsed.seconds, parsedEntries[index + 1].seconds),
  );
  const continuousTotalDifference = sumCalculatedDifferences(adjacentDifferences);

  const parsedPairs = pairs.map((pair) => ({
    start: parseTimeInput(pair.start.raw, format, omitSeparator),
    end: parseTimeInput(pair.end.raw, format, omitSeparator),
  }));
  const pairDifferences = parsedPairs.map((pair) =>
    calculateAdjacentDifference(pair.start.seconds, pair.end.seconds),
  );
  const pairTotalDifference = sumCalculatedDifferences(pairDifferences);

  const totalDifference = mode === "continuous"
    ? continuousTotalDifference
    : pairTotalDifference;
  const placeholder = omitSeparator
    ? format === "HH:mm:ss" ? "例如：093015" : "例如：0930"
    : format === "HH:mm:ss" ? "例如：09:30:15" : "例如：09:30";

  function focusEntry(id: string) {
    window.requestAnimationFrame(() => {
      inputRefs.current.get(id)?.focus();
    });
  }

  function registerInput(id: string, element: HTMLInputElement | null) {
    if (element) inputRefs.current.set(id, element);
    else inputRefs.current.delete(id);
  }

  function changeMode(nextMode: TimeDiffMode) {
    setMode(nextMode);
    const firstId = nextMode === "continuous"
      ? entries[0]?.id
      : pairs[0]?.start.id;
    if (firstId) focusEntry(firstId);
  }

  function addEntry() {
    const number = nextEntryIdRef.current;
    nextEntryIdRef.current += 1;
    const entry = createEntry(`continuous-${number}`);
    setEntries((current) => [...current, entry]);
    focusEntry(entry.id);
  }

  function addPair() {
    const id = nextPairIdRef.current;
    nextPairIdRef.current += 1;
    const pair = createPair(id);
    setPairs((current) => [...current, pair]);
    focusEntry(pair.start.id);
  }

  function updateEntry(id: string, raw: string) {
    setEntries((current) =>
      current.map((entry) => entry.id === id ? { ...entry, raw } : entry),
    );
  }

  function touchEntry(id: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, touched: true } : entry,
      ),
    );
  }

  function updatePairEntry(pairId: number, side: PairSide, raw: string) {
    setPairs((current) =>
      current.map((pair) => {
        if (pair.id !== pairId) return pair;
        return { ...pair, [side]: { ...pair[side], raw } };
      }),
    );
  }

  function touchPairEntry(pairId: number, side: PairSide) {
    setPairs((current) =>
      current.map((pair) => {
        if (pair.id !== pairId) return pair;
        return { ...pair, [side]: { ...pair[side], touched: true } };
      }),
    );
  }

  function reformatEntry(
    entry: TimeEntry,
    nextFormat: TimeFormat,
    nextOmitSeparator: boolean,
  ): TimeEntry {
    const parsed = parseTimeInput(entry.raw, format, omitSeparator);
    return {
      ...entry,
      raw: parsed.seconds === null
        ? ""
        : formatClockTime(parsed.seconds, nextFormat, nextOmitSeparator),
      touched: false,
    };
  }

  function reformatAllEntries(
    nextFormat: TimeFormat,
    nextOmitSeparator: boolean,
  ) {
    setEntries((current) =>
      current.map((entry) =>
        reformatEntry(entry, nextFormat, nextOmitSeparator),
      ),
    );
    setPairs((current) =>
      current.map((pair) => ({
        ...pair,
        start: reformatEntry(pair.start, nextFormat, nextOmitSeparator),
        end: reformatEntry(pair.end, nextFormat, nextOmitSeparator),
      })),
    );
  }

  function changeFormat(nextFormat: TimeFormat) {
    reformatAllEntries(nextFormat, omitSeparator);
    setFormat(nextFormat);
  }

  function changeSeparator(nextOmitSeparator: boolean) {
    reformatAllEntries(format, nextOmitSeparator);
    setOmitSeparator(nextOmitSeparator);
  }

  function clearTimes() {
    if (mode === "continuous") {
      setEntries((current) =>
        current.map((entry) => ({ ...entry, raw: "", touched: false })),
      );
      const firstId = entries[0]?.id;
      if (firstId) focusEntry(firstId);
      return;
    }

    setPairs((current) =>
      current.map((pair) => ({
        ...pair,
        start: { ...pair.start, raw: "", touched: false },
        end: { ...pair.end, raw: "", touched: false },
      })),
    );
    const firstId = pairs[0]?.start.id;
    if (firstId) focusEntry(firstId);
  }

  function reset() {
    nextEntryIdRef.current = 3;
    nextPairIdRef.current = 2;
    setMode("continuous");
    setFormat("HH:mm");
    setOmitSeparator(false);
    setEntries(freshContinuousEntries());
    setPairs(freshPairs());
    focusEntry("continuous-1");
  }

  function handleContinuousKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key !== "Tab" || event.shiftKey || index !== entries.length - 1) {
      return;
    }
    event.preventDefault();
    addEntry();
  }

  function handlePairKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key !== "Tab" || event.shiftKey || index !== pairs.length - 1) {
      return;
    }
    event.preventDefault();
    addPair();
  }

  return (
    <div className={`tool-form ${styles.tool}`}>
      <div className={styles.modeSwitch} role="group" aria-label="计算方式">
        <button
          type="button"
          className={mode === "continuous" ? styles.modeActive : undefined}
          aria-pressed={mode === "continuous"}
          onClick={() => changeMode("continuous")}
        >
          连续
        </button>
        <button
          type="button"
          className={mode === "pairs" ? styles.modeActive : undefined}
          aria-pressed={mode === "pairs"}
          onClick={() => changeMode("pairs")}
        >
          成对
        </button>
      </div>

      <div className={styles.settings} role="group" aria-label="时间输入设置">
        <label className={styles.setting} htmlFor="time-diff-format">
          <span className="field-label">时间格式</span>
          <select
            id="time-diff-format"
            className={styles.select}
            value={format}
            onChange={(event) => changeFormat(event.target.value as TimeFormat)}
          >
            <option value="HH:mm">HH:mm</option>
            <option value="HH:mm:ss">HH:mm:ss</option>
          </select>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={omitSeparator}
            onChange={(event) => changeSeparator(event.target.checked)}
          />
          <span>
            <strong>省略冒号</strong>
            <small>使用纯数字连续输入</small>
          </span>
        </label>
      </div>

      <p className={styles.help} id="time-diff-help">
        {mode === "continuous"
          ? "输入后会即时计算；在最后一格按 Tab 可继续添加下一项。"
          : "每组开始和结束时间独立计算；在最后一组结束时间按 Tab 可添加下一组。"}
      </p>

      {mode === "continuous" ? (
        <div className={styles.list}>
          {entries.map((entry, index) => {
            const parsed = parsedEntries[index];
            const error = entry.touched ? parsed.error : "";
            const inputId = `time-diff-input-${entry.id}`;
            const errorId = `${inputId}-error`;
            const difference = adjacentDifferences[index] ?? null;

            return (
              <Fragment key={entry.id}>
                <div className={styles.entry}>
                  <label className="field-label" htmlFor={inputId}>
                    时间 {index + 1}
                  </label>
                  <input
                    ref={(element) => registerInput(entry.id, element)}
                    id={inputId}
                    className={`tool-input tool-code ${styles.input}${error ? ` ${styles.invalid}` : ""}`}
                    value={entry.raw}
                    onChange={(event) => updateEntry(entry.id, event.target.value)}
                    onBlur={() => touchEntry(entry.id)}
                    onKeyDown={(event) => handleContinuousKeyDown(event, index)}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={placeholder}
                    aria-describedby={error ? errorId : "time-diff-help"}
                    aria-invalid={Boolean(error)}
                  />
                  {error ? (
                    <p className={styles.error} id={errorId} role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>

                {index < entries.length - 1 ? (
                  <output className={styles.result} aria-live="polite">
                    <span className="visually-hidden">
                      时间 {index + 1} 到时间 {index + 2} 的差值：
                    </span>
                    {difference === null ? (
                      <span className={styles.waiting}>— 等待相邻时间</span>
                    ) : (
                      <>
                        <strong>{formatDuration(difference, format)}</strong>
                        <span>· {formatDurationText(difference, format)}</span>
                      </>
                    )}
                  </output>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      ) : (
        <div className={styles.pairList}>
          {pairs.map((pair, index) => {
            const parsed = parsedPairs[index];
            const difference = pairDifferences[index];
            const titleId = `time-pair-${pair.id}-title`;
            const startInputId = `time-diff-input-${pair.start.id}`;
            const endInputId = `time-diff-input-${pair.end.id}`;
            const startError = pair.start.touched ? parsed.start.error : "";
            const endError = pair.end.touched ? parsed.end.error : "";
            const startErrorId = `${startInputId}-error`;
            const endErrorId = `${endInputId}-error`;

            return (
              <section
                className={styles.pair}
                key={pair.id}
                aria-labelledby={titleId}
              >
                <h3 id={titleId}>时间对 {index + 1}</h3>
                <div className={styles.entry}>
                  <label className="field-label" htmlFor={startInputId}>
                    开始时间
                  </label>
                  <input
                    ref={(element) => registerInput(pair.start.id, element)}
                    id={startInputId}
                    className={`tool-input tool-code ${styles.input}${startError ? ` ${styles.invalid}` : ""}`}
                    value={pair.start.raw}
                    onChange={(event) =>
                      updatePairEntry(pair.id, "start", event.target.value)}
                    onBlur={() => touchPairEntry(pair.id, "start")}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={placeholder}
                    aria-label={`时间对 ${index + 1} 开始时间`}
                    aria-describedby={startError ? startErrorId : "time-diff-help"}
                    aria-invalid={Boolean(startError)}
                  />
                  {startError ? (
                    <p className={styles.error} id={startErrorId} role="alert">
                      {startError}
                    </p>
                  ) : null}
                </div>

                <output className={styles.result} aria-live="polite">
                  <span className="visually-hidden">
                    时间对 {index + 1} 的差值：
                  </span>
                  {difference === null ? (
                    <span className={styles.waiting}>— 等待开始和结束时间</span>
                  ) : (
                    <>
                      <strong>{formatDuration(difference, format)}</strong>
                      <span>· {formatDurationText(difference, format)}</span>
                    </>
                  )}
                </output>

                <div className={styles.entry}>
                  <label className="field-label" htmlFor={endInputId}>
                    结束时间
                  </label>
                  <input
                    ref={(element) => registerInput(pair.end.id, element)}
                    id={endInputId}
                    className={`tool-input tool-code ${styles.input}${endError ? ` ${styles.invalid}` : ""}`}
                    value={pair.end.raw}
                    onChange={(event) =>
                      updatePairEntry(pair.id, "end", event.target.value)}
                    onBlur={() => touchPairEntry(pair.id, "end")}
                    onKeyDown={(event) => handlePairKeyDown(event, index)}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={placeholder}
                    aria-label={`时间对 ${index + 1} 结束时间`}
                    aria-describedby={endError ? endErrorId : "time-diff-help"}
                    aria-invalid={Boolean(endError)}
                  />
                  {endError ? (
                    <p className={styles.error} id={endErrorId} role="alert">
                      {endError}
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <output className={styles.total} aria-live="polite">
        <span className={styles.totalCopy}>
          <strong>
            {mode === "continuous" ? "开始到结束总时间差" : "全部时间对总差值"}
          </strong>
          <small>
            {mode === "continuous"
              ? "按上方所有相邻差值累计"
              : "按每组独立计算出的差值累计"}
          </small>
        </span>
        {totalDifference === null ? (
          <span className={styles.totalWaiting}>
            {mode === "continuous" ? "— 等待所有时间" : "— 等待所有时间对"}
          </span>
        ) : (
          <span className={styles.totalValue}>
            <strong>{formatDuration(totalDifference, format)}</strong>
            <span>· {formatDurationText(totalDifference, format)}</span>
          </span>
        )}
      </output>

      <div className={`tool-actions ${styles.actions}`}>
        <button
          className="button button-primary"
          type="button"
          onClick={mode === "continuous" ? addEntry : addPair}
        >
          {mode === "continuous" ? "添加时间" : "添加时间对"}
        </button>
        <div className={styles.utilityActions}>
          <button className="button button-secondary" type="button" onClick={clearTimes}>
            清空时间
          </button>
          <button className="button button-secondary" type="button" onClick={reset}>
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
