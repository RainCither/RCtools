/** @file 验证控制器和浏览器能力：状态不可变、操作稳定、旧结果隔离、取消、超时、文件准备、草稿预算、日志字段、存储降级和模块重试。 */
import { describe, expect, it, vi } from "vitest";
import { createDraftStore } from "../../src/adapters/drafts";
import { createLogger } from "../../src/adapters/logger";
import { createModuleLoader } from "../../src/adapters/modules";
import { createRecentStore } from "../../src/adapters/recent";
import { createTaskExecutor } from "../../src/adapters/tasks";
import { createOperationController } from "../../src/contracts/controller";
import { createModelController } from "../../src/contracts/model";
import { parserFailure } from "../../src/contracts/parsing";
import type { LogInput, WorkerPort, WorkerRequest } from "../../src/contracts/ports";
const clock = { now: () => 1, monotonic: () => 0 };
/** 返回可控制消息与终止状态的 Worker 替身，用于验证取消、旧响应和资源释放。 */
function fakeWorker() {
  let message: WorkerRequest | undefined;
  let terminated = false;
  const worker: WorkerPort = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    /** 保存最新任务请求，供测试构造包含正确任务标识的模拟响应。 */
    postMessage(request) {
      message = request;
    },
    /** 标记 Worker 替身已释放，供取消、超时和异常用例断言资源生命周期。 */
    terminate() {
      terminated = true;
    },
  };
  return {
    worker,
    /** 读取替身保存的最后一次请求，供测试检查传输内容与任务版本。 */
    get message() {
      return message;
    },
    /** 读取替身终止状态，供资源释放断言使用。 */
    get terminated() {
      return terminated;
    },
    /** 将 value 包装为当前任务的成功响应，保留原请求标识以模拟合法 Worker 消息。 */
    respond(value: unknown) {
      if (message) worker.onmessage?.({ data: { ...message, result: { ok: true, value } } });
    },
  };
}
/** 组装测试时钟、日志、草稿和 Worker 替身，返回可观察任务生命周期的测试环境。 */
function context() {
  const events: LogInput[] = [];
  const logger = {
    emit: (event: LogInput) => events.push(event),
    diagnostics: () => JSON.stringify(events),
  };
  const workers: ReturnType<typeof fakeWorker>[] = [];
  const tasks = createTaskExecutor(
    {
      sample: () => {
        const worker = fakeWorker();
        workers.push(worker);
        return worker.worker;
      },
    },
    logger,
    clock,
  );
  return { tasks, workers, logger, events, drafts: createDraftStore() };
}
/** 等待多轮 Promise 微任务完成，让异步准备、Worker 响应及控制器提交进入可断言状态。 */
async function tick() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/** 集中验证后台任务从提交到取消或释放的生命周期。 */
describe("task lifecycle", () => {
  /** 验证动作引用稳定、动作读取最新模型且展示数据不可变。 */
  it("keeps actions stable, forwards current state and freezes display data", () => {
    const c = context();
    const controller = createModelController(
      "sample",
      { input: "", rows: [{ value: 1 }] },
      (state, set) => ({
        ...state,
        edit: (input: string) => set("input", input),
        append: () => set("input", state.input + "!"),
      }),
      c,
    );
    const actions = controller.actions;
    const append = actions.append;
    controller.activate();
    actions.edit("current");
    append();
    expect(controller.actions).toBe(actions);
    expect(controller.getSnapshot().input).toBe("current!");
    expect(
      Object.values(controller.getSnapshot()).some((value) => typeof value === "function"),
    ).toBe(false);
    expect(Object.isFrozen(controller.getSnapshot().rows)).toBe(true);
    expect(Object.isFrozen(controller.getSnapshot().rows[0])).toBe(true);
    controller.dispose();
  });
  /** 模拟结果提交异常，验证可恢复错误且不会产生未处理 Promise 拒绝。 */
  it("handles a failed result commit without an unhandled rejection", async () => {
    const c = context();
    const controller = createModelController(
      "sample",
      { input: "", result: "", error: "", busy: false },
      (state, _set, run) => ({
        ...state,
        compute: () =>
          run("run", "", () => {
            throw new Error("private-result");
          }),
      }),
      c,
      ["input"],
      { result: "", error: "", busy: false },
    );
    controller.activate();
    controller.actions.compute();
    await tick();
    c.workers[0]?.respond(null);
    await tick();
    await tick();
    expect(controller.getSnapshot().status).toBe("failed");
    expect(controller.getSnapshot().error).toContain("重新执行");
    expect(c.logger.diagnostics()).not.toContain("private-result");
    controller.dispose();
  });
  /** 验证畸形后台失败响应被识别，并释放对应线程。 */
  it("rejects malformed failure responses and isolates their worker", async () => {
    const c = context();
    const handle = c.tasks.run({
      scope: "a",
      toolId: "sample",
      operation: "run",
      revision: 1,
      input: "x",
    });
    await tick();
    const worker = c.workers[0];
    if (!worker?.message) throw new Error("Missing request");
    worker.worker.onmessage?.({ data: { ...worker.message, result: { ok: false, error: null } } });
    const result = await handle.result;
    expect(result.ok ? null : result.error.code).toBe("worker.protocol");
    expect(worker.terminated).toBe(true);
  });
  /** 模拟日志故障，验证诊断异常不会改变计算结果。 */
  it("keeps computation working if the logger fails", async () => {
    const worker = fakeWorker();
    const tasks = createTaskExecutor(
      { sample: () => worker.worker },
      {
        emit() {
          throw new Error("logger failed");
        },
        diagnostics: () => "",
      },
      clock,
    );
    const handle = tasks.run({
      scope: "a",
      toolId: "sample",
      operation: "run",
      revision: 1,
      input: "x",
    });
    await tick();
    worker.respond("result");
    expect(await handle.result).toEqual({ ok: true, value: "result" });
    tasks.release("a");
  });
  /** 验证编辑输入立即取消运行任务并清空过期结果。 */
  it("invalidates a running controller immediately on edited input", async () => {
    const c = context();
    const controller = createOperationController({
      id: "sample",
      initial: "",
      empty: "",
      ports: c,
    });
    controller.activate();
    const pending = controller.actions.run("run", "first");
    await tick();
    controller.actions.update("second");
    await pending;
    expect(controller.getSnapshot()).toMatchObject({ draft: "second", output: "", status: "idle" });
    expect(c.workers[0]?.terminated).toBe(true);
    controller.dispose();
  });
  /** 验证自动计算合并快速输入，并在离开时清理防抖计时器。 */
  it("debounces automatic work and releases timers on exit", async () => {
    vi.useFakeTimers();
    const c = context();
    const controller = createOperationController({
      id: "sample",
      initial: "",
      empty: "",
      ports: c,
      automatic: (draft) => (draft ? { operation: "run", input: draft } : null),
    });
    controller.activate();
    controller.actions.update("a");
    controller.actions.update("b");
    await vi.advanceTimersByTimeAsync(149);
    expect(c.workers).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(c.workers[0]?.message?.input).toBe("b");
    controller.dispose();
    await vi.runAllTimersAsync();
    expect(c.workers[0]?.terminated).toBe(true);
    vi.useRealTimers();
  });
  /** 验证同作用域只保留最新任务，旧响应无法覆盖新结果。 */
  it("cancels older requests and cannot commit a stale response", async () => {
    const c = context();
    const first = c.tasks.run({
      scope: "a",
      toolId: "sample",
      operation: "run",
      revision: 1,
      input: "old",
    });
    await tick();
    const old = c.workers[0];
    const callback = old?.worker.onmessage;
    const second = c.tasks.run({
      scope: "a",
      toolId: "sample",
      operation: "run",
      revision: 2,
      input: "new",
    });
    await tick();
    if (old?.message)
      callback?.({ data: { ...old.message, result: { ok: true, value: "stale" } } });
    expect((await first.result).ok).toBe(false);
    c.workers[1]?.respond("current");
    expect(await second.result).toEqual({ ok: true, value: "current" });
    expect(old?.terminated).toBe(true);
    c.tasks.release("a");
  });
  /** 验证超时会终止后台线程并返回相应错误。 */
  it("terminates a timed-out worker", async () => {
    vi.useFakeTimers();
    const c = context();
    const handle = c.tasks.run({
      scope: "a",
      toolId: "sample",
      operation: "run",
      revision: 1,
      input: "x",
      timeoutMs: 2000,
    });
    await tick();
    await vi.advanceTimersByTimeAsync(2000);
    const result = await handle.result;
    expect(result.ok ? null : result.error.kind).toBe("timeout");
    expect(c.workers[0]?.terminated).toBe(true);
    vi.useRealTimers();
  });
  /** 验证取消覆盖文件准备阶段，取消后不再发送字节。 */
  it("aborts preparation before sending file data", async () => {
    const c = context();
    let aborted = false;
    const handle = c.tasks.run({
      scope: "a",
      toolId: "sample",
      operation: "file",
      revision: 1,
      input: null,
      prepare: (signal) =>
        new Promise((resolve) => {
          signal.onCancel(() => {
            aborted = true;
            resolve({ input: null });
          });
        }),
    });
    await tick();
    handle.cancel();
    await handle.result;
    await tick();
    expect(aborted).toBe(true);
    expect(c.workers[0]?.message).toBeUndefined();
  });
  /** 验证释放后的控制器不会接纳迟到任务结果。 */
  it("disposal prevents a controller from accepting late results", async () => {
    const c = context();
    const controller = createOperationController({
      id: "sample",
      initial: "",
      empty: "",
      ports: c,
      restore: (value) => (typeof value === "string" ? value : ""),
    });
    controller.activate();
    controller.actions.update("draft");
    const pending = controller.actions.run("run", "draft");
    await tick();
    controller.dispose();
    await pending;
    expect(controller.getSnapshot().output).toBe("");
    expect(c.drafts.get("sample")).toBe("draft");
    controller.activate();
    expect(controller.getSnapshot().draft).toBe("draft");
    controller.dispose();
  });
});
/** 集中验证草稿边界、诊断内容和资源失败后的恢复。 */
describe("privacy and resource recovery", () => {
  /** 验证资源缓冲和函数不会进入草稿，释放流程仍能完成。 */
  it("rejects buffers and functions in drafts without interrupting disposal", () => {
    const store = createDraftStore();
    expect(store.set("sample", { read() {} })).toBe(false);
    expect(store.set("sample", { buffer: new ArrayBuffer(8) })).toBe(false);
    expect(store.get("sample")).toBeUndefined();
  });
  /** 验证草稿过大时，页面离开前即可读取不保留提示。 */
  it("warns about an oversized draft before leaving the tool", () => {
    const c = context();
    const controller = createOperationController({
      id: "sample",
      initial: "",
      empty: "",
      ports: { ...c, drafts: createDraftStore(12) },
    });
    controller.activate();
    controller.actions.update("1234567");
    expect(controller.getSnapshot().retained).toBe(false);
    controller.dispose();
  });
  /** 验证排除工具和非白名单字段不会被恢复。 */
  it("does not retain tools excluded by config or model fields outside its policy", () => {
    const store = createDraftStore(1000, new Set(["password"]));
    store.set("password", "secret");
    expect(store.get("password")).toBeUndefined();
    const c = context();
    const controller = createModelController(
      "sample",
      { input: "", resource: null as { read(): void } | null, result: "" },
      (state, set) => ({
        ...state,
        edit: (value: string) => set("input", value),
        attach: () => set("resource", { read() {} }),
      }),
      c,
      ["input"],
      { result: "" },
      ["input", "resource"],
    );
    controller.activate();
    controller.actions.edit("draft");
    controller.actions.attach();
    expect(controller.getSnapshot()).toBe(controller.getSnapshot());
    controller.dispose();
    expect(c.drafts.get("sample")).toEqual({ input: "draft" });
    expect(controller.getSnapshot().resource).toBeNull();
    controller.activate();
    expect(controller.getSnapshot().input).toBe("draft");
    controller.dispose();
  });
  /** 验证解析位置仍可定位，同时资源失败不泄露源码摘录或误归为语法错误。 */
  it("retains parser positions and distinguishes network failures without source excerpts", () => {
    expect(
      parserFailure({ line: 4, col: 2, message: "private text" }, "js-formatter"),
    ).toMatchObject({ kind: "validation", line: 4, column: 3, code: "js-formatter.syntax" });
    expect(
      parserFailure(new Error("Failed to fetch dynamically imported module"), "js-formatter").kind,
    ).toBe("resource");
    expect(
      parserFailure(new SyntaxError("Unexpected private text at position 3"), "json", "a\nbc")
        .message,
    ).not.toContain("private");
  });
  /** 验证诊断字段白名单和最多 500 条的内存上限。 */
  it("logs only approved fields and retains at most 500 events", () => {
    const logger = createLogger(clock, "build", "session");
    for (let i = 0; i < 510; i++)
      logger.emit({
        level: "info",
        event: "task.started",
        toolId: "sample",
        ...{ input: "secret", output: "private", filename: "file.txt" },
      });
    const entries = JSON.parse(logger.diagnostics()) as Record<string, unknown>[];
    expect(entries).toHaveLength(500);
    expect(logger.diagnostics()).not.toMatch(/secret|private|file.txt|filename/);
  });
  /** 验证失败模块加载可重新尝试，不被拒绝 Promise 缓存锁死。 */
  it("retries a failed import instead of caching its rejection", async () => {
    let attempt = 0;
    const loader = createModuleLoader(
      {
        sample: async () => {
          if (!attempt++) throw new Error("offline");
          return "loaded";
        },
      },
      { emit: () => {}, diagnostics: () => "" },
    );
    await expect(loader.load("sample")).rejects.toMatchObject({ kind: "resource" });
    await expect(loader.load("sample")).resolves.toBe("loaded");
  });
  /** 验证草稿预算按使用顺序淘汰，并拒绝单份超额数据。 */
  it("evicts old drafts and rejects a single oversized draft", () => {
    const store = createDraftStore(24);
    expect(store.set("a", "12345678")).toBe(true);
    expect(store.set("b", "abcdefgh")).toBe(true);
    expect(store.get("a")).toBeUndefined();
    expect(store.set("c", "x".repeat(30))).toBe(false);
    expect(store.get("b")).toBe("abcdefgh");
  });
  /** 验证最近使用去重、过滤及存储不可用时的内存降级。 */
  it("normalizes persisted recents and survives blocked storage", () => {
    const store = createRecentStore(
      new Set(["json", "timestamp", "text-stats"]),
      () => ({
        getItem: () => JSON.stringify(["json", "json", "missing", "timestamp"]),
        setItem: () => {
          throw new Error("blocked");
        },
      }),
      { emit: () => {}, diagnostics: () => "" },
    );
    store.activate();
    expect(store.getSnapshot()).toEqual(["json", "timestamp"]);
    store.record("text-stats");
    expect(store.getSnapshot()).toEqual(["text-stats", "json", "timestamp"]);
    store.dispose();
  });
});
