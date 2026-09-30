import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { PublicHeaderNavigation } from "@/components/layout/PublicHeaderNavigation";
import { resolveHeaderNavigation } from "@/lib/cms-header-navigation";
import { getPublishedHeaderNavigation } from "@/lib/cms-header-navigation-server";
import { getPublicSiteIdentity } from "@/lib/site-identity";

import "./public-site-header.css";
import "./public-site-header-terminal.css";
import "./public-back-navigation.css";
import "./public-trust-hero-proof.css";
import "./public-site-mega-menu.css";
import "./public-site-mega-menu-layer.css";
import "./public-site-account-popover.css";

type ResolvedHeaderMenu = ReturnType<typeof resolveHeaderNavigation>[number] & {
  directHref?: string;
};

function withBookIndexMenu(
  menus: ReturnType<typeof resolveHeaderNavigation>,
): ResolvedHeaderMenu[] {
  const withoutBookIndex = menus.flatMap((menu) => {
    if (menu.id === "book-index") return [];

    const groups = menu.groups
      .map((group) => ({
        ...group,
        links: group.links.filter((item) => !item.pageId.startsWith("book-index")),
      }))
      .filter((group) => group.links.length > 0);

    if (groups.length === 0) return [];
    return [{ ...menu, groups }];
  });

  const bookIndexMenu: ResolvedHeaderMenu = {
    id: "book-index",
    label: "Kitap Endeksi",
    groups: [
      {
        id: "book-index-main",
        title: "Ana Listeler",
        links: [
          {
            href: "/en-cok-satanlar",
            label: "En Çok Satanlar",
            primary: true,
            pageId: "book-index",
          },
          {
            href: "/en-cok-satanlar/turkiye",
            label: "Türkiye",
            primary: false,
            pageId: "book-index-turkey",
          },
          {
            href: "/yeni-cikanlar",
            label: "Yeni Çıkanlar",
            primary: false,
            pageId: "book-index-new-releases",
          },
          {
            href: "/en-cok-satanlar/dunya",
            label: "Dünya",
            primary: false,
            pageId: "book-index-global",
          },
        ],
      },
      {
        id: "book-index-compare",
        title: "Karşılaştır",
        links: [
          {
            href: "/en-cok-satanlar/turkiye/karsilastirma",
            label: "Karşılaştırma",
            primary: false,
            pageId: "book-index-comparison",
          },
        ],
      },
      {
        id: "book-index-trends",
        title: "Trendler",
        links: [
          {
            href: "/en-cok-satanlar/yeni-girisler",
            label: "Yeni Girişler",
            primary: false,
            pageId: "book-index-new-entries",
          },
          {
            href: "/en-cok-satanlar/yukselenler",
            label: "Yükselenler",
            primary: false,
            pageId: "book-index-risers",
          },
          {
            href: "/en-cok-satanlar/her-yerde-satanlar",
            label: "Her Yerde Satanlar",
            primary: false,
            pageId: "book-index-everywhere",
          },
          {
            href: "/en-cok-satanlar/uzun-satanlar",
            label: "Uzun Satanlar",
            primary: false,
            pageId: "book-index-long-sellers",
          },
        ],
      },
    ],
  };

  const supportIndex = withoutBookIndex.findIndex(
    (menu) => menu.id === "support",
  );

  if (supportIndex < 0) return [...withoutBookIndex, bookIndexMenu];

  return [
    ...withoutBookIndex.slice(0, supportIndex),
    bookIndexMenu,
    ...withoutBookIndex.slice(supportIndex),
  ];
}

function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export async function PublicSiteHeader() {
  const [identity, navigation] = await Promise.all([
    getPublicSiteIdentity(),
    getPublishedHeaderNavigation(),
  ]);
  const publicMenus = withBookIndexMenu(
    resolveHeaderNavigation(navigation.payload, navigation.pages),
  );

  return (
    <header className="public-site-header">
      <div className="public-site-header__inner">
        <Link
          className="public-site-header__brand"
          href="/"
          aria-label="İlkOku ana sayfa"
        >
          {identity.logoUrl ? (
            <Image
              src={identity.logoUrl}
              alt={identity.logoAlt}
              priority
              width={308}
              height={76}
              sizes="(max-width: 480px) 86px, (max-width: 768px) 94px, 154px"
            />
          ) : (
            <Image
              src={logo}
              alt={identity.logoAlt}
              priority
              sizes="(max-width: 480px) 86px, (max-width: 768px) 94px, 154px"
            />
          )}
        </Link>

        <span className="public-site-header__kicker">
          {identity.headerKicker}
        </span>

        <div className="public-site-header__tools">
          <details className="public-site-header__account">
            <summary aria-label="Hesap menüsünü aç">
              <AccountIcon />
            </summary>

            <div className="public-site-header__account-menu">
              <Link href="/hesabim">Hesabım</Link>
              <Link href="/giris">Giriş Yap</Link>
              <Link href="/kayit">Üye Ol</Link>
            </div>
          </details>
        </div>
      </div>

      <div className="public-site-header__nav-band">
        <div className="public-site-header__nav-inner">
          <PublicHeaderNavigation menus={publicMenus} />
        </div>
      </div>
    </header>
  );
}
