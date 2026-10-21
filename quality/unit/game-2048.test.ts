/** @file 验证 2048 的移动、随机生成、胜负、存档边界及控制器的幂等生命周期。 */
import { describe, expect, it, vi } from "vitest";
import { createDraftStore } from "../../src/adapters/drafts";
import { createPersistentStore } from "../../src/adapters/storage";
import { createTaskExecutor } from "../../src/adapters/tasks";
import { createController } from "../../src/tools/2048/controller";
import {
  addRandomTile,
  createGame,
  gameStatus,
  moveGame,
  movesAvailable,
  restoreGame,
  SAVE_KEY,
  slideBoard,
} from "../../src/tools/2048/core";
import type { Direction, GameState } from "../../src/tools/2048/core";

/** 以一行固定数字构造棋盘，剩余行留空，让预期结果不依赖随机数。 */
function board(row: readonly number[]): number[] {
  return [...row, ...Array<number>(16 - row.length).fill(0)];
}
/** 生成可恢复的基本棋局，允许用局部字段描述胜利或满盘等真实场景。 */
function game(patch: Partial<GameState> = {}): GameState {
  return { board: board([2, 2]), score: 0, won: false, keepPlaying: false, ...patch };
}
/** 明确断言应当存在的棋局，失败时给出可定位的测试错误。 */
function currentGame(value: GameState | null): GameState {
  if (!value) throw new Error("预期棋局已初始化。");
  return value;
}
/** 组装可观察的存储与随机能力；blocked 模拟浏览器拒绝访问，而非改写算法结果。 */
function environment(saved?: unknown, blocked = false) {
  const values = new Map<string, string>();
  if (saved !== undefined) values.set(SAVE_KEY, JSON.stringify(saved));
  const access = { blocked };
  const native = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
  const logger = { emit: vi.fn(), diagnostics: () => "" };
  const storage = createPersistentStore(() => {
    if (access.blocked) throw new Error("blocked");
    return native;
  }, logger);
  const ports = {
    logger,
    storage,
    random: { index: vi.fn(() => 0) },
    drafts: createDraftStore(),
    tasks: createTaskExecutor({}, logger, { now: () => 0, monotonic: () => 0 }),
  };
  return { ports, values, native, access, controller: createController(ports) };
}

describe("2048 core", () => {
  /** 同一行多个合并互不干扰，合并结果不能在该回合再次合并。 */
  it.each([
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[4, 4, 8, 8], [8, 16, 0, 0], 24],
    [[0, 2, 0, 2], [4, 0, 0, 0], 4],
    [[2, 2, 2, 0], [4, 2, 0, 0], 4],
    [[2, 4, 8, 16], [2, 4, 8, 16], 0],
  ])("merges %j into %j for %i points", (input, output, gain) => {
    const source = board(input as number[]);
    const original = [...source];
    const moved = slideBoard(source, "left");
    expect(moved.board.slice(0, 4)).toEqual(output);
    expect(moved.gain).toBe(gain);
    expect(source).toEqual(original);
  });

  /** 从对应边缘压紧，横向与纵向方向具有相同的合并语义。 */
  it.each<[Direction, number[], number]>([
    ["left", board([2, 0, 2]), 0],
    ["right", board([2, 0, 2]), 3],
    ["up", board([2, 0, 0, 0, 0, 0, 0, 0, 2]), 0],
    ["down", board([2, 0, 0, 0, 0, 0, 0, 0, 2]), 12],
  ])("moves and merges toward %s", (direction, source, destination) => {
    const moved = slideBoard(source, direction);
    expect(moved.board[destination]).toBe(4);
    expect(moved.board.filter(Boolean)).toEqual([4]);
    expect(moved.merged).toEqual([destination]);
  });

  /** 固定随机索引验证初始块数量、两个位置不重复及 2/4 的概率边界。 */
  it("creates two tiles and uses the 9:1 value boundary and empty-cell index", () => {
    const random = { index: vi.fn<(max: number) => number>(() => 0) };
    expect(createGame(random)).toEqual(game());
    expect(random.index.mock.calls.map((call) => call[0])).toEqual([10, 16, 10, 15]);
    for (const [valueIndex, expected] of [
      [0, 2],
      [8, 2],
      [9, 4],
    ]) {
      const index = vi.fn().mockReturnValueOnce(valueIndex).mockReturnValueOnce(14);
      const added = addRandomTile(board([2]), { index });
      expect(added.board[15]).toBe(expected);
      expect(added.spawned).toEqual([15]);
      expect(index).toHaveBeenNthCalledWith(2, 15);
    }
  });

  /** 无效移动、满盘以及暂停状态都不能消耗随机源。 */
  it("does not spawn or consume randomness for ineffective or terminated moves", () => {
    const random = { index: vi.fn(() => 0) };
    const source = game({ board: board([2, 4]) });
    expect(moveGame(source, "left", random).game).toBe(source);
    expect(moveGame(game({ board: board([2048, 2]), won: true }), "right", random).changed).toBe(
      false,
    );
    const full = [2, 4, 8, 16, 16, 8, 4, 2, 2, 4, 8, 16, 16, 8, 4, 2];
    expect(movesAvailable(full)).toBe(false);
    expect(gameStatus(game({ board: full }))).toBe("over");
    expect(moveGame(game({ board: full }), "down", random).changed).toBe(false);
    expect(addRandomTile(full, random).board).toBe(full);
    expect(random.index).not.toHaveBeenCalled();
    expect(movesAvailable([...full.slice(0, -1), 0])).toBe(true);
    expect(movesAvailable([2, ...full.slice(1, 4), 2, ...full.slice(5)])).toBe(true);
  });

  /** 达成 2048 后暂停；继续挑战保持获胜标志，但不会再次弹出胜利状态。 */
  it("awards merge points, spawns once, and allows play beyond 2048", () => {
    const random = { index: vi.fn(() => 0) };
    const moved = moveGame(game({ board: board([1024, 1024]), score: 100 }), "left", random);
    expect(moved.game.score).toBe(2148);
    expect(moved.game.board.slice(0, 2)).toEqual([2048, 2]);
    expect(moved.merged).toEqual([0]);
    expect(moved.spawned).toEqual([1]);
    expect(random.index).toHaveBeenCalledTimes(2);
    expect(gameStatus(moved.game)).toBe("won");
    const continued = { ...moved.game, keepPlaying: true };
    expect(gameStatus(continued)).toBe("playing");
    expect(moveGame(continued, "right", random).game.keepPlaying).toBe(true);
  });

  /** 极端数值必须明确拒绝，不能把溢出或失去精度的结果写入存档。 */
  it("rejects unsafe tile and score arithmetic", () => {
    expect(() => slideBoard(board([2 ** 52, 2 ** 52]), "left")).toThrow();
    expect(() =>
      moveGame(game({ score: Number.MAX_SAFE_INTEGER }), "left", { index: () => 0 }),
    ).toThrow();
  });
});

