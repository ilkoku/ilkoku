export const READER_EDUCATION_VISUAL_SLOTS = [
  {
    key: "hero",
    number: "01",
    label: "Hero",
    description: "Eğitimin ana fikrini ve okuma bağlamını kuran üst görsel",
    recommendedWidth: 1600,
    recommendedHeight: 900,
    aspectRatio: "16:9",
    fit: "contain",
    automation: "Oranı korur; crop yapmaz; kaynak çözünürlüğün altına düşürmez.",
  },
  {
    key: "learningPath",
    number: "02",
    label: "Öğrenme Yolu",
    description: "Eğitimin aşamalarını ve okurun ilerleme hattını anlatan görsel",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Akışın tamamını kesmeden ve kaynak kaliteyi değiştirmeden gösterir.",
  },
  {
    key: "analysis",
    number: "03",
    label: "Analiz",
    description: "Ana kavramları, ilişkileri veya çözümleme mantığını anlatan görsel",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Etiketleri ve küçük ayrıntıları kırpmadan gösterir.",
  },
  {
    key: "example",
    number: "04",
    label: "Örnek",
    description: "Örnek metin, okuma vakası veya çözümleme çalışması görseli",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Örnek içeriğin tamamını oranını bozmadan gösterir.",
  },
  {
    key: "practice",
    number: "05",
    label: "Uygulama",
    description: "Okurun öğrendiğini denediği alıştırma veya çalışma görseli",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Çalışma adımlarını eksiksiz ve kaynak kalitesini koruyarak gösterir.",
  },
  {
    key: "finalCta",
    number: "06",
    label: "Final CTA",
    description: "Eğitimi İlkOku içindeki gerçek okuma davranışına bağlayan kapanış görseli",
    recommendedWidth: 1500,
    recommendedHeight: 1000,
    aspectRatio: "3:2",
    fit: "contain",
    automation: "Kapanış mesajını ve arayüz ayrıntılarını kesmeden gösterir.",
  },
] as const;

export type ReaderEducationVisualSlotKey = (typeof READER_EDUCATION_VISUAL_SLOTS)[number]["key"];
export type ReaderEducationVisualFit = (typeof READER_EDUCATION_VISUAL_SLOTS)[number]["fit"];

type ReaderEducationItem = {
  title: string;
  text: string;
};

export type ReaderEducationCategory = {
  slug: string;
  number: string;
  title: string;
  shortDescription: string;
  lead: string;
  promise: string;
  seoTitle: string;
  seoDescription: string;
  benefits: readonly ReaderEducationItem[];
  learningPath: readonly ReaderEducationItem[];
  concepts: readonly ReaderEducationItem[];
  example: {
    heading: string;
    text: string;
    questions: readonly string[];
  };
  practice: {
    heading: string;
    text: string;
    steps: readonly string[];
  };
  application: {
    heading: string;
    text: string;
    href: string;
    label: string;
  };
};

