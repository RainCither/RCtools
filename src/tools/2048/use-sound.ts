/** @file 按用户操作合成短音；音频资源留在交互层，静音或离开游戏时释放。 */
import { useEffect, useState } from "react";
import type { Logger } from "../../contracts/ports";

export type GameSound = "move" | "merge" | "win" | "over" | "restart";
/** 每个音符为频率、相对开始时间、时长；轻短的正弦音无需下载音频素材。 */
const phrases: Record<GameSound, readonly (readonly [number, number, number])[]> = {
  move: [[220, 0, 0.055]],
  merge: [
    [523.25, 0, 0.085],
    [783.99, 0.055, 0.12],
  ],
  win: [
    [523.25, 0, 0.13],
    [659.25, 0.1, 0.13],
    [783.99, 0.2, 0.13],
    [1046.5, 0.3, 0.24],
  ],
  over: [
    [392, 0, 0.14],
    [329.63, 0.12, 0.14],
    [261.63, 0.24, 0.24],
  ],
  restart: [
    [392, 0, 0.08],
    [523.25, 0.07, 0.13],
  ],
};
const unavailable = "音效暂时不可用，请检查浏览器声音设置，或关闭后重新开启音效。";

/**
 * 创建惰性的播放器；factory 仅在用户操作时调用，便于遵守自动播放限制并模拟能力失败。
 * report 只接收展示消息；所有异步恢复都校验轮次，避免静音、卸载后响起迟到的音效。
 */
export function createGameSound(
  factory: () => AudioContext,
  logger: Logger,
  report: (message: string) => void,
) {
  let context: AudioContext | null = null;
  let revision = 0;
  let reported = false;
  const voices = new Map<OscillatorNode, GainNode>();

  /** 只记录错误编码，不让可选音效的异常中断游戏或暴露浏览器异常内容。 */
  function diagnose() {
    if (reported) return;
    reported = true;
    logger.emit({
      level: "warn",
      event: "audio.unavailable",
      toolId: "2048",
      errorCode: "audio.play",
    });
  }
  /** 取消当前及已排程的音符，快速操作时不叠加音量，也不积压播放队列。 */
  function silence() {
    for (const [oscillator, gain] of voices) {
      oscillator.onended = null;
      try {
        oscillator.stop();
      } catch {
        // 排程中途失败时节点可能尚未启动，仍须继续断开其余节点和关闭上下文。
        diagnose();
      }
      oscillator.disconnect();
      gain.disconnect();
    }
    voices.clear();
  }
  /** 关闭上下文而非只把音量置零，离开工具后不保留音频设备资源。 */
  function stop() {
    revision++;
    silence();
    const previous = context;
    context = null;
    if (previous && previous.state !== "closed") void previous.close().catch(diagnose);
  }
  /** 用短淡入淡出消除爆音，振荡器结束即断开节点；每次仅播放一组低音量音符。 */
  function schedule(current: AudioContext, sound: GameSound) {
    for (const [frequency, offset, duration] of phrases[sound]) {
      const oscillator = current.createOscillator();
      const gain = current.createGain();
      const start = current.currentTime + 0.005 + offset;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      gain.gain.linearRampToValueAtTime(0, start + duration + 0.01);
      oscillator.connect(gain);
      gain.connect(current.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        voices.delete(oscillator);
      };
      voices.set(oscillator, gain);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.015);
    }
    reported = false;
    report("");
  }
  return {
    stop,
    /** 同步发起上下文创建/恢复以保留用户手势，只有恢复成功且请求仍有效时才排程。 */
    play(sound: GameSound) {
      const version = ++revision;
      silence();
      /** 恢复失败时关闭旧资源并提示；旧请求的失败不能影响当前播放。 */
      function failed() {
        if (version !== revision) return;
        stop();
        diagnose();
        report(unavailable);
      }
      try {
        context ??= factory();
        const current = context;
        if (current.state === "running") schedule(current, sound);
        else {
          void current
            .resume()
            .then(() => {
              if (version === revision && current === context) schedule(current, sound);
            })
            .catch(failed);
        }
      } catch {
        failed();
      }
    },
  };
}

/** 渲染时仅建立纯播放器外壳；挂载、恢复棋局和 StrictMode 重放均不会发声。 */
export function useGameSound(logger: Logger) {
  const [warning, setWarning] = useState("");
  const [player] = useState(() =>
    createGameSound(() => new AudioContext({ latencyHint: "interactive" }), logger, setWarning),
  );
  useEffect(() => () => player.stop(), [player]);
  return { player, warning, clearWarning: () => setWarning("") };
}
