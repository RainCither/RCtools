/** @file 验证音频的惰性初始化、低音量、节点释放、异步恢复取消与失败降级。 */
import { expect, it, vi } from "vitest";
import { createGameSound } from "../../src/tools/2048/use-sound";

/** 模拟最小音频图并保留节点记录，检查资源行为而不依赖测试机器的扬声器。 */
function environment(state: AudioContextState = "running") {
  const oscillators: {
    onended: (() => void) | null;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  }[] = [];
  const gains: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
  }[] = [];
  const context = {
    state,
    currentTime: 1,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => {
      const node = {
        onended: null,
        type: "sine",
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(node);
      return node;
    }),
    createGain: vi.fn(() => {
      const node = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(node);
      return node;
    }),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  const logger = { emit: vi.fn(), diagnostics: () => "" };
  const report = vi.fn();
  const player = createGameSound(factory, logger, report);
  return { context, factory, logger, report, player, oscillators, gains };
}

/** 挂载不会访问音频设备；每次操作复用上下文，以短淡入淡出限制音量并释放结束的音符。 */
it("creates audio only on play, uses a quiet envelope and disconnects ended voices", () => {
  const env = environment();
  expect(env.factory).not.toHaveBeenCalled();
  env.player.play("merge");
  expect(env.factory).toHaveBeenCalledOnce();
  expect(env.context.resume).not.toHaveBeenCalled();
  expect(env.oscillators).toHaveLength(2);
  for (const [index, oscillator] of env.oscillators.entries()) {
    expect(oscillator.start).toHaveBeenCalledOnce();
    expect(oscillator.stop).toHaveBeenCalledOnce();
    expect(env.gains[index]?.gain.linearRampToValueAtTime.mock.calls[0]?.[0]).toBeLessThan(0.1);
    oscillator.onended?.();
    expect(oscillator.disconnect).toHaveBeenCalledOnce();
    expect(env.gains[index]?.disconnect).toHaveBeenCalledOnce();
  }
  env.player.play("move");
  expect(env.factory).toHaveBeenCalledOnce();
  env.player.stop();
  env.player.stop();
  expect(env.context.close).toHaveBeenCalledOnce();
});

/** 快速连续移动替换上一组声音，静音必须同时取消未来排程的胜利音符。 */
it("replaces queued voices and immediately stops all sound on mute", () => {
  const env = environment();
  env.player.play("win");
  expect(env.oscillators).toHaveLength(4);
  env.player.play("over");
  for (const oscillator of env.oscillators.slice(0, 4)) {
    expect(oscillator.stop).toHaveBeenCalledTimes(2);
    expect(oscillator.disconnect).toHaveBeenCalledOnce();
  }
  env.player.stop();
  for (const oscillator of env.oscillators.slice(4)) {
    expect(oscillator.stop).toHaveBeenCalledTimes(2);
    expect(oscillator.disconnect).toHaveBeenCalledOnce();
  }
  expect(env.context.close).toHaveBeenCalledOnce();
});

/** 浏览器延迟恢复时，静音或卸载先使请求失效，不允许随后响起过期音效。 */
it("cancels pending audio resume when stopped", async () => {
  const env = environment("suspended");
  let resume = () => {};
  env.context.resume.mockReturnValue(
    new Promise<void>((resolve) => {
      resume = resolve;
    }),
  );
  env.player.play("win");
  expect(env.context.resume).toHaveBeenCalledOnce();
  env.player.stop();
  resume();
  await Promise.resolve();
  expect(env.context.createOscillator).not.toHaveBeenCalled();
  expect(env.report).not.toHaveBeenCalled();
});

/** 多次恢复请求只播放最新一次；无效的旧恢复不能补播历史操作。 */
it("plays only the latest request after resume", async () => {
  const env = environment("suspended");
  env.player.play("win");
  env.player.play("move");
  await Promise.resolve();
  expect(env.oscillators).toHaveLength(1);
});

/** 节点尚未启动便失败时，stop 也可能报错；清理仍要完成，异常不得逃逸至游戏事件。 */
it("cleans up a partially scheduled sound without interrupting gameplay", () => {
  const env = environment();
  const create = env.context.createOscillator.getMockImplementation();
  env.context.createOscillator.mockImplementationOnce(() => {
    if (!create) throw new Error("音频节点工厂未初始化。");
    const oscillator = create();
    oscillator.start.mockImplementationOnce(() => {
      throw new Error("start failed");
    });
    oscillator.stop.mockImplementationOnce(() => {
      throw new Error("not started");
    });
    return oscillator;
  });
  expect(() => env.player.play("merge")).not.toThrow();
  expect(env.oscillators[0]?.disconnect).toHaveBeenCalledOnce();
  expect(env.gains[0]?.disconnect).toHaveBeenCalledOnce();
  expect(env.context.close).toHaveBeenCalledOnce();
  expect(env.report).toHaveBeenCalledWith(expect.stringContaining("音效暂时不可用"));
  expect(env.logger.emit).toHaveBeenCalledOnce();
});

/** 能力缺失和恢复拒绝都成为可见提示与去重诊断；后续用户操作仍可重试成功。 */
it("reports audio failures once and recovers on a later interaction", async () => {
  const env = environment("suspended");
  env.context.resume.mockRejectedValue(new Error("private browser error"));
  env.player.play("move");
  await vi.waitFor(() => expect(env.logger.emit).toHaveBeenCalledOnce());
  expect(env.report).toHaveBeenLastCalledWith(expect.stringContaining("音效暂时不可用"));
  env.factory.mockImplementationOnce(() => {
    throw new Error("unsupported");
  });
  env.player.play("move");
  expect(env.logger.emit).toHaveBeenCalledOnce();
  expect(JSON.stringify(env.logger.emit.mock.calls)).not.toContain("private");
  env.context.state = "running";
  env.player.play("restart");
  expect(env.report).toHaveBeenLastCalledWith("");
  expect(env.oscillators).toHaveLength(2);
  env.context.close.mockRejectedValue(new Error("close failed"));
  env.player.stop();
  await vi.waitFor(() => expect(env.logger.emit).toHaveBeenCalledTimes(2));
});
