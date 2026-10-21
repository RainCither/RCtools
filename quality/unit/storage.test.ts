/** @file 验证通用存档的数据副本、无存档、读取异常、配额失败与内存回退。 */
import { expect, it, vi } from "vitest";
import { createPersistentStore } from "../../src/adapters/storage";

/** 读取和返回数据都不应共享可变引用，且创建适配器时不访问浏览器。 */
it("lazily reads JSON and returns independent copies", () => {
  const native = { getItem: vi.fn(() => null), setItem: vi.fn() };
  const source = vi.fn(() => native);
  const store = createPersistentStore(source, { emit: vi.fn(), diagnostics: () => "" });
  expect(source).not.toHaveBeenCalled();
  expect(store.read("missing")).toEqual({ ok: true, value: null });
  const value = { board: [2, 2] };
  expect(store.write("game", value).ok).toBe(true);
  value.board[0] = 4;
  const read = store.read("game");
  expect(read).toEqual({ ok: true, value: { board: [2, 2] } });
  if (read.ok) (read.value as typeof value).board[0] = 8;
  expect(store.read("game")).toEqual({ ok: true, value: { board: [2, 2] } });
});

/** 访问失败或非法 JSON 返回统一错误，不把原始存档和异常内容带进诊断。 */
it("classifies malformed and inaccessible storage without exposing contents", () => {
  const logger = { emit: vi.fn(), diagnostics: () => "" };
  const store = createPersistentStore(
    () => ({ getItem: () => "private invalid JSON", setItem: () => {} }),
    logger,
  );
  const result = store.read("private-key");
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.kind).toBe("storage");
  expect(JSON.stringify(logger.emit.mock.calls)).not.toMatch(/private|JSON|Error/);
  const denied = createPersistentStore(() => {
    throw new Error("private exception");
  }, logger);
  expect(denied.read("game").ok).toBe(false);
});

/** 写入失败仍留下可恢复副本；连续失败只记一次，恢复后再次失败可重新诊断。 */
it("keeps a memory copy when writes exceed quota and recovers on a later save", () => {
  const logger = { emit: vi.fn(), diagnostics: () => "" };
  let blocked = true;
  const store = createPersistentStore(
    () => ({
      getItem: () => null,
      setItem: () => {
        if (blocked) throw new Error("quota");
      },
    }),
    logger,
  );
  expect(store.write("game", { score: 4 }).ok).toBe(false);
  expect(store.write("game", { score: 8 }).ok).toBe(false);
  expect(store.read("game")).toEqual({ ok: true, value: { score: 8 } });
  expect(logger.emit).toHaveBeenCalledTimes(1);
  blocked = false;
  expect(store.write("game", { score: 16 }).ok).toBe(true);
  blocked = true;
  expect(store.write("game", { score: 32 }).ok).toBe(false);
  expect(logger.emit).toHaveBeenCalledTimes(2);
});

/** 无法序列化的数据不能覆盖最后一次有效存档。 */
it("rejects unserializable values without replacing the valid memory copy", () => {
  const store = createPersistentStore(() => ({ getItem: () => null, setItem: () => {} }), {
    emit: vi.fn(),
    diagnostics: () => "",
  });
  store.write("game", { score: 4 });
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  expect(store.write("game", cyclic).ok).toBe(false);
  expect(store.write("game", undefined).ok).toBe(false);
  expect(store.read("game")).toEqual({ ok: true, value: { score: 4 } });
});
