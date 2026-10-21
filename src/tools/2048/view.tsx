/** @file 2048 的棋盘、分数、局部键盘控制和触屏滑动；业务规则与保存由控制器处理。 */
import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
import { BOARD_SIZE, gameStatus } from "./core";
import type { Direction } from "./core";
import styles from "./styles.module.css";

const keys: Readonly<Record<string, Direction>> = {
  arrowup: "up",
  w: "up",
  arrowright: "right",
  d: "right",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
};
const controls: readonly { direction: Direction; label: string; glyph: string }[] = [
  { direction: "up", label: "向上移动", glyph: "↑" },
  { direction: "left", label: "向左移动", glyph: "←" },
  { direction: "down", label: "向下移动", glyph: "↓" },
  { direction: "right", label: "向右移动", glyph: "→" },
];
const emptyBoard = Array<number>(BOARD_SIZE * BOARD_SIZE).fill(0);

/** 渲染可聚焦的棋盘；输入事件只在当前游戏区域生效，不注册全局键盘监听。 */
export default function Game2048() {
  const ports = useServices();
  const { snapshot, actions } = useController(() => createController(ports));
  const boardRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const game = snapshot.game;
  const board = game?.board ?? emptyBoard;
  const stage = game ? gameStatus(game) : "playing";
  const canPlay = game !== null && stage === "playing";

  /** 恢复棋盘焦点，便于按钮操作后继续使用键盘，不让移除的胜利按钮带走焦点。 */
  function focusBoard() {
    boardRef.current?.focus({ preventScroll: true });
  }
  /** 用户主动重开一局，保留最高分；触屏和键盘随后都可继续控制棋盘。 */
  function restart() {
    actions.restart();
    focusBoard();
  }
  /** 保留组合键与编辑控件的原生行为，只阻止游戏方向键造成页面滚动。 */
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
      )
    )
      return;
    const direction = keys[event.key.toLowerCase()];
    if (!direction || !canPlay) return;
    event.preventDefault();
    actions.move(direction);
  }
  /** 只跟踪单指或触控笔；多指与按钮点击取消手势，避免误触发移动。 */
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    focusBoard();
    if (!event.isPrimary) {
      gesture.current = null;
      return;
    }
    if (event.pointerType === "mouse" || !canPlay) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  /** 以位移更大的轴决定方向，24 像素阈值让轻点和轻微手抖不会移动棋盘。 */
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    actions.move(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up",
    );
  }
  const message = !game
    ? "正在准备棋盘…"
    : stage === "won"
      ? "已合成 2048！可以继续挑战更高分。"
      : stage === "over"
        ? "没有可用的移动，本局游戏结束。"
        : snapshot.gain
          ? `本次合并获得 ${snapshot.gain} 分，当前得分 ${game.score}。`
          : `当前得分 ${game.score}，合并相同数字，向 2048 前进。`;

  return (
    <section
      className={`${uiClasses("tool-form")} ${styles.game}`}
      aria-label="2048 游戏"
      onKeyDown={onKeyDown}
    >
      <div className={styles.layout}>
        <div className={styles.playArea}>
          <div className={styles.toolbar}>
            <dl className={styles.scores} aria-label="游戏分数">
              <div>
                <dt>当前得分</dt>
                <dd>
                  <output aria-label="当前得分" aria-live="off">
                    {game?.score ?? 0}
                  </output>
                </dd>
              </div>
              <div>
                <dt>最高分</dt>
                <dd>
                  <output aria-label="最高分" aria-live="off">
                    {snapshot.bestScore}
                  </output>
                </dd>
              </div>
            </dl>
            <button type="button" className={uiClasses("button button-primary")} onClick={restart}>
              重新开始
            </button>
          </div>
          <div className={styles.boardShell}>
            <div
              ref={boardRef}
              className={styles.board}
              role="grid"
              aria-label="2048 棋盘"
              aria-describedby="game-2048-controls"
              aria-rowcount={BOARD_SIZE}
              aria-colcount={BOARD_SIZE}
              aria-busy={!game}
              tabIndex={0}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                gesture.current = null;
              }}
              onLostPointerCapture={() => {
                gesture.current = null;
              }}
            >
              {Array.from({ length: BOARD_SIZE }, (_, row) => (
                <div className={styles.row} role="row" key={row}>
                  {Array.from({ length: BOARD_SIZE }, (_, column) => {
                    const index = row * BOARD_SIZE + column;
                    const value = board[index] ?? 0;
                    const animation = snapshot.merged.includes(index)
                      ? styles.merged
                      : snapshot.spawned.includes(index)
                        ? styles.spawned
                        : "";
                    return (
                      <div
                        className={styles.cell}
                        role="gridcell"
                        key={index}
                        aria-label={`第 ${row + 1} 行，第 ${column + 1} 列，${value || "空"}`}
                        data-value={value}
                      >
                        {value ? (
                          <span
                            key={`${snapshot.turn}-${index}`}
                            className={`${styles.tile} ${animation} ${value >= 16384 ? styles.smallNumber : value >= 1024 ? styles.longNumber : ""}`}
                            data-value={value}
                          >
                            {value}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {game && stage !== "playing" ? (
              <div
                className={styles.overlay}
                role="group"
                aria-label={stage === "won" ? "游戏胜利" : "游戏结束"}
              >
                <span className={styles.overlayMark} aria-hidden="true">
                  {stage === "won" ? "2048" : "再来一局"}
                </span>
                <strong>{stage === "won" ? "合成成功！" : "游戏结束"}</strong>
                <p>本局得分 {game.score}</p>
                <div className={styles.overlayActions}>
                  {stage === "won" ? (
                    <button
                      type="button"
                      className={uiClasses("button button-primary")}
                      onClick={() => {
                        actions.continuePlaying();
                        focusBoard();
                      }}
                    >
                      继续挑战
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={uiClasses("button button-secondary")}
                    onClick={restart}
                  >
                    再来一局
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <p className="visually-hidden" role="status" aria-live="polite">
            {message}
          </p>
          {snapshot.error ? (
            <p className={styles.warning} role="alert">
              {snapshot.error}
            </p>
          ) : null}
          {snapshot.recoveryMessage ? (
            <p className={styles.note} role="status">
              {snapshot.recoveryMessage}
            </p>
          ) : null}
          {snapshot.storageWarning ? (
            <p className={styles.warning} role="status">
              {snapshot.storageWarning}
            </p>
          ) : null}
        </div>
        {/* 帮助默认收起，保留说明和方向按钮的入口，让棋盘成为主界面的中心。 */}
        <details id="game-2048-help" className={styles.help}>
          <summary>帮助</summary>
          <aside className={styles.guide} aria-label="玩法说明">
            <h2>玩法说明</h2>
            <ol className={styles.rules}>
              <li>
                <span>01</span>
                <div>
                  <strong>向一个方向移动</strong>
                  <p>所有方块会一起滑向棋盘边缘。</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>相同数字，合二为一</strong>
                  <p>2 + 2 变成 4，4 + 4 变成 8。合并的数字会累加到得分。</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>留出空间，继续挑战</strong>
                  <p>有效移动后出现一个新方块。合成 2048 即获胜，也可以继续创造新纪录。</p>
                </div>
              </li>
            </ol>
            <div className={styles.belowBoard}>
              <h2>操作方式</h2>
              <p id="game-2048-controls">
                点击棋盘后按方向键或 WASD，也可以在棋盘上滑动，或使用下方按钮。
              </p>
              <div className={styles.directionPad} role="group" aria-label="移动方向">
                {controls.map(({ direction, label, glyph }) => (
                  <button
                    key={direction}
                    type="button"
                    className={styles.direction}
                    data-direction={direction}
                    aria-label={label}
                    disabled={!canPlay}
                    onClick={() => {
                      actions.move(direction);
                      focusBoard();
                    }}
                  >
                    <span aria-hidden="true">{glyph}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.saveNote}>
              <span className={styles.saveDot} aria-hidden="true" />
              <div>
                <strong>{snapshot.storageWarning ? "当前页面内保留" : "进度自动保存"}</strong>
                <p>
                  {snapshot.storageWarning
                    ? "浏览器存储受限，刷新后可能丢失。"
                    : "棋局和最高分保存在此浏览器，下次打开接着玩。"}
                </p>
              </div>
            </div>
            <p className={styles.credit}>
              参考{" "}
              <a href="https://github.com/gabrielecirulli/2048" target="_blank" rel="noreferrer">
                Gabriele Cirulli / 2048
              </a>
              <br />
              <a
                href={`${import.meta.env.BASE_URL}licenses/2048-MIT.txt`}
                target="_blank"
                rel="noreferrer"
              >
                MIT 开源许可
              </a>
            </p>
          </aside>
        </details>
      </div>
    </section>
  );
}
