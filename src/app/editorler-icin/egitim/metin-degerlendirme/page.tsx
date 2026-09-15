import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Metin Değerlendirme | İlkOku Editörlük Okulu",
  description: "Bir metni ilk okumadan değerlendirme raporuna kadar sistemli biçimde çözümlemeyi; güçlü yönleri, geliştirme alanlarını, kanıtları ve öncelikleri belirlemeyi öğren.",
  robots: { index: false, follow: true },
};

const outcomes = [
  {
    title: "İlk okumayı koru",
    text: "Metne ilk karşılaşmadaki okur deneyimini kaybetmeden yaklaş; erken düzeltme refleksiyle büyük resmi görünmez hale getirme.",
  },
  {
    title: "Güçlü yönü de kaydet",
    text: "Değerlendirme yalnız sorun avı değildir. Metnin çalışan taraflarını görünür kılmak, revizyonda korunması gereken unsurları belirler.",
  },
  {
    title: "Sorunu doğru katmana yerleştir",
    text: "Bir sahne problemiyle dil problemini, karakter tutarsızlığıyla tempo problemini birbirine karıştırmadan doğru editöryal başlık altında sınıflandır.",
  },
  {
    title: "Öncelik sırası kur",
    text: "Her tespit aynı ağırlıkta değildir. Eserin vaadini ve okuma deneyimini en çok etkileyen sorunları önce ele al.",
  },
] as const;

const readingPasses = [
  {
    title: "Birinci tur: okur gibi oku",
    text: "Kalemi mümkün olduğunca geri çek. Nerede meraklandığını, nerede koptuğunu, neyin aklında kaldığını ve metnin sana ne vaat ettiğini not et.",
  },
  {
    title: "İkinci tur: editör gibi haritala",
    text: "İlk izlenimleri artık yapı, karakter, bakış açısı, tempo, tutarlılık, dil ve anlatım başlıklarına ayır. Tekil hatadan çok tekrar eden örüntüleri ara.",
  },
  {
    title: "Üçüncü tur: kanıtı doğrula",
    text: "Her önemli tespitin metinde karşılığını bul. Bir sahne, paragraf, tekrar, çelişki veya boşluk üzerinden neden bu sonuca vardığını göster.",
  },
  {
    title: "Dördüncü tur: önceliği belirle",
    text: "Tespitleri ‘kritik’, ‘önemli’ ve ‘ikincil’ şeklinde sıralayarak yazarı aynı anda onlarca eşit ağırlıklı notla boğma.",
  },
] as const;

const lenses = [
  { title: "Eserin vaadi", text: "Metin okura nasıl bir deneyim vaat ediyor ve mevcut yapı bu vaadi gerçekten karşılıyor mu?" },
  { title: "Yapı", text: "Bölümler ve sahneler birbirini taşıyor mu; başlangıç, gelişme ve sonuç arasında işlevsel bir ilerleme var mı?" },
  { title: "Karakter", text: "Karakterlerin amaçları, kararları ve değişimleri metnin içinde yeterince kurulmuş mu?" },
  { title: "Tempo", text: "Metin nerede gereğinden hızlı, nerede gereğinden yavaş; ritim kırılması okuma deneyimini nasıl etkiliyor?" },
  { title: "Bakış açısı", text: "Okurun neyi, kim üzerinden ve hangi bilgi sınırıyla gördüğü tutarlı mı?" },
  { title: "Tutarlılık", text: "Olaylar, zaman çizgisi, karakter bilgileri ve dünya kuralları kendi içinde çelişiyor mu?" },
] as const;

const priorities = [
  {
    title: "Kritik",
    text: "Eserin temel vaadini, anlaşılabilirliğini veya ana yapısını bozan; düzelmeden diğer ayrıntı çalışmalarını anlamsızlaştırabilecek sorunlar.",
  },
  {
    title: "Önemli",
    text: "Okuma deneyimini belirgin biçimde zayıflatan fakat metnin ana omurgasını tamamen çökertmeyen sorunlar.",
  },
  {
    title: "İkincil",
    text: "Ana revizyon kararlarından sonra ele alınabilecek yerel tekrarlar, küçük açıklık sorunları veya ince ayar gerektiren noktalar.",
  },
] as const;

const practice = [
  "Kullanma iznin olan 1.000–1.500 kelimelik bir metin seç ve ilk turda yalnız okur tepkilerini not et.",
  "Metnin tek cümlelik vaadini yaz: ‘Bu metin okura ne yaşatmaya çalışıyor?’",
  "En az iki güçlü yön ve iki geliştirme alanı belirle; hiçbirini henüz çözmeye çalışma.",
  "Her geliştirme alanını doğru editöryal katmana yerleştir ve metinden somut bir kanıt ekle.",
  "Tespitleri kritik, önemli veya ikincil olarak sırala.",
  "Son olarak en fazla beş maddelik kısa bir değerlendirme özeti hazırla.",
] as const;

