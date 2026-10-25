type PriorityEducationIntent = {
  eyebrow: string;
  question: string;
  answer: string;
  proof: string;
  outputs: readonly string[];
};

const EDITOR_INTENTS: Readonly<Record<string, PriorityEducationIntent>> = {
  "editorluge-baslama": {
    eyebrow: "Editörlük Okulu · başlangıç niyeti",
    question: "Editör ne yapar, ne yapmaz ve bir metne nereden başlamalıdır?",
    answer:
      "Editörlüğü cümle düzeltmekten önce kapsam belirleme, ilk okumayı koruma, sorunu doğru katmana yerleştirme ve metinden kanıt gösterme disiplini olarak kur.",
    proof:
      "Bu eğitimde amaç yazarı yeniden yazmak değil; müdahale düzeyini, editörün yetki sınırını ve gerekçeli geri bildirimin nasıl üretileceğini somut çalışma adımlarına ayırmaktır.",
    outputs: [
      "Net görev ve müdahale kapsamı",
      "İlk okuma not sistemi",
      "Kanıta dayalı editör notu",
      "Yazarın karar hakkını koruyan çalışma sınırı",
    ],
  },
  "metin-degerlendirme": {
    eyebrow: "Editörlük Okulu · değerlendirme niyeti",
    question: "Bir metin profesyonel olarak nasıl değerlendirilir?",
    answer:
      "Metni beğeni üzerinden değil; eser vaadi, yapı, karakter, tempo, bakış açısı ve tutarlılık gibi ayrı merceklerle oku, sonra her önemli tespiti metinden kanıt ve öncelik sırasıyla raporla.",
    proof:
      "Bu sayfanın özgün odağı 'düzeltme' değil teşhistir: aynı metni okur gibi, editör gibi, kanıt arayarak ve son olarak önceliklendirerek dört farklı dikkat düzeyinde incelemeyi öğretir.",
    outputs: [
      "Tek cümlelik eser vaadi",
      "Güçlü yön / geliştirme alanı ayrımı",
      "Tespit → kanıt → okur etkisi zinciri",
      "Kritik / önemli / ikincil öncelik listesi",
    ],
  },
  "dil-ve-anlatim-editorlugu": {
    eyebrow: "Editörlük Okulu · dil ve anlatım niyeti",
    question: "Dil ve anlatım editörlüğü nasıl yapılır ve yazarın sesi nasıl korunur?",
    answer:
      "Cümleleri yalnız doğru-yanlış diye değil; açıklık, vurgu, ritim, ton, paragraf akışı ve anlatıcı sesi içindeki işlevleriyle değerlendir.",
    proof:
      "Bu eğitim, line editing ile yeniden yazma arasındaki çizgiye odaklanır: editör metni standartlaştırmak yerine sorunlu örüntüyü görünür kılar, seçenek sunar ve bilinçli üslup tercihine gerektiğinde dokunmaz.",
    outputs: [
      "Cümle ve paragraf akış kontrolü",
      "Tekrar / açıklama / vurgu teşhisi",
      "Ton ve anlatıcı sesi koruma ölçütü",
      "Düzelt / öner / geri çekil müdahale sınırı",
    ],
  },
};

const READER_INTENTS: Readonly<Record<string, PriorityEducationIntent>> = {
  "okumaya-baslama": {
    eyebrow: "Okurluk Okulu · başlangıç niyeti",
    question: "Okumaya nasıl başlanır ve sürdürülebilir bir okuma düzeni nasıl kurulur?",
    answer:
      "Okuma hedefini soyut bir 'daha çok kitap' isteğinden çıkar; amaç, eser seçimi, zaman planı ve okuma sonrası kısa kayıtlarla tekrar edilebilir bir pratiğe dönüştür.",
    proof:
      "Bu sayfanın odağı hız veya yıllık kitap sayısı değildir. Okurun kendi ilgisine ve zamanına uygun başlangıç koşulunu bulması, neden bıraktığını fark etmesi ve devam edebileceği küçük bir düzen kurmasıdır.",
    outputs: [
      "Kişisel okuma amacı",
      "Eser seçme ölçütleri",
      "Gerçekçi okuma zamanı planı",
      "Okuma sonrası kısa düşünce kaydı",
    ],
  },
};

export function PriorityEducationIntentPanel({
  area,
  slug,
}: {
  area: "editing" | "reading";
  slug: string;
}) {
  const intent = area === "editing" ? EDITOR_INTENTS[slug] : READER_INTENTS[slug];
  if (!intent) return null;

  return (
    <section
      aria-labelledby={`priority-education-intent-${area}-${slug}`}
      className="mt-6 rounded-[2rem] border border-[#6b52c7]/12 bg-[#fffdf8] p-6 shadow-[0_14px_44px_rgba(34,23,70,0.06)] sm:p-8"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">
        {intent.eyebrow}
      </p>
      <h2
        id={`priority-education-intent-${area}-${slug}`}
        className="mt-3 max-w-4xl font-serif text-3xl font-semibold tracking-[-0.035em] text-[#211746] sm:text-4xl"
      >
        {intent.question}
      </h2>
      <p className="mt-5 max-w-4xl text-base font-semibold leading-8 text-[#3b3350]">
        {intent.answer}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[1.45rem] bg-[#17122f] p-5 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#b7a8ff]">
            Bu eğitimi diğerlerinden ayıran şey
          </p>
          <p className="mt-3 text-sm leading-7 text-[#e7e2f2]">{intent.proof}</p>
        </div>
        <div className="rounded-[1.45rem] border border-[#6b52c7]/12 bg-[#efebff] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#5b35dd]">
            Eğitim sonunda elinde
          </p>
          <ul className="mt-3 space-y-2">
            {intent.outputs.map((output) => (
              <li className="flex gap-2 text-sm font-semibold leading-6 text-[#4a4258]" key={output}>
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b52c7]" />
                <span>{output}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
