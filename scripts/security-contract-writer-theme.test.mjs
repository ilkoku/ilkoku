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

test("writer Page Colors route is role-scoped and present in writer navigation only", () => {
  const page = source("src/app/sayfa-renkleri/page.tsx");
  const navigation = source("src/content/navigation.ts");
  const proxy = source("src/proxy.ts");

  includes(page, 'profile.role !== "writer"', "Page Colors route");
  includes(page, 'redirect("/erisim-reddedildi")', "Page Colors route");
  includes(navigation, '{ label: "Sayfa Renkleri", href: "/sayfa-renkleri" }', "writer navigation");
  assert.equal((navigation.match(/href: "\/sayfa-renkleri"/g) ?? []).length, 1);
  includes(proxy, '"/sayfa-renkleri",', "protected Page Colors path");
  includes(proxy, '{ approved: false, path: "/sayfa-renkleri", roles: ["writer"] }', "Page Colors proxy role rule");
});

test("writer theme storage is isolated per user and sanitized", () => {
  const theme = source("src/features/writer-theme/theme.ts");

  includes(theme, "ilkoku:writer-theme:${userId}", "writer theme storage");
  includes(theme, "/^#[0-9A-F]{6}$/", "writer theme hex sanitizer");
  includes(theme, "sanitizeWriterTheme", "writer theme sanitizer");
});

test("Page Colors includes palette, round native picker, HEX/RGB and reset controls", () => {
  const editor = source("src/features/writer-theme/WriterThemeEditor.tsx");
  const css = source("src/features/writer-theme/writer-theme-customization.css");

  includes(editor, "writerThemePalette.map", "writer theme palette");
  includes(editor, 'type="color"', "custom color picker");
  includes(editor, "HEX değeri", "HEX field");
  includes(editor, "RGB değeri", "RGB field");
  includes(editor, "Bu rengi varsayılana döndür", "per-layer reset");
  includes(editor, "Tümünü varsayılana döndür", "full reset");
  includes(css, "border-radius: 50%", "round color controls");
});

test("writer theme exposes all 15 requested visual layers", () => {
  const theme = source("src/features/writer-theme/theme.ts");

  for (const key of [
    "pageCanvas",
    "sidebar",
    "mainSurface",
    "cardSurface",
    "controlSurface",
    "border",
    "text",
    "textMuted",
    "heading",
    "activeNav",
    "hover",
    "primary",
    "primaryHover",
    "accent",
    "progressTrack",
  ]) {
    includes(theme, `key: "${key}"`, `writer theme layer ${key}`);
  }
});

test("writer theme hydrates only writer shells after canonical palette", () => {
  const shell = source("src/components/layout/AppShell.tsx");
  const css = source("src/features/writer-theme/writer-theme-customization.css");

  includes(shell, 'profile.role === "writer"', "writer theme hydrator");
  includes(shell, "<WriterThemeHydrator", "writer theme hydrator");
  const canonicalIndex = shell.indexOf('import "@/styles/light-surface-unification.css"');
  const customIndex = shell.indexOf('import "@/features/writer-theme/writer-theme-customization.css"');
  assert.ok(canonicalIndex >= 0 && customIndex > canonicalIndex, "custom writer theme CSS must load after canonical palette");
  includes(css, '.app-shell[data-role="writer"]', "writer-scoped theme CSS");
  includes(css, ".nav-item[data-active]", "writer active navigation color hook");
});
