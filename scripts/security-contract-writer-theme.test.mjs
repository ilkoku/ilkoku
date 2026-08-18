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
  includes(theme, "/^#[0-9A-F]{6}$/", "writer theme six-digit hex sanitizer");
  includes(theme, "/^#[0-9A-F]{3}$/", "writer theme shorthand hex sanitizer");
  includes(theme, "sanitizeWriterTheme", "writer theme sanitizer");
});

test("Page Colors uses compact circular unlimited pickers without bulky preset palettes", () => {
  const editor = source("src/features/writer-theme/WriterThemeEditor.tsx");
  const theme = source("src/features/writer-theme/theme.ts");
  const css = source("src/features/writer-theme/writer-theme-customization.css");

  includes(editor, 'type="color"', "unrestricted native color picker");
  includes(editor, "sınırsız renk seçici", "unrestricted picker label");
  includes(editor, "Hazır renk sınırı yok", "unrestricted color guidance");
  includes(editor, "Renk koduyla gir", "collapsed advanced color controls");
  includes(editor, "HEX değeri", "HEX field");
  includes(editor, "RGB değeri", "RGB field");
  includes(editor, "HSL değeri", "HSL field");
  includes(editor, "Varsayılana döndür", "per-layer reset");
  includes(editor, "Tümünü varsayılana döndür", "full reset");
  assert.ok(!editor.includes("writerThemePaletteGroups"), "editor must not render preset palette groups");
  assert.ok(!theme.includes("writerThemePaletteGroups"), "theme must not carry bulky preset palette groups");
  includes(css, ".writer-theme-editor__picker", "circular picker CSS");
  includes(css, "border-radius: 50%", "round color picker");
  includes(css, "grid-template-columns: repeat(2, minmax(0, 1fr))", "compact desktop two-column layout");
});

test("writer theme exposes 23 independently editable visual layers", () => {
  const theme = source("src/features/writer-theme/theme.ts");

  for (const key of [
    "pageCanvas",
    "sidebar",
    "brandSurface",
    "mainSurface",
    "headerSurface",
    "cardSurface",
    "coverSurface",
    "controlSurface",
    "border",
    "text",
    "textMuted",
    "heading",
    "navText",
    "navMuted",
    "activeNav",
    "activeNavSurface",
    "hover",
    "primary",
    "primaryHover",
    "buttonText",
    "accent",
    "coverText",
    "progressTrack",
  ]) {
    includes(theme, `key: "${key}"`, `writer theme layer ${key}`);
  }
});

test("expanded writer theme variables are hydrated and wired only to writer shells", () => {
  const shell = source("src/components/layout/AppShell.tsx");
  const hydrator = source("src/features/writer-theme/WriterThemeHydrator.tsx");
  const css = source("src/features/writer-theme/writer-theme-customization.css");

  includes(shell, 'profile.role === "writer"', "writer theme hydrator");
  includes(shell, "<WriterThemeHydrator", "writer theme hydrator");
  const canonicalIndex = shell.indexOf('import "@/styles/light-surface-unification.css"');
  const customIndex = shell.indexOf('import "@/features/writer-theme/writer-theme-customization.css"');
  assert.ok(canonicalIndex >= 0 && customIndex > canonicalIndex, "custom writer theme CSS must load after canonical palette");

  for (const variable of [
    "--writer-custom-brand-surface",
    "--writer-custom-header-surface",
    "--writer-custom-cover-surface",
    "--writer-custom-nav-text",
    "--writer-custom-nav-muted",
    "--writer-custom-active-nav-surface",
    "--writer-custom-button-text",
    "--writer-custom-cover-text",
  ]) {
    includes(hydrator, variable, `writer theme hydrator ${variable}`);
    includes(css, variable, `writer theme CSS ${variable}`);
  }

  includes(css, '.app-shell[data-role="writer"]', "writer-scoped theme CSS");
  includes(css, ".nav-item[data-active]", "writer active navigation color hook");
});