describe("2048 saved games", () => {
  /** 数据损坏只重建当前局；独立合法的最高分仍可恢复。 */
  it.each([
    { board: board([3, 2]) },
    { board: board([1, 2]) },
    { board: [2, 2] },
    { board: board([2]) },
    { board: board([2 ** 52 - 1, 2]) },
    { score: -1 },
    { score: 0.5 },
    { won: true },
    { keepPlaying: true },
    { version: 2 },
    { board: board([2048, 2]), won: false },
  ])("discards an invalid game %j without discarding its best score", (patch) => {
    expect(restoreGame({ version: 1, ...game(), bestScore: 4096, ...patch })).toEqual({
      game: null,
      bestScore: 4096,
      invalid: true,
    });
  });

  /** 恢复结果是独立数据，且最高分不能低于当前有效棋局的得分。 */
  it("copies valid and continued boards and normalizes the best score", () => {
    const source = {
      version: 1,
      ...game({ board: board([2048, 2]), score: 2048, won: true, keepPlaying: true }),
      bestScore: -1,
    };
    const restored = restoreGame(source);
    expect(restored.bestScore).toBe(2048);
    expect(restored.invalid).toBe(false);
    expect(gameStatus(currentGame(restored.game))).toBe("playing");
    source.board = board([4, 4]);
    expect(restored.game?.board[0]).toBe(2048);
    expect(restoreGame(null)).toEqual({ game: null, bestScore: 0, invalid: false });
    expect(restoreGame("bad").invalid).toBe(true);
  });
});

