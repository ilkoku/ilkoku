import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Editörlüğe Başlama | İlkOku Editörlük Okulu",
  description: "Editörün rolünü, müdahale sınırını, ilk okuma yaklaşımını, editöryal geri bildirimi ve profesyonel çalışma ilkelerini adım adım öğren.",
  // Bölüm 10'daki toplu SEO/sitemap kontrolüne kadar eğitim sayfaları indeks dışı kalır.
  robots: { index: false, follow: true },
};

const gains = [
  {
    title: "Editörün rolünü ayır",
    text: "Editörlük, yazarı taklit etmek ya da eseri kendi zevkine göre yeniden yazmak değildir. Metnin amacını görünür kılar, sorunları gerekçelendirir ve uygulanabilir seçenekler sunar.",
  },
  {
    title: "Müdahale düzeyini seç",
    text: "Yapısal sorunla cümle düzeyindeki sorunu birbirine karıştırmadan hangi aşamada hangi tür müdahalenin gerekli olduğunu belirle.",
  },
  {
    title: "Metinden kanıt göster",
    text: "‘Tempo düşük’ gibi genel yargılar yerine sorunun nerede, nasıl ve okuma deneyimini neden etkilediğini metinden izlenebilir biçimde açıkla.",
  },
  {
    title: "Yazarın sesini koru",
    text: "Öneri üretirken yaratıcı kararın yazara ait olduğunu ve editörün görevinin metni tek bir doğruya zorlamak olmadığını unutma.",
  },
] as const;

const learningPath = [
  {
    title: "Kapsamı tanımla",
    text: "İşe başlamadan önce senden ne beklendiğini netleştir: yapısal değerlendirme mi, dil-anlatım çalışması mı, son okuma mı?",
  },
  {
    title: "İlk okumayı bozma",
    text: "İlk turda her cümleyi düzeltmeye çalışma. Okur gibi ilerle; metnin vaadini, ritmini, güçlü yönlerini ve seni metinden çıkaran noktaları kaydet.",
  },
  {
    title: "Sorunu sınıflandır",
    text: "Tespiti yapı, karakter, bakış açısı, tempo, tutarlılık, dil, anlatım veya teknik doğruluk gibi doğru editöryal katmana yerleştir.",
  },
  {
    title: "Kanıtı bul",
    text: "Yorumunu somut bir sahneye, paragrafa, tekrar eden örüntüye veya metindeki çelişkiye bağla.",
  },
  {
    title: "Seçenek üret",
    text: "Yazarın yerine çözüm yazmak yerine sorunun işlevini açıkla ve birden fazla uygulanabilir revizyon yolu öner.",
  },
  {
    title: "Karar hakkını koru",
    text: "Editör önerir, gerekçelendirir ve riskleri açıklar; eserin yaratıcı yönüne ilişkin son karar yazara aittir.",
  },
] as const;

const roles = [
  {
    title: "Yapısal editörlük",
    text: "Eserin büyük ölçeğine bakar: olay örgüsü, bölüm düzeni, karakter gelişimi, tempo, anlatı mantığı ve bütünlük.",
  },
  {
    title: "Dil ve anlatım editörlüğü",
    text: "Cümlelerin açıklığı, akıcılığı, tekrarlar, ton, sözcük seçimi ve anlatım sürekliliği üzerinde çalışır; yazarın sesini korumayı hedefler.",
  },
  {
    title: "Düzeltme ve teknik kontrol",
    text: "Yazım, noktalama, tutarlılık ve belirlenmiş yazım kurallarına uyum gibi daha teknik katmanları kontrol eder.",
  },
  {
    title: "Son okuma",
    text: "Metin büyük ölçüde tamamlandıktan sonra kalan küçük hataları, dizgi veya aktarım sırasında oluşan sorunları yakalamaya odaklanır.",
  },
] as const;

