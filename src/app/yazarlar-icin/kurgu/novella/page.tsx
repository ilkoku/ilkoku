import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";

import "./novella-guide.css";

export const dynamic = "force-dynamic";

const defaultAlt = {
  hero: "Novella yazım sürecini anlatan çalışma ortamı",
  ideaFlow: "Tek bir güçlü fikirden novella çekirdeğine giden fikir akışını gösteren diyagram",
  structure: "Novellanın açılış, yükseliş, orta kırılma, sonuç baskısı ve final yapısını gösteren diyagram",
  anatomy: "Ana karakter, destek karakterleri, ana çatışma, yan katman, zaman ve tema bileşenlerini gösteren novella anatomisi",
  pageSetup: "Novella taslağı için sahne, bölüm ve ilerleme düzenini gösteren çalışma görseli",
  project: "Kıyıdaki Ev adlı örnek novella projesinin fikirden finale gelişimini gösteren çalışma panosu",
  finalCta: "Tamamlanmış novella taslağını gözden geçirip paylaşmaya hazırlanan yazarlık ortamı",
} as const;

type NovellaVisuals = { [K in keyof typeof defaultAlt]: string };
type NovellaAlts = { [K in keyof typeof defaultAlt]: string };

function visualBlock(
  id: string,
  imageUrl: string,
  alt: string,
  caption: string,
): CmsPageBlock[] {
  if (!imageUrl) return [];
  return [{ id, type: "image", imageUrl, alt, caption, layout: "wide" }];
}

function splitOrText(
  id: string,
  heading: string,
  body: string,
  imageUrl: string,
  imageAlt: string,
  imageSide: "left" | "right",
): CmsPageBlock {
  if (!imageUrl) return { id, type: "text", heading, body };
  return { id, type: "split", heading, body, imageUrl, imageAlt, imageSide };
}

