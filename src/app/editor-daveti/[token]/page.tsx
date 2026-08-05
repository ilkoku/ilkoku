import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/components/AuthShell";
import { ExternalSecondEditorInviteAcceptForm } from "@/features/editor-workspace/components/ExternalSecondEditorInviteAcceptForm";
import { getExternalSecondEditorInvite } from "@/features/editor-workspace/external-second-editor.queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import "@/features/editor-workspace/editor-workspace.css";

export const metadata: Metadata = {
  description: "Dış ikinci editör davetini görüntüleyin ve kabul edin.",
  title: "İkinci Editör Daveti | İlkOku",
};

export const dynamic = "force-dynamic";

function StatusCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="auth-form-card">{children}</div>;
}

export default async function ExternalSecondEditorInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, user] = await Promise.all([
    getExternalSecondEditorInvite(token),
    getCurrentUser(),
  ]);

  if (!invite) {
    return (
      <AuthShell
        description="Bu bağlantı geçersiz veya artık kullanılamıyor."
        eyebrow="İkinci editör daveti"
        title="Davet bulunamadı"
      >
        <StatusCard>
          <p className="auth-route-status">
            Davet bağlantısını kontrol edin veya daveti gönderen editörden
            yeni bir bağlantı isteyin.
          </p>
          <Link href="/">Ana sayfaya dön</Link>
        </StatusCard>
      </AuthShell>
    );
  }

  const assignment = invite.work.editorReviewAssignments[0] ?? null;
  const inviterName =
    invite.invitedBy.displayName?.trim() ||
    invite.invitedBy.fullName.trim() ||
    "İlkOku editörü";
  const expectedEmail = invite.invitedEmail.trim().toLowerCase();
  const assignmentEmail = assignment?.invitedEmail?.trim().toLowerCase();

  let invitationBody: React.ReactNode;

  if (invite.expired) {
    invitationBody = (
      <p className="auth-route-status" role="alert">
        Bu davetin yedi günlük kullanım süresi dolmuş.
      </p>
    );
  } else if (invite.work.editorReviewStatus === "completed") {
    invitationBody = (
      <p className="auth-route-status">
        Bu eserin profesyonel editör incelemesi daha önce tamamlanmış.
      </p>
    );
  } else if (!user) {
    const returnPath = `/editor-daveti/${token}`;

    invitationBody = (
      <>
        <p>
          Daveti kabul etmek için {invite.invitedEmail} adresine ait
          hesabınızla giriş yapın. İlkOku hesabınız yoksa bu bağlantı
          üzerinden editör kaydı oluşturabilirsiniz.
        </p>
        <div className="publisher-workspace__quick-links">
          <Link
            href={`/giris?sonraki=${encodeURIComponent(returnPath)}`}
          >
            Giriş Yap
          </Link>
          <Link href={`/kayit?davet=${encodeURIComponent(token)}`}>
            Davetle Kayıt Ol
          </Link>
        </div>
      </>
    );
  } else if (user.email.trim().toLowerCase() !== expectedEmail) {
    invitationBody = (
      <p className="auth-route-status" role="alert">
        Bu davet {invite.invitedEmail} adresine gönderilmiş. Şu anda
        {" "}{user.email} hesabıyla giriş yaptınız.
      </p>
    );
  } else if (
    assignment?.editorId === user.id &&
    assignment.status === "in_progress" &&
    invite.work.editorReviewStatus === "second_in_progress"
  ) {
    invitationBody = (
      <>
        <p className="auth-route-status">
          Bu dış ikinci editör görevini daha önce kabul ettiniz.
        </p>
        <Link href="/editor/incelemeler?asama=ikinci">
          2. Editör İncelemelerime Git
        </Link>
      </>
    );
  } else if (user.role === "editor_pending") {
    invitationBody = (
      <>
        <p className="auth-route-status">
          Editör kaydınız alındı ve yönetici onayı bekliyor.
        </p>
        <p>
          Editör rolünüz onaylandıktan sonra aynı davet bağlantısını yeniden
          açarak görevi kabul edebilirsiniz.
        </p>
      </>
    );
  } else if (user.role !== "editor" || user.status !== "active") {
    invitationBody = (
      <p className="auth-route-status" role="alert">
        Bu görev yalnızca aktif İlkOku editör hesabıyla kabul edilebilir.
      </p>
    );
  } else if (invite.usedAt && invite.acceptedById !== user.id) {
    invitationBody = (
      <p className="auth-route-status" role="alert">
        Bu davet başka bir hesap tarafından kullanılmış.
      </p>
    );
  } else if (
    !assignment ||
    assignment.editorId !== null ||
    assignment.source !== "external_invite" ||
    assignment.status !== "waiting" ||
    assignmentEmail !== expectedEmail ||
    invite.work.editorReviewStatus !== "awaiting_second_editor"
  ) {
    invitationBody = (
      <p className="auth-route-status" role="alert">
        Bu ikinci editör görevi artık kabul edilebilir durumda değil.
      </p>
    );
  } else {
    invitationBody = (
      <ExternalSecondEditorInviteAcceptForm token={token} />
    );
  }

  return (
    <AuthShell
      description={`${inviterName}, sizi bağımsız ikinci editör değerlendirmesi için davet etti.`}
      eyebrow="Dış ikinci editör daveti"
      title={invite.work.title}
    >
      <StatusCard>
        <div className="editor-review-report">
          <header>
            <span>Davet ayrıntıları</span>
            <h2>Bağımsız 2. Editör İncelemesi</h2>
            <p>Davet edilen e-posta: {invite.invitedEmail}</p>
          </header>
          <p>
            Birinci editörün raporu ikinci editöre gösterilmez. İki rapor da
            ikinci inceleme tamamlanana kadar yazara kapalı tutulur.
          </p>
          {invitationBody}
        </div>
      </StatusCard>
    </AuthShell>
  );
}
