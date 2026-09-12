import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";

import "./fantastik-guide.css";

export const dynamic = "force-dynamic";

const defaultAlt = {
  hero: "Fantastik bir dünyanın haritası, notları ve İlkOku yazar ekranıyla birlikte görünen çalışma masası",
  ideaFlow: "Dünya fikrinden ana çatışmaya, büyü kuralına ve kahramanın bedeline uzanan fantastik fikir akışı diyagramı",
  structure: "Fantastik anlatının eşik, keşif, bedel, kırılma, yüzleşme ve yeni denge aşamalarını gösteren yapı diyagramı",
  anatomy: "Dünya, büyü sistemi, kültür, iktidar, yaratıklar, karakter amacı ve bedel bileşenlerini gösteren fantastik eser anatomisi",
  pageSetup: "Fantastik eser için harita, sahne kartları, terim sözlüğü ve süreklilik notlarını gösteren yazım düzeni",
  project: "Kül Haritası adlı örnek fantastik projenin dünya kurma, büyü sistemi ve olay örgüsü gelişimini gösteren çalışma panosu",
  finalCta: "Fantastik eser taslağını tamamlayıp İlkOku yazar alanında çalışmaya hazırlanan yazarlık ortamı",
} as const;

type FantastikVisuals = { [K in keyof typeof defaultAlt]: string };
type FantastikAlts = { [K in keyof typeof defaultAlt]: string };

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