export default function MetinDegerlendirmePage() {
  const category = getEditorEducationCategory("metin-degerlendirme");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Metin Değerlendirme</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Bir eseri düzeltmeye koşmadan önce onu doğru okumayı, güçlü ve zayıf alanlarını kanıtla görünür kılmayı öğren.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            İyi değerlendirme, “beğendim / beğenmedim” cümlesinin ötesine geçer. Metnin ne yapmaya çalıştığını tanımlar, nerede çalıştığını ve nerede zorlandığını gösterir, sonra da hangi sorunların önce ele alınması gerektiğini belirler.
          </p>
        </header>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Metni yargılamak yerine teşhis etmeyi öğren.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {outcomes.map((item) => <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}><h3 className="text-lg font-extrabold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p></div>)}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#efeaf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Öğrenme yolu</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Aynı metni dört farklı dikkat düzeyiyle oku.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {readingPasses.map((item) => <div className="rounded-[1.6rem] bg-white p-6 shadow-sm" key={item.title}><h3 className="text-lg font-extrabold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p></div>)}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Değerlendirme mercekleri</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Tek bir genel yargı yerine metni doğru sorularla parçala.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lenses.map((item) => <div className="rounded-[1.5rem] border border-[#2a2338]/[0.07] p-5" key={item.title}><h3 className="font-extrabold">{item.title}</h3><p className="mt-2 text-sm leading-7 text-[#665f70]">{item.text}</p></div>)}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[2.25rem] bg-[#211746] px-7 py-9 text-white sm:px-10 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Örnek vaka</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">“Başlangıç yavaş” demek neden yetmez?</h2>
            <p className="mt-5 leading-8 text-[#ddd7ef]">Bir editör notu yalnız “ilk bölüm yavaş” diyorsa yazar neyin sorun olduğunu bilemez. Daha güçlü değerlendirme şunu gösterir: İlk 18 sayfada ana karakterin amacı henüz görünür değil, üç ayrı sahne aynı bilgiyi tekrar ediyor ve ilk gerçek çatışma 19. sayfada başlıyor.</p>
            <p className="mt-4 leading-8 text-[#ddd7ef]">Böylece yorum; <strong className="text-white">tespit → kanıt → okur etkisi</strong> zincirine dönüşür. Çözüm daha sonra gelir.</p>
          </div>
          <div className="rounded-[2.25rem] bg-[#fff3d8] px-7 py-9 sm:px-9 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a5c00]">Kontrol sorusu</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">Notun metinden kanıtlanabiliyor mu?</h2>
            <p className="mt-5 leading-8 text-[#66552f]">Kanıt gösteremiyorsan elindeki şey editöryal teşhis değil, kişisel izlenim olabilir. İzlenim değerlidir; fakat profesyonel rapora dönüşmesi için metindeki karşılığı bulunmalıdır.</p>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Önceliklendirme</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Yazara her şeyi aynı anda söyleme.</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {priorities.map((item) => <div className="rounded-[1.6rem] bg-[#f8f6f0] p-6" key={item.title}><h3 className="text-lg font-extrabold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p></div>)}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#17122f] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Kendin dene</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Kısa bir metin için mini değerlendirme raporu oluştur.</h2>
          <div className="mt-7 space-y-3">
            {practice.map((step) => <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] px-5 py-4 leading-7 text-[#e3dff0]" key={step}>{step}</div>)}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-[#5b35dd]/20 bg-[#f2effc] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">İlkOku’da uygula</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bir editör raporuna geçmeden önce değerlendirme omurganı kur.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#665f70]">İlkOku editör akışında güçlü bir rapor; önce metni doğru okuma, sonra kanıt ve öncelik üretme disiplinine dayanır. Sonraki eğitimlerde bu teşhisleri yapısal editörlük ve profesyonel geri bildirime dönüştüreceğiz.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link className="rounded-full bg-[#5b35dd] px-5 py-3 text-sm font-extrabold text-white" href="/editorler-icin">Editörler İçin ana sayfası</Link><Link className="rounded-full border border-[#5b35dd]/20 bg-white px-5 py-3 text-sm font-extrabold text-[#5b35dd]" href="/editoryal-standartlar">Editoryal Standartlar</Link></div>
        </section>
      </article>
    </EditorEducationShell>
  );
}
