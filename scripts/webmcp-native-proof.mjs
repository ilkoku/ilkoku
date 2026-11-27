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
  await page.waitForFunction(async () => {
    const tools = await document.modelContext.getTools();
    return ["ilkoku_get_platform_info","ilkoku_list_public_resources"].every(name => tools.some(tool => tool.name === name));
  }, { timeout: 20000 }, { timeout: 25000 });
  const result = await page.evaluate(async () => {
    const context = document.modelContext;
    const tools = await context.getTools();
    const selected = tools.filter(t => t.name.startsWith("ilkoku_"));
    const outputs = {};
    for (const tool of selected) {
      const value = await context.executeTool(tool, {});
      outputs[tool.name] = typeof value === "string" ? JSON.parse(value) : value;
    }
    return { tools: selected.map(t => ({name:t.name,readOnly:t.annotations?.readOnlyHint})), outputs };
  });
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
