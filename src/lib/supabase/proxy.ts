import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

export interface SessionProfile {
  role: UserRole;
  roleApprovedAt: string | null;
}

export async function refreshSupabaseSession(request: NextRequest, includeProfile = false) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return { authenticated: false, configured: false, isAdmin: false, profile: null, response };
  }

  const { publishableKey, url } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims);
  const appMetadata = data?.claims?.app_metadata as Record<string, unknown> | undefined;
  const isAdmin = appMetadata?.role === "admin" || appMetadata?.is_admin === true;
  let profile: SessionProfile | null = null;

  if (includeProfile && data?.claims?.sub) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, role_approved_at")
      .eq("id", data.claims.sub)
      .maybeSingle();

    if (profileData) {
      profile = {
        role: profileData.role as UserRole,
        roleApprovedAt: profileData.role_approved_at,
      };
    }
  }

  return { authenticated, configured: true, isAdmin, profile, response };
}
