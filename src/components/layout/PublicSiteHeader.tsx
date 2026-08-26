import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";

import "./public-site-header.css";

export const publicSiteNavigation = [
  { href: "/eserler", label: "Eserler" },
  { href: "/yazarlar", label: "Yazarlar" },
  { href: "/turler", label: "Türler" },
  { href: "/editorler", label: "Editörler" },
  { href: "/nasil-calisir", label: "Nasıl Çalışır" },
  { href: "/yardim", label: "Yardım" },
] as const;

function NavigationLinks() {
  return (
    <>
      {publicSiteNavigation.map((item) => (
        <Link href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </>
  );
}

export async function PublicSiteHeader() {
  const profile = await getCurrentProfile();
  const navigation = profile ? await getRoleNavigation(profile) : null;

  return (
    <header className="public-site-header">
      <div className="public-site-header__inner">
        <Link className="public-site-header__brand" href="/" aria-label="İlkOku ana sayfa">
          <Image src={logo} alt="İlkOku" priority sizes="72px" />
        </Link>

        <nav className="public-site-header__nav" aria-label="Genel gezinme">
          <NavigationLinks />
        </nav>

        <div className="public-site-header__actions">
          {profile && navigation ? (
            <>
              <Link className="public-site-header__button public-site-header__button--ghost" href="/hesabim">
                Hesabım
              </Link>
              <Link className="public-site-header__button public-site-header__button--primary" href={navigation.workspaceHref}>
                Çalışma Alanım
              </Link>
            </>
          ) : (
            <>
              <Link className="public-site-header__button public-site-header__button--ghost" href="/giris">
                Giriş Yap
              </Link>
              <Link className="public-site-header__button public-site-header__button--primary" href="/kayit">
                Üye Ol
              </Link>
            </>
          )}
        </div>

        <details className="public-site-header__mobile">
          <summary aria-label="Menüyü aç">
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </summary>
          <div className="public-site-header__mobile-panel">
            <nav aria-label="Mobil genel gezinme">
              <NavigationLinks />
            </nav>
            <div className="public-site-header__mobile-actions">
              {profile && navigation ? (
                <>
                  <Link href="/hesabim">Hesabım</Link>
                  <Link href={navigation.workspaceHref}>Çalışma Alanım</Link>
                </>
              ) : (
                <>
                  <Link href="/giris">Giriş Yap</Link>
                  <Link href="/kayit">Üye Ol</Link>
                </>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
