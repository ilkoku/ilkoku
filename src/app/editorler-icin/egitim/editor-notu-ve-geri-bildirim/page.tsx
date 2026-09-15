import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Editör Notu ve Geri Bildirim | İlkOku Editörlük Okulu",
  description:
    "Editöryal tespiti metinden kanıta, okur etkisine ve uygulanabilir revizyon seçeneğine dönüştürmeyi; editör mektubu ile satır içi notu doğru yerde kullanmayı öğren.",
  alternates: { canonical: "/editorler-icin/egitim/editor-notu-ve-geri-bildirim" },
  robots: { index: true, follow: true },
};

const outcomes = [
  {
    title: "Tespiti gerekçelendir",
    text: "‘Burada sorun var’ demek yerine hangi metin unsurunun hangi nedenle çalışmadığını göster. Editör notu, yorumu metinden izlenebilir bir gerekçeye bağlar.",
  },
  {
    title: "Etkiyi tarif et",
    text: "Sorunun yalnız varlığını değil, okurun bilgi, duygu, tempo, karakter veya güven ilişkisini nasıl etkilediğini açıkla. Böylece yazar neden revizyon gerektiğini anlayabilir.",
  },
  {
    title: "Öncelik kur",
    text: "Her not aynı ağırlıkta değildir. Önce eserin bütününü etkileyen yapısal meseleleri, sonra sahne ve paragraf düzeyini, en son ince dil tercihlerini ele al.",
  },
  {
    title: "Yazarın karar alanını koru",
    text: "Editör seçenek sunar, soruyu keskinleştirir ve sonucu görünür kılar; fakat metni kendi zevkine göre yeniden yazmaz. Son yaratıcı karar yazara aittir.",
  },
] as const;

const feedbackChain = [
  {
    title: "Tespit",
    text: "Metinde gözlemlediğin somut durumu tarafsız biçimde adlandır: bilgi tekrarı, motivasyon boşluğu, sahne hedefinin belirsizliği, ton kayması veya benzeri.",
  },
  {
    title: "Kanıt",
    text: "Tespiti belirli sahne, paragraf, tekrar eden örüntü veya metin içi davranışla destekle. Yazar yorumunun nereden geldiğini görebilmeli.",
  },
  {
    title: "Etki",
    text: "Bu unsur okur deneyiminde ne üretiyor? Merakı azaltıyor, karakter kararını zayıflatıyor, ritmi kesiyor, anlamı bulanıklaştırıyor veya gereksiz açıklama mı yaratıyor?",
  },
  {
    title: "Revizyon seçeneği",
    text: "Tek bir zorunlu cümle yazmak yerine çözüm yönü öner: bilgiyi geciktirmek, sahne hedefini netleştirmek, tekrarı azaltmak, motivasyonu daha önce hazırlamak gibi.",
  },
] as const;

const noteLayers = [
  {
    title: "Editör mektubu",
    text: "Eserin bütününe bakan üst düzey değerlendirmedir. Güçlü yönleri, ana revizyon önceliklerini, tekrar eden örüntüleri ve önerilen çalışma sırasını bir arada gösterir.",
  },
  {
    title: "Bölüm / sahne notu",
    text: "Belirli bir bölümün amacı, tempo, bilgi düzeni, karakter hareketi veya sahne sonucu gibi orta ölçekli sorunları ele alır. Üst düzey raporla bağlantısını korur.",
  },
  {
    title: "Satır içi not",
    text: "Cümle, kelime, geçiş veya küçük anlatım sorunlarında kullanılır. Yapısal problemi yüzlerce mikro yorumla gizleme; aynı örüntü tekrar ediyorsa önce genel notta açıkla.",
  },
  {
    title: "Soru notu",
    text: "Editörün kesin hüküm vermek için yeterli bağlamı olmadığı yerde soruyu kullan. ‘Bu sahnede amaç X mi?’ gibi bir soru, varsayım yapmaktan daha doğru olabilir.",
  },
] as const;

