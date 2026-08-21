import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

const migrations = {
  editorEthics: "prisma/migrations/20260821122500_soft_editor_review_ethics_v2/migration.sql",
  editorCandidate: "prisma/migrations/20260821123000_soft_editor_candidate_nda_v2/migration.sql",
  publisherDiscovery: "prisma/migrations/20260821123500_soft_publisher_discovery_nda_v2/migration.sql",
  publisherTeam: "prisma/migrations/20260821124000_soft_publisher_team_confidentiality_v2/migration.sql",
  writerIntent: "prisma/migrations/20260821124500_soft_publication_intent_writer_v2/migration.sql",
  publisherIntent: "prisma/migrations/20260821125000_soft_publication_intent_publisher_v2/migration.sql",
};

function assertGuardedInactiveV1Migration(text, code) {
  contains(text, `WHERE \`code\` = '${code}'`, `${code} migration target`);
  contains(text, "AND `version` = 1", `${code} untouched v1 guard`);
  contains(text, "AND `active` = false", `${code} inactive guard`);
  contains(text, "`version` = `version` + 1", `${code} version increment`);
  notContains(text, "`active` = true", `${code} must remain inactive`);
}

test("editor ethics soft draft enforces confidentiality, independence and conflict boundaries", () => {
  const migration = source(migrations.editorEthics);

  contains(migration, "GÖREV VE YETKİ SINIRI", "editor task boundary");
  contains(migration, "GİZLİLİK VE MAHREMİYET", "editor confidentiality");
  contains(migration, "ÇIKAR ÇATIŞMASI", "editor conflict disclosure");
  contains(migration, "BAĞIMSIZ DEĞERLENDİRME", "independent review");
  contains(migration, "HARİCİ ARAÇLAR, BULUT VE YAPAY ZEKÂ", "external tool boundary");
  contains(migration, "sistemde bulunmayan bir çekilme mekanizması", "no invented recusal workflow");
  contains(migration, "ÜCRET, İSTİHDAM VE TEMSİL", "no invented employment model");
  assertGuardedInactiveV1Migration(migration, "SOFT_EDITOR_REVIEW_ETHICS");
});

test("editor candidate and external editor soft draft keeps invitation access temporary and non-transferable", () => {
  const migration = source(migrations.editorCandidate);

  contains(migration, "SINIRLI VE GEÇİCİ ERİŞİM", "temporary external editor access");
  contains(migration, "DAVET VE HESAP GÜVENLİĞİ", "invitation security");
  contains(migration, "üçüncü taraf yapay zekâ", "external AI boundary");
  contains(migration, "ROL, ÜCRET VE İSTİHDAM DOĞMAZ", "no automatic editor role or fee");
  contains(migration, "ERİŞİMİN SONA ERMESİ VE KAYITLAR", "access termination boundary");
  contains(migration, "işlem kayıtlarının derhal silineceği varsayılmaz", "no invented immediate audit deletion");
  assertGuardedInactiveV1Migration(migration, "SOFT_EDITOR_CANDIDATE_NDA");
});

test("publisher discovery NDA mirrors passport, content, file and sharing permission boundaries", () => {
  const migration = source(migrations.publisherDiscovery);
  const access = source("src/features/publisher-discovery/access.ts");
  const permissions = source("src/features/publisher-workspace/permissions.ts");

  contains(migration, "PASAPORT, İÇERİK VE DOSYA AYRIMI", "discovery content tiers");
  for (const permission of ["view_authorized_passport", "view_authorized_content", "view_files", "download_files", "share_internal", "share_email"]) {
    contains(migration, permission, `draft permission ${permission}`);
    contains(permissions, `\"${permission}\"`, `product permission ${permission}`);
  }
  contains(access, 'source: "discovery" | "shared"', "discovery/shared access source");
  contains(migration, "HAKLAR, ÖNCELİK VE MÜNHASIRLIK DOĞMAZ", "no rights by discovery access");
  contains(migration, "advanceAmount, royaltyPercentage, rightsPeriodMonths ve territory", "canonical commercial fields stay separate");
  assertGuardedInactiveV1Migration(migration, "SOFT_PUBLISHER_DISCOVERY_NDA");
});

