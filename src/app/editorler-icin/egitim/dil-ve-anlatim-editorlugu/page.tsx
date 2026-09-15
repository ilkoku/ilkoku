import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Dil ve Anlatım Editörlüğü | İlkOku Editörlük Okulu",
  description:
    "Cümle yapısı, akıcılık, tekrar, gereksiz açıklama, ton, kelime seçimi, paragraf ritmi, üslup ve diyalog üzerinde çalışırken yazarın sesini korumayı öğren.",
  robots: { index: false, follow: true },
};

const outcomes = [
  {
    title: "Cümleyi işleviyle oku",
    text: "Bir cümleyi yalnız doğru ya da yanlış diye değil; açıklık, vurgu, ritim, bağlam ve anlatıcı sesi içindeki göreviyle değerlendir.",
  },
  {
    title: "Akışı bozan örüntüyü bul",
    text: "Tek bir kelimeye takılmadan tekrar eden uzunluk, dolgu, açıklama, geçiş veya paragraf ritmi sorunlarını görünür hale getir.",
  },
  {
    title: "Ton ve üslubu koru",
    text: "Metni nötrleştirmek yerine eserin bilinçli dil tercihlerini tanı; düzeltmeyi yazarın sesini daha temiz duyuracak kadar yap.",
  },
  {
    title: "Müdahale sınırını bil",
    text: "Line editing ile yeniden yazma arasındaki çizgiyi koru. Editör berraklaştırır, gerekçelendirir ve seçenek sunar; yazarı kendi diline çevirmez.",
  },
] as const;

const sentenceChecks = [
  {
    title: "Cümle yapısı",
    text: "Özne, eylem ve vurgu ilişkisi okurun cümleyi ilk okumada takip etmesine izin veriyor mu; yoksa anlam gereksiz dolambaçlarla mı gecikiyor?",
  },
  {
    title: "Anlatım bozukluğu",
    text: "Sözcüklerin ve eklerin ilişkisi kastedilen anlamı gerçekten taşıyor mu? Belirsizlik bilinçli değilse okur yanlış bir ilişki kuruyor olabilir.",
  },
  {
    title: "Gereksiz açıklama",
    text: "Sahne, eylem ya da diyalog zaten bilgiyi gösterdiği halde anlatıcı aynı sonucu yeniden açıklıyor mu? Açıklama metne yeni bir işlev katıyor mu?",
  },
  {
    title: "Tekrar",
    text: "Aynı kelime, duygu, bilgi veya cümle kalıbı bilinçli bir ritim kurmadan art arda dönüyor mu? Sorun yalnız kelime tekrarından ibaret olmayabilir.",
  },
  {
    title: "Kelime seçimi",
    text: "Seçilen sözcük anlatıcının dönemine, karakterine, tonuna ve sahnenin yoğunluğuna uyuyor mu; daha süslü bir kelime gerçekten daha doğru mu?",
  },
  {
    title: "Vurgu",
    text: "Cümlenin en önemli bilgisi gereksiz ayrıntılar arasında kayboluyor mu? Düzen değiştiğinde anlam değil ama okurun dikkati değişebilir.",
  },
] as const;

const flowChecks = [
  {
    title: "Cümle uzunluğu",
    text: "Peş peşe aynı uzunluk ve yapıda cümleler metni tekdüze mi kılıyor; uzun cümlelerin nefes noktaları anlaşılır mı?",
  },
  {
    title: "Paragraf odağı",
    text: "Paragraf tek bir düşünce, hareket veya algı ekseninde ilerliyor mu; yoksa birbirinden uzak işlevler aynı blokta sıkışıyor mu?",
  },
  {
    title: "Geçiş",
    text: "Bir cümleden diğerine düşünce, zaman, mekân veya duygu geçişi izlenebiliyor mu; okur bağlantıyı editör kadar kolay kurabiliyor mu?",
  },
  {
    title: "Paragraf ritmi",
    text: "Hızlanması gereken yerde metin açıklamayla ağırlaşıyor mu; durması gereken yerde çok kısa geçerek duygusal ağırlığı kaçırıyor mu?",
  },
] as const;

