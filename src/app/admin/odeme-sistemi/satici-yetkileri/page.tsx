import Link from "next/link";
import styles from "./seller-rights.module.css";

import {
  approveWorkSellerRightsAction,
  registerLegalSellerDraftAction,
  registerWorkSalesRightsDraftAction,
  revokeWorkSellerAssignmentAction,
  verifyLegalSellerAction,
} from "@/features/commerce/seller-admin-actions";
import { prisma } from "@/lib/prisma";

const messages: Record<string, string> = {
  "kimlik-bilgisi-eksik": "Satıcının resmi kimlik alanlarını tamamlayın.",
  "satici-taslagi-olusturuldu": "Satıcı taslağı oluşturuldu. Resmi belge incelenmeden doğrulama yapılmaz.",
  "kimlik-kaniti-gerekli": "Resmi kanıtın HTTPS kaynağı, inceleme notu ve açık onay gereklidir.",
  "kimlik-dogrulanamadi": "Bu kayıt doğrulanamıyor. Durumunu ve zorunlu alanları kontrol edin.",
  "kimlik-dogrulandi": "Satıcı kimliği yönetici tarafından kayıtlı kanıta dayanarak doğrulandı.",
  "yetki-bilgisi-eksik": "Eser, satıcı ve satış yetkisi belge bilgilerini tamamlayın.",
  "yetki-gecerlilik-tarihi-hatali": "Belge bitiş tarihi gelecek bir tarih olmalıdır.",
  "yetki-dogrulanamadi": "Eser ve doğrulanmış satıcı eşleşmiyor.",
  "yetki-taslagi-olusturuldu": "Satış yetkisi taslağı oluşturuldu. Son onay henüz verilmedi.",
  "yetki-onayi-eksik": "Satış yetkisi belge incelemesi ve gerekçeli onay zorunludur.",
  "yetki-onaylanamadi": "Satış yetkisi onaylanamadı. Eser, kimlik ve belge koşullarını inceleyin.",
  "satis-yetkisi-onaylandi": "Eser satıcısı ve satış yetkisi onaylandı. Okur sözleşmesi ayrıca aktif olmalıdır.",
  "iptal-aciklamasi-gerekli": "Satış yetkisini iptal etmek için gerekçe ve açık onay gereklidir.",
  "yetki-iptal-edilemedi": "Bu geçerli yetki iptal edilemedi.",
  "satis-yetkisi-iptal-edildi": "Eser satıcı yetkisi iptal edildi; önceki sipariş kayıtları korunur.",
};

