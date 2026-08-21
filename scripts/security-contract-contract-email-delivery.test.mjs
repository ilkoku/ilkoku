import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) => assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("manual contract assignment sends one idempotent operational email after the database transaction commits", () => {
  const dispatch = source("src/features/contracts/manual-dispatch.ts");
  const email = source("src/lib/email/contract-emails.ts");

  contains(dispatch, "const result = await prisma.$transaction", "canonical assignment transaction");
  contains(dispatch, 'if (result.status !== "sent") return result;', "email only after successful assignment");
  contains(dispatch, "sendUserContractAssignedEmail", "post-commit contract email");
  assert.ok(
    dispatch.indexOf('if (result.status !== "sent") return result;') < dispatch.indexOf("sendUserContractAssignedEmail({"),
    "email delivery must execute only after the assignment transaction has returned successfully",
  );

  contains(email, 'idempotencyKey: `user-contract:${input.contractId}:sent`', "stable per-contract send idempotency");
  contains(email, 'template: "user_contract_sent"', "central email delivery template");
  contains(email, 'channel: "system"', "system sender channel");
  contains(email, "/sozlesmelerim/", "authenticated contract detail target");
});

test("contract email keeps sensitive agreement body out of email and preserves in-app delivery on transport failure", () => {
  const dispatch = source("src/features/contracts/manual-dispatch.ts");
  const email = source("src/lib/email/contract-emails.ts");

  contains(email, "Bu e-posta sözleşme metninin kendisini içermez.", "privacy boundary copy");
  notContains(email, "bodySnapshot", "contract body must not be emailed");
  notContains(email, "adminNote", "admin note must not be emailed");
  contains(dispatch, "USER_CONTRACT_EMAIL_DELIVERY_FAILED", "non-PII delivery failure logging");
  contains(dispatch, 'emailDelivery: "failed" as const', "non-transactional email failure result");
  contains(dispatch, "notification.create", "in-app notification remains canonical fallback");
  assert.ok(
    dispatch.indexOf("notification.create") < dispatch.indexOf("sendUserContractAssignedEmail({"),
    "in-app notification must be committed before external email transport runs",
  );
});

test("contract email uses the canonical EmailDelivery and dedupe infrastructure", () => {
  const email = source("src/lib/email/contract-emails.ts");
  const sender = source("src/lib/email/send-email.ts");

  contains(email, 'from "./send-email"', "central sender dependency");
  contains(email, "return sendEmail({", "central sender call");
  contains(sender, "claimEmailDeliveryDedupe", "dedupe claim");
  contains(sender, "prisma.emailDelivery.create", "EmailDelivery log creation");
  contains(sender, 'status:\n          "failed"', "failed delivery persistence");
  contains(sender, 'status:\n          "sent"', "sent delivery persistence");
});
