"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { publicTrustPageVisuals } from "@/content/public-trust-page-visuals";

function isPublicTrustPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/yayinevleri-icin") return false;
  return Object.prototype.hasOwnProperty.call(publicTrustPageVisuals, normalized);
}

export function PublicTrustFooter() {
  const pathname = usePathname();

  if (!isPublicTrustPath(pathname)) return null;

  return (
    <div className="landing-page public-trust-footer-shell">
      <footer className="landing-footer" id="iletisim">
        <div className="landing-container landing-footer__grid">
          <div>
            <Link className="landing-logo landing-logo--footer" href="/" aria-label="İlkOku ana sayfa">
              <Image src={logo} alt="İlkOku" sizes="(max-width: 480px) 128px, 156px" />
            </Link>
            <p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p>
          </div>

          <div>
            <h3>Platform</h3>
            <Link href="/#hakkimizda">Hakkımızda</Link>
            <Link href="/eserler">Eserler</Link>
            <Link href="/yazarlar">Yazarlar</Link>
            <Link href="/turler">Türler</Link>
            <Link href="/#eser-pasaportu">Eser Pasaportu</Link>
            <Link href="/#neden-ilkoku">Neden İlkOku?</Link>
            <Link href="/editorler">Editörler</Link>
          </div>

          <div>
            <h3>Hesap</h3>
            <Link href="/giris">Giriş Yap</Link>
            <Link href="/kayit">Üye Ol</Link>
            <Link href="/sifremi-unuttum">Şifremi Unuttum</Link>
          </div>

          <div>
            <h3>Destek</h3>
            <Link href="/yardim">Yardım Merkezi</Link>
            <Link href="/rehber">Yazarlık Rehberi</Link>
          </div>
        </div>

        <p className="landing-footer__copyright">
          <span className="landing-footer__copyright-text">© 2026 İlkOku. Tüm hakları saklıdır.</span>
        </p>
      </footer>
    </div>
  );
}
