import type { EducationGuideDefinition, GuideItem } from "@/lib/education-guide-batch";

type ExtraEducationSection = {
  id: string;
  type: "text" | "cards" | "steps";
  heading: string;
  intro?: string;
  body?: string;
  items?: GuideItem[];
};

type GraphicGuideDefinition = EducationGuideDefinition & {
  extraSections: ExtraEducationSection[];
};

type Profile = {
  slug: string;
  label: string;
  title: string;
  description: string;
  summary: string;
  projectName: string;
  orientation: string;
  ideaItems: GuideItem[];
  ideaFlow: string;
  contrastItems: GuideItem[];
  routeItems: GuideItem[];
  structureItems: GuideItem[];
  anatomy: string;
  practiceItems: GuideItem[];
  workspaceItems: GuideItem[];
  craft: string;
  extraSections: ExtraEducationSection[];
  draftItems: GuideItem[];
  revisionItems: GuideItem[];
  projectBody: string;
  sampleHeading: string;
  sampleBody: string;
  finalItems: GuideItem[];
  outputItems: GuideItem[];
  masters: GuideItem[];
  faq: { question: string; answer: string }[];
};

function alts(label: string, project: string): EducationGuideDefinition["alts"] {
  return {
    hero: `${label} yazarlığı için panel, sayfa, sahne ve metin notları bulunan İlkOku çalışma masası`,
    ideaFlow: `${label} fikrinin görsel anlatı çekirdeğinden panel ve sayfa akışına dönüşümünü gösteren eğitim şeması`,
    structure: `${label} eserinin panel, sayfa, bölüm veya kaydırma ritmini gösteren yapı diyagramı`,
    anatomy: `${label} eserinin görsel kompozisyon, metin, boşluk ve ritim parçalarını gösteren eser anatomisi`,
    pageSetup: `${label} üretimi için panel planı, taslak, referans ve revizyon notlarının düzenlendiği çalışma alanı`,
    project: `${project} adlı örnek projenin sayfa, panel ve anlatı kararlarını gösteren çalışma panosu`,
    finalCta: `${label} taslağını tamamlayıp İlkOku Yazar Alanı'nda üretime geçmeye hazırlanan çalışma ortamı`,
  };
}

