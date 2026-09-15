import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Tür Editörlüğü | İlkOku Editörlük Okulu",
  description:
    "Bir eseri kendi türünün okur vaadi, anlatı mantığı, alt türü, tür konvansiyonları ve hedef okur beklentileri içinde değerlendirmeyi; tür beklentisini klişeye dönüştürmeden editörlük yapmayı öğren.",
  robots: { index: false, follow: true },
};

const outcomes = [
  {
    title: "Tür sözleşmesini tanı",
    text: "Bir eserin okura hangi temel deneyimi vaat ettiğini belirle. Tür etiketi yalnız raftaki kategori değil; gerilim, merak, duygu, bilgi veya hayretin nasıl kurulacağına ilişkin bir okur beklentisidir.",
  },
  {
    title: "Yanlış ölçüt kullanma",
    text: "Polisiyeyi romantik romanın, çocuk kitabını yetişkin edebiyatının ya da fantastik eseri katı gerçekçi romanın ölçütleriyle değerlendirme. Önce metnin kendi oyun alanını tanı.",
  },
  {
    title: "Konvansiyon ile klişeyi ayır",
    text: "Türün temel vaadini taşıyan yapısal ihtiyaçlarla ezbere tekrar edilen kalıpları birbirinden ayır. Editörün görevi eseri formüle zorlamak değil, verdiği sözü tutup tutmadığını sınamaktır.",
  },
  {
    title: "Hibrit eseri doğru oku",
    text: "Bir eser birden fazla türe yaslanabilir. Hangi türün ana deneyimi taşıdığını, diğer türlerin hangi işlevi üstlendiğini ve beklentilerin nerede çatıştığını görünür hale getir.",
  },
] as const;

const genreContract = [
  {
    title: "Okur vaadi",
    text: "Okur bu eseri seçtiğinde nasıl bir temel deneyim bekliyor? Bir gizemde çözüm aramak, romantik eserde ilişkinin duygusal yolculuğunu izlemek, korkuda tehdit ve tekinsizlik yaşamak gibi.",
  },
  {
    title: "Ana soru",
    text: "Türün okuru sayfada tutan baskın sorusu ne? ‘Kim yaptı?’, ‘Bu ilişki nereye varacak?’, ‘Bu dünyanın kuralı nasıl işleyecek?’, ‘Tehditten çıkılabilecek mi?’ gibi sorular metnin motorunu belirleyebilir.",
  },
  {
    title: "Bilgi düzeni",
    text: "Okurun neyi ne zaman bilmesi gerektiği türe göre değişir. Gizemde bilgi saklama adil olmalı; gerilimde yaklaşan tehlike bilinebilir; fantastikte dünya bilgisi anlatıyı boğmadan kurulmalıdır.",
  },
  {
    title: "Kapanış beklentisi",
    text: "Her tür aynı biçimde kapanmaz; fakat eserin kurduğu temel soru ve vaatle final arasındaki ilişki editöryal olarak sınanmalıdır. Bilinçli açık uç ile eksik çözümü birbirinden ayır.",
  },
] as const;

const genreLenses = [
  {
    title: "Polisiye / Gizem",
    text: "İpucu zinciri, şüpheli düzeni, bilgi adaleti, yanlış yönlendirme ve çözümün geriye dönük olarak anlaşılabilir olup olmadığına bak. Final yalnız şaşırtıcı değil, metnin kurduğu verilerle savunulabilir olmalı.",
  },
  {
    title: "Fantastik / Bilimkurgu",
    text: "Dünya kuralları, güç veya teknoloji sınırları, neden-sonuç ilişkisi ve bilgi yükünü incele. Yeni bir kural yalnız ihtiyaç anında ortaya çıkıyorsa çözüm kolaylığı yaratabilir; fakat her eser aynı açıklama yoğunluğunu istemez.",
  },
  {
    title: "Romantik",
    text: "Merkezdeki ilişkinin gerçekten anlatının ana hareketini taşıyıp taşımadığını, iki tarafın karar ve dönüşümünü, duygusal ilerlemeyi ve metnin kendi alt türüne uygun kapanış vaadini değerlendir.",
  },
  {
    title: "Korku / Gerilim",
    text: "Tehdit, belirsizlik, beklenti, ritim ve güvenlik duygusunun nasıl bozulduğunu izle. Sürekli yüksek ses yerine gerilimin kurulup boşaltılması, tehdidin giderek anlam kazanması ve sonuç üretmesi önemlidir.",
  },
  {
    title: "Çocuk / Genç Yetişkin",
    text: "Hedef yaş grubunu yalnız kelime zorluğuyla ölçme. Bakış açısı, deneyim alanı, duygusal erişilebilirlik, bilgi yükü, karakter özerkliği ve okurun gelişim düzeyi birlikte değerlendirilmelidir.",
  },
  {
    title: "Kurgu dışı / Akademik",
    text: "Ana iddia, kapsam, kaynak ilişkisi, kavramların tanımı, bölüm mantığı ve okurun bilgi ihtiyacını değerlendir. Edebi akıcılık önemli olabilir; fakat doğruluk ve kanıt yapısının yerine geçmez.",
  },
] as const;