function buildFantastikBlocks(
  visuals: FantastikVisuals,
  alts: FantastikAlts,
  title: string,
  summary: string,
): CmsPageBlock[] {
  return [
    {
      id: "fantastik-hero",
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
      id: "fantastik-nedir",
      type: "text",
      heading: "Fantastik kurgu nedir?",
      body: "Fantastik kurgu, yalnızca ejderha, büyü veya hayalî krallık kullanmak değildir. Okurun kabul edebileceği **başka bir gerçeklik düzeni** kurar ve karakterleri bu düzenin kuralları içinde seçim yapmaya zorlar.\n\nİyi fantastikte olağanüstü unsur dekor değildir; iktidarı, korkuyu, arzuyu, tarihi veya karakterin iç çatışmasını etkiler. Bir büyü sistemi varsa sonuç üretir. Bir yaratık varsa ekosistemde yeri vardır. Bir krallık varsa kaynakları, sınırları ve çıkarları vardır.\n\nBaşlangıç sorusu şudur: **Bu dünyada bizim dünyamızdan farklı olan temel şey ne ve bu fark insanların hayatını nasıl değiştiriyor?**",
    },
    {
      id: "fantastik-alt-turler",
      type: "cards",
      heading: "Önce fantastik dünyanın ölçeğini seç",
      intro: "Aynı fantastik fikir, dünyanın ne kadar farklı olduğuna ve olağanüstünün ne kadar görünür olduğuna göre bambaşka anlatılara dönüşebilir.",
      items: [
        { title: "Yüksek fantastik", text: "Kendi coğrafyası, tarihi, toplumları ve kuralları olan bağımsız bir dünya kurar. Dünya kurma yükü yüksektir.", label: "", href: "" },
        { title: "Düşük fantastik", text: "Tanıdık gerçekliğe sınırlı bir olağanüstü unsur girer. Dünya değil, normal düzenin kırılması merkezde olabilir.", label: "", href: "" },
        { title: "Karanlık fantastik", text: "Olağanüstü güçler güven değil tehdit üretir; ahlaki sınırlar ve bedeller daha sert çalışır.", label: "", href: "" },
        { title: "Mitik fantastik", text: "Mitoloji, arketip, ritüel ve eski anlatı yapılarından beslenir; fakat yeni eser kendi iç mantığını kurar.", label: "", href: "" },
        { title: "Şehir fantastiği", text: "Modern veya tanıdık şehir yaşamının altında ikinci bir doğaüstü düzen bulunur.", label: "", href: "" },
        { title: "Epik fantastik", text: "Kişisel hedef ile toplum, krallık, savaş veya dünyanın kaderi gibi büyük ölçekli sonuçları birbirine bağlar.", label: "", href: "" },
      ],
    },
    splitOrText(
      "fantastik-cekirdek",
      "Dünya fikrini hikâye çekirdeğine dönüştür",
      "**Dünya fikri:** Dağların altında yaşayan kadim ateş damarları, şehirlerin enerji ve tarım düzenini besliyor.\n\n**Kural:** Ateş damarlarını yalnız Haritacılar hissedebiliyor; fakat her kullanım onların bir anısını siliyor.\n\n**Ana karakter:** Mira, kayıp annesinin izini taşıyan genç bir Haritacı.\n\n**Somut hedef:** Başkentin altında sönen ana damarı yeniden bulmak.\n\n**Karşı kuvvet:** Saray, damarların yerini halktan saklıyor ve Haritacıları devlet mülkü sayıyor.\n\n**Bedel:** Mira gücünü kullandıkça annesine dair hatıralarını kaybediyor.\n\n**Fantastik cümlesi:** Şehirleri ayakta tutan ateş damarlarını hissedebilen genç Haritacı Mira, başkenti kurtarmak için kayıp damarı ararken her adımda annesine ait bir anısını feda etmek zorunda kalır.\n\nBurada dünya kuralı doğrudan **karakterin hedefi ve bedeliyle** birleşir.",
      visuals.ideaFlow,
      alts.ideaFlow,
      "right",
    ),
    {
      id: "fantastik-dunya-kurma",
      type: "steps",
      heading: "Dünyayı ansiklopedi gibi değil, sistem gibi kur",
      intro: "Dünya kurmanın amacı her şeyi icat etmek değil; hikâyeyi etkileyen parçaların birbirine nasıl bağlandığını bilmektir.",
      items: [
        { title: "Temel farkı belirle", text: "Bu dünyayı bizimkinden ayıran ana fiziksel, büyüsel veya tarihsel fark nedir? Kül Haritası'nda bu fark yeraltındaki ateş damarlarıdır." },
        { title: "Kaynağı tanımla", text: "Su, enerji, büyü, nadir maden, kutsal bilgi veya başka bir kaynak kimde ve neden değerlidir?" },
        { title: "Kurumu oluştur", text: "Gücü kim yönetiyor? Saray, lonca, tapınak, akademi veya aile düzeni dünya kuralını toplumsal sisteme bağlar." },
        { title: "Günlük hayata indir", text: "Olağanüstü kural sıradan insanların ulaşımını, işini, evini, inancını ve korkusunu nasıl etkiliyor?" },
        { title: "Çatışma üret", text: "İki grup aynı kaynağı farklı amaçlarla istiyorsa dünya, hikâyenin motoruna dönüşür." },
        { title: "Sınır koy", text: "Her şey mümkünse hiçbir seçim ağır gelmez. Dünya, neyin yapılamadığını da açıkça belirlemelidir." },
      ],
    },
    {
      id: "fantastik-buyu-sistemi",
      type: "cards",
      heading: "Büyü sistemini dört soruyla test et",
      intro: "Büyü bir çözüm makinesi değil; kuralları, maliyeti ve sonucu olan dramatik bir sistem olmalıdır.",
      items: [
        { title: "Kim kullanabilir?", text: "Doğuştan gelen yetenek mi, eğitim mi, araç mı, sözleşme mi? Erişim biçimi toplumdaki eşitsizliği belirler.", label: "", href: "" },
        { title: "Ne yapabilir?", text: "Yeteneğin işlevini net tut. Haritacılar ateş üretmiyor; mevcut damarları hissediyor ve yönünü okuyabiliyor.", label: "", href: "" },
        { title: "Ne yapamaz?", text: "Kesin sınırlar gerilimi korur. Haritacı olmayan biri damarı okuyamaz; Haritacı da yoktan damar yaratamaz.", label: "", href: "" },
        { title: "Bedeli nedir?", text: "Yorgunluk, zaman, hafıza, yaşam süresi, toplumsal damga veya başka bir bedel gücü dramatik hâle getirir.", label: "", href: "" },
      ],
    },
    splitOrText(
      "fantastik-anatomi",
      "Fantastik eserin parçalarını aynı omurgaya bağla",
      "Bir fantastik eser yalnız dünya kurma dosyası değildir. Aşağıdaki parçaların aynı ana hikâyeyi beslemesi gerekir:\n\n- **Dünya kuralı:** Ateş damarları şehirlerin yaşam kaynağı.\n- **Büyü sistemi:** Haritacılar damarları okuyabilir.\n- **Bedel:** Her okuma bir anıyı siler.\n- **İktidar:** Saray damar bilgisine tek başına sahip olmak istiyor.\n- **Kültür:** Haritacılar hem kutsal hem tehlikeli kabul ediliyor.\n- **Karakter hedefi:** Mira başkentin ana damarını bulmak istiyor.\n- **Kişisel yara:** Annesinin kaybıyla ilgili gerçeği bilmiyor.\n- **Ana seçim:** Şehri kurtarmak için kendi geçmişinden ne kadar vazgeçebilir?\n\nBu parçalar ayrı ayrı ilginç değil, **aynı dramatik soruya hizmet ettikleri için** güçlüdür.",
      visuals.anatomy,
      alts.anatomy,
      "left",
    ),
    {
      id: "fantastik-yapi",
      type: "steps",
      heading: "Fantastik anlatıyı 6 eşikte kur",
      intro: "Dünya keşfi ile karakter gelişimini paralel götür. Yeni bilgi yalnız dekor değil, yeni karar üretmelidir.",
      items: [
        { title: "1 · Normal düzen", text: "Mira, küçük bir sınır kentinde yasaklı damarları kaçak olarak okuyarak geçinir." },
        { title: "2 · Eşik", text: "Başkentte ana damar söner ve Mira'nın annesine ait eski bir harita ortaya çıkar." },
        { title: "3 · Keşif", text: "Mira, sarayın resmi haritalarının yıllardır değiştirildiğini öğrenir." },
        { title: "4 · Bedel", text: "Daha derin damarları okudukça annesine dair anıları silinmeye başlar." },
        { title: "5 · Yüzleşme", text: "Ana damarın söndürülmesinin doğal değil, siyasi bir karar olduğunu keşfeder." },
        { title: "6 · Yeni denge", text: "Final seçimi yalnız şehri değil, damar bilgisinin kimde kalacağını da değiştirir." },
      ],
    },
    ...visualBlock(
      "fantastik-gorsel-yapi",
      visuals.structure,
      alts.structure,
      "Fantastik yapı, dünya keşfini karakterin giderek ağırlaşan seçimleriyle birlikte ilerletir.",
    ),
    {
      id: "fantastik-bilgi-dozu",
      type: "table",
      heading: "Dünya bilgisini ne zaman vermelisin?",
      columns: ["Bilgi", "En iyi an", "Kaçınılacak hata"],
      rows: [
        ["Büyü kuralı", "Karakter gücü kullandığında", "Uzun açıklama paragrafıyla ders vermek"],
        ["Siyasi düzen", "Karakter kurumla çatıştığında", "Krallığın bütün tarihini başta anlatmak"],
        ["Mitoloji", "Bir ritüel, sembol veya seçim anlam kazandığında", "Hikâyeyle ilgisiz efsane eklemek"],
        ["Coğrafya", "Yolculuk, sınır veya kaynak sorunu doğduğunda", "Haritada görünen her yeri metinde tanıtmak"],
        ["Terim", "Okur anlamını bağlamdan çıkarabileceği anda", "Arka arkaya çok sayıda yeni özel isim kullanmak"],
      ],
    },
    {
      id: "fantastik-harita",
      type: "cards",
      heading: "Harita çiziyorsan hikâyeyi değiştirmeli",
      intro: "Harita görsel süs değil; mesafe, kaynak, sınır ve yol kararlarını tutarlı kılan bir araçtır.",
      items: [
        { title: "Mesafe", text: "İki şehir arası yolculuk ne kadar sürüyor? Zaman baskısını gerçekçi kıl.", label: "", href: "" },
        { title: "Doğal engel", text: "Dağ, nehir, çöl veya deniz siyasi sınırları ve ticaret yollarını etkiliyor mu?", label: "", href: "" },
        { title: "Kaynak", text: "Ateş damarları nerede yoğunlaşıyor? Kaynak dağılımı iktidar dağılımını değiştirmeli.", label: "", href: "" },
        { title: "Sınır", text: "İki kültür veya devlet neden tam burada ayrılıyor? Coğrafya ile tarih birbirini desteklesin.", label: "", href: "" },
      ],
    },
    {
      id: "fantastik-yazim-duzeni",
      type: "steps",
      heading: "Taslak sırasında dört ayrı kayıt tut",
      intro: "Fantastik eserde süreklilik hataları çoğu zaman yazım gücünden değil, bilgi yükünün dağınık tutulmasından çıkar.",
      items: [
        { title: "Sahne listesi", text: "Her sahnenin hedefini, çatışmasını, sonucunu ve yeni dünya bilgisini tek satırda kaydet." },
        { title: "Dünya sözlüğü", text: "Özel isimleri, unvanları, yerleri ve kavramları kısa tanımlarla tek yerde tut." },
        { title: "Kural defteri", text: "Büyünün ne yapabildiğini, yapamadığını ve hangi bedeli doğurduğunu değişmez maddeler hâlinde yaz." },
        { title: "Süreklilik çizelgesi", text: "Yolculuk süreleri, tarihler, karakter bilgisi ve önemli nesnelerin kimde olduğunu takip et." },
      ],
    },
    ...visualBlock(
      "fantastik-gorsel-sayfa",
      visuals.pageSetup,
      alts.pageSetup,
      "Harita, terim sözlüğü, kural defteri ve sahne planı aynı hikâyenin tutarlılığını koruyan çalışma araçlarıdır.",
    ),
    {
      id: "fantastik-karakter",
      type: "text",
      heading: "Kahramanı dünya kadar karmaşık kur",
      body: "Fantastik dünyada okurun asıl bağı çoğu zaman karakter üzerinden kurulur. Mira'nın büyü gücü tek başına ilginç değildir; **gücü kullandığında ne kaybettiği** onu ilginç kılar.\n\nKarakter için şu dört çizgiyi birlikte düşün:\n\n- **İstediği şey:** Ana damarı bulup şehri kurtarmak.\n- **İhtiyaç duyduğu şey:** Annesinin seçimini yalnız terk edilme olarak yorumlamaktan vazgeçmek.\n- **Korkusu:** Anılarını kaybederse kimliğini de kaybetmek.\n- **Yanlış inancı:** Hatıraları korumak geçmişi korumaktır.\n\nFinalde dünya değişirken karakterin inancı da değişmelidir. Aksi hâlde büyük savaş veya büyü gösterisi yalnız dış olay olarak kalır.",
    },
    {
      id: "fantastik-kultur",
      type: "cards",
      heading: "Kültür yaratırken yalnız kıyafet düşünme",
      intro: "Kültür; insanların neye değer verdiği, neyi utanç saydığı ve hangi kurallarla birlikte yaşadığıdır.",
      items: [
        { title: "İnanç", text: "Ateş damarları kutsal mı, doğal mı, ataların ruhu mu? Farklı gruplar aynı olguyu farklı yorumlayabilir.", label: "", href: "" },
        { title: "Dil ve adlandırma", text: "Özel isimler ortak bir ses mantığı taşısın; rastgele heceler yerine kültürel köken hissi ver.", label: "", href: "" },
        { title: "Meslek", text: "Dünya kuralı hangi yeni işleri doğuruyor? Haritacı, damar bekçisi, kül işçisi gibi roller günlük düzeni görünür kılar.", label: "", href: "" },
        { title: "Tabu", text: "Toplum neyi yasaklıyor ve neden? Yasak, geçmişte yaşanmış gerçek bir felaket veya siyasi kontrol aracı olabilir.", label: "", href: "" },
        { title: "Tören", text: "Doğum, ölüm, evlilik, yemin veya güç kullanımı ritüelleri kültürün değerlerini sahneye taşır.", label: "", href: "" },
        { title: "Çelişki", text: "Hiçbir kültür tek fikirden oluşmaz. Aynı gelenek farklı sınıflar için farklı anlam taşıyabilir.", label: "", href: "" },
      ],
    },
    {
      id: "fantastik-revizyon",
      type: "cards",
      heading: "Fantastik revizyonda önce sistemi test et",
      intro: "İlk taslak bittikten sonra yalnız cümleleri değil, dünyanın nedenselliğini de kontrol et.",
      items: [
        { title: "Kural tutarlılığı", text: "Karakter finalde, daha önce imkânsız dediğin bir şeyi açıklamasız yapıyor mu?", label: "", href: "" },
        { title: "Bedel", text: "Güç kullanmanın maliyeti gerçekten hissediliyor mu, yoksa yalnız söylenip unutuluyor mu?", label: "", href: "" },
        { title: "Bilgi yükü", text: "Okurun henüz ihtiyacı olmayan tarih, mitoloji veya terimler sahneyi yavaşlatıyor mu?", label: "", href: "" },
        { title: "Coğrafya", text: "Mesafeler, yolculuk süreleri ve sınırlar sahneler arasında çelişiyor mu?", label: "", href: "" },
        { title: "İktidar", text: "Kaynakları kontrol eden kişi veya kurumun gücü dünyada gerçek sonuçlar üretiyor mu?", label: "", href: "" },
        { title: "Karakter", text: "Dünya kurma, Mira'nın seçimini büyütüyor mu; yoksa karakter dünya bilgisinin taşıyıcısına mı dönüşmüş?", label: "", href: "" },
      ],
    },
    {
      id: "fantastik-ornek-proje",
      type: "text",
      heading: "Örnek proje — Kül Haritası",
      body: "**Dünya:** Şehirler, yeraltındaki ateş damarlarının ısısı ve enerjisiyle yaşıyor.\n\n**Büyü sistemi:** Haritacılar damarları hissedebiliyor ve yönlerini okuyabiliyor.\n\n**Sınır:** Haritacılar yoktan enerji yaratamaz; yalnız mevcut damarları bulabilir.\n\n**Bedel:** Her derin okuma bir kişisel anıyı siliyor.\n\n**Ana karakter:** Mira, annesinin kayboluşuna dair gerçeği arayan genç bir Haritacı.\n\n**Ana hedef:** Sönen başkent damarını bulmak.\n\n**Karşı kuvvet:** Damar haritalarını tekeline alan saray.\n\n**Orta kırılma:** Mira, annesinin kaybolmadığını; sarayın damarları yapay olarak yönlendirdiğini keşfettiği için saklandığını öğreniyor.\n\n**Final sorusu:** Mira şehri kurtarmak için annesine dair son hatırasını da feda edecek mi ve damar bilgisini yeniden saraya mı teslim edecek?\n\nBu örnekte harita, büyü, siyaset ve karakter geçmişi **tek olay örgüsünde birbirini zorlar.**",
    },
    ...visualBlock(
      "fantastik-gorsel-proje",
      visuals.project,
      alts.project,
      "Kül Haritası örneği, dünya kuralı ile karakter bedelinin aynı fantastik olay örgüsünde nasıl birleşebileceğini gösterir.",
    ),
    {
      id: "fantastik-ornek-sahne",
      type: "text",
      heading: "Örnek: büyü kuralını açıklamadan nasıl gösterirsin?",
      body: "## Açıklama ağırlıklı sürüm\n\nHaritacılar damarları bulmak için ellerini taşa koyardı. Bu gücün bedeli hafızaydı. Çok derine bakarlarsa önemli anılarını kaybedebilirlerdi.\n\n## Sahne içinde çalışan sürüm\n\nMira avucunu siyah taşa bastırdı. Zeminin altında ince bir sıcaklık kıvrıldı; doğuya, sonra birden aşağıya döndü. Gözlerini açtığında cebindeki bakır düğmeyi neden taşıdığını hatırlayamadı. Birkaç saniye sonra düğmenin annesinin eski paltosundan kaldığını biliyor, ama o paltoyu giydiği günü göremiyordu.\n\nİkinci sürümde okur aynı anda **gücün işlevini, yöntemini ve bedelini** öğrenir. Sistem açıklama değil, olay üretir.",
    },
    {
      id: "fantastik-kontrol-listesi",
      type: "steps",
      heading: "Taslağı bitirmeden önce son fantastik kontrol",
      intro: "Finale geldiğinde yalnız olayın değil, dünyanın da kendi kurallarına sadık kaldığını doğrula.",
      items: [
        { title: "Dünya farkını tek cümlede söyle", text: "Okur bu dünyanın temel farkını ve bunun hayatı nasıl değiştirdiğini anlayabiliyor mu?" },
        { title: "Büyünün sınırını kontrol et", text: "Güç sistemi finalde kolay çözüm üretmek için esnetilmiş mi?" },
        { title: "Haritayı olay örgüsüyle karşılaştır", text: "Mesafe, rota, sınır ve kaynak kararları sahnelerle uyumlu mu?" },
        { title: "Terimleri azalt", text: "Aynı işlevi gören gereksiz özel isimleri birleştir; okurun hafıza yükünü azalt." },
        { title: "Bedelin sonucunu göster", text: "Mira'nın kaybettiği anılar yalnız fikir olarak değil, ilişkilerinde ve seçimlerinde sonuç doğuruyor mu?" },
        { title: "Finalde yeni dengeyi görünür kıl", text: "Hikâye bittiğinde güç, bilgi veya ilişki düzeninde ne değiştiği anlaşılmalı." },
      ],
    },
    {
      id: "fantastik-ustalar",
      type: "cards",
      heading: "Ustalardan öğren — fantastik dünyalar nasıl farklı kurulabilir?",
      intro: "Amaç evrenleri kopyalamak değil; dünya, mit, karakter ve dilin farklı yazarların elinde nasıl işlev kazandığını incelemektir.",
      items: [
        { title: "J. R. R. Tolkien", text: "Dil, tarih, coğrafya ve mit katmanlarının aynı dünya hissini nasıl desteklediği; geçmişin bugünkü çatışmaya nasıl ağırlık verdiği incelenebilir.", label: "", href: "" },
        { title: "Ursula K. Le Guin", text: "Büyü sistemini denge, adlandırma, etik ve kültürel farklılıklarla birleştirme; gücün sınırlarını düşünsel bir yapıya dönüştürme biçimi incelenebilir.", label: "", href: "" },
        { title: "N. K. Jemisin", text: "Dünya düzenini jeoloji, sınıf, baskı ve kişisel travmayla aynı sistem içinde kurma; çevresel kuralı politik çatışmaya dönüştürme biçimine bakılabilir.", label: "", href: "" },
        { title: "Susanna Clarke", text: "Tarih duygusu, dip akıntı hâlindeki mitoloji ve olağanüstünün gündelik gerçeklikle yan yana yürütülmesi incelenebilir.", label: "", href: "" },
        { title: "Neil Gaiman", text: "Eski mitleri çağdaş mekân ve karakterlerle yeniden bağlama, tanıdık olanın altındaki ikinci gerçekliği görünür kılma biçimi incelenebilir.", label: "", href: "" },
        { title: "Terry Pratchett", text: "Fantastik dünya kurallarını mizah, kurumlar ve toplumsal gözlem için kullanma; tür klişelerini sistem içinden dönüştürme biçimine bakılabilir.", label: "", href: "" },
      ],
    },
    {
      id: "fantastik-sss",
      type: "faq",
      heading: "Fantastik yazarken sık sorulanlar",
      items: [
        { question: "Fantastik yazmaya başlamadan bütün dünyayı kurmak zorunda mıyım?", answer: "Hayır. Önce ana karakterin hikâyesini etkileyen coğrafya, güç sistemi, kurumlar ve tarih parçalarını kur. Hikâyeye girmeyen ayrıntıları taslak ilerledikçe geliştirmek daha verimlidir." },
        { question: "Büyü sisteminin bütün kurallarını okura açıklamalı mıyım?", answer: "Hayır. Yazar olarak kuralları bilmen gerekir; okur ise yalnız sahnede karar ve sonuç üretmek için gerekli kısmı zamanında öğrenmelidir." },
        { question: "Harita şart mı?", answer: "Değil. Coğrafya olay örgüsünü, yolculuğu, sınırları veya kaynakları etkiliyorsa harita güçlü bir çalışma aracıdır. Yalnız dekor olacaksa zorunlu değildir." },
        { question: "Çok sayıda ırk, ülke ve dil kullanmak dünyayı daha zengin yapar mı?", answer: "Kendiliğinden yapmaz. Zenginlik sayıdan değil; kültürlerin hedef, tarih, kaynak, değer ve çatışma bakımından tutarlı biçimde farklılaşmasından gelir." },
        { question: "Gerçek mitolojiden esinlenebilir miyim?", answer: "Evet. Ancak mitolojik unsuru yalnız isim olarak taşımak yerine anlamını, bağlamını ve eserde hangi yeni işleve dönüştüğünü araştırmak gerekir." },
        { question: "Fantastik eserimde açıklanamayan gizem bırakabilir miyim?", answer: "Evet. Her gizemin teknik açıklaması gerekmez. Fakat karakterin kararını belirleyen ana kurallar tutarlı olmalı; gizem ile çelişki birbirine karıştırılmamalıdır." },
      ],
    },
    ...visualBlock(
      "fantastik-gorsel-final",
      visuals.finalCta,
      alts.finalCta,
      "Fantastik dünya, kurallarıyla değil o kurallar altında verilen zor seçimlerle hatırlanır.",
    ),
    {
      id: "fantastik-cta",
      type: "cta",
      heading: "Dünyanın kuralları hazır. Şimdi hikâyeyi yaşat.",
      text: "Haritayı, büyü sistemini ve tarihi dosyada bırakma. Onları karakterinin kararlarına, kayıplarına ve değişimine dönüştür; sonra ilk sahneyi yaz.",
      primaryLabel: "İlkOku Yazar Alanına Git",
      primaryHref: "/yazar",
      secondaryLabel: "",
      secondaryHref: "",
    },
  ];
}