const profiles: Profile[] = [
  {
    slug: "cizgi-roman",
    label: "Çizgi Roman",
    title: "Çizgi Roman Nasıl Yazılır?",
    description: "Fikirden panel senaryosuna, sayfa ritminden balon yerleşimine ve görsel anlatı revizyonuna kadar adım adım çizgi roman eğitimi.",
    summary: "Hikâyeyi yalnız cümlelerle değil panel seçimi, kadraj, geçiş, boşluk ve sayfa çevrimiyle anlat; metin ile çizimin aynı işi iki kez yapmasına izin verme.",
    projectName: "Gece Hattı 12",
    orientation: "Çizgi roman, resimli bir metin değil; anlamın panel panel zamanlandığı ardışık görsel anlatıdır. Yazar yalnız ne olduğunu değil, okurun neyi hangi sırayla göreceğini, hangi anda duracağını ve sayfa çevrilince hangi bilginin açılacağını da tasarlar.",
    ideaItems: [
      { title: "Görsel çatışma", text: "Tek görüntüde anlaşılabilen ama sonucu belirsiz bir durum seç: boş otobüste tek yolcu, açık bırakılmış kasa, yarım kalmış duvar resmi gibi." },
      { title: "Dönüşen nesne", text: "Aynı nesnenin bölümler boyunca başka anlam kazanabileceği bir motif kur." },
      { title: "Mekân motoru", text: "Karakterin eylemini ve kadraj seçeneklerini sürekli değiştiren bir mekân seç." },
      { title: "Sessiz an", text: "Diyalogsuz anlatılabilecek bir karar anını hikâyenin çekirdeği yap." },
    ],
    ideaFlow: "‘Gece çalışan bir otobüs şoförü’ yalnız konudur. ‘Son seferde her durakta yıllar önce kaybolmuş bir yolcunun eşyasını bulan şoför, hattın aslında kapatılmış bir güzergâha döndüğünü fark eder’ ise panel üretir. Fikri yazarken her önemli bilgi için ‘bunu çizimde nasıl gösterebilirim?’ sorusunu da cevapla.",
    contrastItems: [
      { title: "Çizgi roman ≠ resimli hikâye", text: "Görseller metni süslemez; olayın, zamanın ve bakış açısının taşıyıcısıdır." },
      { title: "Çizgi roman ≠ storyboard", text: "Storyboard çekim planlar; çizgi romanın paneli yayımlanan nihai anlatı birimidir." },
      { title: "Çizgi roman ≠ grafik roman", text: "Çizgi roman bölüm/seri mantığında çalışabilir; grafik roman çoğunlukla tek kitaplık daha uzun ve kapalı bir bütünlük ister." },
    ],
    routeItems: [
      { title: "1 · Logline", text: "Kahraman, amaç, engel ve görsel ayırt ediciyi tek cümlede kur." },
      { title: "2 · Görsel vaat", text: "Bu hikâyenin neden çizgi roman olması gerektiğini üç sahne örneğiyle kanıtla." },
      { title: "3 · Beat listesi", text: "Hikâyeyi karar ve sonuç üreten anlatı vuruşlarına böl." },
      { title: "4 · Sayfa planı", text: "Beatleri sayfalara dağıt; sayfa çevrimlerini sürpriz ve gerilim için kullan." },
      { title: "5 · Panel senaryosu", text: "Her panelde görünen eylemi, gerekli metni ve bakış odağını yaz." },
      { title: "6 · Balon turu", text: "Konuşma sırasını, balon yoğunluğunu ve okuma yönünü kontrol et." },
      { title: "7 · Thumbnail", text: "Çizimden önce küçük sayfa eskizleriyle ritmi test et." },
      { title: "8 · Görsel revizyon", text: "Açıklanan bilgiyi görüntüye taşı, gereksiz panel ve metni ayıkla." },
    ],
    structureItems: [
      { title: "Açılış sayfası", text: "Dünya, karakter ve ton için güçlü bir görsel giriş yap." },
      { title: "Sayfa içi ritim", text: "Panel boyutlarını önem ve süre hissine göre değiştir." },
      { title: "Gutter", text: "Paneller arasındaki boşlukta okurun tamamlayacağı eylemi bilinçli seç." },
      { title: "Sayfa çevrimi", text: "Yeni bilgi veya görüntüyü sağ sayfa/sonraki sayfa açılışına taşıyarak etki yarat." },
      { title: "Sekans kapanışı", text: "Her bölüm bir görsel karar, soru veya sonuçla ileri itsin." },
    ],
    anatomy: "- **Panel:** Tek bir anlatı seçimi.\n- **Kadraj:** Okurun neye ne kadar yakın olduğunu belirler.\n- **Gutter:** İki panel arasında zihinde tamamlanan zaman/eylem.\n- **Balon:** Metnin mekânsal ve ritmik bir parçası.\n- **Caption:** Görselin yapamadığı işi yapmalı.\n- **Sayfa:** Tek tek panellerden daha büyük kompozisyon birimi.\n- **Sayfa çevrimi:** Bilgiyi saklama ve açma aracı.\n- **Motif:** Görsel hafıza kurar.",
    practiceItems: [
      { title: "Beat dosyası", text: "Her anlatı vuruşunun önce/sonra durumunu yaz." },
      { title: "Thumbnail defteri", text: "Sayfaları küçük ölçekte hızlıca dene; ayrıntıya erken girme." },
      { title: "Balon bütçesi", text: "Panel başına metin yoğunluğunu takip et." },
      { title: "Görsel motif listesi", text: "Tekrarlanan nesne, açı ve mekânları not et." },
    ],
    workspaceItems: [
      { title: "Sayfa numarası", text: "Senaryo, thumbnail ve revizyon notunu aynı sayfa numarasıyla eşleştir." },
      { title: "Panel kodu", text: "P01, P02 gibi sabit kodlarla geri bildirimde karışıklığı önle." },
      { title: "Metin / görsel sütunu", text: "Ne çizilecek ve ne yazılacak bilgisini ayrı tut." },
      { title: "Revizyon turu", text: "Önce yapı, sonra görsel okunurluk, sonra diyalog ve son olarak dil düzeltmesi yap." },
    ],
    craft: "Çizgi romanın temel zanaatı seçimdir: hangi anı panel yapacağın, hangi anı gutter'a bırakacağın, neyi yakın plana alacağın ve neyi hiç yazmayacağın. Aynı bilgi hem çizimde hem balonda varsa çoğu zaman biri gereksizdir. Okurun gözünün sayfada nereden nereye gideceğini de cümle sırası kadar bilinçli tasarla.",
    extraSections: [
      { id: "panel-gecisleri", type: "cards", heading: "Panel geçişlerini bilinçli seç", items: [
        { title: "An → an", text: "Hareketi yavaşlatır; küçük jest ve gerilim için kullan." },
        { title: "Eylem → eylem", text: "Aynı öznenin hareketini ilerletir; aksiyon okunurluğu sağlar." },
        { title: "Özne → özne", text: "Aynı sahnede bakış ve odak değiştirir." },
        { title: "Sahne → sahne", text: "Zaman veya mekân sıçramasını net işaretlerle kur." },
      ]},
      { id: "sayfa-cevirme", type: "steps", heading: "Sayfa çevrimini dramatik araç olarak kullan", items: [
        { title: "Kur", text: "Soruyu veya eksik bilgiyi sayfanın sonuna yaklaştır." },
        { title: "Sakla", text: "Sürprizi aynı sayfada erken gösterme." },
        { title: "Aç", text: "Yeni sayfada mümkünse güçlü tek görüntü veya net eylemle karşılık ver." },
      ]},
      { id: "balon-mimarisi", type: "cards", heading: "Balon yerleşimi de senaryonun parçasıdır", items: [
        { title: "Okuma sırası", text: "Balonların doğal okuma yönünü bozmadığından emin ol." },
        { title: "Yüz kapatma", text: "Balon için çizimin önemli yüz ve eylem alanlarını tüketme." },
        { title: "Metin hacmi", text: "Paneli paragraf kutusuna çevirecek yoğunluğu böl veya yeniden yaz." },
      ]},
      { id: "sessiz-sekans", type: "steps", heading: "En az bir sahneyi metinsiz çöz", items: [
        { title: "Amaç", text: "Karakter ne yapmak istiyor?" },
        { title: "Engel", text: "Görüntüde ne değişiyor?" },
        { title: "Sonuç", text: "Okur son panelde neyi yalnız görerek anlıyor?" },
      ]},
      { id: "cizer-isbirligi", type: "cards", heading: "Yazar–çizer işbirliğinde alan bırak", items: [
        { title: "Niyeti yaz", text: "Gerekli dramatik bilgiyi belirt ama çizimi mikro yönetme." },
        { title: "Referans ayır", text: "Zorunlu tarihsel/teknik referansı ilham görselinden ayır." },
        { title: "Revizyon dili", text: "‘Daha güzel olsun’ yerine okunurluk, vurgu ve anlatı işlevi üzerinden geri bildirim ver." },
      ]},
      { id: "erisilebilirlik", type: "cards", heading: "Görsel okunurluğu ve erişilebilirliği düşün", items: [
        { title: "Tipografi", text: "Küçük ekranda ve baskıda okunabilecek punto ve kontrast hedefle." },
        { title: "Renk bağımlılığı", text: "Kritik bilgiyi yalnız renk farkına bağlama." },
        { title: "Alt metin planı", text: "Dijital yayında görsel içeriğin erişilebilir betimini ayrıca düşün." },
      ]},
    ],
    draftItems: [
      { title: "Önce kaba sayfa", text: "Mükemmel çizim beklemeden bütün bölümün thumbnail'ını tamamla." },
      { title: "Tek panel tek iş", text: "Panel aynı anda beş bilgi taşımaya çalışıyorsa böl veya sadeleştir." },
      { title: "Diyaloğu geç yaz", text: "Önce görsel akışın çalışıp çalışmadığını gör, sonra metni yerleştir." },
      { title: "Sayfa sonunu işaretle", text: "Her sayfanın son panelinin bir sonraki sayfaya geçiş işlevini kontrol et." },
    ],
    revisionItems: [
      { title: "Sessiz okuma", text: "Balonları kapatınca temel eylem hâlâ anlaşılabiliyor mu?" },
      { title: "Göz rotası", text: "Okur panel ve balonları doğru sırada takip ediyor mu?" },
      { title: "Tekrar testi", text: "Metin çizimin zaten gösterdiğini yeniden mi söylüyor?" },
      { title: "Ritim testi", text: "Yoğun ve sakin sayfalar arasında amaçlı değişim var mı?" },
    ],
    projectBody: "**Kahraman:** İstanbul'da gece hattında çalışan şoför Cem.\n\n**Görsel motor:** Her durakta başka bir unutulmuş eşya.\n\n**Ana motif:** Otobüs içindeki kırmızı DUR düğmesi.\n\n**Sayfa çevrimi:** 8. sayfanın sonunda boş koltukta eski bir bilet görünür; 9. sayfa tam sayfa panelde otobüsün yıllar önce kapatılmış 12 numaralı hatta girdiğini açar.\n\n**Sessiz sekans:** Cem aynadan yolcuların birer birer kaybolduğunu fark eder; dört panel boyunca metin yoktur.",
    sampleHeading: "Örnek panel senaryosu: görüntü ile metni bölüştür",
    sampleBody: "PANEL 1 — Yakın plan: Cem'in eli DUR düğmesine gider ama basmaz. Arka planda aynada yalnız bir çocuk koltuğu görünür.\nPANEL 2 — Aynadan geniş açı: Az önce dolu olan otobüs boştur. Metin yok.\nPANEL 3 — Gösterge panelindeki dijital saat 00:12'yi gösterir. Caption: ‘Bu hattın son seferi on iki yıl önceydi.’",
    finalItems: [
      { title: "Thumbnail kontrolü", text: "Sayfa ritmi küçük ölçekte okunuyor mu?" },
      { title: "Balon kontrolü", text: "Okuma sırası ve metin hacmi temiz mi?" },
      { title: "Panel sürekliliği", text: "Mekân, yön ve karakter konumu takip edilebiliyor mu?" },
      { title: "Dosya teslimi", text: "Sayfa/panel numarası, metin sürümü ve referanslar eşleşiyor mu?" },
    ],
    outputItems: [
      { title: "1 logline", text: "Görsel çatışmayı tek cümlede yaz." },
      { title: "4 sayfalık beat", text: "Dört sayfalık mini sekansın dramatik vuruşlarını çıkar." },
      { title: "4 thumbnail", text: "Sayfa düzenini küçük eskizlerle test et." },
      { title: "1 tam panel senaryosu", text: "Görsel, metin ve geçiş kararlarıyla bir sayfayı tamamla." },
    ],
    masters: [
      { title: "Will Eisner", text: "Ardışık sanat, sayfa kompozisyonu ve görsel oyunculuk yaklaşımını incele." },
      { title: "Scott McCloud", text: "Panel geçişi, closure ve çizgi roman zamanını kuramsal olarak çözümle." },
      { title: "Alan Moore", text: "Senaryo ayrıntısı, ritim ve görsel motif kullanımını karşılaştırmalı oku." },
    ],
    faq: [
      { question: "Çizim yapamıyorsam çizgi roman yazabilir miyim?", answer: "Evet. Thumbnail için çöp adam düzeyi yeterli olabilir; amaç kompozisyon ve ritmi görmek. Çizerle çalışacaksan senaryo okunabilir ve işlev odaklı olmalı." },
      { question: "Panel sayısı için sabit kural var mı?", answer: "Hayır. Okunurluk, sayfa ölçüsü, tür ve ritim belirler. Sabit sayı yerine sahnenin ihtiyacını test et." },
    ],
  },
  {
    slug: "grafik-roman",
    label: "Grafik Roman",
    title: "Grafik Roman Nasıl Yazılır?",
    description: "Tek kitaplık uzun görsel anlatıyı tema, bölüm mimarisi, görsel motif, sayfa ritmi ve kapsamlı revizyonla kurmaya yönelik adım adım eğitim.",
    summary: "Uzun soluklu hikâyeyi yalnız bölüm bölüm değil, tek kitaplık duygusal ve görsel bütünlük olarak tasarla; tema, motif ve karakter dönüşümünü sayfa mimarisiyle birlikte yönet.",
    projectName: "Kayıp Katlar Atlası",
    orientation: "Grafik roman, uzun olduğu için değil, kitap ölçeğinde bütünsel bir görsel anlatı kurduğu için ayrı düşünülmelidir. Karakter yayı, tema, bölüm ritmi, tekrar eden görsel motifler ve kitabın fiziksel/dijital okuma deneyimi birlikte planlanır.",
    ideaItems: [
      { title: "Uzun dönüşüm", text: "Tek sahnede çözülemeyecek, zaman içinde değişecek bir karakter sorusu seç." },
      { title: "Mekân hafızası", text: "Katmanlı tarih veya aile geçmişi taşıyan bir mekânı anlatı motoru yap." },
      { title: "İki zaman", text: "Geçmiş ve bugünü görsel motiflerle birbirine bağlayabilecek bir yapı düşün." },
      { title: "Tema gerilimi", text: "Tek cevaplı mesaj değil, kitap boyunca farklı seçimlerle sınanacak bir soru kur." },
    ],
    ideaFlow: "‘Eski apartmanını araştıran mimar’ fikrini ‘Yıkım kararı verilen çocukluk apartmanının kat planlarını çizerken, her katta ailesinin farklı bir geçmiş anlatısıyla karşılaşan mimar’ biçimine dönüştür. Uzun formda her bölüm aynı ana soruya başka bir katman eklemeli.",
    contrastItems: [
      { title: "Grafik roman ≠ uzun çizgi roman sayısı", text: "Tek kitaplık mimari, karakter ve tema bütünlüğü ister." },
      { title: "Grafik roman ≠ resimli roman", text: "Görsel yalnız aralıklı illüstrasyon değil; anlatının sürekli dilidir." },
      { title: "Grafik roman ≠ sinema senaryosu", text: "Okur zamanlamayı sayfa üzerinde kendi yönetir; sayfa kompozisyonu anlatının nihai biçimidir." },
    ],
    routeItems: [
      { title: "1 · Tema sorusu", text: "Kitabın farklı cevaplarla sınayacağı ana gerilimi yaz." },
      { title: "2 · Karakter yayı", text: "Başlangıç inancı, kırılma noktaları ve final seçimini belirle." },
      { title: "3 · Bölüm mimarisi", text: "Her bölümün yeni bilgi ve duygusal işlevini yaz." },
      { title: "4 · Motif sistemi", text: "Görsel tekrarların ne zaman ve nasıl anlam değiştireceğini planla." },
      { title: "5 · Sayfa bütçesi", text: "Bölüm uzunluklarını dramatik ağırlığa göre yaklaşık dağıt." },
      { title: "6 · Thumbnail draft", text: "Kitabı kaba sayfa akışıyla baştan sona gör." },
      { title: "7 · Metin turu", text: "Diyalog, caption ve sessiz sekans dengesini kur." },
      { title: "8 · Bütün kitap revizyonu", text: "Bölümleri tek tek değil tema, ritim ve motif sürekliliğiyle yeniden oku." },
    ],
    structureItems: [
      { title: "Açılış vaadi", text: "Kitabın görsel tonu ve ana sorusunu erken hissettir." },
      { title: "Bölüm dönüşleri", text: "Her bölüm karakterin bilgi veya değer sistemini değiştirsin." },
      { title: "Orta nokta", text: "Okurun kitabı başka türlü okumasına yol açacak büyük yeniden çerçeveleme kur." },
      { title: "Motif dönüşümü", text: "Başta sıradan görünen görsel unsur sona doğru yeni anlam kazansın." },
      { title: "Final yankısı", text: "Açılıştaki görüntü veya soruya dönüşerek değişimi görsel olarak göster." },
    ],
    anatomy: "- **Kitap ölçeği:** Bölümlerin tek bütüne hizmet etmesi.\n- **Karakter yayı:** Uzun süreli değişim.\n- **Tema:** Tek cümlelik ders değil, tekrar tekrar sınanan soru.\n- **Motif:** Görsel anlamın kitap boyunca evrilmesi.\n- **Bölüm:** Kendi mini yayı olan ama bütünü ilerleten birim.\n- **Sayfa ritmi:** Yoğunluk, sessizlik ve çevrim temposu.\n- **Paratekst:** Kapak, bölüm açılışı, harita veya ek materyalin anlatıya katkısı.",
    practiceItems: [
      { title: "Bölüm kartları", text: "Her bölümün soru, dönüş ve final durumunu tek kartta tut." },
      { title: "Motif izleme tablosu", text: "Görsel motifin ilk, orta ve son kullanımını işaretle." },
      { title: "Karakter zaman çizgisi", text: "Dış olay ile iç değişimi yan yana izle." },
      { title: "Sayfa bütçesi", text: "Kitabın toplam hacmini bölüm ve sekanslara dağıt." },
    ],
    workspaceItems: [
      { title: "Bölüm klasörü", text: "Her bölümde beat, thumbnail, metin ve referansı aynı isimle sakla." },
      { title: "Master outline", text: "Kitabın tüm bölümlerini tek bakışta görebileceğin ana harita tut." },
      { title: "Motif katmanı", text: "Yalnız olay değil görsel tekrarların gelişimini ayrıca takip et." },
      { title: "Sürüm arşivi", text: "Büyük yapı revizyonlarını ayrı sürümlerde sakla." },
    ],
    craft: "Grafik romanda uzunluk, tekrar ve gevşeklik riski yaratır. Her bölümün yalnız ‘güzel sahneler’ toplamı değil, ana karakter ve tema üzerinde geri dönüşsüz bir etkisi olmalı. Görsel motifler dekor olmamalı; tekrarlandıkça bağlam değiştirip okurun hafızasını çalıştırmalı.",
    extraSections: [
      { id: "kitap-mimarisi", type: "steps", heading: "Tek kitabın mimarisini üç ölçekte kur", items: [
        { title: "Kitap", text: "Ana soru ve dönüşüm yayı." },
        { title: "Bölüm", text: "Kendi alt sorusu ve dramatik sonucu." },
        { title: "Sayfa", text: "Yerel ritim, vurgu ve çevrim etkisi." },
      ]},
      { id: "motif-sistemi", type: "cards", heading: "Görsel motifleri anlam taşıyan sisteme dönüştür", items: [
        { title: "İlk anlam", text: "Motif ilk göründüğünde neyi temsil ediyor?" },
        { title: "Bozulma", text: "Hangi olay motifin anlamını değiştiriyor?" },
        { title: "Final yankısı", text: "Son kullanım başlangıçla nasıl konuşuyor?" },
      ]},
      { id: "zaman-atlamasi", type: "cards", heading: "Uzun zaman atlamalarını görsel olarak ayır", items: [
        { title: "Mekân", text: "Aynı mekânın değişimi zaman bilgisini taşıyabilir." },
        { title: "Nesne", text: "Tekrarlanan nesnenin eskimesi veya el değiştirmesi süreyi gösterir." },
        { title: "Sayfa dili", text: "Farklı dönemlerde ritim veya çerçeve dilini kontrollü biçimde değiştirebilirsin." },
      ]},
      { id: "uzun-form-revizyon", type: "steps", heading: "Revizyonu sayfadan kitaba doğru büyüt", items: [
        { title: "Makro", text: "Bölüm sırası ve karakter yayı." },
        { title: "Mezo", text: "Sekans ritmi ve motif devamlılığı." },
        { title: "Mikro", text: "Panel, balon, kelime ve görsel ayrıntı." },
      ]},
      { id: "fiziksel-kitap", type: "cards", heading: "Kitabın fiziksel formunu anlatının parçası say", items: [
        { title: "Çift sayfa", text: "Karşılıklı sayfaların birlikte nasıl göründüğünü planla." },
        { title: "Bölüm açılışı", text: "Yeni bölümün ritmini ve tonunu fiziksel geçişle kur." },
        { title: "Baskı sınırı", text: "Kenar payı, taşma ve küçük yazı risklerini erken düşün." },
      ]},
      { id: "kaynak-ve-temsil", type: "cards", heading: "Gerçek tarih ve kimlik kullanıyorsan araştırma katmanı kur", items: [
        { title: "Kaynak", text: "Dönem, mekân ve kültürel ayrıntıyı güvenilir kaynaklarla doğrula." },
        { title: "Temsil", text: "Kimliği tek görsel stereotipe indirgeme." },
        { title: "Not", text: "Kurgu ile tarihsel/otobiyografik gerçeğin sınırını gerektiğinde açıkla." },
      ]},
      { id: "pitch-paketi", type: "cards", heading: "Uzun proje için okunabilir bir pitch paketi hazırla", items: [
        { title: "Logline + kısa özet", text: "Kitabın motorunu ve final yönünü anlaşılır biçimde anlat." },
        { title: "8–12 örnek sayfa", text: "Ton, karakter ve sayfa ritmini gösterecek bir sekans seç." },
        { title: "Bölüm haritası", text: "Projenin yalnız fikir değil tamamlanabilir yapı olduğunu göster." },
      ]},
    ],
    draftItems: [
      { title: "Bütün kitabı kaba kur", text: "İlk bölümde mükemmellik aramadan tüm bölüm haritasını tamamla." },
      { title: "Boşluk bırak", text: "Her önemli duyguyu caption ile açıklama; sessiz sayfalara yer ver." },
      { title: "Motifleri işaretle", text: "İlk taslakta motifin geçtiği yerleri görünür et." },
      { title: "Bölüm sonunu test et", text: "Her bölüm bir sonraki bölümü gerçekten gerekli kılıyor mu?" },
    ],
    revisionItems: [
      { title: "Karakter yayı", text: "Değişim sahnelerle kazanılıyor mu, yoksa finalde ilan mı ediliyor?" },
      { title: "Bölüm işlevi", text: "Bir bölüm çıkarıldığında ne kayboluyor?" },
      { title: "Motif devamlılığı", text: "Tekrarların aralığı ve anlam değişimi çalışıyor mu?" },
      { title: "Hacim", text: "Sayfa sayısı dramatik ihtiyaca mı, alışkanlığa mı dayanıyor?" },
    ],
    projectBody: "**Kahraman:** Restorasyon mimarı Defne.\n\n**Mekân:** Yıkım kararı verilen yedi katlı aile apartmanı.\n\n**Bölüm sistemi:** Her kat bir aile anlatısını açar; plan çizimleri ile anılar çelişir.\n\n**Görsel motif:** Kat planındaki silinmiş odalar.\n\n**Orta nokta:** Defne, çocukluk odasının resmi planda hiç görünmediğini fark eder.\n\n**Final:** Apartman yıkılırken Defne boş arsaya aynı planı değil, ailede konuşulmayan ilişkilerin yeni bir atlasını çizer.",
    sampleHeading: "Örnek bölüm açılışı: mekânı hafıza olarak kullan",
    sampleBody: "Tam sayfa: Apartmanın kesiti. Yedi katın her biri görünür. Sadece üçüncü katta bir oda simsiyah. Sonraki sayfada Defne eski planı masaya açar; planda aynı noktada duvar yoktur. Caption: ‘Bazı odalar yıkılmadan önce silinir.’",
    finalItems: [
      { title: "Bütün kitap okuması", text: "Bölümleri aralıksız okuyarak tempo kırıklarını işaretle." },
      { title: "Motif listesi", text: "Her motifin anlam değişimini son kez doğrula." },
      { title: "Sayfa bütçesi", text: "Gereksiz uzayan ve sıkışan sekansları dengele." },
      { title: "Pitch dosyası", text: "Özet, örnek sayfa ve proje durumunu tutarlı hale getir." },
    ],
    outputItems: [
      { title: "1 tema sorusu", text: "Kitabın tartışacağı ana gerilimi yaz." },
      { title: "1 bölüm haritası", text: "En az 6 bölümün dönüş noktasını çıkar." },
      { title: "1 motif çizelgesi", text: "Görsel motifin anlam dönüşümünü planla." },
      { title: "4 örnek sayfa", text: "Bir mini sekansı thumbnail ve metinle tamamla." },
    ],
    masters: [
      { title: "Art Spiegelman", text: "Otobiyografi, tarih ve görsel metaforun uzun formda nasıl birleştiğini incele." },
      { title: "Marjane Satrapi", text: "Sade görsel dil ile tarih, kimlik ve kişisel deneyim arasındaki dengeyi incele." },
      { title: "Alison Bechdel", text: "Belge, hafıza, mekân ve anlatıcı güvenilirliğini sayfa mimarisiyle birlikte çözümle." },
    ],
    faq: [
      { question: "Grafik roman mutlaka tek cilt mi olmalı?", answer: "Hayır; ancak eğitimde önce tek kitaplık bütünlük kurmayı öğrenmek, uzun seriye geçerken yapı kontrolünü kolaylaştırır." },
      { question: "Kaç sayfa olmalı?", answer: "Sabit sayı yok. Hikâyenin, yayın formatının ve üretim kapasitesinin birlikte belirlediği gerçekçi bir sayfa bütçesi gerekir." },
    ],
  },
  {
    slug: "manga",
    label: "Manga",
    title: "Manga Nasıl Yazılır?",
    description: "Manga anlatısını okuma yönü, sayfa ritmi, karakter ifadesi, sessiz beat, bölüm kancası ve seri motoruyla kurmaya yönelik adım adım eğitim.",
    summary: "Manga estetik bir filtre değildir; okuma yönü, tempo, panel ekonomisi, karakter ifadesi ve bölüm ritmiyle çalışan özgül bir görsel anlatı geleneğidir.",
    projectName: "Kuzey İstasyonu Kulübü",
    orientation: "Manga yazmak yalnız Japon görsel üslubunu taklit etmek değildir. Sağdan sola okuma düzeni, panel ritmi, duygusal beatler, sessiz anlar, bölüm sonu kancaları ve hedef okur bağlamı birlikte düşünülmelidir. Kültürel kodları dekor gibi ödünç almak yerine işlevini araştır.",
    ideaItems: [
      { title: "Karakter sözü", text: "Okurun tekrar dönmek isteyeceği karakter ilişkisini merkez al." },
      { title: "Seri motoru", text: "Her bölüm yeni durum üretecek tekrar edilebilir mekanizma kur." },
      { title: "Duygusal kontrast", text: "Yoğun aksiyon ile küçük gündelik anları yan yana taşıyabilecek fikir seç." },
      { title: "Görsel imza", text: "Hikâyeyi tanınır kılan mekân, nesne veya hareket motifi belirle." },
    ],
    ideaFlow: "‘Okulda tren kulübü kuran gençler’ fikrini ‘Kapanmak üzere olan kırsal hattın son istasyonlarını belgelemek için kulüp kuran beş öğrenci, her bölümde başka bir istasyona giderken kendi gelecek kararlarıyla yüzleşir’ biçimine getir. Böylece bölüm motoru, karakter ilişkisi ve görsel rota birlikte doğar.",
    contrastItems: [
      { title: "Manga ≠ çizim stili", text: "Büyük göz veya hız çizgisi manga yapmaz; anlatı ritmi ve yayın geleneği daha belirleyicidir." },
      { title: "Manga ≠ webtoon", text: "Sayfa ve çift sayfa kompozisyonu manga için temel olabilir; webtoon dikey kaydırmaya göre tasarlanır." },
      { title: "Manga ≠ kültürel kostüm", text: "Japon okul, yemek veya hitap unsurlarını bağlamını anlamadan dekor olarak kullanma." },
    ],
    routeItems: [
      { title: "1 · Hedef okur ve ton", text: "Yaş/ilgi bağlamını ve anlatının duygusal sertliğini belirle." },
      { title: "2 · Seri motoru", text: "Her bölümün yeni problem üreteceği mekanizmayı yaz." },
      { title: "3 · Karakter dinamiği", text: "İlişkilerin çatışma ve yakınlaşma ritmini planla." },
      { title: "4 · Bölüm beatleri", text: "Bölümü giriş, gelişme, duygusal dönüş ve kanca olarak kur." },
      { title: "5 · Sayfa ritmi", text: "Sessiz panel, yakın plan ve büyük panel oranını dramatik ihtiyaca göre dağıt." },
      { title: "6 · Sağdan sola akış", text: "Panel ve balon yerleşimini hedef yayın yönüne göre doğrula." },
      { title: "7 · Thumbnail", text: "Sayfaları küçük eskizlerle bütün bölüm halinde test et." },
      { title: "8 · Bölüm revizyonu", text: "Kanca kadar duygusal tamamlanmayı da kontrol et." },
    ],
    structureItems: [
      { title: "Giriş beat'i", text: "Bölümün duygusal veya pratik sorununu erken kur." },
      { title: "İlişki beat'i", text: "Karakterler arasındaki güç veya yakınlık değişsin." },
      { title: "Görsel yükselme", text: "Panel ölçeğini ve sessizliği önemli an için sakla." },
      { title: "Duygusal dönüş", text: "Karakter bölüm sonunda başlangıçtan farklı bir yerde olsun." },
      { title: "Kanca", text: "Bir sonraki bölümü zorunlu kılan yeni soru veya sonuç üret." },
    ],
    anatomy: "- **Okuma yönü:** Panel ve balon akışını belirler.\n- **Karakter ifadesi:** Mikro duygu değişimleri ritmin parçasıdır.\n- **Sessiz beat:** Metinsiz panel dizisi duygusal zaman yaratır.\n- **Büyük panel:** Yüksek vurgu için seyrek kullanılmalı.\n- **Bölüm kancası:** Devam dürtüsü üretir.\n- **Seri motoru:** Yeni bölüm üretme kapasitesi.\n- **Görsel kod:** Hız, arka plan, sembol ve efektlerin tutarlı dili.",
    practiceItems: [
      { title: "Karakter ilişki haritası", text: "Yakınlık, rekabet ve saklanan bilgiyi bölüm bölüm izle." },
      { title: "Bölüm kartı", text: "Sorun, duygusal dönüş ve kancayı tek kartta tut." },
      { title: "Sessiz beat listesi", text: "Metinsiz anlatılabilecek anları önceden işaretle." },
      { title: "Kültürel kaynak notu", text: "Kullandığın kurum, hitap, gündelik hayat ve tarih unsurlarının kaynağını tut." },
    ],
    workspaceItems: [
      { title: "Sağdan sola thumbnail", text: "Batı yönünde tasarlayıp sonradan aynalama yapma; akışı baştan doğru kur." },
      { title: "Karakter model sayfası", text: "Saç, kıyafet, boy ve ayırt edici ayrıntıları tutarlı izle." },
      { title: "Efekt sözlüğü", text: "Ses efektlerinin yazım ve anlam kullanımını proje içinde standartlaştır." },
      { title: "Bölüm sürümü", text: "Editoryal değişiklikleri bölüm bazında arşivle." },
    ],
    craft: "Manga ritmi, yalnız hız çizgileriyle kurulmaz. Bir bakış için iki panel ayırmak, mekânı sessizce göstermek veya büyük bir duygusal anı tek sayfaya bırakmak zaman algısını değiştirir. Türün kültürel ve yayın bağlamını araştır; yüzeysel görsel taklit yerine anlatı kararlarını öğren.",
    extraSections: [
      { id: "okuma-yonu", type: "steps", heading: "Sağdan sola okuma düzenini baştan tasarla", items: [
        { title: "Panel akışı", text: "Gözün sağ üstten sola ve aşağıya doğal ilerlemesini test et." },
        { title: "Balon sırası", text: "Diyalog sırasını çizim kompozisyonuyla birlikte kur." },
        { title: "Eylem yönü", text: "Hareket vektörlerinin okuma akışına karşı yanlış baskı yaratmadığını kontrol et." },
      ]},
      { id: "ma", type: "cards", heading: "Boşluk ve sessizlikle zaman yarat", items: [
        { title: "Mekân nefesi", text: "Karakter konuşmadığında çevreyi gösteren panel kullan." },
        { title: "Bakış", text: "Cevaptan önce yüz veya el gibi mikro ayrıntıya zaman ayır." },
        { title: "Kesinti", text: "Önemli bilgiden sonra hemen açıklama yapmak yerine sessizlik bırak." },
      ]},
      { id: "seri-motoru", type: "cards", heading: "Seri motorunu tükenmeye karşı test et", items: [
        { title: "10 bölüm testi", text: "Aynı mekanizma on farklı bölüm üretebiliyor mu?" },
        { title: "Karakter büyümesi", text: "Motor yalnız olay değil ilişki ve karakter gelişimi de üretiyor mu?" },
        { title: "Son hedef", text: "Seri açık uçlu olsa bile ilerlediği daha büyük yön belli mi?" },
      ]},
      { id: "hedef-okur", type: "cards", heading: "Demografik etiketi reçete gibi kullanma", items: [
        { title: "Okur ihtiyacı", text: "Ton, tema ve karmaşıklığı hedef okurun deneyimine göre düşün." },
        { title: "Tür karışımı", text: "Aksiyon, romantizm veya spor gibi türleri tek kalıba sıkıştırma." },
        { title: "Yaş uygunluğu", text: "Şiddet, cinsellik ve psikolojik yoğunluğu bilinçli derecelendir." },
      ]},
      { id: "kultur-arastirmasi", type: "cards", heading: "Kültürel unsuru araştır, egzotik dekor yapma", items: [
        { title: "Kurumlar", text: "Okul, iş, aile ve hitap biçimlerinin bağlamını doğrula." },
        { title: "Gündelik hayat", text: "Yemek, ulaşım ve mekân ayrıntısını kaynaklı kullan." },
        { title: "Alternatif dünya", text: "Japonya'da geçmeyen manga da mümkündür; biçimi coğrafyayla eşitleme." },
      ]},
      { id: "ses-efektleri", type: "cards", heading: "Ses efektini çizimin parçası olarak düşün", items: [
        { title: "İşlev", text: "Efekt yalnız ses değil tempo ve ağırlık hissi de verir." },
        { title: "Yerleşim", text: "Efekt harfleri önemli görsel bilgiyi kapatmamalı." },
        { title: "Çeviri", text: "Başka dilde yayımlanacaksa efektin çevrilebilirliğini ve görsele gömülme düzeyini planla." },
      ]},
      { id: "bolum-kancasi", type: "steps", heading: "Kancayı ucuz sürprize çevirmeden kur", items: [
        { title: "Tamamla", text: "Bölümün ana duygusal sorusuna bir karşılık ver." },
        { title: "Değiştir", text: "Yeni bilgi önceki durumu başka anlamda göstersin." },
        { title: "Aç", text: "Bir sonraki bölüm için gerçek sonuç doğuran yeni soru bırak." },
      ]},
    ],
    draftItems: [
      { title: "Bölümü kaba bitir", text: "İlk sayfaları cilalamadan tüm bölüm thumbnail'ını tamamla." },
      { title: "Sessizliği koru", text: "Duygusal anları otomatik olarak iç monologla doldurma." },
      { title: "Büyük paneli kazan", text: "Her sayfada büyük panel kullanma; vurgu noktasına sakla." },
      { title: "Kancayı zorlamama", text: "Son paneli yalnız şok için değil sonuç için kur." },
    ],
    revisionItems: [
      { title: "Akış testi", text: "Sağdan sola panel ve balon sırası takılmadan okunuyor mu?" },
      { title: "Duygu testi", text: "Karakter değişimi yüz ve eylemle okunuyor mu?" },
      { title: "Kültür testi", text: "Araştırılmamış klişe veya yanlış bağlam var mı?" },
      { title: "Bölüm motoru", text: "Final sonraki bölümü organik biçimde üretiyor mu?" },
    ],
    projectBody: "**Ekip:** Kapanmak üzere olan demiryolu hattını belgeleyen beş lise öğrencisi.\n\n**Seri motoru:** Her bölüm başka bir istasyon ve o istasyona bağlı insan hikâyesi.\n\n**Ana karakter:** Üniversiteye büyük şehre gitmek isteyen Aoi; hattın kapanmasını kaçış fırsatı görüyor.\n\n**Görsel motif:** İstasyon damgaları.\n\n**Bölüm kancası:** Dördüncü istasyonda kulüp defterinde Aoi'nin annesine ait eski bir damga bulunur.",
    sampleHeading: "Örnek sessiz beat: bakışla bilgi aç",
    sampleBody: "Sağ sayfa üst panel: Aoi eski damgayı avucunda çevirir. Metin yok. Alt küçük panel: annesinin evde kullandığı anahtarlığın aynı sembolü. Sol sayfa büyük panel: boş peronda annesi gençken çekilmiş bir fotoğraf. Balon yok; yalnız rüzgâr efekti.",
    finalItems: [
      { title: "Okuma yönü", text: "Tüm panel/balon akışını gerçek yayın yönünde kontrol et." },
      { title: "Bölüm ritmi", text: "Aksiyon, konuşma ve sessizlik oranı amaçlı mı?" },
      { title: "Karakter tutarlılığı", text: "İfade, model ve ilişki değişimleri takip ediliyor mu?" },
      { title: "Kültürel doğrulama", text: "Kullanılan gerçek unsurlar tekrar kontrol edildi mi?" },
    ],
    outputItems: [
      { title: "1 seri motoru", text: "En az 10 bölüm üretebilecek mekanizmayı yaz." },
      { title: "1 karakter ilişki haritası", text: "Ana ilişkilerin gerilim ve değişim yönünü çıkar." },
      { title: "1 bölüm beat'i", text: "Girişten kancaya tam bölüm akışını kur." },
      { title: "4 manga sayfası", text: "Sağdan sola thumbnail ve metinle mini sekans tamamla." },
    ],
    masters: [
      { title: "Naoki Urasawa", text: "Gerilim, bölüm kancası ve çok karakterli bilgi yönetimini incele." },
      { title: "Hiromu Arakawa", text: "Uzun seri motoru, karakter dengesi ve dramatik/komik ritim geçişlerini incele." },
      { title: "Jiro Taniguchi", text: "Sessizlik, gündelik hareket ve mekânın zaman duygusunu nasıl kurduğunu incele." },
    ],
    faq: [
      { question: "Manga Japonya'da mı geçmek zorunda?", answer: "Hayır. Manga bir yayın ve görsel anlatı geleneğidir; hikâye dünyanın herhangi bir yerinde geçebilir." },
      { question: "Sağdan sola çizmek şart mı?", answer: "Hedeflediğin yayın formatına bağlıdır. Ancak sağdan sola tasarlayacaksan bunu sonradan aynalamak yerine baştan kompozisyona dahil et." },
    ],
  },
  {
    slug: "webtoon",
    label: "Webtoon",
    title: "Webtoon Nasıl Yazılır?",
    description: "Dikey kaydırma ritmi, mobil kadraj, bölüm kancası, seri üretim ve erişilebilir yayın düzeniyle adım adım webtoon yazarlığı eğitimi.",
    summary: "Sayfayı değil ekran akışını tasarla; boşluğu zaman, kaydırmayı gerilim, mobil kadrajı vurgu ve bölüm sonunu sürdürülebilir seri motoru olarak kullan.",
    projectName: "Kat 0",
    orientation: "Webtoon, basılı çizgi romanı uzun şeride dizmek değildir. Okurun tek ekranda gördüğü bilgi, paneller arasındaki dikey boşluk, kaydırma hızı ve bölüm sonu kancası anlatının temel parçalarıdır. Üretim temposu da biçim kadar önemlidir.",
    ideaItems: [
      { title: "Kaydırma sürprizi", text: "Bilginin ekran dışında saklanmasının dramatik işlev taşıdığı fikir seç." },
      { title: "Dikey mekân", text: "Asansör, kule, kuyu veya katmanlı şehir gibi dikey hareketi anlatıya bağla." },
      { title: "Bölüm motoru", text: "Kısa düzenli bölümlerde yeni soru üretebilecek yapı kur." },
      { title: "Mobil yakınlık", text: "Yüz, mesaj, el veya küçük nesnenin telefonda güçlü okunacağı anlar düşün." },
    ],
    ideaFlow: "‘Gizemli bir apartmanda yaşayan kurye’ fikrini ‘Teslimat uygulamasında görünmeyen Kat 0 siparişlerini almaya başlayan kurye, her bölümde başka bir dairenin kayıp kaydını açar’ biçimine getir. Dikey mekân, episodik motor ve kaydırma sürprizi aynı çekirdekte buluşsun.",
    contrastItems: [
      { title: "Webtoon ≠ uzun çizgi roman görseli", text: "Dikey ritim için panel aralığı ve ekran görünümü baştan tasarlanır." },
      { title: "Webtoon ≠ manga", text: "Sayfa/çift sayfa yerine sürekli kaydırma ve mobil ekran temel kompozisyon alanıdır." },
      { title: "Webtoon ≠ sosyal medya postu", text: "Bölüm ve seri ölçeğinde karakter ve dramatik devamlılık gerekir." },
    ],
    routeItems: [
      { title: "1 · Seri motoru", text: "Düzenli bölüm üretecek temel mekanizmayı belirle." },
      { title: "2 · Bölüm vaadi", text: "Okurun bu bölümde ne öğreneceğini veya hissedeceğini yaz." },
      { title: "3 · Scroll beat", text: "Bilgiyi ekran ekran açılacak vuruşlara böl." },
      { title: "4 · Mobil thumbnail", text: "Telefon genişliğinde okunacak kaba kompozisyon kur." },
      { title: "5 · Boşluk ritmi", text: "Dikey mesafeyi süre, sessizlik ve sürpriz için ayarla." },
      { title: "6 · Metin turu", text: "Balon ve yazıların küçük ekranda okunurluğunu kontrol et." },
      { title: "7 · Kanca", text: "Bölüm sonunda organik sonuçtan yeni soru üret." },
      { title: "8 · Yayın temposu", text: "Üretim kapasitesine göre bölüm boyu ve buffer planı yap." },
    ],
    structureItems: [
      { title: "İlk ekran", text: "Okurun kaydırmaya devam etmesi için durum ve ton kur." },
      { title: "Ritim blokları", text: "Konuşma, aksiyon ve sessizliği ekran kümeleri halinde dengele." },
      { title: "Uzun boşluk", text: "Bekleme veya düşüş hissini dikey mesafeyle yarat." },
      { title: "Reveal", text: "Görüntüyü ekran dışında tutup kaydırmayla aç." },
      { title: "Bölüm sonu", text: "Sırf kesmek değil, yeni sonuç ve merak üretmek için bitir." },
    ],
    anatomy: "- **Viewport:** Okurun bir anda gördüğü ekran alanı.\n- **Scroll mesafesi:** Zaman ve gerilim aracı.\n- **Panel kümesi:** Aynı ritmik birime ait görüntüler.\n- **Mobil balon:** Küçük ekranda okunabilir metin.\n- **Reveal:** Kaydırmayla açılan bilgi.\n- **Bölüm kancası:** Sonraki bölüme devam dürtüsü.\n- **Buffer:** Yayın sürekliliği için önceden tamamlanmış bölüm stoğu.",
    practiceItems: [
      { title: "Viewport testi", text: "Her kritik anda ekranda hangi bilgilerin birlikte göründüğünü kontrol et." },
      { title: "Scroll haritası", text: "Uzun boşluk, hızlı seri ve reveal noktalarını işaretle." },
      { title: "Bölüm bütçesi", text: "Panel/ekran yoğunluğunu üretim kapasitesiyle eşleştir." },
      { title: "Buffer takvimi", text: "Yayın başlamadan önce gerçekçi bölüm stoğu planla." },
    ],
    workspaceItems: [
      { title: "Mobil önizleme", text: "Masaüstü yerine gerçek telefon genişliğinde sık sık test et." },
      { title: "Uzun tuval bölümü", text: "Dosya performansı için çalışma tuvalini yönetilebilir parçalara ayır." },
      { title: "Metin stilleri", text: "Balon ve efekt yazılarını tutarlı boyutlarda standardize et." },
      { title: "Yayın sürümü", text: "Her bölümün teslim, yayın ve düzeltme sürümünü ayrı izle." },
    ],
    craft: "Webtoonun zanaatı görünmeyen alanı kullanmaktır. Okur bir sonraki görüntüyü görmeden önce parmağıyla zaman üretir. Çok uzun boşluk her zaman gerilim yaratmaz; yalnız gerçekten bekleme, düşme, yalnızlık veya sürpriz işlevi olduğunda etkilidir. Mobil okunurluk estetik kadar temel bir anlatı koşuludur.",
    extraSections: [
      { id: "viewport", type: "cards", heading: "Her kritik anı tek ekran mantığıyla test et", items: [
        { title: "Bilgi çakışması", text: "Sürpriz panel önceki ekranın altında yanlışlıkla görünmesin." },
        { title: "Yüz okunurluğu", text: "Duygusal tepki telefonda yeterli büyüklükte mi?" },
        { title: "Balon yoğunluğu", text: "Ekranı metin duvarına çevirecek yığılmayı böl." },
      ]},
      { id: "scroll-zamani", type: "steps", heading: "Kaydırmayı süre olarak yaz", items: [
        { title: "Yaklaştır", text: "Kısa aralıklarla hızlı tempo kur." },
        { title: "Uzat", text: "Sessizlik veya bekleme için kontrollü boşluk kullan." },
        { title: "Aç", text: "Reveal panelini önceki viewport'tan tamamen sakla." },
      ]},
      { id: "mobil-tipografi", type: "cards", heading: "Metni telefonda gerçek boyutunda sınay", items: [
        { title: "Punto", text: "Yakınlaştırma gerektirmeyen metin boyu kullan." },
        { title: "Satır", text: "Uzun satırları dar ekranda böl; balonu gereksiz büyütme." },
        { title: "Kontrast", text: "Yazı ile balon/arka plan ayrımını erişilebilir tut." },
      ]},
      { id: "seri-uretimi", type: "cards", heading: "Yayın takvimini yaratıcı karar kadar ciddiye al", items: [
        { title: "Buffer", text: "Yayın öncesi birkaç bölüm stokla." },
        { title: "Bölüm boyu", text: "Sürdürülemeyen uzunluk yerine düzenli kaliteyi seç." },
        { title: "Sezon molası", text: "Büyük yayları sezonlara bölerek üretim ve okur beklentisini yönet." },
      ]},
      { id: "platform-kancasi", type: "cards", heading: "Kancayı algoritma uğruna hikâyeyi bozacak numaraya dönüştürme", items: [
        { title: "Sonuç", text: "Bölümün kendi mini vaadini önce karşıla." },
        { title: "Yeni soru", text: "Kanca yaşanan olayın doğal sonucu olsun." },
        { title: "Yanlış vaat", text: "Bir sonraki bölümde geri alınacak sahte şoktan kaçın." },
      ]},
      { id: "dosya-teknigi", type: "cards", heading: "Uzun tuvali teknik teslim koşullarıyla planla", items: [
        { title: "Boyut", text: "Hedef platformun genişlik, dosya boyu ve parça sınırlarını baştan öğren." },
        { title: "Kesim", text: "Tuvali platform yükleme parçalarına bölerken paneli yanlış yerden kesme." },
        { title: "Yedek", text: "Kaynak dosya, font ve export sürümlerini düzenli arşivle." },
      ]},
      { id: "erisilebilir-yayin", type: "cards", heading: "Dijital yayında erişilebilirliği sonradan eklenen iş sayma", items: [
        { title: "Alt metin", text: "Kritik görsel bilgiyi betimleyebilecek yayın altyapısını planla." },
        { title: "Renk", text: "Bilgiyi yalnız renk farkıyla kodlama." },
        { title: "Flaş / hassas içerik", text: "Gerekli içerik uyarılarını bölüm girişinde doğru konumlandır." },
      ]},
    ],
    draftItems: [
      { title: "Telefon için thumbnail", text: "Kaba çizimi masaüstü genişliğinde değil mobil görünümde test et." },
      { title: "Reveal işaretle", text: "Sürprizlerin viewport dışında kaldığını taslakta doğrula." },
      { title: "Metni kısalt", text: "Uzun açıklamayı iki ekranlık görsel eyleme dönüştürmeyi dene." },
      { title: "Bölümü bitir", text: "Yayın baskısıyla ilk sahneyi sonsuz cilalamak yerine tam bölüm üret." },
    ],
    revisionItems: [
      { title: "Mobil test", text: "Gerçek telefonda metin ve yüzler okunuyor mu?" },
      { title: "Scroll testi", text: "Boşlukların her biri anlatısal iş yapıyor mu?" },
      { title: "Kanca testi", text: "Final önceki bölüm vaadini bozmadan devam dürtüsü yaratıyor mu?" },
      { title: "Üretim testi", text: "Bu bölüm uzunluğu sürdürülebilir mi?" },
    ],
    projectBody: "**Kahraman:** Gece çalışan kurye Mina.\n\n**Mekân:** Kat numaraları -2'den başlayan eski bir rezidans.\n\n**Seri motoru:** Uygulamada görünmeyen ‘Kat 0’ siparişleri.\n\n**Dikey motif:** Asansör kat göstergesi.\n\n**Scroll reveal:** Uzun karanlık boşluğun ardından göstergede ilk kez 0 belirir.\n\n**Sezon sorusu:** Kat 0 gerçekten fiziksel bir yer mi, yoksa binanın silinmiş sakinlerinin ortak kaydı mı?",
    sampleHeading: "Örnek scroll sekansı: boşluğu zaman olarak kullan",
    sampleBody: "Ekran 1: Asansör paneli — B2, B1, 1.\nKısa boşluk.\nEkran 2: Mina'nın başparmağı 1'in altında boş metal yüzeye dokunur.\nUzun siyah boşluk.\nEkran 3: Metalin altında 0 rakamı yanar.\nBalon yok. Sonraki ekran: ‘Teslimata 00:59 kaldı.’",
    finalItems: [
      { title: "Telefon önizleme", text: "Tüm bölümü gerçek mobil genişlikte kaydır." },
      { title: "Export", text: "Boyut, kesim ve kalite platform koşullarına uyuyor mu?" },
      { title: "Metin", text: "Balonlar yakınlaştırmasız okunuyor mu?" },
      { title: "Buffer", text: "Yayın takvimini taşıyacak stok ve mola planı var mı?" },
    ],
    outputItems: [
      { title: "1 seri motoru", text: "En az bir sezon taşıyacak tekrar edilebilir yapıyı yaz." },
      { title: "1 scroll haritası", text: "Reveal, sessizlik ve hızlı ritim noktalarını çıkar." },
      { title: "1 bölüm beat'i", text: "Açılıştan kancaya tam akışı kur." },
      { title: "1 mobil prototip", text: "Telefon genişliğinde kısa bir dikey sekans hazırla." },
    ],
    masters: [
      { title: "SIU — Tower of God", text: "Dikey mekân, seri motoru ve uzun dönem gizem yönetimini incele." },
      { title: "Yaongyi — True Beauty", text: "Mobil yakın plan, karakter ilişkileri ve bölüm kancası kullanımını incele." },
      { title: "Carnby Kim & Youngchan Hwang — Bastard", text: "Gerilimde viewport, reveal ve bölüm ritminin nasıl kullanıldığını incele." },
    ],
    faq: [
      { question: "Webtoon'u önce normal sayfa çizip sonra dikeye çevirebilir miyim?", answer: "Teknik olarak mümkün olsa da anlatı ritmi çoğu zaman bozulur. Dikey viewport ve scroll mantığını baştan tasarlamak daha sağlıklıdır." },
      { question: "Her bölüm cliffhanger ile mi bitmeli?", answer: "Hayır. Devam dürtüsü gerekir ama bu mutlaka şok değildir; duygusal karar, yeni bilgi veya değişen hedef de güçlü kanca olabilir." },
    ],
  },
  {
    slug: "karikatur",
    label: "Karikatür",
    title: "Karikatür Nasıl Yazılır?",
    description: "Gözlemden tek kare fikrine, kurulum–dönüş mekanizmasından görsel ekonomi, etik ve seri karakter üretimine kadar adım adım karikatür eğitimi.",
    summary: "Az çizgi ve az sözle güçlü fikir kur; şakayı açıklama, görüntü ile metin arasındaki gerilimden doğur ve hedefi aşağılamaya değil davranışın çelişkisine yönelt.",
    projectName: "Toplantı Odası",
    orientation: "Karikatür yalnız komik çizim değildir. Tek karede veya kısa şeritte fikir, bakış açısı ve zamanlama çok sıkışık çalışır. En iyi karikatürde çizim ve yazı birbirini tekrar etmez; biri diğerinin anlamını değiştirir.",
    ideaItems: [
      { title: "Gündelik çelişki", text: "Söylenen ile yapılan arasındaki farkı yakala." },
      { title: "Dil klişesi", text: "Sık kullanılan kurumsal, ailevi veya kamusal cümleyi başka bağlamda sınay." },
      { title: "Nesne mantığı", text: "Bir nesnenin işlevini tersine çevirerek fikir üret." },
      { title: "Rol değişimi", text: "Güçlü ve güçsüz, insan ve nesne veya uzman ve acemi rollerini bilinçli ters çevir." },
    ],
    ideaFlow: "‘Toplantılar gereksiz uzun’ bir şikâyettir. ‘Verimlilik toplantısında herkesin önünde kalan süreyi gösteren bir kronometre vardır ama kronometre de söz almak için el kaldırır’ görsel bir karikatür çekirdeğidir. Fikir, tek görüntüde okunabilecek çelişkiye dönüşmeli.",
    contrastItems: [
      { title: "Karikatür ≠ meme", text: "Meme hazır kültürel şablona dayanabilir; karikatür kendi görsel fikrini ve kompozisyonunu kurar." },
      { title: "Karikatür ≠ çizgi roman", text: "Tek kare veya çok kısa şerit, uzun olay örgüsünden çok tek fikir ve dönüş üzerine yoğunlaşır." },
      { title: "Karikatür ≠ hakaret", text: "Eleştiri hedefin görünüşüne veya kimliğine saldırmak yerine davranış, güç ve çelişkiyi görünür kılmalıdır." },
    ],
    routeItems: [
      { title: "1 · Gözlem", text: "Gerçek bir çelişki veya davranışı tek cümlede kaydet." },
      { title: "2 · Hedef", text: "Neyi eleştirdiğini açıkça belirle." },
      { title: "3 · Mekanizma", text: "Abartma, tersine çevirme, benzetme veya literal yorumdan birini seç." },
      { title: "4 · Görsel çekirdek", text: "Şaka metinsiz de kısmen anlaşılabilecek görüntüyü kur." },
      { title: "5 · Caption / balon", text: "Görüntünün söylemediği tek ek bilgiyi yaz." },
      { title: "6 · Kesme", text: "Gereksiz karakter, eşya ve kelimeyi çıkar." },
      { title: "7 · Etik test", text: "Punchline'ın kime vurduğunu ve nedenini kontrol et." },
      { title: "8 · Soğuk okuma", text: "Fikri bağlam açıklamadan başka birine göster; anlaşılıyor mu bak." },
    ],
    structureItems: [
      { title: "Kurulum", text: "Normal durumu tek bakışta anlaşılır kıl." },
      { title: "Beklenti", text: "Okurun zihninde olası anlamı kur." },
      { title: "Dönüş", text: "Görsel veya metin ikinci anlamı açsın." },
      { title: "Artçı düşünce", text: "Şaka bittikten sonra eleştirel fikir bir an daha kalsın." },
    ],
    anatomy: "- **Hedef:** Eleştirinin yöneldiği davranış veya güç.\n- **Kurulum:** Okurun ilk okuduğu normal durum.\n- **Dönüş:** Anlamı değiştiren ayrıntı.\n- **Siluet:** Karakter ve nesnenin ilk bakışta okunurluğu.\n- **Caption / balon:** Görüntünün yapamadığı tek işi yapar.\n- **Negatif alan:** Kalabalığı azaltıp fikri öne çıkarır.\n- **Etik mesafe:** Şakanın aşağıya mı yukarıya mı vurduğunu sorgular.",
    practiceItems: [
      { title: "Gözlem defteri", text: "Günde en az üç çelişki veya garip ifade kaydet." },
      { title: "Mekanizma listesi", text: "Aynı fikri abartma, tersine çevirme ve literal yorumla ayrı ayrı dene." },
      { title: "10 thumbnail", text: "Tek fikrin on küçük kompozisyonunu çiz; ilk çözüme bağlanma." },
      { title: "Kesme turu", text: "Her çizgi ve kelime için ‘olmasa ne kaybolur?’ sorusunu sor." },
    ],
    workspaceItems: [
      { title: "Fikir kartı", text: "Hedef, mekanizma ve dönüşü tek satırda tut." },
      { title: "Thumbnail sayfası", text: "Kompozisyon alternatiflerini yan yana gör." },
      { title: "Metin varyantı", text: "Aynı görsel için birkaç caption dene ve en az açıklayanı seç." },
      { title: "Yayın bağlamı", text: "Gazete, sosyal medya veya kitap formatına göre boyut ve okunurluğu kontrol et." },
    ],
    craft: "Karikatür zanaatı sıkıştırmadır. Şakanın açıklanması gerekiyorsa görsel fikir yeterince net olmayabilir. En etkili dönüş, okurun ilk varsayımını tek ayrıntıyla değiştirir. Özellikle toplumsal konularda kişiyi kimliği üzerinden küçültmek yerine davranış, kurum ve güç ilişkisini hedefle.",
    extraSections: [
      { id: "mizah-mekanizmasi", type: "cards", heading: "Aynı fikri farklı mizah mekanizmalarıyla dene", items: [
        { title: "Abartma", text: "Gerçek eğilimi mantıksal ucuna götür." },
        { title: "Tersine çevirme", text: "Rolleri değiştirerek görünmeyen güç ilişkisini aç." },
        { title: "Literal yorum", text: "Soyut ifadeyi fiziksel olarak gerçek kabul et." },
        { title: "Yan yana koyma", text: "İki normal görüntüyü birlikte göstererek çelişki üret." },
      ]},
      { id: "tek-kare-kompozisyon", type: "steps", heading: "Tek karede göz rotasını kur", items: [
        { title: "İlk okuma", text: "Okur önce neyi görmeli?" },
        { title: "İkinci bilgi", text: "Dönüşü sağlayan ayrıntı nerede?" },
        { title: "Metin", text: "Caption göz rotasını bozuyor mu, tamamlıyor mu?" },
      ]},
      { id: "etik-hedef", type: "cards", heading: "Punchline'ın hedefini etik açıdan test et", items: [
        { title: "Kimlik", text: "Şaka kişinin değiştirilemez kimliğini mi hedef alıyor?" },
        { title: "Güç", text: "Eleştiri gücü görünür kılıyor mu, güçsüzü mü aşağılıyor?" },
        { title: "Bağlam", text: "Görsel klişe yanlış grubu hedef gibi gösterebilir mi?" },
      ]},
      { id: "karakter-serisi", type: "cards", heading: "Tekrarlanan karakter için seri motoru kur", items: [
        { title: "Sabit kusur", text: "Karakterin tekrar eden bakış hatasını belirle." },
        { title: "Değişen durum", text: "Her şeritte farklı ortam aynı kusuru başka sonuçla sınasın." },
        { title: "Tanınırlık", text: "Siluet ve davranış karakteri ilk bakışta tanıtsın." },
      ]},
      { id: "metin-ekonomisi", type: "steps", heading: "Caption'ı üç kesme turundan geçir", items: [
        { title: "Tekrarı sil", text: "Görüntünün gösterdiği bilgiyi çıkar." },
        { title: "Kurulumu kısalt", text: "Şaka için zorunlu olmayan bağlamı sil." },
        { title: "Son kelime", text: "Mümkünse dönüşü cümlenin sonuna taşı." },
      ]},
      { id: "guncel-olay", type: "cards", heading: "Güncel olayı çizerken hız uğruna doğruluğu bırakma", items: [
        { title: "Olgu", text: "Şakanın dayandığı haber veya söz gerçekten doğru mu kontrol et." },
        { title: "Zaman", text: "Bağlam hızla değişiyorsa tarih veya olay referansını netleştir." },
        { title: "Kişi", text: "İsnat ve suçlama içeren görsel/metinde doğrulanmamış iddiayı gerçek gibi kurma." },
      ]},
    ],
    draftItems: [
      { title: "10 çözüm çiz", text: "İlk thumbnail'ı final kabul etme; aynı fikrin farklı kompozisyonlarını dene." },
      { title: "Metinsiz test", text: "Caption'ı kapatınca temel kurulum okunuyor mu?" },
      { title: "Tek dönüş", text: "Aynı karede üç ayrı şaka yarışıyorsa ana fikri seç." },
      { title: "Sadeleştir", text: "Dekor ve ayrıntıyı fikrin hizmetinde tut." },
    ],
    revisionItems: [
      { title: "3 saniye testi", text: "İlk bakışta kim, nerede ve ne oluyor anlaşılabiliyor mu?" },
      { title: "Dönüş testi", text: "İkinci anlam gerçekten ilk beklentiyi değiştiriyor mu?" },
      { title: "Metin testi", text: "Caption açıklıyor mu, anlamı mı dönüştürüyor?" },
      { title: "Etik test", text: "Şakanın hedefi davranış/güç mü, kimlik mi?" },
    ],
    projectBody: "**Seri ortamı:** Büyük bir şirketin toplantı odası.\n\n**Tekrarlanan karakter:** ‘Verimlilik Direktörü’ Selim.\n\n**Sabit kusur:** Verimlilik hakkında konuşurken her süreci uzatması.\n\n**İlk kare fikri:** Masadaki herkesin önünde üç dakikalık kum saati vardır; Selim'in önündeki kum saati söz ister gibi el kaldırmıştır.\n\n**Seri motoru:** Her karikatürde başka bir kurumsal kavram fiziksel olarak toplantıya katılır.",
    sampleHeading: "Örnek tek kare: görüntü ile caption birbirini tekrar etmesin",
    sampleBody: "Görsel: Toplantı odasında duvardaki dev ekranda ‘KISA TOPLANTI KÜLTÜRÜ’ yazıyor. Masanın etrafında uyuyakalmış on kişi. Sunumu yapan Selim'in arkasında ‘Slayt 147 / 320’. Caption: ‘İkinci bölümde süre yönetimine geçeceğiz.’",
    finalItems: [
      { title: "İlk bakış", text: "Kompozisyon üç saniyede okunuyor mu?" },
      { title: "Caption", text: "Metin mümkün olan en kısa hâlinde mi?" },
      { title: "Hedef", text: "Eleştirinin yönü ve bağlamı adil mi?" },
      { title: "Teknik export", text: "Yayın platformunda çizgi ve yazılar net kalıyor mu?" },
    ],
    outputItems: [
      { title: "10 gözlem", text: "Gündelik çelişkileri kısa notlarla topla." },
      { title: "3 mekanizma denemesi", text: "Tek fikri üç farklı mizah yöntemiyle çöz." },
      { title: "10 thumbnail", text: "Tek karikatür için kompozisyon seçenekleri üret." },
      { title: "1 final kare", text: "Görsel, caption ve etik testleri tamamlanmış karikatür oluştur." },
    ],
    masters: [
      { title: "Sempe", text: "Az çizgiyle karakter, sosyal gözlem ve görsel ekonomi kurmayı incele." },
      { title: "Saul Steinberg", text: "Çizginin kendisini fikir ve metafor aracına dönüştürme biçimini incele." },
      { title: "Turhan Selçuk", text: "Siluet, sade kompozisyon ve toplumsal eleştirinin görsel dilini incele." },
    ],
    faq: [
      { question: "Karikatür mutlaka komik olmak zorunda mı?", answer: "Hayır. İronik, rahatsız edici veya düşündürücü olabilir; önemli olan yoğunlaştırılmış görsel fikir ve bakış açısıdır." },
      { question: "Güncel olay karikatüründe ne kadar hızlı olmalıyım?", answer: "Hız değerlidir ama yanlış bilgi daha büyük zarar verir. Fikrin dayandığı temel olguyu yayın öncesi doğrula." },
    ],
  },
];

