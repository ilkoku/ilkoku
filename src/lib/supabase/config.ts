const placeholderValues = ["proje-kimliginiz", "proje_anahtariniz"];

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return Boolean(
    url &&
      publishableKey &&
      !placeholderValues.some((placeholder) => url.includes(placeholder) || publishableKey.includes(placeholder)),
  );
}

export function getSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase ortam değişkenleri yapılandırılmamış.");
  }

  return {
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  };
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
