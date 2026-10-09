import type { AppError, Result } from "./result";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogInput = Readonly<{
  level: LogLevel;
  event: string;
  toolId?: string;
  operation?: string;
  taskId?: string;
  phase?: string;
  durationMs?: number;
  errorCode?: string;
}>;
export type LogEvent = LogInput &
  Readonly<{ timestamp: string; buildId: string; sessionId: string }>;
export interface Logger {
  emit(event: LogInput): void;
  diagnostics(): string;
}
export interface ClockPort {
  now(): number;
  monotonic(): number;
}
export interface RandomPort {
  index(maxExclusive: number): number;
}
export interface ClipboardPort {
  write(text: string): Promise<void>;
}
export interface DraftStore {
  get(id: string): unknown;
  accepts(draft: unknown): boolean;
  set(id: string, draft: unknown): boolean;
  delete(id: string): void;
}
export interface RecentStore {
  getSnapshot(): readonly string[];
  subscribe(listener: () => void): () => void;
  record(id: string): void;
  activate(): void;
  dispose(): void;
}
export type WorkerRequest = Readonly<{
  scope: string;
  taskId: string;
  toolId: string;
  operation: string;
  revision: number;
  input: unknown;
}>;
export type WorkerResponse = Omit<WorkerRequest, "input"> & { result: Result<unknown> };
export interface WorkerPort {
  postMessage(message: WorkerRequest, transfer?: readonly ArrayBuffer[]): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { preventDefault(): void }) => void) | null;
  onmessageerror: (() => void) | null;
}
export type WorkerFactory = () => WorkerPort;
export interface CancellationSignal {
  readonly aborted: boolean;
  onCancel(listener: () => void): () => void;
}
export type TaskPreparation<I> = (
  signal: CancellationSignal,
) => Promise<{ input: I; transfer?: readonly ArrayBuffer[] }>;
export type TaskRequest<I> = Readonly<{
  scope: string;
  toolId: string;
  operation: string;
  revision: number;
  input: I;
  timeoutMs?: number;
  transfer?: readonly ArrayBuffer[];
  prepare?: TaskPreparation<I>;
}>;
export type TaskHandle<O> = Readonly<{ id: string; cancel(): void; result: Promise<Result<O>> }>;
export interface TaskExecutor {
  run<I, O>(request: TaskRequest<I>): TaskHandle<O>;
  cancel(scope: string): void;
  release(scope: string): void;
}
export interface ModuleLoader<T> {
  load(id: string): Promise<T>;
  preload(id: string): void;
  reset(id: string): void;
}
export interface ToolController<S, A> {
  getSnapshot(): Readonly<S>;
  subscribe(listener: () => void): () => void;
  activate(): void;
  dispose(): void;
  actions: A;
}
export type TaskStatus = "idle" | "pending" | "running" | "success" | "failed" | "cancelled";
export type ControllerPorts = Readonly<{ tasks: TaskExecutor; drafts: DraftStore; logger: Logger }>;
export type TaskSnapshot = Readonly<{ status: TaskStatus; error: AppError | null }>;
