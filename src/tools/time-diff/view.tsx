/** @file 展示模式设置、动态输入行、每项间隔和累计结果，处理键盘操作、新增行及清空后的焦点。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 提供连续时刻与独立时间对两种间隔计算模式。 */
import { Fragment, useEffect, useRef, type KeyboardEvent } from "react";
import { formatDuration, formatDurationText, type TimeFormat } from "./core";
import styles from "./styles.module.css";

/** 渲染时间模式、格式设置、逐项差值与累计结果。 */

export default function ToolView() {
  const ports = useServices();
  const { snapshot: model, controller, actions } = useController(() => createController(ports));
  const {
    mode,
    format,
    omitSeparator,
    entries,
    pairs,
    parsedEntries,
    adjacentDifferences,
    parsedPairs,
    pairDifferences,
    totalDifference,
    placeholder,
  } = model;
  const {
    changeMode,
    addEntry,
    addPair,
    updateEntry,
    touchEntry,
    updatePairEntry,
    touchPairEntry,
    changeFormat,
    changeSeparator,
    clearTimes,
    reset,
  } = actions;
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const focusFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );
  /** 等新行完成渲染后读取最新快照并聚焦 position 对应输入，避免焦点落到旧 DOM。 */
  function focusInput(position: "first" | "last") {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      // 新增动作完成后的下一帧读取最新行列表，避免闭包仍使用渲染前的旧输入。
      const current = controller.getSnapshot();
      const index = position === "first" ? 0 : -1;
      const entry =
        current.mode === "continuous" ? current.entries.at(index) : current.pairs.at(index)?.start;
      if (entry) inputRefs.current.get(entry.id)?.focus();
    });
  }
  /** 按 id 登记或移除输入 element，供动态行的键盘焦点恢复使用。 */
  function registerInput(id: string, element: HTMLInputElement | null) {
    if (element) inputRefs.current.set(id, element);
    else inputRefs.current.delete(id);
  }
  /** 在最后一行正向 Tab 时追加输入并聚焦新行，其他按键沿用浏览器行为。 */
  function handleContinuousKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== "Tab" || event.shiftKey || index !== entries.length - 1) {
      return;
    }
    event.preventDefault();
    actions.addEntry();
    focusInput("last");
  }
  /** 在最后一对的结束字段正向 Tab 时新增时间对并聚焦，保持连续键盘录入。 */
  function handlePairKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== "Tab" || event.shiftKey || index !== pairs.length - 1) {
      return;
    }
    event.preventDefault();
    actions.addPair();
    focusInput("last");
  }

  return (
    <div className={uiClasses(`tool-form ${styles.tool}`)}>
      {!model.retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <div className={styles.modeSwitch} role="group" aria-label="计算方式">
        <button
          type="button"
          className={mode === "continuous" ? styles.modeActive : undefined}
          aria-pressed={mode === "continuous"}
          onClick={() => {
            changeMode("continuous");
            focusInput("first");
          }}
        >
          连续
        </button>
        <button
          type="button"
          className={mode === "pairs" ? styles.modeActive : undefined}
          aria-pressed={mode === "pairs"}
          onClick={() => {
            changeMode("pairs");
            focusInput("first");
          }}
        >
          成对
        </button>
      </div>

      <div className={styles.settings} role="group" aria-label="时间输入设置">
        <label className={styles.setting} htmlFor="time-diff-format">
          <span className={uiClasses("field-label")}>时间格式</span>
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
            if (!parsed) return null;
            const error = entry.touched ? parsed.error : "";
            const inputId = `time-diff-input-${entry.id}`;
            const errorId = `${inputId}-error`;
            const difference = adjacentDifferences[index] ?? null;

            return (
              <Fragment key={entry.id}>
                <div className={styles.entry}>
                  <label className={uiClasses("field-label")} htmlFor={inputId}>
                    时间 {index + 1}
                  </label>
                  <input
                    ref={(element) => registerInput(entry.id, element)}
                    id={inputId}
                    className={uiClasses(
                      `tool-input tool-code ${styles.input}${error ? ` ${styles.invalid}` : ""}`,
                    )}
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
                    <span className={uiClasses("visually-hidden")}>
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
            if (!parsed) return null;
            const difference = pairDifferences[index] ?? null;
            const titleId = `time-pair-${pair.id}-title`;
            const startInputId = `time-diff-input-${pair.start.id}`;
            const endInputId = `time-diff-input-${pair.end.id}`;
            const startError = pair.start.touched ? parsed.start.error : "";
            const endError = pair.end.touched ? parsed.end.error : "";
            const startErrorId = `${startInputId}-error`;
            const endErrorId = `${endInputId}-error`;

            return (
              <section className={styles.pair} key={pair.id} aria-labelledby={titleId}>
                <h3 id={titleId}>时间对 {index + 1}</h3>
                <div className={styles.entry}>
                  <label className={uiClasses("field-label")} htmlFor={startInputId}>
                    开始时间
                  </label>
                  <input
                    ref={(element) => registerInput(pair.start.id, element)}
                    id={startInputId}
                    className={uiClasses(
                      `tool-input tool-code ${styles.input}${startError ? ` ${styles.invalid}` : ""}`,
                    )}
                    value={pair.start.raw}
                    onChange={(event) => updatePairEntry(pair.id, "start", event.target.value)}
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
                  <span className={uiClasses("visually-hidden")}>时间对 {index + 1} 的差值：</span>
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
                  <label className={uiClasses("field-label")} htmlFor={endInputId}>
                    结束时间
                  </label>
                  <input
                    ref={(element) => registerInput(pair.end.id, element)}
                    id={endInputId}
                    className={uiClasses(
                      `tool-input tool-code ${styles.input}${endError ? ` ${styles.invalid}` : ""}`,
                    )}
                    value={pair.end.raw}
                    onChange={(event) => updatePairEntry(pair.id, "end", event.target.value)}
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
          <strong>{mode === "continuous" ? "开始到结束总时间差" : "全部时间对总差值"}</strong>
          <small>
            {mode === "continuous" ? "按上方所有相邻差值累计" : "按每组独立计算出的差值累计"}
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

      <div className={uiClasses(`tool-actions ${styles.actions}`)}>
        <button
          className={uiClasses("button button-primary")}
          type="button"
          onClick={() => {
            if (mode === "continuous") addEntry();
            else addPair();
            focusInput("last");
          }}
        >
          {mode === "continuous" ? "添加时间" : "添加时间对"}
        </button>
        <div className={styles.utilityActions}>
          <button
            className={uiClasses("button button-secondary")}
            type="button"
            onClick={() => {
              clearTimes();
              focusInput("first");
            }}
          >
            清空时间
          </button>
          <button
            className={uiClasses("button button-secondary")}
            type="button"
            onClick={() => {
              reset();
              focusInput("first");
            }}
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
