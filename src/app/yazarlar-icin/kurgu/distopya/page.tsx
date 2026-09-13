import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";

import "./distopya-guide.css";

export const dynamic = "force-dynamic";

const defaultAlt = {
  hero: "Distopya yazarlığı için yurttaş dosyaları, kurum şeması, erişim kartları ve İlkOku yazar ekranıyla düzenlenmiş sıcak çalışma masası",
  ideaFlow: "Toplumsal korkudan çözüm vaadine, kontrol kuralına, normalleşmeye, ayrıcalığa ve görünmeyen bedele uzanan distopya fikir akışı",
  structure: "Distopya anlatısının normalleşmiş düzen, çatlak, ihlal, sistem karşılığı, bedel ve ana seçim aşamalarını gösteren yapı diyagramı",
  anatomy: "Kriz, resmi vaat, kurum, kontrol aracı, ayrıcalık, mağduriyet, karakter bağı ve ana seçimi gösteren distopya eser anatomisi",
  pageSetup: "Distopya eseri için sistem kural defteri, kurum haritası, ayrıcalık ceza matrisi, propaganda sözlüğü, sahne kartları ve süreklilik notları",
  project: "Denge Hattı adlı örnek distopya projesinin Denge Puanı sistemi, Derya Koral karakteri, itiraz dosyaları ve sapma kotasını gösteren çalışma panosu",
  finalCta: "Distopya taslağını tamamlayıp İlkOku yazar alanında ilk sahnesini yazmaya hazırlanan çalışma ortamı",
} as const;

type DistopyaVisuals = { [K in keyof typeof defaultAlt]: string };
type DistopyaAlts = { [K in keyof typeof defaultAlt]: string };

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

