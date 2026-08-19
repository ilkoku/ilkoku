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
  const policy = source("src/lib/route-security.ts");
  const proxy = source("src/proxy.ts");

  includes(page, 'profile.role !== "writer"', "Page Colors route");
  includes(page, 'redirect("/erisim-reddedildi")', "Page Colors route");
  includes(navigation, '{ label: "Sayfa Renkleri", href: "/sayfa-renkleri" }', "writer navigation");
  assert.equal((navigation.match(/href: "\/sayfa-renkleri"/g) ?? []).length, 1);
  includes(policy, '"/sayfa-renkleri",', "protected Page Colors path");
  includes(policy, '{ approved: false, path: "/sayfa-renkleri", roles: ["writer"] }', "Page Colors role rule");
  includes(proxy, "getRouteRoleRule(pathname)", "proxy canonical role policy consumption");
});

test("writer theme storage is isolated per user, versioned and sanitized", () => {
  const theme = source("src/features/writer-theme/theme.ts");

  includes(theme, "ilkoku:writer-theme:v2:${userId}", "writer theme storage");
  includes(theme, "/^#[0-9A-F]{6}$/", "writer theme six-digit hex sanitizer");
  includes(theme, "/^#[0-9A-F]{3}$/", "writer theme shorthand hex sanitizer");
  includes(theme, "sanitizeWriterTheme", "writer theme sanitizer");
});

test("writer defaults use the original dark black and gold İlkOku palette", () => {
  const theme = source("src/features/writer-theme/theme.ts");
  const css = source("src/features/writer-theme/writer-theme-customization.css");

  for (const color of ["#0B0D10", "#13161B", "#1A1F27", "#D4AF37", "#E5C75A", "#C9A15A", "#FFFFFF", "#9CA3AF"]) {
    includes(theme, color, `writer legacy default ${color}`);
  }
  includes(css, "--writer-custom-page-canvas: #0b0d10", "writer dark canvas fallback");
  includes(css, "--writer-custom-primary: #d4af37", "writer gold primary fallback");
  includes(css, "color-scheme: dark", "writer dark color scheme");
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

test("writer theme is the final writer presentation layer and old purple layers are disabled", () => {
  const shell = source("src/components/layout/AppShell.tsx");
  const hydrator = source("src/features/writer-theme/WriterThemeHydrator.tsx");
  const css = source("src/features/writer-theme/writer-theme-customization.css");

  includes(shell, 'profile.role === "writer"', "writer theme hydrator");
  includes(shell, "<WriterThemeHydrator", "writer theme hydrator");
  includes(shell, 'import "@/features/writer-theme/writer-theme-customization.css"', "writer customization import");
  assert.ok(!shell.includes("writer-role-theme.css"), "old writer purple role theme must not load");
  assert.ok(!shell.includes("writer-purple-continuity.css"), "old writer purple continuity must not load");
  assert.ok(!shell.includes("writer-landing-lavender-background.css"), "old writer lavender background must not load");
  assert.ok(!shell.includes("light-surface-unification.css"), "old light writer surface override must not load");

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

test("login route uses the original auth palette without purple/light overrides", () => {
  const page = source("src/app/giris/page.tsx");
  const layout = source("src/app/giris/layout.tsx");

  assert.ok(!page.includes(" purple>"), "login AuthShell must not enable purple palette");
  assert.ok(!layout.includes("auth-brand-purple.css"), "login must not import purple brand override");
  assert.ok(!layout.includes("light-purple-route-fallback.css"), "login must not import light route fallback");
  assert.ok(!layout.includes("light-surface-unification.css"), "login must not import light surface override");
});
