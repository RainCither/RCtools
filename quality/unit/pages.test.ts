import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { flattenPages } from "../../build/flatten-pages.mts";
it("flattens a basename that matches a tool directory and preserves compiled assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "rctools-pages-"));
  try {
    const client = join(root, "dist/client");
    await mkdir(join(client, "json/json"), { recursive: true });
    await mkdir(join(client, "assets"));
    await writeFile(join(client, "index.html"), "fallback", "utf8");
    await writeFile(join(client, "json/index.html"), "home", "utf8");
    await writeFile(join(client, "json/json/index.html"), "tool", "utf8");
    await writeFile(join(client, "assets/app.js"), "asset", "utf8");
    await flattenPages(client, "/json/");
    expect(await readFile(join(client, "index.html"), "utf8")).toBe("home");
    expect(await readFile(join(client, "json/index.html"), "utf8")).toBe("tool");
    expect(await readFile(join(client, "assets/app.js"), "utf8")).toBe("asset");
    expect(
      (await readdir(join(root, "dist"))).filter((file) => file.startsWith(".pages-stage-")),
    ).toEqual([]);
  } finally {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !root.startsWith(join(tmpdir(), "rctools-pages-"))
    )
      throw new Error("Unsafe fixture path");
    await rm(root, { recursive: true, force: true });
  }
});