test("publisher team confidentiality draft mirrors least-privilege permission model", () => {
  const migration = source(migrations.publisherTeam);
  const permissions = source("src/features/publisher-workspace/permissions.ts");

  contains(migration, "KİŞİ BAZLI YETKİ MODELİ", "member-specific permissions");
  contains(migration, "view_files yetkisi download_files yetkisi değildir", "view/download separation");
  contains(migration, "share_internal ve share_email ayrı izinlerdir", "internal/email sharing separation");
  contains(migration, "manage_contract ve manage_publication_plan", "protected contract/plan permissions");
  contains(permissions, 'const protectedContractPermissionKeys', "protected product permission group");
  contains(permissions, '"manage_contract"', "manage contract product permission");
  contains(permissions, '"manage_publication_plan"', "manage publication plan product permission");
  contains(migration, "DENETİM İZİ", "publisher audit responsibility");
  assertGuardedInactiveV1Migration(migration, "SOFT_PUBLISHER_TEAM_CONFIDENTIALITY");
});

test("writer publication intent stays non-binding and defers rights and commercial terms to final contract", () => {
  const migration = source(migrations.writerIntent);

  contains(migration, "BAĞLAYICI NİHAİ YAYIN SÖZLEŞMESİ DEĞİLDİR", "writer intent non-binding boundary");
  contains(migration, "HAKLARIN KORUNMASI", "writer rights remain reserved");
  contains(migration, "royaltyPercentage, advanceAmount, rightsPeriodMonths ve territory", "canonical commercial negotiation fields");
  contains(migration, "YAYIN KAPSAMI VE FORMATLAR", "rights/formats separated");
  contains(migration, "otomatik münhasırlık", "no automatic exclusivity");
  contains(migration, "GEÇİCİ TAKVİM VE ÜRETİM PLANLAMASI", "planning is not production commitment");
  contains(migration, "NİHAİ SÖZLEŞMEYE GEÇİŞ", "final contract transition");
  assertGuardedInactiveV1Migration(migration, "SOFT_PUBLICATION_INTENT_WRITER");
});

test("publisher publication intent mirrors canonical contract and publication-plan authorization", () => {
  const migration = source(migrations.publisherIntent);
  const lifecycle = source("src/features/publisher-contracts/lifecycle.ts");

  contains(migration, "BAĞLAYICI NİHAİ YAYIN SÖZLEŞMESİ DEĞİLDİR", "publisher intent non-binding boundary");
  contains(migration, "manage_contract ve manage_publication_plan", "publisher protected permissions");
  contains(migration, "advanceAmount, royaltyPercentage, rightsPeriodMonths ve territory", "contract commercial fields");
  contains(migration, "printRun, ISBN, kapak ve layout", "publication plan fields");
  contains(migration, "SÖZLEŞME AKIŞI", "canonical contract flow separation");
  contains(migration, "YAYIN PLANI AKIŞI", "canonical plan flow separation");
  contains(lifecycle, 'permission: "manage_contract"', "contract lifecycle permission re-check");
  contains(lifecycle, 'permission: "manage_publication_plan"', "plan lifecycle permission re-check");
  contains(lifecycle, "rightsPeriodMonths", "lifecycle rights period field");
  contains(lifecycle, "royaltyPercentage", "lifecycle royalty field");
  contains(lifecycle, "targetPublicationDate", "lifecycle publication date field");
  assertGuardedInactiveV1Migration(migration, "SOFT_PUBLICATION_INTENT_PUBLISHER");
});

test("all remaining soft-draft maturity migrations exist", () => {
  for (const relativePath of Object.values(migrations)) {
    assert.ok(existsSync(join(ROOT, relativePath)), `${relativePath} must exist`);
  }
});
