import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace } from "@/lib/cms-locales";
import { safeCmsInternalHref } from "@/lib/cms-links";
import { getPublishedRoleCardsState } from "@/lib/cms-role-card-store";
import { cmsRoleMeta, roleCardsDefaults, roleCardsFromPayload } from "@/lib/cms-role-cards";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string };
type Section = Record<string, string>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "İlkOku | Write, read, review, discover",
  description: "A digital literature ecosystem connecting writers, readers, editors and publishers.",
  alternates: { canonical: "https://ilkoku.com/en", languages: { "tr-TR": "https://ilkoku.com/", "en": "https://ilkoku.com/en" } },
  openGraph: { title: "İlkOku", description: "Write, read, review and get discovered.", type: "website", locale: "en_US" },
};

function parse(valueJson: string): Section {
  try {
    const raw = JSON.parse(valueJson) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch { return {}; }
}

export default async function EnglishHomePage() {
  if (!(await isCmsLocaleEnabled("en"))) notFound();

  const namespace = cmsLocaleNamespace("homepage", "en");
  const [rows, roleCardState] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson
      FROM SiteContent
      WHERE namespace = ${namespace} AND status = 'published'
    `.catch(() => [] as Row[]),
    getPublishedRoleCardsState("en"),
  ]);

  const content = new Map(rows.map((row) => [row.contentKey, parse(row.valueJson)]));
  const hero = content.get("hero");
  const roles = content.get("roles");
  const passport = content.get("passport");
  const why = content.get("why");
  const footer = content.get("footer");
  const primaryHref = safeCmsInternalHref(hero?.primaryCtaHref) || "/kayit?rol=writer";
  const secondaryHref = safeCmsInternalHref(hero?.secondaryCtaHref) || "/kesfet";
  const passportHref = safeCmsInternalHref(passport?.ctaHref) || "#roles";
  const roleCards = roleCardState.state === "valid"
    ? roleCardsFromPayload("en", roleCardState.payload)
    : roleCardsDefaults("en");
  const visibleRoleCards = roleCards.filter((card) => card.visible);

  return (
    <main style={{ minHeight: "100vh", background: "#f8f7fb", color: "#211f2b" }}>
      <header style={{ maxWidth: 1180, margin: "0 auto", padding: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <Link href="/en"><Image src={logo} alt="İlkOku" priority style={{ width: 150, height: "auto" }} /></Link>
        <nav style={{ display: "flex", gap: ".9rem", alignItems: "center" }}>
          <Link href="/en/yardim">Help</Link>
          <Link href="/">Türkçe</Link>
        </nav>
      </header>

      <section style={{ maxWidth: 980, margin: "0 auto", padding: "6rem 1.25rem 5rem", textAlign: "center" }}>
        {hero?.title && hero?.description ? (
          <>
            <span style={{ fontSize: ".78rem", fontWeight: 800, letterSpacing: ".12em", color: "#6847e8" }}>İLKOKU</span>
            <h1 style={{ whiteSpace: "pre-line", fontSize: "clamp(2.6rem,7vw,5.5rem)", lineHeight: 1.02, margin: "1rem 0" }}>{hero.title}</h1>
            <p style={{ maxWidth: 760, margin: "0 auto", fontSize: "1.08rem", lineHeight: 1.8, color: "#666171" }}>{hero.description}</p>
            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center", gap: ".8rem", flexWrap: "wrap" }}>
              <Link href={primaryHref} style={{ padding: ".9rem 1.2rem", borderRadius: 999, background: "#6847e8", color: "white", textDecoration: "none", fontWeight: 800 }}>{hero.primaryCtaLabel || "Start Writing"}</Link>
              <Link href={secondaryHref} style={{ padding: ".9rem 1.2rem", borderRadius: 999, border: "1px solid #ded9ec", textDecoration: "none", fontWeight: 800 }}>{hero.secondaryCtaLabel || "Discover Works"}</Link>
            </div>
          </>
        ) : (
          <div style={{ padding: "3rem", border: "1px solid #e5e0ef", borderRadius: "1.2rem", background: "white" }}>
            <h1>English content is being prepared.</h1>
            <p style={{ color: "#716d80" }}>The English site is enabled, but the homepage has not been published yet.</p>
          </div>
        )}
      </section>

      {roles?.title ? (
        <section id="roles" style={{ maxWidth: 1080, margin: "0 auto", padding: "3rem 1.25rem" }}>
          <span style={{ color: "#6847e8", fontWeight: 800 }}>{roles.eyebrow}</span>
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>{roles.title}</h2>
          <p style={{ color: "#666171", lineHeight: 1.7 }}>{roles.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: ".8rem", marginTop: "1.5rem" }}>
            {visibleRoleCards.map((card) => (
              <Link href={cmsRoleMeta[card.key].fixedHref} key={card.key} style={{ padding: "1.35rem", borderRadius: "1rem", background: "white", border: "1px solid #e9e5f0", textDecoration: "none", color: "inherit" }}>
                <small style={{ color: "#7a728e", fontWeight: 800 }}>0{card.position} · {card.key.toUpperCase()}</small>
                <h3 style={{ margin: ".6rem 0", fontSize: "1.2rem" }}>{card.title}</h3>
                <p style={{ color: "#666171", lineHeight: 1.65 }}>{card.description}</p>
                <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", margin: ".8rem 0" }}><small>{card.highlight1}</small><small>{card.highlight2}</small></div>
                <strong style={{ color: "#6847e8" }}>{card.ctaLabel} →</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {passport?.title ? <section style={{ maxWidth: 1080, margin: "0 auto", padding: "3rem 1.25rem" }}><div style={{ padding: "2rem", borderRadius: "1.4rem", background: "#201936", color: "white" }}><span style={{ color: "#b9a6ff", fontWeight: 800 }}>{passport.eyebrow}</span><h2 style={{ fontSize: "clamp(1.8rem,4vw,3rem)" }}>{passport.title}</h2><p style={{ lineHeight: 1.8, color: "#ddd6ef" }}>{passport.description}</p><Link href={passportHref} style={{ color: "white", fontWeight: 800 }}>{passport.ctaLabel || "Choose Your Role"}</Link></div></section> : null}

      {why?.title ? <section style={{ maxWidth: 1080, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}><span style={{ color: "#6847e8", fontWeight: 800 }}>{why.eyebrow}</span><h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>{why.title}</h2><p style={{ color: "#666171", lineHeight: 1.8 }}>{why.description}</p></section> : null}

      <footer style={{ borderTop: "1px solid #e8e4ef", padding: "2rem 1.25rem" }}><div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}><div><strong>İlkOku</strong><p style={{ color: "#716d80" }}>{footer?.slogan || "Write. Read. Review. Discover."}</p></div><div><Link href="/en/yardim">Help Center</Link><p style={{ color: "#716d80" }}>{footer?.copyright || "İlkOku. All rights reserved."}</p></div></div></footer>
    </main>
  );
}