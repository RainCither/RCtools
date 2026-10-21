/**
 * @file 2048 的不可变棋盘、移动、计分与存档校验。
 * 参考 Gabriele Cirulli 的 2048（MIT）：https://github.com/gabrielecirulli/2048。
 * 原作 Copyright (c) 2014 Gabriele Cirulli，完整许可随站点的 licenses/2048-MIT.txt 发布。
 */
import type { RandomPort } from "../../contracts/ports";
import { failure } from "../../contracts/result";

export const BOARD_SIZE = 4;
export const SAVE_KEY = "toolbox:2048:v1";
/** 棋盘按行排列，0 表示空格；移动方向独立于键盘或触屏事件。 */
export type Direction = "up" | "right" | "down" | "left";
/** 只包含可保存的游戏数据；游戏结束由当前棋盘派生，避免存档状态互相矛盾。 */
export type GameState = Readonly<{
  board: readonly number[];
  score: number;
  won: boolean;
  keepPlaying: boolean;
}>;
/** 移动结果携带展示所需的位置，动画不参与规则或持久存档。 */
export type GameMove = Readonly<{
  game: GameState;
  changed: boolean;
  gain: number;
  merged: readonly number[];
  spawned: readonly number[];
}>;

/** 依移动方向从靠近目标的一侧访问第 line 条行或列，统一四个方向的合并规则。 */
function cellIndex(line: number, offset: number, direction: Direction): number {
  switch (direction) {
    case "left":
      return line * BOARD_SIZE + offset;
    case "right":
      return line * BOARD_SIZE + BOARD_SIZE - 1 - offset;
    case "up":
      return offset * BOARD_SIZE + line;
    case "down":
      return (BOARD_SIZE - 1 - offset) * BOARD_SIZE + line;
  }
}

/** 压紧并合并棋盘，返回新棋盘与加分；不生成随机块，便于独立验证移动规则。 */
export function slideBoard(board: readonly number[], direction: Direction) {
  const next = Array<number>(BOARD_SIZE * BOARD_SIZE).fill(0);
  const merged: number[] = [];
  let gain = 0;
  for (let line = 0; line < BOARD_SIZE; line++) {
    const values = Array.from(
      { length: BOARD_SIZE },
      (_, offset) => board[cellIndex(line, offset, direction)] ?? 0,
    ).filter((value) => value !== 0);
    let output = 0;
    for (let input = 0; input < values.length; input++) {
      let value = values[input] ?? 0;
      const index = cellIndex(line, output++, direction);
      if (value === values[input + 1]) {
        // 合并后跳过原来的两个方块，结果不会在同一回合再次参与合并。
        value *= 2;
        gain += value;
        merged.push(index);
        input++;
        if (!Number.isSafeInteger(value) || !Number.isSafeInteger(gain))
          throw failure("execution", "2048.range", "棋局数值超出精确计算范围，请重新开始。");
      }
      next[index] = value;
    }
  }
  return {
    board: next,
    gain,
    merged,
    changed: next.some((value, index) => value !== board[index]),
  };
}

/** 在空格均匀抽取位置，按 9:1 生成 2 或 4；满盘不消耗随机数，也不修改原棋盘。 */
export function addRandomTile(board: readonly number[], random: RandomPort) {
  const empty = board.flatMap((value, index) => (value === 0 ? [index] : []));
  if (!empty.length) return { board, spawned: [] as number[] };
  const value = random.index(10) < 9 ? 2 : 4;
  const index = empty[random.index(empty.length)];
  if (index === undefined) throw failure("execution", "2048.random", "随机生成失败，请重新开始。");
  const next = [...board];
  next[index] = value;
  return { board: next, spawned: [index] };
}

/** 创建零分新局；只有激活或用户重新开始时调用，避免渲染期间消耗随机数。 */
export function createGame(random: RandomPort): GameState {
  let board: readonly number[] = Array<number>(BOARD_SIZE * BOARD_SIZE).fill(0);
  for (let index = 0; index < 2; index++) board = addRandomTile(board, random).board;
  return { board, score: 0, won: false, keepPlaying: false };
}

/** 存在空格或水平、垂直相邻的相同数字时，仍有合法移动。 */
export function movesAvailable(board: readonly number[]): boolean {
  return board.some(
    (value, index) =>
      value === 0 ||
      (index % BOARD_SIZE < BOARD_SIZE - 1 && value === board[index + 1]) ||
      value === board[index + BOARD_SIZE],
  );
}

/** 首次达成目标优先展示胜利；选择继续后再判断是否已没有合法移动。 */
export function gameStatus(game: GameState): "playing" | "won" | "over" {
  if (game.won && !game.keepPlaying) return "won";
  return movesAvailable(game.board) ? "playing" : "over";
}

/** 应用一次完整移动；暂停、结束或无效移动保持原状态，且不抽取随机数。 */
export function moveGame(game: GameState, direction: Direction, random: RandomPort): GameMove {
  const unchanged = { game, changed: false, gain: 0, merged: [], spawned: [] };
  if (gameStatus(game) !== "playing") return unchanged;
  const moved = slideBoard(game.board, direction);
  if (!moved.changed) return unchanged;
  const score = game.score + moved.gain;
  if (!Number.isSafeInteger(score))
    throw failure("execution", "2048.range", "棋局得分超出精确计算范围，请重新开始。");
  const spawned = addRandomTile(moved.board, random);
  return {
    game: {
      board: spawned.board,
      score,
      won: game.won || moved.board.some((value) => value >= 2048),
      keepPlaying: game.keepPlaying,
    },
    changed: true,
    gain: moved.gain,
    merged: moved.merged,
    spawned: spawned.spawned,
  };
}

/** 验证分数可精确表示，避免损坏存档把 NaN、负数或无穷大传给界面。 */
function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** 校验未知存档，复制有效棋局；棋局损坏时仍独立保留合法最高分。 */
export function restoreGame(value: unknown): {
  game: GameState | null;
  bestScore: number;
  invalid: boolean;
} {
  const empty = { game: null, bestScore: 0, invalid: value !== null };
  if (typeof value !== "object" || value === null) return empty;
  const saved = value as Record<string, unknown>;
  const bestScore = isScore(saved.bestScore) ? saved.bestScore : 0;
  const board = saved.board;
  if (
    saved.version !== 1 ||
    !Array.isArray(board) ||
    board.length !== BOARD_SIZE * BOARD_SIZE ||
    !board.every(
      (tile: unknown) =>
        typeof tile === "number" &&
        (tile === 0 ||
          (tile >= 2 && Number.isSafeInteger(tile) && 2 ** Math.round(Math.log2(tile)) === tile)),
    ) ||
    board.filter((tile) => tile > 0).length < 2 ||
    !isScore(saved.score) ||
    typeof saved.won !== "boolean" ||
    typeof saved.keepPlaying !== "boolean" ||
    (saved.keepPlaying && !saved.won) ||
    saved.won !== board.some((tile) => tile >= 2048)
  )
    return { game: null, bestScore, invalid: true };
  return {
    game: { board: [...board], score: saved.score, won: saved.won, keepPlaying: saved.keepPlaying },
    bestScore: Math.max(bestScore, saved.score),
    invalid: false,
  };
}
