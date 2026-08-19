import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/features/auth/types";
import { getRequestSession } from "@/lib/auth/request-session";
import {
  adminAccessSource,
  getRouteRoleRule,
  isAdminOnlyPath,
  isProtectedPath,
  matchesPath,
  publisherInvitationPath,
  publisherPath,
} from "@/lib/route-security";

const legacyEditorsPath = "/editörler";
const publicEditorsPath = "/editorler";

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
  const roleRule = getRouteRoleRule(pathname);
  const isAdminRoute = isAdminOnlyPath(pathname);
  const isPublisherRoute = matchesPath(pathname, publisherPath);
  const isPublisherInvitationRoute = matchesPath(
    pathname,
    publisherInvitationPath,
  );
  const protectedRoute = isProtectedPath(pathname);

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
    destination.searchParams.set("sonraki", pathname);

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
   * Sistem yönetimi, sistem haritası ve merkezi sözleşme yönetimi
   * yalnızca gerçek admin rolüne açıktır. UI görünürlüğü güvenlik
   * sayılmaz; erişim burada request katmanında da fail-closed kapanır.
   */
  if (isAdminRoute && !isAdmin) {
    return createAccessDeniedRedirect(
      request,
      session.response,
      adminAccessSource(pathname),
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
   * Eski Türkçe karakterli editör URL'lerini tek canonical public URL'ye yönlendir.
   */
  if (matchesPath(pathname, legacyEditorsPath)) {
    const destination = request.nextUrl.clone();

    destination.pathname = pathname.replace(
      legacyEditorsPath,
      publicEditorsPath,
    );

    return NextResponse.redirect(destination, 308);
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
