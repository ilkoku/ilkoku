import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Yayıncılık ve Profesyonel Editörlük | İlkOku Editörlük Okulu",
  description:
    "Dosya değerlendirmeden yayıma hazırlığa uzanan editöryal zinciri; rol ayrımı, profesyonel teslim standardı, sürüm ve onay disiplini ile yayın kararı sınırlarını öğren.",
  alternates: { canonical: "/editorler-icin/egitim/yayincilik-ve-profesyonel-editorluk" },
  robots: { index: true, follow: true },
};

const outcomes = [
  {
    title: "Yayın zincirini oku",
    text: "Bir dosyanın ilk değerlendirmeden yayıma hazırlığa kadar farklı amaçlarla tekrar tekrar ele alınabileceğini gör. Her aşamanın sorusu, müdahale düzeyi ve teslim çıktısı aynı değildir.",
  },
  {
    title: "Rol ve yetkiyi ayır",
    text: "Yazar, editör, yayın yönetimi, düzeltmen, tasarım ve üretim rollerinin aynı kararları vermediğini öğren. Kuruma göre unvanlar değişse bile hangi kararın kime ait olduğunu açık tut.",
  },
  {
    title: "Teslimi profesyonelleştir",
    text: "Yalnız metni değil; sürümü, kapsamı, tamamlanan işleri, açık kalan sorunları ve sonraki kişinin bilmesi gereken kararları birlikte devret.",
  },
  {
    title: "Yetki sınırını koru",
    text: "Editöryal değerlendirmeyi yayınevi kabulü, hukuki hüküm veya ticari başarı garantisi gibi sunma. Profesyonel editör kendi görüşünün hangi karara hizmet ettiğini ve nerede bittiğini bilir.",
  },
] as const;

const publishingChain = [
  {
    title: "Dosya değerlendirme",
    text: "Amaç, dosyanın mevcut durumunu ve editöryal ihtiyaçlarını anlamaktır. Tür, hedef okur, temel vaat, güçlü alanlar, temel riskler ve gereken çalışma düzeyi burada görünür hale gelir.",
  },
  {
    title: "Editöryal geliştirme",
    text: "Yapı, karakter, argüman, bölüm düzeni, anlatı mantığı, tempo veya bilgi mimarisi gibi büyük kararlar ele alınır. Bu aşama metnin taşıyıcı sistemini güçlendirir.",
  },
  {
    title: "Dil ve satır düzeyi çalışma",
    text: "Büyük yapı kararları yeterince sabitlendiğinde cümle yapısı, akıcılık, tekrar, ton, kelime seçimi ve paragraf ritmi gibi daha ince düzeyler üzerinde çalışılır.",
  },
  {
    title: "Son editöryal kontrol ve devir",
    text: "Editöryal kapsam tamamlandığında dosya, kalan açık maddeler ve son sürüm bilgisiyle bir sonraki role devredilir. Prova, düzeltme, tasarım veya üretim süreçlerinin ayrıntısı kuruma göre değişebilir.",
  },
] as const;

const roles = [
  {
    title: "Yazar",
    text: "Eserin yaratıcı sahibi ve temel niyetinin kaynağıdır. Editöryal önerileri değerlendirir; yaratıcı tercihlerin nihai sorumluluğunu kendi çalışma ve sözleşme çerçevesi içinde taşır.",
  },
  {
    title: "Editör",
    text: "Metni hedef, bağlam ve kapsam içinde değerlendirir; sorunları gerekçelendirir, revizyon seçenekleri üretir ve çalışmanın editöryal bütünlüğünü takip eder. Her kurumsal yayın kararının tek sahibi değildir.",
  },
  {
    title: "Yayın yönetimi / yayınevi",
    text: "Yayın listesi, edinim, bütçe, takvim, üretim, konumlandırma veya ticari kararlar gibi editoryal görüşün ötesine geçen sorumluluklar taşıyabilir. Yetki dağılımı kuruma göre değişir.",
  },
  {
    title: "Düzeltme, tasarım ve üretim rolleri",
    text: "Yazım-noktalama kontrolü, prova, sayfa tasarımı, teknik üretim ve baskı/dijital hazırlık farklı uzmanlıklara ayrılabilir. Editör bu rolleri birbirine karıştırmadan doğru devri kolaylaştırır.",
  },
] as const;

