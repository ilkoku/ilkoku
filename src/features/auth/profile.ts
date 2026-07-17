import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { authContent } from "@/content";
import type { UserRole } from "./types";

export interface AuthProfile {
  avatarUrl: string | null;
  fullName: string;
  id: string;
  role: UserRole;
}

const validRoles: UserRole[] = ["reader", "writer", "editor", "publisher"];

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, role, avatar_url").eq("id", data.user.id).maybeSingle();
  if (!profile || !validRoles.includes(profile.role as UserRole)) return null;

  return {
    avatarUrl: profile?.avatar_url ?? data.user.user_metadata.avatar_url ?? null,
    fullName: profile?.full_name || data.user.user_metadata.full_name || data.user.email?.split("@")[0] || authContent.common.fallbackUserName,
    id: data.user.id,
    role: profile.role as UserRole,
  };
}