const priorityLevels = [
  {
    title: "Önce bütün",
    text: "Ana çatışma, karakter motivasyonu, anlatı mantığı, bölüm sırası veya tür vaadi gibi kararlar çok sayıda alt notu etkileyebilir. Büyük revizyon çözülmeden mikro düzeltmeye gömülme.",
  },
  {
    title: "Sonra sahne",
    text: "Sahne hedefi, bilgi zamanı, dramatik sonuç, tempo ve geçişler gibi orta ölçekli sorunları bütün yapı netleştikten sonra ele al.",
  },
  {
    title: "Sonra cümle",
    text: "Akıcılık, tekrar, sözcük seçimi ve küçük anlatım sorunları önemlidir; fakat büyük revizyonda silinecek bir sahneyi önce satır satır parlatmak verimsiz olabilir.",
  },
] as const;

const languageChecks = [
  {
    title: "Hüküm değil gözlem",
    bad: "Bu bölüm kötü ve sıkıcı.",
    better: "Bölümün ortasında aynı bilgi üç kez açıklandığı için ana çatışma yaklaşık iki sahne boyunca ilerlemiyor; bu tekrarlar ritmi yavaşlatıyor.",
  },
  {
    title: "Zihin okuma değil etki",
    bad: "Okur burada kesinlikle karakterden nefret eder.",
    better: "Kararın hazırlığı görünmediği için karakterin bu anda neden böyle davrandığını takip etmek zorlaşıyor; önceki bölümde motivasyona küçük bir hazırlık eklemek düşünülebilir.",
  },
  {
    title: "Emir değil seçenek",
    bad: "Bu sahneyi sil ve yerine kavga yaz.",
    better: "Sahnenin mevcut halinde ilişki gerilimi sonuç üretmiyor. Çatışmayı görünür bir karara, kayba veya yeni bilgiye bağlamak sahnenin işlevini güçlendirebilir.",
  },
  {
    title: "Beğeni değil ölçüt",
    bad: "Ben bu anlatım tarzını sevmiyorum.",
    better: "Metnin geri kalanında yakın üçüncü kişi korunurken burada anlatıcı karakterin bilemeyeceği bilgiye geçiyor. Bu kırılma bilinçliyse işlevini netleştirmek, değilse bakış açısını tutarlılaştırmak gerekir.",
  },
] as const;

const workedExample = {
  context:
    "Bir gizem romanında şüpheli karakter, finalden hemen önce daha önce hiç anılmamış bir geçmiş olay nedeniyle suçlu ilan ediliyor. Çözüm şaşırtıcı; ancak okurun bu sonuca yaklaşabileceği önceki veri çok sınırlı.",
  weak:
    "Final olmamış. Katili daha iyi hazırlamalısın.",
  strong:
    "Finaldeki açıklama sürpriz yaratıyor; ancak suçluyu belirleyen geçmiş olay ilk kez çözüm anında geldiği için okur önceki bölümlerde aynı olasılığı sınayamıyor. Özellikle 4–7. bölümlerde bu geçmişe doğrudan cevap vermeyen ama geriye dönük anlam kazanacak bir iz bırakmak, çözümün hem şaşırtıcı hem de adil hissedilmesini güçlendirebilir. Bunu açık ipucu yerine davranış, çelişkili bilgi veya eksik bir kayıt üzerinden kurmayı düşünebilirsin.",
} as const;

const boundaries = [
  {
    title: "Metni sahiplenme",
    text: "‘Ben olsam şöyle yazardım’ editöryal ölçüt değildir. Önerinin amacı editörün tercih ettiği metni üretmek değil, yazarın kendi hedefini daha güçlü gerçekleştirmesine yardım etmektir.",
  },
  {
    title: "Kesinlik rolü oynama",
    text: "Tek bir okuma deneyimini bütün okurlar adına konuşma. Gerektiğinde ‘benim okumamda’, ‘bu bağlamda’ veya ‘metindeki mevcut hazırlıkla’ diyerek yorumunun kapsamını açık tut.",
  },
  {
    title: "Kişiye değil metne konuş",
    text: "Yazarın yeteneği, karakteri veya niyeti hakkında hüküm verme. ‘Bunu anlamamışsın’ yerine metinde görünen sonucu ve eksik bağlantıyı tarif et.",
  },
  {
    title: "Çözümü zorunlu kılma",
    text: "Birden fazla çözüm mümkünse tek seçeneği doğru cevap gibi dayatma. Sorunun editöryal nedenini netleştir; yaratıcı çözüm alanını yazara bırak.",
  },
] as const;

