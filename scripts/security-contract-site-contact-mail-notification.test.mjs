import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("src/lib/email/site-contact-notification.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function createNotification(env = {}) {
  const calls = [];
  const mod = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: mod.exports,
    module: mod,
    URL,
    process: { env },
    require: (id) => {
      if (id === "./config") return { getEmailSiteUrl: () => "https://ilkoku.com" };
      if (id === "./send-email") return { sendEmail: async (input) => {
        calls.push(input);
        return { delivery: "smtp", id: "example-message-id" };
      } };
      if (id === "@/lib/site-contact") return { siteContact: {
        generalEmail: "ilkoku@ilkoku.com",
      } };
      throw new Error("Unexpected module " + id);
    },
  }, { timeout: 1000 });
  return { send: mod.exports.sendSiteContactNotification, calls };
}

const submission = {
  id: "example-submission-id",
  name: "Ada <Test>",
  email: "ada@example.com",
  subject: "Inquiry </p>",
  message: "Message <script>alert('x')</script> & text",
};

test("public contact email uses official inbox, escaped HTML, and message body", async () => {
  const app = createNotification();
  await app.send(submission);
  assert.equal(app.calls.length, 1);
  const mail = app.calls[0];
  assert.equal(mail.to, "ilkoku@ilkoku.com");
  assert.equal(mail.channel, "support");
  assert.equal(mail.template, "site_contact_notification");
  assert.equal(mail.idempotencyKey, "site-contact-notification:example-submission-id");
  assert.equal(mail.subject, "İlkOku — Yeni iletişim formu mesajı");
  assert.match(mail.html, /Ada &lt;Test&gt;/);
  assert.match(mail.html, /Message &lt;script&gt;alert\(&#039;x&#039;\)&lt;\/script&gt; &amp; text/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.text, /ada@example\.com/);
  assert.match(mail.text, /Message <script>/);
  assert.match(mail.html, /https:\/\/ilkoku\.com\/icerik\/formlar/);
});

test("notification recipient is configurable without exposing a client setting", async () => {
  const app = createNotification({ SITE_CONTACT_NOTIFICATION_EMAIL: " custom@example.org " });
  await app.send(submission);
  assert.equal(app.calls[0].to, "custom@example.org");
});

test("invalid notification recipient falls back to existing official public inbox", async () => {
  const app = createNotification({ SITE_CONTACT_NOTIFICATION_EMAIL: "invalid address" });
  await app.send(submission);
  assert.equal(app.calls[0].to, "ilkoku@ilkoku.com");
});
