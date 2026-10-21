/** @file 集中定义日志、时钟、随机数、剪贴板、草稿、最近使用、任务、Worker 消息、模块加载器和控制器等能力接口。 */
import type { AppError, Result } from "./result";
export type LogLevel = "debug" | "info" | "warn" | "error";
/** 允许业务边界写入的诊断字段，排除输入内容、文件信息和异常堆栈。 */
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
/** 日志适配器附加时间、构建和会话标识后的完整诊断事件。 */
export type LogEvent = LogInput &
  Readonly<{ timestamp: string; buildId: string; sessionId: string }>;
/** 记录白名单事件与导出诊断的能力，使用者不直接依赖控制台或持久存储。 */
export interface Logger {
  /** 仅记录批准的诊断字段并维护缓冲上限，使工具输入和资源内容留在业务边界内。 */
  emit(event: LogInput): void;
  /** 将保留的白名单事件序列化为诊断文字，供用户主动复制排查问题。 */
  diagnostics(): string;
}
/** 提供日历时间和单调计时，便于分别显示时间与统计耗时并支持测试注入。 */
export interface ClockPort {
  /** 返回 Unix 纪元毫秒，用于时间戳与诊断事件的日历时间。 */
  now(): number;
  /** 返回单调计时毫秒，用于耗时测量，避免系统时钟校准改变任务时长。 */
  monotonic(): number;
}
/** 提供指定范围的随机索引，算法通过注入能力与浏览器安全随机源解耦。 */
export interface RandomPort {
  /** 返回大于等于 0 且小于 maxExclusive 的无偏随机整数，供密码字符选择和洗牌使用。 */
  index(maxExclusive: number): number;
}
/** 可异步失败的文字复制能力，调用方负责显示用户反馈。 */
export interface ClipboardPort {
  /** 将 text 写入剪贴板，能力不可用或写入失败时向调用方返回错误以显示复制反馈。 */
  write(text: string): Promise<void>;
}
/** 限定预算的内存输入草稿接口，只保存可克隆的数据并支持显式删除。 */
export interface DraftStore {
  /** 读取 id 对应草稿并返回独立副本，同时更新使用顺序，供后续 LRU 淘汰判断。 */
  get(id: string): unknown;
  /** 检查 draft 是否能放入草稿预算，供页面在离开前显示是否会保留输入。 */
  accepts(draft: unknown): boolean;
  /** 提交字段或草稿的新值；当前模块负责取消过期计算或维持缓存预算和副本隔离。 */
  set(id: string, draft: unknown): boolean;
  /** 移除指定 id 的草稿，供显式清空和恢复默认状态使用。 */
  delete(id: string): void;
}
/** 独立于普通输入草稿的 JSON 存档能力；失败使用统一错误，浏览器实现负责会话内回退。 */
export interface PersistentStore {
  /** 读取 key 的独立数据副本；没有存档时成功返回 null，不在创建服务时读取外部状态。 */
  read(key: string): Result<unknown>;
  /** 缓存 value 的 JSON 副本并尝试持久保存；失败后仍允许当前页面内恢复，返回存储错误。 */
  write(key: string, value: unknown): Result<void>;
}
/** 最近使用列表的订阅与生命周期接口，激活后读取存储并同步变化。 */
export interface RecentStore {
  /** 返回引用稳定的当前只读快照，只有发布状态时才变化，供外部状态订阅比较使用。 */
  getSnapshot(): readonly string[];
  /** 注册 listener 并返回退订函数，使组件或事件拥有者能在离开时释放订阅。 */
  subscribe(listener: () => void): () => void;
  /** 记录生命周期事件或最近工具；具体持久化与诊断由当前模块负责，失败应有降级路径。 */
  record(id: string): void;
  /** 读取最近使用的外部存储并启用变化订阅，重复激活时保持监听幂等。 */
  activate(): void;
  /** 解除最近使用的外部存储监听，保留可供当前界面读取的内存快照。 */
  dispose(): void;
}
/** 后台任务信封，使用作用域、工具、操作、任务 ID 和输入版本标识本次计算。 */
export type WorkerRequest = Readonly<{
  scope: string;
  taskId: string;
  toolId: string;
  operation: string;
  revision: number;
  input: unknown;
}>;
/** 保留请求标识的后台结果，用统一 Result 表达成功或失败。 */
export type WorkerResponse = Omit<WorkerRequest, "input"> & { result: Result<unknown> };
/** 独立于原生 DOM Worker 类型的通信与终止接口，便于替换实现和测试。 */
export interface WorkerPort {
  /** 发送任务 message，并按 transfer 移交缓冲区所有权，避免文件字节在跨线程传输时重复复制。 */
  postMessage(message: WorkerRequest, transfer?: readonly ArrayBuffer[]): void;
  /** 解除消息与错误回调后终止 Worker，使离开的任务不再向原页面发送结果。 */
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { preventDefault(): void }) => void) | null;
  onmessageerror: (() => void) | null;
}
/** 按需创建一条后台计算通道的工厂，实际生命周期由任务执行器管理。 */
export type WorkerFactory = () => WorkerPort;
/** 准备阶段可订阅的取消信号，供文件读取等尚未发给 Worker 的资源提前中止。 */
export interface CancellationSignal {
  readonly aborted: boolean;
  /** 注册 listener 并返回退订函数，使文件读取等准备资源能跟随任务取消一起释放。 */
  onCancel(listener: () => void): () => void;
}
/** 可异步准备任务输入，成功返回数据和可选缓冲区转移列表。 */
export type TaskPreparation<I> = (
  signal: CancellationSignal,
) => Promise<{ input: I; transfer?: readonly ArrayBuffer[] }>;
/** 描述一次后台操作及其输入版本、超时与可取消准备过程。 */
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
/** 返回任务标识、取消入口和始终以 Result 结算的完成 Promise。 */
export type TaskHandle<O> = Readonly<{
  id: string; /** 使当前任务失效并释放等待或运行资源，后续迟到响应不会覆盖新的输入。 */
  cancel(): void;
  result: Promise<Result<O>>;
}>;
/** 按作用域运行最新任务并提供取消和释放入口，隔离并发与迟到响应。 */
export interface TaskExecutor {
  /** 根据 request 运行后台任务，返回包含取消入口与结果 Promise 的任务句柄。 */
  run<I, O>(request: TaskRequest<I>): TaskHandle<O>;
  /** 使当前任务失效并释放等待或运行资源，后续迟到响应不会覆盖新的输入。 */
  cancel(scope: string): void;
  /** 终止 scope 的当前任务和 Worker 并删除槽位，供取消后的清理或页面离开调用。 */
  release(scope: string): void;
}
/** 按 ID 加载与预加载实现模块，并允许在失败后清除缓存重试。 */
export interface ModuleLoader<T> {
  /** 按 id 获取或复用正在加载的模块；失败时删除缓存并返回统一资源错误，以便再次尝试。 */
  load(id: string): Promise<T>;
  /** 按 id 提前加载工具模块并接住拒绝结果，预加载失败只记录诊断，不中断当前页面。 */
  preload(id: string): void;
  /** 清除 id 对应的模块缓存，供用户显式重试加载。 */
  reset(id: string): void;
}
/** 统一的可订阅控制器生命周期：快照与动作分离，挂载激活、离开释放。 */
export interface ToolController<S, A> {
  /** 返回引用稳定的当前只读快照，只有发布状态时才变化，供外部状态订阅比较使用。 */
  getSnapshot(): Readonly<S>;
  /** 注册 listener 并返回退订函数，使组件或事件拥有者能在离开时释放订阅。 */
  subscribe(listener: () => void): () => void;
  /** 在挂载后激活实例并恢复允许的输入草稿，重复调用应保持初始化幂等。 */
  activate(): void;
  /** 使实例失活并释放后台任务，按实现策略保存允许的输入数据。 */
  dispose(): void;
  actions: A;
}
/** 完整任务状态联合，用一个状态值表达生命周期，避免互相矛盾的运行标记。 */
export type TaskStatus = "idle" | "pending" | "running" | "success" | "failed" | "cancelled";
/** 控制器必需的任务、草稿和日志能力；具体浏览器实现由外层注入。 */
export type ControllerPorts = Readonly<{ tasks: TaskExecutor; drafts: DraftStore; logger: Logger }>;
/** 任务状态与统一错误的只读组合，供上层模型投影展示。 */
export type TaskSnapshot = Readonly<{ status: TaskStatus; error: AppError | null }>;
