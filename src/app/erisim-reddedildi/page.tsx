import type { Metadata } from "next";
import Link from "next/link";
import { authContent } from "@/content";
import { logoutAction } from "@/features/auth/actions";
import { getRoleNavigation } from "@/features/auth/destination";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/features/auth/types";

export const metadata: Metadata = {
  title: authContent.accessDenied.metadataTitle,
  description: authContent.accessDenied.metadataDescription,
};
export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  admin: "Yönetici",
  editor: "Editör",
  editor_pending: "Editör adayı",
  publisher: "Yayınevi",
  reader: "Okur",
  writer: "Yazar",
};

const statusLabels = {
  approved: "Onaylandı",
  cancelled: "İptal edildi",
  pending: "Yönetici incelemesinde",
  rejected: "Reddedildi",
} as const;

const formatDate = (value: Date | null) => value
  ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(value)
  : "—";

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<{ kaynak?: string }> }) {
  const user = await getCurrentUser();
  const { kaynak } = await searchParams;
  const request = user ? await prisma.roleRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, requestedRole: true, reviewNote: true, status: true },
  }) : null;
  const currentRole = user?.role as UserRole | undefined;
  const navigation = user && currentRole
    ? await getRoleNavigation({ id: user.id, role: currentRole })
    : null;
  const pending = request?.status === "pending";

  return <AuthShell eyebrow={authContent.accessDenied.eyebrow} title={authContent.accessDenied.title} description={authContent.accessDenied.description}>
    <section className="auth-form-card access-denied" aria-labelledby="access-denied-title">
      <header><p>{authContent.accessDenied.cardEyebrow}</p><h2 id="access-denied-title">Rol erişimi doğrulanamadı</h2><span>Hesabınız ve son rol başvurunuz aşağıda gösteriliyor.</span></header>
      <dl className="access-denied__details">
        <div><dt>Mevcut rol</dt><dd>{currentRole ? roleLabels[currentRole] : "Oturum yok"}</dd></div>
        <div><dt>Erişilmeye çalışılan rol</dt><dd>{kaynak ? roleLabels[kaynak] || kaynak : "Belirtilmedi"}</dd></div>
        <div><dt>Son başvuru</dt><dd>{request ? roleLabels[request.requestedRole] : "Başvuru yok"}</dd></div>
        <div><dt>Başvuru durumu</dt><dd data-status={request?.status}>{request ? statusLabels[request.status] : "—"}</dd></div>
        <div><dt>Başvuru tarihi</dt><dd>{formatDate(request?.createdAt ?? null)}</dd></div>
        <div><dt>Admin notu</dt><dd>{request?.reviewNote || "Henüz değerlendirme notu yok."}</dd></div>
      </dl>
      <div className="access-denied__actions">
        {user && navigation ? <><Link className="button button--primary" href="/hesabim">Hesabım</Link><Link className="button button--outline" href="/">Ana Sayfa</Link><Link className="button button--outline" href={navigation.workspaceHref}>Mevcut çalışma alanına dön</Link><form action={logoutAction}><button className="button button--danger" type="submit">Çıkış Yap</button></form></> : <><Link className="button button--primary" href="/giris">Giriş Yap</Link><Link className="button button--outline" href="/">Ana Sayfa</Link></>}
        {user && !pending ? <Link className="button button--outline" href="/rol-secimi">Rol seçimine dön</Link> : null}
      </div>
    </section>
  </AuthShell>;
}