const deliveryStandard = [
  {
    title: "Kaynak sürüm",
    text: "Teslim edilen dosyanın hangi sürüm olduğunu açıkça belirt. ‘Son.docx’ gibi belirsiz adlar yerine tarih, sürüm veya görev bağlamı içeren izlenebilir bir adlandırma kullan.",
  },
  {
    title: "Kapsam ve tamamlanan iş",
    text: "Bu turda ne değerlendirildi? Yapı mı, dil mi, yalnız belirli bölümler mi? Hangi kontrollerin yapıldığını ve hangilerinin kapsam dışı kaldığını kısa bir teslim notunda belirt.",
  },
  {
    title: "Açık maddeler",
    text: "Çözülmemiş kaynak, tutarlılık, veri, hak, görsel, dipnot, çapraz referans veya içerik sorunlarını sessizce bırakma. Bir sonraki rolün bilmesi gereken riskleri görünür kıl.",
  },
  {
    title: "Karar ve devir notu",
    text: "Yazarın bilinçli olarak koruduğu tercihleri, onaylanmış önemli revizyonları ve sonraki aşamada kontrol edilmesi gereken noktaları kısa ve okunabilir biçimde kaydet.",
  },
] as const;

const discipline = [
  {
    title: "Takvim",
    text: "Teslim tarihi yalnız son gün değildir; başka rollerin başlayabilmesi için bağımlılık yaratır. Gecikme veya kapsam değişikliği oluştuğunda bunu son anda değil, etkisi görünür hale gelir gelmez bildir.",
  },
  {
    title: "Sürüm",
    text: "Büyük revizyon sonrası eski notların otomatik olarak geçerli olduğunu varsayma. Hangi yorumun hangi sürüme ait olduğunu koru ve sessiz dosya üzerine yazma alışkanlığından kaçın.",
  },
  {
    title: "Onay",
    text: "Önemli editöryal kararların hangi durumda açık, hangi durumda kabul edilmiş ve hangi durumda yalnız öneri olduğunu ayır. ‘Konuşulmuştu’ ile ‘onaylandı’ aynı şey değildir.",
  },
  {
    title: "Kapsam değişikliği",
    text: "Görev sırasında yeni bir ihtiyaç ortaya çıkabilir. Yeni çalışma mevcut kapsamı belirgin biçimde büyütüyorsa bunu görünmez ek iş haline getirmek yerine yeniden tanımla.",
  },
] as const;

const decisionBoundary = [
  {
    title: "Editöryal öneri",
    text: "Metnin yapısı, açıklığı, tutarlılığı, tür vaadi veya okur deneyimi hakkında gerekçeli profesyonel görüştür. Güçlü olabilir; yine de otomatik olarak kurumun yayın kararı değildir.",
  },
  {
    title: "Yayın kararı",
    text: "Bir dosyanın edinilmesi, yayın listesine alınması, takvime girmesi veya ticari olarak nasıl konumlanacağı daha geniş değerlendirmelere bağlı olabilir. Editör kendi yetkisi dışında kabul garantisi vermez.",
  },
  {
    title: "Hukuki değerlendirme",
    text: "Telif, kişilik hakkı, izin, alıntı veya benzeri bir risk fark edildiğinde konu işaretlenebilir; fakat editör yetkili hukukçu değilse hukuki hüküm vermiş gibi davranmamalıdır.",
  },
] as const;

const qualityGate = [
  "Başlık, bölüm ve alt bölüm hiyerarşisinin teslim edilen sürümde tutarlı olup olmadığını kontrol et.",
  "İç referans, dipnot, kaynak, görsel atfı veya eklerin kapsam dahilindeyse eksik ve kırık bağlantıları işaretle.",
  "Metinde teyit gerektiren olgusal iddia, isim, tarih veya sayı görürsen kapsamına uygun biçimde doğrulama ihtiyacını belirt; doğrulanmamış bilgiyi sessizce kesinleştirme.",
  "Yazarın bilinçli tercihi ile henüz çözülmemiş editöryal riskleri birbirinden ayır.",
  "Teslimden önce yorum, geçici not, takip etiketi veya başka kişiye ait çalışma izlerinin yanlışlıkla nihai dosyada kalıp kalmadığını kontrol et.",
] as const;