const voiceTools = [
  {
    title: "Ton",
    text: "Metnin duygusal mesafesi ve tavrı sahneden sahneye bilinçli biçimde değişiyor mu? Resmî, ironik, sert, sıcak ya da mesafeli ton rastlantısal kaymalara uğruyor mu?",
  },
  {
    title: "Anlatıcı sesi",
    text: "Anlatıcının sözcük dağarcığı, cümle alışkanlığı ve dünyaya bakışı ayırt edilebilir mi? Editörün kişisel beğenisi bu sesi standartlaştırmamalı.",
  },
  {
    title: "Üslup",
    text: "Kısa cümle, devrik yapı, tekrar, sessizlik veya yoğun betimleme eserin bilinçli estetik tercihi olabilir. Önce işlevi anla, sonra müdahale et.",
  },
  {
    title: "Tutarlılık",
    text: "Metin kendi dil sözleşmesini koruyor mu? Bilinçli kırılmalar ile istemeden oluşan ton ve kelime düzeyi değişikliklerini birbirinden ayır.",
  },
] as const;

const dialogueChecks = [
  {
    title: "Karaktere özgü ses",
    text: "Farklı karakterler aynı kelimeleri, aynı cümle uzunluğunu ve aynı açıklama biçimini mi kullanıyor; yoksa konuşma biçimleri kişilik ve ilişkiyi taşıyor mu?",
  },
  {
    title: "Alt metin",
    text: "Karakterler her düşündüğünü doğrudan söylüyor mu? Gerilimli sahnelerde söylenmeyen şey, seçilen kelime kadar önemli olabilir.",
  },
  {
    title: "Açıklama yükü",
    text: "Diyalog karakterlerin zaten bildiği bilgileri yalnız okura aktarmak için yapay biçimde tekrar ediyor mu? Bilgi konuşmanın doğal amacıyla örtüşmeli.",
  },
  {
    title: "Ritim ve tepki",
    text: "Konuşma yalnız replik sırası mı, yoksa duraksama, eylem, bakış ve sessizlik de sahnenin ritmini ve ilişkisini taşıyor mu?",
  },
] as const;

const boundaries = [
  {
    title: "Düzelt",
    text: "Anlamı bozan, akışı gereksiz zorlaştıran veya metnin kendi kurallarıyla çelişen yerlerde ölçülü müdahale et.",
  },
  {
    title: "Öner",
    text: "Birden fazla iyi çözüm mümkünse tek bir cümleyi zorunlu doğru gibi dayatma; sorunu açıkla ve yazarın seçebileceği yönler sun.",
  },
  {
    title: "Geri çekil",
    text: "Tercih alışılmadık olsa bile bilinçli, tutarlı ve eserin sesine hizmet ediyorsa sırf sen başka türlü yazardın diye değiştirme.",
  },
] as const;

const practice = [
  "Kullanma iznin olan 500–800 kelimelik bir metin seç ve ilk turda hiçbir cümleyi yeniden yazmadan yalnız akışın bozulduğu yerleri işaretle.",
  "İkinci turda sorunları cümle yapısı, tekrar, gereksiz açıklama, kelime seçimi, ton, paragraf ritmi veya diyalog başlıklarından birine yerleştir.",
  "Her işaret için önce sorunun okur üzerindeki etkisini tek cümleyle yaz; çözümü ancak bundan sonra düşün.",
  "Üç yerde en küçük mümkün müdahaleyi dene. Cümleyi tamamen değiştirmeden açıklığın veya ritmin iyileşip iyileşmediğini karşılaştır.",
  "Bir üslup tercihini özellikle değiştirmeden bırak ve neden yazarın sesine ait olduğunu not et.",
  "Son olarak bir önerini yeniden yazma sınırı açısından kontrol et: Bu hâlâ yazarın cümlesi mi, yoksa artık senin cümlen mi?",
] as const;

