import { spawn } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const basePath = process.env.PAGES_BASE_PATH ?? "/RCtools";

if (!basePath.startsWith("/") || basePath.endsWith("/")) {
  throw new Error("PAGES_BASE_PATH must start with / and must not end with /.");
}

const vinextCli = resolve(root, "node_modules", "vinext", "dist", "cli.js");

await new Promise((resolveBuild, rejectBuild) => {
  const child = spawn(process.execPath, [vinextCli, "build"], {
    cwd: root,
    env: { ...process.env, PAGES_BASE_PATH: basePath },
    stdio: "inherit",
  });

  child.on("error", rejectBuild);
  child.on("exit", (code) => {
    if (code === 0) resolveBuild();
    else rejectBuild(new Error(`vinext build exited with code ${code}`));
  });
});

const dist = resolve(root, "dist");
const output = resolve(root, "pages-dist");
const workerUrl = `${pathToFileURL(resolve(dist, "server", "ssr", "index.js")).href}?pages=${Date.now()}`;
const { default: worker } = await import(workerUrl);
const response = await worker.fetch(
  new Request(`http://localhost${basePath}/`),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Static render failed with ${response.status} ${response.statusText}`);
}

let html = await response.text();
html = html
  .replaceAll('"/assets/', `"${basePath}/assets/`)
  .replaceAll("'/assets/", `'${basePath}/assets/`)
  .replaceAll('"/favicon.svg"', `"${basePath}/favicon.svg"`)
  .replaceAll("'/favicon.svg'", `'${basePath}/favicon.svg'`)
  .replaceAll('\\"/favicon.svg\\"', `\\"${basePath}/favicon.svg\\"`);

await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });
await cp(resolve(dist, "client", "assets"), resolve(output, "assets"), {
  recursive: true,
});
await cp(resolve(root, "public", "favicon.svg"), resolve(output, "favicon.svg"));
await writeFile(resolve(output, "index.html"), html, "utf8");
await writeFile(resolve(output, ".nojekyll"), "", "utf8");

console.log(`GitHub Pages files generated in ${output}`);
