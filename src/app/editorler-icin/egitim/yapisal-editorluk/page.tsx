import type { Metadata } from "next";
import Link from "next/link";

import { EditorEducationShell } from "@/components/content/EditorEducationShell";
import { getEditorEducationCategory } from "@/lib/editor-education";

export const metadata: Metadata = {
  title: "Yapısal Editörlük | İlkOku Editörlük Okulu",
  description:
    "Bir eserin ana omurgasını; olay örgüsü, sahne ve bölüm işlevi, karakter dönüşümü, tempo, bakış açısı ve bilgi akışı üzerinden değerlendirmeyi ve yeniden yapılandırmayı öğren.",
  alternates: { canonical: "/editorler-icin/egitim/yapisal-editorluk" },
  robots: { index: true, follow: true },
};

const outcomes = [
  {
    title: "Büyük resmi koru",
    text: "Cümlelere ve yerel ayrıntılara inmeden önce eserin ne anlattığını, hangi değişimi kurduğunu ve okuru hangi yolculuğa çıkardığını görünür hale getir.",
  },
  {
    title: "Sahne işlevini sorgula",
    text: "Her sahne ve bölümün olay, karakter, bilgi, gerilim veya tema açısından ne işe yaradığını belirle; işlevsiz tekrarları ayırt et.",
  },
  {
    title: "Neden-sonuç zinciri kur",
    text: "Olayların yalnız art arda gelmesini değil, birbirini doğurmasını ara. Kararların sonuç üretip üretmediğini ve yeni kararları tetikleyip tetiklemediğini kontrol et.",
  },
  {
    title: "Revizyon sırası belirle",
    text: "Önce omurgayı, sonra bölüm ve sahne düzeyini, en son yerel ayrıntıları ele alarak yazarın emeğini boşa çıkaracak ters revizyon sırasından kaçın.",
  },
] as const;

const structuralLayers = [
  {
    title: "Eserin çekirdeği",
    text: "Ana çatışma, temel soru, karakterin istediği şey ve eserin okura verdiği temel vaat birbiriyle uyumlu mu?",
  },
  {
    title: "Başlangıç",
    text: "Okur kiminle, hangi durumda ve hangi değişim baskısıyla karşı karşıya olduğunu yeterince erken anlayabiliyor mu?",
  },
  {
    title: "Gelişme",
    text: "Engeller büyüyor, kararlar zorlaşıyor ve karakterin seçenekleri daralıyor mu; yoksa orta bölüm aynı gerilimi tekrar mı ediyor?",
  },
  {
    title: "Dönüm noktaları",
    text: "Önemli kırılmalar gerçekten hikâyenin yönünü değiştiriyor mu, yoksa yalnız yeni bilgi ekleyip eski düzeni sürdürüyor mu?",
  },
  {
    title: "Doruk ve sonuç",
    text: "Finaldeki karar, çatışma veya yüzleşme eserin başından beri kurulan soruların sonucu gibi mi hissediliyor?",
  },
  {
    title: "Tema ve anlam",
    text: "Eserin söylediği şey, karakter seçimleri ve olayların sonuçları içinden mi doğuyor; yoksa sonradan açıklanan bir mesaj olarak mı kalıyor?",
  },
] as const;

const sceneQuestions = [
  {
    title: "Bu sahne ne değiştiriyor?",
    text: "Sahne bittiğinde karakterin bilgisi, amacı, ilişkisi, riski veya seçenekleri başlangıca göre farklı mı?",
  },
  {
    title: "Çatışma nerede?",
    text: "Karakterin istediği şeyin önünde gerçek bir direnç var mı; yoksa sahne yalnız bilgi aktarımıyla mı ilerliyor?",
  },
  {
    title: "Giriş ve çıkış doğru yerde mi?",
    text: "Sahne gereğinden erken başlayıp geç mi bitiyor? Okur için gerekli olmayan hazırlık ve kapanışlar tempoyu düşürüyor mu?",
  },
  {
    title: "Sonraki sahneyi doğuruyor mu?",
    text: "Bu sahnenin sonucu bir sonraki karar veya probleme bağlanıyor mu, yoksa bölümler birbirinden bağımsız adacıklar gibi mi duruyor?",
  },
] as const;

const architectureChecks = [
  {
    title: "Karakter yayı",
    text: "Başlangıçtaki ihtiyaç, yanlış inanç veya eksiklik; olaylar boyunca sınanıyor ve finalde anlamlı bir dönüşüme bağlanıyor mu?",
  },
  {
    title: "Tempo",
    text: "Önemli olaylara yeterli alan ayrılırken tekrar eden veya sonuç üretmeyen bölümler gereğinden fazla yer kaplıyor mu?",
  },
  {
    title: "Bakış açısı",
    text: "Hikâyenin bilgi düzeni seçilen bakış açısıyla tutarlı mı; okurun bilmesi gerekenler doğru zamanda ve doğru karakter üzerinden geliyor mu?",
  },
  {
    title: "Bilgi akışı",
    text: "Açıklamalar, geçmiş bilgiler ve dünya kuralları sahnenin ihtiyacına göre mi dağıtılmış; yoksa anlatıyı durduran bilgi blokları mı oluşmuş?",
  },
] as const;

