import type { Metadata } from "next";
import Link from "next/link";
import { getActiveRegistrationAgreement } from "@/features/contracts/registration-agreement";
import "../yasal/legal.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform Kullanım ve Gizlilik Taahhüdü | İlkOku",
  description: "İlkOku hesabı oluşturulurken kabul edilen temel platform kullanım ve gizlilik taahhüdü.",
  alternates: { canonical: "/uyelik-sozlesmesi" },
  robots: { index: true, follow: true },
};

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "section"; title: string };

function parseAgreement(body: string): Block[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.startsWith("## ")
      ? { kind: "section" as const, title: line.slice(3).trim() }
      : { kind: "paragraph" as const, text: line });
}

export default async function RegistrationAgreementPage() {
  const agreement = await getActiveRegistrationAgreement();

  return (
    <main className="legal-page">
      <header className="legal-header">
        <div className="legal-shell legal-header__inner">
          <Link className="legal-brand" href="/">İlkOku</Link>
          <Link className="legal-back" href="/kayit">Kayıt ekranına dön</Link>
        </div>
      </header>

      <div className="legal-shell legal-layout">
        <nav className="legal-nav" aria-label="İlgili yasal metinler">
          <Link className="is-active" href="/uyelik-sozlesmesi">Üyelik taahhüdü</Link>
          <Link href="/yasal/kullanim-sartlari">Kullanım Şartları</Link>
          <Link href="/yasal/gizlilik-politikasi">Gizlilik Politikası</Link>
          <Link href="/yasal/kvkk">KVKK Aydınlatma Metni</Link>
        </nav>

        <article className="legal-document">
          {agreement ? (
            <>
              <div className="legal-document__head">
                <span>İlkOku · Zorunlu üyelik metni</span>
                <h1>{agreement.title}</h1>
                <p>Yeni hesap oluştururken kabul edilen güncel ve aktif metin.</p>
                <small>Sürüm: {agreement.version}</small>
              </div>

              {parseAgreement(agreement.body).map((block, index) =>
                block.kind === "section" ? (
                  <section className="legal-section" key={`${index}-${block.title}`}>
                    <h2>{block.title}</h2>
                  </section>
                ) : index === 0 ? (
                  <section className="legal-section" key={`${index}-${block.text}`}>
                    <p>{block.text}</p>
                  </section>
                ) : (
                  <p key={`${index}-${block.text}`}>{block.text}</p>
                ),
              )}

              <div className="legal-contact">
                <strong>Önemli</strong>
                <span>Bu sayfa yalnız kayıt sırasında kabul edilebilen aktif şablonu gösterir. Metin incelemeye alınır veya pasife çekilirse yeni üyelik işlemi de fail-closed biçimde tamamlanmaz.</span>
              </div>
            </>
          ) : (
            <>
              <div className="legal-document__head">
                <span>İlkOku · Zorunlu üyelik metni</span>
                <h1>Üyelik sözleşmesi geçici olarak kullanılamıyor</h1>
                <p>Aktif üyelik metni bulunamadığı için yeni hesap oluşturma işlemi güvenli biçimde tamamlanamaz.</p>
              </div>
              <div className="legal-contact">
                <strong>Kayıt kapısı</strong>
                <span>Metin yeniden onaylanıp aktif hale getirildiğinde kayıt işlemi kullanılabilir olacaktır.</span>
              </div>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
