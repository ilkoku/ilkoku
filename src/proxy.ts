import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";
import type { UserRole } from "@/types/database";

const publicEditorsPath = "/editörler";
const internalEditorsPath = "/editorler";
const protectedPaths = ["/admin", "/yazar", "/eserlerim", "/yazmaya-devam", "/geri-bildirimler", "/yayinevleri", publicEditorsPath, internalEditorsPath, "/yayinevi", "/rol-secimi"];

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

function isProtected(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getRoleRule(pathname: string) {
  return routeRoleRules.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
}

function copySession(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) destination.headers.set(header, value);
  }
  return destination;
}

export async function proxy(request: NextRequest) {
  const pathname = decodeURIComponent(request.nextUrl.pathname);
  const roleRule = getRoleRule(pathname);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const session = await refreshSupabaseSession(request, Boolean(roleRule) || isAdminRoute);

  if (isProtected(pathname) && !session.authenticated) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/giris";
    destination.search = "";
    destination.searchParams.set("sonraki", pathname.replace(internalEditorsPath, publicEditorsPath));
    if (!session.configured) destination.searchParams.set("durum", "yapilandirma");
    return copySession(session.response, NextResponse.redirect(destination));
  }

  if (isAdminRoute && session.profile?.role !== "admin") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/erisim-reddedildi";
    destination.search = "";
    destination.searchParams.set("kaynak", "admin");
    return copySession(session.response, NextResponse.redirect(destination));
  }

  if (
    roleRule
    && (
      !session.profile
      || session.profile.role !== roleRule.role
      || (roleRule.approved && !session.profile.roleApprovedAt)
    )
  ) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/erisim-reddedildi";
    destination.search = "";
    return copySession(session.response, NextResponse.redirect(destination));
  }

  if (pathname === publicEditorsPath || pathname.startsWith(`${publicEditorsPath}/`)) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname.replace(publicEditorsPath, internalEditorsPath);
    return copySession(session.response, NextResponse.rewrite(destination));
  }

  return session.response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
