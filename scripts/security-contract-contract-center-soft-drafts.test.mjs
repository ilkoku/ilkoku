import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("contract center uses one persistent admin-only navigation shell", () => {
  const layout = source("src/app/sozlesme/layout.tsx");
  const navigation = source("src/features/contracts/ContractManagementNavigation.tsx");

  contains(layout, "ContractManagementNavigation", "contract layout navigation");
  contains(layout, 'user.role !== "admin"', "contract admin guard");
  contains(layout, "contract-management-shell", "contract shell");
  contains(navigation, 'href: "/sozlesme/taslaklar"', "soft draft navigation");
  contains(navigation, 'href: "/sozlesme/sablonlar"', "template library navigation");
  contains(navigation, 'href: "/harita"', "system map navigation");
  contains(navigation, "Hukuki inceleme tamamlanmadan", "draft activation warning");
});

test("soft draft workbench is read-first and keeps drafts out of sendable templates by default", () => {
  const page = source("src/app/sozlesme/taslaklar/page.tsx");
  const catalog = source("src/features/contracts/soft-draft-catalog.ts");
  const migration = source("prisma/migrations/20260821113000_contract_soft_draft_library/migration.sql");

  contains(page, "listContractTemplates({ includeInactive: true })", "draft workbench reads inactive templates");
  contains(page, "nihai hukuki görüş veya imzaya hazır sözleşme değildir", "soft draft legal boundary");
  contains(page, "royalty", "missing commercial terms warning");
  contains(catalog, "SOFT_WRITER_PLATFORM_LICENSE", "writer platform draft catalog");
  contains(catalog, "SOFT_EDITOR_REVIEW_ETHICS", "editor ethics draft catalog");
  contains(catalog, "SOFT_PUBLISHER_DISCOVERY_NDA", "publisher discovery draft catalog");
  contains(catalog, "SOFT_PUBLICATION_INTENT_WRITER", "writer publication intent draft catalog");
  contains(catalog, "SOFT_PUBLICATION_INTENT_PUBLISHER", "publisher publication intent draft catalog");

  const codes = [
    "SOFT_GENERAL_NDA",
    "SOFT_WRITER_PLATFORM_LICENSE",
    "SOFT_WRITER_EDITOR_REVIEW",
    "SOFT_EDITOR_REVIEW_ETHICS",
    "SOFT_EDITOR_CANDIDATE_NDA",
    "SOFT_PUBLISHER_DISCOVERY_NDA",
    "SOFT_PUBLISHER_TEAM_CONFIDENTIALITY",
    "SOFT_PUBLICATION_INTENT_WRITER",
    "SOFT_PUBLICATION_INTENT_PUBLISHER",
  ];
  for (const code of codes) contains(migration, `'${code}'`, `seeded ${code}`);
  assert.equal(
    migration.split("'c2000000-0000-4000-8000-00000000000").length - 1,
    9,
    "migration must seed exactly nine soft drafts",
  );
  assert.ok(migration.split("    false,").length - 1 >= 9, "all seeded soft drafts must start inactive");
  notContains(migration, "UPDATE `ContractTemplate`", "soft draft migration must not overwrite existing templates");
});

test("contract template detail preserves the workbench return context", () => {
  const detailPage = source("src/app/sozlesme/sablonlar/[templateId]/page.tsx");
  const newPage = source("src/app/sozlesme/sablonlar/yeni/page.tsx");
  const form = source("src/features/contracts/ContractTemplateForm.tsx");

  contains(detailPage, 'template.code.startsWith("SOFT_")', "soft draft detection");
  contains(detailPage, 'softDraft ? "/sozlesme/taslaklar" : "/sozlesme/sablonlar"', "contextual return route");
  contains(detailPage, '"Soft Taslaklara dön"', "soft draft return label");
  contains(detailPage, '"Şablon Kütüphanesine dön"', "template library return label");
  contains(detailPage, "returnHref={returnHref}", "form return context propagation");
  contains(form, 'returnHref = "/sozlesme/sablonlar"', "template form safe library default");
  contains(form, '<Link href={returnHref}>Vazgeç</Link>', "template form contextual cancel");
  contains(newPage, 'href="/sozlesme/sablonlar"', "new template returns to library");
  notContains(detailPage, 'href="/sozlesme">← Merkeze dön</Link>', "detail must not collapse to center");
});