export default function DilVeAnlatimEditorluguPage() {
  const category = getEditorEducationCategory("dil-ve-anlatim-editorlugu");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Dil ve Anlatım Editörlüğü</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Cümleyi parlatmak için yazarın sesini silme; anlamı, akışı ve ritmi o sesin içinden berraklaştır.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            Dil editörlüğü metni editörün zevkine göre yeniden yazmak değildir. Amaç; okurun önündeki gereksiz sürtünmeyi azaltırken anlatıcının tonu, karakterlerin konuşma biçimi ve eserin üslup kararlarını korumaktır.
          </p>
          <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-white/[0.055] px-5 py-4 text-sm font-semibold leading-7 text-[#eee9fb]">
            Ana ilke: Editör metni kendi diline çevirmeyecek; yazarın sesini daha temiz duyulur hale getirecek.
          </div>
        </header>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Dili düzleştirmeden metni daha okunur hale getir.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {outcomes.map((item) => (
              <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#efeaf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Cümle düzeyi</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Önce “nasıl yazardım?” değil, “okur burada ne yaşıyor?” diye sor.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sentenceChecks.map((item) => (
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm" key={item.title}>
                <h3 className="font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Akıcılık ve paragraf ritmi</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Akıcılık her cümleyi kısaltmak değildir.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#665f70]">
            Bazı metinler uzun, dolanan cümlelerle; bazıları kısa ve kesik ritimlerle çalışır. Editörün görevi tek tip hız üretmek değil, metnin istediği ritmin nerede istemeden kırıldığını bulmaktır.
          </p>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {flowChecks.map((item) => (
              <div className="rounded-[1.6rem] bg-[#f8f6f0] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[2.25rem] bg-[#211746] px-7 py-9 text-white sm:px-10 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Örnek vaka</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">“Bu cümle kötü” editöryal teşhis değildir.</h2>
            <p className="mt-5 leading-8 text-[#ddd7ef]">
              Örneğin bir paragrafta aynı duygu önce karakterin hareketiyle, sonra anlatıcının açıklamasıyla, ardından iç sesle üçüncü kez söyleniyorsa sorun yalnız “fazla kelime” değildir. Okur aynı sonucu tekrar tekrar almaktadır ve sahnenin ilerleme hissi zayıflar.
            </p>
            <p className="mt-4 leading-8 text-[#ddd7ef]">
              Daha güçlü not: <strong className="text-white">tekrar eden işlev → okur etkisi → en küçük gerekli müdahale</strong>. Önce hangi tekrarın gerçekten gereksiz olduğunu göster, sonra azaltma seçeneğini öner.
            </p>
          </div>
          <div className="rounded-[2.25rem] bg-[#fff3d8] px-7 py-9 sm:px-9 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a5c00]">Kontrol sorusu</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">Bu düzeltme kimin sesini güçlendiriyor?</h2>
            <p className="mt-5 leading-8 text-[#66552f]">
              Önerin metni daha anlaşılır hale getirirken anlatıcının karakteristik sesini azaltıyorsa yeniden düşün. “Daha düzgün” görünen cümle her zaman o eser için daha doğru cümle değildir.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Ton, kelime seçimi ve üslup</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Standart Türkçe ile tek tip edebî ses aynı şey değildir.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {voiceTools.map((item) => (
              <div className="rounded-[1.6rem] bg-[#f8f6f0] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#efeaf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Diyalog</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Diyaloğu yalnız noktalama değil, karakter ve gerilim düzeyinde de oku.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {dialogueChecks.map((item) => (
              <div className="rounded-[1.6rem] bg-white p-6 shadow-sm" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Line editing / rewriting sınırı</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Editörün kalemi görünür olabilir; sesi metnin üstüne çıkmamalı.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#665f70]">
            Cümle düzeyinde düzenleme, yazar adına yeni bir anlatıcı kurmak değildir. Müdahale büyüdükçe gerekçe ve yazar onayı ihtiyacı da büyür. Özellikle yaratıcı dil tercihlerini “düzeltme” adı altında silmekten kaçın.
          </p>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {boundaries.map((item) => (
              <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#17122f] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Kendin dene</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Aynı metni daha “senin gibi” değil, daha net biçimde kendi sesiyle okut.</h2>
          <div className="mt-7 space-y-3">
            {practice.map((step) => (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] px-5 py-4 leading-7 text-[#e3dff0]" key={step}>
                {step}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-[#5b35dd]/15 bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">İlkOku’da uygula</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Dil notunu gerekçeli, ölçülü ve yazarın sesine sadık hale getir.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#665f70]">
            İlkOku editör alanında cümle veya paragraf düzeyinde bir sorun işaretlediğinde yalnız alternatif cümle bırakma. Önce neyin okuma deneyimini zorlaştırdığını açıkla, mümkün olan en küçük müdahaleyi öner ve yaratıcı kararın yazara ait olduğunu koru.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-full bg-[#5b35dd] px-5 py-3 text-sm font-extrabold text-white" href="/editor/talepler">Editör taleplerine git</Link>
            <Link className="rounded-full border border-[#2a2338]/10 bg-[#fffdf8] px-5 py-3 text-sm font-extrabold text-[#211746]" href="/editoryal-standartlar">Editoryal standartları aç</Link>
          </div>
        </section>
      </article>
    </EditorEducationShell>
  );
}
