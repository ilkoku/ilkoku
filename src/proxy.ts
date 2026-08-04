import { NextResponse, type NextRequest } from "next/server";
import { readerWorkspaceRoles } from "@/features/auth/data";
import type { UserRole } from "@/features/auth/types";
import { getRequestSession } from "@/lib/auth/request-session";

const publicEditorsPath = "/editörler";
const internalEditorsPath = "/editorler";
const publisherPath = "/yayinevi";
const publisherInvitationPath = "/yayinevi/davet";

const protectedPaths = [
  "/admin",
  "/hesabim",
  "/editor",
  "/favorilerim",
  "/bildirimler",
  "/kesfet",
  "/okuyucu",
  "/okumaya-devam",
  "/oku",
  "/tamamlanan-eserler",
  "/yazar",
  "/eserlerim",
  "/yazmaya-devam",
  "/geri-bildirimler",
  "/yorumlarim",
  "/yayinevleri",
  publicEditorsPath,
  internalEditorsPath,
  "/yayinevi",
  "/rol-secimi",
];

interface RouteRoleRule {
  approved: boolean;
  path: string;
  roles: UserRole[];
}

const routeRoleRules: RouteRoleRule[] = [
  { approved: false, path: "/favorilerim", roles: [...readerWorkspaceRoles] },
  { approved: false, path: "/bildirimler", roles: [...readerWorkspaceRoles] },
  { approved: false, path: "/kesfet", roles: [...readerWorkspaceRoles] },
  { approved: false, path: "/okuyucu", roles: [...readerWorkspaceRoles] },
  { approved: false, path: "/okumaya-devam", roles: [...readerWorkspaceRoles] },
  { approved: false, path: "/tamamlanan-eserler", roles: [...readerWorkspaceRoles] },
  { approved: false, path: "/yazar", roles: ["writer"] },
  { approved: false, path: "/eserlerim", roles: ["writer"] },
  { approved: false, path: "/yazmaya-devam", roles: ["writer"] },
  { approved: false, path: "/geri-bildirimler", roles: ["writer"] },
  { approved: false, path: "/yorumlarim", roles: ["writer"] },
  { approved: false, path: "/yayinevleri", roles: ["writer"] },
  { approved: true, path: "/editor", roles: ["editor"] },
  { approved: true, path: publicEditorsPath, roles: ["editor"] },
  { approved: true, path: internalEditorsPath, roles: ["editor"] },
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

function applyReadingSecurityHeaders(
  response: NextResponse,
  pathname: string,
) {
  if (!matchesPath(pathname, "/oku")) {
    return response;
  }

  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet",
  );
  response.headers.set("Referrer-Policy", "same-origin");

  return response;
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
  const isPublisherRoute = matchesPath(pathname, publisherPath);
  const isPublisherInvitationRoute = matchesPath(
    pathname,
    publisherInvitationPath,
  );
  const protectedRoute = isProtected(pathname);

  const session = protectedRoute
    ? await getRequestSession(
        request,
        Boolean(roleRule) || isAdminRoute || isPublisherRoute,
      )
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
      matchesPath(pathname, internalEditorsPath)
        ? pathname.replace(internalEditorsPath, publicEditorsPath)
        : pathname,
    );

    if (!session.configured) {
      destination.searchParams.set("durum", "yapilandirma");
    }

    return applyReadingSecurityHeaders(
      copySession(session.response, NextResponse.redirect(destination)),
      pathname,
    );
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
   * Doğrulanmış yayınevinin aktif ekip üyeleri ayrıca platform
   * admin rol onayı beklemeden çalışma alanına girebilir. Davet
   * kabul route'u, üyelik henüz oluşmadan aktif hesaba açık kalır.
   */
  if (
    isPublisherRoute &&
    !isPublisherInvitationRoute &&
    !isAdmin &&
    !session.profile?.hasActivePublisherMembership
  ) {
    return createAccessDeniedRedirect(
      request,
      session.response,
      "publisher_membership",
    );
  }

  /*
   * Admin bütün kullanıcı panellerini inceleyebilir.
   * Diğer kullanıcılar yalnızca kendi rollerine ait alanlara girebilir.
   */
  if (roleRule && !isAdmin) {
    const hasRequiredRole =
      Boolean(currentRole) &&
      roleRule.roles.includes(
        currentRole as UserRole,
      );

    if (!session.profile || !hasRequiredRole) {
      return createAccessDeniedRedirect(
        request,
        session.response,
        roleRule.roles[0],
      );
    }

    if (
      roleRule.approved &&
      !session.profile.roleApprovedAt
    ) {
      return createAccessDeniedRedirect(
        request,
        session.response,
        "approved",
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

  return applyReadingSecurityHeaders(
    session.response,
    pathname,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