function buildNovellaBlocks(
  visuals: NovellaVisuals,
  alts: NovellaAlts,
  title: string,
  summary: string,
): CmsPageBlock[] {
  return [
    {
      id: "novella-hero",
      type: "hero",
      eyebrow: "Yazarlar İçin · Kurgu",
      title,
      text: summary,
      imageUrl: visuals.hero,
      imageAlt: alts.hero,
      primaryLabel: "",
      primaryHref: "",
      secondaryLabel: "",
      secondaryHref: "",
    },
    {
      id: "novella-nedir",
      type: "text",
      heading: "Novella nedir?",
      body: "Novella, öykünün uzatılmış hâli ya da romanın kısaltılmış hâli değildir. Kendi ritmi olan **orta uzunlukta bir anlatıdır**. Bir roman kadar çok yan hat açmadan, öyküden daha uzun süre tek bir ana çatışmayı ve karakter dönüşümünü takip eder.\n\n## Temel avantajı\n\nNovella yazara iki şeyi aynı anda verir: **yoğunluk ve gelişim alanı**. Karakteri birkaç sahneden fazla izleyebilir, ilişkileri derinleştirebilir ve bir kırılmanın sonuçlarını gösterebilirsin; fakat her bölümün ana eksene bağlı kalması gerekir.\n\nKendine ilk soracağın soru şudur: **Bu hikâye tek bir ana dönüşümü taşıyacak kadar geniş, ama romana dönüşmeyecek kadar odaklı mı?**",
    },
    {
      id: "novella-fikir-kaynaklari",
      type: "cards",
      heading: "Hangi fikir novella olmaya uygundur?",
      intro: "Novella için iyi fikir, tek sahnede bitmeyecek kadar sonuç üretir; fakat onlarca karakter ve alt olay gerektirmez.",
      items: [
        { title: "Sınırlı süre", text: "Bir hafta, bir yaz, üç gün veya tek bir yolculuk gibi kapalı zaman aralığı hikâyeyi odakta tutar.", label: "", href: "" },
        { title: "Tek ana ilişki", text: "İki kardeş, bir anne-kız, iki eski arkadaş veya bir usta-çırak ilişkisi dönüşümün omurgasını taşıyabilir.", label: "", href: "" },
        { title: "Tek büyük seçim", text: "Karakterin sonucu uzun süre taşıyacağı bir karar, novellaya yeterli dramatik hacim verir.", label: "", href: "" },
        { title: "Kapalı mekân", text: "Ada, otel, kıyı kasabası, tren veya tek bir ev; dış dünyayı daraltıp karakter baskısını büyütebilir.", label: "", href: "" },
        { title: "Saklanan geçmiş", text: "Geçmişteki tek bir olayın bugünde açılması, kısa formdan daha geniş ama kontrollü bir yapı sağlar.", label: "", href: "" },
        { title: "Dönüşümlü görev", text: "Bir evi boşaltmak, bir mirası teslim etmek, birini beklemek veya bir yolculuğu tamamlamak gibi sınırları belli bir görev iyi bir omurgadır.", label: "", href: "" },
      ],
    },
    splitOrText(
      "novella-cekirdek",
      "Fikri novella çekirdeğine dönüştür",
      "**Ham fikir:** Bir kadın yıllardır boş duran aile evini satmak için kıyı kasabasına döner.\n\n**Ana karakter:** Leyla, kırk yaşında, şehirde yaşayan bir mimar.\n\n**Zaman sınırı:** Evi satışa hazırlamak için yedi günü vardır.\n\n**Ana ilişki:** Kasabada kalan çocukluk arkadaşı Cem.\n\n**Gizli baskı:** Leyla, evin satılmasını istemeyen kardeşinin yıllar önce bıraktığı mektupları bulur.\n\n**Ana seçim:** Evi satıp geçmişle bağını kesmek mi, yoksa öğrendikleri yüzünden kararını değiştirmek mi?\n\n**Novella cümlesi:** Babasının ölümünden sonra kıyıdaki aile evini satmak için yedi günlüğüne kasabaya dönen Leyla, kardeşinin sakladığı mektupları buldukça hem evin hem de yıllardır anlattığı aile hikâyesinin sandığı gibi olmadığını keşfeder.\n\nBu çekirdek, tek bir sahneden daha fazlasını ister; ama hâlâ **tek ana eksen** üzerinde ilerler.",
      visuals.ideaFlow,
      alts.ideaFlow,
      "right",
    ),
    {
      id: "novella-surec",
      type: "steps",
      heading: "Novellayı kur — 8 adımda",
      intro: "Amaç hacim eklemek değil; tek ana dönüşümü yeterince derin yaşayacak alan yaratmaktır.",
      items: [
        { title: "Sınırı belirle", text: "Hikâyenin zamanını, mekânını ve ana çatışmasını baştan daralt. Novellanın gücü sınırlarından gelir." },
        { title: "Ana karakterin hedefini netleştir", text: "Leyla evi satmak istiyor. Bu somut hedef, tüm sahnelerin yönünü belirler." },
        { title: "Karşı kuvveti kur", text: "Mektuplar, Cem ve kardeşinin geçmişteki kararı Leyla'nın planını adım adım zorlaştırır." },
        { title: "Sahne zinciri oluştur", text: "Her sahne yeni bilgi, yeni baskı veya yeni karar üretmeli. Aynı duyguyu tekrar eden sahneleri birleştir." },
        { title: "Orta kırılmayı planla", text: "Hikâyenin ortasında karakterin dünyayı yorumlama biçimini değiştiren bir keşif veya geri dönülmez hareket yarat." },
        { title: "Yan katmanı sınırla", text: "Bir yan ilişki ya da ikinci tema olabilir; fakat ana hikâyeyi büyütmeli, ayrı bir romana dönüşmemeli." },
        { title: "Sonuç baskısını artır", text: "Finale yaklaşırken seçenekleri daralt. Karakter artık başlangıçtaki rahat pozisyonuna dönememeli." },
        { title: "Finali dönüşümle kapat", text: "Son yalnızca olayın bitişi değil, karakterin artık neyi farklı gördüğünün veya yaptığı seçimin sonucudur." },
      ],
    },
    {
      id: "novella-anatomi-kartlari",
      type: "cards",
      heading: "Bir novellanın anatomisi",
      intro: "Novellada her parça romana göre daha sıkı, öyküye göre daha gelişmiş çalışır.",
      items: [
        { title: "Ana dönüşüm", text: "Başlangıç ile final arasında karakterin inancı, ilişkisi veya kararı belirgin biçimde değişir.", label: "", href: "" },
        { title: "Sınırlı oyuncu kadrosu", text: "Her yeni karakter işlev taşımalı. Benzer işlevdeki kişileri birleştirmek anlatıyı güçlendirir.", label: "", href: "" },
        { title: "Tek ana çatışma", text: "Yan problemler ana çatışmanın farklı yüzlerini göstermeli; bağımsız hikâyeler açmamalı.", label: "", href: "" },
        { title: "Sahne + özet dengesi", text: "Kritik anları sahnede yaşat; geçişleri ve tekrarları özetle. Böylece ritim sıkı kalır.", label: "", href: "" },
        { title: "Orta nokta", text: "Hikâyenin ortasında bilgi veya seçim dengeleri değişir ve ikinci yarının yönü belirginleşir.", label: "", href: "" },
        { title: "Yoğun final", text: "Novella finali uzun kapanışlara ihtiyaç duymaz; ana dönüşümü görünür kılan sonuç yeterlidir.", label: "", href: "" },
      ],
    },
    splitOrText(
      "novella-karakter",
      "Karakteri birkaç sahne boyunca dönüştür",
      "Öyküde karakteri tek bir kırılma anında görebilirsin. Novellada ise aynı karakterin **baskı altında nasıl değiştiğini birkaç aşamada** gösterebilirsin.\n\n**Leyla için dönüşüm çizgisi:**\n\n- **Başlangıç:** Evi bir mülk olarak görüyor; işi bitirip dönmek istiyor.\n- **İlk çatlak:** Bulduğu ilk mektup, kardeşinin evden neden ayrıldığına dair bildiği hikâyeyi sorgulatıyor.\n- **Direnç:** Belgeleri görmezden gelip satış işlemlerine devam ediyor.\n- **Orta kırılma:** Babasının bazı mektupları hiç göndermediğini öğreniyor.\n- **Yeni hedef:** Artık yalnız evi satmak değil, kardeşiyle ilgili gerçeği tamamlamak istiyor.\n- **Final seçimi:** Satış kararını öğrendiği gerçeklerle birlikte yeniden değerlendiriyor.\n\nBu çizgi karakteri açıklamayla değil, **tekrarlanan seçimlerin değişmesiyle** büyütür.",
      visuals.anatomy,
      alts.anatomy,
      "left",
    ),
    {
      id: "novella-karsilastirma",
      type: "table",
      heading: "Öykü, novella ve roman arasındaki yapı farkı",
      columns: ["Alan", "Öykü", "Novella", "Roman"],
      rows: [
        ["Ana odak", "Tek an / kırılma", "Tek ana dönüşüm", "Birden fazla gelişim hattı"],
        ["Karakter alanı", "Seçilmiş an", "Birkaç aşamalı dönüşüm", "Uzun dönemli gelişim"],
        ["Yan olay", "Çok sınırlı", "1 kontrollü yan katman", "Birden fazla yan hat olabilir"],
        ["Zaman", "Genellikle sıkıştırılmış", "Sınırlı ama genişleyebilir", "Aylar / yıllar olabilir"],
        ["Ritim", "Çok yoğun", "Yoğun ama nefes alan", "Değişken"],
        ["Temel soru", "Bu an neyi değiştiriyor?", "Bu tek dönüşüm nasıl derinleşiyor?", "Bu geniş dünya ve karakterler nasıl gelişiyor?"],
      ],
    },
    {
      id: "novella-yapi",
      type: "steps",
      heading: "Novella yapısını 5 ana durakta kur",
      intro: "Katı bir formül değil; orta uzunlukta hikâyenin dağılmasını önleyen bir kontrol haritası.",
      items: [
        { title: "Açılış ve görev", text: "Leyla kasabaya gelir; amacı nettir: evi yedi gün içinde satışa hazırlamak." },
        { title: "İlk baskı", text: "Mektuplar ve Cem'in söyledikleri, aile geçmişiyle ilgili bildiği şeyleri çatlatmaya başlar." },
        { title: "Orta kırılma", text: "Leyla, babasının kardeşine ait bazı mektupları sakladığını öğrenir. Hikâyenin anlamı değişir." },
        { title: "Sonuç baskısı", text: "Satış günü yaklaşırken Leyla hem kardeşine ulaşmak hem de kararını vermek zorundadır." },
        { title: "Final seçimi", text: "Leyla'nın evle ilgili kararı, artık yalnız mülkiyet değil; ailesine dair yeni bakışının sonucu olur." },
      ],
    },
    ...visualBlock(
      "novella-gorsel-yapi",
      visuals.structure,
      alts.structure,
      "Novella yapısı, tek ana ekseni korurken dönüşümün birkaç aşamada derinleşmesine izin verir.",
    ),
    {
      id: "novella-sahne-ozet",
      type: "table",
      heading: "Sahne mi, özet mi?",
      columns: ["Durum", "Tercih", "Neden?"],
      rows: [
        ["Karakter önemli bir seçim yapıyor", "Sahne", "Okur kararın baskısını anlık yaşamalı."],
        ["İki gün boyunca ev temizleniyor", "Özet", "Tekrarlanan süreci hızla geçirmek ritmi korur."],
        ["Yeni bilgi ilişkiyi değiştiriyor", "Sahne", "Duygusal tepki ve güç dengesi önemlidir."],
        ["Rutin geçiş veya yolculuk", "Özet", "Ana çatışmaya yeni bir şey eklemiyorsa yer kaplamamalı."],
        ["Orta kırılma", "Sahne", "Novellanın yön değiştirdiği an görünür olmalı."],
      ],
    },
    {
      id: "novella-bolum-plan",
      type: "steps",
      heading: "Bölüm planını hacme göre değil işleve göre kur",
      intro: "Novellada bölüm sayısı hedef değil. Her bölüm bir iş yapmalı.",
      items: [
        { title: "1 · Dönüş", text: "Leyla kasabaya gelir, ev ve satış hedefi kurulur." },
        { title: "2 · İlk iz", text: "İlk mektup bulunur; geçmişte küçük bir çatlak açılır." },
        { title: "3 · Direnç", text: "Leyla işi hızlandırmaya çalışır; Cem ile gerilim büyür." },
        { title: "4 · Kırılma", text: "Saklanan mektupların anlamı ortaya çıkar." },
        { title: "5 · Yeni hedef", text: "Leyla artık yalnız satışla ilgilenemez; kardeşine ulaşmaya çalışır." },
        { title: "6 · Baskı", text: "Alıcı, zaman sınırı ve aile gerçeği aynı anda sıkışır." },
        { title: "7 · Seçim", text: "Leyla ev ve geçmiş hakkında geri dönülmez kararını verir." },
        { title: "8 · Yankı", text: "Kısa bir kapanışla kararın etkisi görünür olur." },
      ],
    },
    ...visualBlock(
      "novella-gorsel-sayfa",
      visuals.pageSetup,
      alts.pageSetup,
      "Taslak düzeni, sahne ve bölüm işlevlerini görünür tutmalı; metni yapay olarak uzatmamalıdır.",
    ),
    {
      id: "novella-revizyon",
      type: "cards",
      heading: "Novella revizyonunda neyi kontrol etmelisin?",
      intro: "İlk taslaktan sonra en büyük iş, romanlaşan fazlalıkları ve öyküleşen boşlukları ayıklamaktır.",
      items: [
        { title: "Ana eksen", text: "Her bölüm Leyla'nın ev, aile gerçeği veya final seçimiyle ilişkili mi?", label: "", href: "" },
        { title: "Tekrar", text: "Aynı duygusal bilgiyi veren iki sahneden biri çıkarılabilir mi?", label: "", href: "" },
        { title: "Yan karakter", text: "Her destek karakteri ayrı bir iş yapıyor mu, yoksa iki rol tek kişide birleşebilir mi?", label: "", href: "" },
        { title: "Orta nokta", text: "Hikâyenin ortasında gerçekten yön değişiyor mu, yoksa yalnız yeni bilgi mi ekleniyor?", label: "", href: "" },
        { title: "Ritim", text: "Kritik anlar sahnede, geçişler gerektiğinde özetle mi anlatılmış?", label: "", href: "" },
        { title: "Final", text: "Son bölüm ana dönüşümü kapatıyor mu, yoksa açıklamayı gereğinden fazla uzatıyor mu?", label: "", href: "" },
      ],
    },
    {
      id: "novella-ornek-proje",
      type: "text",
      heading: "Örnek proje — Kıyıdaki Ev",
      body: "**Başlangıç hedefi:** Leyla yedi gün içinde evi satışa hazırlayıp şehre dönmek ister.\n\n**Ana soru:** Leyla ailesi hakkında yıllardır inandığı hikâye değişirse, hayatını kolaylaştıran eski kararına tutunabilecek mi?\n\n**Baskı kaynakları:** Satış tarihi, kardeşinin mektupları, Cem'in bildikleri ve Leyla'nın geçmişi hızla kapatma isteği.\n\n**Orta kırılma:** Babasının kardeşine gelen mektupları sakladığı anlaşılır.\n\n**Final yönü:** Leyla yalnızca evi satıp satmayacağına değil, kardeşine ulaşıp ulaşmayacağına da karar verir.\n\nBu örnekte novella büyüklüğü; daha fazla yan olaydan değil, **tek kararın sonuçlarını birkaç aşamada yaşamaktan** doğar.",
    },
    ...visualBlock(
      "novella-gorsel-proje",
      visuals.project,
      alts.project,
      "Kıyıdaki Ev örneği, tek ana çatışmanın bölüm bölüm nasıl derinleştirilebileceğini gösterir.",
    ),
    {
      id: "novella-final-kontrol",
      type: "steps",
      heading: "Taslağı bitirmeden önce son kontrol",
      items: [
        { title: "Tek cümlede anlat", text: "Novellanın ana dönüşümünü tek cümlede hâlâ anlatabiliyor musun?" },
        { title: "Yan hatları sorgula", text: "Ana çatışmadan bağımsız kalan her yan hikâyeyi çıkar, birleştir veya yeniden bağla." },
        { title: "Sahne tekrarlarını temizle", text: "Aynı bilgiyi veya duyguyu iki kez anlatan sahneleri sıkıştır." },
        { title: "Başlangıç ve finali karşılaştır", text: "Karakterin dünyaya bakışı veya yaptığı seçim gerçekten değişmiş mi?" },
        { title: "Yüksek sesle oku", text: "Ritmin düştüğü, açıklamanın uzadığı ve gereksiz tekrarın başladığı yerleri işaretle." },
      ],
    },
    ...visualBlock(
      "novella-gorsel-final",
      visuals.finalCta,
      alts.finalCta,
      "Novellanın gücü uzunluğunda değil; tek bir dönüşümü eksiksiz ve yoğun biçimde taşımasındadır.",
    ),
  ];
}

