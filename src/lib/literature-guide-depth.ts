import type { GuideItem } from "@/lib/education-guide-batch";

export type LiteratureGuideExtraSection = {
  id: string;
  type: "text" | "cards" | "steps";
  heading: string;
  intro?: string;
  body?: string;
  items?: GuideItem[];
};

const LITERATURE_GUIDE_DEPTH: Record<string, LiteratureGuideExtraSection[]> = {
  siir: [
    {
      id: "ritim-olcu-ve-prosodi",
      type: "steps",
      heading: "Ritmi yalnız hece sayısı değil şiirin bedensel hareketi olarak kur",
      intro: "Serbest şiirde bile vurgu, tekrar, durak ve nefes görünmeyen bir ölçü sistemi oluşturur.",
      items: [
        { title: "Vurgu haritası", text: "Dizeleri yüksek sesle oku; doğal vurgu noktalarını ve istemeden oluşan tekdüzeliği işaretle." },
        { title: "Durak ve nefes", text: "Noktalama ile dize sonunun aynı yerde olmak zorunda olmadığını dene; nefesin anlamı nasıl değiştirdiğini dinle." },
        { title: "Tekrar sistemi", text: "Sözcük, ses veya sözdizimi tekrarını rastlantı değil ritim ve anlam aracı olarak kullan." },
        { title: "Ölçü kararı", text: "Hece, aruz, serbest ritim veya karma yapı seçiyorsan biçimin şiirin duygusuna neden uyduğunu bil." },
      ],
    },
    {
      id: "imge-metafor-ve-cagrisim",
      type: "cards",
      heading: "İmge ve metaforu süs değil düşünme biçimi olarak kullan",
      intro: "Güçlü imge yalnız güzel görünmez; şiirin bakışını değiştirir.",
      items: [
        { title: "Duyusal kök", text: "İmgeyi görülebilir, duyulabilir veya dokunulabilir bir ayrıntıya bağla." },
        { title: "Beklenmedik bağ", text: "İki uzak alanı yalnız şaşırtmak için değil ortak bir gerilim ürettikleri için birleştir." },
        { title: "İmge zinciri", text: "Şiirdeki ana imgelerin birbirini destekleyip desteklemediğini kontrol et; rastgele benzetme yığma." },
        { title: "Soyutlamaya dönüş", text: "İmgenin ne anlama geldiğini hemen açıklama; okura çağrışım alanı bırak." },
      ],
    },
    {
      id: "dize-kita-ve-bicim-mimarisi",
      type: "steps",
      heading: "Dize, kıta ve sayfa düzenini şiirin anlam mimarisine dönüştür",
      intro: "Şiirin biçimi, okurun metni hangi hızda ve hangi gerilimle yaşayacağını belirler.",
      items: [
        { title: "Dize sonu", text: "Dizeyi güçlü sözcükte, askıda kalan anlamda veya bilinçli bir kırılmada bitir." },
        { title: "Enjambman", text: "Cümlenin dizeden taşmasını gecikme, sürpriz veya çift anlam yaratmak için kullan." },
        { title: "Kıta işlevi", text: "Her kıtanın şiirde yeni bir görüntü, bakış, zaman veya duygusal seviye açmasını sağla." },
        { title: "Beyaz alan", text: "Boşluğu yalnız estetik görünüm değil sessizlik, kesinti ve düşünme süresi olarak değerlendir." },
      ],
    },
    {
      id: "siir-revizyonu-ve-dosya-kurma",
      type: "cards",
      heading: "Tek şiiri düzeltmekle kalma; şiir dosyasının ses bütünlüğünü de kur",
      intro: "Revizyon kelime azaltma kadar şiirin hangi metinlerin yanında yaşayacağını düşünmektir.",
      items: [
        { title: "Yoğunluk", text: "Şiirin taşıyamadığı açıklamaları, zayıf sıfatları ve tekrarlanan anlamı ayıkla." },
        { title: "Başlık", text: "Başlığın şiirde zaten söyleneni tekrar etmek yerine yeni bir okuma kapısı açmasını hedefle." },
        { title: "Sıralama", text: "Bir dosyada şiirleri yalnız yazım tarihine göre değil ses, tema ve gerilim akışına göre diz." },
        { title: "Dinlendirme", text: "Metni bir süre bırakıp geri dön; kulağın alıştığı kusurları yeni mesafeyle yeniden duy." },
      ],
    },
  ],

  deneme: [
    {
      id: "soru-ve-dusunce-hatti",
      type: "steps",
      heading: "Denemeyi tez ispatı değil düşüncenin canlı yürüyüşü olarak kur",
      intro: "Deneme bir fikri araştırabilir, yön değiştirebilir ve kesin hüküm vermeden anlamlı bir düşünce hattı tamamlayabilir.",
      items: [
        { title: "Merkez soruyu yaz", text: "Metnin neden başladığını tek soruda belirle; konu ile soruyu birbirinden ayır." },
        { title: "İlk sezgiyi koy", text: "Soruyla ilgili ilk düşünceni yaz ama onu nihai sonuç gibi kilitleme." },
        { title: "Karşı düşünceyi çağır", text: "Kendi fikrini zorlayan örnek, itiraz veya çelişkiyi metne davet et." },
        { title: "Dönüşü tamamla", text: "Metnin sonunda başlangıçtaki soruya daha derin, daha karmaşık veya daha kişisel bir bakışla dön." },
      ],
    },
    {
      id: "cagrisim-ve-gecis-mimarisi",
      type: "cards",
      heading: "Çağrışımları serbest bırak ama metnin görünmeyen bağını kaybetme",
      intro: "Denemenin özgürlüğü rastgele sıçrama değildir; iyi geçişler farklı parçaları aynı düşünce akışında tutar.",
      items: [
        { title: "Somut başlangıç", text: "Bir nesne, an, sahne veya cümleyle düşünceye kapı aç." },
        { title: "Çağrışım köprüsü", text: "Yeni parçaya geçerken ortak sözcük, fikir, görüntü veya soru üzerinden bağ kur." },
        { title: "Mesafe değişimi", text: "Kişisel deneyimden genel düşünceye, sonra yeniden somut olana dönerek ritim yarat." },
        { title: "Gereksiz sapma", text: "İlginç olduğu halde merkez soruyu büyütmeyen parçayı başka metne ayır." },
      ],
    },
    {
      id: "kaynak-alinti-ve-entelektuel-durustluk",
      type: "cards",
      heading: "Alıntı ve kaynakları düşüncenin süsü değil konuşma ortağı olarak kullan",
      intro: "Deneme akademik makale değildir; yine de başkasının fikrini doğru aktarma sorumluluğu taşır.",
      items: [
        { title: "Kaynağı doğrula", text: "Bir sözü ünlü bir isme atfetmeden önce gerçek kaynağını ve bağlamını kontrol et." },
        { title: "Alıntıyı işle", text: "Alıntıyı bırakıp geçme; neden burada olduğunu ve senin düşünceni nasıl değiştirdiğini göster." },
        { title: "Parafraz sınırı", text: "Başkasının düşüncesini kendi cümlenle yazsan bile kaynağını görünür tut." },
        { title: "Belirsizliği kabul et", text: "Emin olmadığın, tartışmalı veya kişisel yorum olan noktayı olgu gibi sunma." },
      ],
    },
    {
      id: "deneme-sesi-ve-final",
      type: "steps",
      heading: "Deneme sesini samimiyet ile düşünsel disiplin arasında kur",
      intro: "Okur, anlatıcının zihnine yaklaşırken metnin düşünsel ciddiyetini de hissetmelidir.",
      items: [
        { title: "Ses mesafesi", text: "Konuşur gibi yazmak ile dağınık konuşmayı kopyalamak arasındaki farkı koru." },
        { title: "Kesinlik ayarı", text: "Kişisel kanaat, gözlem ve doğrulanabilir bilgiyi dil düzeyinde birbirinden ayır." },
        { title: "Ritim", text: "Uzun düşünce cümlelerini kısa vurgu cümleleriyle dengele; tek tonda ilerleme." },
        { title: "Açık final", text: "Son paragrafı özet listesine çevirmeden, merkez soruya yeni bir yankı bırakarak kapat." },
      ],
    },
  ],

  ani: [
    {
      id: "hafiza-guvenilirligi",
      type: "cards",
      heading: "Hatırladığın şeyi gerçekliğin tek kaydı gibi sunma",
      intro: "Anı yazısı hafızaya dayanır; hafıza güçlü olduğu kadar seçici ve yeniden kurucudur.",
      items: [
        { title: "Emin olduğun", text: "Doğrudan hatırladığın ayrıntıları ayrı işaretle." },
        { title: "Sonradan öğrendiğin", text: "Aile anlatısı, fotoğraf, belge veya başka kişiden gelen bilgiyi kendi hatıranla karıştırma." },
        { title: "Belirsiz olan", text: "Tarih, söz veya sıra konusunda emin değilsen metinde bu belirsizliği dürüstçe göster." },
        { title: "Çapraz kontrol", text: "Mümkün olan yerlerde tarih, mekân ve olay ayrıntılarını belge veya başka tanıklarla karşılaştır." },
      ],
    },
    {
      id: "sahne-ve-bugunku-bakis",
      type: "steps",
      heading: "Geçmişteki sahne ile bugünkü anlatıcıyı iki ayrı katman olarak çalıştır",
      intro: "Anının gücü yalnız ne olduğunda değil, bugün o olaya nasıl baktığında da oluşur.",
      items: [
        { title: "Sahneyi kur", text: "O gün ne gördüğünü, duyduğunu ve yaptığını geçmişteki bilginle anlat." },
        { title: "Sonradan bilinen bilgiyi tut", text: "O anda bilmediğin sonucu sahneye erken sokarak gerçeği bozma." },
        { title: "Bugünkü yorum", text: "Sahne bittikten sonra bugünkü senin neyi farklı anladığını gösterebilirsin." },
        { title: "İki sesi ayır", text: "Çocukluk, gençlik veya geçmiş benliğin bakışıyla bugünkü yorumun birbirine karışmasın." },
      ],
    },
    {
      id: "secim-kronoloji-ve-tema",
      type: "cards",
      heading: "Hayatın tamamını anlatmaya çalışma; anının seçme ilkesini belirle",
      intro: "Anı kitabı kronolojik olabilir ama kronoloji tek başına yapı değildir.",
      items: [
        { title: "Dönem sınırı", text: "Belirli yıllar, ilişki, şehir, meslek veya kırılma üzerinden kapsamı daralt." },
        { title: "Tema hattı", text: "Hangi deneyimlerin aynı temel soruya veya değişime hizmet ettiğini belirle." },
        { title: "Zaman sıçraması", text: "Okuru kaybetmemek için her sıçramada nerede ve hangi dönemde olduğunu açıklaştır." },
        { title: "Eksiltme", text: "Gerçek olduğu halde kitabın merkezine hizmet etmeyen olayları dışarıda bırakmaktan çekinme." },
      ],
    },
    {
      id: "yasayan-kisiler-ve-etik",
      type: "cards",
      heading: "Gerçek insanları yazarken anlatı hakkın ile onların mahremiyetini birlikte düşün",
      intro: "Kendi deneyimini anlatman, başkaları hakkında sınırsız ve doğrulanmamış iddia hakkı vermez.",
      items: [
        { title: "Gereklilik", text: "Bir özel ayrıntının metnin amacı için gerçekten gerekli olup olmadığını sor." },
        { title: "Doğrulanabilir iddia", text: "Ciddi suçlama veya zarar verici iddiaları yalnız hafıza gücüyle kesin olgu gibi sunma." },
        { title: "Mahremiyet", text: "Sağlık, çocukluk, cinsellik, aile sırrı gibi alanlarda gereksiz teşhiri azalt." },
        { title: "Editoryal/hukuki kontrol", text: "Yayımlanacak gerçek kişi anlatılarında riskli bölümler için gerektiğinde uzman editoryal veya hukuki görüş al." },
      ],
    },
  ],

  gunluk: [
    {
      id: "tarih-an-ve-gozlem-disiplini",
      type: "steps",
      heading: "Günlüğü yalnız duygu boşaltımı değil düzenli gözlem pratiğine dönüştür",
      intro: "Tarih ve an bilgisi, metnin zaman içindeki değişimini görünür kılar.",
      items: [
        { title: "Tarihi sabitle", text: "Her kaydın tarihini, gerekliyse yerini ve günün bağlamını not et." },
        { title: "Somut ayrıntı", text: "‘Kötü bir gündü’ yerine o duyguyu taşıyan olay, beden, ses veya davranışı kaydet." },
        { title: "Bilmediğini ayır", text: "O gün tahmin ettiğin şey ile sonradan öğrendiğin sonucu aynı kayda sonradan karıştırma." },
        { title: "Düzenli dönüş", text: "Belirli aralıklarla eski kayıtlara bakıp tekrar eden tema ve değişimleri işaretle." },
      ],
    },
    {
      id: "mahremiyet-ve-yazma-ozgurlugu",
      type: "cards",
      heading: "Özel günlük ile yayımlanacak günlük arasındaki sınırı bilinçli kur",
      intro: "Kendin için tuttuğun ham kayıt ile okura sunacağın metnin sorumlulukları aynı değildir.",
      items: [
        { title: "Özel alan", text: "Sansürsüz düşünmek için yalnız sana ait ham kayıt alanı bırak." },
        { title: "Yayımlama kararı", text: "Bir kaydı yazarken değil, yayımlarken okur ve üçüncü kişiler üzerindeki etkisini ayrıca değerlendir." },
        { title: "Kimlik bilgileri", text: "Gereksiz kişisel veri ve mahrem ayrıntıyı yayımlama aşamasında ayıkla." },
        { title: "Güvenli saklama", text: "Dijital veya fiziksel günlüklerin erişim ve yedekleme koşullarını bilinçli seç." },
      ],
    },
    {
      id: "gunlukten-kitaba-kurgu",
      type: "steps",
      heading: "Ham günlük kayıtlarını kitaba dönüştürürken geçmişi yeniden yazma tuzağına düşme",
      intro: "Seçmek ve düzenlemek gerekir; fakat sonradan oluşan bilgiyi eski kaydın içine gizlice eklemek belge niteliğini bozar.",
      items: [
        { title: "Kapsam seç", text: "Belirli dönem, tema veya dönüşüm çizgisi belirle." },
        { title: "Kayıtları etiketle", text: "Tema, kişi, yer ve kırılma noktalarına göre kayıtları sınıflandır." },
        { title: "Kes ve sırala", text: "Tekrarları azalt; fakat tarihin anlamını değiştirecek montajdan kaçın." },
        { title: "Editör notunu ayır", text: "Bugünden eklediğin açıklama gerekiyorsa bunu özgün kayıttan ayırt edilebilir biçimde sun." },
      ],
    },
    {
      id: "ses-degisimi-ve-uzun-vade",
      type: "cards",
      heading: "Günlüğün en güçlü malzemelerinden biri zamanla değişen sestir",
      intro: "Aynı kişinin aylar ve yıllar içindeki kelime seçimi, öncelikleri ve kör noktaları doğal bir anlatı yayı kurabilir.",
      items: [
        { title: "Tekrar eden sözcük", text: "Dönemlere göre tekrar eden kelime ve konuların nasıl değiştiğini izle." },
        { title: "Tutarsızlık", text: "Geçmişteki kendinle bugün çeliştiğin yerleri silmek yerine dönüşümün parçası olarak değerlendir." },
        { title: "Sessiz dönem", text: "Yazılmamış günler de anlam taşır; neden sustuğunu sonradan kesinleştirmeden not edebilirsin." },
        { title: "Zaman duygusu", text: "Kayıtların ardışıklığının okura hızlanma, bekleme veya değişim hissi vermesini kullan." },
      ],
    },
  ],

  mektup: [
    {
      id: "muhatap-ve-iliski-haritasi",
      type: "cards",
      heading: "Mektubun dilini konudan önce muhatapla kurulan ilişki belirler",
      intro: "Aynı olay sevgiliye, arkadaşına, çocuğa, kuruma veya hiç gönderilmeyecek bir kişiye farklı yazılır.",
      items: [
        { title: "Yakınlık", text: "Muhatapla arandaki duygusal ve sosyal mesafeyi belirle." },
        { title: "Ortak bilgi", text: "İkinizin zaten bildiği şeyleri gereksiz açıklama; dış okur için yazıyorsan bağlamı başka yerde kur." },
        { title: "Amaç", text: "Bilgilendirmek, barışmak, vedalaşmak, ikna etmek veya tanıklık etmek gibi temel amacı netleştir." },
        { title: "Söylenmeyen", text: "Mektubun gerilimini yalnız söylenen değil, ertelenen veya dolaylı anlatılan şey de taşıyabilir." },
      ],
    },
    {
      id: "hitap-ton-ve-retorik",
      type: "steps",
      heading: "Hitap, ton ve retoriği mektubun duygusal eylemine göre ayarla",
      intro: "Mektup tek taraflı konuşmadır ama zihninde gerçek bir karşı taraf taşır.",
      items: [
        { title: "Açılış", text: "İlk cümlede ilişkinin sıcaklığını, gerilimini veya resmiyetini hissettir." },
        { title: "Duygusal hareket", text: "Mektubun ortasında yalnız bilgi ekleme; düşünce veya ilişki durumunda değişim oluştur." },
        { title: "İkna sınırı", text: "Manipülasyon ile gerekçeli çağrı arasındaki farkı koru; karşı tarafın iradesini yok sayma." },
        { title: "Kapanış", text: "Veda, soru, talep veya açık uçlu bekleyiş gibi son hareketi bilinçli seç." },
      ],
    },
    {
      id: "mektup-dizisi-ve-epistoler-yapi",
      type: "cards",
      heading: "Tek mektuptan diziye geçerken ilişki ve bilgi değişimini izlet",
      intro: "Mektuplar art arda geldiğinde tarih, cevap boşluğu ve ton değişimi anlatının parçasına dönüşür.",
      items: [
        { title: "Zaman aralığı", text: "Mektuplar arasındaki gün veya yılların ilişkiyi nasıl etkilediğini görünür kıl." },
        { title: "Cevapsızlık", text: "Yanıt gelmeyen mektubun sonraki metinde nasıl yankılandığını kullan." },
        { title: "Bilgi asimetrisi", text: "Yazan ile okuyan kişinin bildikleri arasındaki farkı dramatik veya duygusal araç olarak değerlendir." },
        { title: "Ses değişimi", text: "Aynı kişinin zaman içindeki hitap ve kelime seçiminden dönüşümü hissettir." },
      ],
    },
    {
      id: "gercek-mektup-haklar-ve-baglam",
      type: "cards",
      heading: "Gerçek mektupları yayımlarken belge, mahremiyet ve bağlam sorumluluğunu birlikte yönet",
      intro: "Bir mektubun sende bulunması her zaman sınırsız yayımlama hakkı anlamına gelmez.",
      items: [
        { title: "Kaynak ve tarih", text: "Mektubun kökenini, tarihini ve mümkünse özgün nüshasını doğrula." },
        { title: "Telif ve izin", text: "Yayımlama hakkı, mirasçı veya arşiv koşulları gibi hukuki gereklilikleri kontrol et." },
        { title: "Mahrem kişiler", text: "Mektupta adı geçen üçüncü kişilerin hassas bilgilerini gereksizce teşhir etme." },
        { title: "Editoryal müdahale", text: "Kesinti, sadeleştirme veya yazım düzeltmesi yaptıysan özgün belgeyi yanıltıcı biçimde değiştirme." },
      ],
    },
  ],

  biyografi: [
    {
      id: "kaynak-hiyerarsisi-ve-dogrulama",
      type: "steps",
      heading: "Biyografiyi güçlü anlatıdan önce doğrulanabilir kaynak sistemi üzerine kur",
      intro: "Tek bir tanığın veya popüler anlatının çekiciliği, biyografik gerçeğin yerine geçmez.",
      items: [
        { title: "Birincil kaynak", text: "Mektup, günlük, resmi belge, kayıt, fotoğraf ve doğrudan tanıklıkları ayrı sınıflandır." },
        { title: "İkincil kaynak", text: "Önceki biyografi, makale ve araştırmaların hangi kaynaklara dayandığını kontrol et." },
        { title: "Çelişki kaydı", text: "Kaynaklar uyuşmadığında birini sessizce seçmek yerine çelişkiyi ve gerekçeni not et." },
        { title: "İddia seviyesi", text: "Kanıtın gücüne göre ‘oldu’, ‘muhtemelen’, ‘iddia edildi’ gibi dil seviyesini ayarla." },
      ],
    },
    {
      id: "kronoloji-ve-tematik-mimari",
      type: "cards",
      heading: "Kronolojiyi omurga olarak kullan ama yaşamı tarih listesine dönüştürme",
      intro: "Biyografi, olayların sırasını korurken neden bazı dönemlerin diğerlerinden daha önemli olduğunu da göstermelidir.",
      items: [
        { title: "Zaman çizgisi", text: "Temel tarihleri ve yer değişikliklerini ayrı bir doğrulama çizelgesinde tut." },
        { title: "Dönem bölümü", text: "Bölümleri yalnız yaş aralığına değil değişim, ilişki veya üretim dönemlerine göre kur." },
        { title: "Geri dönüş", text: "Kronolojiden ayrılıyorsan okurun nerede olduğunu net biçimde yeniden kur." },
        { title: "Boşluk", text: "Kaynağın sustuğu dönemi kurmaca ayrıntıyla doldurma; bilinmeyeni bilinmeyen olarak bırak." },
      ],
    },
    {
      id: "kisi-ve-donem-dengesi",
      type: "steps",
      heading: "Kişiyi döneminden koparma, dönemi de kişinin önüne geçirme",
      intro: "Biyografik bağlam, öznenin seçimlerini anlamayı sağlar; onu yalnız çağının ürünü ilan etmez.",
      items: [
        { title: "Kurumsal bağlam", text: "Okul, iş, siyaset, sanat çevresi veya aile yapısının gerçek etkisini kaynakla göster." },
        { title: "Seçim alanı", text: "Aynı koşullardaki herkesin aynı kararı vermediğini hatırla; öznenin özgün kararlarını koru." },
        { title: "Dönem dili", text: "Bugünün kavramlarını geçmişe otomatik uygulamadan önce tarihsel anlam farkını araştır." },
        { title: "Karşılaştırma", text: "Gerekliyse çağdaş kişilerle kısa karşılaştırmalar yap ama biyografiyi genel tarih kitabına dönüştürme." },
      ],
    },
    {
      id: "etik-mahremiyet-ve-itibar",
      type: "cards",
      heading: "Biyografide kamu yararı, mahremiyet ve itibar riskini editoryal kararın parçası yap",
      intro: "Özellikle yaşayan kişiler ve yakın dönem anlatılarında doğruluk kadar gereklilik de önemlidir.",
      items: [
        { title: "Kaynak güveni", text: "Ağır iddiaları tek ve çıkar ilişkisi olabilecek bir kaynağa dayandırma." },
        { title: "Özel hayat", text: "Kişinin eserini veya tarihsel rolünü anlamaya katkı vermeyen mahrem ayrıntıyı sırf ilgi çekici diye kullanma." },
        { title: "Cevap hakkı", text: "Tartışmalı yakın dönem iddialarında mümkünse ilgili tarafın görüşünü veya kayıtlı karşı anlatıyı araştır." },
        { title: "Uzman kontrol", text: "Hukuki risk taşıyan ciddi iddialarda yayımdan önce uzman editoryal/hukuki inceleme düşün." },
      ],
    },
  ],

  otobiyografi: [
    {
      id: "benlik-hafiza-ve-kor-nokta",
      type: "cards",
      heading: "Kendi hayatının merkezinde olman, kendi anlatının tarafsız tanığı olduğun anlamına gelmez",
      intro: "Otobiyografinin güveni kusursuz hafızadan değil, kendi bakışının sınırlarını fark etmekten doğar.",
      items: [
        { title: "Kendini haklı çıkarma", text: "Her çatışmada bugünkü kendini otomatik olarak doğru tarafa yerleştirip yerleştirmediğini sorgula." },
        { title: "Hafıza boşluğu", text: "Hatırlamadığın yeri dramatik bütünlük uğruna uydurma." },
        { title: "Başka tanık", text: "Önemli olaylarda mümkünse belge, tarih ve başka kişilerin anlatılarıyla kendi hafızanı karşılaştır." },
        { title: "Değişen yorum", text: "Bir olayı bugün başka anlamlandırıyorsan geçmişteki duyguyu silmeden iki katmanı birlikte göster." },
      ],
    },
    {
      id: "yasam-haritasi-ve-secim",
      type: "steps",
      heading: "Hayat kronolojisinden anlatılacak hayatı seç",
      intro: "Doğumdan bugüne her olayı eşit ağırlıkla anlatmak otobiyografi değil kayıt dökümü üretir.",
      items: [
        { title: "Dönüm noktalarını çıkar", text: "Kimliğini, yönünü veya ilişkilerini gerçekten değiştiren olayları haritala." },
        { title: "Merkez soruyu seç", text: "Kitabın hangi hayat sorusunu takip edeceğini belirle." },
        { title: "Dönemleri grupla", text: "Yılları yalnız tarihe değil dönüşüm evrelerine göre böl." },
        { title: "Atlamayı kabul et", text: "Merkez soruya hizmet etmeyen yılları kısaltabilir veya atlayabilirsin." },
      ],
    },
    {
      id: "sahne-yansima-dengesi",
      type: "cards",
      heading: "Yaşanmış sahne ile bugünkü yansımayı birbirinin yerine kullanma",
      intro: "Okur hem o anda ne olduğunu yaşamak hem de bugün neden önemli olduğunu anlamak ister.",
      items: [
        { title: "Sahne", text: "Kritik anları eylem, mekân ve konuşmayla yeniden kur; bilmediğin ayrıntıyı icat etme." },
        { title: "Yansıma", text: "Sahne sonrasında bugünkü bakışınla anlam, hata veya değişimi tartış." },
        { title: "Oran", text: "Her sahneyi uzun yorumla boğma; bazı anların kendi ağırlığıyla kalmasına izin ver." },
        { title: "Ses tutarlılığı", text: "Geçmiş benliğin diliyle bugünkü anlatıcının bilgisini bilinçli ayır." },
      ],
    },
    {
      id: "aile-mahremiyet-ve-gercek-kisiler",
      type: "cards",
      heading: "Kendi hikâyeni anlatırken başkalarının hayatını da yayımladığını unutma",
      intro: "Otobiyografi özellikle aile, eş, çocuk ve eski ilişkiler hakkında ek sorumluluk taşır.",
      items: [
        { title: "Gereklilik", text: "Mahrem ayrıntının kendi dönüşümünü anlamak için gerçekten gerekli olup olmadığını sor." },
        { title: "Çocuklar", text: "Çocukların gelecekteki mahremiyetini ilgilendiren bilgileri daha yüksek eşikle değerlendir." },
        { title: "Suçlama", text: "Doğrulanmamış ciddi iddiaları kesin gerçek gibi yazma; kaynak ve dil seviyesini kontrol et." },
        { title: "Yayımlama öncesi kontrol", text: "Riskli gerçek kişi bölümlerinde bağımsız editoryal ve gerektiğinde hukuki değerlendirme al." },
      ],
    },
  ],

  "gezi-yazisi": [
    {
      id: "saha-notu-ve-duyusal-gozlem",
      type: "steps",
      heading: "Gezi yazısının malzemesini yolculuk sırasında sistemli topla",
      intro: "Sonradan hatırlamaya bırakılan ayrıntı hızla genelleşir; iyi gezi yazısı sahada tutulmuş özgül notlarla güçlenir.",
      items: [
        { title: "Beş duyu", text: "Görüntünün yanında ses, koku, sıcaklık, dokunma ve hareket ayrıntılarını kaydet." },
        { title: "Konuşma notu", text: "Duyduğun ifadeleri bağlam ve izin koşuluyla mümkün olduğunca doğru not et." },
        { title: "Yer ve zaman", text: "Notun hangi sokak, durak, mahalle veya saatte oluştuğunu işaretle." },
        { title: "İlk izlenim / gerçek", text: "İlk tahminini doğrulanmış bilgi gibi yazmamak için gözlem ile yorumu ayrı tut." },
      ],
    },
    {
      id: "yer-arastirmasi-ve-dogruluk",
      type: "cards",
      heading: "Mekânın tarihini ve güncel bilgisini güvenilir kaynaklarla doğrula",
      intro: "Bir rehberden duyulan renkli hikâye, tekrarlandığı için otomatik olarak tarihsel gerçek olmaz.",
      items: [
        { title: "Tarih", text: "Tarihsel iddiaları müze, arşiv, akademik çalışma veya güvenilir kurumsal kaynaklarla kontrol et." },
        { title: "Ad ve dil", text: "Yerel adların yazımını, telaffuzunu ve anlamını mümkün olduğunca doğru aktar." },
        { title: "Güncellik", text: "Ulaşım, fiyat, giriş kuralı ve açılış saati gibi hızla değişen bilgiyi tarih belirterek doğrula." },
        { title: "Efsane ayrımı", text: "Yerel efsaneyi olgu diye sunma; anlatının efsane, rivayet veya belgelenmiş tarih olduğunu belirt." },
      ],
    },
    {
      id: "rota-ve-anlati-yapisi",
      type: "steps",
      heading: "Gezi rotasını kilometre sırasından anlatı hareketine dönüştür",
      intro: "Okur yalnız nereden nereye gittiğini değil, yolculuk boyunca bakışının nasıl değiştiğini izlemelidir.",
      items: [
        { title: "Giriş sorusu", text: "Yola çıkarken ne aradığını, neyi yanlış bildiğini veya neyi merak ettiğini kur." },
        { title: "Durak seçimi", text: "Her durağın aynı ağırlıkta olmasına gerek yok; anlatıyı değiştiren durakları büyüt." },
        { title: "Karşılaşma", text: "Mekânı yalnız bina ve manzara değil insan, ritüel, çalışma ve gündelik hayatla birlikte göster." },
        { title: "Dönüş", text: "Finalde geziyi broşür özetiyle değil başlangıçtaki bakışın nasıl değiştiğiyle kapat." },
      ],
    },
    {
      id: "temsil-ve-seyahat-etigi",
      type: "cards",
      heading: "Başka kültürü egzotik dekor olarak değil kendi bağlamı içinde anlat",
      intro: "Gezi yazarı gözlemcidir; gördüğü topluluğun tamamını birkaç karşılaşmadan genellememelidir.",
      items: [
        { title: "Genelleme", text: "‘Buradaki insanlar böyledir’ türü geniş hükümler yerine kiminle, nerede ve hangi koşulda karşılaştığını yaz." },
        { title: "Fotoğraf ve izin", text: "Özellikle çocuklar, ibadet, yas veya hassas alanlarda görüntü almanın yerel ve etik sınırlarını gözet." },
        { title: "Ekonomik bağlam", text: "Yoksulluk veya ayrıcalığı yalnız estetik manzara gibi kullanma; kendi konumunu da fark et." },
        { title: "Yerel ses", text: "Mümkünse yerel insanların kendi sözcüklerine, kaynaklarına ve farklı görüşlerine alan aç." },
      ],
    },
  ],

  elestiri: [
    {
      id: "olcut-ve-yargi-mimarisi",
      type: "steps",
      heading: "Eleştirel yargıyı zevk cümlesinden açık ölçüte dönüştür",
      intro: "‘Beğendim’ veya ‘başarısız’ tek başına eleştiri değildir; okur hangi ölçüte göre ve hangi kanıtla karar verdiğini görmelidir.",
      items: [
        { title: "Nesneyi tanımla", text: "Eseri kendi türü, amacı, dönemi ve üretim koşulu içinde konumlandır." },
        { title: "Ölçütü açıkla", text: "Dil, yapı, özgünlük, temsil, teknik, tarihsel bağlam gibi hangi eksenlerde değerlendirdiğini belirle." },
        { title: "Kanıt göster", text: "Yargını eserden somut ayrıntı, sahne, biçim veya kısa alıntıyla destekle." },
        { title: "Sonucu sınırla", text: "Bir zayıflıktan tüm eseri, tek eserden tüm sanatçıyı kapsayan aşırı hüküm üretme." },
      ],
    },
    {
      id: "yakin-okuma-ve-kanit",
      type: "cards",
      heading: "Yakın okumayla eserin gerçekten yaptığı şeyi metin üzerinden göster",
      intro: "Eleştirinin ikna gücü büyük kavramlardan önce ayrıntıyı doğru okuyabilmesinden gelir.",
      items: [
        { title: "Dil", text: "Sözcük seçimi, tekrar, anlatıcı ve ritmin etkisini örnek üzerinden çözümle." },
        { title: "Yapı", text: "Bölüm, sahne, kurgu veya kompozisyon kararlarının sonucu nasıl değiştirdiğini incele." },
        { title: "Motif", text: "Tekrarlanan görüntü, tema veya biçim unsurunun eser boyunca nasıl dönüştüğünü izle." },
        { title: "Karşı örnek", text: "Kendi yargını zorlayan güçlü bir bölüm varsa onu görmezden gelme; argümanını daha hassas kur." },
      ],
    },
    {
      id: "baglam-ve-adil-karsilastirma",
      type: "steps",
      heading: "Eseri bağlama yerleştir ama bağlamı mazerete veya saldırıya dönüştürme",
      intro: "Karşılaştırma ancak benzer ölçekte ve gerekçeli olduğunda eleştiriyi güçlendirir.",
      items: [
        { title: "Tür beklentisi", text: "Eseri olmadığı bir türün kurallarıyla cezalandırma." },
        { title: "Dönem", text: "Tarihsel eserlerde dönemin dilini ve üretim koşullarını araştır; bugünkü ölçütü otomatik uygulama." },
        { title: "Benzer eser", text: "Karşılaştırdığın örneklerin neden ilgili olduğunu açıkla." },
        { title: "Kişi / eser ayrımı", text: "Eser değerlendirmesini yaratıcıya yönelik kişisel küçümseme veya niyet okumasına dönüştürme." },
      ],
    },
    {
      id: "elestiri-etigi-ve-final",
      type: "cards",
      heading: "Sert olabilirsin; fakat doğruluk, alıntı ve adalet standardını düşürme",
      intro: "Eleştiri fikir ve eserle hesaplaşır; çarpıtma ile değil.",
      items: [
        { title: "Alıntı bağlamı", text: "Bir cümleyi ters anlam yaratacak şekilde bağlamından koparma." },
        { title: "Olgu kontrolü", text: "Yazar, yayın tarihi, eser bilgisi ve tarihsel iddiaları doğrula." },
        { title: "Çıkar ilişkisi", text: "Eser veya yaratıcıyla maddi/kişisel ilişkin varsa gerekli durumlarda açıkla." },
        { title: "Son hüküm", text: "Finalde güçlü ve zayıf yanları yeniden tartarak yargının kapsamını açık tut." },
      ],
    },
  ],

  inceleme: [
    {
      id: "kapsam-soru-ve-inceleme-nesnesi",
      type: "steps",
      heading: "İncelemenin kapsamını geniş konudan cevaplanabilir soruya indir",
      intro: "İnceleme, malzemeyi sıralamak değil belirli bir soruya göre düzenlemek ve çözümlemektir.",
      items: [
        { title: "Nesneyi sınırla", text: "Hangi eser, dönem, kavram, olay veya malzeme grubunu incelediğini netleştir." },
        { title: "Soruyu yaz", text: "‘Neyi anlatıyor?’dan daha analitik ve sınanabilir bir soru kur." },
        { title: "Kapsam dışını belirle", text: "Metnin ele almayacağı alanları baştan not ederek dağılmayı önle." },
        { title: "Okur vaadi", text: "İncelemenin sonunda okurun hangi yeni ilişkiyi veya ayrımı anlayacağını tanımla." },
      ],
    },
    {
      id: "malzeme-toplama-ve-kaynak-duzeni",
      type: "cards",
      heading: "İnceleme malzemesini kaynak türüne ve kanıt değerine göre düzenle",
      intro: "Not yığını analiz değildir; kaynakların neyi kanıtlayabildiğini bilmelisin.",
      items: [
        { title: "Birincil malzeme", text: "İncelediğin eser, belge, kayıt veya nesneyi doğrudan notla." },
        { title: "Bağlam kaynağı", text: "Dönem, kavram ve üretim koşulunu açıklayan güvenilir ikincil kaynakları ayır." },
        { title: "Alıntı kaydı", text: "Sayfa, bölüm, tarih veya bağlantı bilgisini not anında ekle." },
        { title: "Karşı görüş", text: "Kendi yorumuna uymayan güçlü kaynakları da dosyada tut." },
      ],
    },
    {
      id: "analitik-cerceve-ve-kodlama",
      type: "steps",
      heading: "Malzemeyi aynı sorularla okuyabileceğin analitik çerçeve kur",
      intro: "Çerçeve, her parçayı rastgele yorumlamak yerine karşılaştırılabilir hale getirir.",
      items: [
        { title: "Kategorileri belirle", text: "Tema, biçim, dönem, karakter, kavram veya teknik gibi analiz başlıklarını seç." },
        { title: "Kodla", text: "Örnekleri ilgili kategoriye işaretle; aynı parçanın birden fazla işlevi olabileceğini kabul et." },
        { title: "Örüntü ara", text: "Tek örneğe değil tekrar eden ilişki, fark ve istisnalara bak." },
        { title: "Çerçeveyi güncelle", text: "Malzeme ilk planını boşa çıkarıyorsa veriyi zorlamak yerine kategoriyi yeniden kur." },
      ],
    },
    {
      id: "sentez-ve-sonuc",
      type: "cards",
      heading: "İncelemeyi özet yığınından senteze taşı",
      intro: "Sonuç, daha önce yazdıklarını tekrar etmek yerine parçalar arasında ne öğrendiğini göstermelidir.",
      items: [
        { title: "Benzerlik", text: "Malzemelerin ortak hareketini açık bir cümleyle kur." },
        { title: "Fark", text: "Önemli ayrımların neden sonuç değiştirdiğini açıkla." },
        { title: "İstisna", text: "Genel örüntüye uymayan güçlü örneği dışarı atma; yorumunu hassaslaştır." },
        { title: "Sınır", text: "İncelemenin hangi soruları cevaplamadığını ve hangi yeni araştırmaya kapı açtığını belirt." },
      ],
    },
  ],

  "edebi-kurmaca": [
    {
      id: "bakis-acisi-ve-bilinc-mesafesi",
      type: "steps",
      heading: "Bakış açısını yalnız kişi seçimi değil bilinç mesafesi olarak yönet",
      intro: "Birinci veya üçüncü kişi kararı kadar anlatıcının karakterin zihnine ne kadar yaklaştığı da üslubu belirler.",
      items: [
        { title: "Bilgi sınırı", text: "Anlatıcının neyi bilebileceğini ve neyi yalnız tahmin edebileceğini belirle." },
        { title: "Mesafe", text: "Sahne içinde karakterin bedeni, düşüncesi ve dış gözlem arasında bilinçli geçiş yap." },
        { title: "Sözcük filtresi", text: "Dünya betimlerinin anlatıcı veya karakterin algısından geçmesini sağla." },
        { title: "Tutarlılık", text: "Bakış açısı kırılmasını yalnız kolay bilgi vermek için rastgele kullanma." },
      ],
    },
    {
      id: "cumle-ritmi-ve-uslup",
      type: "cards",
      heading: "Üslubu süslü cümle değil tutarlı dil kararı olarak kur",
      intro: "Cümle uzunluğu, fiil seçimi, soyutluk seviyesi ve ses tekrarları anlatının duygusal sıcaklığını değiştirir.",
      items: [
        { title: "Cümle uzunluğu", text: "Aksiyon, düşünme ve gerilim anlarında ritmi ihtiyaca göre değiştir." },
        { title: "Fiil gücü", text: "Gereksiz zarf ve sıfat yerine doğru fiili aramayı önceliklendir." },
        { title: "Sözcük alanı", text: "Eserin dünyasına ait tekrar eden kelime ailelerini bilinçli kullan." },
        { title: "Gösteriş testi", text: "Güzel görünen ama karakter, atmosfer veya anlam üretmeyen cümleyi koruma zorunluluğu hissetme." },
      ],
    },
    {
      id: "altmetin-motif-ve-tema",
      type: "steps",
      heading: "Temayı açıklamak yerine sahne, motif ve alt metin içinde tekrar tekrar sınat",
      intro: "Tema, karakterlerin söylediği ders değil eser boyunca karşılaştıkları değer çatışmasıdır.",
      items: [
        { title: "Tema sorusu", text: "Eserin cevap vermekten çok sınadığı temel değer sorusunu yaz." },
        { title: "Motif seç", text: "Nesne, mekân, ses veya davranışın farklı sahnelerde yeni anlam kazanmasını sağla." },
        { title: "Alt metin kur", text: "Karakterlerin açık sözleri ile gerçek ihtiyaçları arasında gerilim yarat." },
        { title: "Karşı örnek", text: "Temanın tek yönlü vaaza dönüşmemesi için başka bir karakter veya olayla zıt sonuç göster." },
      ],
    },
    {
      id: "edebi-revizyon-katmanlari",
      type: "cards",
      heading: "Edebî kurmacayı tek turda değil ayrı revizyon katmanlarıyla yeniden yaz",
      intro: "Yapı problemi ile cümle problemini aynı anda düzeltmeye çalışmak büyük kusurları gizleyebilir.",
      items: [
        { title: "Yapı turu", text: "Sahne sırası, nedensellik, karakter dönüşümü ve finali önce büyük ölçekte test et." },
        { title: "Bakış açısı turu", text: "Her sahnenin doğru bilinç ve bilgi sınırında kalıp kalmadığını kontrol et." },
        { title: "Dil turu", text: "Tekrar, klişe, soyut anlatım ve ritim problemlerini cümle düzeyinde temizle." },
        { title: "Sesli okuma", text: "Nefes, vurgu ve yapay ritmi kulakla yakalamak için kritik bölümleri sesli oku." },
      ],
    },
  ],

  soylesi: [
    {
      id: "soru-mimarisi",
      type: "steps",
      heading: "Soru listesini bilgi toplama formundan gerçek konuşma mimarisine dönüştür",
      intro: "İyi söyleşi, hazır soruları bitirmekten çok konuğun cevaplarına göre derinleşir.",
      items: [
        { title: "Araştırma", text: "Konuğun kolayca bulunabilen temel bilgilerini önceden öğren; zamanı yüzeysel sorulara harcama." },
        { title: "Açık soru", text: "Evet/hayır cevabı yerine deneyim, karar ve düşünme sürecini açan sorular kur." },
        { title: "Sıralama", text: "Güven kuran başlangıçtan daha hassas veya analitik sorulara doğru doğal akış planla." },
        { title: "Yedek hat", text: "Konuşma beklenmedik yönde kapanırsa kullanabileceğin alternatif soru kümeleri hazırla." },
      ],
    },
    {
      id: "dinleme-ve-takip-sorusu",
      type: "cards",
      heading: "En iyi takip sorusunu listede değil konuğun son cümlesinde ara",
      intro: "Aktif dinleme, söyleşiyi önceden hazırlanmış metinden canlı düşünceye taşır.",
      items: [
        { title: "Belirsiz sözcük", text: "‘Zordu’, ‘değişti’, ‘başardık’ gibi geniş ifadelerde ‘nasıl?’ ve ‘ne değişti?’ diye derinleş." },
        { title: "Çelişki", text: "Önceki cevapla yeni cevap arasında fark varsa saldırmadan netleştirme iste." },
        { title: "Örnek", text: "Soyut görüşün gerçek olay veya an üzerinden anlatılmasını iste." },
        { title: "Sessizlik", text: "Sorudan sonra boşluğu hemen doldurma; konuğa düşünme süresi bırak." },
      ],
    },
    {
      id: "kayit-desifre-ve-edit-etigi",
      type: "steps",
      heading: "Kaydı metne dönüştürürken konuğun anlamını düzeltme adına yeniden yazma",
      intro: "Okunabilirlik için edit yapılabilir; fakat kişinin söylediği şeyi başka bir iddiaya dönüştürmemelisin.",
      items: [
        { title: "Kayıt izni", text: "Görüşme öncesi kayıt ve kullanım koşullarını açıklaştır." },
        { title: "Doğru deşifre", text: "Önemli alıntıları kayıtla yeniden karşılaştır; isim ve teknik terimleri doğrula." },
        { title: "Temizleme", text: "Dolgu sözcüklerini azaltırken ton ve anlamı koru." },
        { title: "Kesme bağlamı", text: "Parçaları birleştirerek kişinin söylemediği neden-sonuç veya kesinlik üretme." },
      ],
    },
    {
      id: "cerceveleme-ve-yayina-hazirlik",
      type: "cards",
      heading: "Söyleşiyi yayımlarken başlık ve girişin konuşmadan daha iddialı olmasına izin verme",
      intro: "Okur çoğu zaman önce başlığı görür; çarpıcı olmak için bağlamı bozmak güveni zedeler.",
      items: [
        { title: "Başlık", text: "Konuğun gerçek ifadesini anlamını değiştirecek şekilde sansasyonelleştirme." },
        { title: "Giriş", text: "Konuğu, görüşmenin zamanını ve neden önemli olduğunu kısa ve doğru bağlamla sun." },
        { title: "Fact-check", text: "Söyleşide geçen dış olguları mümkün olduğunda ayrıca doğrula; yanlış bilgiyi yalnız alıntı olduğu için koruma." },
        { title: "Hassas içerik", text: "Mahremiyet, güvenlik veya travma içeren bölümlerde yayın kararını zarar ve gereklilik açısından yeniden değerlendir." },
      ],
    },
  ],

  portre: [
    {
      id: "gozlem-ve-secici-ayrinti",
      type: "steps",
      heading: "Portreyi sıfat yığınıyla değil seçilmiş davranış ve ayrıntıyla kur",
      intro: "‘Karizmatik’, ‘sert’, ‘mütevazı’ demek yerine okurun bu sonucu çıkarabileceği sahne ve ayrıntıyı göster.",
      items: [
        { title: "Davranış", text: "Kişinin beklerken, konuşurken, dinlerken veya karar verirken ne yaptığını gözle." },
        { title: "Mekân", text: "Çalışma masası, ev, sokak veya rutin gibi kişinin dünyasını anlatan çevre ayrıntısını seç." },
        { title: "Dil", text: "Tekrar ettiği kelimeler, duraksamalar ve cümle ritmi karaktere dair ipucu verebilir." },
        { title: "Kesme", text: "İlginç fakat merkez izlenimi büyütmeyen ayrıntıyı sırf gözlemledin diye kullanma." },
      ],
    },
    {
      id: "sahne-ve-karakterizasyon",
      type: "cards",
      heading: "Kişiyi tanımlamak yerine onu seçim yaptığı küçük sahnelerde göster",
      intro: "Portre, biyografideki kadar bütün hayatı anlatmayabilir; birkaç güçlü sahne kişiliğin gerilimini görünür kılabilir.",
      items: [
        { title: "Açılış sahnesi", text: "Kişinin karakterini veya çelişkisini tek davranışta hissettiren an seç." },
        { title: "Karşıtlık", text: "Kamusal imge ile özel davranış, söz ile eylem veya güç ile kırılganlık arasındaki farkı araştır." },
        { title: "İlişki", text: "Kişinin başkalarıyla nasıl davrandığını gözlemek, doğrudan kendini anlatmasından farklı bilgi üretir." },
        { title: "Kapanış görüntüsü", text: "Özeti tekrarlamak yerine kişi hakkında kalan anlamı taşıyan son bir hareket veya görüntü kullan." },
      ],
    },
    {
      id: "baglam-ve-dogrulama",
      type: "steps",
      heading: "Gözlemi bağlam ve doğrulanabilir bilgiyle destekle",
      intro: "Bir karşılaşmadan kişinin tüm hayatına dair kesin sonuç çıkarmak portreyi karikatüre dönüştürür.",
      items: [
        { title: "Temel olgular", text: "Yaş, görev, eser, tarih ve yer gibi dış bilgileri doğrula." },
        { title: "Geçmiş bağlamı", text: "Bugünkü davranışı açıklamak için geçmiş bilgisi kullanıyorsan güvenilir kaynağını kontrol et." },
        { title: "Başka bakış", text: "Gerekliyse kişiyle çalışan veya yaşayan başka insanların gözlemleriyle tek izlenimini sınayabilirsin." },
        { title: "Yorum sınırı", text: "Davranıştan psikolojik teşhis veya kanıtsız niyet sonucu çıkarmamaya dikkat et." },
      ],
    },
    {
      id: "portre-etigi-ve-mesafe",
      type: "cards",
      heading: "Yakınlık ile adil mesafeyi birlikte koru",
      intro: "Portre yazarı kişiye hayran da olabilir eleştirel de; metnin güveni yine doğruluk ve adalete bağlıdır.",
      items: [
        { title: "Hayranlık körlüğü", text: "Olumlu izlenimin çelişkili veya zayıf yanları görmeni engellemesine izin verme." },
        { title: "Küçümseme", text: "Fiziksel ayrıntı veya kişisel alışkanlığı küçük düşürme aracı olarak kullanma." },
        { title: "Mahremiyet", text: "Kamusal portre için gerekli olmayan hassas özel bilgiyi teşhir etme." },
        { title: "Okur sözleşmesi", text: "Kişiyi ne kadar süre, hangi koşulda gözlemlediğini gerektiğinde açık ederek portrenin sınırını dürüst tut." },
      ],
    },
  ],
};

export function getLiteratureGuideExtraSections(slug: string): LiteratureGuideExtraSection[] {
  return LITERATURE_GUIDE_DEPTH[slug] ?? [];
}

export const LITERATURE_GUIDE_DEPTH_SLUGS = Object.freeze(Object.keys(LITERATURE_GUIDE_DEPTH));
