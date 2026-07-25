import { NextResponse, type NextRequest } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
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

  const session = protectedRoute
    ? await getRequestSession(request, Boolean(roleRule) || isAdminRoute)
    : {
        authenticated: false,
        configured: true,
        profile: null,
        response: NextResponse.next({ request }),
      };

  if (protectedRoute && !session.authenticated) {
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

  /*
   * Admin sayfaları yalnızca admin rolüne açıktır.
   * Writer/editor/publisher gibi roller burada açık bir erişim
   * reddedildi ekranına gönderilir.
   */
  if (isAdminRoute && !isAdmin) {
    return createAccessDeniedRedirect(
      request,
      session.response,
      "admin",
    );
  }

  /*
   * Admin bütün kullanıcı panellerini inceleyebilir.
   * Diğer kullanıcılar yalnızca kendi rollerine ait alanlara girebilir.
   */
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

  /*
   * Türkçe URL dışarıda korunur, uygulama içindeki gerçek klasöre rewrite edilir.
   */
  if (matchesPath(pathname, publicEditorsPath)) {
    const destination = request.nextUrl.clone();

    destination.pathname = pathname.replace(
      publicEditorsPath,
      internalEditorsPath,
    );

    return copySession(
      session.response,
      NextResponse.rewrite(destination),
    );
  }

  return session.response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};