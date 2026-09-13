import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellPath = path.join(root, "src/components/content/WritingGuideShell.tsx");
const templatePath = path.join(root, "src/lib/cms-page-templates.ts");
const genresPath = path.join(root, "src/lib/genres.ts");
const progressPath = path.join(root, "src/lib/writing-guide-progress.json");
const batchRendererPath = path.join(root, "src/components/content/BatchedFictionGuidePage.tsx");
const batchDefinitionsPath = path.join(root, "src/lib/fiction-guide-batch.ts");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fail(errors) {
  console.error("\n[EĞİTİM BOMBE GATE] FAIL\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error("\nKural: teknik hazırlık toplu yapılabilir; fakat eksik teknik kalite release gate'i geçemez ve HUMAN_PASS yalnız gerçek kullanıcı onayıyla verilir.\n");
  process.exit(1);
}

const errors = [];
const shell = read(shellPath);
const templateSource = read(templatePath);
const genresSource = read(genresPath);
const progress = JSON.parse(read(progressPath));
const batchRendererSource = fs.existsSync(batchRendererPath) ? read(batchRendererPath) : "";
const batchDefinitionsSource = fs.existsSync(batchDefinitionsPath) ? read(batchDefinitionsPath) : "";

const allGenres = [...genresSource.matchAll(/\{\s*slug:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*category:\s*"([^"]+)"\s*\}/g)]
  .map((match) => ({ slug: match[1], label: match[2], category: match[3] }));

if (allGenres.length === 0) {
  fail(["GENRES listesi okunamadı; eğitim sırası kaynaksız çalışamaz."]);
}

const liveMapMatch = shell.match(/const LIVE_WRITING_GUIDE_HREFS:[\s\S]*?=\s*\{([\s\S]*?)\};/);
if (!liveMapMatch) {
  fail(["WritingGuideShell içindeki LIVE_WRITING_GUIDE_HREFS haritası bulunamadı."]);
}

const liveGuides = [...liveMapMatch[1].matchAll(/^\s*"?([a-z0-9-]+)"?:\s*"([^"]+)",?\s*$/gm)]
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

const visualKeys = ["hero", "ideaFlow", "structure", "anatomy", "pageSetup", "project", "finalCta"];

for (const { slug, href } of liveGuides) {
  const pagePath = path.join(root, "src/app", href.replace(/^\//, ""), "page.tsx");
  if (!fs.existsSync(pagePath)) {
    errors.push(`${slug}: sol menü canlı linki var ama route dosyası yok (${href}).`);
    continue;
  }

  const page = read(pagePath);
  const isBatched = page.includes("BatchedFictionGuidePage") && page.includes(`getFictionGuideDefinition("${slug}")`);
  if (isBatched && !batchDefinitionsSource.includes(`slug: "${slug}"`)) {
    errors.push(`${slug}: batch route var ama türe özgü eğitim tanımı fiction-guide-batch.ts içinde yok.`);
  }

  const effectiveSource = page.includes('getCmsPageTemplate("ornek-roman")')
    ? `${page}\n${templateSource}`
    : isBatched
      ? `${page}\n${batchRendererSource}\n${batchDefinitionsSource}`
      : page;

  const cmsConnected = isBatched
    ? batchRendererSource.includes("getEducationGuideRecord(definition.slug)")
    : page.includes(`getEducationGuideRecord("${slug}")`);
  const activeConnected = isBatched
    ? batchRendererSource.includes("activeGenreSlug={definition.slug}")
    : page.includes(`activeGenreSlug="${slug}"`);

  const checks = [
    [page.includes('export const dynamic = "force-dynamic";'), "force-dynamic eksik"],
    [cmsConnected, `CMS eğitim kaydı '${slug}' ile okunmuyor`],
    [activeConnected, "sol menü activeGenreSlug bağlantısı eksik"],
    [effectiveSource.includes('type: "faq"'), "SSS bölümü eksik"],
    [effectiveSource.includes('type: "cta"'), "gerçek final CTA bölümü eksik"],
    [/Ustalardan öğren/i.test(effectiveSource), "Ustalardan öğren bölümü eksik"],
    [/Örnek proje|ornek-proje/i.test(effectiveSource), "Örnek proje bölümü/bağı eksik"],
  ];

  for (const [ok, message] of checks) {
    if (!ok) errors.push(`${slug}: ${message}.`);
  }

  const visualSource = isBatched ? batchRendererSource : page;
  for (const key of visualKeys) {
    const keyPattern = new RegExp(`\\b${key}\\b`);
    if (!keyPattern.test(visualSource)) errors.push(`${slug}: 7 görsel slotundan '${key}' sayfaya bağlanmamış.`);
  }

  const hasShellRoute = shell.includes(`${slug}: "${href}"`) || shell.includes(`"${slug}": "${href}"`);
  if (!hasShellRoute) {
    errors.push(`${slug}: WritingGuideShell canlı route eşlemesi bozuk.`);
  }
}

if (errors.length > 0) fail(errors);

const pendingHumanPass = liveGuides.length > humanPass.length ? allGenres[humanPass.length] : null;
const pendingTechnicalReview = Math.max(0, liveGuides.length - humanPass.length);
const nextGenre = allGenres[liveGuides.length] ?? null;

console.log(`[EĞİTİM BOMBE GATE] PASS — ${liveGuides.length}/${allGenres.length} teknik canlı tür doğrulandı: ${liveGuides.map((item) => item.slug).join(", ")}`);
console.log(`[EĞİTİM BOMBE İLERLEME] HUMAN_PASS: ${humanPass.length}/${allGenres.length}.`);
if (pendingHumanPass) {
  console.log(`[EĞİTİM BOMBE BEKLİYOR] İlk HUMAN_PASS/görsel kuyruğu: ${pendingHumanPass.label} (${pendingHumanPass.slug}) · ${pendingHumanPass.category}.`);
}
if (pendingTechnicalReview > 0) {
  console.log(`[EĞİTİM BOMBE BATCH] ${pendingTechnicalReview} teknik canlı tür görsel + canlı kullanıcı kontrolü + HUMAN_PASS bekliyor.`);
}
if (nextGenre) {
  console.log(`[EĞİTİM BOMBE SIRADAKİ TEKNİK] ${nextGenre.label} (${nextGenre.slug}) · ${nextGenre.category}.`);
} else {
  console.log("[EĞİTİM BOMBE SIRADAKİ] Tüm GENRES eğitimleri teknik olarak canlı.");
}
console.log("Kontrol: GENRES sırası + route + dynamic + CMS + sol menü + 7 slot + örnek proje + ustalar + SSS + final CTA.");
console.log("Not: Teknik batch hazırlığı HUMAN_PASS değildir. HUMAN_PASS yalnız gerçek kullanıcı onayıyla writing-guide-progress.json dosyasına eklenir.");