export const metadata: Metadata = {
  title: "Fantastik Nasıl Yazılır? | İlkOku",
  description: "Dünya kurmadan büyü sistemine, haritadan kültür ve karakter bedeline kadar adım adım fantastik yazarlık rehberi.",
  robots: { index: false, follow: false },
};

export default async function FantastikYazarlikRehberiPage() {
  let guide: Awaited<ReturnType<typeof getEducationGuideRecord>> = null;
  try {
    guide = await getEducationGuideRecord("fantastik");
  } catch {
    guide = null;
  }

  const source = guide?.visuals ?? {};
  const visuals: FantastikVisuals = {
    hero: source.hero?.url ?? "",
    ideaFlow: source.ideaFlow?.url ?? "",
    structure: source.structure?.url ?? "",
    anatomy: source.anatomy?.url ?? "",
    pageSetup: source.pageSetup?.url ?? "",
    project: source.project?.url ?? "",
    finalCta: source.finalCta?.url ?? "",
  };
  const alts: FantastikAlts = {
    hero: source.hero?.altText || defaultAlt.hero,
    ideaFlow: source.ideaFlow?.altText || defaultAlt.ideaFlow,
    structure: source.structure?.altText || defaultAlt.structure,
    anatomy: source.anatomy?.altText || defaultAlt.anatomy,
    pageSetup: source.pageSetup?.altText || defaultAlt.pageSetup,
    project: source.project?.altText || defaultAlt.project,
    finalCta: source.finalCta?.altText || defaultAlt.finalCta,
  };

  const title = guide?.title || "Fantastik Nasıl Yazılır?";
  const genericSummary = "Fantastik için adım adım yazarlık ve üretim rehberi.";
  const summary = guide?.summary && guide.summary !== genericSummary
    ? guide.summary
    : "Dünyayı kur, büyünün sınırlarını belirle, bedeli karakterin seçimine bağla. Fantastik evreni ansiklopedi değil hikâye olarak yaz.";
  const blocks = buildFantastikBlocks(visuals, alts, title, summary);

  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug="fantastik">
      <div className="fantastik-writing-guide">
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
