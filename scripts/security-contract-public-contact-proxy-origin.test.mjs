import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = (path) => ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function createRoute() {
  let writes = 0;
  let failWrite = false;
  const afterCallbacks = [];
  let failNotification = false;
  const notifications = [];
  const helperModule = { exports: {} };
  vm.runInNewContext(compile("src/lib/same-origin.ts"), {
    exports: helperModule.exports, module: helperModule,
    require: (name) => {
      assert.equal(name, "server-only");
      return {};
    },
    URL, Set, process: { env: {
      NEXT_PUBLIC_SITE_URL: "https://ilkoku.com",
      SITE_URL: "https://ilkoku.com",
    } },
  }, { timeout: 1000 });

  const routeModule = { exports: {} };
  const api = {
    redirect: (url, status) => ({ type: "redirect", location: String(url), status }),
    json: (payload, init) => ({ type: "json", payload, status: init?.status ?? 200 }),
  };
  vm.runInNewContext(compile("src/app/api/site-contact/route.ts"), {
    exports: routeModule.exports, module: routeModule, URL, JSON, String, Date,
    require: (name) => {
      if (name === "node:crypto") return { randomUUID: () => "test-uuid" };
      if (name === "next/server") return { NextResponse: api, after: (callback) => afterCallbacks.push(callback) };
      if (name === "@/lib/prisma") return { prisma: {
        $executeRaw: async () => {
          if (failWrite) throw new Error("simulated database unavailable");
          writes++;
          return 1;
        },
      } };
      if (name === "@/lib/same-origin") return helperModule.exports;
      if (name === "@/lib/email/site-contact-notification") return {
        sendSiteContactNotification: async (input) => {
          notifications.push(input);
          if (failNotification) throw new Error("SMTP_TEST_FAILURE");
        },
      };
      throw new Error("Unexpected dependency: " + name);
    },
  }, { timeout: 1000 });

  return {
    post: routeModule.exports.POST,
    getWrites: () => writes,
    getNotifications: () => notifications,
    flushBackground: async () => { for (const callback of afterCallbacks.splice(0)) await callback(); },
    setNotificationFailure: (value) => { failNotification = value; },
    setDatabaseFailure: (value) => { failWrite = value; },
  };
}

function request({ origin = "https://ilkoku.com", referer = null,
  forwardedHost = "ilkoku.com", forwardedProto = "https",
  values = { name: "Example", email: "test@example.com",
    subject: "Test", message: "Harmless example form message" } } = {}) {
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    "x-forwarded-host": forwardedHost, "x-forwarded-proto": forwardedProto,
    "host": "internal-node:3000",
  };
  if (origin !== null) headers.origin = origin;
  if (referer) headers.referer = referer;
  return new Request("http://internal-node:3000/api/site-contact", {
    method: "POST", headers, body: new URLSearchParams(values),
  });
}

test("valid browser submission survives Cloudflare / internal Node origin difference", async () => {
  const route = createRoute();
  const result = await route.post(request());
  assert.equal(result.type, "redirect");
  assert.equal(result.status, 303);
  assert.equal(result.location, "https://ilkoku.com/iletisim?durum=alindi");
  assert.equal(route.getWrites(), 1);
  assert.equal(route.getNotifications().length, 0, "send runs after the response");
  await route.flushBackground();
  assert.equal(route.getNotifications().length, 1);
  assert.equal(route.getNotifications()[0].email, "test@example.com");
});

test("foreign Origin remains blocked before parsing form or writing data", async () => {
  const route = createRoute();
  const result = await route.post(request({ origin: "https://malicious.example" }));
  assert.equal(result.type, "json");
  assert.equal(result.status, 403);
  assert.equal(result.payload.ok, false);
  assert.equal(route.getWrites(), 0);
  assert.equal(route.getNotifications().length, 0);
});

test("missing origin and referer is rejected, while same-site referer is accepted", async () => {
  const route = createRoute();
  const denied = await route.post(request({ origin: null }));
  assert.equal(denied.status, 403);
  assert.equal(route.getWrites(), 0);
  const allowed = await route.post(request({
    origin: null, referer: "https://ilkoku.com/iletisim",
  }));
  assert.equal(allowed.status, 303);
  assert.equal(allowed.location, "https://ilkoku.com/iletisim?durum=alindi");
  assert.equal(route.getWrites(), 1);
});

test("invalid fields redirect publicly without any write", async () => {
  const route = createRoute();
  const result = await route.post(request({ values: {
    name: "", email: "bad", message: "",
  } }));
  assert.equal(result.location, "https://ilkoku.com/iletisim?durum=eksik");
  assert.equal(route.getWrites(), 0);
});

test("database error redirects publicly as failure, never success", async () => {
  const route = createRoute();
  route.setDatabaseFailure(true);
  const result = await route.post(request());
  assert.equal(result.status, 303);
  assert.equal(result.location, "https://ilkoku.com/iletisim?durum=hata");
  assert.equal(route.getWrites(), 0);
});


test("email failure never discards a saved form or reports a false database failure", async () => {
  const route = createRoute();
  route.setNotificationFailure(true);
  const log = console.error;
  console.error = () => {};
  try {
    const result = await route.post(request());
    assert.equal(result.status, 303);
    assert.equal(result.location, "https://ilkoku.com/iletisim?durum=alindi");
    assert.equal(route.getWrites(), 1);
    assert.equal(route.getNotifications().length, 0);
    await route.flushBackground();
    assert.equal(route.getNotifications().length, 1);
  } finally {
    console.error = log;
  }
});

test("contact analytics still requires server-confirmed success redirect", () => {
  const route = readFileSync("src/app/api/site-contact/route.ts", "utf8");
  const analytics = readFileSync("src/components/privacy/SiteInteractionAnalytics.tsx", "utf8");
  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /sameOriginRequestUrl\(request, "\/iletisim\?durum=alindi"\)/);
  assert.doesNotMatch(route, /new URL\(request\.url\)\.origin/);
  assert.match(analytics, /status !== "alindi" \|\| !hasFreshPendingContact\(\)/);
  assert.match(analytics, /emitPublicInteraction\("site_form_success"/);
});
