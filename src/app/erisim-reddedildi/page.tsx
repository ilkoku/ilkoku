import type { Metadata } from "next";
import Link from "next/link";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";

export const metadata: Metadata = {
  title: authContent.accessDenied.metadataTitle,
  description: authContent.accessDenied.metadataDescription,
};

export default function AccessDeniedPage() {
  return (
    <AuthShell
      eyebrow={authContent.accessDenied.eyebrow}
      title={authContent.accessDenied.title}
      description={authContent.accessDenied.description}
    >
      <section className="auth-form-card access-denied" aria-labelledby="access-denied-title">
        <header>
          <p>{authContent.accessDenied.cardEyebrow}</p>
          <h2 id="access-denied-title">{authContent.accessDenied.cardTitle}</h2>
          <span>{authContent.accessDenied.cardDescription}</span>
        </header>
        <div className="access-denied__actions">
          <Link className="button button--primary" href="/rol-secimi">{authContent.accessDenied.roleSelection}</Link>
          <Link className="button button--outline" href="/">{authContent.accessDenied.home}</Link>
        </div>
      </section>
    </AuthShell>
  );
}
