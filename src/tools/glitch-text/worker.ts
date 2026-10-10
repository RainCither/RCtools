/** @file 检查最多 2,000 个输入字素，在后台注入随机源调用生成算法并返回结果。 */
import { serveWorker } from "../../contracts/worker";
import type { GlitchMarkPlacement, GlitchMarkRange, NoiseRange } from "./core";
import { generateGlitchTextResult, countGraphemes, MAX_INPUT_GRAPHEMES } from "./core";
import { failure } from "../../contracts/result";
serveWorker(
  {
    /** 把后台线程的消息交给 listener，由统一 Worker 协议继续校验并分派任务。 */
    listen(listener) {
      self.onmessage = (event) => listener(event.data);
    },
    /** 将统一协议生成的 message 返回主线程，保留任务与输入版本标识。 */
    send(message) {
      self.postMessage(message);
    },
  },
  (_operation, input) => {
    const data = input as {
      input: string;
      range: NoiseRange;
      placements: GlitchMarkPlacement[];
      ranges: GlitchMarkRange[];
      cjkCompatible: boolean;
    };
    if (countGraphemes(data.input) > MAX_INPUT_GRAPHEMES)
      throw failure(
        "validation",
        "glitch-text.size",
        `输入不能超过 ${MAX_INPUT_GRAPHEMES} 个字素。`,
      );
    return generateGlitchTextResult(data.input, data.range, {
      placements: data.placements,
      ranges: data.ranges,
      cjkCompatible: data.cjkCompatible,
      random: Math.random,
    });
  },
);
