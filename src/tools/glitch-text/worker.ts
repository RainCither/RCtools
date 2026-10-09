import { serveWorker } from "../../contracts/worker";
import type { GlitchMarkPlacement, GlitchMarkRange, NoiseRange } from "./core";
import { generateGlitchTextResult, countGraphemes, MAX_INPUT_GRAPHEMES } from "./core";
import { failure } from "../../contracts/result";
serveWorker(
  {
    listen(listener) {
      self.onmessage = (event) => listener(event.data);
    },
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
