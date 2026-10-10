/** @file 管理连续输入行、独立时间对、模式、精度和分隔符；处理新增、编辑、校验、格式切换、清空及重置，并派生各项和总时长。 */
import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import {
  calculateAdjacentDifference,
  formatClockTime,
  parseTimeInput,
  sumCalculatedDifferences,
  type TimeFormat,
} from "./core";
/** 连续时间与独立时间对两种计算模式，共用时长格式和草稿生命周期。 */
type TimeDiffMode = "continuous" | "pairs";
/** 限定时间对可编辑的一侧，避免更新时混淆开始和结束字段。 */
type PairSide = "start" | "end";
/** 带稳定 ID、原始输入和触碰标记的时间行，支持动态新增和字段校验。 */
type TimeEntry = {
  id: string;
  raw: string;
  touched: boolean;
};
/** 一个稳定编号的开始/结束时间对，供成对间隔与累计计算使用。 */
type TimePair = {
  id: number;
  start: TimeEntry;
  end: TimeEntry;
};
/** 为 id 创建空时间行及未触碰状态，供输入校验区分空白与已编辑字段。 */
function createEntry(id: string): TimeEntry {
  return { id, raw: "", touched: false };
}
/** 返回连续模式所需的两条独立初始时间行。 */
function freshContinuousEntries() {
  return [createEntry("continuous-1"), createEntry("continuous-2")];
}
/** 按 id 创建开始和结束时间行，返回稳定标识的独立时间对。 */
function createPair(id: number): TimePair {
  return {
    id,
    start: createEntry(`pair-${id}-start`),
    end: createEntry(`pair-${id}-end`),
  };
}
/** 返回成对模式的初始时间对，供初始化和重置共用。 */
function freshPairs() {
  return [createPair(1)];
}
/** 通过 ports 组装 连续时间差的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  const nextEntryIdRef = { current: 3 };
  const nextPairIdRef = { current: 2 };
  return createModelController(
    "time-diff",
    {
      mode: "continuous",
      format: "HH:mm",
      omitSeparator: false,
      entries: freshContinuousEntries(),
      pairs: freshPairs(),
    } as {
      mode: TimeDiffMode;
      format: TimeFormat;
      omitSeparator: boolean;
      entries: TimeEntry[];
      pairs: TimePair[];
    },
    (state, set) => {
      const mode = state.mode;
      const setMode = (value: TimeDiffMode | ((current: TimeDiffMode) => TimeDiffMode)) =>
        set("mode", value);
      const format = state.format;
      const setFormat = (value: TimeFormat | ((current: TimeFormat) => TimeFormat)) =>
        set("format", value);
      const omitSeparator = state.omitSeparator;
      const setOmitSeparator = (value: boolean | ((current: boolean) => boolean)) =>
        set("omitSeparator", value);
      const entries = state.entries;
      const setEntries = (value: TimeEntry[] | ((current: TimeEntry[]) => TimeEntry[])) =>
        set("entries", value);
      const pairs = state.pairs;
      const setPairs = (value: TimePair[] | ((current: TimePair[]) => TimePair[])) =>
        set("pairs", value);
      const parsedEntries = entries.map((entry) =>
        parseTimeInput(entry.raw, format, omitSeparator),
      );
      const adjacentDifferences = parsedEntries
        .slice(0, -1)
        .map((parsed, index) =>
          calculateAdjacentDifference(parsed.seconds, parsedEntries[index + 1]?.seconds ?? null),
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
      const totalDifference =
        mode === "continuous" ? continuousTotalDifference : pairTotalDifference;
      const placeholder = omitSeparator
        ? format === "HH:mm:ss"
          ? "例如：093015"
          : "例如：0930"
        : format === "HH:mm:ss"
          ? "例如：09:30:15"
          : "例如：09:30";
      function changeMode(nextMode: TimeDiffMode) {
        setMode(nextMode);
      }
      /** 根据现有行 ID 推进编号并追加空行，避免恢复草稿后重复使用标识。 */
      function addEntry() {
        // 恢复草稿可能已有更大的行编号，追加前从现有 ID 继续递增。
        nextEntryIdRef.current = Math.max(
          nextEntryIdRef.current,
          ...entries.map((entry) => Number(entry.id.split("-").at(-1)) + 1),
        );
        const number = nextEntryIdRef.current;
        nextEntryIdRef.current += 1;
        const entry = createEntry(`continuous-${number}`);
        setEntries((current) => [...current, entry]);
      }
      /** 根据现有时间对编号追加新对，保持草稿恢复和键盘新增时的标识唯一。 */
      function addPair() {
        nextPairIdRef.current = Math.max(
          nextPairIdRef.current,
          ...pairs.map((pair) => pair.id + 1),
        );
        const id = nextPairIdRef.current;
        nextPairIdRef.current += 1;
        const pair = createPair(id);
        setPairs((current) => [...current, pair]);
      }
      /** 按 id 更新连续模式的 raw 输入，保留其他行及触碰状态。 */
      function updateEntry(id: string, raw: string) {
        setEntries((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, raw } : entry)),
        );
      }
      /** 标记 id 行已交互，供界面决定是否显示对应校验错误。 */
      function touchEntry(id: string) {
        setEntries((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, touched: true } : entry)),
        );
      }
      /** 按 pairId 与 side 更新一侧 raw 输入，保留同对的另一侧状态。 */
      function updatePairEntry(pairId: number, side: PairSide, raw: string) {
        setPairs((current) =>
          current.map((pair) => {
            if (pair.id !== pairId) return pair;
            return { ...pair, [side]: { ...pair[side], raw } };
          }),
        );
      }
      /** 标记 pairId 的 side 字段已交互，供成对模式显示输入校验反馈。 */
      function touchPairEntry(pairId: number, side: PairSide) {
        setPairs((current) =>
          current.map((pair) => {
            if (pair.id !== pairId) return pair;
            return { ...pair, [side]: { ...pair[side], touched: true } };
          }),
        );
      }
      /** 按当前格式解析 entry 并转换到新精度和分隔符，返回新的时间行并清除旧触碰状态。 */
      function reformatEntry(
        entry: TimeEntry,
        nextFormat: TimeFormat,
        nextOmitSeparator: boolean,
      ): TimeEntry {
        const parsed = parseTimeInput(entry.raw, format, omitSeparator);
        return {
          ...entry,
          raw:
            parsed.seconds === null
              ? ""
              : formatClockTime(parsed.seconds, nextFormat, nextOmitSeparator),
          touched: false,
        };
      }
      // 两种模式的草稿一起换格式，切换模式后不会出现旧分隔符或旧精度。
      /** 同时更新连续行与时间对，使模式切换后仍使用一致的输入格式。 */
      function reformatAllEntries(nextFormat: TimeFormat, nextOmitSeparator: boolean) {
        setEntries((current) =>
          current.map((entry) => reformatEntry(entry, nextFormat, nextOmitSeparator)),
        );
        setPairs((current) =>
          current.map((pair) => ({
            ...pair,
            start: reformatEntry(pair.start, nextFormat, nextOmitSeparator),
            end: reformatEntry(pair.end, nextFormat, nextOmitSeparator),
          })),
        );
      }
      /** 先重排所有有效时间，再更新 nextFormat，避免按新精度误解析旧输入。 */
      function changeFormat(nextFormat: TimeFormat) {
        reformatAllEntries(nextFormat, omitSeparator);
        setFormat(nextFormat);
      }
      /** 先转换原格式时间，再更新 nextOmitSeparator，保留切换前可识别的时刻。 */
      function changeSeparator(nextOmitSeparator: boolean) {
        reformatAllEntries(format, nextOmitSeparator);
        setOmitSeparator(nextOmitSeparator);
      }
      /** 只清空当前模式的时间与触碰状态，保留行数量和设置便于继续输入。 */
      function clearTimes() {
        if (mode === "continuous") {
          setEntries((current) => current.map((entry) => ({ ...entry, raw: "", touched: false })));

          return;
        }

        setPairs((current) =>
          current.map((pair) => ({
            ...pair,
            start: { ...pair.start, raw: "", touched: false },
            end: { ...pair.end, raw: "", touched: false },
          })),
        );
      }
      /** 恢复连续模式、时间精度和两种输入列表，并重启行编号计数。 */
      function reset() {
        nextEntryIdRef.current = 3;
        nextPairIdRef.current = 2;
        setMode("continuous");
        setFormat("HH:mm");
        setOmitSeparator(false);
        setEntries(freshContinuousEntries());
        setPairs(freshPairs());
      }
      return {
        mode,
        setMode,
        format,
        setFormat,
        omitSeparator,
        setOmitSeparator,
        entries,
        setEntries,
        pairs,
        setPairs,
        parsedEntries,
        adjacentDifferences,
        continuousTotalDifference,
        parsedPairs,
        pairDifferences,
        pairTotalDifference,
        totalDifference,
        placeholder,
        changeMode,
        addEntry,
        addPair,
        updateEntry,
        touchEntry,
        updatePairEntry,
        touchPairEntry,
        reformatEntry,
        reformatAllEntries,
        changeFormat,
        changeSeparator,
        clearTimes,
        reset,
      };
    },
    ports,
    ["mode", "format", "omitSeparator", "entries", "pairs"],
  );
}
