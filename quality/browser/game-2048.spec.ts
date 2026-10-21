/** @file 在桌面与手机浏览器验证 2048 的目录接入、控制、自动保存、触屏与异常恢复。 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const key = "toolbox:2048:v1";
const basePath = process.env.PAGES_BASE_PATH ?? "/";
const sitePath = (path: string) => `${basePath === "/" ? "" : basePath}${path}`;
const artifacts = resolve(process.env.QA_ARTIFACTS_DIR ?? resolve(tmpdir(), "rctools-quality"));
const errors = new WeakMap<Page, string[]>();

/** 固定局面用于验证真实输入后的结果；随机新块不会改变已合并位置的断言。 */
function savedGame(patch: Record<string, unknown> = {}) {
  return {
    version: 1,
    board: [2, 2, ...Array<number>(14).fill(0)],
    score: 0,
    bestScore: 0,
    won: false,
    keepPlaying: false,
    ...patch,
  };
}
/** 在当前源写入测试存档再直访工具，避免刷新脚本重复覆盖游戏自己保存的结果。 */
async function openGame(page: Page, saved: unknown = savedGame()) {
  await page.goto(sitePath("/"));
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), {
    key,
    saved,
  });
  await page.goto(sitePath("/2048/"));
  await expect(page.getByRole("grid", { name: "2048 棋盘" })).toHaveAttribute("aria-busy", "false");
}
/** 从实际渲染的格子读取棋盘，支持验证站内导航前后的恢复边界。 */
async function readBoard(page: Page) {
  return page
    .getByRole("gridcell")
    .evaluateAll((cells) => cells.map((cell) => Number(cell.getAttribute("data-value"))));
}
/** 方向按钮移入默认折叠的帮助后，只有用户展开才应参与操作和焦点导航。 */
async function openHelp(page: Page) {
  const help = page.locator("#game-2048-help");
  if ((await help.getAttribute("open")) === null) await help.locator("summary").click();
  await expect(help).toHaveAttribute("open", "");
}
/** 比较棋盘与页面内容的中心，避免移除侧栏后仍保留左侧列的偏移。 */
async function expectCenteredBoard(page: Page) {
  const board = await page.getByRole("grid", { name: "2048 棋盘" }).boundingBox();
  const content = await page.locator(".tool-page-content").boundingBox();
  if (!board || !content) throw new Error("棋盘或页面内容尚未进入布局。");
  expect(Math.abs(board.x + board.width / 2 - content.x - content.width / 2)).toBeLessThan(1);
}

