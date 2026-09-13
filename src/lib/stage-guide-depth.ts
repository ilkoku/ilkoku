import type { GuideItem } from "@/lib/education-guide-batch";

export type StageGuideExtraSection = {
  id: string;
  type: "text" | "cards" | "steps";
  heading: string;
  intro?: string;
  body?: string;
  items?: GuideItem[];
};

const STAGE_GUIDE_DEPTH: Record<string, StageGuideExtraSection[]> = {
  "film-senaryosu": [
    {
      id: "senaryo-format-ve-okunabilirlik",
      type: "cards",
      heading: "Senaryo formatını biçim kuralı değil üretim dili olarak öğren",
      intro: "Standart senaryo düzeni; yönetmen, oyuncu ve yapım ekibinin aynı metni hızla okuyabilmesi için vardır.",
      items: [
        { title: "Sahne başlığı", text: "İÇ/DIŞ, mekân ve zaman bilgisini tutarlı ver; sahne değişimini görünür kıl." },
        { title: "Eylem paragrafı", text: "Yalnız görülebilen ve duyulabilen şeyi, kısa ve oynanabilir cümlelerle yaz." },
        { title: "Karakter ve diyalog", text: "Konuşanın kim olduğunu netleştir; parantez içi yönlendirmeyi yalnız anlam gerçekten değişiyorsa kullan." },
        { title: "Okuma ritmi", text: "Yoğun bloklar yerine beyaz alanı koru; senaryonun gözdeki temposu filmin hissini desteklesin." },
      ],
    },
    {
      id: "gorsel-dramaturji",
      type: "steps",
      heading: "Sahneyi görüntü, davranış ve mizansen üzerinden dramatikleştir",
      intro: "Bir film sahnesi yalnız ne söylendiğiyle değil, kadraja girebilecek eylemle çalışır.",
      items: [
        { title: "Duyguyu davranışa çevir", text: "‘Korkuyor’ yazmak yerine korkunun bedendeki, mekândaki veya seçimdeki karşılığını bul." },
        { title: "Nesneye işlev ver", text: "Tekrar eden nesne veya görsel motif yalnız dekor değil, bilgi ve duygu taşısın." },
        { title: "Mekânı çatışmaya kat", text: "Kapı, mesafe, kalabalık, ışık veya erişim sahnenin baskısını artırabilsin." },
        { title: "Görüntüyle sonuçlandır", text: "Mümkünse sahnenin son bilgisini açıklayan cümle yerine görülebilir bir değişimle ver." },
      ],
    },
    {
      id: "diyalog-altmetin",
      type: "cards",
      heading: "Diyaloğu bilgi taşıyan cümlelerden alt metinli çatışmaya dönüştür",
      intro: "Karakterin söylediği şey ile istediği şey her zaman aynı olmak zorunda değildir.",
      items: [
        { title: "Amaç", text: "Her konuşmada karakterin karşı taraftan ne elde etmeye çalıştığını bil." },
        { title: "Taktik", text: "İkna, kaçınma, suçlama, mizah veya sessizlik gibi yöntemi sahne içinde değiştirebil." },
        { title: "Alt metin", text: "Karakterin açıkça söylemediği gerilimi davranış ve kelime seçimine yerleştir." },
        { title: "Ses ayrımı", text: "Karakterlerin kelime ritmi, eğitim düzeyi, savunma biçimi ve mizahı birbirine benzemesin." },
      ],
    },
    {
      id: "tempo-sure-sayfa-ekonomisi",
      type: "steps",
      heading: "Tempo, süre ve sayfa ekonomisini sahne işleviyle birlikte kontrol et",
      intro: "Sayfa sayısı tek başına kalite ölçüsü değildir; fakat gereksiz sahneleri fark etmek için güçlü bir üretim göstergesidir.",
      items: [
        { title: "Sahne işlevini yaz", text: "Her sahne için ‘ne değişiyor?’ sorusuna tek cümle cevap ver." },
        { title: "Giriş-çıkışı sıkıştır", text: "Sahneye çatışmaya yakın gir, dramatik sonuç doğunca gecikmeden çık." },
        { title: "Tekrarı ayıkla", text: "Aynı bilgiyi ikinci kez veren diyalog veya sahneyi birleştir ya da kaldır." },
        { title: "Okuma süresini test et", text: "Masa okumasında beklediğinden uzun kalan bölümleri ritim açısından yeniden değerlendir." },
      ],
    },
    {
      id: "yapim-gercekligi-rewrite",
      type: "cards",
      heading: "Senaryoyu yapım gerçekliğiyle karşılaştır ama hikâyeyi bütçeye teslim etme",
      intro: "Yapılabilirlik bilgisi yaratıcı seçimi güçlendirir; amaç yalnız ucuzlaştırmak değildir.",
      items: [
        { title: "Mekân yükü", text: "Çok sayıda kısa mekân değişiminin yapım ve ritim maliyetini fark et." },
        { title: "Kalabalık ve özel gereksinim", text: "Figürasyon, araç, hayvan, efekt veya gece çekiminin sonuçlarını erken gör." },
        { title: "Alternatif çözüm", text: "Pahalı fikrin dramatik işlevini koruyan daha sade bir sahne seçeneği üret." },
        { title: "Rewrite disiplini", text: "Yapım notunu körlemesine uygulama; değişikliğin tema, karakter ve nedensellik üzerindeki etkisini yeniden kontrol et." },
      ],
    },
  ],

  "dizi-senaryosu": [
    {
      id: "dizi-motoru-ve-vaat",
      type: "cards",
      heading: "Dizinin tekrar üretilebilir motorunu ve seyirci vaadini tanımla",
      intro: "Pilot bölümü iyi olmak yetmez; aynı dünyanın neden yeni bölümler doğuracağını göstermen gerekir.",
      items: [
        { title: "Merkez çatışma", text: "Her bölümde farklı biçimde yeniden üretilebilecek temel gerilimi yaz." },
        { title: "Dünya motoru", text: "Hastane, aile şirketi, mahalle, ekip veya kurumun yeni hikâye üretme kapasitesini tanımla." },
        { title: "Karakter motoru", text: "Ana karakterlerin uzun süre çözülemeyecek ihtiyaç ve çelişkilerini belirle." },
        { title: "Bölüm vaadi", text: "Seyirci her bölümde hangi tür deneyimi, soruyu veya duyguyu bekleyebilir?" },
      ],
    },
    {
      id: "pilot-mimarisi",
      type: "steps",
      heading: "Pilot bölümde hem bugünkü hikâyeyi hem gelecek diziyi kur",
      intro: "Pilot; karakterleri tanıtırken dizinin sonraki bölümlerini de vaat eder.",
      items: [
        { title: "Dünyayı aç", text: "Seyirciyi açıklama bombardımanına tutmadan temel düzeni ve gerilimi göster." },
        { title: "Ana problemi başlat", text: "Pilotun kendi dramatik sorusunu mümkün olduğunca erken kur." },
        { title: "Karakter bağlarını görünür kıl", text: "İttifak, rekabet, sır ve bağımlılık ilişkilerini eylem içinde göster." },
        { title: "Seri vaadini bırak", text: "Pilot sonunda yalnız bugünkü olay değil, ileride büyüyecek yeni sorular da açık kalsın." },
      ],
    },
    {
      id: "a-b-c-hikayeleri",
      type: "cards",
      heading: "A, B ve C hikâyelerini birbirinin temposunu taşıyacak şekilde örgüle",
      intro: "Yan hikâye, ana hikâyeye ara vermek için değil bölümün temasını ve ritmini büyütmek için kullanılır.",
      items: [
        { title: "A hikâyesi", text: "Bölümün en güçlü dramatik sorusunu ve ana ilerlemeyi taşır." },
        { title: "B hikâyesi", text: "Başka bir karakter, ilişki veya tematik karşılık üzerinden bölümün dünyasını genişletir." },
        { title: "C hikâyesi", text: "Kısa ama işlevli bir ritim, mizah veya geleceğe tohum sağlayabilir." },
        { title: "Kesişim", text: "Hikâyelerin yalnız sırayla gelmesini değil birbirinin kararlarını veya temasını etkilemesini sağla." },
      ],
    },
    {
      id: "sezon-yayi-ve-karakter-surekliligi",
      type: "steps",
      heading: "Sezon yayını bölüm olaylarından ayrı planla",
      intro: "Sezon boyunca değişen şey yalnız dış olay değil, karakterlerin ilişkisi ve bilgi dengesi de olmalıdır.",
      items: [
        { title: "Başlangıç durumu", text: "Sezonun ilk bölümünde karakter, ilişki ve güç dengesini kaydet." },
        { title: "Dönüm noktaları", text: "Sezon ortası ve final gibi büyük kırılmaların hangi bilgi veya seçimle oluşacağını planla." },
        { title: "Yavaş değişim", text: "Karakter dönüşümünü tek bölümde çözüp sonra sıfırlama; küçük kararları üst üste bindir." },
        { title: "Final sonrası potansiyel", text: "Sezonu bitirirken ana vaadi tüketmeden yeni durumun hikâye kapasitesini kontrol et." },
      ],
    },
    {
      id: "show-bible-ve-sureklilik",
      type: "cards",
      heading: "Show bible ve süreklilik dosyasını yaratıcı hafıza olarak kullan",
      intro: "Uzun soluklu yapıda küçük çelişkiler hızla birikir; ekip aynı gerçeklikte çalışmalıdır.",
      items: [
        { title: "Karakter geçmişi", text: "Yaş, aile, travma, meslek ve daha önce söylenmiş önemli bilgileri kayıtlı tut." },
        { title: "Dünya kuralları", text: "Kurum, mekân, zaman çizgisi ve tekrar eden prosedürleri belgeleyerek çelişkiyi azalt." },
        { title: "Açık iplikler", text: "Henüz kapanmamış sır, vaat ve yan hikâyeleri bölüm bölüm izle." },
        { title: "Yazar odası notu", text: "Bir karar değiştiğinde eski belgeleri güncelle; farklı sürümlerin dolaşmasına izin verme." },
      ],
    },
  ],

  "kisa-film-senaryosu": [
    {
      id: "dramatik-sikistirma",
      type: "steps",
      heading: "Kısa filmi küçük film değil yoğunlaştırılmış değişim olarak kur",
      intro: "Kısa sürede geniş geçmiş anlatmak yerine tek bir kırılmayı netleştir.",
      items: [
        { title: "Tek değişim seç", text: "Karakterin film sonunda hangi küçük ama anlamlı eşiği geçtiğini yaz." },
        { title: "Geç başla", text: "Uzun kurulum yerine değişime en yakın andan hikâyeye gir." },
        { title: "Arka planı ima et", text: "Geçmişi açıklamak yerine nesne, davranış veya tek ayrıntıyla hissettir." },
        { title: "Sonucu yoğunlaştır", text: "Finalde yeni bilgi değil, filmin kurduğu gerilimin anlamlı karşılığını ver." },
      ],
    },
    {
      id: "gorsel-ekonomi",
      type: "cards",
      heading: "Her görüntüye birden fazla işlev yükle",
      intro: "Kısa filmde gereksiz plan ve nesne, uzun metindeki gereksiz paragraf kadar maliyetlidir.",
      items: [
        { title: "Mekân", text: "Karakterin koşulunu, sosyal dünyasını ve engelini aynı anda anlatabilsin." },
        { title: "Nesne", text: "Bir nesne geçmiş, amaç ve finaldeki değişim arasında bağ kurabilir." },
        { title: "Davranış", text: "Tek davranışla hem karakteri hem ilişkiyi hem de gerilimi göster." },
        { title: "Sessizlik", text: "Açıklama yerine izleyicinin tamamlayabileceği boşluk bırak." },
      ],
    },
    {
      id: "sure-ve-beat-haritasi",
      type: "steps",
      heading: "Süreyi dakika değil dramatik beat üzerinden planla",
      intro: "Her beat yeni bir bilgi, karar, baskı veya yön değişimi üretmelidir.",
      items: [
        { title: "Açılış beat'i", text: "Durumu tek görüntü veya kısa eylemle anlaşılır kıl." },
        { title: "Kırılma", text: "Filmi hareket ettiren sorunu erken getir." },
        { title: "Baskı", text: "Kısa süre içinde karakteri seçim yapmaya zorla." },
        { title: "Karşılık", text: "Final beat'inin açılıştaki duruma nasıl yeni anlam verdiğini kontrol et." },
      ],
    },
    {
      id: "diyalog-minimalizmi",
      type: "cards",
      heading: "Kısa film diyaloğunda her cümleyi sahneye karşı test et",
      intro: "Kısa formatta açıklama cümleleri çok hızlı ağırlık yaratır.",
      items: [
        { title: "Bilgi tekrarı", text: "Görüntünün zaten anlattığı şeyi karaktere tekrar söyletme." },
        { title: "Alt metin", text: "Karakterin amacı ile söylediği cümle arasında gerilim kur." },
        { title: "Kesilebilirlik", text: "Cümle çıkınca anlam korunuyorsa çıkar veya davranışa dönüştür." },
        { title: "Son söz", text: "Finali açıklayan slogan yerine, önceki görüntüleri yeniden anlamlandıran kısa bir karşılık düşün." },
      ],
    },
    {
      id: "kisa-film-finali",
      type: "steps",
      heading: "Kısa film finalini sürpriz bağımlılığından kurtar",
      intro: "Twist tek yöntem değildir; güçlü final, kurulan dramatik soruya kaçınılmaz ama taze bir karşılık verir.",
      items: [
        { title: "Tohumla", text: "Finalde kullanacağın bilgi veya nesnenin izini önceden doğal biçimde bırak." },
        { title: "Karakter seçimiyle bağla", text: "Son an yalnız dış olay değil karakterin tutumunu da ortaya koysun." },
        { title: "Açıklamayı azalt", text: "Finalden sonra seyircinin zaten anladığı şeyi özetleme." },
        { title: "Yankıyı kontrol et", text: "Açılış görüntüsü veya temel motif finalde yeni anlam kazanabiliyor mu?" },
      ],
    },
  ],

  tiyatro: [
    {
      id: "sahne-mekani-ve-bloklama",
      type: "cards",
      heading: "Sahne mekânını dekor değil dramatik kuvvet olarak düşün",
      intro: "Tiyatroda mekân seyirciyle aynı anda vardır; mesafe, giriş, çıkış ve görünürlük oyunun parçasıdır.",
      items: [
        { title: "Mesafe", text: "Karakterler arasındaki fiziksel uzaklığın ilişki ve güç dengesine nasıl hizmet ettiğini düşün." },
        { title: "Bariyer", text: "Masa, kapı, seviye farkı veya sahne sınırı çatışmayı fiziksel hale getirebilir." },
        { title: "Giriş-çıkış", text: "Bir karakterin ne zaman görünür olduğu sahnenin bilgi ve gerilim düzenini değiştirir." },
        { title: "Seyirci konumu", text: "Kimin neyi gördüğünü ve hangi bilginin seyircide karakterden önce bulunduğunu planla." },
      ],
    },
    {
      id: "canli-diyalog-ve-altmetin",
      type: "steps",
      heading: "Tiyatro diyaloğunu oyuncunun eylemine dönüştürülebilecek şekilde yaz",
      intro: "Sahnedeki cümle, oyuncuya yalnız anlam değil oynanabilir niyet vermelidir.",
      items: [
        { title: "Amaç", text: "Karakter bu konuşmada karşısındakinden ne almaya çalışıyor?" },
        { title: "Eylem fiili", text: "İkna etmek, bastırmak, kışkırtmak, kaçınmak gibi oynanabilir bir fiil düşün." },
        { title: "Taktik değişimi", text: "Aynı amaç için kullanılan yöntem sahne boyunca değişsin." },
        { title: "Sessizlik", text: "Susmayı boşluk değil karar, direnç veya tehdit olarak kullan." },
      ],
    },
    {
      id: "perde-sahne-ritmi",
      type: "steps",
      heading: "Perde ve sahne yapısını canlı izleme ritmine göre kur",
      intro: "Seyirci geri saramaz; her sahne yön duygusunu ve merakı canlı tutmalıdır.",
      items: [
        { title: "Sahne sorusu", text: "Her sahnenin cevaplamak veya büyütmek istediği dramatik soruyu yaz." },
        { title: "Giriş enerjisi", text: "Sahneye hangi gerilim veya amaçla girildiğini görünür kıl." },
        { title: "Dönüş", text: "Sahne sonunda güç, bilgi veya ilişki mutlaka başka yerde olsun." },
        { title: "Perde kapanışı", text: "Ara öncesi ve finalde seyircinin taşıdığı soruyu bilinçli seç." },
      ],
    },
    {
      id: "monolog-ve-seyirci-iliskisi",
      type: "cards",
      heading: "Monolog ve doğrudan hitabı açıklama kolaylığına dönüştürme",
      intro: "Karakterin uzun konuşması da dramatik eylem taşımak zorundadır.",
      items: [
        { title: "Muhatap", text: "Karakter kime, neden şimdi konuşuyor? Gerçek veya hayali muhatabı belirle." },
        { title: "Dönüşüm", text: "Monolog boyunca düşünce aynı yerde kalmasın; konuşma karakteri bir karara götürsün." },
        { title: "Çelişki", text: "Karakter kendi anlattığı hikâyeyi düzeltmek, saklamak veya yeniden yorumlamak zorunda kalabilsin." },
        { title: "Seyirci bilgisi", text: "Doğrudan hitap seyirciyi sırdaş mı, tanık mı, yargıç mı yapıyor?" },
      ],
    },
    {
      id: "masa-okumasi-ve-prova-rewrite",
      type: "steps",
      heading: "Masa okuması ve prova bilgisini yeniden yazımın parçası yap",
      intro: "Tiyatro metni sahnede duyulduğunda ve bedene geçtiğinde yeni sorunlar gösterir.",
      items: [
        { title: "Masa okuması", text: "Ritim, tekrar ve karakter seslerinin birbirine karıştığı yerleri not et." },
        { title: "Ayakta prova", text: "Yazdığın fiziksel eylemin gerçekten oynanabilir olup olmadığını gözlemle." },
        { title: "Geçiş testi", text: "Sahne değişimi, dekor ve giriş-çıkışların pratik akışını kontrol et." },
        { title: "Metni koru, yöntemi değiştir", text: "Prova sorunu çıktığında önce dramatik işlevi belirle; çözümü yalnız cümle düzeyinde arama." },
      ],
    },
  ],

  "radyo-tiyatrosu": [
    {
      id: "akustik-mekan",
      type: "cards",
      heading: "Akustik mekânı dinleyicinin gözü gibi tasarla",
      intro: "Radyo tiyatrosunda mekân görüntüyle değil ses uzaklığı, yankı, hareket ve atmosferle kurulur.",
      items: [
        { title: "Yakınlık", text: "Sesin mikrofona yakınlığı karakterin mahremiyetini veya fiziksel konumunu hissettirebilir." },
        { title: "Ortam sesi", text: "Mekânı tanımlamak için sürekli efekt değil seçilmiş karakteristik ses kullan." },
        { title: "Hareket", text: "Karakterin yaklaşması, uzaklaşması veya yön değiştirmesi mekânsal bilgi üretsin." },
        { title: "Akustik fark", text: "Koridor, oda, dış alan veya araç içini farklı ses davranışıyla ayır." },
      ],
    },
    {
      id: "ses-karakter-ayrimi",
      type: "steps",
      heading: "Karakterleri yalnız isimle değil ses ve konuşma davranışıyla ayır",
      intro: "Dinleyici yüz görmediği için benzer sesler ve benzer cümle yapıları hızla karışır.",
      items: [
        { title: "Ritim", text: "Karakterlerin konuşma hızı, duraklama ve cümle uzunluğunu farklılaştır." },
        { title: "Kelime seçimi", text: "Meslek, yaş, ilişki ve kişilik karakterin söz dağarcığına yansısın." },
        { title: "İşitsel motif", text: "Gerekirse karaktere doğal bir ortam veya eylem sesi eşlik etsin; yapay etiketleme yapma." },
        { title: "İsim kullanımını azalt", text: "Karakterlerin birbirinin adını gereksiz tekrar etmesi yerine bağlamı ve ses ayrımını güçlendir." },
      ],
    },
    {
      id: "efekt-sessizlik-muzik",
      type: "cards",
      heading: "Efekt, sessizlik ve müziği açıklama değil dramaturji için kullan",
      intro: "Her sesin dramatik bir nedeni olmalı; fazla ses dinleyicinin zihinsel sahnesini bulanıklaştırır.",
      items: [
        { title: "Efekt", text: "Olayı anlaşılır kılmalı, ritmi değiştirmeli veya önemli bir nesneyi işaretlemeli." },
        { title: "Sessizlik", text: "Şok, bekleme, tehdit veya seçim anında aktif dramatik unsur olabilir." },
        { title: "Müzik", text: "Duyguyu emir gibi dayatmak yerine geçiş, tema veya karşıtlık yaratmak için kullan." },
        { title: "Katman", text: "Aynı anda kaç sesin gerekli olduğunu sınırla; ön plan ile arka planı ayır." },
      ],
    },
    {
      id: "radyo-script-notasyonu",
      type: "steps",
      heading: "Radyo metnini oyuncu ve ses ekibinin aynı anda okuyabileceği şekilde düzenle",
      intro: "İyi notasyon, kayıtta yorum tartışmasını azaltır ama oyunculuğu boğmamalıdır.",
      items: [
        { title: "Konuşmacı etiketi", text: "Karakter adlarını ve ses kaynaklarını tutarlı biçimde ayır." },
        { title: "SFX notu", text: "Efektin ne olduğunu ve dramatik giriş-çıkışını net yaz; gereksiz teknik ayrıntıyı azalt." },
        { title: "Müzik işareti", text: "Müziğin başlangıç, alçalma ve bitiş işlevini metinde görünür kıl." },
        { title: "Duraklama", text: "Her nefesi yazmak yerine anlamı gerçekten değiştiren sessizlikleri işaretle." },
      ],
    },
    {
      id: "prova-kayit-ve-mix-revizyonu",
      type: "steps",
      heading: "Prova kayıt ve kaba miks üzerinden metni yeniden sınama",
      intro: "Kâğıtta anlaşılır görünen sahne, kulakta fazla yoğun veya yönsüz kalabilir.",
      items: [
        { title: "Kör dinleme", text: "Metni görmeden dinle; kimin nerede olduğunu ve ne yaptığını anlayabiliyor musun?" },
        { title: "Ses çakışması", text: "Diyalog, efekt ve müzik aynı anda bilgi taşıyorsa önceliği yeniden düzenle." },
        { title: "Tempo", text: "Uzun açıklama ve efekt beklemelerinin dinleme ritmini düşürdüğü yerleri kes." },
        { title: "Anlaşılırlık", text: "Eksik bilgiyi hemen anlatıcıyla doldurmak yerine sahne sesini daha net kurmayı dene." },
      ],
    },
  ],

  "podcast-senaryosu": [
    {
      id: "format-bible-ve-bolum-vaadi",
      type: "cards",
      heading: "Podcast format bible'ı ile her bölümün neyi tekrar edeceğini tanımla",
      intro: "Tek iyi bölüm yerine sürdürülebilir bir yayın dili kurmak istiyorsan formatın sabit ve değişken parçalarını ayır.",
      items: [
        { title: "Hedef dinleyici", text: "Kimin için yazdığını ve dinleyicinin konuya ne kadar ön bilgiyle geldiğini tanımla." },
        { title: "Bölüm vaadi", text: "Her bölümün dinleyiciye hangi tür bilgi, hikâye veya deneyim sunduğunu tek cümlede yaz." },
        { title: "Sabit segment", text: "Tekrar eden açılış, soru, veri veya kapanış parçalarını belirle." },
        { title: "Değişken alan", text: "Formatı bozmadan konuya göre değişebilecek bölüm parçalarını açık bırak." },
      ],
    },
    {
      id: "kaynak-dogrulama-ve-editorial-not",
      type: "steps",
      heading: "Araştırma ve kaynak doğrulamayı kayıt öncesi editoryal sisteme bağla",
      intro: "Mikrofonda doğal konuşmak, kaynak disiplinini gevşetmek anlamına gelmez.",
      items: [
        { title: "İddia listesi", text: "Bölümde doğrulanması gereken sayı, tarih, isim ve nedensel iddiaları ayrı çıkar." },
        { title: "Birincil kaynağa yaklaş", text: "Mümkün olduğunda özet habere değil belge, veri, doğrudan kayıt veya uzman kaynağa git." },
        { title: "Çelişkiyi not et", text: "Kaynaklar uyuşmuyorsa tekini seçip geçme; belirsizliği metinde doğru temsil et." },
        { title: "Kayıt sonrası kontrol", text: "Spontane konuşmada eklenen iddiaları final editinden önce tekrar doğrula." },
      ],
    },
    {
      id: "sunucu-sesi-ve-roportaj",
      type: "cards",
      heading: "Sunucu sesi ile röportaj tekniğini aynı bölümde dengeli kur",
      intro: "Güvenilir anlatıcı olmak, sürekli konuşmak değil doğru yerde alan açmaktır.",
      items: [
        { title: "Sunucu tonu", text: "Bilgi düzeyine uygun sıcaklık, mesafe ve mizah seç; her bölümde kişilik değiştirme." },
        { title: "Açık soru", text: "Röportajda tek kelimelik cevaba kapanmayan, deneyim ve örnek isteyen sorular kullan." },
        { title: "Takip sorusu", text: "Hazır listedeki sıraya bağlı kalmadan önemli ayrıntının peşine git." },
        { title: "Kesinti disiplini", text: "Konuk konuşurken yalnız akışı hızlandırmak için araya girme; fakat yanlış veya belirsiz iddiayı gerektiğinde netleştir." },
      ],
    },
    {
      id: "kulak-icin-yazim-ve-segment-ritmi",
      type: "steps",
      heading: "Metni göz için değil kulak, nefes ve dikkat için yeniden yaz",
      intro: "Dinleyici geriye bakamadığı için yönlendirme ve bilgi yoğunluğu yazılı metinden farklı çalışır.",
      items: [
        { title: "Kısa cümle", text: "Bir nefeste okunamayacak karmaşık cümleyi doğal konuşma bloklarına böl." },
        { title: "Yön cümlesi", text: "Konu değişirken dinleyiciye nereden nereye geçtiğini kısa biçimde hatırlat." },
        { title: "Bilgi aralığı", text: "Yoğun veri sonrası örnek, hikâye, ses klibi veya kısa özet kullan." },
        { title: "Segment çıkışı", text: "Her bölüm parçasını bir sonraki soruya veya meraka bağla." },
      ],
    },
    {
      id: "haklar-edit-ve-erisebilirlik",
      type: "cards",
      heading: "Ses hakları, editoryal bütünlük ve erişilebilirliği yayın paketinin parçası yap",
      intro: "Podcast yalnız ses dosyası değildir; kullanılan materyal ve yayın sonrası erişim de üretimin içindedir.",
      items: [
        { title: "Klip hakkı", text: "Müzik, arşiv sesi ve üçüncü taraf kayıtlarının kullanım iznini veya lisans durumunu kontrol et." },
        { title: "Edit dürüstlüğü", text: "Röportaj cümlelerini bağlamı değiştirecek şekilde birleştirme veya kesme." },
        { title: "Bölüm notları", text: "Kaynak, konuk ve ek okuma bilgisini düzenli biçimde yayınla." },
        { title: "Transkript", text: "Mümkün olduğunda doğru transkript sağlayarak erişilebilirlik ve aranabilirliği güçlendir." },
      ],
    },
  ],

  "belgesel-senaryosu": [
    {
      id: "arastirma-ve-fact-check",
      type: "steps",
      heading: "Belgesel araştırmasını konu toplamaktan doğrulanabilir iddia sistemine dönüştür",
      intro: "Her dramatik iddianın hangi kanıta dayandığını çekimden önce ve kurgu sırasında izleyebilmelisin.",
      items: [
        { title: "İddia envanteri", text: "Filmin merkezindeki olgusal iddiaları tek tek yaz." },
        { title: "Kaynak derecesi", text: "Belge, veri, doğrudan tanık, ikinci el anlatı ve yorum arasındaki farkı kayıtlı tut." },
        { title: "Çapraz doğrulama", text: "Önemli iddiayı mümkün olduğunda bağımsız ikinci kaynakla karşılaştır." },
        { title: "Final fact-check", text: "Kurgu bittikten sonra yazı, altyazı, anlatıcı ve röportajdan çıkan tüm olgusal iddiaları yeniden denetle." },
      ],
    },
    {
      id: "onam-zarar-ve-temsil",
      type: "cards",
      heading: "Onam, zarar riski ve temsil kararlarını dramatik ihtiyaçtan önce düşün",
      intro: "Bir sahnenin güçlü olması, onu yayımlamanın otomatik olarak doğru olduğu anlamına gelmez.",
      items: [
        { title: "Bilgilendirilmiş onam", text: "Katılımcının projenin amacı, kullanım alanı ve olası sonuçları konusunda yeterince bilgi sahibi olmasını sağla." },
        { title: "Güç asimetrisi", text: "Çocuk, çalışan, hasta, göçmen veya kırılgan gruplarda özgür onamın gerçekten mümkün olup olmadığını sorgula." },
        { title: "Zarar testi", text: "Kimlik, konum, aile, iş veya güvenlik riski yaratabilecek ayrıntıları yayımdan önce yeniden değerlendir." },
        { title: "Temsil", text: "Kişiyi yalnız filmin tezine hizmet eden tek boyutlu bir simgeye indirgeme." },
      ],
    },
    {
      id: "roportaj-dramaturjisi",
      type: "steps",
      heading: "Röportajı bilgi alma formundan keşif ve kanıt sahnesine dönüştür",
      intro: "Güçlü röportaj, önceden bildiğin cevabı onaylatmak yerine yeni ayrıntı ve çelişki açar.",
      items: [
        { title: "Isınma", text: "Katılımcının bağlam ve hafıza kurmasına izin veren kolay sorularla başla." },
        { title: "Somutlaştır", text: "Genel yargı yerine ‘o gün ne oldu, nerede duruyordunuz?’ gibi sahne üreten sorular sor." },
        { title: "Kanıt iste", text: "Tarih, belge, kişi veya gözlenebilir ayrıntıyla desteklenebilecek noktaları aç." },
        { title: "Çelişkiyi dürüstçe sor", text: "Başka kaynakla uyuşmayan bilgiyi saldırmadan ama net biçimde gündeme getir." },
      ],
    },
    {
      id: "arsiv-haklar-ve-baglam",
      type: "cards",
      heading: "Arşiv malzemesini yalnız güzel görüntü değil kaynak ve hak nesnesi olarak yönet",
      intro: "Fotoğraf, video, mektup, gazete kupürü ve ses kaydı hem anlam hem kullanım sorumluluğu taşır.",
      items: [
        { title: "Kaynak bilgisi", text: "Malzemenin kimden, hangi tarihten ve hangi bağlamdan geldiğini kayıtlı tut." },
        { title: "Hak durumu", text: "Telif, lisans, kişilik hakkı ve izin gereksinimini kullanım öncesi kontrol et." },
        { title: "Bağlam", text: "Görüntüyü başka olayı temsil ediyormuş gibi kullanma; tarih ve yer bilgisini gerektiğinde açıkla." },
        { title: "Manipülasyon sınırı", text: "Kırpma, hız, ses veya renk müdahalesinin izleyicide yanlış olgusal izlenim yaratmadığını denetle." },
      ],
    },
    {
      id: "paper-edit-ve-gerceklik-kontrolu",
      type: "steps",
      heading: "Paper edit ile dramatik yapı kurarken gerçeklik zincirini koru",
      intro: "Belgesel kurgu, gerçek olayları yeniden sıraladığında anlam üretir; bu nedenle neden-sonuç yanılgısına özellikle dikkat et.",
      items: [
        { title: "Malzemeyi kodla", text: "Röportaj, gözlem, belge ve arşivi tema ve iddia kodlarıyla düzenle." },
        { title: "Kanıt sırasını kur", text: "İzleyiciye hangi bilgiyi ne zaman göstereceğini planla; sonucu baştan dayatma." },
        { title: "Nedensellik testi", text: "Yan yana getirilen iki sahnenin gerçekte olmayan neden-sonuç ilişkisi yaratıp yaratmadığını kontrol et." },
        { title: "Karşı kanıtı koru", text: "Filmin yorumunu zorlayan güçlü malzemeyi yalnız anlatıyı bozduğu için dışarı atma." },
      ],
    },
  ],
};

export function getStageGuideExtraSections(slug: string): StageGuideExtraSection[] {
  return STAGE_GUIDE_DEPTH[slug] ?? [];
}

export const STAGE_GUIDE_DEPTH_SLUGS = Object.freeze(Object.keys(STAGE_GUIDE_DEPTH));
