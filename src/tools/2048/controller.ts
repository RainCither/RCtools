/** @file 管理 2048 动作与独立存档，复用模型控制器的稳定动作、冻结快照和订阅生命周期。 */
import { createModelController } from "../../contracts/model";
import type { ControllerPorts, PersistentStore, RandomPort } from "../../contracts/ports";
import { normalizeError } from "../../contracts/result";
import { createGame, gameStatus, moveGame, restoreGame, SAVE_KEY } from "./core";
import type { Direction, GameState } from "./core";

/** 游戏数据和瞬时展示字段分开；动画轮次、加分提示与错误不进入存档。 */
type Frame = {
  game: GameState | null;
  bestScore: number;
  turn: number;
  merged: readonly number[];
  spawned: readonly number[];
  gain: number;
  storageWarning: string;
  recoveryMessage: string;
  error: string;
};
const initial: Frame = {
  game: null,
  bestScore: 0,
  turn: 0,
  merged: [],
  spawned: [],
  gain: 0,
  storageWarning: "",
  recoveryMessage: "",
  error: "",
};

/** 注入随机数与存储能力，创建不依赖 React、DOM 或隐式随机源的游戏控制器。 */
export function createController(
  ports: ControllerPorts & { random: RandomPort; storage: PersistentStore },
) {
  let active = false;
  /** 先保存完整棋局再一次性发布展示帧，快速连续操作始终基于最新快照。 */
  function save(frame: Frame): Frame {
    if (!frame.game) return frame;
    const result = ports.storage.write(SAVE_KEY, {
      version: 1,
      ...frame.game,
      bestScore: frame.bestScore,
    });
    return { ...frame, storageWarning: result.ok ? "" : result.error.message };
  }
  const model = createModelController(
    "2048",
    { frame: initial },
    ({ frame }, set) => ({
      ...frame,
      /** 无效或失活操作不发布新帧，避免增加随机块或重复保存。 */
      move(direction: Direction) {
        if (!active || !frame.game) return;
        try {
          const result = moveGame(frame.game, direction, ports.random);
          if (!result.changed) return;
          set(
            "frame",
            save({
              ...initial,
              game: result.game,
              bestScore: Math.max(frame.bestScore, result.game.score),
              turn: frame.turn + 1,
              merged: result.merged,
              spawned: result.spawned,
              gain: result.gain,
            }),
          );
        } catch (error) {
          set("frame", { ...frame, error: normalizeError(error).message });
        }
      },
      /** 只重置当前局；最高分和存储降级状态由本次保存重新计算。 */
      restart() {
        if (!active) return;
        try {
          const game = createGame(ports.random);
          set(
            "frame",
            save({
              ...initial,
              game,
              bestScore: frame.bestScore,
              turn: frame.turn + 1,
              spawned: game.board.flatMap((value, index) => (value ? [index] : [])),
            }),
          );
        } catch (error) {
          set("frame", { ...frame, error: normalizeError(error).message });
        }
      },
      /** 达成目标只暂停一次，继续状态立即保存，刷新后不会再次挡住棋盘。 */
      continuePlaying() {
        if (!active || !frame.game || gameStatus(frame.game) !== "won") return;
        set(
          "frame",
          save({
            ...frame,
            game: { ...frame.game, keepPlaying: true },
            merged: [],
            spawned: [],
            gain: 0,
          }),
        );
      },
    }),
    ports,
    // 游戏使用独立、带版本的存档，不把棋盘或分数混入普通工具输入草稿。
    [],
  );
  return {
    ...model,
    /** 首次激活后才读取存储或生成随机块，重复激活不重置当前棋局。 */
    activate() {
      if (active) return;
      active = true;
      model.activate();
      const result = ports.storage.read(SAVE_KEY);
      const restored = restoreGame(result.ok ? result.value : null);
      try {
        const game = restored.game ?? createGame(ports.random);
        model.actions.set(
          "frame",
          save({
            ...initial,
            game,
            bestScore: restored.bestScore,
            recoveryMessage: restored.invalid
              ? "存档中的棋局无效，已重新开始并保留有效最高分。"
              : "",
            spawned: restored.game
              ? []
              : game.board.flatMap((value, index) => (value ? [index] : [])),
          }),
        );
      } catch (error) {
        model.actions.set("frame", {
          ...initial,
          bestScore: restored.bestScore,
          error: normalizeError(error).message,
        });
      }
    },
    /** 状态已在有效操作时保存；释放后拒绝旧动作，允许 StrictMode 再激活时恢复。 */
    dispose() {
      if (!active) return;
      active = false;
      model.dispose();
    },
  };
}
