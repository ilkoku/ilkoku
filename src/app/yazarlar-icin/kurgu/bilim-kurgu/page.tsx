import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";

import "./bilim-kurgu-guide.css";

export const dynamic = "force-dynamic";

const defaultAlt = {
  hero: "Bilim kurgu yazarlığı için yörünge şeması, araştırma notları ve İlkOku yazar ekranıyla düzenlenmiş sıcak çalışma masası",
  ideaFlow: "Bilimsel ya da teknolojik varsayımdan insan etkisine, bedele ve ana çatışmaya uzanan bilim kurgu fikir akışı",
  structure: "Bilim kurgu anlatısının bilinen düzen, anomali, keşif, sonuç, geri dönülmez seçim ve yeni gerçeklik aşamalarını gösteren yapı diyagramı",
  anatomy: "Varsayım, bilimsel kural, sınır, sistem etkisi, karakter hedefi, risk, etik soru ve ana seçimi gösteren bilim kurgu eser anatomisi",
  pageSetup: "Bilim kurgu eseri için araştırma dosyası, sistem diyagramı, zaman çizelgesi, sahne kartları ve tutarlılık notlarını gösteren yazım düzeni",
  project: "Derin Sessizlik adlı örnek bilim kurgu projesinin Europa araştırma istasyonu, temas hipotezi ve karakter kararlarını gösteren çalışma panosu",
  finalCta: "Bilim kurgu taslağını tamamlayıp İlkOku yazar alanında ilk sahnesini yazmaya hazırlanan çalışma ortamı",
} as const;

type BilimKurguVisuals = { [K in keyof typeof defaultAlt]: string };
type BilimKurguAlts = { [K in keyof typeof defaultAlt]: string };

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

