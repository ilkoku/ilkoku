"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { publicTrustPageVisuals } from "@/content/public-trust-page-visuals";

function isPublicTrustPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(publicTrustPageVisuals, normalized);
}

export function PublicTrustFooter() {
  const pathname = usePathname();

  if (!isPublicTrustPath(pathname)) return null;

  return (
    <footer className="landing-footer public-trust-footer" id="iletisim">
      <div className="landing-container landing-footer__grid">
        <div>
          <Link className="landing-logo landing-logo--footer" href="/">
            <Image src={logo} alt="İlkOku" />
          </Link>
          <p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p>
        </div>
        <div>
          <h3>Platform</h3>
          <Link href="/#hakkimizda">Hakkımızda</Link>
          <Link href="/nasil-calisir">Nasıl Çalışır?</Link>
          <Link href="/yayinevleri">Yayınevleri</Link>
          <Link href="/editorler">Editörler</Link>
        </div>
        <div>
          <h3>Destek</h3>
          <Link href="/yardim">Yardım Merkezi</Link>
          <Link href="/yardim">Sıkça Sorulan Sorular</Link>
          <Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link>
          <Link href="/yasal/gizlilik-politikasi">Gizlilik Politikası</Link>
        </div>
        <div>
          <h3>Yasal</h3>
          <Link href="/yasal/kvkk">KVKK</Link>
          <Link href="/yasal/cerez-politikasi">Çerez Politikası</Link>
          <Link href="/yasal/telif-hakki-politikasi">Telif Hakkı Politikası</Link>
        </div>
        <div>
          <h3>Bizi Takip Edin</h3>
          <div className="landing-socials" aria-label="Sosyal medya bağlantıları">
            <span aria-hidden="true">◎</span><span aria-hidden="true">𝕏</span><span aria-hidden="true">in</span><span aria-hidden="true">▶</span>
          </div>
        </div>
      </div>
      <p className="landing-footer__copyright">© 2026 İlkOku. Tüm hakları saklıdır.</p>
    </footer>
  );
}
