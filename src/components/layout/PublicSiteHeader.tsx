import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import {
  EDITOR_EDUCATION_CATEGORIES,
  editorEducationPublicPath,
} from "@/lib/editor-education";
import {
  publicSupportLinks,
  publicTrustLinks,
} from "@/lib/public-site-navigation";
import {
  READER_EDUCATION_CATEGORIES,
  readerEducationPublicPath,
} from "@/lib/reader-education";
import { getPublicSiteIdentity } from "@/lib/site-identity";
import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs";

import "./public-site-header.css";
import "./public-site-header-terminal.css";
import "./public-back-navigation.css";
import "./public-trust-hero-proof.css";
import "./public-site-mega-menu.css";

type MenuLink = {
  href: string;
  label: string;
  primary?: boolean;
};

type MenuGroup = {
  title: string;
  links: readonly MenuLink[];
};

type MegaMenu = {
  label: string;
  groups: readonly MenuGroup[];
};

const writerMenu: MegaMenu = {
  label: "Yazar",
  groups: [
    {
      title: "Yazarlığı keşfet",
      links: [
        { href: "/yazarlar-icin", label: "Yazarlar İçin", primary: true },
        { href: "/kayit?rol=writer", label: "Yazar Ol" },
        { href: "/nasil-calisir", label: "İlkOku nasıl çalışır?" },
      ],
    },
    {
      title: "Yazarlık Okulu",
      links: WRITING_CATEGORY_HUBS.map((category) => ({
        href: category.href,
        label: category.title,
      })),
    },
  ],
};

const readerMidpoint = Math.ceil(READER_EDUCATION_CATEGORIES.length / 2);
const readerMenu: MegaMenu = {
  label: "Okur",
  groups: [
    {
      title: "Okurluğa başla",
      links: [
        { href: "/kayit?rol=reader", label: "Okuyucu Ol", primary: true },
        {
          href: readerEducationPublicPath(READER_EDUCATION_CATEGORIES[0]),
          label: "Okumaya Başlama",
        },
      ],
    },
    {
      title: "Okurluk Okulu",
      links: READER_EDUCATION_CATEGORIES.slice(0, readerMidpoint).map((category) => ({
        href: readerEducationPublicPath(category),
        label: category.title,
      })),
    },
    {
      title: "İleri okuma",
      links: READER_EDUCATION_CATEGORIES.slice(readerMidpoint).map((category) => ({
        href: readerEducationPublicPath(category),
        label: category.title,
      })),
    },
  ],
};

const liveEditorEducation = EDITOR_EDUCATION_CATEGORIES.filter((category) => category.live);
const editorMidpoint = Math.ceil(liveEditorEducation.length / 2);
const editorMenu: MegaMenu = {
  label: "Editör",
  groups: [
    {
      title: "Editörlüğü keşfet",
      links: [
        { href: "/editorler-icin", label: "Editörler İçin", primary: true },
        { href: "/editorler", label: "Editörler" },
        { href: "/kayit?rol=editor", label: "Editör Başvurusu" },
        { href: "/editoryal-standartlar", label: "Editoryal Standartlar" },
      ],
    },
    {
      title: "Editörlük Okulu",
      links: liveEditorEducation.slice(0, editorMidpoint).map((category) => ({
        href: editorEducationPublicPath(category),
        label: category.title,
      })),
    },
    {
      title: "Profesyonel editörlük",
      links: liveEditorEducation.slice(editorMidpoint).map((category) => ({
        href: editorEducationPublicPath(category),
        label: category.title,
      })),
    },
  ],
};

const publisherMenu: MegaMenu = {
  label: "Yayınevi",
  groups: [
    {
      title: "Yayınevleri için",
      links: [
        { href: "/yayinevleri-icin", label: "Yayınevleri İçin", primary: true },
        { href: "/kayit?rol=publisher", label: "Yayınevi Ol" },
      ],
    },
    {
      title: "Platform",
      links: [
        { href: "/nasil-calisir", label: "İlkOku nasıl çalışır?" },
        { href: "/editoryal-standartlar", label: "Editoryal Standartlar" },
      ],
    },
  ],
};

const ilkokuMenu: MegaMenu = {
  label: "İlkOku",
  groups: [
    {
      title: "İlkOku'yu tanı",
      links: [
        { href: "/hakkimizda", label: "Hakkımızda", primary: true },
        { href: "/nasil-calisir", label: "Nasıl Çalışır?" },
      ],
    },
    {
      title: "Güven",
      links: publicTrustLinks.map((link) => ({
        href: link.href,
        label: link.label,
      })),
    },
  ],
};

const supportMenu: MegaMenu = {
  label: "Destek",
  groups: [
    {
      title: "Destek",
      links: publicSupportLinks.map((link, index) => ({
        href: link.href,
        label: link.label,
        primary: index === 0,
      })),
    },
  ],
};

const publicMenus = [
  writerMenu,
  readerMenu,
  editorMenu,
  publisherMenu,
  ilkokuMenu,
  supportMenu,
] as const;

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

function MenuItem({ menu }: { menu: MegaMenu }) {
  const columns = Math.min(menu.groups.length, 3);

  return (
    <details className="public-site-header__menu-item">
      <summary>{menu.label}</summary>
      <div className="public-site-header__mega">
        <div
          className="public-site-header__mega-grid"
          style={{ "--mega-columns": columns } as CSSProperties}
        >
          {menu.groups.map((group) => (
            <section className="public-site-header__mega-group" key={`${menu.label}-${group.title}`}>
              <h2>{group.title}</h2>
              <div className="public-site-header__mega-links">
                {group.links.map((link) => (
                  <Link
                    href={link.href}
                    data-primary={link.primary ? "true" : undefined}
                    key={`${menu.label}-${group.title}-${link.href}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}

function PublicNavigation() {
  return (
    <nav className="public-site-header__navigation" aria-label="Ana menü">
      {publicMenus.map((menu) => (
        <MenuItem menu={menu} key={menu.label} />
      ))}
    </nav>
  );
}

function MobileNavigation() {
  return (
    <details className="public-site-header__mobile-menu">
      <summary aria-label="Ana menüyü aç">
        <span aria-hidden="true">☰</span>
        <span>Menü</span>
      </summary>
      <div className="public-site-header__mobile-panel">
        <nav aria-label="Mobil ana menü">
          {publicMenus.map((menu) => (
            <MenuItem menu={menu} key={`mobile-${menu.label}`} />
          ))}
        </nav>
      </div>
    </details>
  );
}

export async function PublicSiteHeader() {
  const identity = await getPublicSiteIdentity();

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
          <PublicNavigation />
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