const principles = [
  {
    title: "Gizlilik",
    text: "İncelediğin taslak yayımlanmamış bir çalışma olabilir. Metni, notları ve yazarla yapılan yazışmaları yalnız yetkilendirilmiş çalışma amacıyla kullan.",
  },
  {
    title: "Çıkar çatışması",
    text: "Tarafsızlığını etkileyebilecek kişisel veya profesyonel bir ilişki varsa bunu görev başlamadan görünür kıl.",
  },
  {
    title: "Kapsam sınırı",
    text: "Editöryal görüşü hukuki, tıbbi, akademik doğrulama veya yayınevi kabul garantisi gibi başka uzmanlık alanlarının yerine koyma.",
  },
  {
    title: "Yazarın sesi",
    text: "Metni daha ‘senin gibi’ yapmak editörlük değildir. Özgün sesin işlevini anlamadan yapılan müdahale eseri güçlendirmek yerine düzleştirebilir.",
  },
] as const;

const practiceSteps = [
  "Kendi yazdığın ya da kullanma iznin olan 600–1000 kelimelik kısa bir metin seç.",
  "İlk okumada yalnız üç şey yaz: metnin vaadi, en güçlü yanı ve seni okuma akışından çıkaran ilk nokta.",
  "Bulduğun sorunu ‘yapı’, ‘karakter’, ‘tempo’, ‘dil/anlatım’ veya ‘tutarlılık’ katmanlarından birine yerleştir.",
  "Sorunu tek cümleyle yargılamak yerine metinden bir kanıt ve bu kanıtın okur üzerindeki etkisini yaz.",
  "En az iki farklı revizyon seçeneği üret; metni yazar adına yeniden yazma.",
] as const;

