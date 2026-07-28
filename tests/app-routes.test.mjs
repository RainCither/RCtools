import assert from "node:assert/strict";
import test from "node:test";
import {
  getOtherPageHref,
  parseAppRoute,
} from "../app/app-routes.ts";

const toolIds = new Set(["json", "timestamp"]);
const otherPageIds = new Set(["sts2savecheat"]);

function isToolId(value) {
  return toolIds.has(value);
}

function isOtherPageId(value) {
  return otherPageIds.has(value);
}

test("builds links for independent other pages", () => {
  assert.equal(
    getOtherPageHref("sts2savecheat", "/"),
    "/other/sts2savecheat/",
  );
  assert.equal(
    getOtherPageHref("sts2savecheat", "/RCtools"),
    "/RCtools/other/sts2savecheat/",
  );
});

test("parses home, tool and independent other-page routes", () => {
  assert.deepEqual(
    parseAppRoute("/", "/", isToolId, isOtherPageId),
    { kind: "home" },
  );
  assert.deepEqual(
    parseAppRoute("/json/", "/", isToolId, isOtherPageId),
    { kind: "tool", toolId: "json" },
  );
  assert.deepEqual(
    parseAppRoute(
      "/other/sts2savecheat/",
      "/",
      isToolId,
      isOtherPageId,
    ),
    { kind: "other-page", pageId: "sts2savecheat" },
  );
  assert.deepEqual(
    parseAppRoute(
      "/RCtools/other/sts2savecheat",
      "/RCtools",
      isToolId,
      isOtherPageId,
    ),
    { kind: "other-page", pageId: "sts2savecheat" },
  );
});

test("rejects unknown or malformed other-page routes", () => {
  for (const pathname of [
    "/other/",
    "/other/unknown/",
    "/other/sts2savecheat/details/",
    "/other/%E0%A4%A/",
  ]) {
    assert.deepEqual(
      parseAppRoute(pathname, "/", isToolId, isOtherPageId),
      { kind: "invalid" },
    );
  }
});