test.beforeEach(({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:"))
      messages.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

/** 游戏分类、搜索和返回来源由现有目录机制提供，不依赖专用路由登记。 */
test("2048 appears under games and preserves the catalog filter", async ({ page }) => {
  await page.goto(sitePath("/"));
  await page.getByRole("button", { name: "游戏", exact: true }).click();
  // 分类通过路由更新，等选中状态提交后再搜索，避免两次导航在测试中互相覆盖。
  await expect(page.getByRole("button", { name: "游戏", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("textbox", { name: "搜索工具" }).fill("2048");
  await expect(page.locator(".tool-grid .tool-card")).toHaveCount(1);
  await page.locator("#tool-card-2048").click();
  await expect(page).toHaveTitle("2048｜工具匣");
  await expect(page.getByRole("gridcell")).toHaveCount(16);
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await expect(page.getByRole("textbox", { name: "搜索工具" })).toHaveValue("2048");
  await expect(page.getByRole("button", { name: "游戏", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

/** 局部键盘操作、无效操作和组合键不干扰页面；有效移动立即写入可刷新的棋局。 */
test("keyboard play, reload, navigation and restart preserve the right state", async ({ page }) => {
  await openGame(page);
  await page.getByRole("link", { name: "返回全部工具" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("当前得分", { exact: true })).toHaveText("0");
  const grid = page.getByRole("grid", { name: "2048 棋盘" });
  await grid.focus();
  // 等待路由初始化的帧回调结束，确认它不会夺走用户主动选择的棋盘焦点。
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(grid).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("当前得分", { exact: true })).toHaveText("4");
  await expect(page.getByRole("gridcell").first()).toHaveAttribute("data-value", "4");
  const current = await readBoard(page);
  await page.keyboard.press("Control+ArrowRight");
  expect(await readBoard(page)).toEqual(current);
  await page.reload();
  await expect(grid).toHaveAttribute("aria-busy", "false");
  expect(await readBoard(page)).toEqual(current);
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await page.locator("#tool-card-2048").click();
  await expect(grid).toHaveAttribute("aria-busy", "false");
  expect(await readBoard(page)).toEqual(current);
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  await expect(page.getByLabel("当前得分", { exact: true })).toHaveText("0");
  await expect(page.getByLabel("最高分", { exact: true })).toHaveText("4");
  expect((await readBoard(page)).filter(Boolean)).toHaveLength(2);
});

/** WASD 与屏幕按钮使用相同动作，并在操作后把焦点交还棋盘。 */
test("WASD and direction buttons move the board", async ({ page }) => {
  await openGame(page);
  const grid = page.getByRole("grid", { name: "2048 棋盘" });
  await grid.focus();
  await page.keyboard.press("a");
  await expect(page.getByLabel("当前得分", { exact: true })).toHaveText("4");
  const current = await readBoard(page);
  await openHelp(page);
  await page.getByRole("button", { name: "向右移动", exact: true }).click();
  await expect(grid).toBeFocused();
  expect(await readBoard(page)).not.toEqual(current);
});

/** 获胜时暂停操作，选择继续后刷新仍可挑战，不重复显示胜利遮罩。 */
test("victory pauses once and continued play survives refresh", async ({ page }) => {
  await openGame(page, savedGame({ board: [1024, 1024, ...Array<number>(14).fill(0)] }));
  await openHelp(page);
  await page.getByRole("button", { name: "向左移动", exact: true }).click();
  await expect(page.getByRole("group", { name: "游戏胜利" })).toBeVisible();
  await expect(page.getByLabel("当前得分", { exact: true })).toHaveText("2048");
  await page.reload();
  await expect(page.getByRole("group", { name: "游戏胜利" })).toBeVisible();
  await page.getByRole("button", { name: "继续挑战", exact: true }).click();
  await expect(page.getByRole("group", { name: "游戏胜利" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("grid", { name: "2048 棋盘" })).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("group", { name: "游戏胜利" })).toHaveCount(0);
  await openHelp(page);
  await expect(page.getByRole("button", { name: "向右移动", exact: true })).toBeEnabled();
});

/** 结束棋局恢复遮罩，损坏棋局保留合法最高分并重新开局。 */
test("finished and malformed saves have recoverable Chinese states", async ({ page }) => {
  await openGame(
    page,
    savedGame({
      board: [2, 4, 8, 16, 16, 8, 4, 2, 2, 4, 8, 16, 16, 8, 4, 2],
      score: 128,
      bestScore: 256,
    }),
  );
  await expect(page.getByRole("group", { name: "游戏结束" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("group", { name: "游戏结束" })).toBeVisible();
  await page.getByRole("button", { name: "再来一局", exact: true }).click();
  await expect(page.getByLabel("最高分", { exact: true })).toHaveText("256");
  await openGame(page, savedGame({ board: [3], bestScore: 512 }));
  await expect(page.getByText("存档中的棋局无效，已重新开始并保留有效最高分。")).toBeVisible();
  await expect(page.getByLabel("最高分", { exact: true })).toHaveText("512");
  expect((await readBoard(page)).filter(Boolean)).toHaveLength(2);
});

/** 浏览器存储被禁用也能玩，站内往返恢复页面内副本并明确提示持久化限制。 */
test("blocked storage degrades to memory without breaking play", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await page.goto(sitePath("/2048/"));
  const grid = page.getByRole("grid", { name: "2048 棋盘" });
  await expect(grid).toHaveAttribute("aria-busy", "false");
  await expect(
    page.getByText("浏览器暂时无法保存进度，当前仅在本页面保留，刷新或关闭后可能丢失。"),
  ).toBeVisible();
  await grid.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowLeft");
  const current = await readBoard(page);
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await page.locator("#tool-card-2048").click();
  await expect(grid).toHaveAttribute("aria-busy", "false");
  expect(await readBoard(page)).toEqual(current);
});

/** 使用 Chromium 的真实触摸输入通道，验证浏览器产生的 PointerEvent 而非手工派发事件。 */
test("mobile touch swipes merge tiles while taps do not move", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(!isMobile, "真实滑动在手机触摸设备上验证。");
  await openGame(page);
  const grid = page.getByRole("grid", { name: "2048 棋盘" });
  const box = await grid.boundingBox();
  if (!box) throw new Error("棋盘尚未进入可交互布局。");
  const session = await context.newCDPSession(page);
  const y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width * 0.8, y }],
  });
  for (let step = 1; step <= 5; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: box.x + box.width * (0.8 - step * 0.12), y }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
  await expect(page.getByLabel("当前得分", { exact: true })).toHaveText("4");
  const current = await readBoard(page);
  await page.touchscreen.tap(box.x + box.width / 2, y);
  expect(await readBoard(page)).toEqual(current);
});

/** 保存桌面与手机截图，并检查 320 像素布局、页面身份、无错误遮罩与许可静态资源。 */
test("2048 layout, accessibility states and attribution render correctly", async ({
  page,
  request,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openGame(
    page,
    savedGame({
      board: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 0, 0, 0, 0, 0, 0],
      score: 1024,
      bestScore: 2048,
    }),
  );
  await expect(page).toHaveTitle("2048｜工具匣");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("2048");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await expect(page.getByRole("gridcell")).toHaveCount(16);
  const help = page.locator("#game-2048-help");
  await expect(help).not.toHaveAttribute("open");
  await expect(help.getByText("向一个方向移动", { exact: true })).not.toBeVisible();
  await expect(help.locator("button").first()).not.toBeVisible();
  await expectCenteredBoard(page);
  await expect(page.getByText("当前得分 1024，合并相同数字，向 2048 前进。")).toHaveAttribute(
    "role",
    "status",
  );
  const license = await request.get(sitePath("/licenses/2048-MIT.txt"));
  expect(license.ok()).toBe(true);
  expect(await license.text()).toContain("Copyright (c) 2014 Gabriele Cirulli");
  await page.screenshot({
    path: resolve(artifacts, `2048-${info.project.name}.png`),
    fullPage: true,
  });
  const current = await readBoard(page);
  await openHelp(page);
  await expect(page.getByRole("heading", { name: "玩法说明", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "移动方向" })).toBeVisible();
  expect(await readBoard(page)).toEqual(current);
  await help.locator("summary").click();
  await expect(help.getByText("向一个方向移动", { exact: true })).not.toBeVisible();
  if (info.project.name === "desktop") {
    await page.setViewportSize({ width: 1087, height: 1290 });
    await expectCenteredBoard(page);
    await page.screenshot({ path: resolve(artifacts, "2048-centered.png"), fullPage: true });
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await expectCenteredBoard(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const grid = page.getByRole("grid", { name: "2048 棋盘" });
  await expect(grid).toHaveCSS("touch-action", "none");
  await expect(grid.locator("[data-value='1024'] > span")).toHaveCSS("animation-name", "none");
});