export const metadata: Metadata = {
  title: "Novella Nasıl Yazılır? | İlkOku",
  description: "Novella fikrinden karakter dönüşümüne, orta kırılmadan sahne ve bölüm planına kadar adım adım novella yazarlık rehberi.",
  robots: { index: false, follow: false },
};

export default async function NovellaYazarlikRehberiPage() {
  let guide: Awaited<ReturnType<typeof getEducationGuideRecord>> = null;
  try {
    guide = await getEducationGuideRecord("novella");
  } catch {
    guide = null;
  }

  const source = guide?.visuals ?? {};
  const visuals: NovellaVisuals = {
    hero: source.hero?.url ?? "",
    ideaFlow: source.ideaFlow?.url ?? "",
    structure: source.structure?.url ?? "",
    anatomy: source.anatomy?.url ?? "",
    pageSetup: source.pageSetup?.url ?? "",
    project: source.project?.url ?? "",
    finalCta: source.finalCta?.url ?? "",
  };
  const alts: NovellaAlts = {
    hero: source.hero?.altText || defaultAlt.hero,
    ideaFlow: source.ideaFlow?.altText || defaultAlt.ideaFlow,
    structure: source.structure?.altText || defaultAlt.structure,
    anatomy: source.anatomy?.altText || defaultAlt.anatomy,
    pageSetup: source.pageSetup?.altText || defaultAlt.pageSetup,
    project: source.project?.altText || defaultAlt.project,
    finalCta: source.finalCta?.altText || defaultAlt.finalCta,
  };

  const title = guide?.title || "Novella Nasıl Yazılır?";
  const summary = guide?.summary || "Öykünün yoğunluğunu, romanın gelişim alanıyla birleştir. Tek ana dönüşümü sahne sahne büyüt, dağıtmadan tamamla.";
  const blocks = buildNovellaBlocks(visuals, alts, title, summary);

  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug="novella">
      <div className="novella-writing-guide">
        <PublicCmsPageBlocks
          blocks={blocks}
          eyebrow="Yazarlar İçin · Kurgu"
          pageTitle={title}
          summary={summary}
          unoptimizedImages
        />
      </div>
    </WritingGuideShell>
  );
}
