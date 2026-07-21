import assert from "node:assert/strict";
import test from "node:test";
import {
  getHomeHref,
  getToolHref,
  normalizeBasePath,
  parseToolRoute,
} from "../app/tool-routes.ts";

const toolIds = new Set(["json", "timestamp", "ieee-754"]);

function isToolId(value) {
  return toolIds.has(value);
}

test("normalizes root and repository base paths", () => {
  assert.equal(normalizeBasePath("/"), "/");
  assert.equal(normalizeBasePath("/RCtools"), "/RCtools/");
  assert.equal(normalizeBasePath("RCtools/"), "/RCtools/");
  assert.equal(getHomeHref("/RCtools"), "/RCtools/");
  assert.equal(getToolHref("json", "/"), "/json/");
  assert.equal(getToolHref("json", "/RCtools"), "/RCtools/json/");
});

test("parses home and known tool routes with optional trailing slashes", () => {
  assert.deepEqual(parseToolRoute("/", "/", isToolId), { kind: "home" });
  assert.deepEqual(parseToolRoute("/json", "/", isToolId), {
    kind: "tool",
    toolId: "json",
  });
  assert.deepEqual(parseToolRoute("/json/", "/", isToolId), {
    kind: "tool",
    toolId: "json",
  });
  assert.deepEqual(parseToolRoute("/RCtools", "/RCtools", isToolId), {
    kind: "home",
  });
  assert.deepEqual(
    parseToolRoute("/RCtools/ieee-754/", "/RCtools", isToolId),
    { kind: "tool", toolId: "ieee-754" },
  );
});

test("rejects unknown, malformed and nested routes", () => {
  for (const pathname of [
    "/unknown/",
    "/json/details/",
    "/other/json/",
    "/%E0%A4%A/",
  ]) {
    assert.deepEqual(parseToolRoute(pathname, "/", isToolId), {
      kind: "invalid",
    });
  }
  assert.deepEqual(parseToolRoute("/json/", "/RCtools", isToolId), {
    kind: "invalid",
  });
});
