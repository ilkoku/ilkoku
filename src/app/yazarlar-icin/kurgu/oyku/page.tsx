import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";

import "./oyku-guide.css";

export const dynamic = "force-dynamic";

const defaultAlt = {
  hero: "Öykü yazma sürecini anlatan İlkOku çalışma ortamı",
  ideaFlow: "Tek bir gözlemden öykü çekirdeğine giden fikir akışını gösteren diyagram",
  structure: "Kısa öykünün başlangıçtan son yankıya kadar sıkıştırılmış yapısını gösteren diyagram",
  anatomy: "Karakter, baskı, seçim, ayrıntı ve final yankısından oluşan öykü anatomisi görseli",
  pageSetup: "Öykü taslağı için örnek sayfa ve yazım çalışma düzenini gösteren İlkOku görseli",
  project: "Bir kısa öykünün fikirden taslağa ve revizyona dönüşümünü gösteren örnek proje panosu",
  finalCta: "İlkOku yazarlık ortamında yeni bir öykünün başlangıcını anlatan kapanış görseli",
} as const;

type OykuVisuals = { [K in keyof typeof defaultAlt]: string };
type OykuAlts = { [K in keyof typeof defaultAlt]: string };

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

function buildOykuBlocks(visuals: OykuVisuals, alts: OykuAlts, title: string, summary: string): CmsPageBlock[] {
  return [
    {
      id: "oyku-hero",
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
      id: "oyku-nedir",
      type: "text",
      heading: "Öykü nedir?",
      body: "Öykü, kısa olduğu için eksik bir roman değildir. Gücünü **seçmekten ve yoğunlaştırmaktan** alır. Bir karakterin bütün hayatını anlatmak yerine, o hayatı görünür kılan bir anı, çatışmayı, karşılaşmayı veya kararı büyütür.\n\n## Öykünün temel sorusu\n\nKendine önce şunu sor: **Bu öyküde tam olarak ne değişecek?** Değişim büyük olmak zorunda değildir. Bir karar, bir fark ediş, bir vazgeçiş veya geri dönülmez küçük bir hareket bile öykünün merkezi olabilir. Kısa formda her ayrıntının bu merkeze hizmet etmesi gerekir.",
    },
    {
      id: "oyku-fikir-kaynaklari",
      type: "cards",
      heading: "Bir öykü fikri nereden gelir?",
      intro: "Öykü çoğu zaman büyük bir konudan değil, küçük ama gerilim taşıyan bir ayrıntıdan doğar.",
      items: [
        { title: "Tek bir görüntü", text: "Gece yarısı hâlâ yanan tek bir apartman penceresi. Önce görüntüyü seç, sonra nedenini sor.", label: "", href: "" },
        { title: "Yarım kalmış bir cümle", text: "Birinin telefonda 'Bunu ona söyleme' deyip kapattığını duyuyorsun. Cümlenin öncesini değil, sonrasını kur.", label: "", href: "" },
        { title: "Küçük bir karar", text: "Bir karakter kapıyı açacak mı, mektubu okuyacak mı, trenden inecek mi? Kararın bedelini büyüt.", label: "", href: "" },
        { title: "Bir nesne", text: "Anahtar, zarf, eski fotoğraf, kırık saat. Nesne dekor değil; geçmişle bugün arasında baskı yaratan bir araç olsun.", label: "", href: "" },
        { title: "Bir çelişki", text: "Birinin söylediğiyle yaptığı şey birbirini tutmuyorsa öykü için hareket alanı doğar.", label: "", href: "" },
        { title: "Bir sonrasını merak etmek", text: "Herkes olayın kendisini anlatıyorsa sen bir saat sonrasına bak. Sonuçların başladığı yer yeni bir öykü olabilir.", label: "", href: "" },
      ],
    },
    splitOrText(
      "oyku-cekirdek",
      "Fikri öykü çekirdeğine sıkıştır",
      "**Ham fikir:** Bir kadın eski bir posta kutusunda bir zarf buluyor.\n\n**Karakter:** Annesinin evini boşaltıp şehirden ayrılmak üzere olan Derya.\n\n**Baskı:** Taşınma kamyonu bir saat içinde gelecek.\n\n**Nesne:** On yıldır görüşmediği ablasının el yazısıyla bırakılmış bir zarf.\n\n**Seçim:** Derya geçmişi kapatıp gitmek mi, zarfı açıp bildiği hikâyeyi yeniden sorgulamak mı zorunda?\n\n**Öykü cümlesi:** Annesinin evini boşalttığı son sabah Derya, yıllardır görüşmediği ablasının on yıl önce bıraktığı bir zarf bulur ve taşınma kamyonu gelmeden önce onu açıp açmamaya karar vermek zorunda kalır.\n\nBu cümle bütün hayatı anlatmaz; **tek zaman, tek baskı ve tek karar** yaratır.",
      visuals.ideaFlow,
      alts.ideaFlow,
      "right",
    ),
    {
      id: "oyku-surec",
      type: "steps",
      heading: "Öyküyü kur — 7 adımda",
      intro: "Kısa formda amaç daha az şey yazmak değil; yalnız gerekli olanı bırakmaktır.",
      items: [
        { title: "Kırılma anını seç", text: "Karakterin hayatından hangi anı büyüteceğini belirle. Öykü başlamadan önceki yılları yalnız gerektiği kadar taşı." },
        { title: "Bakış açısını sabitle", text: "Okur bu olayı kimin bilinci, sesi veya görüş alanı içinden yaşayacak? Bilgiyi bu sınıra göre dağıt." },
        { title: "Karakterin isteğini belirle", text: "Karakter sahne içinde ne istiyor? Gitmek, saklamak, öğrenmek, kabul edilmek veya kaçmak gibi somut bir yön ver." },
        { title: "Baskıyı artır", text: "Zaman, mekân, başka bir insan veya karakterin kendi korkusu seçimi zorlaştırmalı. Baskı yoksa sahne yalnızca bilgi verir." },
        { title: "Ayrıntıları seç", text: "Her eşya, hareket ve geçmiş bilgisi öykünün duygusuna veya çatışmasına hizmet etsin. Güzel olduğu için kalan ayrıntıyı sorgula." },
        { title: "Kararı veya fark edişi kur", text: "Finalden önce karakterin yaptığı ya da yapamadığı şey öykünün anlamını görünür kılsın." },
        { title: "Yankıyla bitir", text: "Her şeyi açıklamak zorunda değilsin. Son cümle, okurun zihninde öykünün anlamını genişleten bir görüntü, hareket veya sessizlik bırakabilir." },
      ],
    },
    {
      id: "oyku-anatomi-kartlari",
      type: "cards",
      heading: "Bir öykünün anatomisi",
      intro: "Kısa öyküde parçalar az olabilir; fakat aralarındaki bağ çok sıkıdır.",
      items: [
        { title: "Odak", text: "Öykünün merkezindeki tek değişim, soru veya duygusal hareket. Yan malzeme bu odağı bulanıklaştırmamalı.", label: "", href: "" },
        { title: "Karakter", text: "Bütün biyografisi değil, bu anda ne istediği ve neyi sakladığı önemlidir.", label: "", href: "" },
        { title: "Baskı", text: "Karakterin rahat kalmasına izin vermeyen zaman, insan, bilgi veya iç çatışma.", label: "", href: "" },
        { title: "Seçilmiş ayrıntı", text: "Bir nesne veya davranış, uzun açıklamanın yerine karakter ve atmosfer taşıyabilir.", label: "", href: "" },
        { title: "Dönüş", text: "Karakterin kararı, algısı veya ilişkisinde öyküyü başladığı yerden başka bir noktaya taşıyan hareket.", label: "", href: "" },
        { title: "Son yankı", text: "Finalin ardından okurda kalan anlam. Açıklama değil, tamamlanmış bir duygusal veya düşünsel etki.", label: "", href: "" },
      ],
    },
    splitOrText(
      "oyku-karakter",
      "Karakteri tek bir an içinde canlı hâle getir",
      "Öykü karakteri için onlarca sayfalık biyografi yazmak zorunda değilsin. Sahne üreten bilgiyi seç.\n\n**Derya için:**\n\n- **Şimdi istediği:** Evi kapatıp şehirden ayrılmak.\n- **Kaçındığı şey:** Ablasıyla ilgili eski tartışmayı yeniden düşünmek.\n- **Baskı:** Kamyon gelmeden önce evi teslim etmesi gerekiyor.\n- **Davranışı:** Zarfı açmak yerine önce diğer çöpleri toplamaya devam ediyor.\n- **Çatlağı:** Zarfı çöpe atıyor ama kapıdan çıkmadan geri dönüp alıyor.\n\nSon madde karakteri açıklamaz; **karakteri hareket içinde gösterir**.",
      visuals.anatomy,
      alts.anatomy,
      "left",
    ),
    {
      id: "oyku-karsilastirma",
      type: "table",
      heading: "Öykü, novella ve roman arasındaki odak farkı",
      columns: ["Tür", "Temel odak", "Alan", "Yazara pratik soru"],
      rows: [
        ["Öykü", "Tek kırılma, an veya sınırlı çatışma", "Yoğun ve seçici", "Bu ayrıntı merkezdeki değişime hizmet ediyor mu?"],
        ["Novella", "Tek ana hat üzerinde daha uzun dönüşüm", "Orta genişlikte", "Ana çatışmayı büyütmeden hangi katman gerçekten gerekli?"],
        ["Roman", "Geniş karakter ve olay gelişimi", "Çok katmanlı", "Bu bölüm ana dönüşümü veya dünyayı nasıl ilerletiyor?"],
      ],
    },
    {
      id: "oyku-yapi",
      type: "steps",
      heading: "Öykü yapısını 5 durağa sıkıştır",
      intro: "Bu bir zorunlu formül değil; ilk taslakta odağı kaybetmemek için kullanılabilecek basit bir kontrol haritasıdır.",
      items: [
        { title: "Giriş sinyali", text: "Normalin içinde küçük bir bozulma göster. Derya boş evde son kutuyu taşırken posta kutusundaki zarfı fark eder." },
        { title: "Kıvılcım", text: "Zarfın ablasının el yazısı olduğunu anlar. Geçmiş artık fiziksel olarak elindedir." },
        { title: "Sıkışma", text: "Gitmesi gerekir ama zarfı görmezden gelemez. Küçük eylemler kararı geciktirirken baskıyı artırır." },
        { title: "Seçim", text: "Derya zarfı açar, açmaz, yok eder veya yanında götürür. Önemli olan seçimin karakterin iç durumunu görünür kılmasıdır." },
        { title: "Son yankı", text: "Final, seçimin açıklamasını yapmak yerine onun etkisini taşıyan son bir görüntü veya hareket bırakır." },
      ],
    },
    ...visualBlock(
      "oyku-gorsel-yapi",
      visuals.structure,
      alts.structure,
      "Öykü yapısı bir şablon değil; gereksiz sapmaları görmeye yarayan yoğunluk haritasıdır.",
    ),
    {
      id: "oyku-sayfa",
      type: "table",
      heading: "Öykü için sayfa ve çalışma düzeni",
      columns: ["Alan", "Taslak yaklaşımı", "İlkOku / yayın yaklaşımı", "Neden?"],
      rows: [
        ["Başlık", "Taslakta geçici olabilir", "Finalde öykünün tonuyla birlikte değerlendirilir", "Başlık metni açıklamak yerine yeni bir anlam katmanı açabilir"],
        ["Yazı tipi", "Okunaklı serif veya sans-serif", "Yazarın seçimi ve eserin ruhu korunur", "Taslak rahatlığı ile final görünümü aynı olmak zorunda değildir"],
        ["Punto", "Rahat okunacak çalışma ölçüsü", "Yayın görünümünde yazarın belirlediği ölçü", "Tek bir zorunlu punto bütün eserler için doğru değildir"],
        ["Paragraf", "Tutarlı girinti veya paragraf aralığı", "Yazarın fiziksel düzeni korunur", "Kısa formda paragraf ritmi okuma hızını doğrudan etkiler"],
        ["Sahne geçişi", "Boşluk veya ayraçla işaretlenebilir", "Eserde seçilen sistem tutarlı kalır", "Okur zaman veya mekân değişimini karıştırmaz"],
        ["Uzunluk", "Öykünün ihtiyacına göre", "Yarışma/yayın kuralları ayrıca kontrol edilir", "Öyküyü kelime hedefi değil tamamlanan etki belirlemeli"],
      ],
    },
    ...visualBlock(
      "oyku-gorsel-sayfa-ayari",
      visuals.pageSetup,
      alts.pageSetup,
      "Taslak ayarları çalışma rahatlığı içindir; yayın görünümünde yazarın ve eserin tercihi korunur.",
    ),
    {
      id: "oyku-ornek-proje",
      type: "steps",
      heading: "Örnek proje: “Son Zarf” nasıl kuruluyor?",
      intro: "Aynı çekirdeği baştan sona izleyerek kısa formda hangi kararların alındığını görelim.",
      items: [
        { title: "Çekirdek", text: "Derya taşınırken yıllardır görüşmediği ablasından kalma eski bir zarf bulur." },
        { title: "Sınır", text: "Olay tek bir sabah, büyük ölçüde boşaltılmış apartman dairesi ve bina girişi içinde kalır." },
        { title: "Baskı", text: "Kamyonun gelişi yaklaşırken zarfla ne yapacağına karar vermesi gerekir." },
        { title: "Seçilmiş geçmiş", text: "Ablayla yaşanan bütün tarih anlatılmaz; yalnız Derya'nın zarfı açmasını zorlaştıran iki-üç ayrıntı kullanılır." },
        { title: "Karar", text: "Derya zarfı hemen okumak yerine cebine koyup evin anahtarını teslim eder. Geçmişi çözmez; artık ondan kaçmamayı seçer." },
        { title: "Revizyon", text: "Kararı tekrar açıklayan cümleler çıkarılır. Son görüntü, cebindeki zarfın yürürken çıkardığı kâğıt sesiyle bırakılır." },
      ],
    },
    ...visualBlock(
      "oyku-gorsel-ornek-proje",
      visuals.project,
      alts.project,
      "Örnek proje, kısa öyküde sınır koymanın anlatıyı küçültmek değil yoğunlaştırmak olduğunu gösterir.",
    ),
    {
      id: "oyku-ilk-paragraf",
      type: "text",
      heading: "Örnek: ilk paragrafı nasıl sıkılaştırırsın?",
      body: "## Açıklamayla başlayan sürüm\n\nDerya on yıldır ablasıyla konuşmuyordu. Anneleri öldükten sonra eski evi boşaltmak için gelmişti. O sabah çok üzgündü ve geçmişi düşünüyordu.\n\n## Sahneyle başlayan sürüm\n\nDerya son koli bandını dişiyle kopardı. Kamyoncu kırk dakika sonra gelecekti. Anahtarı cebine atarken, girişte yıllardır kapağı kapanmayan posta kutusunda kendi soyadını gördü. Zarfın üzerindeki yazıyı tanıması daha uzun sürmedi.\n\nİkinci sürüm geçmişi henüz açıklamaz. **Zaman baskısını, mekânı ve soruyu aynı anda başlatır.** Okur bilgiyi almak için değil, zarfın ne olduğunu öğrenmek için ilerler.",
    },
    {
      id: "oyku-taslak",
      type: "quote",
      quote: "Kısa öyküde her cümle önemli olmak zorunda değildir; ama hiçbir cümle gereksiz kalmamalıdır.",
      attribution: "İlkOku · Yazarlık rehberi",
    },
    {
      id: "oyku-revizyon",
      type: "steps",
      heading: "Öykü revizyonu — eklemekten önce çıkar",
      intro: "İlk taslağı bitirdikten sonra öykünün merkezini daha görünür hâle getirmek için büyükten küçüğe ilerle.",
      items: [
        { title: "Merkezi kontrol et", text: "Öykü gerçekten tek ana değişimin etrafında mı? Başka bir öyküye ait gibi duran sahneyi ayırmayı düşün." },
        { title: "Geçmişi azalt", text: "Okurun sahneyi anlaması için gerekli olmayan biyografiyi çıkar. Geçmiş, bugünkü davranışı değiştirdiği yerde kalsın." },
        { title: "Karakterleri birleştir", text: "Aynı işlevi gören iki yan karakter varsa tek kişide birleşip birleşemeyeceğini sorgula." },
        { title: "Tekrarı temizle", text: "Bir duygu önce davranışla gösterilip sonra açıklanıyorsa açıklama cümlesine gerçekten ihtiyaç var mı bak." },
        { title: "Finali sustur", text: "Sonucun anlamını okura bir kez daha anlatan cümleyi silmeyi dene. Görüntü veya eylem tek başına yetiyorsa orada bitir." },
        { title: "Sesli oku", text: "Kısa formda ritim çok görünürdür. Uzayan cümleleri, yapay diyaloğu ve istemeden tekrarlanan kelimeleri kulak daha hızlı yakalar." },
      ],
    },
    {
      id: "oyku-ustalar",
      type: "cards",
      heading: "Ustalardan öğren — farklı öykü teknikleri",
      intro: "Amaç taklit etmek değil; kısa formun birbirinden ne kadar farklı biçimlerde kurulabildiğini görmek.",
      items: [
        { title: "Sait Faik Abasıyanık", text: "Gündelik insanı, şehir hayatını ve küçük karşılaşmaları güçlü gözlem ve doğal anlatıcı sesiyle öykünün merkezine taşıma biçimi incelenebilir.", label: "", href: "" },
        { title: "Anton Çehov", text: "Büyük olay yerine insanın içindeki küçük değişimi, açık bırakılan anlamı ve gündelik hayatın gerilimini nasıl kurduğuna bakılabilir.", label: "", href: "" },
        { title: "Alice Munro", text: "Kısa form içinde zaman sıçramaları, hafıza ve karakter geçmişini yoğun ama geniş hissettiren bir yapıya dönüştürmesi incelenebilir.", label: "", href: "" },
        { title: "Raymond Carver", text: "Sade görünen gündelik konuşmaların altında gerilim ve söylenmeyeni taşıyan ayrıntıları nasıl kullandığına bakılabilir.", label: "", href: "" },
        { title: "Jorge Luis Borges", text: "Fikir, kurmaca gerçeklik, zaman ve paradoksu kısa hacimde büyük düşünsel alanlara açma biçimi incelenebilir.", label: "", href: "" },
        { title: "Katherine Mansfield", text: "Atmosfer, algı ve küçük duygusal dönüşleri tek bir gün veya karşılaşma içinde nasıl yoğunlaştırdığı incelenebilir.", label: "", href: "" },
      ],
    },
    {
      id: "oyku-sss",
      type: "faq",
      heading: "Öykü yazarken sık sorulanlar",
      items: [
        { question: "Öykü kaç kelime olmalı?", answer: "Evrensel tek bir sınır yok. Yayın, yarışma veya platform kendi teknik sınırını belirleyebilir. Yazarken önce öykünün etkisini tamamla; gönderim aşamasında ilgili kuralı ayrıca kontrol et." },
        { question: "Öykünün sonunda şaşırtıcı bir ters köşe olmak zorunda mı?", answer: "Hayır. Ters köşe yalnız öykünün iç mantığından doğuyorsa işe yarar. Bir karar, fark ediş, görüntü veya duygusal yön değişimi de güçlü bir final kurabilir." },
        { question: "Açık final yarım kalmışlık mıdır?", answer: "Değil. Olayın her ayrıntısı kapanmasa bile öykünün temel duygusal veya düşünsel hareketi tamamlanmış olmalıdır. Açık bırakmak ile çözülmemiş bırakmak aynı şey değildir." },
        { question: "Birden fazla ana karakter kullanabilir miyim?", answer: "Kullanabilirsin; fakat kısa formda her yeni bakış açısı alan ister. Birden fazla karakter kullanıyorsan hepsinin aynı merkezi gerilimi güçlendirdiğinden emin ol." },
        { question: "Öyküye geçmiş bilgisi nasıl eklenir?", answer: "Uzun açıklama blokları yerine bugünkü hareketi anlamlandıran küçük parçalar kullan. Bir nesne, kısa anı, davranış veya diyalog geçmişi taşıyabilir." },
        { question: "Başlığı en başta mı bulmalıyım?", answer: "Hayır. Geçici başlıkla yazabilirsin. Taslak bittikten sonra metinde tekrar eden nesne, görüntü, soru veya karşıtlıklara bakmak daha güçlü bir başlık bulmana yardım edebilir." },
      ],
    },
    ...visualBlock(
      "oyku-gorsel-final",
      visuals.finalCta,
      alts.finalCta,
      "Bir öykü bazen tek bir görüntüyle başlar; önemli olan o görüntünün neden şimdi değiştiğini bulmaktır.",
    ),
    {
      id: "oyku-cta",
      type: "cta",
      heading: "Öykünün çekirdeğini buldun. Şimdi onu yazıya dönüştür.",
      text: "İlk taslağı mükemmel yapmak zorunda değilsin. Odağını koru, sahneyi bitir ve sonra metni sıkılaştır.",
      primaryLabel: "İlkOku Yazar Alanına Git",
      primaryHref: "/yazar",
      secondaryLabel: "",
      secondaryHref: "",
    },
  ];
}

