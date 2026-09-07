import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

function includes(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("writer editing tools expose compact manuscript comfort controls", () => {
  const tools = source("src/features/writer/components/WriterEditingTools.tsx");
  const css = source("src/features/writer/writer-editing-tools.css");

  includes(tools, "Yazı araçları", "writer tools label");
  includes(tools, "Yazıyı küçült", "font size decrease control");
  includes(tools, "Yazıyı büyüt", "font size increase control");
  includes(tools, "Satır aralığını azalt", "line spacing decrease control");
  includes(tools, "Satır aralığını artır", "line spacing increase control");
  includes(tools, '<option value="book">Kitap</option>', "book manuscript width preset");
  includes(tools, '<option value="serif">Kitap</option>', "book serif preset");
  includes(tools, '<option value="vertical">Kaydır</option>', "scroll page view preset");
  includes(tools, '<option value="pageTurn">Sayfa Çevir</option>', "page-turn view preset");
  includes(tools, 'parsed.pageFlow === "sideBySide"', "legacy paired-view preference migration");
  includes(tools, "Yakınlaştırma oranı", "word-like zoom output");
  includes(tools, "zoom: clamp(preferences.zoom - 10, 50, 160)", "zoom-out step");
  includes(tools, "zoom: clamp(preferences.zoom + 10, 50, 160)", "zoom-in step");
  includes(tools, "screen.dataset.writerPageFlow", "page flow data hook");
  includes(tools, '"--writer-page-zoom"', "page zoom style hook");
  includes(tools, "WriterGoalStatistics", "daily goal statistics portal");
  includes(tools, "Günlük kelime hedefi", "daily goal statistics label");
  includes(tools, "spellcheck", "spellcheck control");
  includes(tools, "ilkoku.writer.preferences.v1", "local writer preference storage");

  includes(css, "--writer-manuscript-font-size", "font size CSS variable");
  includes(css, "--writer-manuscript-line-height", "line height CSS variable");
  includes(css, "--writer-manuscript-font-family", "font family CSS variable");
  includes(css, "--writer-manuscript-width", "manuscript width CSS variable");
  includes(css, "--writer-page-zoom", "page zoom CSS variable");
  includes(css, ".writer-context-bar > .writer-goal", "top daily goal removal");
  includes(css, ".writer-footer__goal", "daily goal statistics styling");
  includes(css, ".writer-screen.writer-screen--focus .writer-canvas", "focus manuscript width hook");
  includes(css, ".writer-editing-tools", "compact toolbar styling");
});

test("writer editing tools are mounted on every writer editing route", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);

    includes(layout, "WriterEditingTools", `${path} writer tools mount`);
    includes(layout, "writer-editing-tools.css", `${path} writer tools CSS`);
  }
});
