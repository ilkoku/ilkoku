"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { publicTrustPageVisuals } from "@/content/public-trust-page-visuals";

import styles from "./PublicTrustFooter.module.css";

function isPublicTrustPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(publicTrustPageVisuals, normalized);
}

export function PublicTrustFooter() {
  const pathname = usePathname();

  if (!isPublicTrustPath(pathname)) return null;

  return (
    <footer className={`landing-footer public-trust-footer ${styles.footer}`} id="iletisim">
      <div className={`landing-footer__grid ${styles.grid}`}>
        <div className={styles.brand}>
          <Link className={`landing-logo landing-logo--footer ${styles.logo}`} href="/" aria-label="İlkOku ana sayfa">
            <Image src={logo} alt="İlkOku" sizes="182px" />
          </Link>
          <p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p>
        </div>

        <div className={styles.column}>
          <h3>Platform</h3>
          <Link href="/#hakkimizda">Hakkımızda</Link>
          <Link href="/nasil-calisir">Nasıl Çalışır?</Link>
          <Link href="/yayinevleri">Yayınevleri</Link>
          <Link href="/editorler">Editörler</Link>
        </div>

        <div className={styles.column}>
          <h3>Destek</h3>
          <Link href="/yardim">Yardım Merkezi</Link>
          <Link href="/yardim">Sıkça Sorulan Sorular</Link>
          <Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link>
          <Link href="/yasal/gizlilik-politikasi">Gizlilik Politikası</Link>
        </div>

        <div className={styles.column}>
          <h3>Bizi Takip Edin</h3>
          <div className={styles.socials} aria-label="Sosyal medya kanalları">
            <span aria-hidden="true">◎</span>
            <span aria-hidden="true">𝕏</span>
            <span aria-hidden="true">in</span>
            <span aria-hidden="true">▶</span>
          </div>
        </div>
      </div>

      <div className={`landing-footer__copyright ${styles.copyright}`}>
        <span className="landing-footer__copyright-text">© 2026 İlkOku. Tüm hakları saklıdır.</span>
        <nav className={`landing-footer__legal ${styles.legal}`} aria-label="Yasal bağlantılar">
          <Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link>
          <Link href="/yasal/gizlilik-politikasi">Gizlilik Politikası</Link>
          <Link href="/yasal/kvkk">KVKK</Link>
          <Link href="/yasal/cerez-politikasi">Çerez Politikası</Link>
          <Link href="/yasal/telif-hakki-politikasi">Telif Hakkı Politikası</Link>
        </nav>
      </div>
    </footer>
  );
}
