import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { logoutAction } from "@/features/auth/actions";
import {
  publicLegalLinks,
  publicPlatformLinks,
  publicSupportLinks,
  publicTrustLinks,
} from "@/lib/public-site-navigation";
import { siteContact } from "@/lib/site-contact";

import "./live-footer.css";

type LiveHomepageFooterProps = {
  signedIn: boolean;
  workspaceHref?: string;
  slogan: string;
  copyright: string;
};

function FooterSlogan({ value }: { value: string }) {
  const emphasis = "ilk adımın.";
  if (value.toLocaleLowerCase("tr-TR").endsWith(emphasis)) {
    return <>{value.slice(0, value.length - emphasis.length)}<strong>{value.slice(value.length - emphasis.length)}</strong></>;
  }
  return <>{value}</>;
}

function SocialIcon({ id }: { id: (typeof siteContact.socialLinks)[number]["id"] }) {
  if (id === "x") {
    return <svg className="site-social-icon site-social-icon--x" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>;
  }

  if (id === "instagram") {
    return <svg className="site-social-icon site-social-icon--instagram" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.15" /><circle cx="17.35" cy="6.65" r="1" fill="currentColor" stroke="none" /></svg>;
  }

  return <svg className="site-social-icon site-social-icon--linkedin" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.94 8.5H3.56V19h3.38V8.5ZM5.25 3a1.95 1.95 0 1 0 0 3.9 1.95 1.95 0 0 0 0-3.9ZM20.44 13.08c0-3.16-1.69-4.63-3.94-4.63-1.82 0-2.63 1-3.09 1.7V8.5h-3.38V19h3.38v-5.2c0-1.37.26-2.7 1.96-2.7 1.68 0 1.7 1.57 1.7 2.79V19h3.37v-5.92Z" /></svg>;
}

export default function LiveHomepageFooter({ signedIn, workspaceHref, slogan, copyright }: LiveHomepageFooterProps) {
  return (
    <div className="landing-page nx-live-footer-scope">
      <footer className="landing-footer" id="iletisim">
        <div className="landing-container landing-footer__grid">
          <div>
            <Link className="landing-logo landing-logo--footer" href="/" aria-label="İlkOku ana sayfa">
              <Image src={logo} alt="İlkOku" sizes="(max-width: 480px) 128px, 156px" />
            </Link>
            <p><FooterSlogan value={slogan} /></p>
          </div>

          <div>
            <h3>Platform</h3>
            {publicPlatformLinks.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          </div>

          <div className="landing-footer__trust">
            <h3>Güven &amp; Standartlar</h3>
            {publicTrustLinks.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          </div>

          <div>
            <h3>Hesap</h3>
            {signedIn && workspaceHref ? <>
              <Link href="/hesabim">Hesabım</Link>
              <Link href={workspaceHref}>Çalışma Alanım</Link>
              <form action={logoutAction}><button className="landing-footer__logout" type="submit">Çıkış Yap</button></form>
            </> : <>
              <Link href="/giris">Giriş Yap</Link>
              <a href="#roller">Üye Ol</a>
              <Link href="/sifremi-unuttum">Şifremi Unuttum</Link>
            </>}
          </div>

          <div>
            <h3>Destek</h3>
            {publicSupportLinks.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
            <div className="site-contact-footer">
              <a className="site-contact-footer__email" href={`mailto:${siteContact.generalEmail}`}>{siteContact.generalEmail}</a>
              <div className="site-social-links" aria-label="İlkOku sosyal medya hesapları">
                {siteContact.socialLinks.map((social) => <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} hesabımızı aç`} title={social.label} key={social.id}><SocialIcon id={social.id} /></a>)}
              </div>
            </div>
          </div>
        </div>

        <div className="landing-footer__copyright">
          <span className="landing-footer__copyright-text">{copyright}</span>
          <nav className="landing-footer__legal" aria-label="Yasal bağlantılar">
            {publicLegalLinks.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          </nav>
        </div>
      </footer>
    </div>
  );
}
