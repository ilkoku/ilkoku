import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellPath = path.join(root, "src/components/content/WritingGuideShell.tsx");
const templatePath = path.join(root, "src/lib/cms-page-templates.ts");
const genresPath = path.join(root, "src/lib/genres.ts");
const progressPath = path.join(root, "src/lib/writing-guide-progress.json");
const fictionRendererPath = path.join(root, "src/components/content/BatchedFictionGuidePage.tsx");
const fictionDefinitionsPath = path.join(root, "src/lib/fiction-guide-batch.ts");
const fictionDepthPath = path.join(root, "src/lib/fiction-guide-depth.ts");
const pedagogyParityPath = path.join(root, "src/lib/fiction-guide-pedagogy-parity.ts");
const educationRendererPath = path.join(root, "src/components/content/BatchedEducationGuidePage.tsx");
const educationDefinitionsPath = path.join(root, "src/lib/education-guide-batch.ts");
const literatureDepthPath = path.join(root, "src/lib/literature-guide-depth.ts");
const stageDefinitionsPath = path.join(root, "src/lib/stage-guide-batch.ts");
const stageDepthPath = path.join(root, "src/lib/stage-guide-depth.ts");
const academicDefinitionsPath = path.join(root, "src/lib/academic-guide-batch.ts");
const informationalDefinitionsPath = path.join(root, "src/lib/informational-guide-batch.ts");
const informationalDepthPath = path.join(root, "src/lib/informational-guide-depth.ts");
const youthDefinitionsPath = path.join(root, "src/lib/youth-guide-batch.ts");
const graphicDefinitionsPath = path.join(root, "src/lib/graphic-narrative-guide-batch.ts");
const informationalDynamicPagePath = path.join(root, "src/app/yazarlar-icin/bilgilendirici/[slug]/page.tsx");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fail(errors) {
  console.error("\n[EĞİTİM BOMBE GATE] FAIL\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error("\nKural: teknik hazırlık toplu yapılabilir; fakat eksik teknik/pedagojik kalite release gate'i geçemez ve HUMAN_PASS yalnız gerçek kullanıcı onayıyla verilir.\n");
  process.exit(1);
}

const errors = [];
const shell = read(shellPath);
const templateSource = read(templatePath);
const genresSource = read(genresPath);
const progress = JSON.parse(read(progressPath));
const fictionRendererSource = fs.existsSync(fictionRendererPath) ? read(fictionRendererPath) : "";
const fictionDefinitionsSource = fs.existsSync(fictionDefinitionsPath) ? read(fictionDefinitionsPath) : "";
const fictionDepthSource = fs.existsSync(fictionDepthPath) ? read(fictionDepthPath) : "";
const pedagogyParitySource = fs.existsSync(pedagogyParityPath) ? read(pedagogyParityPath) : "";
const educationRendererSource = fs.existsSync(educationRendererPath) ? read(educationRendererPath) : "";
const educationDefinitionsSource = fs.existsSync(educationDefinitionsPath) ? read(educationDefinitionsPath) : "";
const literatureDepthSource = fs.existsSync(literatureDepthPath) ? read(literatureDepthPath) : "";
const stageDefinitionsSource = fs.existsSync(stageDefinitionsPath) ? read(stageDefinitionsPath) : "";
const stageDepthSource = fs.existsSync(stageDepthPath) ? read(stageDepthPath) : "";
const academicDefinitionsSource = fs.existsSync(academicDefinitionsPath) ? read(academicDefinitionsPath) : "";
const informationalDefinitionsSource = fs.existsSync(informationalDefinitionsPath) ? read(informationalDefinitionsPath) : "";
const informationalDepthSource = fs.existsSync(informationalDepthPath) ? read(informationalDepthPath) : "";
const youthDefinitionsSource = fs.existsSync(youthDefinitionsPath) ? read(youthDefinitionsPath) : "";
const graphicDefinitionsSource = fs.existsSync(graphicDefinitionsPath) ? read(graphicDefinitionsPath) : "";
const allEducationDefinitionsSource = `${educationDefinitionsSource}\n${stageDefinitionsSource}\n${academicDefinitionsSource}\n${informationalDefinitionsSource}\n${youthDefinitionsSource}\n${graphicDefinitionsSource}`;

const allGenres = [...genresSource.matchAll(/\{\s*slug:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*category:\s*"([^"]+)"\s*\}/g)]
  .map((match) => ({ slug: match[1], label: match[2], category: match[3] }));

if (allGenres.length === 0) fail(["GENRES listesi okunamadı; eğitim sırası kaynaksız çalışamaz."]);

const genreBySlug = new Map(allGenres.map((genre) => [genre.slug, genre]));
const liveMapMatch = shell.match(/const LIVE_WRITING_GUIDE_HREFS:[\s\S]*?=\s*\{([\s\S]*?)\};/);
if (!liveMapMatch) fail(["WritingGuideShell içindeki LIVE_WRITING_GUIDE_HREFS haritası bulunamadı."]);

const liveGuides = [...liveMapMatch[1].matchAll(/^\s*"?([a-z0-9-]+)"?:\s*"([^"]+)",?\s*$/gm)]
  .map((match) => ({ slug: match[1], href: match[2] }))
  .filter(({ href }) => href.startsWith("/yazarlar-icin/"));

if (liveGuides.length === 0) fail(["Canlı yazarlık rehberi bulunamadı; release gate yanlışlıkla boş çalışamaz."]);

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
const romanParityMarkers = [
  "fikir-kaynaklari",
  "tur-farki",
  "tam-yazim-rotasi",
  "yazim-duzeni",
  "ilk-taslak",
  "yayina-hazirlik",
  "uygulama-ciktisi",
];

const informationalDepthMinimum = {
  tarih: 5,
  felsefe: 4,
  psikoloji: 6,
  sosyoloji: 5,
  "kisisel-gelisim": 5,
  "is-dunyasi": 4,
  girisimcilik: 5,
  finans: 6,
  ekonomi: 5,
  teknoloji: 5,
  "yapay-zeka": 6,
  programlama: 5,
  hukuk: 6,
  egitim: 5,
  siyaset: 6,
  iletisim: 4,
  sanat: 4,
  mimarlik: 5,
  saglik: 6,
  spor: 5,
  "yemek-ve-gastronomi": 5,
  seyahat: 5,
  "din-ve-inanc": 6,
};

const youthDepthMinimum = {
  masal: 5,
  fabl: 5,
  "cocuk-hikayesi": 6,
  "cocuk-romani": 6,
  "genc-yetiskin": 7,
  "egitici-cocuk-kitabi": 7,
};

const graphicDepthMinimum = {
  "cizgi-roman": 6,
  "grafik-roman": 7,
  manga: 7,
  webtoon: 7,
  karikatur: 6,
};

function academicDefinitionSlice(slug) {
  const marker = `slug: "${slug}"`;
  const start = academicDefinitionsSource.indexOf(marker);
  if (start < 0) return "";
  const next = academicDefinitionsSource.indexOf('\n  {\n    category: "Akademik"', start + marker.length);
  return academicDefinitionsSource.slice(start, next < 0 ? academicDefinitionsSource.length : next);
}

function youthDefinitionSlice(slug) {
  const marker = `slug: "${slug}"`;
  const start = youthDefinitionsSource.indexOf(marker);
  if (start < 0) return "";
  const next = youthDefinitionsSource.indexOf('\n  {\n    category: "Çocuk ve Gençlik"', start + marker.length);
  return youthDefinitionsSource.slice(start, next < 0 ? youthDefinitionsSource.length : next);
}

function graphicDefinitionSlice(slug) {
  const marker = `slug: "${slug}"`;
  const start = graphicDefinitionsSource.indexOf(marker);
  if (start < 0) return "";
  const after = graphicDefinitionsSource.slice(start + marker.length);
  const nextMatch = after.match(/\n  \{\n    slug: "/);
  const end = nextMatch?.index ?? after.length;
  return graphicDefinitionsSource.slice(start, start + marker.length + end);
}

function depthSlice(source, slug) {
  const quotedMarker = `"${slug}": [`;
  const plainMarker = `${slug}: [`;
  let marker = quotedMarker;
  let start = source.indexOf(quotedMarker);
  if (start < 0) {
    marker = plainMarker;
    start = source.indexOf(plainMarker);
  }
  if (start < 0) return "";
  const after = source.slice(start + marker.length);
  const nextMatch = after.match(/\n  (?:(?:"[a-z0-9-]+")|(?:[a-z0-9-]+)): \[/);
  const end = nextMatch?.index ?? after.length;
  return after.slice(0, end);
}

for (const { slug, href } of liveGuides) {
  const genre = genreBySlug.get(slug);
  let pagePath = path.join(root, "src/app", href.replace(/^\//, ""), "page.tsx");
  let isInformationalDynamic = false;
  if (!fs.existsSync(pagePath) && genre?.category === "Bilgilendirici" && fs.existsSync(informationalDynamicPagePath)) {
    pagePath = informationalDynamicPagePath;
    isInformationalDynamic = true;
  }
  if (!fs.existsSync(pagePath)) {
    errors.push(`${slug}: sol menü canlı linki var ama route dosyası yok (${href}).`);
    continue;
  }

  const page = read(pagePath);
  const isFictionBatched = page.includes("BatchedFictionGuidePage") && page.includes(`getFictionGuideDefinition("${slug}")`);
  const isEducationBatched = page.includes("BatchedEducationGuidePage") && (
    page.includes(`getEducationGuideDefinition("${slug}")`) ||
    (isInformationalDynamic && page.includes("getEducationGuideDefinition(slug)"))
  );
  const isBatched = isFictionBatched || isEducationBatched;

  if (isFictionBatched && !fictionDefinitionsSource.includes(`slug: "${slug}"`)) {
    errors.push(`${slug}: batch route var ama türe özgü eğitim tanımı fiction-guide-batch.ts içinde yok.`);
  }
  if (isEducationBatched && !allEducationDefinitionsSource.includes(`slug: "${slug}"`)) {
    errors.push(`${slug}: batch route var ama türe özgü eğitim tanımı education/stage/academic/informational/youth/graphic kaynaklarında yok.`);
  }
  if (isInformationalDynamic && !page.includes("isInformationalGuideSlug")) {
    errors.push(`${slug}: Bilgilendirici dinamik route geçersiz slugları fail-closed doğrulamıyor.`);
  }

  if (isFictionBatched) {
    if (!fictionRendererSource.includes("getFictionPedagogyParity")) {
      errors.push(`${slug}: Kurgu batch renderer Roman-parity pedagojik tamamlama katmanına bağlı değil.`);
    }
    const quoted = `\"${slug}\"`;
    const plain = `${slug}: {`;
    if (!pedagogyParitySource.includes(quoted) && !pedagogyParitySource.includes(plain)) {
      errors.push(`${slug}: fiction-guide-pedagogy-parity.ts içinde türe özgü pedagojik tamamlama tanımı yok.`);
    }
  }

  if (isBatched) {
    const rendererSource = isFictionBatched ? fictionRendererSource : educationRendererSource;
    for (const marker of romanParityMarkers) {
      if (!rendererSource.includes(marker)) errors.push(`${slug}: Roman-parity eğitim bölümü '${marker}' batch renderer içinde eksik.`);
    }
  }

  if (genre?.category === "Kurgu") {
    if (isFictionBatched) {
      const depthSource = depthSlice(fictionDepthSource, slug);
      if (!depthSource) {
        errors.push(`${slug}: Kurgu batch türü için Roman-parity üstü derinleştirme tanımı fiction-guide-depth.ts içinde bulunamadı.`);
      } else {
        const depthSectionCount = [...depthSource.matchAll(/\bid:\s*"/g)].length;
        if (depthSectionCount < 4) {
          errors.push(`${slug}: Kurgu batch türünde en az 4 tür özgü derinleştirme bölümü bekleniyor; mevcut ${depthSectionCount}.`);
        }
      }
      if (!fictionRendererSource.includes("getFictionGuideExtraSections") || !fictionRendererSource.includes("extraSections")) {
        errors.push(`${slug}: Kurgu derinleştirme bölümleri batch renderer tarafından sayfaya bağlanmıyor.`);
      }
    } else if (slug !== "roman") {
      const customBlockCount = [...page.matchAll(new RegExp(`id:\\s*"${slug}-`, "g"))].length;
      if (customBlockCount < 12) {
        errors.push(`${slug}: özel Kurgu rehberinde Roman tabanının üzerinde yeterli türe özgü eğitim bloğu görünmüyor; en az 12 özel blok bekleniyor, mevcut ${customBlockCount}.`);
      }
    }
  }

  if (genre?.category === "Edebiyat") {
    const depthSource = depthSlice(literatureDepthSource, slug);
    if (!depthSource) {
      errors.push(`${slug}: Edebiyat için Roman-parity üstü derinleştirme tanımı literature-guide-depth.ts içinde bulunamadı.`);
    } else {
      const depthSectionCount = [...depthSource.matchAll(/\bid:\s*"/g)].length;
      if (depthSectionCount < 4) {
        errors.push(`${slug}: Edebiyat türünde en az 4 tür özgü derinleştirme bölümü bekleniyor; mevcut ${depthSectionCount}.`);
      }
    }
    if (!educationRendererSource.includes("getLiteratureGuideExtraSections") || !educationRendererSource.includes("literatureExtraSections")) {
      errors.push(`${slug}: Edebiyat derinleştirme bölümleri renderer tarafından sayfaya bağlanmıyor.`);
    }
  }

  if (genre?.category === "Senaryo ve Sahne") {
    const depthSource = depthSlice(stageDepthSource, slug);
    if (!depthSource) {
      errors.push(`${slug}: Senaryo ve Sahne için Roman-parity üstü derinleştirme tanımı stage-guide-depth.ts içinde bulunamadı.`);
    } else {
      const depthSectionCount = [...depthSource.matchAll(/\bid:\s*"/g)].length;
      if (depthSectionCount < 5) {
        errors.push(`${slug}: Senaryo ve Sahne türünde en az 5 konu/format özgü derinleştirme bölümü bekleniyor; mevcut ${depthSectionCount}.`);
      }
    }
    if (!educationRendererSource.includes("getStageGuideExtraSections") || !educationRendererSource.includes("stageExtraSections")) {
      errors.push(`${slug}: Senaryo ve Sahne derinleştirme bölümleri renderer tarafından sayfaya bağlanmıyor.`);
    }
  }

  if (genre?.category === "Akademik") {
    const academicSource = academicDefinitionSlice(slug);
    if (!academicSource) {
      errors.push(`${slug}: Akademik türe özgü tanım academic-guide-batch.ts içinde bulunamadı.`);
    } else {
      if (!academicSource.includes("extraSections:")) {
        errors.push(`${slug}: Akademik tür Roman-parity üstü ek eğitim bölümleri içermiyor.`);
      }
      const extraStart = academicSource.indexOf("extraSections:");
      const extraEnd = academicSource.indexOf("draftHeading:", extraStart);
      const extraSource = academicSource.slice(extraStart, extraEnd < 0 ? academicSource.length : extraEnd);
      const extraSectionCount = [...extraSource.matchAll(/\bid:\s*"/g)].length;
      if (extraSectionCount < 3) {
        errors.push(`${slug}: Akademik türde en az 3 konuya özgü derinleştirme bölümü bekleniyor; mevcut ${extraSectionCount}.`);
      }
    }
    if (!educationRendererSource.includes("extraEducationBlocks")) {
      errors.push(`${slug}: Akademik ek eğitim bölümleri renderer tarafından sayfaya bağlanmıyor.`);
    }
  }

  if (genre?.category === "Bilgilendirici") {
    const depthSource = depthSlice(informationalDepthSource, slug);
    const requiredDepth = informationalDepthMinimum[slug] ?? 4;
    if (!informationalDefinitionsSource.includes(`slug: "${slug}"`)) {
      errors.push(`${slug}: Bilgilendirici türe özgü temel eğitim profili informational-guide-batch.ts içinde bulunamadı.`);
    }
    if (!depthSource) {
      errors.push(`${slug}: Bilgilendirici için konu/risk özgü derinleştirme informational-guide-depth.ts içinde bulunamadı.`);
    } else {
      const depthSectionCount = [...depthSource.matchAll(/\bid:\s*"/g)].length;
      if (depthSectionCount < requiredDepth) {
        errors.push(`${slug}: Bilgilendirici türünde en az ${requiredDepth} konu/risk özgü derinleştirme bölümü bekleniyor; mevcut ${depthSectionCount}.`);
      }
    }
    if (!informationalDefinitionsSource.includes("getInformationalGuideExtraSections") || !educationRendererSource.includes("extraEducationBlocks")) {
      errors.push(`${slug}: Bilgilendirici derinleştirme bölümleri tanımdan ortak renderer'a bağlanmıyor.`);
    }
  }

  if (genre?.category === "Çocuk ve Gençlik") {
    const youthSource = youthDefinitionSlice(slug);
    const requiredDepth = youthDepthMinimum[slug] ?? 5;
    if (!youthSource) {
      errors.push(`${slug}: Çocuk ve Gençlik türe özgü eğitim tanımı youth-guide-batch.ts içinde bulunamadı.`);
    } else {
      if (!youthSource.includes("extraSections:")) {
        errors.push(`${slug}: Çocuk ve Gençlik türü Roman-parity üstü ek eğitim bölümleri içermiyor.`);
      }
      const extraStart = youthSource.indexOf("extraSections:");
      const extraEnd = youthSource.indexOf("draftHeading:", extraStart);
      const extraSource = youthSource.slice(extraStart, extraEnd < 0 ? youthSource.length : extraEnd);
      const extraSectionCount = [...extraSource.matchAll(/\bid:\s*"/g)].length;
      if (extraSectionCount < requiredDepth) {
        errors.push(`${slug}: Çocuk ve Gençlik türünde en az ${requiredDepth} yaş/tür özgü derinleştirme bölümü bekleniyor; mevcut ${extraSectionCount}.`);
      }
    }
    if (!educationRendererSource.includes("extraEducationBlocks")) {
      errors.push(`${slug}: Çocuk ve Gençlik ek eğitim bölümleri ortak renderer tarafından sayfaya bağlanmıyor.`);
    }
  }

  if (genre?.category === "Çizgi Anlatı") {
    const graphicSource = graphicDefinitionSlice(slug);
    const requiredDepth = graphicDepthMinimum[slug] ?? 6;
    if (!graphicSource) {
      errors.push(`${slug}: Çizgi Anlatı türe özgü eğitim tanımı graphic-narrative-guide-batch.ts içinde bulunamadı.`);
    } else {
      if (!graphicSource.includes("extraSections:")) {
        errors.push(`${slug}: Çizgi Anlatı türü Roman-parity üstü görsel anlatı eğitim bölümleri içermiyor.`);
      }
      const extraStart = graphicSource.indexOf("extraSections:");
      const extraEnd = graphicSource.indexOf("draftItems:", extraStart);
      const extraSource = graphicSource.slice(extraStart, extraEnd < 0 ? graphicSource.length : extraEnd);
      const extraSectionCount = [...extraSource.matchAll(/\bid:\s*"/g)].length;
      if (extraSectionCount < requiredDepth) {
        errors.push(`${slug}: Çizgi Anlatı türünde en az ${requiredDepth} format/görsel anlatı özgü derinleştirme bölümü bekleniyor; mevcut ${extraSectionCount}.`);
      }
    }
    if (!educationRendererSource.includes("extraEducationBlocks")) {
      errors.push(`${slug}: Çizgi Anlatı ek eğitim bölümleri ortak renderer tarafından sayfaya bağlanmıyor.`);
    }
  }

  const effectiveSource = page.includes('getCmsPageTemplate("ornek-roman")')
    ? `${page}\n${templateSource}`
    : isFictionBatched
      ? `${page}\n${fictionRendererSource}\n${fictionDefinitionsSource}\n${fictionDepthSource}\n${pedagogyParitySource}`
      : isEducationBatched
        ? `${page}\n${educationRendererSource}\n${allEducationDefinitionsSource}\n${literatureDepthSource}\n${stageDepthSource}\n${informationalDepthSource}\n${youthDefinitionsSource}\n${graphicDefinitionsSource}`
        : page;

  const rendererSource = isFictionBatched ? fictionRendererSource : isEducationBatched ? educationRendererSource : "";
  const cmsConnected = isBatched
    ? rendererSource.includes("getEducationGuideRecord(definition.slug)")
    : page.includes(`getEducationGuideRecord("${slug}")`);
  const activeConnected = isBatched
    ? rendererSource.includes("activeGenreSlug={definition.slug}")
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
  for (const [ok, message] of checks) if (!ok) errors.push(`${slug}: ${message}.`);

  const visualSource = isBatched ? rendererSource : page;
  for (const key of visualKeys) {
    const keyPattern = new RegExp(`\\b${key}\\b`);
    if (!keyPattern.test(visualSource)) errors.push(`${slug}: 7 görsel slotundan '${key}' sayfaya bağlanmamış.`);
  }

  const hasShellRoute = shell.includes(`${slug}: "${href}"`) || shell.includes(`"${slug}": "${href}"`);
  if (!hasShellRoute) errors.push(`${slug}: WritingGuideShell canlı route eşlemesi bozuk.`);
}

if (errors.length > 0) fail(errors);

const pendingHumanPass = liveGuides.length > humanPass.length ? allGenres[humanPass.length] : null;
const pendingTechnicalReview = Math.max(0, liveGuides.length - humanPass.length);
const nextGenre = allGenres[liveGuides.length] ?? null;

console.log(`[EĞİTİM BOMBE GATE] PASS — ${liveGuides.length}/${allGenres.length} teknik canlı tür doğrulandı: ${liveGuides.map((item) => item.slug).join(", ")}`);
console.log("[EĞİTİM BOMBE PEDAGOJİ] Batch sayfalarda Roman-parity modülleri doğrulandı: fikir kaynakları + tür farkı + tam yazım rotası + yazım düzeni + ilk taslak + yayına hazırlık + uygulama çıktısı.");
console.log("[EĞİTİM BOMBE DERİNLİK] Kurgu batch: Roman üstü ≥4; özel Kurgu: ≥12 özel blok; Edebiyat: ≥4; Senaryo ve Sahne: ≥5; Akademik: ≥3; Bilgilendirici: konu/risk düzeyine göre ≥4–6; Çocuk ve Gençlik: yaş/tür düzeyine göre ≥5–7; Çizgi Anlatı: format/görsel anlatı düzeyine göre ≥6–7 ek eğitim bölümü zorunlu.");
console.log(`[EĞİTİM BOMBE İLERLEME] HUMAN_PASS: ${humanPass.length}/${allGenres.length}.`);
if (pendingHumanPass) console.log(`[EĞİTİM BOMBE BEKLİYOR] İlk HUMAN_PASS/görsel kuyruğu: ${pendingHumanPass.label} (${pendingHumanPass.slug}) · ${pendingHumanPass.category}.`);
if (pendingTechnicalReview > 0) console.log(`[EĞİTİM BOMBE BATCH] ${pendingTechnicalReview} teknik canlı tür görsel + canlı kullanıcı kontrolü + HUMAN_PASS bekliyor.`);
if (nextGenre) console.log(`[EĞİTİM BOMBE SIRADAKİ TEKNİK] ${nextGenre.label} (${nextGenre.slug}) · ${nextGenre.category}.`);
else console.log("[EĞİTİM BOMBE SIRADAKİ] Tüm GENRES eğitimleri teknik olarak canlı.");
console.log("Kontrol: GENRES sırası + route + dynamic + CMS + sol menü + 7 slot + Roman-parity pedagojik tamlık + türe özgü derinleştirme + örnek proje + ustalar + SSS + final CTA.");
console.log("Not: Teknik batch hazırlığı HUMAN_PASS değildir. HUMAN_PASS yalnız gerçek kullanıcı onayıyla writing-guide-progress.json dosyasına eklenir.");