test("general confidentiality soft draft matures without overwriting activated or edited state", () => {
  const migration = source("prisma/migrations/20260821114500_soft_general_nda_v2/migration.sql");

  contains(migration, "SOFT TASLAK v2", "general NDA maturity marker");
  contains(migration, "GİZLİ SAYILMAYACAK BİLGİLER", "confidentiality exclusions");
  contains(migration, "BİLMESİ GEREKEN PRENSİBİ", "need-to-know limitation");
  contains(migration, "üçüncü taraf yapay zekâ", "external AI confidentiality boundary");
  contains(migration, "KVKK aydınlatma metni", "privacy notice separation");
  contains(migration, "FİKRİ HAKLAR", "copyright boundary");
  contains(migration, "İADE, SİLME VE SAKLAMA SINIRLARI", "retention and deletion boundary");
  contains(migration, "5070 sayılı Kanun", "electronic signature accuracy boundary");
  contains(migration, "`version` = `version` + 1", "template version increment");
  contains(migration, "AND `version` = 1", "only untouched v1 draft can be matured");
  contains(migration, "AND `active` = false", "activated draft must never be overwritten by migration");
  notContains(migration, "`active` = true", "migration must not activate legal soft draft");
});

test("writer platform license soft draft grants only explicit service-purpose rights", () => {
  const migration = source("prisma/migrations/20260821115500_soft_writer_platform_license_v2/migration.sql");

  contains(migration, "SINIRLI ÇOĞALTMA İZNİ", "explicit technical reproduction permission");
  contains(migration, "DİJİTAL ERİŞİME SUNMA / UMUMA İLETİM SINIRI", "explicit digital access permission");
  contains(migration, "TEKNİK SUNUM VE ESER BÜTÜNLÜĞÜ", "technical rendering boundary");
  contains(migration, "DEVREDİLMEYEN VE VERİLMEYEN HAKLAR", "reserved rights boundary");
  contains(migration, "çeviri, sinema veya dizi uyarlaması", "adaptation rights exclusion");
  contains(migration, "İNTERNETİN TEKNİK COĞRAFYASI", "technical geography is not commercial territory");
  contains(migration, "ROYALTY VE TİCARİ YAYIN HAKLARI", "commercial publishing terms exclusion");
  contains(migration, "mali hakların açıkça ve ayrı ayrı gösterildiği ayrıca yazılı", "separate written publishing agreement boundary");
  contains(migration, "AND `version` = 1", "only untouched v1 writer draft can be matured");
  contains(migration, "AND `active` = false", "active writer draft must not be overwritten");
  notContains(migration, "`active` = true", "migration must not activate writer legal soft draft");
});

test("writer editor-review consent mirrors the two-stage product workflow without inventing rights", () => {
  const migration = source("prisma/migrations/20260821121000_soft_writer_editor_review_v2/migration.sql");

  contains(migration, "BİRİNCİ EDİTÖR ERİŞİMİ", "first editor access boundary");
  contains(migration, "İKİNCİ EDİTÖR AŞAMASI", "second editor stage");
  contains(migration, "Yazarın kendisi ve birinci editör", "second editor conflict boundary");
  contains(migration, "DIŞ EDİTÖR DAVETİ", "external editor path");
  contains(migration, "DEĞERLENDİRMENİN NİTELİĞİ", "no outcome guarantee");
  contains(migration, "yayınevi yayın kararı", "no publisher decision claim");
  contains(migration, "otomatik olarak yayınevleri", "no automatic publisher sharing");
  contains(migration, "sistemde bulunmayan bir iptal hakkı", "no invented withdrawal feature");
  contains(migration, "ücret, komisyon veya telif", "no invented paid-service model");
  contains(migration, "AND `version` = 1", "only untouched v1 editor consent can be matured");
  contains(migration, "AND `active` = false", "active editor consent must not be overwritten");
  notContains(migration, "`active` = true", "migration must not activate editor-review soft draft");
});

test("contract soft drafts do not pretend to be final publishing-rights agreements", () => {
  const migration = source("prisma/migrations/20260821113000_contract_soft_draft_library/migration.sql");
  const publisherCenter = source("src/features/publisher-workspace/components/PublisherContractCenter.tsx");

  contains(migration, "BAĞLAYICI NİHAİ YAYIN SÖZLEŞMESİ DEĞİLDİR", "publication intent boundary");
  contains(migration, "nitelikli elektronik imza", "e-signature accuracy boundary");
  contains(publisherCenter, "Yeni sözleşme oluşturma ve kullanıcıya gönderme yetkisi", "central contract authority");
  notContains(publisherCenter, "saveSecurePublisherContractAction", "publisher direct contract send path remains retired");
});

test("contract center navigation and soft draft routes exist", () => {
  for (const relativePath of [
    "src/app/sozlesme/taslaklar/page.tsx",
    "src/app/sozlesme/sablonlar/page.tsx",
    "src/app/sozlesme/navigation.css",
    "src/features/contracts/ContractManagementNavigation.tsx",
    "src/features/contracts/soft-draft-catalog.ts",
    "prisma/migrations/20260821113000_contract_soft_draft_library/migration.sql",
    "prisma/migrations/20260821114500_soft_general_nda_v2/migration.sql",
    "prisma/migrations/20260821115500_soft_writer_platform_license_v2/migration.sql",
    "prisma/migrations/20260821121000_soft_writer_editor_review_v2/migration.sql",
  ]) {
    assert.ok(existsSync(join(ROOT, relativePath)), `${relativePath} must exist`);
  }
});
