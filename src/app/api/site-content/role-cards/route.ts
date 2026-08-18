import { NextResponse } from "next/server";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale } from "@/lib/cms-locales";
import { getPublishedRoleCardsState } from "@/lib/cms-role-card-store";
import { roleCardsFromPayload } from "@/lib/cms-role-cards";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = normalizeCmsLocale(url.searchParams.get("dil"));
  const enabled = await isCmsLocaleEnabled(locale).catch(() => false);

  if (!enabled) {
    return NextResponse.json({ locale, enabled: false, published: false, cards: [] });
  }

  const state = await getPublishedRoleCardsState(locale);
  if (state.state === "unavailable" || state.state === "corrupt") {
    return NextResponse.json(
      { locale, enabled: true, published: false, cards: [], error: "ROLE_CARDS_UNAVAILABLE" },
      { status: 503 },
    );
  }
  if (state.state === "missing") {
    return NextResponse.json({ locale, enabled: true, published: false, cards: [] });
  }

  return NextResponse.json({
    locale,
    enabled: true,
    published: true,
    cards: roleCardsFromPayload(locale, state.payload),
  });
}
