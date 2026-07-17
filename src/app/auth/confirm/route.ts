import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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
  const next = safePath(request.nextUrl.searchParams.get("next"), fallback);
  const supabase = await createClient();
  const result = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Doğrulama bilgisi eksik.") };

  destination.pathname = result.error ? "/giris" : next;
  destination.search = result.error ? "?durum=baglanti-gecersiz" : "";
  return NextResponse.redirect(destination);
}
