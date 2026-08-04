import Image from "next/image";
import Link from "next/link";
import retinaLogo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { authContent, tr } from "@/content";

interface AuthShellProps {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
  wide?: boolean;
}

export function AuthShell({ children, description, eyebrow, title, wide = false }: AuthShellProps) {
  return (
    <div className={wide ? "auth-page auth-page--wide" : "auth-page"}>
      <a className="auth-skip-link" href="#auth-main">{authContent.common.skipToContent}</a>
      <header className="auth-header">
        <Link className="auth-brand" href="/" aria-label={authContent.common.homeLabel}>
          <Image
            src={retinaLogo}
            alt=""
            aria-hidden="true"
            priority
            sizes="(max-width: 767px) 76px, 96px"
          />
        </Link>
        <span>{authContent.common.tagline}</span>
      </header>
      <main className="auth-main" id="auth-main">
        <section className="auth-intro" aria-labelledby="auth-title">
          <div>
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          <blockquote>
            <span aria-hidden="true">“</span>
            <p>{authContent.common.quote}</p>
            <footer>{tr.brand.name}</footer>
          </blockquote>
        </section>
        <section className="auth-content" aria-label={authContent.shell.contentArea(title)}>{children}</section>
      </main>
      <footer className="auth-footer"><span>© 2026 {tr.brand.name}</span><span>{authContent.common.secureAuthentication}</span></footer>
      <style>{`
        @media (max-width: 47.99rem) {
          .auth-header {
            min-height: 6.5rem !important;
          }

          .auth-brand {
            width: 5.25rem !important;
            min-width: 5.25rem !important;
            min-height: 5.25rem !important;
            padding: 0.3rem !important;
          }

          .auth-brand img {
            width: 4.75rem !important;
            max-width: 4.75rem !important;
            height: 4.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