const revisionOrder = [
  {
    title: "Omurgayı düzelt",
    text: "Ana çatışma, karakter amacı, önemli dönüm noktaları ve final arasındaki ilişkiyi sağlamlaştır.",
  },
  {
    title: "Bölüm sırasını düzelt",
    text: "Eksik, erken, geç veya tekrar eden bölümleri taşı, birleştir, ayır ya da gerektiğinde çıkar.",
  },
  {
    title: "Sahne işlevini düzelt",
    text: "Her sahnenin amaç, çatışma ve sonuç üretmesini sağla; aynı işi yapan sahneleri azalt.",
  },
  {
    title: "Yerel düzenlemeyi sona bırak",
    text: "Yapı sabitlenmeden cümle cilasına, kelime seçimine ve mikro düzeltmeye büyük zaman harcama.",
  },
] as const;

const practice = [
  "Kullanma iznin olan kısa bir öykü, bölüm veya kendi metnin için tek cümlelik ana çatışma ve ana karakter amacı yaz.",
  "Metindeki sahneleri ayrı satırlara çıkar ve her biri için yalnız üç şey yaz: amaç, çatışma, sonuç.",
  "Sonuç üretmeyen, aynı bilgiyi tekrarlayan veya sonraki sahneyi doğurmayan yerleri işaretle.",
  "Karakterin en önemli üç kararını bul ve bu kararların hangi sonuçları doğurduğunu zincir halinde göster.",
  "Bir sahneyi çıkarırsan hikâyede ne değişeceğini test et. Hiçbir şey değişmiyorsa o sahnenin işlevini yeniden düşün.",
  "Son olarak yalnız üç yapısal revizyon önerisi yaz ve bunları etki sırasına göre düzenle.",
] as const;

export default function YapisalEditorlukPage() {
  const category = getEditorEducationCategory("yapisal-editorluk");
  if (!category) return null;

  return (
    <EditorEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl text-[#211746]">
        <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Editörlük Okulu</span>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">Yapısal Editörlük</h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">
            Cümleleri düzeltmeden önce eserin omurgasının gerçekten çalışıp çalışmadığını görmeyi öğren.
          </p>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
            Yapısal editörlük, metnin en büyük kararlarıyla ilgilenir: hikâye nerede başlıyor, olaylar neden birbirini doğuruyor, karakter neden değişiyor, hangi sahneler gerçekten gerekli ve final önceki bütün seçimlerin sonucu gibi hissediliyor mu?
          </p>
        </header>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Metni satır satır değil, sistem olarak okumayı öğren.</h2>
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
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Omurga haritası</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Önce eserin büyük hareketini görünür hale getir.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {structuralLayers.map((item) => (
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm" key={item.title}>
                <h3 className="font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Sahne işlevi</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Her sahne hikâyede bir şeyi değiştirmeli.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {sceneQuestions.map((item) => (
              <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[2.25rem] bg-[#211746] px-7 py-9 text-white sm:px-10 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Örnek vaka</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">“Orta bölüm sıkıcı” demek yapısal teşhis değildir.</h2>
            <p className="mt-5 leading-8 text-[#ddd7ef]">
              Daha güçlü teşhis şöyle kurulabilir: Kahraman üçüncü bölümde önemli bir karar veriyor; fakat sonraki dört bölümde bu karar hiçbir yeni risk veya sonuç üretmiyor. Aynı hedef tekrar ediliyor, karşı güç büyümüyor ve karakterin seçenekleri daralmıyor.
            </p>
            <p className="mt-4 leading-8 text-[#ddd7ef]">
              Böylece sorun “sıkıcılık” olmaktan çıkar ve <strong className="text-white">karar → sonuç → yeni baskı</strong> zincirindeki kopukluk olarak tanımlanır.
            </p>
          </div>
          <div className="rounded-[2.25rem] bg-[#fff3d8] px-7 py-9 sm:px-9 sm:py-11">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a5c00]">Kontrol sorusu</span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em]">Bu bölüm olmasa hikâye değişir mi?</h2>
            <p className="mt-5 leading-8 text-[#66552f]">
              Bir bölüm çıkarıldığında olay örgüsü, karakter ilişkisi, risk, bilgi veya tema açısından hiçbir şey değişmiyorsa o bölümün işlevi zayıf olabilir. Çözüm her zaman silmek değildir; bazen eksik işlevi güçlendirmek gerekir.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Anlatı mimarisi</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Yapı yalnız olay örgüsünden ibaret değildir.</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {architectureChecks.map((item) => (
              <div className="rounded-[1.6rem] bg-[#f8f6f0] p-6" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#efeaf8] px-7 py-9 sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Revizyon sırası</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Büyük kararlar çözülmeden küçük kararları cilalama.</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {revisionOrder.map((item) => (
              <div className="rounded-[1.6rem] bg-white p-6 shadow-sm" key={item.title}>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2.25rem] bg-[#17122f] px-7 py-9 text-white sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Kendin dene</span>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bir metnin yapısal haritasını çıkar.</h2>
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
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Yapısal teşhisi profesyonel editör notuna dönüştür.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#665f70]">
            İlkOku editör alanında bir eseri değerlendirirken önce büyük yapısal sorunları görünür kıl. Tespitini metinden kanıtla, okur üzerindeki etkisini açıkla ve yazara tek bir zorunlu çözüm dayatmak yerine uygulanabilir seçenekler sun.
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
