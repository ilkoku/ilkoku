import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellPath = path.join(root, "src/components/content/WritingGuideShell.tsx");
const templatePath = path.join(root, "src/lib/cms-page-templates.ts");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fail(errors) {
  console.error("\n[EĞİTİM BOMBE GATE] FAIL\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error("\nKural: eksik kapanmadan yeni tür release/PASS akışına geçilemez.\n");
  process.exit(1);
}

const errors = [];
const shell = read(shellPath);
const templateSource = read(templatePath);
const liveMapMatch = shell.match(/const LIVE_WRITING_GUIDE_HREFS:[\s\S]*?=\s*\{([\s\S]*?)\};/);

if (!liveMapMatch) {
  fail(["WritingGuideShell içindeki LIVE_WRITING_GUIDE_HREFS haritası bulunamadı."]);
}

const liveGuides = [...liveMapMatch[1].matchAll(/^\s*([a-z0-9-]+):\s*"([^"]+)",?\s*$/gm)]
  .map((match) => ({ slug: match[1], href: match[2] }))
  .filter(({ href }) => href.startsWith("/yazarlar-icin/"));

if (liveGuides.length === 0) {
  fail(["Canlı yazarlık rehberi bulunamadı; release gate yanlışlıkla boş çalışamaz."]);
}

const visualKeys = ["hero", "ideaFlow", "structure", "anatomy", "pageSetup", "project", "finalCta"];

for (const { slug, href } of liveGuides) {
  const pagePath = path.join(root, "src/app", href.replace(/^\//, ""), "page.tsx");
  if (!fs.existsSync(pagePath)) {
    errors.push(`${slug}: sol menü canlı linki var ama route dosyası yok (${href}).`);
    continue;
  }

  const page = read(pagePath);
  const effectiveSource = page.includes('getCmsPageTemplate("ornek-roman")')
    ? `${page}\n${templateSource}`
    : page;

  const checks = [
    [page.includes('export const dynamic = "force-dynamic";'), "force-dynamic eksik"],
    [page.includes(`getEducationGuideRecord("${slug}")`), `CMS eğitim kaydı '${slug}' ile okunmuyor`],
    [page.includes(`activeGenreSlug="${slug}"`), "sol menü activeGenreSlug bağlantısı eksik"],
    [effectiveSource.includes('type: "faq"'), "SSS bölümü eksik"],
    [effectiveSource.includes('type: "cta"'), "gerçek final CTA bölümü eksik"],
    [/Ustalardan öğren/i.test(effectiveSource), "Ustalardan öğren bölümü eksik"],
    [/Örnek proje|ornek-proje/i.test(effectiveSource), "Örnek proje bölümü/bağı eksik"],
  ];

  for (const [ok, message] of checks) {
    if (!ok) errors.push(`${slug}: ${message}.`);
  }

  for (const key of visualKeys) {
    const keyPattern = new RegExp(`\\b${key}\\b`);
    if (!keyPattern.test(page)) errors.push(`${slug}: 7 görsel slotundan '${key}' sayfaya bağlanmamış.`);
  }

  if (!shell.includes(`${slug}: "${href}"`)) {
    errors.push(`${slug}: WritingGuideShell canlı route eşlemesi bozuk.`);
  }
}

if (errors.length > 0) fail(errors);

console.log(`[EĞİTİM BOMBE GATE] PASS — ${liveGuides.length} canlı tür doğrulandı: ${liveGuides.map((item) => item.slug).join(", ")}`);
console.log("Kontrol: route + dynamic + CMS + sol menü + 7 slot + örnek proje + ustalar + SSS + final CTA.");
console.log("Not: HUMAN_PASS otomatik değildir; yalnız gerçek kullanıcı onayıyla verilir.");
