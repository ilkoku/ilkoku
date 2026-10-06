import Link from "next/link";

type EditorialTrustNoteProps = {
  context: "writing" | "reading" | "editing";
  expertVerificationRequired?: boolean;
};

const contextCopy = {
  writing: {
    summary: "Bu rehber, tür mantığını, özgün örnekleri ve uygulanabilir yazım adımlarını birbirinden ayırarak hazırlanır.",
    method: "Önce türün okura verdiği söz ve temel teknik kararlar tanımlanır; ardından örnek proje, uygulama adımları, revizyon ve yayın öncesi kontrol birbirinden ayrı katmanlarda ele alınır.",
    firstParty: "Öğrenilen kararlar, İlkOku’daki yazar alanında taslak oluşturma, bölüm geliştirme ve editöryal geri bildirim akışına uygulanabilecek şekilde yapılandırılır.",
  },
  reading: {
    summary: "Bu eğitim, okuma becerisini, örnek çözümlemeyi ve uygulanabilir alıştırmaları birbirinden ayırarak hazırlanır.",
    method: "Öğrenme hedefi önce açıklanır; kavramlar örnek çözümleme ile görünür hâle getirilir, ardından okurun kendi metin üzerinde uygulayabileceği pratik adımlar verilir.",
    firstParty: "Eğitim çıktıları, İlkOku’daki okuma ve yorumlama deneyiminde metne dayalı, gerekçeli ve yapıcı geri bildirim üretmeye bağlanır.",
  },
  editing: {
    summary: "Bu eğitim, metinden kanıt göstermeyi, kapsam sınırını ve uygulanabilir editöryal geri bildirimi birlikte ele alır.",
    method: "Editöryal kararlar kapsam tanımı, ilk okuma, sorun sınıflandırma, metinden kanıt, seçenek üretme ve yazarın karar hakkını koruma sırasıyla ele alınır.",
    firstParty: "Yaklaşım, İlkOku’daki eser sürümü, görev kapsamı, bağımsız değerlendirme ve kayıtlı editör raporu mantığıyla uyumludur.",
  },
} as const;

export function EditorialTrustNote({
  context,
  expertVerificationRequired = false,
}: EditorialTrustNoteProps) {
  const copy = contextCopy[context];

  return (
    <aside
      aria-label="İçerik ve editoryal şeffaflık"
      className="mt-6 rounded-[1.8rem] border border-[#6b52c7]/10 bg-[#fffdf8] p-6 shadow-[0_12px_36px_rgba(34,23,70,0.05)] sm:p-7"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">
        İçerik ve editoryal şeffaflık
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#211746]">
        Hazırlayan: İlkOku
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#696270]">
        {copy.summary} İçerik eğitim amaçlıdır; yayınevi kabul garantisi vermez.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <section className="rounded-[1.3rem] border border-[#6b52c7]/10 bg-white p-5">
          <h3 className="text-sm font-extrabold text-[#211746]">İçerik yöntemi</h3>
          <p className="mt-2 text-sm leading-7 text-[#696270]">{copy.method}</p>
        </section>
        <section className="rounded-[1.3rem] border border-[#6b52c7]/10 bg-white p-5">
          <h3 className="text-sm font-extrabold text-[#211746]">Editoryal kontrol</h3>
          <p className="mt-2 text-sm leading-7 text-[#696270]">
            Kapsam, kavram tutarlılığı, örneklerin eğitim amacına uygunluğu, profesyonel sınırlar ve kullanıcıya uygulanabilirlik İlkOku’nun yayımlanmış editoryal standartlarıyla birlikte değerlendirilir.
          </p>
        </section>
        <section className="rounded-[1.3rem] border border-[#6b52c7]/10 bg-white p-5">
          <h3 className="text-sm font-extrabold text-[#211746]">Kaynak yaklaşımı</h3>
          <p className="mt-2 text-sm leading-7 text-[#696270]">
            Dışarıdan doğrulanabilir bir bilgiye dayanılması gerektiğinde kaynak ile yorum birbirinden ayrılmalı; güncel, birincil veya alan açısından yetkin kaynak tercih edilmeli ve belirsizlik açıkça belirtilmelidir.
          </p>
        </section>
        <section className="rounded-[1.3rem] border border-[#6b52c7]/10 bg-white p-5">
          <h3 className="text-sm font-extrabold text-[#211746]">İlkOku’ya özgü uygulama</h3>
          <p className="mt-2 text-sm leading-7 text-[#696270]">{copy.firstParty}</p>
        </section>
      </div>

      {expertVerificationRequired ? (
        <div className="mt-4 rounded-[1.3rem] border border-[#b86b2c]/20 bg-[#fff8ef] p-5">
          <h3 className="text-sm font-extrabold text-[#5b381d]">Uzmanlık gerektiren konu</h3>
          <p className="mt-2 text-sm leading-7 text-[#72513a]">
            Bu sayfa bir yazarlık eğitimi olarak konuya yaklaşır. Hukuk, sağlık, psikoloji veya finans alanında olgusal iddia, yönlendirme ya da profesyonel karar içeren bölümler uzman görüşünün ve güncel yetkili kaynakların yerine geçmez.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-extrabold">
        <Link
          className="text-[#5b35dd] underline decoration-[#5b35dd]/25 underline-offset-4"
          href="/editoryal-standartlar"
        >
          Editoryal standartlar
        </Link>
        <Link
          className="text-[#5b35dd] underline decoration-[#5b35dd]/25 underline-offset-4"
          href="/hakkimizda"
        >
          İlkOku hakkında
        </Link>
      </div>
      <p className="mt-4 text-xs leading-6 text-[#81798a]">
        Son sayfa güncellemesi: 6 Ekim 2026
      </p>
    </aside>
  );
}