const workedExample = {
  context:
    "Bir roman büyük revizyonunu tamamlamış ve ekip içinde ‘baskıya hazır’ diye anılmaya başlanmış. Ancak üç farklı dosya ‘son’ adıyla dolaşıyor; bir karakterin yaşı iki bölümde çelişiyor, gerçek bir kurumla ilgili doğrulanmamış bir iddia notlarda açık duruyor ve editör yorumlarından bazıları metinde kalmış.",
  weak:
    "Metin hazır. En son dosyayı matbaaya gönderebilirsiniz.",
  strong:
    "Editöryal tur tamamlandı; devir için esas dosya `roman_2026-09-15_v7` sürümüdür. Yapısal ve dil revizyonları bu sürümde kapatıldı. Ancak baskı/üretim öncesi üç açık madde var: 12. ve 19. bölümlerde karakter yaşı tutarsız; 23. bölümde gerçek kurumla ilgili iddia için kaynak/uygunluk kontrolü gerekiyor; ayrıca son dosyada kalan iki editör yorumunun temizlenmesi gerekli. Bu maddeler kapanmadan dosyayı nihai üretim sürümü olarak etiketlememeyi öneriyorum.",
} as const;

const boundaries = [
  {
    title: "Gizlilik",
    text: "Yayınlanmamış dosya, yazar bilgisi, iç değerlendirme, yayın planı ve görev sırasında öğrenilen materyali yalnız yetkili çalışma amacıyla kullan.",
  },
  {
    title: "Çıkar çatışması",
    text: "Yazar, rakip proje, yayınevi veya değerlendirme sonucuyla ilişkin bağımsızlığını etkileyebilecek bir bağ varsa bunu gizleme; gerekli durumda görevi devret.",
  },
  {
    title: "Kapsam taşması",
    text: "Editörün görevi büyüdükçe sorumluluk da büyür. Yeni bir uzmanlık veya karar alanı gerekiyorsa bunu sessizce üstlenmek yerine doğru role yönlendir.",
  },
  {
    title: "Garanti dili",
    text: "‘Bu kitap kesin yayımlanır’, ‘satış garantisi var’ veya ‘hukuken sorun yok’ gibi yetki ve kanıt sınırını aşan ifadeler kullanma. Profesyonellik, belirsizliği saklamak değil doğru kişiye taşımaktır.",
  },
] as const;

const practice = [
  "Kullanma iznin olan bir dosya için tek sayfalık profesyonel teslim kontrol listesi hazırla: sürüm, kapsam, tamamlanan işler, açık maddeler ve sonraki sorumlu.",
  "Aynı metnin üç hayali sürümüne izlenebilir dosya adları ver ve hangi sürümün neden esas olduğunu kısa bir kayıtla açıkla.",
  "Beş karar yaz ve her birini ‘yazar’, ‘editör’, ‘yayın yönetimi’ veya ‘başka uzmanlık’ başlığı altında sınıflandır. Kuruma göre değişebilecek alanları ayrıca işaretle.",
  "Bir editöryal öneri ile bir yayın kararını yan yana yaz. İkisinin kanıtı, yetkisi ve sonucu arasındaki farkı tek paragrafta açıkla.",
  "Bir dosyada çözülmemiş iki risk olduğunu varsay ve bir sonraki role gönderilecek kısa devir notunu yaz. Sorunu saklamadan, paniğe de dönüştürmeden ifade et.",
  "Son olarak kendi teslimine kalite kapısı uygula: sürüm doğru mu, kapsam açık mı, geçici yorumlar temiz mi, açık maddeler görünür mü, sonraki adım belli mi?",
] as const;

