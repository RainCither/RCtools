import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
const tools = readdirSync("src/tools").map(
  (id) =>
    JSON.parse(readFileSync(`src/tools/${id}/tool.json`, "utf8")) as { id: string; title: string },
);
const artifacts = resolve(process.env.QA_ARTIFACTS_DIR ?? resolve(tmpdir(), "rctools-quality"));
const catalogSize =
  tools.length + (JSON.parse(readFileSync("src/catalog/links.json", "utf8")) as unknown[]).length;
const qualityErrors = new WeakMap<Page, string[]>();
const basePath = process.env.PAGES_BASE_PATH ?? "/";
const sitePath = (path: string) => `${basePath === "/" ? "" : basePath}${path}`;
async function ready(page: Page, id: string) {
  await page.goto(sitePath(`/${id}/`));
  await expect(page.locator(".tool-form")).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:"))
      errors.push(message.text());
  });
  // Browser exceptions are asserted by each test's teardown, including hydration.
  qualityErrors.set(page, errors);
});
test.afterEach(async ({ page }) => {
  expect(qualityErrors.get(page)).toEqual([]);
});
test("modifier link opens a separate tab while preserving the catalog filter", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "Modifier keys are checked with the desktop keyboard.");
  await page.goto(sitePath("/"));
  await page.getByRole("textbox", { name: "搜索工具" }).fill("JSON");
  const opened = context.waitForEvent("page");
  await page.locator("#tool-card-json").click({ modifiers: ["Control"] });
  const popup = await opened;
  await expect(popup.locator("#json-input")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "搜索工具" })).toHaveValue("JSON");
  await popup.close();
});
for (const tool of tools)
  test(`${tool.id}: direct visit and refresh`, async ({ page }) => {
    await ready(page, tool.id);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(tool.title);
    await expect(page).toHaveTitle(`${tool.title}｜工具匣`);
    await page.reload();
    await expect(page.locator(".tool-form")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
test("catalog, filtering, navigation, draft and refresh boundaries", async ({ page }) => {
  await page.goto(sitePath("/"));
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(catalogSize);
  await page.getByRole("button", { name: "开发", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索工具" }).fill("JSON");
  await expect(page.locator("#tool-card-json")).toBeVisible();
  await page.locator("#tool-card-json").click();
  await expect(page.locator("#json-input")).toBeVisible();
  await page.locator("#json-input").fill('{"privateDraft":42}');
  await page.getByRole("button", { name: "格式化", exact: true }).click();
  await expect(page.locator("#json-output")).toHaveValue(/privateDraft/);
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await expect(page.getByRole("textbox", { name: "搜索工具" })).toHaveValue("JSON");
  await expect(page.locator("#tool-card-json")).toBeFocused();
  await expect(page.getByRole("button", { name: "开发", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#tool-card-json").click();
  await expect(page.locator("#json-input")).toHaveValue('{"privateDraft":42}');
  await page.reload();
  await expect(page.locator("#json-input")).not.toHaveValue('{"privateDraft":42}');
});
test("code formatter workers and Base64", async ({ page }) => {
  for (const [id, input, expected] of [
    ["css-formatter", "a { color: red; }", "color"],
    ["js-formatter", "const number = 1;", "number"],
    ["html-formatter", "<div>hello <b>world</b></div>", "world"],
  ]) {
    if (!id || !input || !expected) throw new Error("Missing case");
    await ready(page, id);
    await page.locator(`#${id}-input`).fill(input);
    await page.getByRole("button", { name: "格式化", exact: true }).click();
    await expect(page.locator(`#${id}-output`)).toHaveValue(new RegExp(expected));
  }
  await ready(page, "base64");
  await page.locator("#base64-input").fill("中文");
  await page.getByRole("button", { name: "编码", exact: true }).click();
  await expect(page.locator("#base64-output")).toHaveValue("5Lit5paH");
});
test("hash bytes and non-retained files", async ({ page }) => {
  await ready(page, "md5");
  await page.locator("#md5-input").fill("abc");
  await page.getByRole("button", { name: "计算 MD5", exact: true }).click();
  await expect(page.locator("output")).toHaveText("900150983cd24fb0d6963f7d28e17f72");
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page
    .locator("#md5-file")
    .setInputFiles({ name: "sample.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
  await page.getByRole("button", { name: "计算文件 MD5", exact: true }).click();
  await expect(page.locator("output")).toHaveText("900150983cd24fb0d6963f7d28e17f72");
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await page
    .locator(".tool-grid")
    .getByRole("link", { name: "打开MD5 加密与校验", exact: true })
    .click();
  await expect(page.locator("#md5-file")).toBeVisible();
  expect(
    await page.locator("#md5-file").evaluate((input) => (input as HTMLInputElement).files?.length),
  ).toBe(0);
});
test("unavailable worker has a recoverable Chinese error", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "Worker", { value: undefined }));
  await ready(page, "base64");
  await page.locator("#base64-input").fill("abc");
  await page.getByRole("button", { name: "编码", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("无法启动后台计算");
});
test("failed view import exposes bounded retry and diagnostics", async ({ page }) => {
  await page.route("**/assets/view-*.js", (route) => route.abort());
  await page.goto(sitePath("/json/"));
  await expect(page.getByRole("alert")).toContainText("工具资源加载失败");
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("资源仍未能加载");
  await expect(page.getByRole("button", { name: "复制诊断信息" })).toBeVisible();
});
test("storage unavailable, unknown path and keyboard navigation", async ({ page, isMobile }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    }),
  );
  await page.goto(sitePath("/unknown-tool/"));
  await expect(page.getByRole("textbox", { name: "搜索工具" })).toBeVisible();
  if (!isMobile) {
    await page.keyboard.press("/");
    await expect(page.getByRole("textbox", { name: "搜索工具" })).toBeFocused();
  }
  await page.getByRole("textbox", { name: "搜索工具" }).fill("颜色");
  await page.getByRole("link", { name: "打开颜色转换", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("textbox", { name: "搜索工具" })).toHaveValue("颜色");
});
test("screenshots of catalog and worker tool", async ({ page }, info) => {
  await page.goto(sitePath("/"));
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(catalogSize);
  await page.screenshot({
    path: resolve(artifacts, `catalog-${info.project.name}.png`),
    fullPage: true,
  });
  await ready(page, "json");
  await page.getByRole("button", { name: "格式化", exact: true }).click();
  await expect(page.locator("#json-output")).not.toHaveValue("");
  await page.screenshot({
    path: resolve(artifacts, `json-${info.project.name}.png`),
    fullPage: true,
  });
});
test("regex timeout, explicit cancel, edits and navigation release workers", async ({ page }) => {
  await ready(page, "regex");
  await page.locator("#regex-source").fill("a".repeat(32) + "!");
  const started = page.waitForEvent("worker");
  await page.locator("#regex-pattern").fill("(a+)+$");
  await started;
  await page.getByRole("button", { name: "取消计算", exact: true }).click();
  await expect(page.locator("#regex-status")).toContainText("已取消");
  await expect.poll(() => page.workers().length).toBe(0);
  await page.locator("#regex-pattern").fill("(a+)+!$");
  await expect(page.locator("#regex-status")).toContainText("找到");
  await page.locator("#regex-pattern").fill("(a+)+$");
  await expect(page.locator("#regex-status")).toContainText("超过 2 秒");
  await expect.poll(() => page.workers().length).toBe(0);
  const restarted = page.waitForEvent("worker");
  await page.locator("#regex-source").fill("a".repeat(33) + "!");
  await restarted;
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await expect(page.getByRole("heading", { name: "全部工具", exact: true })).toBeVisible();
  await expect.poll(() => page.workers().length).toBe(0);
});
test("password forgets values and formatters clear instead of restoring samples", async ({
  page,
}) => {
  await ready(page, "password");
  await page.getByRole("button", { name: "生成密码", exact: true }).click();
  const password = page.getByLabel("生成的密码");
  await expect(password).not.toHaveText("点击“生成密码”开始");
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await page.locator(".tool-grid").getByRole("link", { name: "打开密码生成", exact: true }).click();
  await expect(password).toHaveText("点击“生成密码”开始");
  await ready(page, "json");
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await expect(page.locator("#json-input")).toHaveValue("");
  await page.locator("#json-input").fill("{bad");
  await page.getByRole("button", { name: "格式化", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("JSON 语法无效");
  await expect(page.locator("#json-input")).toHaveAttribute("aria-invalid", "true");
});
test("text statistics, precise bases, glitch output and SHA workers", async ({ page }) => {
  await ready(page, "text-stats");
  await page.locator("#stats-input").fill("中文\nword");
  await expect(page.locator(".tool-form strong").first()).toHaveText("7");
  await ready(page, "base-converter");
  await page.locator("#base-converter-input").fill("9007199254740993");
  await expect(page.locator(".tool-form")).toContainText("20000000000001");
  await ready(page, "glitch-text");
  await page.locator("#glitch-text-input").fill("中文🙂");
  await page.getByRole("button", { name: "生成故障文字", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("已处理");
  await ready(page, "sha");
  await page.locator("#sha-input").fill("abc");
  await page.getByRole("button", { name: "计算 SHA-256", exact: true }).click();
  await expect(page.locator("output")).toHaveText(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
test("time difference keyboard rows and clear focus", async ({ page }) => {
  await ready(page, "time-diff");
  await page.locator("#time-diff-input-continuous-1").fill("23:59");
  await page.locator("#time-diff-input-continuous-2").fill("00:01");
  await expect(page.locator(".tool-form")).toContainText("00:02");
  await page.locator("#time-diff-input-continuous-2").press("Tab");
  await expect(page.locator("#time-diff-input-continuous-3")).toBeFocused();
  await page.getByRole("button", { name: "清空时间", exact: true }).click();
  await expect(page.locator("#time-diff-input-continuous-1")).toHaveValue("");
  await expect(page.locator("#time-diff-input-continuous-1")).toBeFocused();
});
test("render boundary resets the tool and copies sanitized diagnostics", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        async writeText(value: string) {
          (globalThis as typeof globalThis & { qualityDiagnostics: string }).qualityDiagnostics =
            value;
        },
      },
    }),
  );
  await page.route("**/assets/view-*.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export default function Broken(){if(!globalThis.qualityRecovered)throw new Error("private-input-and-file.txt");return "恢复完成"}',
    }),
  );
  await page.goto(sitePath("/json/"));
  await expect(page.getByRole("alert")).toContainText("工具界面发生异常");
  await page.getByRole("button", { name: "复制诊断信息" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (globalThis as typeof globalThis & { qualityDiagnostics: string }).qualityDiagnostics,
      ),
    )
    .toContain("tool.render.failed");
  const diagnostics = await page.evaluate(
    () => (globalThis as typeof globalThis & { qualityDiagnostics: string }).qualityDiagnostics,
  );
  expect(diagnostics).not.toContain("private-input");
  expect(
    (JSON.parse(diagnostics) as { event: string }[]).filter(
      (event) => event.event === "tool.render.failed",
    ),
  ).toHaveLength(1);
  await page.evaluate(() => {
    (globalThis as typeof globalThis & { qualityRecovered: boolean }).qualityRecovered = true;
  });
  await page.getByRole("button", { name: "重置工具" }).click();
  await expect(page.getByText("恢复完成", { exact: true })).toBeVisible();
});
