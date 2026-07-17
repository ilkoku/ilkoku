import Image from "next/image";
import Link from "next/link";
import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";
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
          <Image src={mobileLogo} alt="" aria-hidden="true" width={44} height={44} priority />
          <span>{tr.brand.name}</span>
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
    </div>
  );
}
