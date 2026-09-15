import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Yazarla Çalışmak | İlkOku Editörlük Okulu",
  description:
    "Editör-yazar ilişkisinde hedef, kapsam, revizyon döngüsü, fikir ayrılığı, profesyonel iletişim, müdahale sınırı ve yazarın yaratıcı karar alanını korumayı öğren.",
  alternates: { canonical: "/editorler-icin/egitim/yazarla-calismak" },
  robots: { index: true, follow: true },
};

const outcomes = [
  {
    title: "Ortak hedef kur",
    text: "Editörlük ilişkisinin amacı editörün metni kendi zevkine yaklaştırması değil, yazarın eser için belirlediği hedefi daha güçlü gerçekleştirmesine yardım etmektir. Önce bu hedefi ortaklaştır.",
  },
  {
    title: "Kapsamı görünür tut",
    text: "Hangi sürüm üzerinde çalışıldığını, hangi editöryal düzeyin ele alındığını ve hangi konuların bu görevin dışında kaldığını açık tut. Belirsiz kapsam gereksiz çatışma üretir.",
  },
  {
    title: "Fikir ayrılığını yönet",
    text: "Yazar öneriyi reddettiğinde savunmaya geçme. Ortak hedefe, metindeki kanıta ve okur etkisine dön; gerekirse birden fazla çözüm yolu göster.",
  },
  {
    title: "Yazar özerkliğini koru",
    text: "Editör profesyonel görüşünü açık ve gerekçeli biçimde sunar; son yaratıcı kararın yazara ait olduğunu unutmaz. İkna ile baskıyı birbirinden ayır.",
  },
] as const;

const workingAgreement = [
  {
    title: "Eser hedefi",
    text: "Yazar bu eserle ne yapmak istiyor? Hedef okur, tür, ton, anlatı yaklaşımı ve temel niyet bilinmeden yapılan doğru bir tespit bile yanlış yöne hizmet edebilir.",
  },
  {
    title: "Çalışma kapsamı",
    text: "Yapısal editörlük mü, dil ve anlatım mı, değerlendirme raporu mu? Editörün hangi düzeyde müdahale edeceğini baştan netleştirmek beklenti çatışmasını azaltır.",
  },
  {
    title: "Sürüm ve karar kaydı",
    text: "Hangi dosya veya sürüm değerlendiriliyor? Büyük revizyonlardan sonra eski notların hâlâ geçerli olduğu varsayılmamalıdır. Kararlar mümkün olduğunca izlenebilir tutulmalıdır.",
  },
  {
    title: "İletişim çerçevesi",
    text: "Soruların, ek açıklamaların ve revizyon yanıtlarının hangi kanaldan ve hangi bağlamla yürütüleceğini belirle. Profesyonel ilişki sürekli erişilebilir olmak anlamına gelmez.",
  },
] as const;

const revisionCycle = [
  {
    title: "Geri bildirimi teslim et",
    text: "Ana öncelikleri görünür sırayla sun. Yüzlerce küçük notun içinde büyük revizyon kararlarını kaybetme; yazar önce hangi problemi çözmesi gerektiğini anlayabilsin.",
  },
  {
    title: "Soruyu aç",
    text: "Yazarın anlamadığı veya katılmadığı noktayı açıklamasına alan bırak. Savunmayı hemen yanlış direnç olarak yorumlama; bazen editör eserin amacını eksik okumuş olabilir.",
  },
  {
    title: "Revizyonu değerlendir",
    text: "Yazar önerinin aynısını uygulamak zorunda değildir. Yeni çözümün ilk editöryal problemi giderip gidermediğini kontrol et; yönteme değil işleve bak.",
  },
  {
    title: "Döngüyü kapat",
    text: "Çözülen, açık kalan ve yazarın bilinçli biçimde koruduğu kararları birbirinden ayır. Aynı tartışmayı her turda sıfırdan başlatmak yerine revizyon geçmişini takip et.",
  },
] as const;

const disagreementMethod = [
  {
    title: "Hedef ile çözümü ayır",
    text: "Editörün önerdiği çözüm reddedilebilir; fakat alttaki sorun hâlâ gerçek olabilir. ‘Bu sahneyi sil’ yerine önce sahnenin hangi işlevi üretmediğini netleştir.",
  },
  {
    title: "Metne geri dön",
    text: "‘Ben böyle düşünüyorum’ ile ‘sen yanlış anlıyorsun’ arasında sıkışma. Metindeki bilgi, ritim, karakter davranışı, bakış açısı veya tür vaadi üzerinden konuş.",
  },
  {
    title: "Seçenek üret",
    text: "Tek çözümün kabul edilmesini istemek yerine aynı editöryal amacı gerçekleştirebilecek farklı yollar göster. Bu, yazarın yaratıcı alanını korurken problemi görünür tutar.",
  },
  {
    title: "Açık anlaşmazlığı kaydet",
    text: "Her fikir ayrılığı uzlaşmayla bitmek zorunda değildir. Editör gerekçeli görüşünü bırakabilir; yazar bilinçli olarak farklı karar verebilir. Profesyonellik, son sözü zorla almak değildir.",
  },
] as const;

