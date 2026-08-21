import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(
  text.includes(fragment),
  `${label} must contain ${JSON.stringify(fragment)}`,
);
const notContains = (text, fragment, label) => assert.ok(
  !text.includes(fragment),
  `${label} must not contain ${JSON.stringify(fragment)}`,
);

test("contract reminder server action is admin-only and requires explicit confirmation", () => {
  const action = source("src/features/contracts/reminder-actions.ts");

  contains(action, 'admin.role !== "admin"', "admin authorization gate");
  contains(action, 'formData.get("reminderConfirmed") === "confirmed"', "explicit reminder confirmation");
  contains(action, "hatirlatma_onayi_gerekli", "fail-closed confirmation redirect");
  contains(action, "sendAdminContractReminder({", "canonical reminder service delegation");
  assert.ok(
    action.indexOf("reminderConfirmed") < action.indexOf("sendAdminContractReminder({"),
    "confirmation must be checked before the reminder service is called",
  );
});

test("reminder preparation re-authorizes and serializes live contract state before creating one daily reminder", () => {
  const reminder = source("src/features/contracts/reminders.ts");

  contains(reminder, "FOR UPDATE", "row locking");
  contains(reminder, "lockAdmin(transaction, input.actorId)", "live admin re-authorization");
  contains(reminder, "lockRecipient(transaction, recipientUserId)", "live recipient re-authorization");
  contains(reminder, "lockReminderContract(transaction, input.contractId)", "live contract lock");
  assert.ok(
    reminder.indexOf("lockRecipient(transaction, recipientUserId)") <
      reminder.indexOf("lockReminderContract(transaction, input.contractId)"),
    "recipient must be locked before contract to preserve canonical lock ordering",
  );

  contains(reminder, 'contract.status !== "sent" && contract.status !== "viewed"', "pending-response status boundary");
  contains(reminder, "!contract.activeKey", "active manual assignment boundary");
  contains(reminder, "contract.templateCode === MANDATORY_REGISTRATION_CONTRACT_CODE", "registration agreement exclusion");
  contains(reminder, 'eventType = \'reminder_requested\'', "daily reminder audit lookup");
  contains(reminder, "createdAt >= ${day.start}", "daily window lower bound");
  contains(reminder, "createdAt < ${day.end}", "daily window upper bound");
  contains(reminder, 'status: "already_reminded" as const', "daily duplicate fail-closed result");
  contains(reminder, 'timeZone: "Europe/Istanbul"', "Istanbul product day boundary");
});

test("in-app reminder and audit commit before external email while transport outcome remains auditable", () => {
  const reminder = source("src/features/contracts/reminders.ts");

  contains(reminder, "transaction.notification.create", "in-app reminder fallback");
  contains(reminder, "'reminder_requested'", "reminder request audit event");
  contains(reminder, "if (prepared.status !== \"prepared\") return prepared;", "post-transaction delivery boundary");
  contains(reminder, "sendUserContractReminderEmail({", "external reminder email");
  assert.ok(
    reminder.indexOf("transaction.notification.create") <
      reminder.indexOf("sendUserContractReminderEmail({"),
    "in-app notification must be committed before external email transport",
  );

  contains(reminder, 'eventType: "reminder_email_sent"', "successful transport audit");
  contains(reminder, 'eventType: "reminder_email_failed"', "failed transport audit");
  contains(reminder, "USER_CONTRACT_REMINDER_EMAIL_FAILED", "transport failure log");
  notContains(reminder, "bodySnapshot", "reminder service must not load or log contract body");
  notContains(reminder, "adminNote", "reminder service must not load or log admin note");
});

test("reminder email is daily-idempotent and carries only the secure contract link", () => {
  const email = source("src/lib/email/contract-emails.ts");

  contains(email, "sendUserContractReminderEmail", "reminder email producer");
  contains(email, 'idempotencyKey: `user-contract:${input.contractId}:reminder:${input.dateKey}`', "daily reminder idempotency");
  contains(email, 'template: "user_contract_reminder"', "reminder email template");
  contains(email, 'channel: "system"', "system email channel");
  contains(email, "/sozlesmelerim/", "authenticated contract target");
  contains(email, "Bu e-posta sözleşme metninin kendisini içermez.", "email privacy boundary");
  notContains(email, "bodySnapshot", "contract body must not be emailed");
  notContains(email, "adminNote", "admin note must not be emailed");
});

test("admin contract detail exposes reminders only for pending manual contracts and shows their audit trail", () => {
  const page = source("src/app/sozlesme/[contractId]/page.tsx");

  contains(page, "const remindable = cancellable && !isRegistrationContract;", "UI reminder eligibility");
  contains(page, "sendContractReminderAction", "canonical reminder UI action");
  contains(page, 'name="reminderConfirmed" required type="checkbox" value="confirmed"', "required UI confirmation");
  contains(page, "reminder_requested", "request audit label");
  contains(page, "reminder_email_sent", "success audit label");
  contains(page, "reminder_email_failed", "failure audit label");
  contains(page, "already_reminded", "daily duplicate operator feedback");
});
