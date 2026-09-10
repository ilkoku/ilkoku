import type { CmsPageBlock } from "@/lib/cms-page-blocks";

export type CmsPageTemplateKey = "kurumsal" | "surec" | "rol" | "bilgi" | "ornek-roman";

export type CmsPageTemplate = {
  key: CmsPageTemplateKey;
  label: string;
  description: string;
  bestFor: string;
  summary: string;
  blocks: CmsPageBlock[];
  seoDescription: string;
};

export const cmsPageTemplates: readonly CmsPageTemplate[] = [
  {
    key: "kurumsal",
    label: "Kurumsal anlatım",
    description: "Güçlü hero, açıklama, rakamlar, kartlar ve CTA ile kurumsal/güven sayfası.",
    bestFor: "Hakkımızda · güven · kurum yaklaşımı",
    summary: "Bu kısa özeti sayfanın ziyaretçiye ne anlattığını tek paragrafta açıklayacak şekilde düzenleyin.",
    seoDescription: "Sayfanın amacını ve ziyaretçinin burada bulacağı bilgiyi 70-180 karakter arasında özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "İlkOku", title: "Sayfanın ana mesajı", text: "Ziyaretçiye bu sayfanın ne sunduğunu güçlü ve kısa bir girişle anlatın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "text-1", type: "text", heading: "Neyi anlatıyoruz?", body: "Bu bölümü gerçek içerikle doldurun.\n\n## Neden önemli?\n\nZiyaretçinin anlayacağı somut bilgiyle devam edin." },
      { id: "stats-1", type: "stats", heading: "Rakamlarla", items: [{ value: "01", label: "Öne çıkan veri" }, { value: "02", label: "İkinci veri" }, { value: "03", label: "Üçüncü veri" }] },
      { id: "cards-1", type: "cards", heading: "Öne çıkanlar", intro: "Temel değerleri veya faydaları kısa kartlarla anlatın.", items: [{ title: "Birinci başlık", text: "Açıklama metni", label: "", href: "" }, { title: "İkinci başlık", text: "Açıklama metni", label: "", href: "" }, { title: "Üçüncü başlık", text: "Açıklama metni", label: "", href: "" }] },
      { id: "cta-1", type: "cta", heading: "Sonraki adım", text: "Ziyaretçinin buradan sonra ne yapabileceğini anlatın.", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
    ],
  },
  {
    key: "surec",
    label: "Süreç / adımlar",
    description: "Hero, adımlar, görsel+metin, SSS ve CTA ile süreç anlatımı.",
    bestFor: "Nasıl çalışır · başvuru · işlem akışı",
    summary: "Bu özeti sürecin kim için olduğunu ve ziyaretçinin sayfada hangi adımları öğreneceğini anlatacak şekilde düzenleyin.",
    seoDescription: "Sürecin başlangıcını, ana adımlarını ve sonucunu arama sonucunda anlaşılır biçimde özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "Süreç", title: "Nasıl ilerliyor?", text: "Süreci tek cümlede tanıtın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "steps-1", type: "steps", heading: "Adım adım", intro: "Ziyaretçinin izleyeceği akışı açıklayın.", items: [{ title: "Başlangıç", text: "İlk adımın ne olduğunu açıklayın." }, { title: "İnceleme", text: "İkinci adımda ne olduğunu açıklayın." }, { title: "Sonuç", text: "Sürecin nasıl tamamlandığını açıklayın." }] },
      { id: "split-1", type: "split", heading: "Sürecin önemli noktası", body: "Bu alanı destekleyici açıklamayla doldurun.", imageUrl: "", imageAlt: "", imageSide: "right" },
      { id: "faq-1", type: "faq", heading: "Sık sorulan sorular", items: [{ question: "Bu süreç ne kadar sürer?", answer: "Gerçek yanıtı buraya yazın." }, { question: "Kimler kullanabilir?", answer: "Gerçek yanıtı buraya yazın." }] },
      { id: "cta-1", type: "cta", heading: "Hazır mısınız?", text: "Sonraki adıma yönlendiren kısa metin.", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
    ],
  },
  {
    key: "rol",
    label: "Rol / hedef kitle",
    description: "Belirli kullanıcı grubuna özel hero, fayda kartları, alıntı ve CTA.",
    bestFor: "Yazar · okuyucu · editör · yayınevi",
    summary: "Bu özeti hedef kitlenin İlkOku'da ne yapabildiğini ve bu sayfanın ona nasıl yardımcı olduğunu açıklayacak şekilde düzenleyin.",
    seoDescription: "Hedef kullanıcı grubunun İlkOku'daki imkanlarını ve izleyeceği yolu arama sonucuna uygun şekilde özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "Sizin için", title: "Hedef kitlenin ana faydası", text: "Bu kullanıcı grubunun İlkOku'da ne yapabileceğini anlatın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "cards-1", type: "cards", heading: "Neler yapabilirsiniz?", intro: "En önemli faydaları seçin.", items: [{ title: "Fayda 1", text: "Açıklama", label: "", href: "" }, { title: "Fayda 2", text: "Açıklama", label: "", href: "" }, { title: "Fayda 3", text: "Açıklama", label: "", href: "" }] },
      { id: "quote-1", type: "quote", quote: "Bu alana rolün ruhunu anlatan güçlü bir cümle yazın.", attribution: "" },
      { id: "cta-1", type: "cta", heading: "İlk adımı atın", text: "Kullanıcıyı doğru alana yönlendirin.", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
    ],
  },
  {
    key: "bilgi",
    label: "Bilgi / karşılaştırma",
    description: "Hero, açıklama, karşılaştırma tablosu, görsel ve SSS ile bilgi sayfası.",
    bestFor: "Kriterler · kapsam · karşılaştırma",
    summary: "Bu özeti ziyaretçinin hangi bilgileri karşılaştırabileceğini veya hangi kriterleri anlayacağını açıklayacak şekilde düzenleyin.",
    seoDescription: "Sayfadaki kriterleri, seçenekleri veya karşılaştırma bilgisini arama sonucuna uygun biçimde özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "Bilgi", title: "Konuyu açık ve net anlatın", text: "Ziyaretçinin burada ne öğreneceğini açıklayın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "text-1", type: "text", heading: "Temel kriterler", body: "- Birinci kriter\n- İkinci kriter\n- Üçüncü kriter" },
      { id: "table-1", type: "table", heading: "Karşılaştırma", columns: ["Başlık", "Açıklama"], rows: [["Örnek 1", "Gerçek bilgiyle değiştirin"], ["Örnek 2", "Gerçek bilgiyle değiştirin"]] },
      { id: "image-1", type: "image", imageUrl: "", alt: "", caption: "", layout: "wide" },
      { id: "faq-1", type: "faq", heading: "Sık sorulan sorular", items: [{ question: "İlk soru", answer: "Yanıt" }] },
    ],
  },
  {
    key: "ornek-roman",
    label: "ÖRNEK · Roman yazarlık rehberi",
    description: "83 eser türü eğitim sayfaları için geçici referans: mevcut İlkOku bloklarıyla Roman nasıl yazılır rehberi.",
    bestFor: "ÖRNEK · Yazarlar İçin → Kurgu → Roman",
    summary: "ÖRNEK: İlk roman fikrinden karaktere, olay örgüsünden sayfa düzenine ve ilk taslağa kadar adım adım yazarlık rehberi.",
    seoDescription: "ÖRNEK Roman yazarlık rehberi. İlk fikir, karakter, olay örgüsü, sayfa düzeni, taslak ve düzenleme adımlarını örneklerle keşfedin.",
    blocks: [
      {
        id: "ornek-roman-hero",
        type: "hero",
        eyebrow: "ÖRNEK · Yazarlar İçin · Kurgu",
        title: "Roman Nasıl Yazılır?",
        text: "Hayal et. Planla. Yaz. Tamamla. Bu örnek rehber, ilk roman fikrinden bitmiş taslağa kadar yolu İlkOku'nun mevcut sayfa şablonlarıyla gösterir.",
        imageUrl: "",
        imageAlt: "Roman yazma sürecini anlatan örnek çalışma masası görseli",
        primaryLabel: "Hadi Başla",
        primaryHref: "/yazar",
        secondaryLabel: "Önce Rehberi Oku",
        secondaryHref: "#roman-nedir",
      },
      {
        id: "ornek-roman-nedir",
        type: "text",
        heading: "Roman nedir?",
        body: "Roman; karakterleri, olayları, zamanı ve mekânı geniş bir anlatı içinde geliştirebilen kurmaca türüdür. Bir roman yalnızca uzun bir hikâye değildir; okurun karakterle birlikte değişimi yaşadığı bir dünyadır.\n\n## İlk kez yazıyorsan nereden başlamalısın?\n\nÖnce bütün kitabı çözmeye çalışma. Tek bir güçlü soru seç: **Ya şöyle olsaydı?** Sonra bu sorunun karşısına bir karakter koy ve onun ne istediğini belirle. Romanın ilk çekirdeği burada oluşur.",
      },
      {
        id: "ornek-roman-ilham",
        type: "cards",
        heading: "Bir roman fikri nereden gelir?",
        intro: "İlham beklenen bir mucize değil; gözlemlediğin şeyi soruya dönüştürme alışkanlığıdır.",
        items: [
          { title: "Gerçek bir olay", text: "Gazetede okuduğun küçük bir olayın arkasındaki görünmeyen hayatı düşün. Örnek: Yıllardır açılmayan bir evin kapısı bir sabah açık bulunuyor.", label: "", href: "" },
          { title: "Gördüğün bir insan", text: "Otobüste her gün aynı koltuğa oturan bir adam neden bunu yapıyor? Bir alışkanlığın arkasına geçmiş ve amaç ekle.", label: "", href: "" },
          { title: "Bir mekân", text: "Terk edilmiş bir otel, eski bir apartman veya hiç gitmediğin bir şehir. Mekânın sakladığı şeyi sor.", label: "", href: "" },
          { title: "Bir soru", text: "Ya bir insan hayatının en önemli anısını yanlış hatırlıyorsa? Tek bir 'ya şöyle olsaydı' sorusu bütün romanı başlatabilir.", label: "", href: "" },
          { title: "Bir rüya", text: "Rüyanın tamamını kullanmak zorunda değilsin. Tek bir görüntüyü al: boş bir istasyonda yalnızca senin adını söyleyen bir anons.", label: "", href: "" },
          { title: "Tarihsel bir kırılma", text: "Gerçek bir dönemi araştır ve görünmeyen bir karakterin gözünden yeniden düşün. Tarihî gerçek ile kurmacayı birbirinden ayır.", label: "", href: "" },
        ],
      },
      {
        id: "ornek-roman-cekirdek",
        type: "split",
        heading: "Fikri roman cümlesine dönüştür",
        body: "**Ham fikir:** Bir adam her gece aynı trene biniyor.\n\n**Karakter:** Yıllar önce kaybettiği kardeşini arayan emekli bir makinist.\n\n**Amaç:** Kardeşinin yaşadığına dair son izi bulmak.\n\n**Engel:** Elindeki tek ipucu, artık kullanılmayan bir tren hattının eski sefer çizelgesi.\n\n**Roman cümlesi:** Emekli bir makinist, kayıp kardeşinin izini sürmek için kapatılmış bir demiryolu hattının son seferini yeniden kurmaya çalışır.",
        imageUrl: "",
        imageAlt: "Ham fikirden roman cümlesine dönüşümü gösteren örnek şema",
        imageSide: "right",
      },
      {
        id: "ornek-roman-surec",
        type: "steps",
        heading: "Roman yazma süreci — 8 adımda",
        intro: "İlk roman için sade bir omurga. Her adım bir sonrakini kolaylaştırır.",
        items: [
          { title: "Fikri yakala", text: "Tek cümlelik roman çekirdeğini yaz. Konunun değil, karakterin karşılaşacağı temel değişimin peşine düş." },
          { title: "Ana karakteri kur", text: "Karakter ne istiyor, neden şimdi istiyor, ne kaybetmekten korkuyor? Bu üç cevap hikâyeyi hareket ettirir." },
          { title: "Çatışmayı belirle", text: "Karakterin istediği şeye kolayca ulaşmasını engelle. Dış engel kadar iç engeli de düşün." },
          { title: "Dünyayı ve zamanı seç", text: "Okurun bilmesi gereken mekân, dönem ve kuralları belirle. Her şeyi ilk bölümde anlatma." },
          { title: "Bölüm omurgasını çıkar", text: "Her bölüm için tek soru sor: Bu bölüm bittiğinde ne değişmiş olacak? Değişim yoksa bölümün işlevini sorgula." },
          { title: "İlk taslağı bitir", text: "Yazarken her cümleyi mükemmelleştirmeye çalışma. Önce hikâyenin baştan sona var olmasını sağla." },
          { title: "Düzenle", text: "Önce yapıyı, sonra sahneleri, en son cümleleri düzelt. Büyük problemi kelime cilasıyla saklama." },
          { title: "Yayıma hazırla", text: "Bölüm sırası, ek sayfalar, yazım tutarlılığı ve son okumayı tamamla; sonra eseri okurla buluştur." },
        ],
      },
      {
        id: "ornek-roman-anatomi",
        type: "cards",
        heading: "Bir roman kitabının içinde neler olur?",
        intro: "Her kitap hepsini kullanmak zorunda değildir. Yazar eserinin ruhuna göre seçer ve sıralar.",
        items: [
          { title: "Kapak ve İç Kapak", text: "Eser adı, yazar adı ve kitabın ilk kimliği. İç kapak sade olabilir ve eserin tonunu korur.", label: "", href: "" },
          { title: "Künye", text: "Eserin yayın ve hak bilgileri. Basılı veya dijital yayına göre içerik değişebilir.", label: "", href: "" },
          { title: "İthaf ve Epigraf", text: "İsteğe bağlıdır. İthaf kişiye, epigraf ise eserin duygusuna veya temasına kapı açabilir.", label: "", href: "" },
          { title: "İçindekiler", text: "Özellikle bölüm başlıkları anlam taşıyorsa okura kitabın yapısını gösterir.", label: "", href: "" },
          { title: "Prolog · Bölümler · Epilog", text: "Romanın ana gövdesi. Prolog ve epilog zorunlu değildir; anlatı gerçekten ihtiyaç duyuyorsa kullanılmalıdır.", label: "", href: "" },
          { title: "Teşekkür ve Yazar Hakkında", text: "Eserin arkasındaki insanı görünür kılan son sayfalar. Kitabın ana anlatısından ayrı tutulur.", label: "", href: "" },
        ],
      },
      {
        id: "ornek-roman-karsilastirma",
        type: "table",
        heading: "Roman mı, Öykü mü, Novella mı?",
        columns: ["Tür", "Odak", "Yapı", "Yazara pratik ipucu"],
        rows: [
          ["Roman", "Geniş karakter ve olay gelişimi", "Çok bölümlü, yan katmanlara açık", "Uzunluğu değil dönüşümün tamamlanmasını hedefle"],
          ["Öykü", "Tek an, duygu veya kırılma", "Yoğun ve dar odak", "Her ayrıntının bir işlevi olsun"],
          ["Novella", "Tek ana hat üzerinde derinleşme", "Roman kadar genişlemeden daha uzun gelişim", "Yan olayları sınırlı tut, ana çatışmayı büyüt"],
        ],
      },
      {
        id: "ornek-roman-karakter",
        type: "split",
        heading: "Karakteri kâğıt üzerinde canlı hâle getir",
        body: "Bir karakter kartında yalnız fiziksel özellikleri yazma.\n\n- **İstediği şey:** Kayıp kardeşini bulmak.\n- **Korkusu:** Gerçeğin düşündüğünden daha ağır çıkması.\n- **Zayıflığı:** Yardım istememesi.\n- **Sırrı:** Kardeşinin kaybolduğu gece hakkında bir şey saklıyor.\n- **Dönüşümü:** Kontrol etmek yerine yüzleşmeyi öğreniyor.\n\nBu beş bilgi, saç renginden daha fazla sahne üretir.",
        imageUrl: "",
        imageAlt: "Örnek roman karakter kartı",
        imageSide: "left",
      },
      {
        id: "ornek-roman-olay-orgusu",
        type: "steps",
        heading: "Olay örgüsünü sahnelere böl",
        intro: "Aşağıdaki beş durak katı bir kural değil; ilk taslağı kaybetmeden ilerletmek için örnek bir haritadır.",
        items: [
          { title: "Denge", text: "Karakterin normalini göster. Okur neyin bozulacağını anlayabilsin." },
          { title: "Tetikleyici olay", text: "Eski çizelgede kardeşinin adına rastlar. Artık geri dönemeyeceği bir soru doğar." },
          { title: "Yükselen çatışma", text: "Her yeni ipucu çözüm kadar yeni bir sorun yaratır. Karakterin bedel ödemesi gerekir." },
          { title: "Doruk", text: "Karakter aradığı gerçeğe ulaşır ama asıl seçim artık o gerçeği ne yapacağıdır." },
          { title: "Sonuç", text: "Olay biter; fakat okur karakterin başlangıçtaki kişi olmadığını hisseder." },
        ],
      },
      {
        id: "ornek-roman-sayfa",
        type: "table",
        heading: "Kâğıt ve yazım ayarları — örnek çalışma düzeni",
        columns: ["Alan", "Taslak örneği", "Kitap / İlkOku yaklaşımı", "Neden?"],
        rows: [
          ["Kâğıt", "A4 · 210 × 297 mm", "Kitap geometrisi yayına göre değişebilir", "Taslakta rahat çalışma; yayında gerçek kitap ölçüsüne uyum"],
          ["Yazı tipi", "Okunaklı serif veya sans-serif", "Yazarın seçimi ve eser ruhu korunur", "Okuma konforu ve yazarın görsel tercihi birlikte korunmalı"],
          ["Punto", "11–12 pt çalışma örneği", "Yayın görünümünde yazarın belirlediği ölçü", "Tek bir zorunlu punto bütün türlere uygun değildir"],
          ["Satır aralığı", "1,5 çalışma örneği", "Yayın sayfasında yazarın düzeni", "Taslakta not ve düzeltme alanı; yayında tasarım bütünlüğü"],
          ["Paragraf", "Girinti veya paragraf arası boşluk", "Eser boyunca tek ve tutarlı sistem", "Okurun ritmi bozulmaz"],
          ["Bölüm başlangıcı", "Yeni sayfadan başlatılabilir", "Yazarın fiziksel sayfa kararı korunur", "Bölümün ritmi ve kitap hissi kaybolmaz"],
        ],
      },
      {
        id: "ornek-roman-ilk-sahne",
        type: "text",
        heading: "Örnek: ilk sahneyi nasıl kurarsın?",
        body: "## Zayıf başlangıç\n\nKemal altmış iki yaşında emekli bir makinistti. Kardeşi yıllar önce kaybolmuştu ve Kemal onu çok özlüyordu.\n\n## Daha sahneli başlangıç\n\nKemal, yirmi üç yıldır kapalı olan hattın adını çizelgede görünce gözlüğünü çıkardı. Kâğıdı ışığa tuttu. Son seferin yolcu listesinde kardeşinin adı vardı. Tarih, kardeşinin cenazesinden üç gün sonraydı.\n\nİkinci örnek karakterin geçmişini açıklamak yerine okura **bir sorun yaşatıyor**. Okur bilgi almak için değil, cevabı bulmak için bir sonraki paragrafa geçiyor.",
      },
      {
        id: "ornek-roman-taslak",
        type: "quote",
        quote: "İlk taslağın görevi kusursuz olmak değil; hikâyenin baştan sona var olmasını sağlamaktır.",
        attribution: "İlkOku · ÖRNEK yazarlık rehberi",
      },
      {
        id: "ornek-roman-duzenleme",
        type: "steps",
        heading: "Taslak bittikten sonra nasıl düzenlenir?",
        intro: "Düzeltmeyi büyükten küçüğe yap. Böylece sonradan sileceğin bir paragrafı saatlerce cilalamazsın.",
        items: [
          { title: "Yapı", text: "Ana çatışma baştan sona çalışıyor mu? Gereksiz bölüm veya eksik dönüş var mı?" },
          { title: "Sahne", text: "Her sahnede biri bir şey istiyor mu ve sahnenin sonunda bir şey değişiyor mu?" },
          { title: "Karakter", text: "Kararlar karakterin kurduğun geçmişi, korkuyu ve amacıyla tutarlı mı?" },
          { title: "Dil", text: "Tekrarları, açıklama fazlasını ve yapay diyalogları temizle. Cümle ritmini en son düzelt." },
          { title: "Son okuma", text: "Yazım, noktalama, bölüm sırası ve ek sayfaları kontrol et. Yayına temiz bir dosya bırak." },
        ],
      },
      {
        id: "ornek-roman-ustalar",
        type: "cards",
        heading: "Ustalardan öğren — 5 önemli roman yazarı",
        intro: "Eski dönemden günümüze uzanan örnek bir seçki. Burada amaç sıralama yapmak değil, farklı roman tekniklerini görmektir.",
        items: [
          { title: "Thomas Mann", text: "1929 Nobel Edebiyat Ödülü. Büyük toplumsal değişimleri aile, zaman ve karakter katmanları üzerinden kurmasından öğrenilebilir.", label: "", href: "" },
          { title: "Ernest Hemingway", text: "1954 Nobel Edebiyat Ödülü. Az sözle yoğun anlam, sahne içindeki gerilim ve görünmeyeni okura bırakma tekniğiyle öne çıkar.", label: "", href: "" },
          { title: "Gabriel García Márquez", text: "1982 Nobel Edebiyat Ödülü. Gerçek ile olağanüstüyü aynı anlatı dünyasında doğal biçimde birleştiren güçlü atmosferinden öğrenilebilir.", label: "", href: "" },
          { title: "Toni Morrison", text: "1993 Nobel Edebiyat Ödülü. Bellek, kimlik, tarih ve karakter sesini çok katmanlı roman yapısına dönüştürme gücüyle örnektir.", label: "", href: "" },
          { title: "Orhan Pamuk", text: "2006 Nobel Edebiyat Ödülü. Şehir, kimlik, anlatıcı ve farklı bakış açılarını aynı roman mimarisinde buluşturma biçimi incelenebilir.", label: "", href: "" },
        ],
      },
      {
        id: "ornek-roman-sss",
        type: "faq",
        heading: "İlk romanını yazarken sık sorulanlar",
        items: [
          { question: "Roman yazmaya başlamadan bütün bölümleri planlamak zorunda mıyım?", answer: "Hayır. Bazı yazarlar ayrıntılı planla, bazıları keşfederek yazar. İlk kez yazıyorsan ana karakteri, temel çatışmayı ve birkaç dönüm noktasını bilmek kaybolmanı azaltır." },
          { question: "İlk bölüm kaç sayfa olmalı?", answer: "Tek bir doğru sayı yok. Bölüm, taşıdığı sahne veya dönüş tamamlandığında bitmeli. Sayfa hedefi hikâyenin ritminin önüne geçmemeli." },
          { question: "İlk taslak kötü görünüyorsa bırakmalı mıyım?", answer: "Hayır. İlk taslak değerlendirme için değil, hikâyeyi görünür hâle getirmek içindir. Yapısal kalite düzenleme aşamasında yükselir." },
          { question: "Birden fazla anlatıcı kullanabilir miyim?", answer: "Evet; ancak her anlatıcının işlevi ve sesi belirgin olmalı. Bakış açısı değişimi okuru şaşırtmamalı, hikâyeye yeni bir katman kazandırmalı." },
          { question: "Romanı bitirdikten sonra hemen yayımlamalı mıyım?", answer: "Genellikle kısa bir dinlendirme, yeniden okuma ve en az bir düzenleme turu metindeki yapısal sorunları görmeyi kolaylaştırır." },
        ],
      },
      {
        id: "ornek-roman-cta",
        type: "cta",
        heading: "Artık sıra sende.",
        text: "İlk romanın bugün tek bir cümleyle başlayabilir. İlk fikrini yaz, karakterini kur ve hikâyenin ilk sayfasını oluştur.",
        primaryLabel: "Roman Yazmaya Başla",
        primaryHref: "/yazar",
        secondaryLabel: "Bu Örneği Düzenle",
        secondaryHref: "/icerik/sayfalar/sablonlar",
      },
    ],
  },
] as const;

export function getCmsPageTemplate(value: string | null | undefined) {
  return cmsPageTemplates.find((template) => template.key === value) ?? cmsPageTemplates[0];
}