export default async function SellerRightsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const query = await searchParams;
  const [parties, works, authorizations, assignments] = await Promise.all([
    prisma.legalParty.findMany({
      orderBy: { createdAt: "desc" }, take: 80,
      select: {
        id: true, kind: true, legalName: true, taxIdentifier: true,
        verificationStatus: true, verifiedAt: true,
      },
    }),
    prisma.work.findMany({
      where: {
        archivedAt: null, isActive: true, status: "published",
        saleConfiguration: { is: { saleModel: "paid", status: { in: ["ready", "active"] } } },
      },
      orderBy: { updatedAt: "desc" }, take: 100,
      select: { id: true, title: true, slug: true },
    }),
    prisma.workSalesAuthorization.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      select: {
        id: true, status: true, createdAt: true, documentHash: true,
        rightsScope: true,
        work: { select: { title: true } },
        legalParty: { select: { legalName: true } },
      },
    }),
    prisma.workSellerAssignment.findMany({
      where: { status: "approved", currentKey: { not: null } },
      orderBy: { createdAt: "desc" }, take: 100,
      select: {
        id: true, work: { select: { title: true, slug: true } },
        legalParty: { select: { legalName: true } },
        approvedAt: true,
      },
    }),
  ]);
  const verifiedParties = parties.filter((p) => p.verificationStatus === "verified");
  const pendingParties = parties.filter((p) => p.verificationStatus === "pending");
  const pendingRights = authorizations.filter((a) => a.status === "pending");

  return (
    <div className={styles.root}>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Ödeme Sistemi · 0 TL Edinim</span>
          <h1>Satıcı ve Satış Yetkisi</h1>
          <p>
            Bu alan gerçek para veya ödeme sağlayıcısı açmaz. Yalnızca resmi
            satıcı kimliğini ve esere özgü dijital satış hakkını inceler.
            Görünen platform adı <strong>ilkoku</strong> olarak kalır.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/odeme-sistemi/ayarlar">
          0 TL aktivasyon denetimine dön
        </Link>
      </header>

      {query.durum ? (
        <div className={styles.status} role="status">
          {messages[query.durum] ?? "İşlem sonucu kaydedildi."}
        </div>
      ) : null}

      <section className={styles.summaryGrid} aria-label="Satıcı yetkileri durum özeti">
        <article className={styles.summaryCard}><span>Kimlik doğrulama</span><strong>{verifiedParties.length}</strong><p>Doğrulanmış hukukî satıcı</p></article>
        <article className={styles.summaryCard}><span>Belge incelemesi</span><strong>{pendingRights.length}</strong><p>Bekleyen eser yetkileri</p></article>
        <article className={styles.summaryCard}><span>Aktif atama</span><strong>{assignments.length}</strong><p>Onaylı güncel eser satıcısı</p></article>
      </section>
      <nav className={styles.stepsNav} aria-label="Satıcı yetkisi işlem aşamaları">
        <a href="#seller-identity">1 · Satıcı kimliği</a>
        <a href="#seller-verification">2 · Kimlik doğrulama</a>
        <a href="#sales-rights">3 · Eser satış yetkisi</a>
        <a href="#sales-approval">4 · Son onay</a>
        <a href="#current-sellers">Geçerli satıcılar</a>
      </nav>

      <section id="seller-identity" className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.stepNumber} aria-hidden="true">1</span><div className={styles.sectionHeadingText}><h2><span className={styles.screenReaderOnly}>1. </span>Resmi satıcı kimliği oluştur</h2>
        <p>
          &quot;ilkoku&quot; sadece görünen platform adıdır. Resmi isim,
          vergi bilgisi, adres ve iletişim alanları gerçek kayıtlarla doldurulmalıdır.
          Oluşturulan kimlik doğrulama tamamlanıncaya kadar <strong>beklemede</strong> kalır.
        </p></div></div>
        <form action={registerLegalSellerDraftAction} className={styles.formGrid}>
          <label>Satıcı türü
            <select name="kind" required defaultValue="platform">
              <option value="platform">İlkOku platformunun resmî işletmecisi</option>
              <option value="individual">Gerçek kişi</option>
              <option value="organization">Diğer şirket / tüzel kişi</option>
            </select>
          </label>
          <label>Resmi isim / unvan
            <input name="legalName" required minLength={3} maxLength={240}/>
          </label>
          <label>Vergi / kimlik tanımlayıcısı
            <input name="taxIdentifier" required minLength={5} maxLength={32}/>
          </label>
          <label>Vergi dairesi (varsa)
            <input name="taxOffice" maxLength={160}/>
          </label>
          <label>Resmî iletişim e-postası
            <input type="email" name="contactEmail" required/>
          </label>
          <label>İletişim telefonu (varsa)
            <input name="contactPhone" maxLength={32}/>
          </label>
          <label className={styles.fieldWide}>Resmî adres
            <textarea name="legalAddress" rows={3} minLength={12} required/>
          </label>
          <div className={styles.formActions}><button type="submit" className={styles.submit}>Satıcı taslağını kaydet</button></div>
        </form>
      </section>

      <section id="seller-verification" className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.stepNumber} aria-hidden="true">2</span><div className={styles.sectionHeadingText}><h2><span className={styles.screenReaderOnly}>2. </span>Resmî kanıtı incele ve satıcıyı doğrula</h2><p>Bekleyen satıcının belgesini kontrol ederek kimlik incelemesini tamamlayın.</p></div></div>
        {pendingParties.length === 0 ? <p className={styles.empty}>Doğrulama bekleyen satıcı kaydı yok. İlk adımda bir satıcı taslağı oluşturun.</p> : null}
        {pendingParties.map((party) => (
          <form action={verifyLegalSellerAction} key={party.id} className={`${styles.pendingItem} ${styles.formGrid}`}>
            <h3>{party.legalName} · {party.kind}</h3>
            <p>Kimlik / vergi tanımlayıcısı: {party.taxIdentifier}</p>
            <input name="legalPartyId" type="hidden" value={party.id}/>
            <label>İncelenen resmî belge kaynağı (HTTPS)
              <input type="url" name="evidenceUrl" placeholder="https://" required/>
            </label>
            <label className={styles.fieldWide}>İnceleme notu ve uyuşan bilgiler
              <textarea name="reviewNote" rows={2} required minLength={25}/>
            </label>
            <label className={styles.confirmLabel}>
              <input type="checkbox" name="reviewedOriginalEvidence" required/>
              Orijinal resmî kaydı bizzat inceledim ve bilgilerle eşleştirdim.
            </label>
            <div className={styles.formActions}><button className={styles.submit} type="submit">Resmî kimliği doğrula</button></div>
          </form>
        ))}
      </section>

      <section id="sales-rights" className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.stepNumber} aria-hidden="true">3</span><div className={styles.sectionHeadingText}><h2><span className={styles.screenReaderOnly}>3. </span>Eser için satış yetkisi kanıtını gir</h2>
        <p>
          Bu form para tahsil etmez. Dijital eser erişimi hakkının
          gerçekten verildiğini gösteren belge ve kaynak gereklidir.
        </p></div></div>
        <form action={registerWorkSalesRightsDraftAction} className={styles.formGrid}>
          <label>Ücretli eser
            <select name="workId" required defaultValue="">
              <option value="" disabled>Eseri seç</option>
              {works.map((work) => (
                <option key={work.id} value={work.id}>{work.title} — {work.slug}</option>
              ))}
            </select>
          </label>
          <label>Doğrulanmış hukukî satıcı
            <select name="legalPartyId" required defaultValue="">
              <option value="" disabled>Resmî satıcıyı seç</option>
              {verifiedParties.map((party) => (
                <option key={party.id} value={party.id}>{party.legalName}</option>
              ))}
            </select>
          </label>
          <label>Belgenin asıl kaynağı (HTTPS)
            <input type="url" name="evidenceUrl" required placeholder="https://"/>
          </label>
          <label>Yetki bitiş tarihi (varsa)
            <input type="date" name="validUntil"/>
          </label>
          <label className={styles.fieldWide}>Yetki belgesinden incelenecek gerçek metin / içerik (SHA-256 özeti saklanır)
            <textarea name="documentEvidence" rows={6} minLength={80} required/>
          </label>
          <div className={styles.formActions}><button className={styles.submit} type="submit">Yetki inceleme kaydı oluştur</button></div>
        </form>
      </section>

      <section id="sales-approval" className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.stepNumber} aria-hidden="true">4</span><div className={styles.sectionHeadingText}><h2><span className={styles.screenReaderOnly}>4. </span>Eser satış yetkisini son kez onayla</h2><p>Yalnız incelenmiş, geçerli eser yetkilerini onaylayın.</p></div></div>
        {pendingRights.length === 0 ? <p className={styles.empty}>Son onay bekleyen belge yok. Önce eser satış yetkisi kanıtı oluşturulmalıdır.</p> : null}
        {pendingRights.map((rights) => (
          <form action={approveWorkSellerRightsAction} key={rights.id} className={`${styles.pendingItem} ${styles.formGrid}`}>
            <h3>{rights.work.title} · {rights.legalParty.legalName}</h3>
            <p style={{ overflowWrap: "anywhere" }}>Belge SHA-256: <code>{rights.documentHash ?? "—"}</code></p>
            <p style={{ overflowWrap: "anywhere" }}>Kanıt kaydı: {JSON.stringify(rights.rightsScope)}</p>
            <input type="hidden" name="authorizationId" value={rights.id}/>
            <label className={styles.fieldWide}>Belge inceleme ve hak sahipliği değerlendirmesi
              <textarea name="reviewNote" rows={2} minLength={25} required/>
            </label>
            <label className={styles.confirmLabel}>
              <input type="checkbox" name="reviewedSalesRightsEvidence" required/>
              Bu eserde dijital erişim satışı için yetkinin geçerliliğini doğruladım.
            </label>
            <div className={styles.formActions}><button className={styles.submit} type="submit">Eser satıcısını ve yetkiyi onayla</button></div>
          </form>
        ))}
      </section>

      <section id="current-sellers" className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.stepNumber} aria-hidden="true">✓</span><div className={styles.sectionHeadingText}><h2>Geçerli eser satıcıları</h2><p>Onaylı satıcı atamaları ve gerekçeli yetki iptali.</p></div></div>
        {assignments.length === 0 ? <p className={styles.empty}>Henüz onaylı ve geçerli eser satıcısı yok.</p> : null}
        {assignments.map((entry) => (
          <div key={entry.id} className={styles.pendingItem}>
            <h3>{entry.work.title} — {entry.legalParty.legalName}</h3>
            <p>{entry.approvedAt?.toLocaleDateString("tr-TR") ?? "—"}</p>
            <Link href={`/kitap/${entry.work.slug}`}>Eser vitrini</Link>
            <form action={revokeWorkSellerAssignmentAction} className={styles.formGrid}>
              <input type="hidden" name="assignmentId" value={entry.id}/>
              <label className={styles.fieldWide}>Yetki iptali gerekçesi
                <textarea name="revokeReason" minLength={25} required rows={2}/>
              </label>
              <label className={styles.confirmLabel}>
                <input type="checkbox" name="confirmRevocation" required/>
                Bu eserde yeni sipariş oluşturma yetkisini kaldırmak istiyorum.
              </label>
              <div className={styles.formActions}><button type="submit" className={`${styles.submit} ${styles.danger}`}>Güncel satıcı atamasını iptal et</button></div>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