function buildDistopyaBlocks(
  visuals: DistopyaVisuals,
  alts: DistopyaAlts,
  title: string,
  summary: string,
): CmsPageBlock[] {
  return [
    {
      id: "distopya-hero",
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
      id: "distopya-nedir",
      type: "text",
      heading: "Distopya nedir?",
      body: "Distopya yalnız kötü bir gelecek, zalim bir yönetici veya sürekli karanlık bir şehir değildir. Güçlü distopyanın merkezinde, **insanlara düzen, güvenlik, verimlilik ya da eşitlik vaat eden fakat bu vaadi sürdürebilmek için özgürlük, hak, kimlik veya vicdan üzerinde sistemli bir bedel yaratan toplumsal düzen** bulunur.\n\nDistopyayı etkili yapan şey baskının büyüklüğünden çok, insanların bu düzen içinde nasıl yaşamayı öğrendiğidir. Okur yalnız 'bu sistem kötü' dememeli; **bu sistem neden kuruldu, neden hâlâ ayakta ve sıradan insanlar neden ona uyuyor?** sorularının cevabını görebilmelidir.\n\nBaşlangıç sorusu şudur: **İyi görünen hangi toplumsal vaat, tek ölçüte indirgenip zorunlu hâle getirildiğinde insana karşı çalışmaya başlar?**",
    },
    {
      id: "distopya-farki",
      type: "cards",
      heading: "Distopyayı karanlık gelecekten ayıran dört temel özellik",
      intro: "Atmosfer tek başına tür yaratmaz. Distopya, işleyen ve insanların davranışını biçimlendiren bir düzen ister.",
      items: [
        { title: "Meşruiyet", text: "Sistem kendisini kötülük olarak tanıtmaz. Güvenlik, adalet, kaynak tasarrufu, sağlık veya toplumsal uyum gibi savunulabilir bir vaat taşır.", label: "", href: "" },
        { title: "Kurum", text: "Baskı yalnız tek bir kötü kişinin iradesi değildir; yasa, bürokrasi, şirket, okul, aile, medya veya puanlama gibi tekrar eden süreçlere yerleşir.", label: "", href: "" },
        { title: "Normalleşme", text: "İnsanlar her sabah korku içinde uyanmak zorunda değildir. Çoğu kişi kurala alışmış, faydasını görmüş veya bedel ödememek için uyum sağlamıştır.", label: "", href: "" },
        { title: "Ahlaki sıkışma", text: "Kahramanın önündeki sorun yalnız kaçmak değildir. Kendi güvenliğinin hangi başkasının kaybına bağlı olduğunu fark ettiğinde gerçek distopik çatışma başlar.", label: "", href: "" },
      ],
    },
    splitOrText(
      "distopya-cekirdek",
      "Bir toplumsal korkuyu sistem motoruna dönüştür",
      "**Geçmiş kriz:** Uzun kıtlık yılları şehirde su, enerji ve konut dağıtımını çökertti.\n\n**Resmi vaat:** Yeni Denge Sistemi, sınırlı kaynakları 'ölçülebilir ve tarafsız' biçimde dağıtacağını söylüyor.\n\n**Temel kural:** Her yurttaşın 0–100 arasında Denge Puanı var; puan konut, sağlık, ulaşım ve su önceliğini belirliyor.\n\n**Kurum:** Merkez Dağıtım İdaresi puan itirazlarını, mahalle hedeflerini ve kaynak kotalarını yönetiyor.\n\n**Ana karakter:** Derya Koral, itiraz dosyalarını inceleyen başarılı bir Uyum Denetçisi. Puanı 92 ve sistemin sağladığı ayrıcalıklardan yararlanıyor.\n\n**Çatlak:** Derya'nın önüne gelen bir itiraz dosyasındaki eski adres, bugün kendisinin yaşadığı öncelikli daire.\n\n**Gizli bedel:** Her bölgenin kaynak bütçesini tutturmak için aylık bir 'sapma kotası' var; belirli sayıda insanın puanı davranışından bağımsız olarak düşürülüyor.\n\n**Distopya cümlesi:** Kaynakların adil dağıtıldığına inanan denetçi Derya, kendi ayrıcalıklı hayatının başkalarının önceden belirlenmiş kayıpları üzerine kurulduğunu keşfeder ve tek tek insanları kurtarmakla sistemi açığa çıkarmak arasında seçim yapmak zorunda kalır.\n\nBurada baskı, dekor değil; **vaat → kural → kurum → ayrıcalık → bedel → karakter seçimi** zinciriyle hikâyenin motorudur.",
      visuals.ideaFlow,
      alts.ideaFlow,
      "right",
    ),
    {
      id: "distopya-sistem-kurma",
      type: "steps",
      heading: "Distopik sistemi 6 soruyla kur",
      intro: "Sistem yalnız neyi yasakladığıyla değil, neden kabul edildiği ve gündelik hayatı nasıl yönettiğiyle inandırıcı olur.",
      items: [
        { title: "1 · Hangi korkudan doğdu?", text: "Savaş, kıtlık, salgın, suç, ekonomik çöküş veya bilgi kaosu gibi gerçek bir toplumsal yarayı belirle. Sistem bu yaraya cevap verdiğini iddia etsin." },
        { title: "2 · Ne vaat ediyor?", text: "Güvenlik mi, eşitlik mi, mutluluk mu, verimlilik mi? Resmi vaat makul değilse insanların neden sisteme razı olduğu anlaşılmaz." },
        { title: "3 · Neyi ölçüyor?", text: "Puan, davranış, tüketim, sağlık, sadakat, üretkenlik veya başka bir tek ölçüt karmaşık insan hayatını nasıl indirger?" },
        { title: "4 · Kim uyguluyor?", text: "Yasa tek başına yetmez. Kurumun masası, formu, görevlisi, denetimi, itiraz prosedürü ve karar zinciri görünür olsun." },
        { title: "5 · Kim kazanıyor, kim ödüyor?", text: "Her düzen bazı insanlara gerçek avantaj sağlamalıdır. Ayrıcalığın kaynağı ile görünmeyen bedelin sahibini eşleştir." },
        { title: "6 · İnsanlar bunu nasıl normalleştiriyor?", text: "Korku kadar rahatlık, alışkanlık, statü, kariyer, aile güvenliği ve küçük ödüller de itaati üretir." },
      ],
    },
    splitOrText(
      "distopya-anatomi",
      "Distopya eserinin parçalarını aynı güç ilişkisine bağla",
      "Bir distopya yalnız baskı listesi değildir. Aşağıdaki parçaların aynı düzeni üretmesi gerekir:\n\n- **Kurucu kriz:** Kıtlık yılları kaynak paylaşımını çökertti.\n- **Resmi vaat:** Denge Puanı kaynakları adil dağıtacak.\n- **Kurum:** Merkez Dağıtım İdaresi.\n- **Kontrol aracı:** Puan, erişim seviyesi, itiraz kaydı ve bölge kotası.\n- **Ödül:** Yüksek puanlılara daha iyi konut, hızlı ulaşım ve sağlık önceliği.\n- **Bedel:** Kaynak açığını kapatmak için bazı yurttaşların puanı sistem gereği düşürülüyor.\n- **Karakter bağı:** Derya bu düzeni denetliyor ve ondan faydalanıyor.\n- **Yanlış inanç:** 'Hatalar vardır ama itiraz sistemi onları düzeltir.'\n- **Ana seçim:** Birkaç dosyayı gizlice düzeltmek mi, yoksa kotanın varlığını açıklayıp kendi ayrıcalığını da riske atmak mı?\n\nBu parçalar aynı **güç, fayda ve bedel zincirine** bağlanmadığında dünya karanlık görünür ama distopik sistem işlemez.",
      visuals.anatomy,
      alts.anatomy,
      "left",
    ),
    {
      id: "distopya-yapi",
      type: "steps",
      heading: "Distopya anlatısını 6 kırılmada kur",
      intro: "Kahraman ilk sayfada sistemi bütünüyle reddetmek zorunda değildir. En güçlü dönüşüm, normal kabul ettiği düzenin gerçek maliyetini adım adım görmesiyle doğar.",
      items: [
        { title: "1 · Normalleşmiş düzen", text: "Derya, Denge Puanı itirazlarını kurallara göre sonuçlandırır; puanı 92 olduğu için sistem onun hayatını düzenli ve güvenli kılar." },
        { title: "2 · Çatlak", text: "Nehir Aksoy'un itiraz dosyasında, puanı düşürüldükten sonra boşaltmak zorunda kaldığı adresin Derya'nın şimdiki dairesi olduğu ortaya çıkar." },
        { title: "3 · İhlal", text: "Derya yalnız yetkili yöneticilerin görebildiği bölge kaynak tablosuna girer ve 'sapma kotası' alanını keşfeder." },
        { title: "4 · Sistem karşılığı", text: "Erişim kaydı fark edilir; Derya'nın puanı geçici incelemeye alınır ve kurum ona hatayı kapatırsa statüsünün korunacağını ima eder." },
        { title: "5 · Bedel", text: "Derya Nehir'in puanını gizlice düzeltir; sistem kotayı korumak için aynı mahalleden başka bir yurttaşı otomatik olarak aşağı çeker." },
        { title: "6 · Ana seçim / yeni düzen", text: "Derya tek tek dosyaları manipüle ederek güvenliğini korumakla, kotanın kanıtlarını yayımlayıp kendi puanını ve düzenini kaybetmek arasında karar verir." },
      ],
    },
    ...visualBlock(
      "distopya-gorsel-yapi",
      visuals.structure,
      alts.structure,
      "Distopya yapısı, kahramanın normal kabul ettiği düzen ile o düzenin görünmeyen bedeli arasındaki mesafeyi her aşamada daraltır.",
    ),
    {
      id: "distopya-kontrol-mekanizmalari",
      type: "table",
      heading: "Baskıyı tek bir kötü adama değil, mekanizmalara dağıt",
      columns: ["Mekanizma", "Hikâyede nasıl görünür?", "Kaçınılacak kolaycılık"],
      rows: [
        ["Yasa", "Hangi davranışın hak kaybına yol açtığını belirler", "Her şeyin keyfî ve açıklamasız yasak olması"],
        ["Teşvik", "Uyum gösterene konut, hız, statü veya güvenlik sağlar", "Sistemin kimseye hiçbir fayda vermemesi"],
        ["Gözetim", "İnsanların kendilerini denetlemesine yol açar", "Her sahnede yalnız kamera göstermek"],
        ["Kıtlık", "Kaynak kararlarını ahlaki çatışmaya dönüştürür", "Yokluğu yalnız atmosfer için kullanmak"],
        ["Dil", "Kayıp ve şiddeti daha kabul edilebilir sözcüklerle örter", "Her terimi açıklama paragrafıyla tanıtmak"],
        ["Bürokrasi", "Zararı kişisel kötülükten prosedüre dönüştürür", "Kurumu tek bir zalim memura indirgemek"],
      ],
    },
    {
      id: "distopya-propaganda",
      type: "cards",
      heading: "Propagandayı yalan afişinden daha derin kur",
      intro: "İyi propaganda yalnız yanlış bilgi değildir; gerçek bir korkuyu, seçilmiş bir gerçeği ve istenen davranışı aynı cümlede birleştirir.",
      items: [
        { title: "Gerçek çekirdek", text: "Kıtlık gerçekten yaşandı. Sistem bütün geçmişi uydurmak zorunda değildir; gerçek travmayı kendi meşruiyeti için seçerek kullanabilir.", label: "", href: "" },
        { title: "Eksik bağlam", text: "Denge Puanı kaynak tüketimini azaltmış olabilir; fakat kimin kaybettiği ve verinin nasıl ayarlandığı görünmez tutulur.", label: "", href: "" },
        { title: "Yeni dil", text: "Puan düşürmeye 'yeniden dengeleme', zorunlu tahliyeye 'yer açma' denmesi şiddeti bürokratik ve kabul edilebilir gösterir.", label: "", href: "" },
        { title: "Ritüel", text: "Aylık puan açıklaması, başarı rozeti veya mahalle töreni sistemi insanların ortak alışkanlığına dönüştürebilir.", label: "", href: "" },
        { title: "Akran baskısı", text: "Komşular kendi puanlarını korumak için düşük puanlı birini risk olarak görmeye başlayabilir; devletin her sahnede görünmesi gerekmez.", label: "", href: "" },
        { title: "Küçük doğruluk", text: "Sistem bazı sorunları gerçekten çözerse karakterlerin onu savunması daha inandırıcı olur; çatışma da daha zorlaşır.", label: "", href: "" },
      ],
    },
    {
      id: "distopya-gundelik-hayat",
      type: "text",
      heading: "Önce zulmü değil, sıradan bir günü yaz",
      body: "Distopyayı inandırıcı kılmak için ilk sahnelerde yalnız hapishane, sorgu ve isyan göstermek zorunda değilsin. **Sistemin normal bir sabahı nasıl değiştirdiğini** göster.\n\nDerya işe giderken hızlı ulaşım şeridini kullanabilir; çünkü puanı 90'ın üzerindedir. Kahvesini alırken ekranda mahallesinin ortalama puanını görebilir. İşte bir dosyayı reddederken bunun birinin hayatını altüst ettiğini düşünmeyebilir; çünkü formda yalnız 'erişim seviyesi güncellendi' yazar.\n\nOkur önce düzenin nasıl yaşandığını görürse, daha sonra sistemin bedeli ortaya çıktığında dünya yalnız kötü görünmez; **işleyen bir alışkanlığın ahlaki ağırlığı** hissedilir.",
    },
    {
      id: "distopya-yazim-duzeni",
      type: "steps",
      heading: "Taslak boyunca altı ayrı kayıt tut",
      intro: "Distopyada süreklilik yalnız tarih ve mekân değildir. Kimin hangi hakka neden sahip olduğunu, hangi kuralın hangi sonucu doğurduğunu da takip etmelisin.",
      items: [
        { title: "Sistem kural defteri", text: "Puan nasıl kazanılır, nasıl kaybedilir, hangi eşik hangi hakkı açar? Kuralları kendi içinde sabit tut." },
        { title: "Kurum zinciri", text: "Kararı kim üretir, kim uygular, kim itirazı inceler, kim veriyi saklar? Gücün akışını tek şemada göster." },
        { title: "Ödül / ceza matrisi", text: "Uyumun gerçek faydalarını ve ihlalin bedellerini karşılıklı yaz. Sistem yalnız cezayla ayakta kalmasın." },
        { title: "Propaganda sözlüğü", text: "Kurumun sert gerçekleri hangi yumuşak kelimelerle adlandırdığını tutarlı biçimde kaydet." },
        { title: "Sahne kartları", text: "Her sahnede karakter hedefi, sistem kuralı, baskı biçimi ve sahne sonunda değişen bilgi veya risk tek satırda görünür olsun." },
        { title: "Ayrıcalık defteri", text: "Kahraman hangi rahatlığı hangi görünmeyen bedel sayesinde elde ediyor? Bu bağı final seçimine kadar izle." },
      ],
    },
    ...visualBlock(
      "distopya-gorsel-sayfa",
      visuals.pageSetup,
      alts.pageSetup,
      "Sistem kuralı, kurum zinciri, ödül-ceza matrisi, propaganda dili ve sahne kartları aynı baskı düzeninin tutarlı çalışmasını sağlar.",
    ),
    {
      id: "distopya-karakter",
      type: "text",
      heading: "Kahramanı yalnız mağdur değil, sistemin parçası yap",
      body: "Distopik karakter ilk sayfada kusursuz bir isyancı olmak zorunda değildir. Çoğu zaman daha güçlü soru şudur: **Bu düzen kahramana ne veriyor ve o bunu kaybetmemek için neyi görmezden geliyor?**\n\nDerya için dört çizgi birlikte çalışır:\n\n- **İstediği şey:** İtiraz sisteminin adil çalıştığını kanıtlayarak kariyerini ve yüksek puanını korumak.\n- **İhtiyaç duyduğu şey:** Tek tek 'hataları' düzeltmenin, haksızlığı üreten mekanizmayı değiştirmediğini görmek.\n- **Korkusu:** Puanını kaybederse yalnız konforunu değil, işini, evini ve toplumsal kimliğini de kaybetmek.\n- **Yanlış inancı:** Kurallar doğru uygulanırsa sistem de adildir.\n\nFinalde kahramanın düzenle ilişkisi değişmeden yalnız rejim hakkında yeni bilgi öğrenmesi, dönüşümü eksik bırakır.",
    },
    {
      id: "distopya-direnc",
      type: "cards",
      heading: "Direnişi tek gecede kahramanlığa dönüştürme",
      intro: "İnandırıcı direnç, karakterin risk eşiğini adım adım aşmasıyla büyür. Her adım bir öncekinin bedelini artırmalıdır.",
      items: [
        { title: "Soru sormak", text: "İlk ihlal yalnız bir dosyadaki tutarsızlığı fark etmek olabilir. Karakter hemen devrimci olmak zorunda değildir.", label: "", href: "" },
        { title: "Küçük kolaylık", text: "Derya önce tek bir dosyayı sessizce düzeltmeye çalışır; çünkü sistemi değil hatayı sorun sanır.", label: "", href: "" },
        { title: "Kuralı ihlal etmek", text: "Gizli tabloya erişmek artık bilinçli bir sınır aşımıdır ve sistemin onu fark etme ihtimalini büyütür.", label: "", href: "" },
        { title: "Başkasını riske atmak", text: "Bir meslektaş yardım ettiğinde karar artık yalnız Derya'nın kişisel bedeli değildir; başkasının güvenliği de denkleme girer.", label: "", href: "" },
        { title: "Geri dönüşsüz eylem", text: "Kanıtı yayımlamak, karakterin eski hayatına sessizce dönemeyeceği eşiktir. Final bu yüzden yalnız fikir değil eylem ister.", label: "", href: "" },
        { title: "Sonucun belirsizliği", text: "Direnişin başarı garantisi olmasın. Etkili distopya finali, doğru seçimin kolay sonuç doğuracağını vaat etmek zorunda değildir.", label: "", href: "" },
      ],
    },
    {
      id: "distopya-revizyon",
      type: "cards",
      heading: "Distopya revizyonda önce sistemin inandırıcılığını test et",
      intro: "İlk taslak bittikten sonra yalnız cümleleri değil, gücün nasıl üretildiğini ve karakterin bu güçle ilişkisini yeniden kontrol et.",
      items: [
        { title: "Meşruiyet", text: "Sistemin neden kurulduğu ve neden hâlâ savunulduğu anlaşılır mı, yoksa yalnız 'kötü olduğu için' mi var?", label: "", href: "" },
        { title: "Fayda", text: "Düzene uyan insanların gerçekten elde ettiği bir güvenlik, statü veya kolaylık var mı?", label: "", href: "" },
        { title: "Mekanizma", text: "Baskı kurum, teşvik ve prosedürle mi işliyor; yoksa her sahnede rastgele zalimlik mi gerekiyor?", label: "", href: "" },
        { title: "Normal hayat", text: "Okur insanların bu düzen içinde nasıl çalıştığını, sevdiğini, alışveriş yaptığını ve çocuk büyüttüğünü görebiliyor mu?", label: "", href: "" },
        { title: "Karakter bağı", text: "Derya'nın sisteme karşı çıkışı aynı zamanda kendi avantajlarına karşı çıkmak anlamına geliyor mu?", label: "", href: "" },
        { title: "Final sonucu", text: "Final tek bir yöneticiyi devirmekle bütün sistemi sihirli biçimde çözüyor mu? Kurumun ve alışkanlığın devam eden etkisini hesaba kat.", label: "", href: "" },
      ],
    },
    {
      id: "distopya-ornek-proje",
      type: "text",
      heading: "Örnek proje — Denge Hattı",
      body: "**Geçmiş:** Yıllar süren su ve enerji kıtlığı şehirde dağıtım sistemini çökertti.\n\n**Yeni düzen:** Merkez Dağıtım İdaresi her yurttaşa 0–100 arasında Denge Puanı verir. Puan; konut, su, sağlık ve ulaşım önceliğini belirler.\n\n**Resmi vaat:** Kaynaklar duyguyla değil veriye göre dağıtılacak; kimse kayırılmayacak.\n\n**Ana karakter:** Derya Koral, 34 yaşında, Uyum İtirazları biriminde denetçi. Puanı 92 ve öncelikli konutta yaşıyor.\n\n**Başlangıç inancı:** Sistem kusursuz değil, fakat itiraz mekanizması hataları düzelttiği için temelde adil.\n\n**Tetikleyici dosya:** Nehir Aksoy adlı yurttaş, açıklanamayan puan düşüşüne itiraz eder. Eski adresi Derya'nın bugün yaşadığı dairedir.\n\n**Gizli sistem:** Her mahalle için aylık 'sapma kotası' vardır. Kaynak bütçesini tutturmak ve sistemin denetim kapasitesini göstermek için belirli sayıda yurttaşın puanı aşağı çekilmek zorundadır.\n\n**Orta kırılma:** Derya Nehir'in puanını gizlice eski seviyesine çıkarır. Ertesi sabah aynı mahalleden başka bir yurttaşın puanı otomatik olarak düşürülür. Sorun tek dosya değil, kotanın kendisidir.\n\n**Kişisel bedel:** Derya'nın gizli tabloya eriştiği anlaşılır; kendi puanı incelemeye alınır. Dairesi, işi ve hızlı sağlık erişimi risk altındadır.\n\n**Final sorusu:** Birkaç kişiyi görünmeden kurtarıp sistemi sürdürmek mi, yoksa sapma kotasının kayıtlarını yayımlayıp kendi ayrıcalıklı hayatını da kaybetmek mi?\n\nDenge Hattı'nda distopya, yalnız 'adaletsiz puanlama' fikrinden değil; **kriz, vaat, kurum, teşvik, ayrıcalık, kota ve karakterin suç ortaklığı** aynı seçimde birleştiği için doğar.",
    },
    ...visualBlock(
      "distopya-gorsel-proje",
      visuals.project,
      alts.project,
      "Denge Hattı örneği, distopik baskının ancak vaat, kurum, ayrıcalık ve görünmeyen bedel aynı sistemde birleştiğinde hikâyeye dönüştüğünü gösterir.",
    ),
    {
      id: "distopya-ornek-sahne",
      type: "text",
      heading: "Örnek: sistemi açıklamadan nasıl gösterirsin?",
      body: "## Açıklama ağırlıklı sürüm\n\nDenge Sistemi yüksek puanlı yurttaşlara hızlı ulaşım sağlıyor, düşük puanlıların ise daha uzun beklemesine neden oluyordu. Derya yüksek puanlı olduğu için ayrıcalıklıydı.\n\n## Sahne içinde çalışan sürüm\n\nDerya turnikeye bileğini uzattı. Ekran yeşile döndü: **92 / ÖNCELİKLİ**. Sağ kapı açılırken sol taraftaki sıra kıpırdamadı.\n\nBir kadın görevliye kartını gösteriyordu. 'Dün seksen birdi,' dedi. 'Bu sabah altmış sekiz. İşe geç kalacağım.'\n\nGörevli ekrana bakmadan omuz silkti. 'İtirazlar üçüncü katta.'\n\nDerya yürüyen banda geçti. Saatine baktı; toplantıya sekiz dakika kalmıştı. Bir an kadına döndü, sonra bant onu öne taşıdı.\n\nİkinci sürümde okur aynı anda **puan eşiğini, ayrıcalığı, bürokrasiyi ve Derya'nın başlangıçtaki suç ortaklığını** görür. Sistem ders olarak değil, davranış olarak görünür.",
    },
    {
      id: "distopya-ustalar",
      type: "cards",
      heading: "Ustalardan öğren — distopik sistem farklı biçimlerde nasıl kurulur?",
      intro: "Amaç eserleri kopyalamak değil; baskı, meşruiyet, gündelik hayat ve karakter ilişkilerinin farklı yazarlarda nasıl çalıştığını incelemektir.",
      items: [
        { title: "George Orwell", text: "Dil, gözetim, tarih anlatısı ve kurumların bireyin gerçeklik algısını nasıl biçimlendirebildiğini incelemek için güçlü bir referans sunar.", label: "", href: "" },
        { title: "Aldous Huxley", text: "Baskının yalnız acıyla değil haz, tüketim, rahatlık ve koşullandırma yoluyla da üretilebileceğini karşılaştırmalı düşünmek için yararlıdır.", label: "", href: "" },
        { title: "Margaret Atwood", text: "Hak kaybının gündelik ritüel, dil, beden politikası ve kurumsal meşruiyet içinde nasıl normalleştiğini incelemek için örnek oluşturur.", label: "", href: "" },
        { title: "Yevgeny Zamyatin", text: "Standartlaşma, şeffaflık, sayısallaştırma ve bireyselliğin düzen adına nasıl tehdit sayılabileceğini incelemek için önemlidir.", label: "", href: "" },
        { title: "Octavia E. Butler", text: "Kriz, güç, topluluk ve hayatta kalma ilişkisini basit iyi-kötü karşıtlığından çıkarıp karakter bedelleriyle düşünmeye yardımcı olur.", label: "", href: "" },
        { title: "Ursula K. Le Guin", text: "Toplum düzenini tek doğru olarak sunmak yerine kurum, kültür ve değerlerin insan davranışını nasıl oluşturduğunu karşılaştırmalı okumaya imkân verir.", label: "", href: "" },
      ],
    },
    {
      id: "distopya-sss",
      type: "faq",
      heading: "Distopya yazarken sık sorulanlar",
      items: [
        { question: "Distopya mutlaka gelecekte mi geçmelidir?", answer: "Hayır. Distopyayı belirleyen zaman değil, birey ve toplum üzerinde sistematik bedel üreten düzenin kurmaca içindeki işleyişidir. Yakın gelecek, alternatif bugün veya başka bir tarihsel bağlam kullanılabilir." },
        { question: "Distopyada mutlaka diktatör bir devlet olmak zorunda mı?", answer: "Hayır. Şirket, algoritmik piyasa, dini kurum, topluluk normu, aile düzeni veya birden fazla kurumun birlikte oluşturduğu sistem de distopik baskı üretebilir." },
        { question: "Okura sistemin bütün tarihini başta anlatmalı mıyım?", answer: "Hayır. Önce karakterin gündelik hayatında kuralın nasıl çalıştığını göster. Geçmiş bilgiyi, karakterin kararını anlamak için gerektiği anda ver." },
        { question: "Kahraman ilk bölümden itibaren sisteme karşı olmalı mı?", answer: "Gerekmez. Sistemin parçası olan, ondan faydalanan veya onu savunan bir karakterin çatlağı fark etmesi daha güçlü bir dönüşüm yaratabilir." },
        { question: "Distopya ile bilim kurgu arasındaki fark nedir?", answer: "Türler örtüşebilir. Bilim kurgu spekülatif bilimsel veya teknolojik değişimin sonuçlarına odaklanabilir; distopyanın merkezi ise toplumsal düzenin güç, hak, özgürlük ve normalleşme üzerindeki baskı mantığıdır." },
        { question: "Finalde sistemi mutlaka devirmeli miyim?", answer: "Hayır. Final, karakterin artık hangi seçimi yapabildiğini ve sistemin gerçek mantığını ne ölçüde görünür kıldığını göstermelidir. Zafer, yenilgi, kaçış veya kısmi değişim türün ihtiyacına göre seçilebilir." },
      ],
    },
    ...visualBlock(
      "distopya-gorsel-final",
      visuals.finalCta,
      alts.finalCta,
      "Distopya yazmak, kötü bir gelecek tasarlamaktan çok insanların hangi bedeli neden normal kabul ettiğini görünür hâle getirmektir.",
    ),
    {
      id: "distopya-cta",
      type: "cta",
      heading: "Sistemi kurdun. Şimdi çatlağı yaşat.",
      text: "Kuralı açıklamakla yetinme. Onu karakterinin günlük rahatlığına, suç ortaklığına, kaybına ve geri dönülmez seçimine dönüştür; sonra ilk sahneyi yaz.",
      primaryLabel: "İlkOku Yazar Alanına Git",
      primaryHref: "/yazar",
      secondaryLabel: "",
      secondaryHref: "",
    },
  ];
}