function buildBilimKurguBlocks(
  visuals: BilimKurguVisuals,
  alts: BilimKurguAlts,
  title: string,
  summary: string,
): CmsPageBlock[] {
  return [
    {
      id: "bilim-kurgu-hero",
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
      id: "bilim-kurgu-nedir",
      type: "text",
      heading: "Bilim kurgu nedir?",
      body: "Bilim kurgu, yalnız uzay gemileri, robotlar veya gelecekte geçen hikâyeler değildir. Merkezinde genellikle **bilimsel, teknolojik ya da toplumsal bir değişkenin sonuçlarını araştıran spekülatif bir soru** bulunur.\n\nİyi bilim kurgu şu mantıkla çalışır: Bir şeyi değiştirirsin; sonra bu değişikliğin yalnız ilk sonucunu değil, insanların gündelik hayatında, kurumlarda, ilişkilerde ve ahlaki seçimlerde doğurduğu ikinci ve üçüncü sonuçları izlersin.\n\nBaşlangıç sorusu şudur: **Ya bugün mümkün olmayan ama kendi kuralları içinde tutarlı bir şey mümkün olsaydı, insan hayatında ne değişirdi?**",
    },
    {
      id: "bilim-kurgu-alt-turler",
      type: "cards",
      heading: "Önce bilim kurgunun çalışma ölçeğini seç",
      intro: "Bilim kurgu tek bir sertlik düzeyine sahip değildir. Okura verdiğin gerçeklik sözünü baştan bilmek, araştırma ve anlatım biçimini belirler.",
      items: [
        { title: "Sert bilim kurgu", text: "Fizik, biyoloji, mühendislik veya başka bilim alanlarının sınırlarını daha sıkı izler; çözüm ve çatışma çoğu zaman teknik nedenselliğe dayanır.", label: "", href: "" },
        { title: "Toplumsal bilim kurgu", text: "Teknolojinin kendisinden çok toplum, kimlik, kültür, ekonomi veya kurumlar üzerindeki etkisini araştırır.", label: "", href: "" },
        { title: "İlk temas", text: "İnsan dışı yaşamla karşılaşmanın dil, algı, etik ve bilgi sınırlarını hikâyenin merkezine koyar.", label: "", href: "" },
        { title: "Uzay operası", text: "Büyük ölçekli yolculuk, uygarlıklar, savaş ve politik çatışmaları kullanır; fakat evrenin temel kuralları yine tutarlı olmalıdır.", label: "", href: "" },
        { title: "Siberpunk / biyopunk", text: "Dijital ağlar, yapay zekâ, genetik müdahale veya beden teknolojilerinin güç ilişkilerini nasıl değiştirdiğini sorgular.", label: "", href: "" },
        { title: "Zaman ve nedensellik kurgusu", text: "Zaman yolculuğu, alternatif zaman çizgileri veya nedensellik kırılmalarında kuralların hangi paradoksları doğurduğunu test eder.", label: "", href: "" },
      ],
    },
    splitOrText(
      "bilim-kurgu-cekirdek",
      "Bir 'ya şöyle olsaydı?' sorusunu hikâye motoruna dönüştür",
      "**Spekülatif fikir:** Europa'nın buz altı okyanusunda karmaşık yaşam bulunuyor.\n\n**Bilimsel kural:** Yaşam, görsel değil basınç ve titreşim örüntülerine tepki veriyor.\n\n**Ana karakter:** Ece Aydın, Aster-6 araştırma istasyonunda çalışan astrobiyolog.\n\n**Somut hedef:** İstasyon boşaltılmadan önce gözlenen örüntünün gerçek bir iletişim biçimi olup olmadığını kanıtlamak.\n\n**Karşı kuvvet:** Gezegensel koruma protokolü, kirlenme riski büyüdüğü için temas deneylerinin durdurulmasını gerektiriyor.\n\n**Bedel:** Her yeni deney istasyonun sınırlı enerjisini tüketiyor ve yerel habitatı ısıtarak gözlenen canlıyı değiştirme riski taşıyor.\n\n**Bilim kurgu cümlesi:** Europa'nın buz altı okyanusunda insan sinyallerine yanıt verdiği düşünülen bir örüntüyü inceleyen astrobiyolog Ece, ilk teması kanıtlamak için yaptığı her deneyin keşfetmeye çalıştığı yaşamı bozduğunu fark eder.\n\nBurada bilimsel varsayım doğrudan **karakterin hedefi, yönteminin sınırı ve etik bedeliyle** birleşir.",
      visuals.ideaFlow,
      alts.ideaFlow,
      "right",
    ),
    {
      id: "bilim-kurgu-nedensellik",
      type: "steps",
      heading: "Tek fikri sonuç zincirine çevir",
      intro: "Bilim kurgunun asıl gücü yeni bir cihaz icat etmekte değil, o cihazın veya keşfin dünyada neyi değiştirdiğini takip etmektedir.",
      items: [
        { title: "1 · Değişkeni koy", text: "Bugünkü gerçeklikten hangi tek noktada ayrılıyorsun? Derin Sessizlik'te bu fark, Europa'da tepki veren karmaşık yaşamın bulunmasıdır." },
        { title: "2 · Kuralını belirle", text: "Bu olgu ne yapabilir, ne yapamaz ve hangi koşullarda gözlenebilir? Kurallar belirsizse gerilim de belirsizleşir." },
        { title: "3 · İlk sonucu bul", text: "Bilimsel keşif hemen neyi değiştirir? Araştırma programını, finansmanı, güvenlik prosedürünü veya karakterin hedefini?" },
        { title: "4 · İkinci sonucu bul", text: "İlk sonuç yeni bir toplumsal, ekonomik, etik veya kişisel problem doğuruyor mu?" },
        { title: "5 · Karaktere indir", text: "Büyük fikir karakterin bugün vermek zorunda olduğu somut kararı nasıl değiştiriyor?" },
        { title: "6 · Çatışmayı büyüt", text: "İki makul hedef aynı anda gerçekleşemiyorsa bilimsel fikir hikâyenin motoruna dönüşür." },
      ],
    },
    {
      id: "bilim-kurgu-gerceklik-sozlesmesi",
      type: "cards",
      heading: "Neyi bildiğini, neyi varsaydığını, neyi icat ettiğini ayır",
      intro: "Okurun senden ders kitabı beklemez; fakat eserin kendi gerçeklik sözünü bozmadığını hissetmek ister.",
      items: [
        { title: "Bilinen", text: "Bugünkü bilimsel bilgiden aldığın gerçekleri not et. Bunları mümkün olduğunca güvenilir kaynaklarla doğrula.", label: "", href: "" },
        { title: "Çıkarım", text: "Bugünkü bilgiden geleceğe uzattığın makul varsayımları ayrı tut. Bu bölüm kesin gerçek değil, yazarın modelidir.", label: "", href: "" },
        { title: "İcat", text: "Hikâye için oluşturduğun yeni teknoloji veya olgunun kurallarını açıkça belirle ve ileride keyfine göre değiştirme.", label: "", href: "" },
        { title: "Bilinmeyen", text: "Bilimin henüz cevaplamadığı alanlarda gizem bırakabilirsin. Bilinmeyen ile iç çelişki aynı şey değildir.", label: "", href: "" },
      ],
    },
    splitOrText(
      "bilim-kurgu-anatomi",
      "Bilim kurgu eserinin parçalarını aynı nedensellikte birleştir",
      "Güçlü bilim kurgu yalnız fikir dosyası değildir. Aşağıdaki parçalar aynı ana hikâyeyi beslemelidir:\n\n- **Spekülatif varsayım:** Europa'da tepki veren karmaşık yaşam var.\n- **Bilimsel/teknolojik kural:** Temas basınç ve titreşim örüntüleriyle kurulabiliyor.\n- **Sınır:** Gözlem araçları habitatı etkiliyor; tamamen tarafsız ölçüm mümkün değil.\n- **Sistem etkisi:** Keşif, araştırma protokolünü ve görev komutasını değiştiriyor.\n- **Karakter hedefi:** Ece iletişim hipotezini doğrulamak istiyor.\n- **Risk:** Habitatın geri döndürülemez biçimde kirlenmesi.\n- **Etik soru:** Bir yaşam biçimini anlamak için onu değiştirmeye ne kadar hakkımız var?\n- **Ana seçim:** Kanıt uğruna son deneyi yapmak mı, kanıt eksik kalacak olsa da sistemi korumak mı?\n\nBu parçalar ayrı başlıklar değil; **aynı kararın basıncını artırdıkları için** hikâyedir.",
      visuals.anatomy,
      alts.anatomy,
      "left",
    ),
    {
      id: "bilim-kurgu-yapi",
      type: "steps",
      heading: "Bilim kurgu anlatısını 6 nedensel aşamada kur",
      intro: "Her yeni bilgi karakterin dünya modelini değiştirsin; her model değişikliği yeni bir karar doğursun.",
      items: [
        { title: "1 · Bilinen düzen", text: "Ece ve ekip, Europa okyanusundaki yaşam izlerini rutin örnekleme prosedürüyle araştırır." },
        { title: "2 · Anomali", text: "Nereid sondasının gönderdiği test titreşiminden sonra aynı aralıklarla geri dönen beklenmedik bir örüntü kaydedilir." },
        { title: "3 · Hipotez", text: "Ece bunun rastlantı değil, çevreye verilen düzenli bir yanıt olabileceğini savunur ve kontrollü deney başlatır." },
        { title: "4 · Karşı kanıt", text: "Örüntünün istasyonun atık ısı döngüsüyle de bağlantılı olduğu görülür; ilk temas yorumu şüpheye düşer." },
        { title: "5 · Geri dönülmez seçim", text: "Tek bir yüksek enerjili deney hipotezi ayırabilir, fakat habitatı kalıcı biçimde etkileyebilir." },
        { title: "6 · Yeni gerçeklik", text: "Finalde yalnız 'orada yaşam var mı?' değil, insanlığın bilinmeyen yaşamla nasıl ilişki kuracağı sorusu da değişmiş olur." },
      ],
    },
    ...visualBlock(
      "bilim-kurgu-gorsel-yapi",
      visuals.structure,
      alts.structure,
      "Bilim kurgu yapısı, keşif ile karşı kanıtı peş peşe getirerek karakteri daha zor ve daha bilgili bir seçime taşır.",
    ),
    {
      id: "bilim-kurgu-bilgi-dozu",
      type: "table",
      heading: "Bilimsel bilgiyi ne zaman vermelisin?",
      columns: ["Bilgi", "En iyi an", "Kaçınılacak hata"],
      rows: [
        ["Teknik kural", "Karakter bir sistemi kullanırken veya sistem arızalandığında", "Sahneyi ders kitabı paragrafıyla durdurmak"],
        ["Araştırma bilgisi", "Karakter bir hipotez kurduğunda ya da yanlış hipotezi düzelttiğinde", "Yazarın bütün araştırmasını okura aktarmak"],
        ["Dünya düzeni", "Teknolojinin gündelik hayatı veya kurumu etkilediği sahnede", "Geleceğin bütün tarihini girişte özetlemek"],
        ["Terim", "Okur işlevini bağlamdan anlayabileceği anda", "Arka arkaya açıklamasız teknik jargon kullanmak"],
        ["Etik problem", "İki seçenek de gerçek bedel taşıdığında", "Karakterlere yalnız yazarın fikrini söyletmek"],
      ],
    },
    {
      id: "bilim-kurgu-teknoloji",
      type: "cards",
      heading: "Teknolojiyi dekor değil bağımlılık sistemi olarak yaz",
      intro: "Yeni teknoloji hikâyede varsa yalnız 'havalı' görünmemeli; bir avantaj, sınır, bağımlılık ve kırılma noktası üretmelidir.",
      items: [
        { title: "İşlev", text: "Teknoloji tam olarak hangi problemi çözüyor? İşlevi belirsizse sahnede ne zaman önemli olduğunu da bilemezsin.", label: "", href: "" },
        { title: "Kaynak", text: "Enerji, veri, malzeme, bakım, zaman veya insan uzmanlığı gibi hangi kaynağa bağımlı?", label: "", href: "" },
        { title: "Sınır", text: "Hangi koşulda çalışmıyor? Gecikme, menzil, sıcaklık, basınç, güvenlik protokolü veya başka bir sınır gerilim yaratır.", label: "", href: "" },
        { title: "Yan etki", text: "Bir problemi çözerken hangi yeni problemi doğuruyor? İyi bilim kurgu çoğu zaman burada başlar.", label: "", href: "" },
        { title: "Erişim", text: "Herkes mi kullanabiliyor, yoksa teknoloji belli kurumların veya sınıfların elinde mi?", label: "", href: "" },
        { title: "Arıza", text: "Sistem bozulduğunda yalnız cihaz değil, ona bağımlı hayat düzeni de etkileniyor mu?", label: "", href: "" },
      ],
    },
    {
      id: "bilim-kurgu-sonuc-katmanlari",
      type: "steps",
      heading: "İlk sonucu bulduktan sonra iki kez daha 'sonra ne olur?' diye sor",
      intro: "Spekülatif fikir bir kez sonuç üretip duruyorsa dünya dekor kalır. Sonuç zinciri, geleceği yaşanmış bir sistem gibi hissettirir.",
      items: [
        { title: "Birinci derece sonuç", text: "Europa'da karmaşık yaşam bulunursa araştırma programı ve görev protokolü anında değişir." },
        { title: "İkinci derece sonuç", text: "Kanıtın nasıl toplandığı tartışma yaratır: örnek almak mı, uzaktan gözlemek mi, temasa çalışmak mı?" },
        { title: "Üçüncü derece sonuç", text: "İnsanlık 'keşfetmek' ile 'müdahale etmek' arasındaki sınırı yeniden tanımlamak zorunda kalır." },
        { title: "Kişisel sonuç", text: "Ece'nin bilim insanı olarak başarı arzusu, korumaya çalıştığı yaşam için doğrudan risk hâline gelir." },
      ],
    },
    {
      id: "bilim-kurgu-yazim-duzeni",
      type: "steps",
      heading: "Taslak boyunca altı ayrı kayıt tut",
      intro: "Bilim kurgu sürekliliği, araştırma bilgisiyle kurmaca kurallarının birbirine karışmaması için çalışma dosyasını düzenli tut.",
      items: [
        { title: "Gerçek / kurmaca ayrımı", text: "Doğrulanmış bilimsel bilgi, çıkarım ve tamamen kurgusal varsayımı aynı belgede farklı etiketlerle tut." },
        { title: "Sistem diyagramı", text: "Enerji, iletişim, ulaşım, yaşam desteği veya ana teknolojinin hangi parçaya bağlı olduğunu görselleştir." },
        { title: "Zaman çizelgesi", text: "Yolculuk, iletişim gecikmesi, deney süresi ve olayların tarihlerini tek çizgide kontrol et." },
        { title: "Sahne listesi", text: "Her sahnenin hedefini, çatışmasını, yeni bilgisini ve karakterin kararındaki değişimi kaydet." },
        { title: "Terim sözlüğü", text: "Yeni cihaz, kurum ve kavramları kısa tanımlarla tek yerde tut; gereksiz jargon çoğalmasını engelle." },
        { title: "Tutarlılık matrisi", text: "Bir kural değiştiğinde hangi sahnelerin etkilendiğini işaretle; finalde sürpriz uğruna sistemi bozma." },
      ],
    },
    ...visualBlock(
      "bilim-kurgu-gorsel-sayfa",
      visuals.pageSetup,
      alts.pageSetup,
      "Araştırma dosyası, sistem diyagramı, zaman çizelgesi ve sahne planı bilim kurgu taslağının kendi kurallarına sadık kalmasını sağlar.",
    ),
    {
      id: "bilim-kurgu-karakter",
      type: "text",
      heading: "Büyük fikri küçük bir insan kararına indir",
      body: "Okur bir gezegen, teknoloji veya bilimsel teoriyle bağ kurabilir; fakat hikâyeyi taşıyan şey çoğu zaman **bir insanın o sistem içinde ne istediği ve ne kaybetmekten korktuğudur.**\n\nEce için dört çizgi birlikte çalışır:\n\n- **İstediği şey:** İlk temas ihtimalini bilimsel olarak kanıtlamak.\n- **İhtiyaç duyduğu şey:** Gözlemcinin sistemden tamamen ayrı kalamayacağını kabul etmek.\n- **Korkusu:** Yıllarını verdiği keşfin 'yanlış yorum' olarak kapanması.\n- **Yanlış inancı:** Yeterince dikkatli bir deneyin doğaya hiç müdahale etmeden yapılabileceği.\n\nFinalde bilimsel bilgi kadar karakterin bilgiye yaklaşımı da değişmelidir.",
    },
    {
      id: "bilim-kurgu-arastirma",
      type: "cards",
      heading: "Araştırmayı hikâyenin hizmetinde kullan",
      intro: "Araştırmanın amacı metni bilgiyle doldurmak değil, hata payını azaltmak ve daha özgün çatışmalar bulmaktır.",
      items: [
        { title: "Temel kavramı öğren", text: "Hikâyenin dayandığı alanı, bir uzmanla konuşabilecek kadar değilse bile temel kavramları doğru kullanacak kadar öğren.", label: "", href: "" },
        { title: "Sınırları araştır", text: "Bir teknolojinin ne yapamadığı çoğu zaman ne yapabildiğinden daha iyi sahne üretir.", label: "", href: "" },
        { title: "Uzman dili değil işleyişi al", text: "Jargonu kopyalamak yerine sürecin mantığını anla; sonra karakterin bakış açısına uygun kadarını kullan.", label: "", href: "" },
        { title: "Birden fazla kaynak karşılaştır", text: "Tek bir popüler yazıyı kesin gerçek sayma. Özellikle tartışmalı veya hızla değişen alanlarda farklı kaynakları karşılaştır.", label: "", href: "" },
        { title: "Belirsizliği koru", text: "Bilim kesin cevap vermiyorsa eserin de bunu dürüstçe taşıyabilir. Belirsizlik dramatik zayıflık değildir.", label: "", href: "" },
        { title: "Kurmaca sıçramasını işaretle", text: "Yazar olarak gerçek bilgiden nerede ayrıldığını bil. Okura dipnot vermesen bile kendi kuralın net olsun.", label: "", href: "" },
      ],
    },
    {
      id: "bilim-kurgu-revizyon",
      type: "cards",
      heading: "Bilim kurgu revizyonda önce nedenselliği test et",
      intro: "İlk taslak bittikten sonra yalnız cümleleri değil, varsayımın bütün sonuç zincirini yeniden kontrol et.",
      items: [
        { title: "Kural tutarlılığı", text: "Finalde daha önce imkânsız dediğin bir çözüm açıklamasız ortaya çıkıyor mu?", label: "", href: "" },
        { title: "Teknoloji kolaylığı", text: "Bir cihaz karakteri her problemden zahmetsizce kurtarıyor mu? Sınır ve bedel yeterince gerçek mi?", label: "", href: "" },
        { title: "Bilgi yükü", text: "Araştırma sırasında öğrendiğin ama sahnede işe yaramayan bilgiler ritmi yavaşlatıyor mu?", label: "", href: "" },
        { title: "İkinci sonuç", text: "Büyük keşfin toplum ve gündelik hayat üzerindeki etkileri görünür mü, yoksa yalnız ana olayda mı var?", label: "", href: "" },
        { title: "Karakter bağı", text: "Bilimsel problem Ece'nin seçimini değiştiriyor mu, yoksa karakter yalnız bilgiyi okura aktaran kişi mi?", label: "", href: "" },
        { title: "Etik kolaycılık", text: "Finaldeki iki seçenekten biri gereksiz biçimde kötüleştirilmiş mi? Gerçek ikilemde iki tarafın da bedeli vardır.", label: "", href: "" },
      ],
    },
    {
      id: "bilim-kurgu-ornek-proje",
      type: "text",
      heading: "Örnek proje — Derin Sessizlik",
      body: "**Zaman:** 2098.\n\n**Mekân:** Europa'nın buz altı okyanusuna erişen Aster-6 araştırma istasyonu.\n\n**Spekülatif varsayım:** Okyanustaki karmaşık yaşam, basınç ve titreşim örüntülerine düzenli tepki veriyor.\n\n**Bilimsel sınır:** Gözlem için kullanılan yüksek enerjili titreşimler suyu yerel olarak ısıtıyor; ölçümün kendisi habitatı değiştiriyor.\n\n**Ana karakter:** Ece Aydın, ilk temas ihtimalini kanıtlamak isteyen astrobiyolog.\n\n**Ana hedef:** Zorunlu tahliyeden önce tepkinin iletişim mi yoksa çevresel uyum mu olduğunu ayırmak.\n\n**Karşı kuvvet:** Gezegensel koruma protokolü deneyleri durdurmak istiyor; istasyonun enerji rezervi de hızla tükeniyor.\n\n**Orta kırılma:** Ece, örüntünün yalnız test sinyallerine değil, istasyonun atık ısı döngüsüne de yanıt verdiğini keşfeder. İlk 'iletişim' hipotezi artık kesin değildir.\n\n**Final sorusu:** Hipotezi kesin biçimde ayırabilecek son yüksek enerjili deneyi yapıp habitatı bozma riskini almak mı, yoksa insanlık tarihinin en büyük keşfini kanıtsız bırakmak mı?\n\nBu projede bilim, araştırma yöntemi, çevresel sistem ve karakter hırsı **aynı kararın iki tarafını ağırlaştırır.**",
    },
    ...visualBlock(
      "bilim-kurgu-gorsel-proje",
      visuals.project,
      alts.project,
      "Derin Sessizlik örneği, bilimsel hipotezin ancak sınırları, karşı kanıtı ve insan bedeliyle birlikte hikâyeye dönüştüğünü gösterir.",
    ),
    {
      id: "bilim-kurgu-ornek-sahne",
      type: "text",
      heading: "Örnek: bilimsel kuralı açıklamadan nasıl gösterirsin?",
      body: "## Açıklama ağırlıklı sürüm\n\nNereid sondası basınç dalgaları gönderiyor ve Europa okyanusundaki canlılar bu dalgalara tepki veriyordu. Ancak güçlü dalgalar çevrede ısınmaya yol açtığı için deneyler tehlikeliydi.\n\n## Sahne içinde çalışan sürüm\n\nEce ikinci darbeyi göndermedi. Ekranın sol köşesinde sıcaklık eğrisi bir ondalık daha yükselmişti. Nereid'in mikrofonları sessizdi; sonra yedi kısa titreşim geldi. İlk testte altıydı.\n\n'Bir kez daha,' dedi Bora.\n\nEce parmağını tetikte tuttu. Enerji sütunu sarıya dönmüştü. Eğer örüntü sekize çıkarsa hipotez güçlenecekti. Eğer çıkmazsa üç haftadır 'cevap' dediği şey, yalnızca ısınan suyun davranışı olabilirdi.\n\nİkinci sürümde okur aynı anda **deneyin yöntemini, sınırlayıcı veriyi, hipotezi ve karakterin karar baskısını** öğrenir.",
    },
    {
      id: "bilim-kurgu-ustalar",
      type: "cards",
      heading: "Ustalardan öğren — aynı bilim kurgu sorusu kaç farklı biçimde yazılabilir?",
      intro: "Amaç fikirleri kopyalamak değil; bilimsel varsayımın karakter, toplum, dil ve etikle nasıl farklı bağlandığını incelemektir.",
      items: [
        { title: "Ursula K. Le Guin", text: "Teknolojiden çok kültür, dil, cinsiyet ve toplum düzeni üzerinden spekülatif soruyu insan deneyimine bağlama biçimi incelenebilir.", label: "", href: "" },
        { title: "Arthur C. Clarke", text: "Büyük kozmik fikirleri teknik sadelik, merak ve insan ölçeğiyle birleştirme; bilinmeyeni açıklamadan da güçlü tutma biçimine bakılabilir.", label: "", href: "" },
        { title: "Octavia E. Butler", text: "Biyoloji, güç, bağımlılık ve kimliği karakter ilişkileri içinde sınama; spekülatif sistemi kişisel bedelle birleştirme biçimi incelenebilir.", label: "", href: "" },
        { title: "Stanisław Lem", text: "İnsan algısının ve dilinin gerçekten yabancı bir zekâyı anlamadaki sınırlarını kullanma; ilk teması kolay iletişimden uzak tutma biçimi incelenebilir.", label: "", href: "" },
        { title: "Ted Chiang", text: "Tek bir fikir veya kuralın mantıksal sonuçlarını dikkatle takip ederek düşünsel soruyu duygusal karakter hikâyesine bağlama biçimine bakılabilir.", label: "", href: "" },
        { title: "Liu Cixin", text: "Bilimsel ölçek, uygarlık riski ve uzun zaman aralıklarını kişisel ve toplumsal kararlarla birlikte büyütme yaklaşımı incelenebilir.", label: "", href: "" },
      ],
    },
    {
      id: "bilim-kurgu-sss",
      type: "faq",
      heading: "Bilim kurgu yazarken sık sorulanlar",
      items: [
        { question: "Bilim kurgu yazmak için bilim insanı olmam gerekir mi?", answer: "Hayır. Fakat hikâyenin dayandığı temel alanı araştırmalı, neyin gerçek bilgi neyin kendi varsayımın olduğunu bilmelisin. Güvenilirlik uzman unvanından değil, tutarlı araştırma ve kurallardan gelir." },
        { question: "Bilimsel olarak bugün imkânsız bir teknoloji kullanabilir miyim?", answer: "Evet. Bilim kurgu spekülasyona izin verir. Önemli olan bu sıçramanın kendi kurallarını belirlemek ve hikâye ilerledikçe gerektiği için değiştirmemektir." },
        { question: "Okura teknolojinin nasıl çalıştığını tamamen açıklamalı mıyım?", answer: "Hayır. Okur, karakterin kararını ve sonucu anlamak için gereken kısmı bilmelidir. Yazar olarak sistemi daha ayrıntılı bilmen, metinde bütün ayrıntıyı göstermen gerektiği anlamına gelmez." },
        { question: "Çok teknik terim kullanmak eseri daha inandırıcı yapar mı?", answer: "Genellikle hayır. İnandırıcılık, doğru yerde kullanılan somut ayrıntı ve nedensellikten gelir. Gereksiz jargon okurun hikâyeden kopmasına yol açabilir." },
        { question: "Sert bilim kurgu ile toplumsal bilim kurgu arasında hangisi daha değerlidir?", answer: "Biri diğerinden üstün değildir. Önemli olan okura verdiğin gerçeklik sözünü bilmek ve seçtiğin yaklaşımın kurallarına sadık kalmaktır." },
        { question: "Bilimsel bir hata fark edersem bütün hikâyeyi değiştirmeli miyim?", answer: "Hatanın olay örgüsünü taşıyıp taşımadığına bak. Küçük bir ayrıntıysa düzeltilebilir; ana çatışma o hataya dayanıyorsa varsayımı yeniden kurmak daha doğru olabilir." },
      ],
    },
    ...visualBlock(
      "bilim-kurgu-gorsel-final",
      visuals.finalCta,
      alts.finalCta,
      "Bilim kurgu, geleceği tahmin etmekten çok bir değişikliğin insanı hangi yeni seçime zorlayacağını araştırır.",
    ),
    {
      id: "bilim-kurgu-cta",
      type: "cta",
      heading: "Varsayımın hazır. Şimdi sonuçlarını yaşat.",
      text: "Bilimi ve teknolojiyi açıklama dosyasında bırakma. Onları karakterinin kararlarına, kayıplarına ve yeni gerçekliğine dönüştür; sonra ilk sahneyi yaz.",
      primaryLabel: "İlkOku Yazar Alanına Git",
      primaryHref: "/yazar",
      secondaryLabel: "",
      secondaryHref: "",
    },
  ];
}

