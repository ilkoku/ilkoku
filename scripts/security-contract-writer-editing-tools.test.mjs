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
  includes(tools, 'pageFlow: "pageTurn"', "book view default");
  includes(tools, '<option value="pageTurn">Kitap</option>', "book page-turn view preset");
  includes(tools, '<option value="vertical">Kağıt</option>', "paper scrolling view preset");
  includes(tools, 'LEGACY_STORAGE_KEY = "ilkoku.writer.preferences.v1"', "legacy writer preference storage");
  includes(tools, 'STORAGE_KEY = "ilkoku.writer.preferences.v2"', "current writer preference storage");
  includes(tools, "legacyRaw", "legacy writer view migration");
  includes(tools, "Yakınlaştırma oranı", "word-like zoom output");
  includes(tools, "zoom: clamp(preferences.zoom - 10, 50, 160)", "zoom-out step");
  includes(tools, "zoom: clamp(preferences.zoom + 10, 50, 160)", "zoom-in step");
  includes(tools, "screen.dataset.writerPageFlow", "page flow data hook");
  includes(tools, '"--writer-page-zoom"', "page zoom style hook");
  includes(tools, "WriterGoalStatistics", "daily goal statistics portal");
  includes(tools, "Günlük kelime hedefi", "daily goal statistics label");
  includes(tools, "spellcheck", "spellcheck control");

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

test("writer text commands provide safe plain-text editing foundations", () => {
  const commands = source("src/features/writer/components/WriterTextEditingCommands.tsx");
  const css = source("src/features/writer/writer-text-editing-commands.css");

  includes(commands, "Geri al", "undo control");
  includes(commands, "Yinele", "redo control");
  includes(commands, "Bul / Değiştir", "find and replace control");
  includes(commands, "Tümünü Değiştir", "replace all control");
  includes(commands, "Sahne Ayracı", "scene divider control");
  includes(commands, "Seçili metin istatistikleri", "selection statistics output");
  includes(commands, "normalizePastedText", "plain-text paste normalization");
  includes(commands, "HISTORY_LIMIT = 100", "bounded undo history");
  includes(commands, ".writer-canvas > .writer-textarea", "canonical manuscript source");
  includes(commands, ".writer-manuscript-pages .writer-page-textarea", "paged manuscript selection bridge");
  includes(css, ".writer-find-replace", "find and replace panel styling");
  includes(css, ".writer-selection-stats", "selection statistics styling");
});

test("writer editing tools are mounted on every writer editing route", () => {
  const shared = source("src/features/writer/components/WriterRouteEnhancers.tsx");

  includes(shared, "WriterEditingTools", "shared writer tools mount");
  includes(shared, "WriterRichTextFormattingTools", "shared rich formatting mount");
  includes(shared, "WriterTextEditingCommands", "shared text commands mount");
  includes(shared, "WriterPagedManuscriptEnhancer", "shared paged manuscript mount");

  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);

    includes(layout, "WriterRouteEnhancers", `${path} shared writer enhancer mount`);
    includes(layout, "writer-editing-tools.css", `${path} writer tools CSS`);
    includes(layout, "writer-text-editing-commands.css", `${path} text commands CSS`);
    includes(layout, "writer-rich-text-formatting.css", `${path} rich text CSS`);
  }
});

test("reader manuscript keeps canonical writer paper typography and measured pages", () => {
  const reader = source("src/features/reading/components/FocusedReadingExperience.tsx");
  const indicator = source("src/features/reading/components/ReadingPageIndicator.tsx");
  const parity = source("src/features/reading/components/ReaderPublicationParity.module.css");

  includes(reader, "ReadingPageIndicator", "measured reader page indicator");
  includes(reader, "parityStyles.publicationParity", "reader manuscript parity scope");
  assert.ok(
    !reader.includes("Tahmini kitap sayfası"),
    "reader header must not expose word-count page estimates",
  );

  includes(indicator, "viewport.scrollHeight / height", "real reader page measurement");
  includes(indicator, "viewport.scrollTop / height", "current reader page measurement");
  includes(indicator, "Kitap sayfası", "reader page status label");

  includes(parity, '"Courier New"', "canonical typewriter family");
  includes(parity, "--reader-manuscript-font-size: 17px", "canonical 17px manuscript size");
  includes(parity, "--reader-manuscript-line-height: 1.9", "canonical manuscript line spacing");
  includes(parity, "white-space: pre-wrap", "hard line-break preservation");
  includes(parity, 'aria-label="Sayfa geçişleri"', "legacy estimated page status suppression scope");
});
