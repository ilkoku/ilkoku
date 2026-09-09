import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("login session issuance serializes on live user state", () => {
  const state = source("src/lib/auth/login-session-state.ts");
  const login = source("src/lib/auth/login.ts");
  const issueStart = state.indexOf("export async function issueLoginSession");
  const issue = state.slice(issueStart);
  const userLock = issue.indexOf("FROM User");
  const liveEligibilityCall = issue.indexOf("availableUser(user)");
  const changedHashCheck = issue.indexOf("user.passwordHash !== input.preverifiedPasswordHash");
  const sessionCreate = issue.indexOf("transaction.session.create");

  assert.ok(userLock >= 0, "login session issuance must lock User");
  assert.ok(
    liveEligibilityCall > userLock,
    "login eligibility must be checked after the User lock",
  );
  assert.ok(
    changedHashCheck > liveEligibilityCall,
    "live password hash must be compared after account eligibility",
  );
  assert.ok(sessionCreate > changedHashCheck, "Session must be created only after live credential checks");
  assertContains(issue, "FOR UPDATE", "login User lock");
  assertContains(state, 'user.status === "active"', "login active-account guard");
  assertContains(state, "!Boolean(user.isBanned)", "login banned-account guard");
  assertContains(state, "!user.deletedAt", "login deleted-account guard");
  assertContains(issue, "verifyPassword(input.password, user.passwordHash)", "changed live password recheck");

  assertContains(login, "issueLoginSession({", "login canonical session delegation");
  assert.ok(
    !login.includes("await prisma.session.create"),
    "login.ts must not create sessions outside the locked state boundary",
  );
});

test("logout cannot surface cleanup or audit failures as an application error", () => {
  const actions = source("src/features/auth/actions.ts");
  const logoutStart = actions.indexOf("export async function logoutAction");
  assert.ok(logoutStart >= 0, "logout action must remain available");

  const logout = actions.slice(logoutStart);
  const sessionDelete = logout.indexOf("prisma.session.deleteMany");
  const auditWrite = logout.indexOf("prisma.auditLog.create");
  const cookieClear = logout.indexOf("await clearSessionCookie()");
  const redirectHome = logout.indexOf('redirect("/")');

  assert.ok(sessionDelete >= 0, "logout must revoke the server session");
  assert.ok(auditWrite > sessionDelete, "logout audit must happen only after session revocation");
  assert.ok(cookieClear > sessionDelete, "logout must clear the browser session after revoke attempt");
  assert.ok(redirectHome > cookieClear, "logout must always finish by returning to the public home page");
  assertContains(logout, 'console.error("LOGOUT_SESSION_REVOKE_FAILED"', "logout revoke failure isolation");
  assertContains(logout, 'console.error("LOGOUT_AUDIT_FAILED"', "logout audit failure isolation");
  assertContains(logout, 'console.error("LOGOUT_SESSION_COOKIE_CLEAR_FAILED"', "logout session-cookie failure isolation");
  assertContains(logout, 'console.error("LOGOUT_ADMIN_COOKIE_CLEAR_FAILED"', "logout admin-cookie failure isolation");
  assert.ok(
    !logout.includes("prisma.$transaction"),
    "logout must not couple session revocation to best-effort audit logging",
  );
});

test("shared account menu logout is independent from build-specific Server Action ids", () => {
  const userArea = source("src/components/layout/UserArea.tsx");
  const route = source("src/app/cikis/route.ts");

  assertContains(userArea, '<form action="/cikis" method="post">', "stable logout POST form");
  assert.ok(
    !userArea.includes("logoutAction"),
    "shared account menu must not submit logout through a build-specific Server Action id",
  );
  assertContains(route, "export async function POST(request: Request)", "logout POST route");
  assertContains(route, "prisma.session.deleteMany", "logout POST session revocation");
  assertContains(route, "prisma.auditLog.create", "logout POST audit write");
  assertContains(route, "await clearSessionCookie()", "logout POST session-cookie cleanup");
  assertContains(route, "await clearAdminRoleViewCookie()", "logout POST admin-view cleanup");
  assertContains(route, "NextResponse.redirect(getLogoutRedirectUrl(request), 303)", "logout POST redirect");
});

test("production logout never leaks an internal Hostinger origin", () => {
  const route = source("src/app/cikis/route.ts");

  assertContains(route, 'if (process.env.NODE_ENV === "production")', "production logout origin guard");
  assertContains(route, 'return new URL("https://ilkoku.com/");', "canonical production logout target");
  assertContains(route, 'return new URL("/", request.url);', "development logout target");
  assert.ok(
    route.indexOf('return new URL("https://ilkoku.com/");') <
      route.indexOf('return new URL("/", request.url);'),
    "canonical production redirect must be selected before request-origin fallback",
  );
});

test("self-hosted builds expose a deployment id for version-skew protection", () => {
  const config = source("next.config.ts");

  assertContains(config, "NEXT_DEPLOYMENT_ID", "explicit deployment id override");
  assertContains(config, "DEPLOYMENT_VERSION", "generic deployment version override");
  assertContains(config, 'execFileSync("git", ["rev-parse", "HEAD"]', "git commit deployment fallback");
  assertContains(config, "...(deploymentId ? { deploymentId } : {})", "Next.js deployment id configuration");
});

test("authenticated login navigation fails safely when auxiliary role-view or routing lookups fail", () => {
  const profile = source("src/features/auth/profile.ts");
  const destination = source("src/features/auth/destination.ts");

  assertContains(
    profile,
    'console.error("ADMIN_ROLE_VIEW_READ_FAILED"',
    "admin role-view read failure isolation",
  );
  assertContains(
    profile,
    ").catch((error) => {",
    "admin role-view safe fallback",
  );
  assertContains(
    destination,
    'console.error("AUTH_DESTINATION_LOOKUP_FAILED"',
    "authenticated destination lookup failure isolation",
  );
  assertContains(
    destination,
    "return roleDestinations[user.role];",
    "authenticated destination static role fallback",
  );
});