export const READER_EDUCATION_CATEGORIES = [
  {
    slug: "okumaya-baslama",
    number: "01",
    title: "Okumaya Başlama",
    shortDescription: "Ne okuyacağını seç, kendi okuma düzenini ve sürdürülebilir okuma alışkanlığını oluştur.",
    lead: "Okuma alışkanlığı, yalnızca daha fazla sayfa çevirmek değil; doğru eseri doğru beklentiyle seçip dikkatini sürdürebileceğin bir düzen kurmaktır.",
    promise: "Bu eğitim, rastgele kitap seçmekten bilinçli eser seçimine; ertelemekten uygulanabilir bir okuma planına geçmeni sağlar.",
    seoTitle: "Okumaya Başlama Eğitimi | İlkOku Okurluk Okulu",
    seoDescription: "Eser seçimi, okuma amacı, odaklanma ve sürdürülebilir okuma alışkanlığı için adım adım İlkOku okur eğitimi.",
    benefits: [
      { title: "Doğru eser seçimi", text: "İlgi, amaç, zorluk seviyesi ve mevcut zamanına göre hangi eserin sana uygun olduğunu ayırt et." },
      { title: "Gerçekçi okuma planı", text: "Sayfa hedefi yerine sürdürülebilir zaman ve dikkat bloklarıyla kendine uygun bir ritim kur." },
      { title: "Yarım bırakma kararı", text: "Bir eseri neden bıraktığını anlayıp suçluluk yerine bilinçli seçim yapmayı öğren." },
      { title: "Okuma hafızası", text: "Bitirdiğin eserleri hatırlamak ve sonraki seçimlerini iyileştirmek için basit kayıt yöntemleri kullan." },
    ],
    learningPath: [
      { title: "Neden okuyorsun?", text: "Keyif, öğrenme, araştırma veya keşif amacını belirle." },
      { title: "Eseri tanı", text: "Tür, uzunluk, anlatım yoğunluğu ve beklentiyi okumadan önce değerlendir." },
      { title: "Zamanını seç", text: "Günün dikkatinin daha güçlü olduğu kısa ama tekrar edilebilir bir okuma alanı oluştur." },
      { title: "İlk temasını yap", text: "İlk bölümde ritim, dil ve merak düzeyini gözlemle." },
      { title: "Devam kararını ver", text: "Zorlanma ile uyumsuzluğu birbirinden ayır ve bilinçli devam et." },
      { title: "Okuma izini tut", text: "Bitirdiğin ya da bıraktığın eserden tek cümlelik bir öğrenme notu çıkar." },
    ],
    concepts: [
      { title: "Amaç", text: "Aynı eser keyif için, araştırma için veya eleştirel inceleme için farklı biçimde okunabilir." },
      { title: "Beklenti", text: "Kapak, tür ve tanıtım metni beklenti kurar; okur bu beklentinin metinle uyuşup uyuşmadığını fark etmelidir." },
      { title: "Ritim", text: "Her kitabın ve her okurun temposu farklıdır. Hız değil, sürdürülebilir dikkat önceliklidir." },
      { title: "Seçim", text: "Bir eseri bırakmak başarısızlık değildir; neden bıraktığını bilmek sonraki seçimi güçlendirir." },
    ],
    example: {
      heading: "İki eser arasında nasıl seçim yapılır?",
      text: "Bir okurun akşamları yalnızca yirmi dakikası olduğunu düşün. 700 sayfalık yoğun bir tarih incelemesi ile kısa bölümlü bir roman arasında seçim yaparken yalnız ilgi değil; mevcut zaman, amaç ve zihinsel enerji de karara katılır.",
      questions: ["Bu eseri neden şimdi okumak istiyorum?", "Bu hafta ne kadar kesintisiz zamanım var?", "Metnin dili ve yapısı şu anki dikkatime uygun mu?"],
    },
    practice: {
      heading: "Kendi okuma başlangıç planını kur",
      text: "Bir sonraki eserin için on dakikada uygulanabilecek küçük bir başlangıç planı hazırla.",
      steps: ["Okuma amacını tek cümleyle yaz.", "Eserden beklentini üç kelimeyle tanımla.", "Haftada üç gerçekçi okuma zamanı seç.", "İlk 30–50 sayfa sonunda devam kararını hangi ölçüte göre vereceğini belirle."],
    },
    application: { heading: "Şimdi bir eser seç ve başla.", text: "Öğrendiğin seçim ölçütlerini İlkOku’daki gerçek eserlerde dene; türleri karşılaştır ve sana uygun ilk okumayı seç.", href: "/kesfet", label: "Eserleri keşfet" },
  },
  {
    slug: "aktif-okuma",
    number: "02",
    title: "Aktif Okuma",
    shortDescription: "Metni yalnız takip etme; soru sor, not al, bağlantı kur ve okuduklarınla çalış.",
    lead: "Aktif okuma, metnin içinden geçmek yerine metinle sürekli küçük kararlar ve sorular üzerinden ilişki kurmaktır.",
    promise: "Bu eğitim, önemli ayrıntıları fark etmeni, notlarını anlamlı hâle getirmeni ve bölüm sonunda ne okuduğunu kendi sözlerinle kurmanı sağlar.",
    seoTitle: "Aktif Okuma Eğitimi | İlkOku Okurluk Okulu",
    seoDescription: "Not alma, soru sorma, önemli noktaları ayırma ve okuma günlüğüyle aktif okuma becerilerini geliştirin.",
    benefits: [
      { title: "Soru üretmek", text: "Metnin sana verdiği bilgiden yeni sorular çıkararak merakı canlı tut." },
      { title: "Seçici not almak", text: "Her cümleyi işaretlemek yerine dönüş noktalarını, fikirleri ve tekrar eden izleri yakala." },
      { title: "Bağlantı kurmak", text: "Yeni bilgiyi önceki bölüm, başka bir eser veya kendi bilginle ilişkilendir." },
      { title: "Bölüm özeti", text: "Bir bölümü birkaç cümlede kendi dilinle yeniden kurarak anlayıp anlamadığını test et." },
    ],
    learningPath: [
      { title: "Ön bakış", text: "Başlık, bölüm adı ve ilk paragraftan beklenti üret." },
      { title: "Soru sor", text: "Karakter, fikir veya olay hakkında cevabını metinde arayacağın bir soru belirle." },
      { title: "İşaretle", text: "Yalnız işlevi olan ayrıntıları kısa bir sistemle ayır." },
      { title: "Bağla", text: "Yeni ayrıntının önceki bilgiyle ilişkisini kur." },
      { title: "Özetle", text: "Bölümün ne değiştirdiğini kendi sözlerinle yaz." },
      { title: "Geri dön", text: "Tahminlerinin ve sorularının hangilerinin değiştiğini kontrol et." },
    ],
    concepts: [
      { title: "Sinyal", text: "Tekrar edilen nesne, ifade veya davranış ileride anlam kazanabilecek bir sinyaldir." },
      { title: "Soru", text: "İyi okur sorusu cevabı hemen istemez; metnin hangi bilgiyi ne zaman verdiğini takip eder." },
      { title: "Not", text: "Not, metnin kopyası değil; okurun metinle kurduğu ilişkinin kısa kaydıdır." },
      { title: "Tahmin", text: "Tahmin yapmak doğru çıkmak için değil, metnin ipuçlarını ne kadar gördüğünü sınamak içindir." },
    ],
    example: {
      heading: "Bir paragrafı pasif okumadan aktif okumaya çevir",
      text: "Karakterin aynı kapıyı üçüncü kez kilitlemesini yalnız olay olarak görme. ‘Neden tekrar ediyor?’, ‘Korku mu, alışkanlık mı?’, ‘Bu ayrıntı daha önce görüldü mü?’ soruları ayrıntıyı işleve dönüştürür.",
      questions: ["Bu ayrıntı neden burada?", "Daha önce buna benzeyen ne gördüm?", "Bu bilgi beklentimi nasıl değiştirdi?"],
    },
    practice: {
      heading: "Bir bölüm için üç katmanlı not tut",
      text: "Okuduğun kısa bir bölümde olayı, sorunu ve kendi yorumunu birbirinden ayır.",
      steps: ["Ne oldu? Tek cümle yaz.", "Bende hangi soru kaldı? Tek soru yaz.", "Hangi ayrıntı önemli olabilir? Bir işaret seç.", "Bölüm sonunda ilk tahmininin değişip değişmediğini not et."],
    },
    application: { heading: "Aktif okumayı gerçek bir eserde dene.", text: "İlkOku’da bir eser seç; bir bölüm boyunca yalnız üç anlamlı not çıkar ve bölüm sonunda kendi özetini oluştur.", href: "/kesfet", label: "Okumaya geç" },
  },
  {
    slug: "edebi-okuma",
    number: "03",
    title: "Edebi Okuma",
    shortDescription: "Anlatıcıyı, temayı, sembolleri, motifleri ve alt metni görmeyi öğren.",
    lead: "Edebi okuma, yalnız ‘ne oldu?’ sorusunu değil; metnin bunu kimin sesiyle, hangi seçimlerle ve hangi anlam katmanlarıyla anlattığını da izler.",
    promise: "Bu eğitim, anlatı tekniğini fark etmeyi ve yorumunu metindeki somut işaretlerle desteklemeyi öğretir.",
    seoTitle: "Edebi Okuma Eğitimi | İlkOku Okurluk Okulu",
    seoDescription: "Anlatıcı, bakış açısı, tema, motif, sembol, metafor, alt metin ve üslubu çözümlemek için edebi okuma eğitimi.",
    benefits: [
      { title: "Anlatıcıyı ayırmak", text: "Yazar, anlatıcı ve karakter sesinin aynı şey olmadığını gör." },
      { title: "Temayı izlemek", text: "Temayı tek kelimelik konu yerine metnin tekrar tekrar sınadığı bir düşünce olarak oku." },
      { title: "Sembol ve motifi ayırmak", text: "Tekrarlanan öğelerin metinde nasıl yeni anlam kazandığını takip et." },
      { title: "Alt metni görmek", text: "Karakterlerin söylemediği ama davranış, suskunluk ve seçimlerle kurduğu anlamı fark et." },
    ],
    learningPath: [
      { title: "Sesi belirle", text: "Kim anlatıyor ve neyi bilebiliyor?" },
      { title: "Bakış açısını izle", text: "Okura hangi bilgiler açılıyor, hangileri saklanıyor?" },
      { title: "Tekrarları yakala", text: "Sözcük, nesne, renk, mekân veya davranış tekrarlarını not et." },
      { title: "Karşıtlıkları bul", text: "Özgürlük–kontrol, aidiyet–yalnızlık gibi gerilimleri belirle." },
      { title: "Alt metni kur", text: "Söylenenle yapılan arasındaki boşluğu incele." },
      { title: "Yorumunu kanıtla", text: "Çıkarımını en az iki metinsel işaretle destekle." },
    ],
    concepts: [
      { title: "Anlatıcı", text: "Hikâyeyi aktaran sesin bilgisi, güvenilirliği ve mesafesi okurun gördüğü dünyayı belirler." },
      { title: "Tema", text: "Tema ‘aşk’ gibi tek sözcük değil; metnin aşk hakkında sorduğu veya sınadığı düşüncedir." },
      { title: "Motif", text: "Tekrar eden öğe, farklı bağlamlarda geri gelerek anlam ağı kurabilir." },
      { title: "Alt metin", text: "Karakterin söylediğiyle istediği şey farklı olduğunda anlam sözlerin altında oluşur." },
    ],
    example: {
      heading: "Aynı cümle neden iki farklı anlam taşıyabilir?",
      text: "‘Geç kaldın’ cümlesi tek başına basittir. Ancak kapıda bekleyen bir karakter, masada soğumuş iki tabak ve cevap vermeyen anlatı kişisiyle birlikte okunduğunda kırgınlık, korku veya terk edilme duygusu alt metinde kurulabilir.",
      questions: ["Söylenen ile hissedilen aynı mı?", "Mekândaki hangi ayrıntı yorumu destekliyor?", "Anlatıcı bize neyi göstermiyor?"],
    },
    practice: {
      heading: "Bir sahneyi dört katmanda çöz",
      text: "Kısa bir sahne seç ve olayın ötesindeki anlamı dört ayrı gözle incele.",
      steps: ["Anlatıcı ve bakış açısını yaz.", "Tekrar eden bir ayrıntı seç.", "Karşıtlık veya gerilimi belirle.", "Yorumunu iki somut işaretle destekle."],
    },
    application: { heading: "Bir eserin görünmeyen katmanlarını ara.", text: "İlkOku’da bir bölüm seç; anlatıcı, tekrar ve alt metin için üç ayrı işaret bulup kendi yorumunu oluştur.", href: "/kesfet", label: "Bir eser seç" },
  },
  {
    slug: "karakter-ve-hikaye-analizi",
    number: "04",
    title: "Karakter ve Hikâye Analizi",
    shortDescription: "Karakterleri, çatışmayı, olay örgüsünü ve dönüşümün nedenlerini çözümle.",
    lead: "Bir hikâyeyi anlamak için yalnız olay sırasını bilmek yetmez; karakterin ne istediğini, neyle karşılaştığını ve kararlarının hikâyeyi nasıl değiştirdiğini görmek gerekir.",
    promise: "Bu eğitim, karakter davranışlarını gerekçeleriyle okumayı ve olay örgüsünün neden çalışıp çalışmadığını analiz etmeyi öğretir.",
    seoTitle: "Karakter ve Hikâye Analizi | İlkOku Okurluk Okulu",
    seoDescription: "Karakter motivasyonu, çatışma, dönüşüm, olay örgüsü, dönüm noktaları ve finali çözümlemek için okur eğitimi.",
    benefits: [
      { title: "Motivasyonu görmek", text: "Karakterin söylediği hedef ile asıl ihtiyacını birbirinden ayır." },
      { title: "Çatışmayı çözmek", text: "Engelin yalnız dışarıdan mı geldiğini, yoksa karakterin içinde de bir karşılığı olup olmadığını incele." },
      { title: "Dönüşümü izlemek", text: "Kararların karakteri ve hikâyenin yönünü nasıl değiştirdiğini takip et." },
      { title: "Finali değerlendirmek", text: "Sonucun önceki seçimlerden doğup doğmadığını ve hikâyenin vaatlerini karşılayıp karşılamadığını sorgula." },
    ],
    learningPath: [
      { title: "İsteği bul", text: "Karakter ne istiyor?" },
      { title: "Engeli bul", text: "Bunu elde etmesini kim veya ne zorlaştırıyor?" },
      { title: "Bedeli izle", text: "Kararların kaybettirdiği ve kazandırdığı şeyleri not et." },
      { title: "Dönüm noktalarını seç", text: "Hikâyenin geri dönülmez biçimde yön değiştirdiği anları belirle." },
      { title: "Dönüşümü ölç", text: "Başlangıçtaki karakter ile sondaki karakter arasındaki farkı karşılaştır." },
      { title: "Finali sınala", text: "Sonucun kurulan neden-sonuç zincirinden çıkıp çıkmadığını değerlendir." },
    ],
    concepts: [
      { title: "İstek", text: "Karakterin görünür hedefidir; hikâyeyi ileri iter." },
      { title: "İhtiyaç", text: "Karakterin çoğu zaman başta fark etmediği içsel değişim alanıdır." },
      { title: "Çatışma", text: "Yalnız kavga değil; iki istek, değer veya zorunluluğun aynı anda gerçekleşememesidir." },
      { title: "Neden-sonuç", text: "Güçlü olay örgüsünde sahneler yalnız sırayla gelmez; bir karar sonraki sonucu doğurur." },
    ],
    example: {
      heading: "Karakter kararı hikâyeyi nasıl değiştirir?",
      text: "Bir karakterin gerçeği saklaması yalnız karakter özelliği değildir. Bu karar başka bir karakterin yanlış seçim yapmasına, ilişkinin bozulmasına ve sonraki çatışmanın doğmasına neden oluyorsa olay örgüsünün motoruna dönüşür.",
      questions: ["Karakter başka karar verse ne değişirdi?", "Bu karar hangi korku veya arzudan doğuyor?", "Sonraki olay bu kararın doğal sonucu mu?"],
    },
    practice: {
      heading: "Bir karakter için neden-sonuç haritası çıkar",
      text: "Okuduğun eserde ana karakterin üç kritik kararını seç ve sonuçlarını birbirine bağla.",
      steps: ["Karakterin başlangıç hedefini yaz.", "Üç kritik karar seç.", "Her kararın doğurduğu sonucu yaz.", "Finalde hedefin veya karakterin nasıl değiştiğini tek cümlede özetle."],
    },
    application: { heading: "Bir karakterin yolculuğunu takip et.", text: "İlkOku’daki bir eserde ana karakterin hedefini, en büyük engelini ve ilk önemli kararını belirleyerek analize başla.", href: "/kesfet", label: "Karakter keşfet" },
  },
  {
    slug: "turleri-okumak",
    number: "05",
    title: "Türleri Okumak",
    shortDescription: "Romanı, polisiyeyi, fantastiği, distopyayı ve diğer türleri kendi okuma mantığıyla keşfet.",
    lead: "Her tür okura farklı bir söz verir. Polisiye ipuçlarıyla, fantastik kendi dünya kurallarıyla, distopya ise toplum ve güç ilişkileriyle başka bir dikkat biçimi ister.",
    promise: "Bu eğitim, tür beklentisini katı bir formül olarak değil; metnin neyi nasıl kurduğunu anlamaya yarayan bir okuma aracı olarak kullanmayı öğretir.",
    seoTitle: "Eser Türleri Nasıl Okunur? | İlkOku Okurluk Okulu",
    seoDescription: "Roman, öykü, polisiye, fantastik, bilim kurgu, distopya ve diğer türleri kendi anlatı mantığıyla okumayı öğrenin.",
    benefits: [
      { title: "Tür sözleşmesini anlamak", text: "Bir türün okura hangi temel deneyimi vaat ettiğini fark et." },
      { title: "Kuralları izlemek", text: "Metnin kendi dünyasında koyduğu kuralların tutarlı biçimde işletilip işletilmediğini kontrol et." },
      { title: "Beklentiyle oynamayı görmek", text: "Yazarın tür beklentisini ne zaman karşıladığını, ne zaman bilinçli biçimde kırdığını ayırt et." },
      { title: "Türler arası okumak", text: "Bir eserin birden fazla türün araçlarını nasıl birlikte kullanabildiğini gör." },
    ],
    learningPath: [
      { title: "Türü tanı", text: "Eserin temel türünü ve olası alt türlerini belirle." },
      { title: "Vaadi bul", text: "Bu tür okura hangi temel merakı veya deneyimi sunuyor?" },
      { title: "Kuralları çıkar", text: "Dünya, bilgi, gerçeklik veya çözüm kurallarını not et." },
      { title: "Sinyalleri takip et", text: "Türe özgü ipuçlarını ve tekrarları izle." },
      { title: "Sapmaları incele", text: "Beklentiden ayrılan noktaların bilinçli bir işlevi olup olmadığını sorgula." },
      { title: "Tür başarısını değerlendir", text: "Eserin kendi kurduğu tür vaadini ne ölçüde karşıladığını gerekçelendir." },
    ],
    concepts: [
      { title: "Polisiye", text: "Bilgi dağılımı, ipucu, şüpheli, yanlış yönlendirme ve çözümün geriye dönük adaleti önem kazanır." },
      { title: "Fantastik", text: "Dünya kuralları, büyü veya mitoloji, sınırlar ve bunların karakter seçimleri üzerindeki etkisi izlenir." },
      { title: "Bilim kurgu", text: "Temel varsayım ile bu varsayımın teknoloji, toplum ve insan davranışı üzerindeki sonuçları sorgulanır." },
      { title: "Distopya", text: "Güç, kontrol, propaganda, normallik ve bireyin sisteme karşı konumu okumanın ana eksenine dönüşür." },
    ],
    example: {
      heading: "Aynı olaya tür değişince neden başka gözle bakarız?",
      text: "Bir karakterin kaybolması polisiyede bilgi ve şüpheli dağılımını, fantastikte dünyanın kurallarını, distopyada ise devletin veya sistemin kişiyi nasıl görünmez kıldığını sorgulatabilir. Olay aynı olsa da okuma sorusu değişir.",
      questions: ["Tür bana hangi temel soruyu sorduruyor?", "Metnin kendi kuralları neler?", "Beklentim bozulduğunda bunun anlatısal bir nedeni var mı?"],
    },
    practice: {
      heading: "Bir eseri tür merceğiyle yeniden oku",
      text: "Seçtiğin eserin türünü belirle ve yalnız o türe özgü dört sinyal çıkar.",
      steps: ["Ana tür ve varsa alt türü yaz.", "Türün okura verdiği temel vaadi tek cümlede tanımla.", "Dört türe özgü sinyal bul.", "Eserin beklentiyi karşıladığı veya kırdığı bir anı gerekçelendir."],
    },
    application: { heading: "Türünü seç, okuma merceğini değiştir.", text: "İlkOku’da farklı türlere göz at ve aynı okuma yöntemini her esere uygulamak yerine türün kendi sorularıyla okumaya başla.", href: "/turler", label: "Türleri keşfet" },
  },
  {
    slug: "elestirel-okuma",
    number: "06",
    title: "Eleştirel Okuma",
    shortDescription: "Metnin ne söylediğini değil; bunu hangi kanıt, bakış açısı ve varsayımla söylediğini de sorgula.",
    lead: "Eleştirel okuma, metne karşı çıkmak değil; iddiaları, kanıtları, eksikleri ve bakış açısını birbirinden ayırarak neye neden ikna olduğunu bilmektir.",
    promise: "Bu eğitim, bilgi ile yorum arasındaki farkı görmeyi, kaynak güvenilirliğini tartmayı ve metnin seni hangi yollarla yönlendirdiğini fark etmeyi öğretir.",
    seoTitle: "Eleştirel Okuma Eğitimi | İlkOku Okurluk Okulu",
    seoDescription: "İddia, kanıt, kaynak güvenilirliği, önyargı, eksik bilgi ve manipülasyonu sorgulamak için eleştirel okuma eğitimi.",
    benefits: [
      { title: "İddia ve kanıtı ayırmak", text: "Bir cümlenin ne savunduğunu ve bunu desteklemek için ne sunduğunu ayrı ayrı gör." },
      { title: "Kaynağı tartmak", text: "Uzmanlık, güncellik, çıkar ilişkisi ve doğrulanabilirlik üzerinden kaynak güvenilirliğini değerlendir." },
      { title: "Bakış açısını görmek", text: "Her metnin bir seçim yaptığını; bazı bilgileri öne çıkarıp bazılarını dışarıda bırakabildiğini fark et." },
      { title: "Karşı görüşü aramak", text: "Bir iddianın güçlü olup olmadığını alternatif açıklamalarla sınamayı öğren." },
    ],
    learningPath: [
      { title: "İddiayı bul", text: "Metnin senden kabul etmeni istediği ana düşünceyi belirle." },
      { title: "Kanıtı sınıflandır", text: "Veri, örnek, tanıklık, uzman görüşü ve çıkarımı birbirinden ayır." },
      { title: "Kaynağı sorgula", text: "Bilginin nereden geldiğini ve doğrulanabilir olup olmadığını kontrol et." },
      { title: "Eksik parçayı ara", text: "Hangi bilgi verilse yorumun değişebileceğini düşün." },
      { title: "Karşı açıklama kur", text: "Aynı veriye başka hangi anlamın verilebileceğini test et." },
      { title: "Geçici sonuç ver", text: "Kesin hüküm yerine kanıtın gücüne uygun bir sonuç oluştur." },
    ],
    concepts: [
      { title: "İddia", text: "Doğru olduğu ileri sürülen ve gerekçe gerektiren düşüncedir." },
      { title: "Kanıt", text: "İddiayı destekleyen bilgi, veri veya gözlemdir; her kanıt aynı güçte değildir." },
      { title: "Önyargı", text: "Metnin veya okurun bazı sonuçlara diğerlerinden daha kolay yönelmesine neden olan ön kabuldür." },
      { title: "Belirsizlik", text: "Yeterli bilgi olmadığında ‘bilmiyorum’ veya ‘şimdilik olası’ diyebilmek eleştirel okumanın parçasıdır." },
    ],
    example: {
      heading: "Güçlü görünen bir iddia nasıl sınanır?",
      text: "‘Okurların çoğu kısa bölümleri tercih eder’ cümlesi sayı verilmeden ikna edici görünebilir. Eleştirel okur, ‘hangi okurlar?’, ‘kaç kişi?’, ‘hangi türlerde?’, ‘hangi tarihte?’ sorularıyla iddianın kapsamını test eder.",
      questions: ["İddianın kaynağı nedir?", "Veri hangi grubu temsil ediyor?", "Başka bir açıklama aynı sonucu üretebilir mi?"],
    },
    practice: {
      heading: "Bir paragrafın kanıt haritasını çıkar",
      text: "Bilgilendirici veya tartışmacı kısa bir metin seç ve iddia–kanıt ilişkisini görünür hâle getir.",
      steps: ["Ana iddiayı tek cümleyle yaz.", "Sunulan kanıtları türlerine göre ayır.", "Eksik olabilecek bir bilgiyi yaz.", "Karşı görüşten gelebilecek en güçlü soruyu oluştur."],
    },
    application: { heading: "Okuduğun her iddiaya aynı ağırlığı verme.", text: "İlkOku’daki bilgilendirici ve düşünce odaklı metinlerde iddia, gerekçe ve eksik bilgiyi ayırarak kendi değerlendirmene ulaş.", href: "/kesfet", label: "Metinleri keşfet" },
  },
  {
    slug: "yorum-ve-elestiri-yazma",
    number: "07",
    title: "Yorum ve Eleştiri Yazma",
    shortDescription: "‘Beğendim’ demenin ötesine geç; görüşünü gerekçeli, yapıcı ve esere katkı sağlayacak biçimde ifade et.",
    lead: "İyi okur yorumu bir hüküm bırakıp gitmez. Neyi fark ettiğini, neden böyle düşündüğünü ve bunu metindeki hangi seçimlerin oluşturduğunu açıklar.",
    promise: "Bu eğitim, spoiler vermeden gerekçeli yorum yazmayı, eleştiriyi kişiselleştirmemeyi ve yazara gerçekten kullanılabilir geri bildirim sunmayı öğretir.",
    seoTitle: "Yorum ve Eleştiri Yazma Eğitimi | İlkOku Okurluk Okulu",
    seoDescription: "Gerekçeli, yapıcı ve spoiler vermeyen okur yorumu ile eser eleştirisi yazmayı adım adım öğrenin.",
    benefits: [
      { title: "Görüşü gerekçelendirmek", text: "‘İyiydi’ veya ‘olmadı’ yerine neyin neden etkili olduğunu açıklayan yorum kur." },
      { title: "Eseri hedeflemek", text: "Yazarın kişiliğini değil; metindeki anlatı, karakter, dil veya yapı seçimlerini değerlendir." },
      { title: "Spoiler yönetmek", text: "Başka okurun deneyimini bozmadan yeterli bağlam ve örnek vermeyi öğren." },
      { title: "Kullanılabilir geri bildirim", text: "Sorunu tarif ederken mümkün olduğunca somut gözlem ve etkisini birlikte belirt." },
    ],
    learningPath: [
      { title: "Gözlemi yaz", text: "Metinde gördüğün somut seçimi önce yorumsuz tarif et." },
      { title: "Etkisini söyle", text: "Bu seçimin okuma deneyiminde ne oluşturduğunu açıkla." },
      { title: "Gerekçe ekle", text: "Neden böyle düşündüğünü örnek veya karşılaştırmayla destekle." },
      { title: "Dili kontrol et", text: "Kişiye değil esere yönelen, açık ve saygılı bir dil kullan." },
      { title: "Spoileri ayır", text: "Gerekirse spoilerlı ayrıntıyı işaretle veya genelleştir." },
      { title: "Yorumu tamamla", text: "Güçlü yön, geliştirme alanı ve genel izlenimi dengeli biçimde bağla." },
    ],
    concepts: [
      { title: "Gözlem", text: "‘Karakter kötü yazılmış’ yerine hangi davranışın veya geçişin inandırıcılığı bozduğunu belirtmek gözlemdir." },
      { title: "Etki", text: "Metinsel seçimin sende yarattığı sonuç, yorumun kişisel ama açıklanabilir bölümüdür." },
      { title: "Gerekçe", text: "Görüşü metindeki somut bir seçime bağlar ve yorumun başkası tarafından anlaşılmasını sağlar." },
      { title: "Sınır", text: "Eleştiri eser ve okuma deneyimiyle sınırlı kalır; yazara yönelik kişisel saldırıya dönüşmez." },
    ],
    example: {
      heading: "‘Beğenmedim’ nasıl yararlı bir yoruma dönüşür?",
      text: "‘Ana karakterin ikinci bölümde verdiği karar bana inandırıcı gelmedi; çünkü ilk bölümde risk almaktan özellikle kaçınan biri olarak kurulmuştu ve bu değişimi hazırlayan yeni bir olay görmedim.’ Bu yorum hem gözlemi hem gerekçeyi taşır.",
      questions: ["Hangi somut seçim bende bu etkiyi yarattı?", "Görüşümü metinden hangi ayrıntıyla destekleyebilirim?", "Aynı şeyi yazarı hedef almadan söyleyebilir miyim?"],
    },
    practice: {
      heading: "Dört cümlelik yapıcı yorum yaz",
      text: "Okuduğun kısa bir bölüm için yalnız dört cümlede açık ve kullanılabilir bir geri bildirim oluştur.",
      steps: ["Bir güçlü yönü somut biçimde belirt.", "Bir geliştirme alanını gözlem olarak yaz.", "Bu gözlemin okuma etkisini açıkla.", "Genel izlenimini spoiler vermeden tamamla."],
    },
    application: { heading: "Yorumunu gerçek bir eserde uygula.", text: "İlkOku’da okuduğun bir esere yalnız ‘beğendim’ demek yerine gözlem + etki + gerekçe yapısıyla katkı sağlayan bir yorum bırak.", href: "/kesfet", label: "Okuyup yorumla" },
  },
  {
    slug: "okuma-kulturu",
    number: "08",
    title: "Okuma Kültürü",
    shortDescription: "Okurluğu bireysel bir alışkanlıktan saygılı tartışma, paylaşım ve ortak keşif deneyimine dönüştür.",
    lead: "Okuma kültürü yalnız kaç kitap bitirdiğinle değil; farklı yorumlarla nasıl konuştuğun, spoiler ve telife nasıl yaklaştığın ve topluluğa nasıl katkı verdiğinle oluşur.",
    promise: "Bu eğitim, okuma tartışmasını kazanılacak bir yarış yerine anlamı çoğaltan bir ortak çalışma olarak kurmana yardımcı olur.",
    seoTitle: "Okuma Kültürü Eğitimi | İlkOku Okurluk Okulu",
    seoDescription: "Okuma grubu, farklı yorumlar, spoiler etiği, yazar-okur iletişimi, telif ve topluluk davranışı için okur eğitimi.",
    benefits: [
      { title: "Farklı yoruma alan açmak", text: "Aynı metinden farklı sonuç çıkmasının her zaman yanlış okuma anlamına gelmediğini gör." },
      { title: "Spoiler etiği", text: "Başka okurun keşif deneyimini korurken tartışmayı sürdürebilecek sınırlar kur." },
      { title: "Yazar–okur mesafesi", text: "Eser hakkında özgürce konuşurken kişisel sınırları ve saygılı iletişimi koru." },
      { title: "Telif bilinci", text: "Bir eseri tartışmakla uzun bölümleri izinsiz paylaşmak arasındaki farkı bil." },
    ],
    learningPath: [
      { title: "Yorumunu sahiplen", text: "‘Metin kesinlikle budur’ yerine yorumunun dayandığı işaretleri açıkla." },
      { title: "Karşı yorumu dinle", text: "Önce diğer okurun hangi ayrıntıdan yola çıktığını anlamaya çalış." },
      { title: "Spoileri yönet", text: "Tartışmanın bağlamına göre uyarı, gizleme veya genelleştirme kullan." },
      { title: "Sınırı koru", text: "Eser, fikir ve anlatı seçimi hakkında konuş; kişisel saldırıdan kaçın." },
      { title: "Kaynağı belirt", text: "Alıntı, fikir veya dış kaynak kullandığında kaynağı görünür kıl." },
      { title: "Keşfi büyüt", text: "Tartışmayı yeni eser, yazar veya bakış açısına açılan bir kapıya dönüştür." },
    ],
    concepts: [
      { title: "Çoğul yorum", text: "Yorumlar farklı olabilir; önemli olan yorumun metinsel dayanağının ve akıl yürütmesinin görünür olmasıdır." },
      { title: "Spoiler", text: "Spoiler yalnız olay sonucu değildir; bir eserin keşif mekanizmasını erken açığa çıkaran bilgi de olabilir." },
      { title: "Topluluk", text: "Sağlıklı okur topluluğu benzer fikirlerden değil, farklı fikirlerin güvenle ifade edilebildiği kurallardan doğar." },
      { title: "Telif", text: "Eleştiri için kısa alıntı ile eserin önemli bölümünü yeniden yayımlamak aynı şey değildir." },
    ],
    example: {
      heading: "Aynı karakter hakkında iki zıt yorum nasıl birlikte değerli olabilir?",
      text: "Bir okur karakterin sessizliğini güç, diğeri kaçınma olarak okuyabilir. Tartışmanın kalitesi ‘kim haklı?’ sorusundan önce her iki yorumun hangi sahnelere dayandığını açığa çıkarmakla yükselir.",
      questions: ["Diğer okur hangi metinsel işaretten yola çıkıyor?", "Benim yorumumu hangi sahne destekliyor?", "İki yorum aynı anda kısmen doğru olabilir mi?"],
    },
    practice: {
      heading: "Bir okuma tartışmasını güvenli biçimde aç",
      text: "Bir eser hakkında farklı görüşleri davet eden kısa bir tartışma başlangıcı hazırla.",
      steps: ["Spoiler sınırını baştan belirt.", "Kendi yorumunu kesin hüküm yerine gerekçeli görüş olarak yaz.", "Diğer okurlara açık uçlu bir soru sor.", "Yanıtlarda esere odaklanan dili koru."],
    },
    application: { heading: "Okuma deneyimini toplulukla büyüt.", text: "İlkOku’da bir eser keşfet, yorumları oku ve farklı görüşlere kendi metinsel gerekçenle katkı ver.", href: "/kesfet", label: "Topluluğa katıl" },
  },
] as const satisfies readonly ReaderEducationCategory[];

export function getReaderEducationCategory(slug: string) {
  return READER_EDUCATION_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function readerEducationPublicPath(category: Pick<ReaderEducationCategory, "slug">) {
  return `/okurlar-icin/${category.slug}`;
}
