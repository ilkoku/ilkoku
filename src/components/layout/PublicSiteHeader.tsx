import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { getPublicSiteIdentity } from "@/lib/site-identity";

import "./public-site-header.css";
import "./public-site-header-terminal.css";
import "./public-back-navigation.css";
import "./public-trust-hero-proof.css";

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
    </header>
  );
}