const communicationExamples = [
  {
    title: "Savunmayı kişiselleştirme",
    bad: "Bu öneriyi kabul etmiyorsan editöre neden geldin?",
    better: "Bu noktada aynı çözümde buluşmuyoruz. Benim kaygım, karakterin kararının mevcut hazırlıkla ani görünmesi. Bu etkiyi başka bir yolla azaltmak ister misin?",
  },
  {
    title: "Niyet okuma",
    bad: "Sen zaten karakterini değiştirmek istemiyorsun.",
    better: "Karakterin bu özelliğini korumak istediğini anlıyorum. O halde öneriyi karakteri değiştirmek yerine okurun bu kararı daha erken anlayabilmesini sağlayacak hazırlık üzerinden düşünebiliriz.",
  },
  {
    title: "Otorite kurma",
    bad: "Ben editörüm; bunun böyle olması gerekiyor.",
    better: "Bu öneriyi tür vaadi ve bilgi sıralaması açısından yapıyorum. Mevcut halde çözümü belirleyen veri finalde ilk kez geliyor; bu yüzden okur geriye dönük olarak süreci sınayamıyor.",
  },
  {
    title: "Belirsiz yumuşatma",
    bad: "Belki buraya biraz bakılabilir gibi.",
    better: "Bu sahnede hedef ve sonuç birbirine bağlanmadığı için bölümün ana çatışması ilerlemiyor. Sahnenin sonunda bir karar, kayıp veya yeni bilgi üretmek işlevini netleştirebilir.",
  },
] as const;

const boundaries = [
  {
    title: "Editör ortak yazar değildir",
    text: "Editör örnek verebilir ve çözüm yönü gösterebilir; fakat yazarın yerine sürekli sahne, paragraf veya karakter üretmeye başladığında editörlük sınırı bulanıklaşır.",
  },
  {
    title: "Sürekli erişilebilirlik zorunlu değildir",
    text: "Profesyonel ilişki net iletişim ister; sınırsız mesajlaşma veya görev kapsamı dışındaki her soruya anında cevap verme yükümlülüğü yaratmaz. Çalışma sınırını koru.",
  },
  {
    title: "Kişisel ilişki raporu yönetmesin",
    text: "Yakınlık, hayranlık, kızgınlık veya çatışma editöryal ölçütün yerine geçmemeli. Yazarla ilişki değişse bile rapor metinden kanıtlanabilir kalmalıdır.",
  },
  {
    title: "Gizlilik sürer",
    text: "Revizyon sırasında paylaşılan taslaklar, kişisel açıklamalar ve çalışma notları görev amacı dışında kullanılmamalıdır. Güven, editör-yazar ilişkisinin teknik olmayan ama temel parçasıdır.",
  },
] as const;

const workedExample = {
  context:
    "Editör, romanın ortasındaki bir sahnenin karakter dönüşümünü zayıflattığını düşünüyor ve sahnenin kaldırılmasını öneriyor. Yazar ise sahneyi eserin duygusal merkezi olarak görüyor ve silmek istemiyor.",
  weak:
    "Sahne gereksiz. Çıkarmak istemiyorsan benim yapabileceğim bir şey yok.",
  strong:
    "Bu sahneyi korumak istemenin eserin duygusal amacı açısından önemli olduğunu anlıyorum. Benim asıl kaygım sahnenin varlığı değil; sahne sonunda karakterin kararında veya ilişkide görünür bir değişim oluşmadığı için ana dönüşüm çizgisinin burada durması. Sahneyi silmek tek seçenek değil. Mevcut duygusal içeriği koruyup finaline karakterin sonraki kararını hazırlayan bir sonuç eklemek ya da sahnenin konumunu değiştirmek aynı problemi çözebilir. Bunlardan hiçbiri eserin amacına uymuyorsa, sahneyi koruma kararını bilinçli bir tercih olarak bırakabiliriz.",
} as const;

const practice = [
  "Kullanma iznin olan bir metin için yazarın eser hedefini beş cümleyle tarif et. Editöryal önerilerini bu hedefle çelişip çelişmediği açısından kontrol et.",
  "Bir editör notunu seç ve önerdiğin çözüm ile çözmeye çalıştığın asıl problemi iki ayrı cümle halinde yaz.",
  "Yazarın önerini reddettiğini varsay. Aynı editöryal problemi çözebilecek iki alternatif yöntem üret.",
  "Bir anlaşmazlık metni yaz: önce ortak hedefi, sonra metindeki kanıtı, sonra okur etkisini ve en son seçenekleri belirt.",
  "Notlarını ‘zorunlu teknik düzeltme’, ‘güçlü editöryal öneri’ ve ‘tercih / tartışmaya açık alan’ olarak sınıflandır; her kategori için gerekçeni yaz.",
  "Son turda hangi konuların çözüldüğünü, hangilerinin açık kaldığını ve hangilerinin yazarın bilinçli kararı olarak korunduğunu kısa bir revizyon özetiyle kaydet.",
] as const;

