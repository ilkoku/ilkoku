import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-features=WebMCP"],
});
try {
  const version = browser.version();
  console.log("WEBMCP_BROWSER_VERSION", version);
  const major = Number(version.split(".")[0]);
  assert.ok(major >= 155, "Native probe requires Chrome 155+ for object input");
  const page = await browser.newPage();
  const response = await page.goto("https://ilkoku.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
  assert.equal(response?.status(), 200);
  const native = await page.evaluate(() => {
    const context = document.modelContext;
    return {
      secure: window.isSecureContext,
      registration: typeof context?.registerTool,
      discovery: typeof context?.getTools,
      invocation: typeof context?.executeTool,
    };
  });
  console.log("WEBMCP_NATIVE_SURFACE", JSON.stringify(native));
  assert.deepEqual(native, { secure: true, registration: "function", discovery: "function", invocation: "function" }, "Native browser API unavailable; not an application test result");
  const expected = ["ilkoku_get_platform_info", "ilkoku_list_public_resources"];
  // Keep discovery, readiness and execution in the same browser evaluation.
  // A waitForFunction followed by a separate evaluate can race document changes.
  const result = await page.evaluate(async (names) => {
    const deadline = performance.now() + 20000;
    const snapshots = [];
    let selected = [];
    let stable = 0;
    while (performance.now() < deadline) {
      const tools = await document.modelContext.getTools();
      selected = Array.from(tools).filter(t => names.includes(t.name));
      const found = selected.map(t => t.name).sort();
      if (snapshots.at(-1)?.join(",") !== found.join(",")) snapshots.push(found);
      if (names.every(name => found.includes(name))) {
        stable += 1;
        if (stable === 3) break;
      } else stable = 0;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    const metadata = selected.map(t => ({ name: t.name, readOnly: t.annotations?.readOnlyHint }));
    const outputs = {};
    const errors = {};
    if (stable === 3) {
      for (const name of names) {
        const tool = selected.find(t => t.name === name);
        try {
          const value = await document.modelContext.executeTool(tool, {});
          outputs[name] = typeof value === "string" ? JSON.parse(value) : value;
        } catch (error) {
          errors[name] = String(error);
        }
      }
    }
    return { tools: metadata, outputs, errors, snapshots, stable };
  }, expected);
  assert.equal(result.stable, 3, "Both tools must remain discoverable across three consecutive native snapshots: " + JSON.stringify(result.snapshots));
  assert.deepEqual(result.errors, {}, "Native invocation errors: " + JSON.stringify(result.errors));
  console.log("WEBMCP_NATIVE_RESULT", JSON.stringify(result));
  assert.deepEqual(result.tools.map(t=>t.name).sort(), ["ilkoku_get_platform_info","ilkoku_list_public_resources"]);
  assert.ok(result.tools.every(t=>t.readOnly === true));
  const info = result.outputs.ilkoku_get_platform_info;
  assert.equal(info.name, "İlkOku");
  assert.equal(info.roles.length,4);
  const links = result.outputs.ilkoku_list_public_resources.resources;
  assert.equal(links.length,14);
  assert.ok(links.every(x=>new URL(typeof x === "string" ? x : x.url).origin==="https://ilkoku.com"));
  console.log("WEBMCP_NATIVE_PASS");
} finally {
  await browser.close();
}
