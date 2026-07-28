import assert from "node:assert/strict";
import test from "node:test";
import { getPageHref, parseAppRoute } from "../app/app-routes.ts";

const toolIds = new Set(["json", "timestamp"]);
const pageIds = new Set(["sts2saveedit"]);

function isToolId(value) {
  return toolIds.has(value);
}

function isPageId(value) {
  return pageIds.has(value);
}

test("builds links for independent pages", () => {
  assert.equal(getPageHref("sts2saveedit", "/"), "/sts2saveedit/");
  assert.equal(
    getPageHref("sts2saveedit", "/RCtools"),
    "/RCtools/sts2saveedit/",
  );
});

test("parses home, tool and independent page routes", () => {
  assert.deepEqual(parseAppRoute("/", "/", isToolId, isPageId), {
    kind: "home",
  });
  assert.deepEqual(parseAppRoute("/json/", "/", isToolId, isPageId), {
    kind: "tool",
    toolId: "json",
  });
  assert.deepEqual(
    parseAppRoute("/sts2saveedit/", "/", isToolId, isPageId),
    { kind: "page", pageId: "sts2saveedit" },
  );
  assert.deepEqual(
    parseAppRoute("/RCtools/sts2saveedit", "/RCtools", isToolId, isPageId),
    { kind: "page", pageId: "sts2saveedit" },
  );
});

test("rejects unknown or malformed page routes", () => {
  for (const pathname of [
    "/other/",
    "/other/unknown/",
    "/other/sts2saveedit/details/",
    "/other/sts2saveedit/",
    "/sts2saveedit/details/",
    "/%E0%A4%A/",
  ]) {
    assert.deepEqual(parseAppRoute(pathname, "/", isToolId, isPageId), {
      kind: "invalid",
    });
  }
});
