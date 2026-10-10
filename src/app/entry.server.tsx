/** @file 构建时预渲染的 HTML 响应入口。负责流式渲染、响应编码、错误状态和超时清理。 */
import { createReadableStreamFromReadable } from "@react-router/node";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
/** 按 request 与路由 context 生成 HTML 响应，使用 status 和 headers 返回渲染结果并处理超时。 */
export default function handleRequest(
  request: Request,
  status: number,
  headers: Headers,
  context: EntryContext,
) {
  return new Promise<Response>((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={context} url={request.url} />,
      {
        /** 待预渲染内容完整后连接输出流并返回 UTF-8 HTML 响应，确保静态页面包含完整目录。 */
        onAllReady() {
          const body = new PassThrough();
          body.on("finish", () => clearTimeout(timer));
          headers.set("Content-Type", "text/html; charset=utf-8");
          resolve(new Response(createReadableStreamFromReadable(body), { status, headers }));
          pipe(body);
        },
        /** 基础页面无法生成时清理超时并拒绝响应 Promise，让构建发现渲染失败。 */
        onShellError(error) {
          clearTimeout(timer);
          reject(error);
        },
        /** 将渲染过程错误反映为失败状态，供最终响应和构建判断使用。 */
        onError() {
          status = 500;
        },
      },
    );
    // 渲染失败或流结束会清理计时器，超时则中止尚未完成的预渲染。
    const timer = setTimeout(abort, 10_000);
  });
}