const hybridChecks = [
  {
    title: "Birincil türü bul",
    text: "Eser rafta birden fazla etikete sahip olabilir. Okur deneyimini ve ana çatışmayı hangi tür mantığı taşıyor? Birincil tür, editöryal öncelikleri belirlemeye yardımcı olur.",
  },
  {
    title: "Alt türü belirle",
    text: "Aynı ana tür içinde beklentiler değişebilir. Kapalı oda polisiyesiyle polisiye gerilim, epik fantastikle büyülü gerçekçilik veya tarihsel romantikle çağdaş romantik aynı kontrol listesini istemez.",
  },
  {
    title: "Türlerin görevini ayır",
    text: "Romantik alt hikâye karakter dönüşümünü mü taşıyor, yoksa eser gerçekten romantik roman mı? Gizem unsuru atmosfer mi yaratıyor, yoksa çözülmesi gereken ana soru mu? Etiket yerine işlevi takip et.",
  },
  {
    title: "Çatışan beklentiyi görünür kıl",
    text: "İki türün tempo, açıklama veya kapanış beklentileri çakışabilir. Editör hangi vaadin baskın olduğunu yazarla netleştirir; metni tek bir kategoriye zorlamak zorunda değildir.",
  },
] as const;

const conventionChecks = [
  {
    title: "Konvansiyon",
    text: "Okurun türü tanımasını ve ana deneyimi yaşayabilmesini sağlayan işlevsel beklentidir. Örneğin bir gizemin çözümü için metinde izlenebilir veri bulunması yapısal bir beklenti olabilir.",
  },
  {
    title: "Klişe",
    text: "İşlevi sorgulanmadan tekrar edilen tanıdık kalıptır. Tanıdık olmak tek başına hata değildir; sorun, kalıbın esere yeni anlam, gerilim veya karakter işlevi katmadan kullanılmasıdır.",
  },
  {
    title: "Bilinçli ihlal",
    text: "Yazar tür beklentisini bilerek bozabilir. Editör ‘kurala uymuyor’ demeden önce ihlalin ne ürettiğini ve okurun beklentisini nasıl yeniden çerçevelediğini değerlendirir.",
  },
  {
    title: "Yanlış konumlandırma",
    text: "Bazen metnin sorunu yazıda değil, kendisini sunduğu türdedir. Eser başka bir tür mantığıyla daha tutarlı çalışıyorsa bunu hüküm olarak değil, gerekçeli bir konumlandırma sorusu olarak aç.",
  },
] as const;

const practice = [
  "Kullanma iznin olan bir metin seç ve yazarın belirttiği tür ile senin okur olarak algıladığın türü ayrı ayrı yaz.",
  "Metnin okura verdiği temel tür vaadini tek cümleyle tanımla: ‘Bu eser okura hangi ana deneyimi yaşatmayı vaat ediyor?’",
  "Birincil türü ve varsa alt türü belirle; ardından yalnız bu esere özgü beş editöryal kontrol sorusu üret.",
  "Metinde tür beklentisini karşılayan iki güçlü alan ve okur vaadini zayıflatan iki alan bul; tespitlerini somut kanıtla destekle.",
  "Bir konvansiyon ile bir klişe örneğini ayır. Her ikisinin de metindeki işlevini açıklamadan silme veya koruma kararı verme.",
  "Eser hibritse iki türün beklentilerinin nerede birbirini desteklediğini, nerede çatıştığını kısa bir editör notuyla yaz.",
] as const;

