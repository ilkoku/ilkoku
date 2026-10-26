import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  submitWriterLegalSellerAction,
  submitWriterSalesRightsAction,
} from "@/features/commerce/seller-writer-actions";
import { prisma } from "@/lib/prisma";
import styles from "./writer-seller-rights.module.css";

export const metadata: Metadata = {
  title: "Satıcı ve Satış Yetkisi | Yazar | İlkOku",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  "kimlik-bilgisi-eksik": "Resmî kimlik ve iletişim alanlarını kontrol et.",
  "kimlik-gonderildi": "Satıcı bilgilerinin taslağı kaydedildi. Yönetici incelemesi bekleniyor.",
  "zaten-basvuru-var": "Bu vergi/kimlik tanımlayıcısına ait açık başvurun zaten bulunuyor.",
  "kayit-siniri": "Yeni kayıt sınırına ulaştın. Mevcut kayıt için destekle iletişime geç.",
  "yetki-bilgisi-eksik": "Eser, kendi satıcı kaydın ve yetki belgesi alanlarını tamamla.",
  "yetki-gecerlilik-tarihi-hatali": "Geçerlilik bitiş tarihi hatalı ya da geçmişte.",
  "yetki-dogrulanamadi": "Eser veya satıcı başvurusu bu hesapla eşleşmiyor.",
  "yetki-gonderildi": "Eser satış yetkisi incelemeye gönderildi. Yetki henüz aktif değil.",
};
const statusLabel: Record<string, string> = {
  pending: "İncelemede",
  verified: "Doğrulandı",
  rejected: "Reddedildi",
  suspended: "Askıda",
  revoked: "İptal edildi",
  expired: "Süresi doldu",
};