describe("2048 controller", () => {
  /** 创建阶段纯净；重复激活、释放后再激活均不重复生成初始块。 */
  it("initializes after activation and restores across StrictMode lifecycle replay", () => {
    const env = environment();
    const drafts = vi.spyOn(env.ports.drafts, "set");
    const tasks = vi.spyOn(env.ports.tasks, "run");
    const controller = env.controller;
    expect(env.native.getItem).not.toHaveBeenCalled();
    expect(env.ports.random.index).not.toHaveBeenCalled();
    expect(controller.getSnapshot().game).toBeNull();
    controller.actions.restart();
    expect(env.ports.random.index).not.toHaveBeenCalled();
    controller.activate();
    const original = controller.getSnapshot();
    controller.activate();
    expect(controller.getSnapshot()).toBe(original);
    expect(env.ports.random.index).toHaveBeenCalledTimes(4);
    controller.dispose();
    controller.dispose();
    controller.activate();
    expect(controller.getSnapshot().game).toEqual(original.game);
    expect(env.ports.random.index).toHaveBeenCalledTimes(4);
    expect(drafts).not.toHaveBeenCalled();
    expect(tasks).not.toHaveBeenCalled();
  });

  /** 稳定动作访问最新棋局；快照冻结，未改变的操作不重复发布或写入。 */
  it("keeps snapshots immutable and saves only effective operations", () => {
    const env = environment();
    env.controller.activate();
    const move = env.controller.actions.move;
    const old = env.controller.getSnapshot();
    expect(Object.isFrozen(old.game?.board)).toBe(true);
    expect(() => {
      (currentGame(old.game).board as number[])[0] = 99;
    }).toThrow();
    move("left");
    expect(env.controller.actions.move).toBe(move);
    expect(old.game?.score).toBe(0);
    expect(env.controller.getSnapshot().game?.score).toBe(4);
    const latest = env.controller.getSnapshot();
    const calls = env.native.setItem.mock.calls.length;
    move("left");
    expect(env.controller.getSnapshot()).toBe(latest);
    expect(env.native.setItem).toHaveBeenCalledTimes(calls);
    expect(JSON.parse(env.values.get(SAVE_KEY) ?? "null")).toEqual({
      version: 1,
      ...latest.game,
      bestScore: 4,
      soundEnabled: true,
    });
    env.controller.actions.restart();
    expect(env.controller.getSnapshot().game?.score).toBe(0);
    expect(env.controller.getSnapshot().bestScore).toBe(4);
    env.controller.dispose();
    const disposed = env.controller.getSnapshot();
    move("right");
    expect(env.controller.getSnapshot()).toBe(disposed);
  });

  /** 获胜、继续与结束棋局都恢复原状态，重新开始仅重置本局。 */
  it("persists victory, continued play, finished games, and best scores", () => {
    const env = environment({
      version: 1,
      ...game({ board: board([1024, 1024]) }),
      bestScore: 4096,
    });
    env.controller.activate();
    env.controller.actions.move("left");
    expect(gameStatus(currentGame(env.controller.getSnapshot().game))).toBe("won");
    env.controller.actions.continuePlaying();
    const next = createController(env.ports);
    next.activate();
    expect(gameStatus(currentGame(next.getSnapshot().game))).toBe("playing");
    expect(next.getSnapshot().game?.keepPlaying).toBe(true);
    next.actions.restart();
    expect(next.getSnapshot().bestScore).toBe(4096);
    const ended = environment({
      version: 1,
      ...game({ board: [2, 4, 8, 16, 16, 8, 4, 2, 2, 4, 8, 16, 16, 8, 4, 2] }),
      bestScore: 64,
    });
    ended.controller.activate();
    expect(gameStatus(currentGame(ended.controller.getSnapshot().game))).toBe("over");
    expect(ended.ports.random.index).not.toHaveBeenCalled();
  });

  /** 新设置兼容旧存档；独立校验偏好，即使棋局损坏也能保留已关闭的声音。 */
  it.each([undefined, true, false, "false"])(
    "restores sound preference %j safely",
    (soundEnabled) => {
      const env = environment({ version: 1, ...game(), soundEnabled });
      env.controller.activate();
      expect(env.controller.getSnapshot().soundEnabled).toBe(soundEnabled !== false);
      const damaged = environment({ version: 1, board: [3], soundEnabled: false });
      damaged.controller.activate();
      expect(damaged.controller.getSnapshot().soundEnabled).toBe(false);
    },
  );

  /** 静音立即保存且不移动棋盘，后续移动、重开、继续和生命周期重放均不能重置偏好。 */
  it("persists mute without changing play and retains it across all game actions", () => {
    const env = environment({ version: 1, ...game({ board: board([1024, 1024]) }) });
    env.controller.activate();
    const before = env.controller.getSnapshot();
    env.controller.actions.toggleSound();
    expect(env.controller.getSnapshot()).toMatchObject({
      game: before.game,
      bestScore: before.bestScore,
      turn: before.turn,
      soundEnabled: false,
    });
    expect(env.ports.random.index).not.toHaveBeenCalled();
    expect(JSON.parse(env.values.get(SAVE_KEY) ?? "null").soundEnabled).toBe(false);
    env.controller.actions.move("left");
    env.controller.actions.continuePlaying();
    expect(env.controller.getSnapshot().soundEnabled).toBe(false);
    env.controller.actions.restart();
    env.controller.dispose();
    env.controller.actions.toggleSound();
    env.controller.activate();
    expect(env.controller.getSnapshot().soundEnabled).toBe(false);
    env.controller.actions.toggleSound();
    expect(env.controller.getSnapshot().soundEnabled).toBe(true);
  });

  /** 持久化被拒绝时仍能操作并在站内恢复；之后写入成功会解除提示。 */
  it("recovers damaged games and falls back to page memory when storage is blocked", () => {
    const damaged = environment({ version: 1, board: [3], bestScore: 256 });
    damaged.controller.activate();
    expect(damaged.controller.getSnapshot().bestScore).toBe(256);
    expect(damaged.controller.getSnapshot().recoveryMessage).toContain("无效");
    const env = environment(undefined, true);
    env.controller.activate();
    env.controller.actions.move("left");
    expect(env.controller.getSnapshot().storageWarning).toContain("刷新");
    const next = createController(env.ports);
    next.activate();
    expect(next.getSnapshot().game?.score).toBe(4);
    expect(env.ports.logger.emit).toHaveBeenCalledTimes(1);
    env.access.blocked = false;
    next.actions.restart();
    expect(next.getSnapshot().storageWarning).toBe("");
    expect(JSON.parse(env.values.get(SAVE_KEY) ?? "null").bestScore).toBe(4);
  });
});