export default function EditorlugeBaslamaPage() {
  const category = getEditorEducationCategory("editorluge-baslama");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Editörlüğe Başlama</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Bir metni düzeltmeye başlamadan önce editörün ne yaptığını, nerede durduğunu ve iyi bir editöryal kararın nasıl kurulduğunu öğren.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            Profesyonel editörlük yalnız hata bulmak değildir. Metnin niyetini anlamak, sorunu doğru katmanda teşhis etmek, görüşünü metinden kanıtlamak ve yazara uygulanabilir seçenekler sunmaktır.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-[#d8d2e8]">
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Rolü tanı</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Kapsamı belirle</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Metinden kanıtla</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Seçenek üret</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Yazarın sesini koru</span>
          </div>
        </header>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby="editor-baslama-kazanim">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
          <h2 id="editor-baslama-kazanim" className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Editörlüğe düzeltme refleksiyle değil, profesyonel değerlendirme disipliniyle başla.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {gains.map((item) => (
              <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold tracking-[-0.02em]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.35rem] bg-[#17122f] px-7 py-9 text-white shadow-[0_20px_60px_rgba(23,18,47,0.2)] sm:px-10 sm:py-11" aria-labelledby="editor-baslama-yol">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Öğrenme yolu</span>
          <h2 id="editor-baslama-yol" className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">İlk okumadan uygulanabilir editör önerisine giden yolu kur.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learningPath.map((item) => (
              <div className="rounded-[1.55rem] border border-white/10 bg-white/[0.055] p-5" key={item.title}>
                <h3 className="text-base font-extrabold leading-7">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#cfc8e2]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-[#fffdf8] px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby="editor-baslama-roller">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Editörlük türlerini ayır</span>
          <h2 id="editor-baslama-roller" className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Her sorun aynı editöryal katmanda çözülmez.</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#625b6d]">
            Profesyonel çalışmanın ilk şartı, metnin hangi aşamada olduğunu ve senden hangi düzeyde müdahale beklendiğini bilmektir. Büyük yapısal kararlarla noktalama düzeltmesini aynı turda yapmak hem odağı hem de raporun değerini zayıflatabilir.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {roles.map((item) => (
              <div className="rounded-[1.55rem] border border-black/[0.06] bg-white p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]" aria-labelledby="editor-baslama-ornek">
          <div className="rounded-[2.2rem] border border-[#6b52c7]/10 bg-[#efebff] px-7 py-9 shadow-[0_14px_44px_rgba(91,53,221,0.08)] sm:px-10 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b35dd]">Örnek vaka</span>
            <h2 id="editor-baslama-ornek" className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">“Bu bölüm çok uzun” demek editörlük değildir.</h2>
            <p className="mt-5 text-base leading-8 text-[#5f5869]">
              Bir bölümde karakterin geçmişi üç sayfa boyunca açıklanıyor ve ana çatışma tamamen duruyor olsun. Zayıf geri bildirim “Burası sıkıcı, kısalt” der. Profesyonel editör ise sorunun yerini ve etkisini gösterir: “Ana çatışma başladıktan sonra üç sayfalık geçmiş anlatısı sahnenin aciliyetini kesiyor. Bu bilginin hangisi karakterin şu anki kararını anlamak için zorunlu? Kalan ayrıntılar daha sonraki sahnelere dağıtılabilir mi?”
            </p>
          </div>
          <div className="rounded-[2.2rem] border border-black/[0.06] bg-white p-7 shadow-[0_14px_44px_rgba(34,23,70,0.06)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a78c8]">Editör kendine ne sorar?</p>
            <ul className="mt-5 space-y-4">
              {["Sorun gerçekten nerede başlıyor?", "Bu tespit metinden hangi kanıtla gösterilebilir?", "Sorunun okur üzerindeki etkisi ne?", "Yazarın amacını koruyan hangi seçenekler var?"].map((question) => (
                <li className="flex gap-3 text-sm font-semibold leading-7 text-[#423a52]" key={question}>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#6b52c7]" aria-hidden="true" />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby="editor-baslama-ilkeler">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Profesyonel sınırlar</span>
          <h2 id="editor-baslama-ilkeler" className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">İyi editörlük güven, kapsam ve yaratıcı sınır bilinci gerektirir.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {principles.map((item) => (
              <div className="rounded-[1.5rem] bg-[#f7f4ee] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#625b6d]">{item.text}</p>
              </div>
            ))}
          </div>
          <Link className="mt-7 inline-flex text-sm font-extrabold text-[#5b35dd] underline decoration-[#b7a8ff] decoration-2 underline-offset-4" href="/editoryal-standartlar">
            İlkOku Editoryal Standartlarını incele →
          </Link>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby="editor-baslama-uygulama">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Kendin dene</span>
          <h2 id="editor-baslama-uygulama" className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">İlk mini editör değerlendirmeyi hazırla.</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#625b6d]">
            Amaç metni düzeltip bitirmek değil; bir editör gibi gözlem yapıp gerekçeli ve sınırları belli bir öneri üretmektir.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {practiceSteps.map((step) => (
              <div className="rounded-[1.4rem] bg-[#f7f4ee] p-5 text-sm font-semibold leading-7 text-[#423a52]" key={step}>
                {step}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.35rem] bg-[#211746] px-7 py-9 text-white shadow-[0_20px_60px_rgba(23,18,47,0.2)] sm:px-10 sm:py-11" aria-labelledby="editor-baslama-ilkoku">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">İlkOku’da uygula</span>
          <h2 id="editor-baslama-ilkoku" className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Editörlüğe önce doğru çalışma ilkeleriyle başla.</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            İlkOku’daki editör akışında eser sürümü, görev kapsamı, bağımsız değerlendirme ve kayıtlı rapor mantığı birlikte çalışır. Eğitimin bir sonraki adımında bir metni ilk okumadan profesyonel değerlendirme raporuna nasıl taşıyacağını öğreneceksin.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-extrabold !text-[#211746] shadow-sm transition hover:-translate-y-0.5" href="/kayit?rol=editor">
              Editör olarak başla →
            </Link>
            <Link className="inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-extrabold !text-white transition hover:bg-white/10" href="/editorler-icin">
              Editörler İçin sayfasına dön
            </Link>
          </div>
        </section>
      </article>
    </EditorEducationShell>
  );
}