export default function YayincilikVeProfesyonelEditorlukPage() {
  const category = getEditorEducationCategory("yayincilik-ve-profesyonel-editorluk");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Yayıncılık ve Profesyonel Editörlük</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Profesyonel editör yalnız iyi not veren kişi değildir; doğru metni, doğru kapsamla, doğru sürümde ve doğru kişiye devreden kişidir.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            Yayın sürecinde iyi editörlük, metin bilgisini çalışma disipliniyle birleştirir. Bir dosyanın hangi aşamada olduğunu, hangi kararların editöryal olduğunu, hangi konunun başka bir role ait olduğunu ve teslim sırasında hangi bilgilerin kaybolmaması gerektiğini bilmek profesyonelliğin temelidir.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-[#d8d2e8]">
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Yayın zinciri</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Rol ayrımı</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Teslim standardı</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Sürüm disiplini</span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Yetki sınırı</span>
          </div>
        </header>

        <section className="mt-6 rounded-[2.2rem] border border-[#ddd5f2] bg-[#fffdf7] p-7 shadow-sm sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Temel kazanım</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bu eğitim sana ne kazandıracak?</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {outcomes.map((item) => (
              <article className="rounded-3xl border border-[#e4def3] bg-white p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#5b5370]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] bg-[#f0ebfb] p-7 sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Dosyanın yolculuğu</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Yayın süreci</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#5b5370]">Aşamaların adı ve sırası kuruma göre değişebilir. Önemli olan, her turun aynı işi yapmadığını ve metnin olgunlaştıkça editöryal sorunun ölçeğinin değiştiğini bilmektir.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {publishingChain.map((item) => (
              <article className="rounded-3xl bg-white/80 p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#5b5370]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] border border-[#ddd5f2] bg-white p-7 sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Kim neye karar verir?</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Rol ayrımı</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {roles.map((item) => (
              <article className="rounded-3xl border border-[#ece7f6] bg-[#fffdf8] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#5b5370]">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 rounded-3xl bg-[#17122f] p-6 text-white">
            <strong className="text-lg">Unvan değil yetkiyi oku.</strong>
            <p className="mt-2 leading-7 text-[#d8d2e8]">Bazı ekiplerde aynı kişi birkaç rol üstlenebilir, bazı kurumlarda roller ayrıntılı biçimde bölünür. Bu yüzden “editör her şeye karar verir” veya “editör yalnız virgül düzeltir” gibi genellemeler yerine gerçek görev kapsamını tanımla.</p>
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] bg-[#17122f] p-7 text-white sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Bir sonraki kişi ne bilmeli?</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Profesyonel teslim standardı</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {deliveryStandard.map((item) => (
              <article className="rounded-3xl border border-white/10 bg-white/[0.055] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#d8d2e8]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] border border-[#ddd5f2] bg-[#fffdf7] p-7 sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Süreç hafızası</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Takvim, sürüm ve onay disiplini</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {discipline.map((item) => (
              <article className="rounded-3xl border border-[#e4def3] bg-white p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#5b5370]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] bg-[#f0ebfb] p-7 sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Yetkiyi karıştırma</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Editöryal karar ≠ yayın kararı</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {decisionBoundary.map((item) => (
              <article className="rounded-3xl bg-white/85 p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#5b5370]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] border border-[#ddd5f2] bg-white p-7 sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Teslimden önce</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Kalite kapısı</h2>
          <ul className="mt-6 space-y-3">
            {qualityGate.map((item) => (
              <li className="rounded-2xl bg-[#faf8ff] px-5 py-4 leading-7 text-[#5b5370]" key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-[2.2rem] bg-[#17122f] p-7 text-white sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Uygulamalı okuma</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Örnek vaka</h2>
          <p className="mt-5 leading-8 text-[#d8d2e8]">{workedExample.context}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-[#ffb5b5]/20 bg-[#ffb5b5]/[0.07] p-6">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffc7c7]">Zayıf teslim</span>
              <p className="mt-3 leading-7 text-[#f4e8ec]">{workedExample.weak}</p>
            </article>
            <article className="rounded-3xl border border-[#b7a8ff]/25 bg-[#b7a8ff]/[0.08] p-6">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#cbbfff]">Profesyonel teslim</span>
              <p className="mt-3 leading-7 text-[#eeeaf8]">{workedExample.strong}</p>
            </article>
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] border border-[#ddd5f2] bg-[#fffdf7] p-7 sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Mesleki güven</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Profesyonel sınır</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {boundaries.map((item) => (
              <article className="rounded-3xl border border-[#e4def3] bg-white p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#5b5370]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.2rem] bg-[#f0ebfb] p-7 sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7159b8]">Uygulama</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Kendin dene</h2>
          <ol className="mt-6 space-y-3">
            {practice.map((item, index) => (
              <li className="flex gap-4 rounded-2xl bg-white/85 px-5 py-4 leading-7 text-[#5b5370]" key={item}>
                <span className="font-extrabold text-[#7159b8]">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-[2.2rem] bg-[#17122f] p-7 text-white sm:p-9">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Gerçek çalışma alanı</span>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">İlkOku’da uygula</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#d8d2e8]">Bir eğitim sayfasının amacı yalnız bilgi vermek değil; gerçek editörlük görevinde daha güvenilir karar üretmektir. Görev seçerken kapsamı oku, incelemeni kayıtlı sürüm üzerinden yap ve teslimini Editoryal Standartlar ile birlikte değerlendir.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#211746]" href="/editor/talepler">Editör taleplerine git</Link>
            <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-extrabold text-white" href="/editor/incelemeler">İncelemelerimi gör</Link>
            <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-extrabold text-white" href="/editoryal-standartlar">Editoryal Standartlar</Link>
          </div>
        </section>
      </article>
    </EditorEducationShell>
  );
}
