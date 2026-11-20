import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { logoutAction } from "@/features/auth/actions";
import {
  publicAudienceLinks,
  publicFooterPlatformLinks,
  publicLegalLinks,
  publicSupportLinks,
  publicTrustLinks,
  type PublicSiteLink,
} from "@/lib/public-site-navigation";
import { siteContact } from "@/lib/site-contact";
import type { SiteIdentity } from "@/lib/site-identity";

/**
 * The only public footer renderer. "landing" and "trust" preserve their
 * visual themes without duplicating navigation, legal links or components.
 */
export type HomepageFooterProps = {
  signedIn: boolean;
  workspaceHref?: string;
  bookIndexPublished?: boolean;
  slogan: string;
  copyright: string;
};

type PublicSiteFooterProps =
  | ({ variant: "landing" } & HomepageFooterProps)
  | { variant: "trust"; identity: SiteIdentity; bookIndexPublished: boolean };

function CloudflareSafeEmailLink() {
  const email = siteContact.generalEmail;
  const html = `<!--email_off--><a class="site-contact-footer__email" href="mailto:${email}" aria-label="Genel iletişim: ${email}">${email}</a><!--/email_off-->`;

  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

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


function FooterLinkItems({ links, landing }: { links: readonly PublicSiteLink[]; landing: boolean }) {
  return <>{links.map((item) => (
    <Link prefetch={landing ? false : undefined} href={item.href} key={item.href}>{item.label}</Link>
  ))}</>;
}

function FooterColumn({
  landing, title, label, links, className, children,
}: {
  landing: boolean;
  title: string;
  label: string;
  links?: readonly PublicSiteLink[];
  className?: string;
  children?: React.ReactNode;
}) {
  const inner = <><h3>{title}</h3>{links ? <FooterLinkItems links={links} landing={landing} /> : null}{children}</>;
  return landing
    ? <div className={className}>{inner}</div>
    : <nav className="public-trust-footer__column" aria-label={label}>{inner}</nav>;
}

function LegalLinks({ landing }: { landing: boolean }) {
  return <nav className={landing ? "landing-footer__legal" : "public-trust-footer__legal"} aria-label="Yasal bağlantılar">
    {publicLegalLinks.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
  </nav>;
}

function FooterContact() {
  return <div className="site-contact-footer">
    <CloudflareSafeEmailLink />
    <div className="site-social-links" aria-label="İlkOku sosyal medya hesapları">
      {siteContact.socialLinks.map((social) => <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label + " hesabımızı aç"} title={social.label} key={social.id}><SocialIcon id={social.id} /></a>)}
    </div>
  </div>;
}

function FooterAccount({ props, landing }: { props: PublicSiteFooterProps; landing: boolean }) {
  return <FooterColumn landing={landing} title="Hesap" label="Hesap bağlantıları">
    {props.variant === "landing" && props.signedIn && props.workspaceHref ? <>
      <Link prefetch={false} href="/hesabim">Hesabım</Link>
      <Link prefetch={false} href={props.workspaceHref}>Çalışma Alanım</Link>
      <form action={logoutAction}><button className="landing-footer__logout" type="submit">Çıkış Yap</button></form>
    </> : props.variant === "landing" ? <>
      <Link prefetch={false} href="/giris">Giriş Yap</Link>
      <Link prefetch={false} href="/#roller">Üye Ol</Link>
      <Link prefetch={false} href="/sifremi-unuttum">Şifremi Unuttum</Link>
    </> : <>
      <Link href="/hesabim">Hesabım</Link>
      <Link href="/giris">Giriş Yap</Link>
      <Link href="/kayit">Üye Ol</Link>
      <Link href="/sifremi-unuttum">Şifremi Unuttum</Link>
    </>}
  </FooterColumn>;
}

export function PublicSiteFooter(props: PublicSiteFooterProps) {
  const landing = props.variant === "landing";
  const platformLinks: PublicSiteLink[] = props.bookIndexPublished
    ? [...publicFooterPlatformLinks, { href: "/en-cok-satanlar", label: "En Çok Satanlar" }]
    : [...publicFooterPlatformLinks];

  const footer = (
    <footer className={landing ? "landing-footer" : "public-trust-footer"} id={landing ? "iletisim" : undefined}>
      <div className={landing ? "landing-container landing-footer__grid" : "public-trust-footer__grid"}>
        {props.variant === "landing" ? (
          <div>
            <Link prefetch={false} className="landing-logo landing-logo--footer" href="/" aria-label="İlkOku ana sayfa">
              <Image src={logo} alt="İlkOku" sizes="(max-width: 480px) 128px, 156px" style={{ width: "156px", maxWidth: "100%", height: "auto" }} />
            </Link>
            <p><FooterSlogan value={props.slogan} /></p>
          </div>
        ) : (
          <div className="public-trust-footer__brand">
            <Link className="public-trust-footer__logo" href="/" aria-label="İlkOku ana sayfa">
              {props.identity.logoUrl ? (
                <Image src={props.identity.logoUrl} alt={props.identity.logoAlt} width={352} height={87} sizes="(max-width: 480px) 150px, 176px" />
              ) : (
                <Image src={logo} alt={props.identity.logoAlt} sizes="(max-width: 480px) 150px, 176px" />
              )}
            </Link>
            <p>{props.identity.footerTaglineLead} <strong>{props.identity.footerTaglineEmphasis}</strong></p>
          </div>
        )}
        <FooterColumn landing={landing} title="Platform" label="Platform bağlantıları" links={platformLinks} />
        <FooterColumn landing={landing} title="İlkOku'da" label="İlkOku'da kullanıcı grupları" className="landing-footer__audience" links={publicAudienceLinks} />
        <FooterColumn landing={landing} title="Güven & Standartlar" label="Güven ve standartlar bağlantıları" className="landing-footer__trust" links={publicTrustLinks} />
        <FooterAccount props={props} landing={landing} />
        <FooterColumn landing={landing} title="Destek" label="Destek bağlantıları" links={publicSupportLinks}>
          {landing ? <FooterContact /> : null}
        </FooterColumn>
      </div>
      <div className={landing ? "landing-footer__copyright" : "public-trust-footer__bottom"}>
        {props.variant === "landing" ? <span className="landing-footer__copyright-text">{props.copyright}</span> : <span>© {new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.</span>}
        <LegalLinks landing={landing} />
      </div>
    </footer>
  );
  return landing ? <div className="landing-page nx-live-footer-scope">{footer}</div> : footer;
}
