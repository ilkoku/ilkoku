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
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

function assertNotContains(text, fragment, label) {
  assert.ok(
    !text.includes(fragment),
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("admin role-view cookie is signed, session-bound and admin-only", () => {
  const cookie = source("src/features/admin-role-view/cookie.ts");

  assertContains(cookie, "createHmac", "admin role-view cookie");
  assertContains(cookie, "timingSafeEqual", "admin role-view cookie");
  assertContains(
    cookie,
    "payload.sessionId === context.sessionId",
    "admin role-view cookie",
  );
  assertContains(
    cookie,
    'context.userRole === "admin"',
    "admin role-view cookie",
  );
  assertContains(cookie, "httpOnly: true", "admin role-view cookie");
  assertContains(cookie, 'sameSite: "strict"', "admin role-view cookie");
  assertContains(
    cookie,
    'secure: process.env.NODE_ENV === "production"',
    "admin role-view cookie",
  );
});

test("profile keeps actual admin role separate from preview role", () => {
  const profile = source("src/features/auth/profile.ts");

  assertContains(
    profile,
    "const actualRole = user.role as UserRole",
    "auth profile",
  );
  assertContains(
    profile,
    'actualRole === "admin" && !options.ignoreAdminRoleView',
    "auth profile",
  );
  assertContains(profile, "actualRole,", "auth profile");
  assertContains(
    profile,
    "role: roleView?.role ?? actualRole",
    "auth profile",
  );
});

test("admin role cannot be changed through self-service role selection", () => {
  const actions = source("src/features/auth/actions.ts");
  const page = source("src/app/rol-secimi/page.tsx");
  const start = actions.indexOf(
    "export async function updateRoleAction",
  );
  const end = actions.indexOf(
    "export async function logoutAction",
    start,
  );

  assert.ok(start >= 0 && end > start, "updateRoleAction could not be isolated");
  const block = actions.slice(start, end);
  const adminGuard = block.indexOf('user.role === "admin"');
  const directMutation = block.indexOf("prisma.user.update");
  const transactionalMutation = block.indexOf("transaction.user.update");
  const mutationIndexes = [directMutation, transactionalMutation].filter(
    (value) => value >= 0,
  );

  assert.ok(adminGuard >= 0, "updateRoleAction lost the actual-admin guard");
  assert.ok(mutationIndexes.length > 0, "updateRoleAction mutation boundary disappeared");
  assert.ok(
    mutationIndexes.every((mutationIndex) => adminGuard < mutationIndex),
    "admin guard must execute before any user role mutation",
  );
  assertContains(
    block,
    "validationContent.adminRoleImmutable",
    "updateRoleAction admin guard",
  );
  assertContains(
    page,
    'profile?.actualRole === "admin"',
    "role selection page",
  );
  assertContains(page, 'redirect("/hesabim")', "role selection page");
});

test("writer, editor and reader writes authorize against the real session role", () => {
  const writer = source("src/features/works/actions.ts");
  const editor = source("src/features/editor-workspace/actions.ts");
  const reader = source("src/features/reader/comments.ts");
  const authData = source("src/features/auth/data.ts");

  assertContains(writer, "getCurrentUser", "writer mutations");
  assertContains(writer, 'user.role !== "writer"', "writer mutations");
  assertContains(editor, "getCurrentUser", "editor mutations");
  assertContains(editor, 'user.role !== "editor"', "editor mutations");
  assertContains(reader, "getCurrentUser", "reader mutations");
  assertContains(
    reader,
    "!canAccessReaderWorkspace(user.role)",
    "reader mutations",
  );

  const readerRolesStart = authData.indexOf(
    "export const readerWorkspaceRoles",
  );
  const readerRolesEnd = authData.indexOf(
    "];",
    readerRolesStart,
  );
  assert.ok(
    readerRolesStart >= 0 && readerRolesEnd > readerRolesStart,
    "reader role allowlist could not be isolated",
  );
  assertNotContains(
    authData.slice(readerRolesStart, readerRolesEnd),
    '"admin"',
    "reader mutation role allowlist",
  );
});

test("publisher preview membership remains synthetic and mutation-read-only", () => {
  const repository = source(
    "src/features/publisher-workspace/repository.ts",
  );
  const sharing = source(
    "src/features/publisher-discovery/sharing-repository.ts",
  );

  assertContains(
    repository,
    "adminReadOnly: true as const",
    "publisher admin preview",
  );
  assertContains(
    repository,
    "isPublisherAdminReadOnlyMembership(membership)",
    "publisher mutation permission boundary",
  );
  assertContains(
    sharing,
    "isPublisherAdminReadOnlyMembership(membership)",
    "publisher sharing mutation boundary",
  );
});

test("role-view changes require the real admin session and verified publisher context", () => {
  const actions = source("src/features/admin-role-view/actions.ts");
  const authActions = source("src/features/auth/actions.ts");

  assertContains(
    actions,
    'context.user.role !== "admin"',
    "admin role-view action",
  );
  assertContains(actions, "active: true", "publisher preview target");
  assertContains(actions, "archivedAt: null", "publisher preview target");
  assertContains(actions, "verified: true", "publisher preview target");
  assertContains(
    authActions,
    "await clearAdminRoleViewCookie()",
    "logout role-view cleanup",
  );
});
