import { NextResponse, type NextRequest } from "next/server";
import {
  getRequestSession,
  INTERNAL_SESSION_USER_HEADER,
} from "@/lib/auth/request-session";
import type { UserRole } from "@/types/database";

const publicEditorsPath = "/editörler";
const internalEditorsPath = "/editorler";

const protectedPaths = [
  "/admin",
  "/yazar",
  "/eserlerim",
  "/yazmaya-devam",
  "/geri-bildirimler",
  "/yayinevleri",
  publicEditorsPath,
  internalEditorsPath,
  "/yayinevi",
  "/rol-secimi",
];

interface RouteRoleRule {
  approved: boolean;
  path: string;
  role: UserRole;
}

const routeRoleRules: RouteRoleRule[] = [
  { approved: false, path: "/yazar", role: "writer" },
  { approved: false, path: "/eserlerim", role: "writer" },
  { approved: false, path: "/yazmaya-devam", role: "writer" },
  { approved: false, path: "/geri-bildirimler", role: "writer" },
  { approved: false, path: "/yayinevleri", role: "writer" },
  { approved: true, path: publicEditorsPath, role: "editor" },
  { approved: true, path: internalEditorsPath, role: "editor" },
  { approved: true, path: "/yayinevi", role: "publisher" },
];

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function isProtected(pathname: string) {
  return protectedPaths.some((path) => matchesPath(pathname, path));
}

function getRoleRule(pathname: string) {
  return routeRoleRules.find(({ path }) => matchesPath(pathname, path));
}

function createSanitizedRequestHeaders(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(INTERNAL_SESSION_USER_HEADER);
  return requestHeaders;
}

function copySession(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);

    if (value) {
      destination.headers.set(header, value);
    }
  }

  return destination;
}

function createAccessDeniedRedirect(
  request: NextRequest,
  sessionResponse: NextResponse,
  source: string,
) {
  const destination = request.nextUrl.clone();

  destination.pathname = "/erisim-reddedildi";
  destination.search = "";
  destination.searchParams.set("kaynak", source);

  return copySession(sessionResponse, NextResponse.redirect(destination));
}

export async function proxy(request: NextRequest) {
  const pathname = decodeURIComponent(request.nextUrl.pathname);
  const roleRule = getRoleRule(pathname);
  const isAdminRoute = matchesPath(pathname, "/admin");
  const protectedRoute = isProtected(pathname);

  if (!protectedRoute) {
    return NextResponse.next({
      request: {
        headers: createSanitizedRequestHeaders(request),
      },
    });
  }

  const session = await getRequestSession(
    request,
    Boolean(roleRule) || isAdminRoute,
  );

  if (!session.authenticated) {
    const destination = request.nextUrl.clone();

    destination.pathname = "/giris";
    destination.search = "";
    destination.searchParams.set(
      "sonraki",
      pathname.replace(internalEditorsPath, publicEditorsPath),
    );

    if (!session.configured) {
      destination.searchParams.set("durum", "yapilandirma");
    }

    return copySession(session.response, NextResponse.redirect(destination));
  }

  const currentRole = session.profile?.role;
  const isAdmin = currentRole === "admin";

  if (isAdminRoute && !isAdmin) {
    return createAccessDeniedRedirect(request, session.response, "admin");
  }

  if (roleRule && !isAdmin) {
    const hasRequiredRole = currentRole === roleRule.role;
    const hasRequiredApproval =
      !roleRule.approved || Boolean(session.profile?.roleApprovedAt);

    if (!session.profile || !hasRequiredRole || !hasRequiredApproval) {
      return createAccessDeniedRedirect(
        request,
        session.response,
        roleRule.role,
      );
    }
  }

  if (matchesPath(pathname, publicEditorsPath)) {
    const destination = request.nextUrl.clone();

    destination.pathname = pathname.replace(
      publicEditorsPath,
      internalEditorsPath,
    );

    return copySession(
      session.response,
      NextResponse.rewrite(destination, {
        request: {
          headers: session.requestHeaders,
        },
      }),
    );
  }

  return session.response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
