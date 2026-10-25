import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const account = readFileSync("src/components/layout/PublicSiteAccount.tsx", "utf8");
const header = readFileSync("src/components/layout/PublicSiteHeader.tsx", "utf8");
const wf = readFileSync(".github/workflows/seo-mobile-lighthouse-baseline.yml", "utf8");

test("Collapsed account popover retains all destinations without eager RSC prefetch", () => {
  for (const token of [
    '<Link prefetch={false} href="/giris">Giriş Yap</Link>',
    '<Link prefetch={false} href="/kayit">Üye Ol</Link>',
    '<Link prefetch={false} href="/hesabim">Hesabım</Link>',
    '<Link prefetch={false} href={account.workspaceHref}>Çalışma Alanım</Link>',
  ]) assert.ok(account.includes(token), "Missing crawlable/link-preserving contract: " + token);
  assert.ok(account.includes('<details className="public-site-header__account">'));
  assert.ok(account.includes('<summary'));
  assert.ok(account.includes('action="/cikis"'));
  assert.ok(account.includes('fetch("/api/public-account"'));
  assert.ok(header.includes('<PublicSiteAccount />'));
});

test("Targeted account change triggers one mobile Lighthouse retest", () => {
  assert.match(wf, /src\/components\/layout\/PublicSiteAccount\.tsx/u);
  assert.match(wf, /workflow_dispatch:/u);
  assert.doesNotMatch(wf, /schedule:|workflow_run:/u);
  assert.match(wf, /--form-factor=mobile/u);
});