const practice = [
  "Kullanma iznin olan kısa bir metin seç ve önce hiçbir öneri vermeden yalnız üç somut editöryal tespit yaz.",
  "Her tespitin yanına metinden kanıt ekle: belirli sahne, tekrar eden örüntü, bilgi boşluğu veya cümle davranışı.",
  "Her kanıt için okur etkisini tek cümleyle tarif et. ‘Bence kötü’ yerine merak, açıklık, tempo, karakter veya duygu üzerinden konuş.",
  "Her sorun için en az iki farklı revizyon yönü düşün. Böylece öneriyi tek zorunlu çözüme dönüştürmeden yazarın karar alanını koru.",
  "Notlarını üç gruba ayır: bütün eser, bölüm/sahne ve satır düzeyi. En önemli üç revizyonu en üste taşı.",
  "Son olarak güçlü çalışan iki alanı da metinden kanıtla belirt. Övgüyü genel tutma; yazar hangi tercihin işe yaradığını anlayabilsin.",
] as const;

export default function EditorNotuVeGeriBildirimPage() {
  const category = getEditorEducationCategory("editor-notu-ve-geri-bildirim");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Editör Notu ve Geri Bildirim</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Tespiti hükme değil gerekçeye; gerekçeyi de yazarın gerçekten kullanabileceği bir revizyon yönüne dönüştür.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            Güçlü geri bildirim yalnız doğru bir sorunu bulmaz. Sorunun metinde nerede göründüğünü, okur deneyiminde ne ürettiğini ve hangi tür revizyon seçeneklerinin düşünülebileceğini açık eder. Editör yolu görünür kılar; eserin sahibi olmaya çalışmaz.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-[#d8d2e8]">
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Tespit</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Kanıt</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Etki</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Revizyon seçeneği</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Öncelik</span>
          </div>
        </header>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">“Düzelt” demek yerine yazara çalışabileceği bir editöryal yol haritası ver.</h2>
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
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Geri bildirim zinciri</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Tespit → kanıt → etki → revizyon seçeneği.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-4">
            {feedbackChain.map((item, index) => (
              <div className="rounded-[1.6rem] bg-white/80 p-6" key={item.title}>
                <span className="text-xs font-black tracking-[0.14em] text-[#8068d9]">0{index + 1}</span>
                <h3 className="mt-3 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-[1.4rem] border border-[#6b52c7]/15 bg-white/65 px-5 py-4 text-sm leading-7 text-[#51495f]">
            Bu zincirin amacı her notu uzun bir rapora çevirmek değildir. Karmaşık veya önemli meselelerde gerekçeyi görünür tut; küçük ve açık sorunlarda daha kısa olabilirsin.
          </p>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Not katmanları</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Her sorunu aynı büyüklükte ve aynı yerde anlatma.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {noteLayers.map((item) => (
              <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[2.25rem] bg-[#17122f] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Revizyon önceliği</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Önce bütün, sonra sahne, sonra cümle.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {priorityLevels.map((item) => (
              <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8d2e8]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Geri bildirim dili</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Kişisel hükmü editöryal gerekçeye çevir.</h2>
          <div className="mt-7 space-y-4">
            {languageChecks.map((item) => (
              <div className="grid gap-4 rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6 lg:grid-cols-[0.8fr_1fr_1.4fr]" key={item.title}>
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#8068d9]">{item.title}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#a34f63]">Zayıf not</span>
                  <p className="mt-2 text-sm leading-7 text-[#665f70]">“{item.bad}”</p>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#4c6f62]">Gerekçeli not</span>
                  <p className="mt-2 text-sm leading-7 text-[#51495f]">“{item.better}”</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#efeaf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Örnek vaka</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Aynı tespit, iki farklı geri bildirim kalitesi.</h2>
          <p className="mt-5 max-w-4xl text-sm leading-7 text-[#665f70]">{workedExample.context}</p>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.6rem] border border-[#b15b6e]/15 bg-white/70 p-6">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#a34f63]">Zayıf editör notu</span>
              <p className="mt-4 text-base leading-8 text-[#51495f]">“{workedExample.weak}”</p>
              <p className="mt-4 text-sm leading-7 text-[#746c7d]">Tespit var; fakat kanıt, okur etkisi ve uygulanabilir yön yok. Yazar neyi neden değiştireceğini hâlâ tahmin etmek zorunda.</p>
            </div>
            <div className="rounded-[1.6rem] border border-[#6b52c7]/15 bg-white p-6 shadow-[0_12px_36px_rgba(34,23,70,0.07)]">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#6b52c7]">Gerekçeli editör notu</span>
              <p className="mt-4 text-base leading-8 text-[#3f374c]">“{workedExample.strong}”</p>
              <p className="mt-4 text-sm leading-7 text-[#746c7d]">Bu not sorunun tür mantığıyla ilişkisini açıklar, metindeki yerini işaret eder ve yazarı tek çözüme kilitlemeden revizyon yönü sunar.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Profesyonel sınır</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Geri bildirim metni güçlendirsin; editörü metnin sahibi yapmasın.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
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
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bir editör notunu baştan sona gerekçeli hale getir.</h2>
          <ol className="mt-7 space-y-4">
            {practice.map((item, index) => (
              <li className="flex gap-4 rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-5 text-sm leading-7 text-[#e2ddee]" key={item}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-[#6b52c7]/15 bg-[#fffdf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">İlkOku’da uygula</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Raporunu eserin belirli sürümüne bağla ve gerekçeni izlenebilir bırak.</h2>
          <p className="mt-5 max-w-4xl text-base leading-8 text-[#5f576a]">
            İlkOku editör akışında değerlendirme belirli bir eser sürümüne dayanır. Bu yüzden raporunda hangi örüntüyü gördüğünü, bunun metinde nerede tekrarlandığını ve hangi revizyon önceliğini önerdiğini açık tut. İkinci editör bağımsız değerlendirme yaptığı için kendi raporunu başka bir görüşü tahmin etmeye göre değil, eserin kendisine göre kur.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-full bg-[#211746] px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5" href="/editor/incelemeler">Editör çalışma alanına git</Link>
            <Link className="rounded-full border border-[#211746]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#211746]" href="/editoryal-standartlar">Editoryal Standartları oku</Link>
            <Link className="rounded-full border border-[#211746]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#211746]" href="/editorler-icin/egitim/tur-editorlugu">Önceki eğitim: Tür Editörlüğü</Link>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Kapanış kontrolü</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bir notu göndermeden önce beş soru sor.</h2>
          <div className="mt-7 grid gap-3 text-sm leading-7 text-[#5f576a] sm:grid-cols-2">
            <p className="rounded-[1.25rem] bg-[#f7f4fb] p-5"><strong className="text-[#211746]">1.</strong> Tespitim metinden gösterilebilir mi?</p>
            <p className="rounded-[1.25rem] bg-[#f7f4fb] p-5"><strong className="text-[#211746]">2.</strong> Okur etkisini gerekçelendirdim mi?</p>
            <p className="rounded-[1.25rem] bg-[#f7f4fb] p-5"><strong className="text-[#211746]">3.</strong> Sorunun önceliğini doğru belirledim mi?</p>
            <p className="rounded-[1.25rem] bg-[#f7f4fb] p-5"><strong className="text-[#211746]">4.</strong> Önerim yazarın karar alanını koruyor mu?</p>
            <p className="rounded-[1.25rem] bg-[#f7f4fb] p-5 sm:col-span-2"><strong className="text-[#211746]">5.</strong> Aynı şeyi daha açık, daha kısa ve daha profesyonel söyleyebilir miyim?</p>
          </div>
        </section>
      </article>
    </EditorEducationShell>
  );
}