function build(profile: Profile): GraphicGuideDefinition {
  return {
    category: "Çizgi Anlatı",
    slug: profile.slug,
    label: profile.label,
    title: profile.title,
    description: profile.description,
    summary: profile.summary,
    alts: alts(profile.label, profile.projectName),
    orientationHeading: `${profile.label} anlatısının temel mantığını önce doğru kur`,
    orientationBody: profile.orientation,
    ideaHeading: `${profile.label} fikrini görsel anlatı üretecek kaynaklardan çıkar`,
    ideaIntro: "Fikir yalnız konu değil, görüntüye ve ritme dönüşebilen bir anlatı motoru taşımalıdır.",
    ideaItems: profile.ideaItems,
    ideaFlowHeading: "Ham fikri görsel anlatı çekirdeğine dönüştür",
    ideaFlowBody: profile.ideaFlow,
    contrastHeading: `${profile.label} türünü komşu biçimlerden ayır`,
    contrastIntro: "Biçimin üretim ve okuma mantığını yanlış türden kopyalamadan önce farkları netleştir.",
    contrastItems: profile.contrastItems,
    routeHeading: `${profile.label} projesini baştan sona aşamalı kur`,
    routeIntro: "Önce anlatı motorunu, sonra görsel zamanlama ve üretim kararlarını sabitle.",
    routeItems: profile.routeItems,
    structureHeading: `${profile.label} yapısını görsel ritim ve dramatik sonuçla kur`,
    structureIntro: "Yapı yalnız olay sırası değil; okurun gördüğü, beklediği ve tamamladığı zamanın düzenidir.",
    structureItems: profile.structureItems,
    structureCaption: `${profile.label} yapısı, anlatı vuruşlarını görsel ritim ve okuma deneyimiyle eşleştirir.`,
    anatomyHeading: `${profile.label} anatomisi: görsel zaman, metin ve boşluk birlikte çalışır`,
    anatomyBody: profile.anatomy,
    practiceHeading: `${profile.label} üretiminde ayrı çalışma dosyaları tut`,
    practiceIntro: "Görsel anlatıda fikir, sayfa/panel planı, metin ve revizyonu izlenebilir tutmak üretimi hızlandırır.",
    practiceItems: profile.practiceItems,
    pageSetupCaption: `${profile.label} çalışma düzeni, görsel planı, metni ve revizyon kararlarını aynı üretim akışında izler.`,
    workspaceHeading: `${profile.label} dosyanı üretim mantığına göre düzenle`,
    workspaceIntro: "Geri bildirimde ve revizyonda hangi anlatı biriminin değiştiği açık olmalıdır.",
    workspaceItems: profile.workspaceItems,
    craftHeading: `${profile.label} türünün asıl zanaatını öğren`,
    craftBody: profile.craft,
    extraSections: profile.extraSections,
    draftHeading: "İlk taslakta ayrıntıya saplanmadan görsel akışı tamamla",
    draftIntro: "İlk hedef final çizim değil, baştan sona çalışan okunabilir bir anlatı prototipidir.",
    draftItems: profile.draftItems,
    revisionHeading: "Revizyonda hem hikâyeyi hem görsel okunurluğu sınay",
    revisionIntro: "İyi metin kötü görsel akışı kurtaramaz; iyi çizim de belirsiz anlatı kararını gizleyemez.",
    revisionItems: profile.revisionItems,
    projectName: profile.projectName,
    projectBody: profile.projectBody,
    projectCaption: `${profile.projectName}, ${profile.label.toLocaleLowerCase("tr-TR")} türünün anlatı ve üretim kararlarını somut bir proje üzerinde gösterir.`,
    sampleHeading: profile.sampleHeading,
    sampleBody: profile.sampleBody,
    finalHeading: "Yayıma veya üretim teslimine geçmeden önce son kontrolü yap",
    finalIntro: "Anlatı, okunurluk, teknik teslim ve süreklilik kararlarını birlikte kapat.",
    finalItems: profile.finalItems,
    outputsHeading: "Bu eğitimden somut üretim çıktılarıyla çık",
    outputsIntro: "Sayfayı yalnız okumak değil, kendi görsel anlatı projenin ilk çalışır parçasını üretmek için kullan.",
    outputItems: profile.outputItems,
    mastersIntro: "Biçimi kopyalamadan, başarılı üreticilerin görsel zaman, kompozisyon ve anlatı problem çözme biçimini incele.",
    masters: profile.masters,
    faq: profile.faq,
    finalCaption: `${profile.label} taslağı, hikâye ile görsel dil aynı okuma deneyimini taşıdığında üretime hazır hale gelir.`,
    ctaHeading: `${profile.label} projenin ilk çalışır sekansını kur`,
    ctaText: "Fikrin, yapın ve görsel planın hazırsa İlkOku Yazar Alanı'nda eserini oluşturmaya başla.",
  };
}

const definitions = profiles.map(build);

export function getEducationGuideDefinition(slug: string): GraphicGuideDefinition {
  const definition = definitions.find((item) => item.slug === slug);
  if (!definition) throw new Error(`Graphic narrative education guide definition missing: ${slug}`);
  return definition;
}

export const GRAPHIC_NARRATIVE_GUIDE_DEFINITIONS = definitions;
