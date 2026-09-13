import type { GenreCategory } from "@/lib/genres";

type CategoryLearningItem = {
  title: string;
  text: string;
};

export type WritingCategoryHub = {
  category: GenreCategory;
  slug: string;
  href: string;
  title: string;
  cardText: string;
  lead: string;
  definition: string;
  difference: string;
  invitation: string;
  promise: string;
  foundations: readonly CategoryLearningItem[];
  choiceHeading: string;
  choiceIntro: string;
  choiceSignals: readonly CategoryLearningItem[];
  learningPath: readonly CategoryLearningItem[];
  outcomeHeading: string;
  outcomeIntro: string;
  outcomes: readonly string[];
};

export const WRITING_CATEGORY_HUBS: readonly WritingCategoryHub[] = [
  {
    category: "Kurgu",
    slug: "kurgu",
    href: "/yazarlar-icin/kurgu",
    title: "Kurgu",
    cardText: "Roman, öykü, fantastik, polisiye ve diğer kurgu eğitimlerini keşfet.",
    lead: "Gerçekte olmayanı yazmak değil, kendi gerçekliğini kurmaktır.",
    definition: "Kurgu; karakterlerin, olayların, dünyaların ve çatışmaların yazar tarafından oluşturulduğu anlatı alanıdır. Bazen bugünkü dünyaya çok yakın bir roman, bazen hiç var olmamış bir fantastik evren, bazen gelecekte geçen bir bilim kurgu ya da çözülmesi gereken bir polisiye olabilir.",
    difference: "Her kurgu türü aynı şekilde yazılmaz. Polisiye ipucu ve çözüm mantığıyla, fantastik dünya ve kurallarla, bilim kurgu varsayım ve nedensellikle, gerilim baskı ve beklentiyle, psikolojik roman ise karakterin iç dünyasıyla çalışır.",
    invitation: "Tür menüsünden yazmak istediğin kurgu türünü seç. İlkOku sana o türe özgü fikir, yapı, karakter, taslak, örnek proje ve revizyon eğitimini adım adım gösterecek.",
    promise: "Bu kategoride amaç yalnız iyi bir fikir bulmak değil; o fikri çalışan bir hikâye motoruna dönüştürmek, türün beklediği gerilimi kurmak ve ilk taslaktan revizyona kadar eseri taşıyacak sistemi öğrenmektir.",
    foundations: [
      { title: "Hikâye motoru", text: "Konuyu tek cümlelik bir çatışma ve değişim vaadine dönüştür; kahramanın ne istediğini ve neyin buna engel olduğunu görünür kıl." },
      { title: "Karakter ve seçim", text: "Karakteri biyografi listesiyle değil, baskı altında verdiği kararlarla kur; iç ve dış çatışmayı aynı hatta bağla." },
      { title: "Dünya ve kurallar", text: "Gerçekçi, tarihî, fantastik ya da spekülatif fark etmeksizin dünyanın sınırlarını, bedellerini ve nedenselliğini baştan belirle." },
      { title: "Yapı ve tempo", text: "Sahne, bölüm, ipucu, baskı, dönüş ve final ritmini türün okur beklentisine göre tasarla; her tür için aynı şablonu kullanma." },
    ],
    choiceHeading: "Türünü konuya göre değil, hikâyenin çalışma biçimine göre seç",
    choiceIntro: "Aynı fikir farklı kurgu türlerinde bambaşka bir eser olur. Kendine önce hikâyenin okurda hangi deneyimi üretmesini istediğini sor.",
    choiceSignals: [
      { title: "İnsan ve uzun dönüşüm", text: "Karakterin yaşamı, ilişkileri ve iç değişimi merkezdeyse roman, psikolojik roman, dram veya romantik gibi türlere yaklaş." },
      { title: "Yeni kural veya dünya", text: "Hikâye bir varsayım, büyü sistemi, toplumsal düzen ya da alternatif gerçeklikle çalışıyorsa bilim kurgu, fantastik, distopya, ütopya veya alternatif tarih hattına bak." },
      { title: "Bilinmeyen ve tehdit", text: "Okuru soru, ipucu, kuşku, korku veya baskıyla ilerletmek istiyorsan polisiye, dedektif, gerilim, korku, gotik ya da paranormal daha doğru motor olabilir." },
      { title: "Hedef ve hareket", text: "Fiziksel amaç, görev, takip, kaçış veya operasyon ağırlıktaysa macera, aksiyon, casusluk ve post-apokaliptik gibi türlerin yapı mantığını incele." },
    ],
    learningPath: [
      { title: "Fikri sınırla", text: "Tek bir temel değişim, soru veya çatışma seç." },
      { title: "Tür motorunu kur", text: "Okurun sayfayı çevirmesini sağlayacak tür mekanizmasını belirle." },
      { title: "Karakteri ve dünyayı bağla", text: "Kurallar ile karakterin arzusu birbirini zorlasın." },
      { title: "Sahne ve bölüm planını çıkar", text: "Her parçanın neyi değiştirdiğini görünür kıl." },
      { title: "İlk taslağı tamamla", text: "Mükemmelleştirmeden önce baştan sona çalışan bir bütün üret." },
      { title: "Türüne göre revize et", text: "Tempo, ipucu, duygu, dünya kuralı ve final vaadini ayrı ayrı test et." },
    ],
    outcomeHeading: "Kurgu eğitiminden yalnız bilgiyle değil, kurulmuş bir eser sistemiyle çık",
    outcomeIntro: "Tür eğitimine geçtiğinde her bölüm senden somut bir üretim ister. Hedef, eğitim sonunda boş bir fikir dosyası değil yazılabilir bir eser iskeleti oluşturmaktır.",
    outcomes: [
      "Tek cümlelik hikâye motoru ve tür vaadi",
      "Karakter / çatışma / dünya karar dosyası",
      "Sahne veya bölüm bazlı ilk taslak planı",
      "Türüne özgü revizyon ve final kontrol listesi",
    ],
  },
  {
    category: "Edebiyat",
    slug: "edebiyat",
    href: "/yazarlar-icin/edebiyat",
    title: "Edebiyat",
    cardText: "Şiirden denemeye, anıdan biyografiye edebî anlatı eğitimlerini keşfet.",
    lead: "Aynı deneyim, anlatım biçimi değiştiğinde başka bir esere dönüşür.",
    definition: "Edebiyat; ses, biçim, bakış ve dil aracılığıyla düşünceyi, deneyimi ve insanı anlatmanın farklı yollarını bir araya getirir. Şiir yoğunlaştırır, deneme düşünceyi araştırır, anı yaşanmış deneyimi seçerek kurar, biyografi ise başka bir hayatı kaynaklarla görünür kılar.",
    difference: "Bu türlerde yalnız konu değil, anlatıcının konumu ve metnin okurla kurduğu sözleşme değişir. Şiirde ritim ve imge, denemede düşünce hareketi, anıda hafıza, eleştiride ise gerekçeli değerlendirme öne çıkar.",
    invitation: "Tür menüsünden yazmak istediğin edebiyat biçimini seç ve o forma özgü anlatım, yapı, taslak ve revizyon eğitimine geç.",
    promise: "Edebiyat eğitimlerinde amaç güzel cümle kurmayı öğretmekle sınırlı değildir. Sesini, bakış açını, gerçeklikle kurduğun sözleşmeyi ve seçtiğin biçimin ritmini bilinçli hale getirerek metni kendi formuna uygun biçimde tamamlamanı sağlar.",
    foundations: [
      { title: "Ses ve bakış", text: "Metnin kim tarafından, hangi mesafeden ve hangi tonla konuştuğunu belirle; şiirin sesiyle biyografinin anlatıcısını aynı mantıkta kurma." },
      { title: "Biçim ve yoğunluk", text: "Dize, paragraf, fragman, sahne, kronoloji veya söyleşi akışı gibi biçim kararlarının anlamı nasıl değiştirdiğini öğren." },
      { title: "Gerçeklik sözleşmesi", text: "Anı, günlük, biyografi, otobiyografi ve gezi yazısında hafıza, kaynak, mahremiyet ve temsil sorumluluğunu metnin parçası yap." },
      { title: "Seçme ve çıkarma", text: "Edebî etki çoğu zaman eklemekten çok doğru ayrıntıyı seçmek, tekrarları temizlemek ve metnin taşıyamadığı açıklamayı çıkarmakla güçlenir." },
    ],
    choiceHeading: "Türünü anlatmak istediğin şeye değil, onu nasıl araştırmak istediğine göre seç",
    choiceIntro: "Edebiyat türleri aynı malzemeyi farklı sorularla işler. Yaşanmış bir olay şiir, anı, deneme veya portre olabilir; formu belirleyen şey metnin neyi öne çıkaracağıdır.",
    choiceSignals: [
      { title: "Duygu, imge ve ses", text: "Dil yoğunluğu, ritim ve çağrışım merkezdeyse şiir; kurmaca estetiği ile anlatı kurmak istiyorsan edebî kurmaca daha yakın durur." },
      { title: "Düşünceyi araştırmak", text: "Bir fikri kesin sonuç vermeden dolaşmak için deneme; bir eseri ya da düşünceyi gerekçeli biçimde değerlendirmek için eleştiri veya inceleme seç." },
      { title: "Yaşanmış deneyim", text: "Kendi geçmişin ve hafızan merkezdeyse anı, günlük veya otobiyografi; başka bir kişinin hayatı merkezdeyse biyografi veya portre düşün." },
      { title: "Karşılaşma ve yer", text: "Başka bir kişinin sesiyle ilerlemek istiyorsan söyleşi; mekân, yolculuk ve gözlem metnin omurgasıysa gezi yazısı daha doğru form olabilir." },
    ],
    learningPath: [
      { title: "Malzemeyi seç", text: "Duygu, düşünce, hafıza, kişi, eser veya mekân çekirdeğini sınırla." },
      { title: "Anlatı sözleşmesini kur", text: "Okura neyi bildiğini, neyi hatırladığını ve hangi bakıştan konuştuğunu netleştir." },
      { title: "Biçim kararını ver", text: "Dize, bölüm, kronoloji, soru-cevap veya fragman yapısını seç." },
      { title: "İlk metni üret", text: "Ses ve yapı kararlarını koruyarak baştan sona bir taslak çıkar." },
      { title: "Kaynak ve etik kontrolü yap", text: "Gerçek kişi, alıntı, hafıza ve temsil içeren türlerde doğruluk ve mahremiyet sınırlarını incele." },
      { title: "Dili revize et", text: "Ritim, tekrar, gereksiz açıklama, ton ve final etkisini formun ihtiyacına göre yeniden yaz." },
    ],
    outcomeHeading: "Edebiyat eğitiminden kendi sesini taşıyan somut bir metin planıyla çık",
    outcomeIntro: "Amaç tür hakkında konuşabilmek değil; hangi biçimi neden seçtiğini bilerek o türde gerçek bir metin üretmeye başlamaktır.",
    outcomes: [
      "Metnin ses, bakış ve okur sözleşmesi",
      "Türe uygun biçim ve bölümleme planı",
      "Gerekli türlerde kaynak / hafıza / etik dosyası",
      "İlk taslak ve dile odaklı revizyon kontrolü",
    ],
  },
  {
    category: "Senaryo ve Sahne",
    slug: "senaryo-ve-sahne",
    href: "/yazarlar-icin/senaryo-ve-sahne",
    title: "Senaryo ve Sahne",
    cardText: "Film, dizi, tiyatro, podcast ve sahne anlatısı eğitimlerini keşfet.",
    lead: "Burada metin yalnız okunmaz; görülür, duyulur ve oynanır.",
    definition: "Senaryo ve sahne yazarlığı, hikâyeyi performansa dönüşecek biçimde kurar. Sahne, sekans, diyalog, ritim, süre ve görsel-işitsel anlatım; yazılan metnin nasıl deneyimleneceğini doğrudan belirler.",
    difference: "Film senaryosu görüntü ve kurgu üzerinden, dizi bölüm ve sezon yapısıyla, tiyatro canlı sahnenin sınırlarıyla, podcast ve radyo ise sesin taşıdığı bilgi ve atmosferle çalışır.",
    invitation: "Tür menüsünden üretmek istediğin formatı seç ve o mecranın sahne, yapı, diyalog ve taslak eğitimine geç.",
    promise: "Bu kategoride bir hikâyeyi yalnız yazmayı değil, onu kamera, sahne, mikrofon, oyuncu, kurgu ve süre gerçekliği içinde çalışacak biçimde tasarlamayı öğrenirsin. Metin, üretilebilecek bir performans belgesine dönüşür.",
    foundations: [
      { title: "Sahne ve eylem", text: "Anlatılabilecek bilgiyi konuşmayla açıklamak yerine görüntü, davranış, ses ve sahne içi seçimlerle dramatize et." },
      { title: "Diyalog ve alt metin", text: "Karakterlerin söyledikleriyle istedikleri arasındaki farkı kur; diyaloğu bilgi taşıma aracına indirgeme." },
      { title: "Süre ve ritim", text: "Film dakikası, dizi bölümü, tiyatro perdesi, podcast segmenti veya kısa film süresi gibi gerçek format sınırları içinde tempo kur." },
      { title: "Üretim gerçekliği", text: "Mekân, oyuncu, arşiv, ses, haklar, prova ve yapım koşullarını yazının dışında değil, senaryo kararlarının parçası olarak düşün." },
    ],
    choiceHeading: "Formatını hikâyenin nerede yaşayacağına göre seç",
    choiceIntro: "Aynı hikâye sinema, dizi, tiyatro veya sesli anlatıda aynı şekilde çalışmaz. Önce seyircinin eseri hangi ortamda deneyimleyeceğini belirle.",
    choiceSignals: [
      { title: "Tek oturumluk görsel anlatı", text: "Görüntü, kurgu ve sınırlı süreyle tamamlanan bir deneyim istiyorsan film veya kısa film senaryosu mantığını incele." },
      { title: "Devam eden hikâye motoru", text: "Karakter ve çatışmanın bölümden bölüme yeniden üretebildiği bir yapı istiyorsan dizi senaryosu ve sezon mimarisi gerekir." },
      { title: "Canlı performans", text: "Oyuncu, sahne mekânı, giriş-çıkış ve seyirciyle aynı anda yaşanan deneyim önemliyse tiyatro yazarlığına yönel." },
      { title: "Ses veya gerçeklik", text: "Görüntüsüz anlatım için radyo tiyatrosu ve podcast; araştırma, tanık, arşiv ve gerçek kişilerle çalışmak için belgesel senaryosu farklı disiplin ister." },
    ],
    learningPath: [
      { title: "Premis ve formatı eşleştir", text: "Hikâyenin neden özellikle bu mecrada anlatılması gerektiğini belirle." },
      { title: "Beat / sekans / bölüm motorunu kur", text: "Sürenin içinde dramatik ilerlemeyi haritala." },
      { title: "Sahne yaz", text: "Amaç, engel, eylem, alt metin ve sahne çıkışını birlikte çalıştır." },
      { title: "Format belgesini düzenle", text: "Senaryo biçimi, ses notasyonu, bölüm bible'ı veya prova metnini mecraya uygun hale getir." },
      { title: "Okuma / prova testi yap", text: "Metni yalnız ekranda değil sesli, süreli ve mümkünse performans üzerinden sınay." },
      { title: "Rewrite yap", text: "Tempo, üretilebilirlik, diyalog, haklar ve seyirci deneyimine göre yeniden yaz." },
    ],
    outcomeHeading: "Senaryo eğitiminden oynanabilir, çekilebilir veya kaydedilebilir bir taslakla çık",
    outcomeIntro: "Eğitimlerin hedefi hikâye fikrini senaryo formatına sokmak değil; seçtiğin mecranın gerçek çalışma kurallarına göre üretime yaklaşan bir metin oluşturmaktır.",
    outcomes: [
      "Premis / logline ve format vaadi",
      "Beat, sekans, bölüm veya perde planı",
      "Format kurallarına uygun örnek sahne / segment",
      "Prova, süre ve rewrite kontrol listesi",
    ],
  },
  {
    category: "Akademik",
    slug: "akademik",
    href: "/yazarlar-icin/akademik",
    title: "Akademik",
    cardText: "Makale, tez, araştırma, bildiri ve akademik inceleme eğitimlerini keşfet.",
    lead: "İyi akademik metin, bilgiyi yalnız toplamaz; soruyu yöntem ve kanıtla cevaplar.",
    definition: "Akademik yazım; araştırma sorusunu, yöntemi, kaynakları, bulguları ve gerekçeli sonucu açık bir yapı içinde birleştirir. Metnin güvenilirliği yalnız ne söylediğine değil, bunu hangi kanıtla ve nasıl temellendirdiğine bağlıdır.",
    difference: "Makale, tez, bildiri, vaka analizi ve araştırma aynı amacı taşımaz. Uzunluk, yöntem, kaynak kullanımı, bölüm yapısı ve kanıt yükü çalışma türüne göre değişir.",
    invitation: "Tür menüsünden hazırlayacağın akademik çalışma biçimini seç ve araştırma sorusundan kaynak düzenine, taslaktan son kontrole kadar ilgili eğitime geç.",
    promise: "Akademik kategoride hedef metni akademik gösteren bir dil üretmek değil; araştırma sorusu, yöntem, kanıt, analiz ve sınırlar arasında denetlenebilir bir düşünce zinciri kurmaktır.",
    foundations: [
      { title: "Araştırma sorusu", text: "Geniş bir konuyu gerçekten cevaplanabilir, kapsamı belli ve yöntemle ilişkilendirilebilir bir soruya indir." },
      { title: "Kaynak ve literatür", text: "Kaynak toplamayı özet yığınına çevirmeden, alanın ne bildiğini, nerede ayrıştığını ve hangi boşluğu bıraktığını haritala." },
      { title: "Yöntem ve kanıt", text: "Veriyi, örneklemi, ölçümü veya vaka seçimlerini soruya bağla; bulgu ile yorum arasındaki sınırı koru." },
      { title: "Şeffaflık ve etik", text: "Atıf, veri, sınırlılık, çıkar çatışması, insan katılımcı ve yeniden üretilebilirlik gibi sorumlulukları son kontrol değil tasarım aşamasında düşün." },
    ],
    choiceHeading: "Çalışma türünü teslim formatına değil, araştırma görevinin büyüklüğüne göre seç",
    choiceIntro: "Akademik biçimler birbirinin kısa veya uzun versiyonu değildir. Her biri farklı araştırma yükü, kanıt seviyesi ve sunum amacı taşır.",
    choiceSignals: [
      { title: "Sınırlı ve yayımlanabilir bulgu", text: "Tek bir araştırma sorusunu yoğun biçimde raporlamak istiyorsan makale; doğrudan araştırma tasarımı ve veri sürecini kurmak istiyorsan araştırma eğitimiyle başla." },
      { title: "Uzun soluklu özgün çalışma", text: "Literatür, yöntem, veri, analiz ve savunmayı geniş kapsamda birleştireceksen tez kendi planlama disiplinini gerektirir." },
      { title: "Kısa bilimsel sunum", text: "Bir çalışmayı sınırlı sürede aktaracak, özetleyecek ve soru-cevapta savunacaksan bildiri formatı farklı hazırlanır." },
      { title: "Vaka veya literatür sentezi", text: "Tekil bir vakayı çoklu kanıtla incelemek için vaka analizi; alan yazınını sistematik biçimde değerlendirmek için akademik inceleme seç." },
    ],
    learningPath: [
      { title: "Soruyu ve kapsamı kilitle", text: "Neyi cevaplayacağını ve neyi dışarıda bıraktığını yaz." },
      { title: "Literatür haritasını kur", text: "Ana görüşleri, kanıtları ve boşlukları ilişkilendir." },
      { title: "Yöntemi planla", text: "Veri, örneklem, ölçüm veya inceleme protokolünü soruya bağla." },
      { title: "Bulguyu analizden ayır", text: "Ne gördüğünü ve bunun ne anlama geldiğini açıkça ayrıştır." },
      { title: "Metni argüman olarak yaz", text: "Her bölüm bir sonraki iddiayı gerekçelendirsin." },
      { title: "Atıf, etik ve sınır kontrolü yap", text: "Kaynak, veri, yöntem ve sonuçların izlenebilirliğini son kez doğrula." },
    ],
    outcomeHeading: "Akademik eğitimden savunulabilir bir araştırma planı ve yazım sistemiyle çık",
    outcomeIntro: "Amaç yalnız bölüm başlıklarını öğrenmek değil; başka bir araştırmacının nasıl düşündüğünü, hangi kaynağa dayandığını ve nerede sınır koyduğunu takip edebileceği bir çalışma kurmaktır.",
    outcomes: [
      "Net araştırma sorusu ve kapsam cümlesi",
      "Kaynak / literatür matrisi",
      "Yöntem, veri ve analiz planı",
      "Taslak, atıf, etik ve savunma kontrol listesi",
    ],
  },
  {
    category: "Bilgilendirici",
    slug: "bilgilendirici",
    href: "/yazarlar-icin/bilgilendirici",
    title: "Bilgilendirici",
    cardText: "Tarih, psikoloji, teknoloji, finans ve diğer bilgi odaklı yazı eğitimlerini keşfet.",
    lead: "Bilgiyi aktarmak yetmez; okurun anlayabileceği bir yol kurmak gerekir.",
    definition: "Bilgilendirici eserler; uzmanlık, araştırma veya deneyimi okurun takip edebileceği bir yapıya dönüştürür. Güçlü bir metin neyi açıklayacağını, hangi sırayla açıklayacağını ve hangi iddianın hangi kaynağa dayanacağını bilir.",
    difference: "Tarih, psikoloji, hukuk, teknoloji, finans veya gastronomi aynı anlatım sorumluluğuna sahip değildir. Kaynak türü, örnek kullanımı, teknik dil ve okura verilen bağlam konu alanına göre değişir.",
    invitation: "Tür menüsünden yazacağın bilgi alanını seç ve içeriği araştırmadan bölümlendirmeye, örneklerden son kontrole kadar ilgili eğitime geç.",
    promise: "Bilgilendirici kategoride amaç uzman gibi görünmek değil; okura güvenilir, anlaşılır ve izlenebilir bilgi sunmaktır. Alanın riskine göre kaynak kalitesi, güncellik, belirsizlik ve güvenlik sorumluluğu eğitimin bir parçasıdır.",
    foundations: [
      { title: "Okur ihtiyacı", text: "Okurun hangi soruyla geldiğini, ne bildiğini ve metin bittiğinde neyi anlayabilmesi veya yapabilmesi gerektiğini tanımla." },
      { title: "İddia ve kaynak", text: "Her güçlü iddianın dayanağını görünür kıl; görüş, örnek, veri, araştırma ve resmî kaynağı birbirinin yerine kullanma." },
      { title: "Açıklama mimarisi", text: "Karmaşık konuyu önkoşul, kavram, örnek, karşı örnek ve uygulama sırasıyla okurun zihninde yeniden kur." },
      { title: "Risk ve güncellik", text: "Sağlık, hukuk, finans, siyaset, yapay zekâ veya seyahat gibi değişken alanlarda tarih, yetki alanı, belirsizlik ve güvenlik sınırlarını açıkça yönet." },
    ],
    choiceHeading: "Alanını yalnız bildiğin konuya göre değil, taşıdığı doğruluk ve risk yüküne göre seç",
    choiceIntro: "Bilgilendirici yazıda form kadar sorumluluk da değişir. Bir tarih kitabının kaynak problemi ile sağlık veya finans metninin yanlış yönlendirme riski aynı değildir.",
    choiceSignals: [
      { title: "İnsan ve toplum", text: "Tarih, felsefe, psikoloji, sosyoloji, siyaset, iletişim, din ve inanç gibi alanlarda bağlam, kaynak çoğulluğu ve temsil özellikle önemlidir." },
      { title: "Karar ve yüksek risk", text: "Sağlık, hukuk ve finans gibi alanlarda güncellik, yetki sınırı, uzman kaynak ve yanlış yönlendirmeyi önleyen dil daha yüksek standart ister." },
      { title: "Teknik ve hızlı değişen alan", text: "Teknoloji, yapay zekâ ve programlamada sürüm, test edilebilir örnek, sınırlılık ve hızlı eskime riski yazım planının parçasıdır." },
      { title: "Pratik yaşam ve uygulama", text: "İş dünyası, girişimcilik, eğitim, spor, gastronomi ve seyahatte örneklerin uygulanabilirliği, güvenliği ve bağlamı ayrıca test edilmelidir." },
    ],
    learningPath: [
      { title: "Okur sorusunu tanımla", text: "Metnin cevaplayacağı somut ihtiyacı yaz." },
      { title: "Kaynak hiyerarşisini kur", text: "Hangi iddia için hangi kaynak düzeyinin gerektiğini belirle." },
      { title: "Kavram sırasını tasarla", text: "Okurun bilmediği şeyi, bildiği şeyin üzerine adım adım kur." },
      { title: "Örnek ve karşı örnek ekle", text: "Soyut bilgiyi yanlış genelleme üretmeden görünür hale getir." },
      { title: "Risk / güncellik kontrolü yap", text: "Tarih, sürüm, ülke, istisna ve belirsizlikleri doğrula." },
      { title: "Okunabilirlik revizyonu yap", text: "Jargonu, gereksiz otorite dilini ve açıklama boşluklarını temizle." },
    ],
    outcomeHeading: "Bilgilendirici eğitimden kaynaklı, kontrollü ve öğretilebilir bir eser planıyla çık",
    outcomeIntro: "Hedef konu hakkında çok şey söylemek değil; okurun güvenle takip edebileceği ve iddiaların nereden geldiğini görebileceği bir bilgi sistemi kurmaktır.",
    outcomes: [
      "Okur sorusu ve kapsam belgesi",
      "İddia–kaynak / güncellik matrisi",
      "Bölüm ve açıklama sırası",
      "Alan riskine göre doğruluk ve son kontrol listesi",
    ],
  },
  {
    category: "Çocuk ve Gençlik",
    slug: "cocuk-ve-genclik",
    href: "/yazarlar-icin/cocuk-ve-genclik",
    title: "Çocuk ve Gençlik",
    cardText: "Masal, çocuk hikâyesi, çocuk romanı ve genç yetişkin eğitimlerini keşfet.",
    lead: "Yaşa göre sadeleştirmek değil, doğru okura doğru anlatım kurmaktır.",
    definition: "Çocuk ve gençlik yazarlığı; yaş, gelişim düzeyi, dil, ritim, tema ve karakter bakışını birlikte düşünür. Okurun yaşı küçüldükçe hikâyenin değeri küçülmez; yalnız anlatımın sorumluluğu değişir.",
    difference: "Masal, fabl, çocuk hikâyesi, çocuk romanı ve genç yetişkin metni; uzunluk, kelime seçimi, çatışma yoğunluğu, anlatıcı ve duygusal karmaşıklık bakımından farklı çalışır.",
    invitation: "Tür menüsünden hedeflediğin yaş ve eser biçimini seç; o okura uygun fikir, karakter, yapı, dil ve revizyon eğitimine geç.",
    promise: "Bu kategoride amaç yetişkin metnini basitleştirmek değil; çocuğun veya gencin dünyayı algılama biçimine saygı duyan, yaşa uygun ama edebî olarak güçlü bir eser kurmaktır. Ajans, güvenlik, temsil ve okuma bağlamı yazının merkezindedir.",
    foundations: [
      { title: "Gerçek okur profili", text: "Yaş etiketinin ötesinde bağımsız okuma, dinleme, kelime düzeyi, dikkat süresi ve duygusal deneyimi düşün." },
      { title: "Çocuk ve genç ajansı", text: "Sorunu sürekli yetişkinlerin çözmediği, genç karakterin seçimlerinin sonucu değiştirdiği bir yapı kur." },
      { title: "Duygusal güvenlik", text: "Korku, kayıp, zorbalık, ruh sağlığı, ilişki ve cinsellik gibi konularda yaşa uygun mesafe, dil ve destek çerçevesi kullan." },
      { title: "Dil, ritim ve görsel ilişki", text: "Cümle uzunluğu kadar sesli okuma, tekrar, sayfa ritmi ve resmin taşıyacağı bilgi de metin kararını belirlesin." },
    ],
    choiceHeading: "Türünü yalnız yaşa göre değil, okurun metinle nasıl ilişki kuracağına göre seç",
    choiceIntro: "Aynı yaş grubuna yazılan iki eser bile farklı okuma deneyimi isteyebilir. Dinlenen masal, bağımsız okunan roman ve bilgi öğreten çocuk kitabı aynı eğitim değildir.",
    choiceSignals: [
      { title: "Büyülü ve sözlü anlatı", text: "Tekrar, motif, olağanüstü kural ve sesli okuma önemliyse masal; kısa davranış ve sonuç modeliyle çalışıyorsan fabl daha yakın olabilir." },
      { title: "Gündelik çocuk deneyimi", text: "Somut bir sorun ve kısa değişim için çocuk hikâyesi; daha uzun karakter yayı ve bölüm yapısı için çocuk romanı düşün." },
      { title: "Ergenlik ve bağımsızlaşma", text: "Kimlik, aidiyet, ilişki, güç, rıza ve yetişkinliğe geçiş meseleleri merkezdeyse genç yetişkin kendi etik ve dramatik çerçevesini gerektirir." },
      { title: "Öğretme amacı", text: "Temel amaç bir kavramı öğretmekse eğitici çocuk kitabında bilgi doğruluğu, bilişsel yük, etkinlik ve görsel öğretim tasarımı öne çıkar." },
    ],
    learningPath: [
      { title: "Okuru tanımla", text: "Yaş, okuma biçimi, dil ve duygusal bağlamı netleştir." },
      { title: "Eser vaadini kur", text: "Çocuk veya genç okurun yaşayacağı merak, duygu ya da öğrenme deneyimini tek cümlede yaz." },
      { title: "Ajansı karaktere ver", text: "Ana değişimin karakterin seçimiyle gerçekleşmesini sağla." },
      { title: "Yapı ve dili birlikte tasarla", text: "Sahne, bölüm, tekrar ve kelime düzeyini okur profiline göre düzenle." },
      { title: "Güvenlik ve temsil turu yap", text: "Yaş hassasiyeti, güç ilişkisi, stereotip ve bilgi doğruluğunu ayrı kontrol et." },
      { title: "Gerçek okuma testi yap", text: "Sesli okuma, yaş grubu geri bildirimi veya hedef okura uygun beta okuma ile metni sınay." },
    ],
    outcomeHeading: "Çocuk ve Gençlik eğitiminden yaş etiketi değil, gerçek bir okur tasarımıyla çık",
    outcomeIntro: "Eğitim sonunda yalnız ‘çocuklar için’ yazdığını söylemek yerine hangi okura, hangi deneyimi, hangi güvenlik ve dil kararlarıyla sunduğunu açıkça tanımlayabilmelisin.",
    outcomes: [
      "Hedef okur ve okuma bağlamı profili",
      "Dil, ritim, ajans ve duygusal yoğunluk kuralları",
      "Sahne / bölüm / öğrenme akışı planı",
      "Yaş uygunluğu, temsil ve güvenlik revizyon listesi",
    ],
  },
  {
    category: "Çizgi Anlatı",
    slug: "cizgi-anlati",
    href: "/yazarlar-icin/cizgi-anlati",
    title: "Çizgi Anlatı",
    cardText: "Çizgi roman, grafik roman, manga, webtoon ve karikatür eğitimlerini keşfet.",
    lead: "Hikâye burada yalnız cümlelerle değil, görüntü ve boşlukla da anlatılır.",
    definition: "Çizgi anlatı; metin, görsel, kadraj, panel, geçiş ve ritmi tek anlatım sistemi içinde birleştirir. Bir sahnenin ne kadarının yazıyla, ne kadarının görüntüyle anlatılacağı eserin temposunu ve okurun deneyimini değiştirir.",
    difference: "Çizgi roman ve grafik roman sayfa kompozisyonuyla, manga farklı okuma ve görsel ritim gelenekleriyle, webtoon dikey akışla, karikatür ise yoğunlaştırılmış tek fikir veya kısa sekansla çalışabilir.",
    invitation: "Tür menüsünden kullanacağın çizgi anlatı biçimini seç ve senaryodan panel akışına, ritimden revizyona kadar ilgili eğitime geç.",
    promise: "Çizgi Anlatı kategorisinde metin ile görselin görevini ayırmayı, zamanı panel ve boşlukla yönetmeyi ve hikâyeyi seçtiğin yayın yüzeyine göre tasarlamayı öğrenirsin. Amaç resim tarif eden bir senaryo değil, görsel olarak okunabilen bir anlatı sistemi kurmaktır.",
    foundations: [
      { title: "Görsel dramatizasyon", text: "Anlatıcının söyleyebileceği bilgiyi kadraj, beden dili, nesne, mekân ve görsel karşıtlıkla anlatmayı öğren." },
      { title: "Panel ve zaman", text: "Panel boyutu, geçiş türü, boşluk ve sayfa çevrimiyle hız, duraklama, sürpriz ve vurgu üret." },
      { title: "Metin–görsel iş bölümü", text: "Balon, caption ve çizimin aynı bilgiyi tekrar etmesini önle; her katmana ayrı anlatı görevi ver." },
      { title: "Yayın yüzeyi", text: "Basılı sayfa, sağdan sola okuma, dikey scroll veya tek kare gibi yüzeylerin ritim ve kompozisyonu nasıl değiştirdiğini hesaba kat." },
    ],
    choiceHeading: "Formatını çizim stiline göre değil, okuma yüzeyine ve ritmine göre seç",
    choiceIntro: "Çizgi Roman, Grafik Roman, Manga, Webtoon ve Karikatür arasındaki fark yalnız estetik değildir; sayfa, yön, süre, seri yapısı ve üretim modeli değişir.",
    choiceSignals: [
      { title: "Bölümlü sayfa anlatısı", text: "Panel sekansı, sayfa çevrimi ve seri ritmi önemliyse çizgi roman; uzun soluklu, kitap bütünlüğü ve tematik motifler ağır basıyorsa grafik roman düşün." },
      { title: "Manga ritmi ve okuma dili", text: "Sağdan sola yön, ma/sessizlik, reaksiyon ritmi ve manga üretim geleneklerini bilinçli kullanacaksan manga ayrı bir anlatı eğitimi gerektirir." },
      { title: "Mobil dikey okuma", text: "Okur deneyimi ekran viewport'u, scroll mesafesi, mobil yazı boyutu ve bölüm kancalarıyla kurulacaksa webtoon mantığına geç." },
      { title: "Yoğunlaştırılmış fikir", text: "Tek kare veya kısa sekansla mizah, eleştiri ya da gözlem üretmek istiyorsan karikatürde kurulum, yön değiştirme, hedef ve etik hassasiyeti öne çıkar." },
    ],
    learningPath: [
      { title: "Görsel premisi kur", text: "Hikâyenin görüntüyle anlatılacak ana çatışmasını belirle." },
      { title: "Beat'leri görsel ana çevir", text: "Her dramatik değişimin hangi panel, kare veya scroll anında gerçekleşeceğini planla." },
      { title: "Thumbnail / akış çıkar", text: "Metni detaylandırmadan önce sayfa veya dikey akışı küçük taslaklarla test et." },
      { title: "Senaryo ve balonları yaz", text: "Çizere gerekli bilgiyi ver, ancak çizimi gereksiz mikro yönetimle kilitleme." },
      { title: "Okunabilirliği test et", text: "Balon sırası, tipografi, yön, panel geçişi ve ekrandaki ilk görünümü kontrol et." },
      { title: "Üretim gerçekliğine göre revize et", text: "Sayfa sayısı, seri takvimi, buffer, ekip akışı ve teslim formatını hesaba kat." },
    ],
    outcomeHeading: "Çizgi Anlatı eğitiminden görsel olarak çalışabilen bir anlatı prototipiyle çık",
    outcomeIntro: "Amaç yalnız çizgi anlatı terminolojisini bilmek değil; bir fikri panel, sayfa veya scroll üzerinden okunabilir hale getiren gerçek üretim kararlarını verebilmektir.",
    outcomes: [
      "Görsel premis ve format vaadi",
      "Panel / sayfa / scroll akış haritası",
      "Balon, caption ve görsel görev planı",
      "Okunabilirlik, ritim ve üretim revizyon listesi",
    ],
  },
] as const;

export function getWritingCategoryHub(slug: string): WritingCategoryHub {
  const hub = WRITING_CATEGORY_HUBS.find((item) => item.slug === slug);
  if (!hub) throw new Error(`Writing category hub definition missing: ${slug}`);
  return hub;
}