export default function YazarlaCalismakPage() {
  const category = getEditorEducationCategory("yazarla-calismak");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Yazarla Çalışmak</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Editör haklı çıkmaya değil, revizyon sürecini ilerletmeye çalışır.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            Profesyonel editörlük yalnız metin üzerinde yapılan bir iş değildir; aynı zamanda iki ayrı yaratıcı ve profesyonel rolün birlikte çalışabilmesini gerektirir. Güçlü editör, görüşünü saklamaz ama görüşünü otoriteye de dönüştürmez; hedefi, kanıtı, sınırı ve yazarın karar alanını aynı anda korur.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-[#d8d2e8]">
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Ortak hedef</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Revizyon döngüsü</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Fikir ayrılığı</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Profesyonel sınır</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Yazar özerkliği</span>
          </div>
        </header>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Metinle birlikte çalışma ilişkisini de profesyonelce yönet.</h2>
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
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Çalışma çerçevesi</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">İyi ilişkiyi iyi niyete bırakma; beklentiyi görünür hale getir.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {workingAgreement.map((item) => (
              <article className="rounded-[1.6rem] bg-white/75 p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Revizyon döngüsü</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Geri bildirim teslimi işin sonu değil, yeni okuma turunun başlangıcıdır.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {revisionCycle.map((item) => (
              <article className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[2.25rem] bg-[#17122f] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Fikir ayrılığı</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Öneri reddedildiğinde problemi kaybetme.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d8d2e8]">
            Yazarın bir editör önerisini kabul etmemesi editörlüğün başarısız olduğu anlamına gelmez. Asıl soru, alttaki editöryal problemin ortak biçimde anlaşılmış olup olmadığıdır.
          </p>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {disagreementMethod.map((item) => (
              <article className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8d2e8]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#fff8e8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a5c14]">İletişim dili</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Net ol; küçümsemeden, kaçamaklaşmadan ve otorite kurmadan.</h2>
          <div className="mt-7 space-y-4">
            {communicationExamples.map((item) => (
              <article className="rounded-[1.6rem] border border-[#7a581d]/10 bg-white/70 p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#a15555]">Zayıf yaklaşım</span>
                    <p className="mt-2 text-sm leading-7 text-[#665f70]">“{item.bad}”</p>
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#5f4ca5]">Profesyonel yaklaşım</span>
                    <p className="mt-2 text-sm leading-7 text-[#665f70]">“{item.better}”</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Örnek vaka</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Aynı sahneyi korumak isteyen yazarla nasıl çalışırsın?</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#665f70]">{workedExample.context}</p>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <article className="rounded-[1.6rem] border border-[#8f4b4b]/15 bg-[#fff5f3] p-6">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#a15555]">Zayıf editör tepkisi</span>
              <p className="mt-4 text-sm leading-7 text-[#665f70]">“{workedExample.weak}”</p>
            </article>
            <article className="rounded-[1.6rem] border border-[#5f4ca5]/15 bg-[#f5f2ff] p-6">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#5f4ca5]">Gerekçeli çalışma dili</span>
              <p className="mt-4 text-sm leading-7 text-[#665f70]">“{workedExample.strong}”</p>
            </article>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#efeaf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Profesyonel sınır</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Yakın çalışmak, rollerin birbirine karışması demek değildir.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {boundaries.map((item) => (
              <article className="rounded-[1.6rem] bg-white/75 p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Kendin dene</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bir anlaşmazlığı editöryal çalışmaya dönüştür.</h2>
          <ol className="mt-7 space-y-3">
            {practice.map((item, index) => (
              <li className="flex gap-4 rounded-[1.35rem] bg-[#fffdf8] p-5 text-sm leading-7 text-[#665f70]" key={item}>
                <span className="font-serif text-2xl font-semibold text-[#6b52c7]">{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#17122f] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">İlkOku’da uygula</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Profesyonel görüşünü kayıtlı editörlük sürecinde uygula.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d8d2e8]">
            İlkOku editör çalışma alanında görev kapsamını ve değerlendirdiğin sürümü sabit tut; raporunu metinden kanıtla gerekçelendir ve yazarın yaratıcı karar alanına saygı göster. Fikir ayrılığı olduğunda görüşünün sınırını açık tut.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#211746]" href="/editor/talepler">Editör görevlerine git →</Link>
            <Link className="rounded-full border border-white/15 px-5 py-3 text-sm font-extrabold text-white" href="/editoryal-standartlar">Editoryal Standartlar</Link>
          </div>
        </section>
      </article>
    </EditorEducationShell>
  );
}
