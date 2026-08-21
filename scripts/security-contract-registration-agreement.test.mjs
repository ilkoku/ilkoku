import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("new registration explicitly accepts the published platform agreement while KVKK stays a separate notice", () => {
  const form = source("src/features/auth/components/RegisterForm.tsx");
  const actions = source("src/features/auth/actions.ts");

  contains(form, 'name="terms" required', "required registration checkbox");
  contains(form, 'href="/uyelik-sozlesmesi"', "agreement full-text link");
  contains(form, "İlkOku Platform Kullanım ve Gizlilik Taahhüdü", "agreement label");
  contains(form, 'href="/yasal/kvkk"', "separate KVKK notice link");
  contains(form, "KVKK Aydınlatma Metni", "KVKK notice copy");

  contains(actions, 'formData.get("terms") === "accepted"', "server-side agreement check");
  contains(actions, "if (!termsAccepted)", "server-side fail-closed acceptance");
  contains(actions, "termsAcceptedAt: new Date()", "server-generated acceptance time");
});

test("registration locks the exact active baseline before creating the account and records immutable acceptance evidence", () => {
  const register = source("src/lib/auth/register.ts");
  const agreement = source("src/features/contracts/registration-agreement.ts");

  contains(register, "prisma.$transaction", "atomic registration transaction");
  contains(register, "lockActiveRegistrationAgreement(transaction)", "locked agreement lookup");
  contains(register, 'throw new Error("REGISTRATION_AGREEMENT_UNAVAILABLE")', "missing agreement fail closed");
  contains(register, "recordRegistrationAgreementAcceptance(transaction", "acceptance evidence write");
  assert.ok(
    register.indexOf("lockActiveRegistrationAgreement(transaction)") < register.indexOf("transaction.user.create"),
    "mandatory template must be locked before account creation",
  );

  contains(agreement, '"PLATFORM_MEMBERSHIP_CONFIDENTIALITY_V1"', "stable agreement code");
  contains(agreement, "FOR UPDATE", "template row lock");
  contains(agreement, "active = true", "active template requirement");
  contains(agreement, "lifecycleStatus = 'active'", "active lifecycle requirement");
  contains(agreement, "targetRole = 'any'", "all-user role boundary");
  contains(agreement, "INSERT INTO UserContract", "immutable contract record");
  contains(agreement, "templateVersion", "version snapshot");
  contains(agreement, "titleSnapshot", "title snapshot");
  contains(agreement, "bodySnapshot", "body snapshot");
  contains(agreement, "'accepted'", "accepted terminal state");
  contains(agreement, "INSERT INTO UserContractEvent", "append-only acceptance event");
  contains(agreement, 'source: "registration"', "non-PII registration event source");
  notContains(agreement, "recipientEmail", "acceptance event must not duplicate recipient PII");
});

test("mandatory agreement is seeded as the one active registration baseline without legacy backfill", () => {
  const migration = source("prisma/migrations/20260821140500_mandatory_registration_agreement/migration.sql");

  contains(migration, "PLATFORM_MEMBERSHIP_CONFIDENTIALITY_V1", "baseline code");
  contains(migration, "İlkOku Platform Kullanım ve Gizlilik Taahhüdü", "baseline title");
  contains(migration, "'any'", "all-user target role");
  contains(migration, "true,", "active seed");
  contains(migration, "'active'", "active lifecycle seed");
  contains(migration, "herhangi bir telif veya mali hakkın", "copyright non-transfer boundary");
  contains(migration, "ayrı bir açık rıza beyanı", "KVKK notice and consent separation");
  contains(migration, "nitelikli elektronik imza", "electronic-signature accuracy boundary");
  notContains(migration, "INSERT INTO `UserContract`", "no legacy acceptance backfill");
  notContains(migration, "UPDATE `User`", "no legacy user mutation");
  notContains(migration, "cutoff", "no legacy cutoff model");
});

test("public agreement page exposes only the current active registration baseline", () => {
  const page = source("src/app/uyelik-sozlesmesi/page.tsx");

  contains(page, "getActiveRegistrationAgreement", "canonical active agreement read");
  contains(page, "Yeni hesap oluştururken kabul edilen güncel ve aktif metin", "public purpose copy");
  contains(page, 'href="/kayit"', "registration return link");
  contains(page, 'href="/yasal/kvkk"', "KVKK companion notice");
  contains(page, "fail-closed", "unavailable agreement behavior");
  notContains(page, "listContractTemplates", "no template-library exposure");
  notContains(page, "/sozlesme", "no admin workbench exposure");
});
