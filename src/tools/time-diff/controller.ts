import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import {
  calculateAdjacentDifference,
  formatClockTime,
  parseTimeInput,
  sumCalculatedDifferences,
  type TimeFormat,
} from "./core";
type TimeDiffMode = "continuous" | "pairs";
type PairSide = "start" | "end";
type TimeEntry = {
  id: string;
  raw: string;
  touched: boolean;
};
type TimePair = {
  id: number;
  start: TimeEntry;
  end: TimeEntry;
};
function createEntry(id: string): TimeEntry {
  return { id, raw: "", touched: false };
}
function freshContinuousEntries() {
  return [createEntry("continuous-1"), createEntry("continuous-2")];
}
function createPair(id: number): TimePair {
  return {
    id,
    start: createEntry(`pair-${id}-start`),
    end: createEntry(`pair-${id}-end`),
  };
}
function freshPairs() {
  return [createPair(1)];
}
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
      function addEntry() {
        nextEntryIdRef.current = Math.max(
          nextEntryIdRef.current,
          ...entries.map((entry) => Number(entry.id.split("-").at(-1)) + 1),
        );
        const number = nextEntryIdRef.current;
        nextEntryIdRef.current += 1;
        const entry = createEntry(`continuous-${number}`);
        setEntries((current) => [...current, entry]);
      }
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
      function updateEntry(id: string, raw: string) {
        setEntries((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, raw } : entry)),
        );
      }
      function touchEntry(id: string) {
        setEntries((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, touched: true } : entry)),
        );
      }
      function updatePairEntry(pairId: number, side: PairSide, raw: string) {
        setPairs((current) =>
          current.map((pair) => {
            if (pair.id !== pairId) return pair;
            return { ...pair, [side]: { ...pair[side], raw } };
          }),
        );
      }
      function touchPairEntry(pairId: number, side: PairSide) {
        setPairs((current) =>
          current.map((pair) => {
            if (pair.id !== pairId) return pair;
            return { ...pair, [side]: { ...pair[side], touched: true } };
          }),
        );
      }
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
      function changeFormat(nextFormat: TimeFormat) {
        reformatAllEntries(nextFormat, omitSeparator);
        setFormat(nextFormat);
      }
      function changeSeparator(nextOmitSeparator: boolean) {
        reformatAllEntries(format, nextOmitSeparator);
        setOmitSeparator(nextOmitSeparator);
      }
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