export const metadata: Metadata = {
  title: "Öykü Nasıl Yazılır? | İlkOku",
  description: "Öykü fikrinden karaktere, kısa form yapısından sahne ekonomisine, finalden revizyona kadar örneklerle adım adım öykü yazarlık rehberi.",
  robots: { index: false, follow: false },
};

export default async function OykuYazarlikRehberiPage() {
  let guide: Awaited<ReturnType<typeof getEducationGuideRecord>> = null;
  try {
    guide = await getEducationGuideRecord("oyku");
  } catch {
    guide = null;
  }

  const cmsVisuals = guide?.visuals ?? {};
  const visuals: OykuVisuals = {
    hero: cmsVisuals.hero?.url ?? "",
    ideaFlow: cmsVisuals.ideaFlow?.url ?? "",
    structure: cmsVisuals.structure?.url ?? "",
    anatomy: cmsVisuals.anatomy?.url ?? "",
    pageSetup: cmsVisuals.pageSetup?.url ?? "",
    project: cmsVisuals.project?.url ?? "",
    finalCta: cmsVisuals.finalCta?.url ?? "",
  };
  const alts: OykuAlts = {
    hero: cmsVisuals.hero?.altText || defaultAlt.hero,
    ideaFlow: cmsVisuals.ideaFlow?.altText || defaultAlt.ideaFlow,
    structure: cmsVisuals.structure?.altText || defaultAlt.structure,
    anatomy: cmsVisuals.anatomy?.altText || defaultAlt.anatomy,
    pageSetup: cmsVisuals.pageSetup?.altText || defaultAlt.pageSetup,
    project: cmsVisuals.project?.altText || defaultAlt.project,
    finalCta: cmsVisuals.finalCta?.altText || defaultAlt.finalCta,
  };

  const title = guide?.title || "Öykü Nasıl Yazılır?";
  const genericSummary = "Öykü için adım adım yazarlık ve üretim rehberi.";
  const summary = guide?.summary && guide.summary !== genericSummary
    ? guide.summary
    : "Tek bir anı, çatışmayı veya değişimi yoğunlaştır. Fikirden karaktere, sahne ekonomisinden finale ve revizyona kadar kısa öykünü adım adım kur.";
  const blocks = buildOykuBlocks(visuals, alts, title, summary);

  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug="oyku">
      <div className="oyku-writing-guide">
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
