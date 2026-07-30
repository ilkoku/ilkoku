import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { getCurrentUser } from "@/lib/auth/current-user";
import { publisherRoleLabels } from "@/features/publisher-workspace/permissions";
import { getPublisherInvitationByToken } from "@/features/publisher-workspace/repository";
import { PublisherInvitationAcceptForm } from "@/features/publisher-workspace/components/PublisherInvitationAcceptForm";
import "@/features/publisher-workspace/publisher-workspace.css";

export const metadata: Metadata = {
  title: "Yayınevi Ekip Daveti | İlkOku",
  description: "Yayınevi ekip davetinizi görüntüleyin ve kabul edin.",
};

export const dynamic = "force-dynamic";

const statusMessages = {
  accepted: "Bu davet daha önce kabul edilmiş.",
  cancelled: "Bu davet yayınevi tarafından iptal edilmiş.",
  declined: "Bu davet reddedilmiş.",
  expired: "Bu davetin süresi dolmuş.",
} as const;

function InvitationContent({
  children,
  companyName,
  invitedByName,
  invitedEmail,
  roleLabel,
}: {
  children: React.ReactNode;
  companyName: string;
  invitedByName: string;
  invitedEmail: string;
  roleLabel: string;
}) {
  return (
    <div className="publisher-workspace">
      <header className="publisher-workspace__hero">
        <div>
          <p>Yayınevi ekip daveti</p>
          <h1>{companyName}</h1>
          <span>
            {invitedByName} sizi yayınevinin çalışma alanına davet etti.
          </span>
        </div>
      </header>

      <Card className="publisher-invite-card">
        <div className="publisher-invite-card__heading">
          <span>Davet ayrıntıları</span>
          <h2>{roleLabel}</h2>
          <p>Davet edilen e-posta: {invitedEmail}</p>
        </div>

        {children}
      </Card>
    </div>
  );
}

export default async function PublisherInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [invitation, profile, user] = await Promise.all([
    getPublisherInvitationByToken(token),
    getCurrentProfile(),
    getCurrentUser(),
  ]);

  if (!invitation) {
    return (
      <AuthShell
        eyebrow="Yayınevi daveti"
        title="Davet bulunamadı"
        description="Bu bağlantı geçersiz veya artık kullanılamıyor."
      >
        <div className="auth-form-card">
          <p className="auth-route-status">
            Davet bağlantısını kontrol edin veya yayınevi yöneticisinden
            yeni bir davet isteyin.
          </p>
          <div className="publisher-workspace__quick-links">
            <Link href="/">Ana sayfaya dön</Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  const invitedByName =
    invitation.invitedBy.displayName?.trim() ||
    invitation.invitedBy.fullName.trim() ||
    "Yayınevi yöneticisi";

  const invitationBody =
    invitation.status !== "pending" ? (
      <>
        <p className="auth-route-status">
          {statusMessages[
            invitation.status as keyof typeof statusMessages
          ] ?? "Bu davet artık kullanılamıyor."}
        </p>

        <div className="publisher-workspace__quick-links">
          {profile ? (
            <Link href="/yayinevi">Çalışma alanına git</Link>
          ) : (
            <Link href="/">Ana sayfaya dön</Link>
          )}
        </div>
      </>
    ) : !profile || !user ? (
      <>
        <p>
          Daveti kabul etmek için davetin gönderildiği e-posta
          adresine ait hesabınızla giriş yapın.
        </p>

        <div className="publisher-workspace__quick-links">
          <Link
            href={`/giris?sonraki=${encodeURIComponent(
              `/yayinevi/davet/${token}`,
            )}`}
          >
            Giriş yap
          </Link>
        </div>
      </>
    ) : user.email.trim().toLowerCase() !==
      invitation.invitedEmail.trim().toLowerCase() ? (
      <>
        <p className="auth-route-status" role="alert">
          Bu davet {invitation.invitedEmail} adresine gönderilmiş.
          Şu anda {user.email} hesabıyla giriş yaptınız.
        </p>

        <p>
          Doğru hesapla giriş yapabilmek için mevcut oturumdan çıkmanız
          gerekir.
        </p>
      </>
    ) : (
      <PublisherInvitationAcceptForm token={token} />
    );

  const content = (
    <InvitationContent
      companyName={invitation.publisher.companyName}
      invitedByName={invitedByName}
      invitedEmail={invitation.invitedEmail}
      roleLabel={publisherRoleLabels[invitation.role]}
    >
      {invitationBody}
    </InvitationContent>
  );

  if (profile) {
    return <AppShell profile={profile}>{content}</AppShell>;
  }

  return (
    <AuthShell
      eyebrow="Yayınevi daveti"
      title={invitation.publisher.companyName}
      description="Yayınevi çalışma alanına katılın."
    >
      {content}
    </AuthShell>
  );
}
