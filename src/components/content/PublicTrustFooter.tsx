import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { logoutAction } from "@/features/auth/actions";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";

const platformLinks = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/nasil-calisir", label: "Nasıl Çalışır?" },
  { href: "/yazarlar-icin", label: "Yazarlar İçin" },
  { href: "/editorler-icin", label: "Editörler İçin" },
  { href: "/yayinevleri-icin", label: "Yayınevleri İçin" },
] as const;

const trustLinks = [
  { href: "/editoryal-standartlar", label: "Editoryal Standartlar" },
  { href: "/icerik-ve-yas-politikasi", label: "İçerik ve Yaş" },
  { href: "/topluluk-kurallari", label: "Topluluk Kuralları" },
  { href: "/telif-bildirimi", label: "Telif Bildirimi" },
] as const;

const legalLinks = [
  { href: "/yasal/kullanim-sartlari", label: "Kullanım Şartları" },
  { href: "/yasal/gizlilik-politikasi", label: "Gizlilik Politikası" },
  { href: "/yasal/kvkk", label: "KVKK" },
  { href: "/yasal/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/yasal/telif-hakki-politikasi", label: "Telif Hakkı Politikası" },
] as const;

export async function PublicTrustFooter() {
  const profile = await getCurrentProfile();
  const navigation = profile ? await getRoleNavigation(profile) : null;

  return (
    <footer className="public-trust-footer">
      <div className="public-trust-footer__grid">
        <div className="public-trust-footer__brand">
          <Link className="public-trust-footer__logo" href="/" aria-label="İlkOku ana sayfa">
            <Image src={logo} alt="İlkOku" sizes="(max-width: 480px) 150px, 176px" />
          </Link>
          <p>İlk cümle, ilk okurun, <strong>ilk adımın.</strong></p>
        </div>

        <nav className="public-trust-footer__column" aria-label="Platform bağlantıları">
          <h3>Platform</h3>
          {platformLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>

        <nav className="public-trust-footer__column" aria-label="Güven ve standartlar bağlantıları">
          <h3>Güven &amp; Standartlar</h3>
          {trustLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>

        <div className="public-trust-footer__column">
          <h3>Hesap</h3>
          {profile && navigation ? (
            <>
              <Link href="/hesabim">Hesabım</Link>
              <Link href={navigation.workspaceHref}>Çalışma Alanım</Link>
              <form action={logoutAction}>
                <button className="public-trust-footer__logout" type="submit">Çıkış Yap</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/giris">Giriş Yap</Link>
              <Link href="/kayit">Üye Ol</Link>
              <Link href="/sifremi-unuttum">Şifremi Unuttum</Link>
            </>
          )}
        </div>

        <nav className="public-trust-footer__column" aria-label="Destek bağlantıları">
          <h3>Destek</h3>
          <Link href="/yardim">Yardım Merkezi</Link>
          <Link href="/iletisim">İletişim</Link>
        </nav>
      </div>

      <div className="public-trust-footer__bottom">
        <span>© {new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.</span>
        <nav className="public-trust-footer__legal" aria-label="Yasal bağlantılar">
          {legalLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