export const metadata: Metadata = {
  title: "Bilim Kurgu Nasıl Yazılır? | İlkOku",
  description: "Spekülatif fikirden bilimsel kurala, araştırmadan nedensellik zincirine ve karakter bedeline kadar adım adım bilim kurgu yazarlık rehberi.",
  robots: { index: false, follow: false },
};

export default async function BilimKurguYazarlikRehberiPage() {
  let guide: Awaited<ReturnType<typeof getEducationGuideRecord>> = null;
  try {
    guide = await getEducationGuideRecord("bilim-kurgu");
  } catch {
    guide = null;
  }

  const source = guide?.visuals ?? {};
  const visuals: BilimKurguVisuals = {
    hero: source.hero?.url ?? "",
    ideaFlow: source.ideaFlow?.url ?? "",
    structure: source.structure?.url ?? "",
    anatomy: source.anatomy?.url ?? "",
    pageSetup: source.pageSetup?.url ?? "",
    project: source.project?.url ?? "",
    finalCta: source.finalCta?.url ?? "",
  };
  const alts: BilimKurguAlts = {
    hero: source.hero?.altText || defaultAlt.hero,
    ideaFlow: source.ideaFlow?.altText || defaultAlt.ideaFlow,
    structure: source.structure?.altText || defaultAlt.structure,
    anatomy: source.anatomy?.altText || defaultAlt.anatomy,
    pageSetup: source.pageSetup?.altText || defaultAlt.pageSetup,
    project: source.project?.altText || defaultAlt.project,
    finalCta: source.finalCta?.altText || defaultAlt.finalCta,
  };

  const title = guide?.title || "Bilim Kurgu Nasıl Yazılır?";
  const genericSummary = "Bilim Kurgu için adım adım yazarlık ve üretim rehberi.";
  const summary = guide?.summary && guide.summary !== genericSummary
    ? guide.summary
    : "Bir 'ya şöyle olsaydı?' sorusunu kurala dönüştür, sonuç zincirini kur, bilimi insan bedeline bağla. Bilim kurguyu teknoloji dekoru değil nedensellik olarak yaz.";
  const blocks = buildBilimKurguBlocks(visuals, alts, title, summary);

  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug="bilim-kurgu">
      <div className="bilim-kurgu-writing-guide">
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
