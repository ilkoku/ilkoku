import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

export type SessionRole = UserRole | "admin";

export interface SessionProfile {
  role: SessionRole;
  roleApprovedAt: string | null;
}

export async function refreshSupabaseSession(request: NextRequest, includeProfile = false) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return { authenticated: false, configured: false, profile: null, response };
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
  let profile: SessionProfile | null = null;

  if (includeProfile && data?.claims?.sub) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, role_approved_at")
      .eq("id", data.claims.sub)
      .maybeSingle();

    if (profileData) {
      profile = {
        role: profileData.role as SessionRole,
        roleApprovedAt: profileData.role_approved_at,
      };
    }
  }

  return { authenticated, configured: true, profile, response };
}
