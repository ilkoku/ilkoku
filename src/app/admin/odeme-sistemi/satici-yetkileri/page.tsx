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
  "satici-yazar-hesabi-eksik": "Yazarın satıcı olduğu kayıtta aktif yazar hesabı seçilmelidir.",
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
  const [parties, authorizations, assignments, eligibleWorks] = await Promise.all([
    prisma.legalParty.findMany({
      orderBy: { createdAt: "desc" }, take: 80,
      select: {
        id: true, kind: true, legalName: true, taxIdentifier: true,
        verificationStatus: true, verifiedAt: true,
      },
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
    prisma.work.findMany({
      where: {
        archivedAt: null, isActive: true, status: "published",
        saleConfiguration: { is: { saleModel: "paid", status: { in: ["ready", "active"] } } },
      },
      orderBy: { title: "asc" },
      take: 100,
      select: {
        id: true, title: true, slug: true, authorId: true,
        author: { select: { fullName: true, displayName: true } },
      },
    }),
  ]);
  const verifiedParties = parties.filter((p) => p.verificationStatus === "verified");
  const pendingParties = parties.filter((p) => p.verificationStatus === "pending");
  const pendingRights = authorizations.filter((a) => a.status === "pending");
  const eligibleAuthors = Array.from(
    new Map(eligibleWorks.map((work) => [
      work.authorId,
      { id: work.authorId, name: work.author.displayName ?? work.author.fullName },
    ])).values(),
  );

  return (
    <div className={styles.root}>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Ödeme Sistemi · 0 TL Edinim</span>
          <h1>Satıcı ve Satış Yetkisi · Yönetici Onayları</h1>
          <p>
            Yazar yalnız faturalı veya faturasız beyanını kendi panelinden kaydeder.
            Resmî hukukî satıcı ve esere özel satış yetkisi taslakları, kanıt incelemesi ve onayları
            yalnız yönetici tarafından bu panelde yürütülür. Buradan ödeme sağlayıcısı açılmaz.
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
      <nav className={styles.stepsNav} aria-label="Yönetici inceleme aşamaları">
        <a href="#seller-draft">1 · Satıcı taslağı</a>
        <a href="#seller-verification">2 · Kimlik doğrulama</a>
        <a href="#rights-draft">3 · Eser yetkisi taslağı</a>
        <a href="#sales-approval">4 · Satış yetkisi onayı</a>
        <a href="#current-sellers">Geçerli satıcılar</a>
      </nav>
      <p className={styles.empty}>
        Eserin sahibi olan yazar, satıcı hesabına açıkça bağlanır; İlkOku aracı platformdur.
        Yazarın <strong>Fatura ve Vergi Bilgilerim</strong> beyanı, hukukî satıcı
        doğrulaması veya eser satış yetkisi değildir. Aşağıdaki taslakları
        yalnız resmî bilgilere ve gerçek belgelere dayanarak oluşturun.
        Taslak kaydı satış açmaz; bağımsız doğrulama ve eser bazlı onay zorunludur.
      </p>

      <section id="seller-draft" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber} aria-hidden="true">1</span>
          <div className={styles.sectionHeadingText}>
            <h2>Hukukî satıcı taslağı oluştur</h2>
            <p>Resmî taraf bilgilerini yönetici girer. Taslak durumundaki satıcı, kanıt incelemesi tamamlanmadan doğrulanmış sayılmaz.</p>
          </div>
        </div>
        <form action={registerLegalSellerDraftAction} className={styles.formGrid} aria-label="Hukukî satıcı taslağı">
          <label>Hukukî satıcı türü
            <select name="kind" defaultValue="" required>
              <option value="" disabled>Satıcı türünü seçin</option>
              <option value="platform">İlkOku platform işletmecisi</option>
              <option value="individual">Gerçek kişi</option>
              <option value="organization">Şirket / tüzel kişi</option>
            </select>
          </label>
          <label>Satıcı olarak bağlanacak yazar hesabı (yazar satıcılarda zorunlu)
            <select name="ownerAuthorId" defaultValue="">
              <option value="">Yazar hesabı seçin</option>
              {eligibleAuthors.map((author) => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </select>
          </label>
          <label>Resmî ad soyad / ticaret unvanı
            <input name="legalName" required minLength={3} maxLength={240} autoComplete="off" />
          </label>
          <label>Vergi / kimlik tanımlayıcısı
            <input name="taxIdentifier" required minLength={5} maxLength={32} autoComplete="off" />
          </label>
          <label>Vergi dairesi (varsa)
            <input name="taxOffice" maxLength={160} autoComplete="off" />
          </label>
          <label className={styles.fieldWide}>Resmî tebligat adresi
            <textarea name="legalAddress" required minLength={12} maxLength={5000} rows={3} />
          </label>
          <label>İletişim e-postası
            <input type="email" name="contactEmail" required maxLength={320} autoComplete="off" />
          </label>
          <label>Telefon (varsa)
            <input type="tel" name="contactPhone" maxLength={32} autoComplete="off" />
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={styles.submit}>Doğrulanmamış satıcı taslağı oluştur</button>
          </div>
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

      <section id="rights-draft" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber} aria-hidden="true">3</span>
          <div className={styles.sectionHeadingText}>
            <h2>Eser satış yetkisi taslağı oluştur</h2>
            <p>Yalnız doğrulanmış hukukî satıcı ve yayımlanmış, ücretli erişime hazır eser için kanıt kaydı oluşturulabilir. Taslak satışa izin vermez.</p>
          </div>
        </div>
        {verifiedParties.length === 0 ? (
          <p className={styles.empty}>Önce hukukî satıcının resmî kanıtlarını inceleyip kimliğini doğrulayın.</p>
        ) : eligibleWorks.length === 0 ? (
          <p className={styles.empty}>Satış için hazır, yayımlanmış ücretli eser bulunamadı.</p>
        ) : (
          <form action={registerWorkSalesRightsDraftAction} className={styles.formGrid} aria-label="Eser satış yetkisi taslağı">
            <label>Eser
              <select name="workId" defaultValue="" required>
                <option value="" disabled>Eser seçin</option>
                {eligibleWorks.map((work) => (
                  <option key={work.id} value={work.id}>{work.title} · {work.slug}</option>
                ))}
              </select>
            </label>
            <label>Doğrulanmış hukukî satıcı
              <select name="legalPartyId" defaultValue="" required>
                <option value="" disabled>Satıcı seçin</option>
                {verifiedParties.map((party) => (
                  <option key={party.id} value={party.id}>{party.legalName} · {party.kind}</option>
                ))}
              </select>
            </label>
            <label className={styles.fieldWide}>Resmî satış hakkı kanıt bağlantısı (HTTPS)
              <input type="url" name="evidenceUrl" required pattern="https://.*" placeholder="https://" autoComplete="off" />
            </label>
            <label className={styles.fieldWide}>Eser bazlı satış hakkı belgesinin kontrol metni
              <textarea name="documentEvidence" required minLength={80} maxLength={20000} rows={5}
                placeholder="Yetkiyi veren taraf, eser, dijital okuma hakkı, Türkiye kapsamı ve belge geçerliliğini içeren kanıt metni" />
            </label>
            <label>Belge geçerlilik bitişi (varsa)
              <input type="date" name="validUntil" />
            </label>
            <p className={styles.fieldWide}>
              Bu işlem belge metninin SHA-256 özetini ve kanıt bağlantısını saklar; taslak oluşturmak satış izni veya belge onayı değildir.
            </p>
            <div className={styles.formActions}>
              <button type="submit" className={styles.submit}>Eser satış yetkisi taslağı oluştur</button>
            </div>
          </form>
        )}
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
