import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { roleDestinations } from "@/features/auth/data";
import type { UserRole } from "@/features/auth/types";

const roles: UserRole[] = ["reader", "writer", "editor", "publisher"];
const standardRoles: UserRole[] = ["reader", "writer"];

function safePath(value: string | null, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.clone();
  if (!isSupabaseConfigured()) {
    destination.pathname = "/giris";
    destination.search = "?durum=baglanti-gecersiz";
    return NextResponse.redirect(destination);
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const fallback = type === "recovery" ? "/sifre-yenile" : "/rol-secimi";
  let next = safePath(request.nextUrl.searchParams.get("next"), fallback);
  const isRecovery = type === "recovery" || next === "/sifre-yenile";
  let status: string | null = null;
  let selectedRole: UserRole | null = null;
  const supabase = await createClient();
  const result = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Doğrulama bilgisi eksik.") };

  if (!result.error && !isRecovery) {
    const roleIntent = result.data?.user?.user_metadata.signup_role_intent;
    selectedRole = roles.includes(roleIntent as UserRole) ? roleIntent as UserRole : null;
    if (selectedRole) {
      const { error: roleError } = standardRoles.includes(selectedRole)
        ? await supabase.rpc("set_standard_role", { selected_role: selectedRole })
        : await supabase.rpc("request_privileged_role", { requested: selectedRole });
      if (roleError) {
        next = "/rol-secimi";
        status = "rol-kaydedilemedi";
      } else if (standardRoles.includes(selectedRole)) {
        next = roleDestinations[selectedRole];
      } else {
        next = "/rol-secimi";
        status = "talep-alindi";
      }
    }
  }

  destination.pathname = result.error ? "/giris" : next;
  destination.search = "";
  if (result.error) destination.searchParams.set("durum", "baglanti-gecersiz");
  if (!result.error && status) destination.searchParams.set("durum", status);
  if (!result.error && selectedRole) destination.searchParams.set("rol", selectedRole);
  return NextResponse.redirect(destination);
}
