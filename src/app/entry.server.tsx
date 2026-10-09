import { createReadableStreamFromReadable } from "@react-router/node";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
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
        onAllReady() {
          const body = new PassThrough();
          body.on("finish", () => clearTimeout(timer));
          headers.set("Content-Type", "text/html; charset=utf-8");
          resolve(new Response(createReadableStreamFromReadable(body), { status, headers }));
          pipe(body);
        },
        onShellError(error) {
          clearTimeout(timer);
          reject(error);
        },
        onError() {
          status = 500;
        },
      },
    );
    const timer = setTimeout(abort, 10_000);
  });
}