export default function TurEditorluguPage() {
  const category = getEditorEducationCategory("tur-editorlugu");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Tür Editörlüğü</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Bir eseri genel bir “iyi metin” kalıbına göre değil, kendi türünün okura verdiği söz ve anlatı mantığı içinde değerlendirmeyi öğren.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            Tür editörlüğü bir formül denetimi değildir. Editör, türün okur beklentisini tanır; metnin bu beklentiyle nasıl konuştuğunu, nerede bilinçli biçimde ayrıldığını ve hangi noktada verdiği sözü istemeden bozduğunu teşhis eder.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-[#d8d2e8]">
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Tür sözleşmesi</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Alt tür</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Okur beklentisi</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Konvansiyon</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Hibrit eser</span>
          </div>
        </header>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Aynı editöryal cetveli her esere dayatmamayı öğren.</h2>
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
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Tür sözleşmesi</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Önce eserin okura ne vaat ettiğini tarif et.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {genreContract.map((item) => (
              <div className="rounded-[1.6rem] bg-white p-6 shadow-sm" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Türe göre editöryal mercek</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Aynı soru her türde aynı ağırlığa sahip değildir.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#665f70]">
            Aşağıdaki başlıklar kesin formüller değil, editörün dikkatini doğru yere yönelten örnek merceklerdir. Alt tür, hedef okur ve yazarın bilinçli tercihleri her zaman ayrıca değerlendirilir.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {genreLenses.map((item) => (
              <div className="rounded-[1.5rem] bg-[#f8f6f0] p-5" key={item.title}>
                <h3 className="font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[2.25rem] bg-[#211746] px-7 py-9 text-white sm:px-10 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Örnek vaka</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">“Katil son bölümde ilk kez ortaya çıksın; daha şaşırtıcı olur.”</h2>
            <p className="mt-5 leading-8 text-[#ddd7ef]">
              Bir gizem eserinde yalnız sürpriz üretmek için çözümün ana unsurunu son anda metne eklemek, okurun soruşturma sürecine katılma vaadini bozabilir. Sorun “final şaşırtıcı olmasın” değildir; okurun geriye baktığında çözümün izlerini görebilmesi gerekir.
            </p>
            <p className="mt-4 leading-8 text-[#ddd7ef]">
              Editör böylece kişisel beğenisini değil, <strong className="text-white">tür vaadi → bilgi düzeni → okur deneyimi</strong> ilişkisini gerekçelendirir.
            </p>
          </div>
          <div className="rounded-[2.25rem] bg-[#fff3d8] px-7 py-9 sm:px-9 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a5c00]">Kontrol sorusu</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">Bu gerçekten tür kuralı mı, yoksa alışkanlık mı?</h2>
            <p className="mt-5 leading-8 text-[#66552f]">
              Bir öneriyi “bu türde böyle yapılır” diye yazmadan önce işlevini açıkla. Okur deneyimini taşıyan yapısal beklenti ile yalnız sık görülen bir kalıbı birbirine karıştırma.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#efeaf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Hibrit eser ve alt tür</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Etiketi değil, anlatıdaki görevi takip et.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {hybridChecks.map((item) => (
              <div className="rounded-[1.6rem] bg-white p-6 shadow-sm" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Konvansiyon, klişe ve bilinçli ihlal</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Tür bilgisi eseri standartlaştırmak için değil, tercihin işlevini anlamak için kullanılır.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {conventionChecks.map((item) => (
              <div className="rounded-[1.6rem] bg-[#f8f6f0] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#211746] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Editöryal sınır</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Tür bilgisi hüküm vermek değil, daha doğru soru sormaktır.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#ddd7ef]">
            Editör “bu eser satmaz”, “yayınevi bunu kabul etmez” ya da “bu tür yalnız böyle yazılır” gibi doğrulanamaz hükümler kurmaz. Tür bilgisi; okur vaadini, metnin kendi tercihlerini ve olası beklenti kırılmalarını gerekçeli biçimde tartışmak için kullanılır.
          </p>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#17122f] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Kendin dene</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bir metin için tür odaklı editör haritası çıkar.</h2>
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
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Tür bilgisini editör notunun gerekçesine dönüştür.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#665f70]">
            İlkOku’da bir eseri değerlendirirken tür etiketini otomatik bir kontrol listesi gibi kullanma. Önce eserin gerçek okur vaadini ve alt türünü tanımla; sonra tespitini metindeki örnek, okur üzerindeki etki ve eserin kendi hedefiyle ilişkilendir.
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