export default async function WriterSellerRightsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; workId?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=%2Fsatis-erisim%2Fsatici-yetkileri");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");

  const query = await searchParams;
  const [parties, works, rights, assignments] = await Promise.all([
    prisma.legalParty.findMany({
      where: { ownerUserId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, legalName: true, kind: true, verificationStatus: true,
        createdAt: true,
      },
    }),
    prisma.work.findMany({
      where: {
        authorId: profile.id, isActive: true,
        archivedAt: null, status: "published",
        saleConfiguration: {
          is: { saleModel: "paid", status: { in: ["ready", "active"] } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, title: true, slug: true },
    }),
    prisma.workSalesAuthorization.findMany({
      where: {
        work: { is: { authorId: profile.id } },
        legalParty: { is: { ownerUserId: profile.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, status: true, createdAt: true, validUntil: true,
        work: { select: { title: true } },
        legalParty: { select: { legalName: true } },
      },
    }),
    prisma.workSellerAssignment.findMany({
      where: {
        work: { is: { authorId: profile.id } },
        legalParty: { is: { ownerUserId: profile.id } },
        status: "approved", currentKey: { not: null },
      },
      take: 50,
      select: {
        id: true,
        work: { select: { title: true } },
        legalParty: { select: { legalName: true } },
      },
    }),
  ]);
  const selectedWorkId = works.some((work) => work.id === query.workId)
    ? query.workId
    : "";

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Yazar · Satış &amp; Erişim</span>
            <h1>Satıcı ve Satış Yetkisi</h1>
            <p>
              Resmî satıcı bilgilerini ve kendi eserinin dijital erişim satış hakkına
              ilişkin kanıtlarını buradan gönder. Başvurunu yönetim ekibi inceler.
            </p>
          </div>
          <Link className={styles.back} href="/satis-erisim">Satış &amp; Erişim&apos;e dön</Link>
        </header>
        <div className={styles.notice}>
          <strong>Başvuru ile onay farklı işlemlerdir.</strong> Burada gönderdiğin
          bilgiler otomatik doğrulanmaz, ödeme veya gerçek satış başlatılmaz.
          Satış yetkisinin geçerli olması için yönetici incelemesi ve onayı gerekir.
        </div>
        {query.durum ? <div className={styles.flash} role="status">
          {notices[query.durum] ?? "Başvuru durumu güncellendi."}
        </div> : null}

        <div className={styles.overview}>
          <div><strong>{parties.length}</strong><span>Satıcı başvurun</span></div>
          <div><strong>{rights.length}</strong><span>Eser yetki başvurun</span></div>
          <div><strong>{assignments.length}</strong><span>Onaylanan satış yetkin</span></div>
        </div>

        <section className={styles.section} aria-labelledby="identity-title">
          <div className={styles.sectionHeading}>
            <span className={styles.step}>1</span>
            <div><h2 id="identity-title">Resmî satıcı bilgileri</h2>
              <p>Gerçek kişi veya tüzel kişi bilgilerini gönder. Platform işletmecisi kimliği yazar tarafından oluşturulamaz.</p></div>
          </div>
          <form className={styles.formGrid} action={submitWriterLegalSellerAction}>
            <label>Satıcı türü
              <select name="kind" required defaultValue="individual">
                <option value="individual">Gerçek kişi</option>
                <option value="organization">Şirket / tüzel kişi</option>
              </select>
            </label>
            <label>Resmî ad soyad / unvan
              <input name="legalName" minLength={3} maxLength={240} required autoComplete="name" />
            </label>
            <label>Vergi / kimlik tanımlayıcısı
              <input name="taxIdentifier" minLength={5} maxLength={32} required autoComplete="off" />
            </label>
            <label>Vergi dairesi (varsa)
              <input name="taxOffice" maxLength={160} />
            </label>
            <label>İletişim e-postası
              <input type="email" name="contactEmail" autoComplete="email" required />
            </label>
            <label>Telefon (varsa)
              <input name="contactPhone" maxLength={32} autoComplete="tel" />
            </label>
            <label className={styles.wide}>Resmî adres
              <textarea name="legalAddress" rows={3} required minLength={12} maxLength={5000} />
            </label>
            <div className={styles.actions}>
              <button type="submit">Satıcı bilgilerimi incelemeye gönder</button>
            </div>
          </form>
          {parties.length > 0 ? (
            <div className={styles.recordList}>
              <h3>Satıcı başvurularım</h3>
              {parties.map((party) => (
                <div className={styles.record} key={party.id}>
                  <div><strong>{party.legalName ?? "İsimsiz kayıt"}</strong>
                    <small>{party.kind === "individual" ? "Gerçek kişi" : party.kind === "organization" ? "Tüzel kişi" : "Platform kaydı"}</small></div>
                  <span>{statusLabel[party.verificationStatus] ?? party.verificationStatus}</span>
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>Henüz satıcı başvurun bulunmuyor.</p>}
        </section>

        <section className={styles.section} aria-labelledby="rights-title">
          <div className={styles.sectionHeading}>
            <span className={styles.step}>2</span>
            <div><h2 id="rights-title">Eser için satış yetkisi belgesi</h2>
              <p>Yalnız kendi yayımladığın, ücretli satışa hazır eser için yetki kanıtı gönderebilirsin. Satıcı kimliği incelemede olsa bile belge sunabilirsin; son onay yönetimdedir.</p></div>
          </div>
          <form className={styles.formGrid} action={submitWriterSalesRightsAction}>
            <label>Eserim
              <select name="workId" required defaultValue={selectedWorkId} key={selectedWorkId}>
                <option value="" disabled>Eserini seç</option>
                {works.map((work) => (
                  <option key={work.id} value={work.id}>{work.title}</option>
                ))}
              </select>
            </label>
            <label>Satıcı başvurum
              <select name="legalPartyId" required defaultValue="">
                <option value="" disabled>Satıcı kaydını seç</option>
                {parties.filter(p => ["pending","verified"].includes(p.verificationStatus) && p.kind !== "platform").map(p => (
                  <option key={p.id} value={p.id}>{p.legalName} · {statusLabel[p.verificationStatus]}</option>
                ))}
              </select>
            </label>
            <label className={styles.wide}>Satış yetkisi belgesinin kaynağı (HTTPS)
              <input type="url" name="evidenceUrl" placeholder="https://" required />
            </label>
            <label>Yetki bitiş tarihi (varsa)
              <input type="date" name="validUntil" />
            </label>
            <label className={styles.wide}>Yetki belgesinin incelenecek gerçek metni
              <textarea name="documentEvidence" rows={5} required minLength={80} maxLength={20000} />
              <small>İçeriğin SHA-256 özeti saklanır. Yalnız doğrulanabilir gerçek belge bilgisi gönder.</small>
            </label>
            <div className={styles.actions}>
              <button type="submit" disabled={!works.length || !parties.some(p=>["pending","verified"].includes(p.verificationStatus) && p.kind !== "platform")}>
                Eser satış yetkimi incelemeye gönder
              </button>
            </div>
          </form>
          {works.length === 0 ? <p className={styles.empty}>Henüz satışa hazır yayımlanmış ücretli eserin bulunmuyor. Önce Satış &amp; Erişim bölümünde eseri hazırla.</p> : null}
          {rights.length > 0 ? (
            <div className={styles.recordList}>
              <h3>Eser yetkisi başvurularım</h3>
              {rights.map((right) => (
                <div className={styles.record} key={right.id}>
                  <div><strong>{right.work.title}</strong><small>{right.legalParty.legalName} · {right.createdAt.toLocaleDateString("tr-TR")}</small></div>
                  <span>{statusLabel[right.status] ?? right.status}</span>
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>Henüz eser satış yetkisi başvurun bulunmuyor.</p>}
        </section>
      </div>
    </AppShell>
  );
}