export const metadata: Metadata = {
  title: "Distopya Nasıl Yazılır? | İlkOku",
  description: "Toplumsal korkudan kontrol sistemine, normalleşmeden karakter suç ortaklığına, direniş ve revizyona kadar adım adım distopya yazarlık rehberi.",
  robots: { index: false, follow: false },
};

export default async function DistopyaYazarlikRehberiPage() {
  let guide: Awaited<ReturnType<typeof getEducationGuideRecord>> = null;
  try {
    guide = await getEducationGuideRecord("distopya");
  } catch {
    guide = null;
  }

  const source = guide?.visuals ?? {};
  const visuals: DistopyaVisuals = {
    hero: source.hero?.url ?? "",
    ideaFlow: source.ideaFlow?.url ?? "",
    structure: source.structure?.url ?? "",
    anatomy: source.anatomy?.url ?? "",
    pageSetup: source.pageSetup?.url ?? "",
    project: source.project?.url ?? "",
    finalCta: source.finalCta?.url ?? "",
  };
  const alts: DistopyaAlts = {
    hero: source.hero?.altText || defaultAlt.hero,
    ideaFlow: source.ideaFlow?.altText || defaultAlt.ideaFlow,
    structure: source.structure?.altText || defaultAlt.structure,
    anatomy: source.anatomy?.altText || defaultAlt.anatomy,
    pageSetup: source.pageSetup?.altText || defaultAlt.pageSetup,
    project: source.project?.altText || defaultAlt.project,
    finalCta: source.finalCta?.altText || defaultAlt.finalCta,
  };

  const title = guide?.title || "Distopya Nasıl Yazılır?";
  const genericSummary = "Distopya için adım adım yazarlık ve üretim rehberi.";
  const summary = guide?.summary && guide.summary !== genericSummary
    ? guide.summary
    : "Bir korkudan düzen kur, düzeni vaat ve kurumla inandırıcı hâle getir, karakteri sistemin faydasına ve bedeline bağla. Distopyayı karanlık dekor değil yaşayan güç ilişkisi olarak yaz.";
  const blocks = buildDistopyaBlocks(visuals, alts, title, summary);

  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug="distopya">
      <div className="distopya-writing-guide">
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
