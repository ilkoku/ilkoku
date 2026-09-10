import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import {
  publicLegalLinks,
  publicPlatformLinks,
  publicSupportLinks,
  publicTrustLinks,
} from "@/lib/public-site-navigation";
import { getPublicSiteIdentity } from "@/lib/site-identity";

export async function PublicTrustFooter() {
  const identity = await getPublicSiteIdentity();

  return (
    <footer className="public-trust-footer">
      <div className="public-trust-footer__grid">
        <div className="public-trust-footer__brand">
          <Link className="public-trust-footer__logo" href="/" aria-label="İlkOku ana sayfa">
            {identity.logoUrl ? (
              <Image src={identity.logoUrl} alt={identity.logoAlt} width={352} height={87} sizes="(max-width: 480px) 150px, 176px" />
            ) : (
              <Image src={logo} alt={identity.logoAlt} sizes="(max-width: 480px) 150px, 176px" />
            )}
          </Link>
          <p>{identity.footerTaglineLead} <strong>{identity.footerTaglineEmphasis}</strong></p>
        </div>

        <nav className="public-trust-footer__column" aria-label="Platform bağlantıları">
          <h3>Platform</h3>
          {publicPlatformLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>

        <nav className="public-trust-footer__column" aria-label="Güven ve standartlar bağlantıları">
          <h3>Güven &amp; Standartlar</h3>
          {publicTrustLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>

        <div className="public-trust-footer__column">
          <h3>Hesap</h3>
          <Link href="/hesabim">Hesabım</Link>
          <Link href="/giris">Giriş Yap</Link>
          <Link href="/kayit">Üye Ol</Link>
          <Link href="/sifremi-unuttum">Şifremi Unuttum</Link>
        </div>

        <nav className="public-trust-footer__column" aria-label="Destek bağlantıları">
          <h3>Destek</h3>
          {publicSupportLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
      </div>

      <div className="public-trust-footer__bottom">
        <span>© {new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.</span>
        <nav className="public-trust-footer__legal" aria-label="Yasal bağlantılar">
          {publicLegalLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
