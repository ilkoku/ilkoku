import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellPath = path.join(root, "src/components/content/WritingGuideShell.tsx");
const templatePath = path.join(root, "src/lib/cms-page-templates.ts");
const genresPath = path.join(root, "src/lib/genres.ts");
const progressPath = path.join(root, "src/lib/writing-guide-progress.json");

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
const genresSource = read(genresPath);
const progress = JSON.parse(read(progressPath));

const allGenres = [...genresSource.matchAll(/\{\s*slug:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*category:\s*"([^"]+)"\s*\}/g)]
  .map((match) => ({ slug: match[1], label: match[2], category: match[3] }));

if (allGenres.length === 0) {
  fail(["GENRES listesi okunamadı; eğitim sırası kaynaksız çalışamaz."]);
}

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

const humanPass = Array.isArray(progress?.humanPass) ? progress.humanPass : [];
const allGenreSlugs = new Set(allGenres.map((genre) => genre.slug));
const liveSlugs = liveGuides.map((guide) => guide.slug);
const liveSlugSet = new Set(liveSlugs);

for (const slug of liveSlugs) {
  if (!allGenreSlugs.has(slug)) errors.push(`${slug}: canlı rehber GENRES kaynak listesinde yok.`);
}

for (const slug of humanPass) {
  if (!allGenreSlugs.has(slug)) errors.push(`${slug}: HUMAN_PASS kaydı GENRES kaynak listesinde yok.`);
  if (!liveSlugSet.has(slug)) errors.push(`${slug}: HUMAN_PASS verilmiş ama teknik olarak canlı rehber değil.`);
}

const expectedLivePrefix = allGenres.slice(0, liveGuides.length).map((genre) => genre.slug);
if (JSON.stringify(liveSlugs) !== JSON.stringify(expectedLivePrefix)) {
  errors.push(`Canlı tür sırası GENRES kanonik sırasını izlemiyor. Beklenen: ${expectedLivePrefix.join(", ")} | Mevcut: ${liveSlugs.join(", ")}`);
}

const expectedPassPrefix = allGenres.slice(0, humanPass.length).map((genre) => genre.slug);
if (JSON.stringify(humanPass) !== JSON.stringify(expectedPassPrefix)) {
  errors.push(`HUMAN_PASS sırası GENRES kanonik sırasını izlemiyor. Beklenen: ${expectedPassPrefix.join(", ")} | Mevcut: ${humanPass.join(", ")}`);
}

if (liveGuides.length > humanPass.length + 1) {
  errors.push(`HUMAN_PASS beklenmeden birden fazla yeni tür açılmış. Teknik canlı: ${liveGuides.length}, HUMAN_PASS: ${humanPass.length}.`);
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

const pendingHumanPass = liveGuides.length > humanPass.length
  ? allGenres[humanPass.length]
  : null;
const nextGenre = allGenres[liveGuides.length] ?? null;

console.log(`[EĞİTİM BOMBE GATE] PASS — ${liveGuides.length}/${allGenres.length} teknik canlı tür doğrulandı: ${liveGuides.map((item) => item.slug).join(", ")}`);
console.log(`[EĞİTİM BOMBE İLERLEME] HUMAN_PASS: ${humanPass.length}/${allGenres.length}.`);
if (pendingHumanPass) {
  console.log(`[EĞİTİM BOMBE BEKLİYOR] HUMAN_PASS: ${pendingHumanPass.label} (${pendingHumanPass.slug}) · ${pendingHumanPass.category}.`);
}
if (nextGenre) {
  const lockText = pendingHumanPass ? "KİLİTLİ — önce mevcut tür HUMAN_PASS almalı" : "HAZIR";
  console.log(`[EĞİTİM BOMBE SIRADAKİ] ${nextGenre.label} (${nextGenre.slug}) · ${nextGenre.category} · ${lockText}.`);
} else {
  console.log("[EĞİTİM BOMBE SIRADAKİ] Tüm GENRES eğitimleri teknik olarak canlı.");
}
console.log("Kontrol: GENRES sırası + route + dynamic + CMS + sol menü + 7 slot + örnek proje + ustalar + SSS + final CTA.");
console.log("Not: HUMAN_PASS otomatik değildir; yalnız gerçek kullanıcı onayıyla writing-guide-progress.json dosyasına eklenir.");
