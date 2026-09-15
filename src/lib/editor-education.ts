type EditorEducationItem = {
  title: string;
  text: string;
};

export type EditorEducationCategory = {
  slug: string;
  title: string;
  shortDescription: string;
  lead: string;
  promise: string;
  seoTitle: string;
  seoDescription: string;
  benefits: readonly EditorEducationItem[];
  learningPath: readonly EditorEducationItem[];
  concepts: readonly EditorEducationItem[];
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

export const EDITOR_EDUCATION_CATEGORIES = [
  {
    slug: "editorluge-baslama",
    title: "Editörlüğe Başlama",
    shortDescription: "Editörün rolünü, sorumluluğunu, etik sınırlarını ve yazarla çalışma çerçevesini öğren.",
    lead: "Profesyonel editörlük, metni kendi zevkine göre yeniden yazmak değil; eserin ne yapmak istediğini anlayıp bunu daha açık, güçlü ve tutarlı hâle getirecek seçenekler üretmektir.",
    promise: "Bu eğitim, editörün görev sınırını, ilk okuma disiplinini, yazarla iletişimi ve güven ilişkisini aynı profesyonel çerçevede kurmanı sağlar.",
    seoTitle: "Editörlüğe Başlama Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Editörün rolü, etik sınırlar, ilk okuma, yazarla çalışma ve profesyonel editörlük temelleri için adım adım eğitim.",
    benefits: [
      { title: "Rolünü doğru tanımlamak", text: "Editör, düzeltmen, yazar ve eleştirmen rollerini birbirinden ayır; hangi müdahalenin sana ait olduğunu bil." },
      { title: "İlk okumayı korumak", text: "Metni hemen düzeltmeye başlamadan önce eserin amacı, tonu ve temel sorunu hakkında tarafsız bir ilk izlenim oluştur." },
      { title: "Etik sınır kurmak", text: "Gizlilik, çıkar çatışması, telif ve yaratıcı karar sınırlarını profesyonel ilişkinin başında açıklaştır." },
      { title: "Yazarı güçlendirmek", text: "Çözümü editörün sesiyle dayatmak yerine, yazarın kendi kararını daha bilinçli verebilmesini sağlayacak seçenekler üret." },
    ],
    learningPath: [
      { title: "Editörlüğün amacını tanı", text: "Metni değiştirmek ile metnin amacına ulaşmasını kolaylaştırmak arasındaki farkı kur." },
      { title: "Görev kapsamını belirle", text: "Yapısal, dilsel, türsel veya dosya değerlendirme ihtiyacının hangisinin beklendiğini netleştir." },
      { title: "İlk okumayı yap", text: "Kaleme sarılmadan önce metni bir bütün olarak oku; ritim, vaat ve temel kırılma noktalarını kaydet." },
      { title: "Kanıt topla", text: "Yorumunu genel kanaat yerine metinden izlenebilen örneklerle destekle." },
      { title: "Seçenek üret", text: "Her tespit için yazarın değerlendirebileceği uygulanabilir bir yön göster." },
      { title: "Sınırı koru", text: "Son yaratıcı kararın yazarda olduğunu, editör görüşünün ise profesyonel bir öneri olduğunu açık tut." },
    ],
    concepts: [
      { title: "Amaç", text: "Bir editoryal karar, eserin hedeflediği okuma deneyimine hizmet etmiyorsa yalnızca kişisel tercihe dönüşür." },
      { title: "Kapsam", text: "Her editörlük işi aynı değildir. Yapısal sorun ile noktalama hatasını aynı öncelikle ele almak raporu dağıtır." },
      { title: "Kanıt", text: "‘Tempo düşük’ tek başına zayıf bir görüştür; hangi sahnede ve hangi tekrar nedeniyle düştüğünü göstermek profesyonel kanıttır." },
      { title: "Seçenek", text: "Editörün görevi tek doğruyu ilan etmek değil; sorunu görünür kılıp güçlü seçenekler sunmaktır." },
    ],
    example: {
      heading: "Bir editör ilk paragrafta ne yapar?",
      text: "Bir romanın açılışında karakterin kim olduğu, ne istediği ve sahnenin neden şimdi başladığı belirsizse editör hemen cümleleri yeniden yazmak yerine önce bu belirsizliğin eserin bilinçli tercihi mi yoksa yön kaybı mı olduğunu anlamaya çalışır.",
      questions: ["Bu açılış okura hangi vaadi veriyor?", "Belirsizlik bilinçli mi, yoksa bilgi eksikliği mi?", "Yazarın sesini bozmadan hangi seçenekler önerilebilir?"],
    },
    practice: {
      heading: "İlk editör notunu hazırla",
      text: "Kısa bir metin seç ve metni yeniden yazmadan yalnızca profesyonel gözlem üret.",
      steps: ["Metnin amacını tek cümleyle yaz.", "Bir güçlü yön ve bir geliştirme alanı belirle.", "Her tespiti metinden bir örnekle destekle.", "Yazara tek bir uygulanabilir seçenek öner."],
    },
    application: { heading: "Editörlük rolünü İlkOku akışıyla birleştir.", text: "İlkOku'nun editörlük yaklaşımını, iki bağımsız görüş modelini ve profesyonel rapor standardını inceleyerek çalışma çerçeveni sağlamlaştır.", href: "/editoryal-standartlar", label: "Editoryal standartları incele" },
  },
  {
    slug: "metin-degerlendirme",
    title: "Metin Değerlendirme",
    shortDescription: "Bir eserin güçlü ve geliştirmeye açık yönlerini ilk okumadan itibaren sistemli biçimde çözümle.",
    lead: "Metin değerlendirme, bir dosyayı beğenip beğenmemek değildir; eserin hedefi ile mevcut hâli arasındaki farkı görünür kılmaktır.",
    promise: "Bu eğitim, ilk okumadan sorun haritasına, önceliklendirmeden gerekçeli rapora kadar editörün değerlendirme disiplinini kurar.",
    seoTitle: "Metin Değerlendirme Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Eser analizi, sorun haritası, güçlü yönler, önceliklendirme ve gerekçeli editör raporu hazırlama eğitimi.",
    benefits: [
      { title: "Bütünü görmek", text: "Tek tek cümlelere takılmadan önce eserin ana vaadini, çatışmasını, ritmini ve okuma deneyimini değerlendir." },
      { title: "Sorun haritası çıkarmak", text: "Yapısal, anlatımsal ve dilsel sorunları birbirine karıştırmadan doğru başlık altında topla." },
      { title: "Öncelik vermek", text: "Her sorunu eşit ağırlıkta raporlamak yerine eserin bütününü en çok etkileyen üç ana konuyu öne al." },
      { title: "Gerekçeli görüş yazmak", text: "Tespit, metinden kanıt ve uygulanabilir öneriyi tek editör notunda birleştir." },
    ],
    learningPath: [
      { title: "Beklentiyi tanı", text: "Tür, hedef okur ve eserin kendi vaadini okumadan önce netleştir." },
      { title: "Kesintisiz ilk okuma yap", text: "İlk turda ayrıntılı düzeltme yerine okuma deneyimini ve kırılma noktalarını kaydet." },
      { title: "Sorunları sınıflandır", text: "Yapı, karakter, tempo, anlatıcı, dil ve tutarlılık başlıkları altında notlarını grupla." },
      { title: "Öncelikleri sırala", text: "En çok sonuç üretecek müdahaleleri öncele; küçük düzeltmelerin büyük sorunları gizlemesine izin verme." },
      { title: "Kanıtlandır", text: "Her önemli tespiti sahne, bölüm, tekrar veya örüntü üzerinden göster." },
      { title: "Raporlaştır", text: "Güçlü yön, ana problem, gerekçe ve öneri akışını okunabilir bir rapora dönüştür." },
    ],
    concepts: [
      { title: "Vaat", text: "Eser başlangıçta okura bir tür, ton ve beklenti sözü verir; değerlendirme bu sözün karşılanıp karşılanmadığını izler." },
      { title: "Örüntü", text: "Tek hata bazen tesadüftür; tekrar eden sorun ise editoryal müdahale gerektiren bir örüntüdür." },
      { title: "Öncelik", text: "Birinci turda karakter motivasyonu çözülmeden virgül düzeltmek raporun etkisini azaltır." },
      { title: "Denge", text: "İyi değerlendirme yalnız sorunları değil, korunması gereken güçlü seçimleri de görünür kılar." },
    ],
    example: {
      heading: "Bir dosyada ilk üç önceliği nasıl seçersin?",
      text: "Bir romanda tekrar eden anlatım sorunları, zayıf yan karakterler ve belirsiz ana çatışma aynı anda bulunabilir. Ana çatışma çözülmeden diğer iki başlığa ayrıntılı müdahale etmek düşük kaldıraçlı bir çalışma olur.",
      questions: ["Bu sorun eserin hangi bölümünü etkiliyor?", "Çözülürse başka kaç sorun kendiliğinden hafifler?", "Yazarın niyetiyle doğrudan ilişkili mi?"],
    },
    practice: {
      heading: "Bir sayfalık sorun haritası oluştur",
      text: "Kısa bir dosyayı okuyup notlarını beş ana kategoriye ayır.",
      steps: ["Eserin vaadini tek cümlede tanımla.", "Notlarını yapı, karakter, tempo, anlatıcı ve dil başlıklarına dağıt.", "En yüksek etkili üç sorunu seç.", "Her biri için kanıt ve tek öneri yaz."],
    },
    application: { heading: "Değerlendirme ölçütlerini standartlaştır.", text: "İlkOku editoryal standartlarını kullanarak kişisel beğeni ile profesyonel değerlendirmeyi birbirinden ayır.", href: "/editoryal-standartlar", label: "Rapor standardını gör" },
  },
  {
    slug: "yapisal-editorluk",
    title: "Yapısal Editörlük",
    shortDescription: "Kurgu, olay örgüsü, karakter, tempo, bölüm yapısı ve anlatı bütünlüğünü değerlendirmeyi öğren.",
    lead: "Yapısal editörlük, cümle seviyesinden önce eserin iskeletiyle çalışır: neyin neden olduğu, karakterin ne istediği ve okurun hangi sırayla neyi deneyimlediği.",
    promise: "Bu eğitim, büyük ölçekli anlatı sorunlarını teşhis etmeyi ve metni yeniden yazmadan yapısal seçenekler üretmeyi öğretir.",
    seoTitle: "Yapısal Editörlük Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Olay örgüsü, karakter, tempo, sahne ve bölüm yapısını değerlendirmek için yapısal editörlük eğitimi.",
    benefits: [
      { title: "Omurgayı görmek", text: "Ana çatışmayı, dönüm noktalarını ve sonuç hattını tek bakışta çıkarabilecek bir yapı haritası oluştur." },
      { title: "Karakter nedenselliğini ölçmek", text: "Olayların karakter kararlarından mı yoksa yazarın zorlamasından mı doğduğunu ayırt et." },
      { title: "Tempo sorununu teşhis etmek", text: "Yavaşlık veya hız hissini sahne işlevi, tekrar ve bilgi dağılımı üzerinden açıkla." },
      { title: "Revizyon sırası önermek", text: "Yazara tek seferde her şeyi değiştirtmek yerine yüksek etkili revizyon hattı kur." },
    ],
    learningPath: [
      { title: "Ana soruyu bul", text: "Eserin okuru taşıdığı temel dramatik veya düşünsel soruyu tanımla." },
      { title: "Dönüm noktalarını çıkar", text: "Başlangıç, yön değişimi, kriz ve sonuç arasındaki nedenselliği haritala." },
      { title: "Karakter kararlarını izle", text: "Büyük olayların karakter motivasyonu ve seçimleriyle bağını kontrol et." },
      { title: "Sahne işlevini test et", text: "Her sahnenin çatışma, bilgi, karakter veya yön değişimi açısından ne yaptığını sor." },
      { title: "Tempo eğrisini oku", text: "Benzer yoğunluktaki bölümlerin yığılmasını ve gereksiz tekrarları belirle." },
      { title: "Revizyon planı kur", text: "En büyük yapısal düğümden başlayarak uygulanabilir bir yeniden çalışma sırası öner." },
    ],
    concepts: [
      { title: "Nedensellik", text: "Güçlü olay örgüsünde olaylar yalnızca ardışık değil, birbirinin sonucu veya nedeni olarak hissedilir." },
      { title: "Sahne işlevi", text: "İşlevsiz sahne çoğu zaman kötü yazılmış değil; hikâyenin yönünü değiştirmeyen sahnedir." },
      { title: "Tempo", text: "Tempo yalnız hız değildir; beklenti, bilgi, gerilim ve dinlenme anlarının dağılımıdır." },
      { title: "Revizyon kaldıracı", text: "Doğru yapısal müdahale aynı anda birkaç ikincil problemi azaltabilir." },
    ],
    example: {
      heading: "Bir orta bölüm neden çöker?",
      text: "Karakterin hedefi ilk bölümde kurulmuş ama orta bölümde yeni engel, karar veya sonuç üretmiyorsa olaylar devam etse bile anlatı ilerlemiyor hissi doğar. Editör burada daha fazla aksiyon istemek yerine nedensellik zincirini inceler.",
      questions: ["Bu bölümde karakter hangi yeni kararı veriyor?", "Bu karar bir sonraki bölümü nasıl zorunlu kılıyor?", "Aynı işlevi gören iki sahne var mı?"],
    },
    practice: {
      heading: "Üç bölümlük yapı haritası çıkar",
      text: "Bir eserin üç ardışık bölümünü olay yerine işlev üzerinden değerlendir.",
      steps: ["Her bölümün ana işlevini tek fiille yaz.", "Karakter kararını ve sonucunu işaretle.", "Tekrar eden işlevleri belirle.", "Bir bölümün kaldırılması veya birleştirilmesi hâlinde ne değişeceğini test et."],
    },
    application: { heading: "Yapısal bakışını gerçek editörlük standardına bağla.", text: "İlkOku'nun gerekçeli rapor yaklaşımını kullanarak yapısal tespitlerini kanıt ve seçeneklerle ifade et.", href: "/editoryal-standartlar", label: "Standartları incele" },
  },
  {
    slug: "dil-ve-anlatim-editorlugu",
    title: "Dil ve Anlatım Editörlüğü",
    shortDescription: "Cümle, akıcılık, tekrar, anlatım, ton ve üslup sorunlarını metnin sesini koruyarak ele al.",
    lead: "Dil editörlüğü metni editörün diline çevirmek değildir; yazarın sesini korurken okurun cümleyi daha açık, akıcı ve tutarlı deneyimlemesini sağlamaktır.",
    promise: "Bu eğitim, dil müdahalesinde doğruluk, akıcılık ve yazar sesi arasındaki dengeyi kurmanı sağlar.",
    seoTitle: "Dil ve Anlatım Editörlüğü Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Cümle yapısı, akıcılık, tekrar, ton, üslup ve yazar sesini koruma odaklı dil editörlüğü eğitimi.",
    benefits: [
      { title: "Yazar sesini korumak", text: "Kişisel üslup ile gerçek anlatım sorununu birbirinden ayır; gereksiz normalleştirmeden kaçın." },
      { title: "Cümle yükünü görmek", text: "Anlamı geciktiren, özneyi kaybettiren veya aynı fikri tekrar eden yapıları teşhis et." },
      { title: "Ton tutarlılığını izlemek", text: "Metnin resmî, samimi, ironik veya şiirsel tonunda istemsiz kırılmaları fark et." },
      { title: "Müdahaleyi gerekçelendirmek", text: "Her değişikliği ‘daha güzel’ yerine açıklık, ritim, doğruluk veya tutarlılık üzerinden açıkla." },
    ],
    learningPath: [
      { title: "Sesi tanı", text: "Metnin bilinçli kelime, ritim ve cümle tercihlerini not et." },
      { title: "Sorunu ayır", text: "Üslup tercihi, dil bilgisi hatası, anlatım bozukluğu ve gereksiz tekrar arasında ayrım yap." },
      { title: "Cümleyi test et", text: "Anlam, vurgu, ritim ve özne-fiil ilişkisini ayrı ayrı kontrol et." },
      { title: "Paragraf akışını izle", text: "Cümlelerin aynı düşünceyi ilerletip ilerletmediğini ve geçişlerin netliğini değerlendir." },
      { title: "Ton kırılmasını bul", text: "Metnin sesinden istemsiz ayrılan kelime veya yapıların bağlamını incele." },
      { title: "En küçük etkili müdahaleyi seç", text: "Sorunu çözen ama yazar sesini en az değiştiren seçeneği öncele." },
    ],
    concepts: [
      { title: "Ses", text: "Yazar sesi kusursuz gramerden daha geniştir; kelime seçimi, ritim, tekrar ve bilinçli sapmaların toplamıdır." },
      { title: "Açıklık", text: "Açıklık her cümleyi sadeleştirmek değil, okurun anlam ilişkisini kaybetmemesidir." },
      { title: "Ritim", text: "Uzun ve kısa cümlelerin dağılımı, vurgu ve duraklar metnin okuma temposunu belirler." },
      { title: "Ekonomi", text: "Gereksiz kelimeyi azaltmak, yalnız kısaltmak için değil anlamı daha görünür yapmak için yapılır." },
    ],
    example: {
      heading: "Doğru ama ağır bir cümleye nasıl yaklaşılır?",
      text: "Bir cümle dil bilgisel olarak doğru olabilir ancak üç ayrı düşünceyi, iki zaman atlamasını ve belirsiz bir özneyi aynı anda taşıyabilir. Editörün amacı cümleyi kendi zevkine göre kısaltmak değil, anlam ilişkisini görünür kılmaktır.",
      questions: ["Cümlenin ana yüklemi ve öznesi açık mı?", "Birden fazla düşünce aynı cümlede yarışıyor mu?", "Önerilen değişiklik yazarın ritmini gereksiz yere düzeltiyor mu?"],
    },
    practice: {
      heading: "Üç seviyeli dil müdahalesi yap",
      text: "Kısa bir paragrafta yalnız gerçekten gerekliyse müdahale et.",
      steps: ["Dil bilgisi ve anlam hatalarını işaretle.", "Akıcılığı bozan tekrarları ayrı renkte belirle.", "Üslup tercihi olan cümlelere dokunmadan önce gerekçeni yaz.", "Her değişiklik için neden gerekli olduğunu tek kelimeyle etiketle: doğruluk, açıklık, ritim veya tutarlılık."],
    },
    application: { heading: "Dil müdahalesini profesyonel sınıra taşı.", text: "Editoryal standartlarda yazarın yaratıcı kararının nasıl korunduğunu incele ve değişiklik gerekçelerini bu çerçeveye bağla.", href: "/editoryal-standartlar", label: "Yaratıcı karar standardını gör" },
  },
  {
    slug: "tur-editorlugu",
    title: "Tür Editörlüğü",
    shortDescription: "Farklı eser türlerinin editöryal ihtiyaçlarını kendi anlatı mantığı ve okur beklentisiyle değerlendir.",
    lead: "Aynı editoryal ölçü her türe uygulanamaz. Polisiye ipucu adaletine, fantastik dünya tutarlılığına, çocuk kitabı yaş uygunluğuna farklı sorularla yaklaşır.",
    promise: "Bu eğitim, tür beklentisini kalıp gibi dayatmadan eserin kendi tür sözünü nasıl değerlendireceğini öğretir.",
    seoTitle: "Tür Editörlüğü Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Polisiye, fantastik, çocuk, akademik ve diğer türlerde editoryal beklentileri değerlendirme eğitimi.",
    benefits: [
      { title: "Tür sözünü okumak", text: "Eserin okura hangi tür deneyimini vaat ettiğini ve bu vaadin hangi kurallara dayandığını belirle." },
      { title: "Beklenti ile klişeyi ayırmak", text: "Türün işlevsel sözleşmesini korurken eseri standart bir kalıba zorlamamayı öğren." },
      { title: "Tür risklerini tanımak", text: "Polisiyede haksız bilgi saklama, fantastikte kural ihlali, çocukta yaş uyumsuzluğu gibi özgül riskleri fark et." },
      { title: "Uzmanlık sınırı koymak", text: "Bilmediğin türde kesin hüküm vermek yerine araştırma ve ikinci görüş ihtiyacını tanı." },
    ],
    learningPath: [
      { title: "Türü ve alt türü belirle", text: "Eserin kendini nasıl konumlandırdığını ve hedef okur beklentisini tanı." },
      { title: "Tür sözleşmesini çıkar", text: "Bu türün okura hangi temel deneyimi vaat ettiğini maddeler hâlinde yaz." },
      { title: "Eserin özgün sapmasını gör", text: "Beklentiden bilinçli ayrılan seçim ile yanlış kurulmuş yapıyı birbirinden ayır." },
      { title: "Özgül riskleri tara", text: "Türün en sık kırıldığı bilgi, yapı, ton veya güven sorunlarını kontrol et." },
      { title: "Karşılaştırmayı dikkatli kullan", text: "Benzer eserleri ölçü değil, bağlam ve olasılık kaynağı olarak kullan." },
      { title: "Tür raporunu yaz", text: "Genel editoryal tespitleri türün okur deneyimiyle ilişkilendir." },
    ],
    concepts: [
      { title: "Tür sözleşmesi", text: "Okur bir tür seçerken belli bir deneyim bekler; editör bu beklentinin nasıl kurulduğunu izler." },
      { title: "İpucu adaleti", text: "Polisiyede çözüm, okurdan haksız biçimde saklanan kritik bilgiye dayanmamalıdır." },
      { title: "Dünya kuralı", text: "Fantastikte kurallar gerçek dünyaya benzemek zorunda değildir ama kendi içinde tutarlı olmalıdır." },
      { title: "Hedef okur", text: "Çocuk, genç yetişkin veya uzman okur için dil, içerik ve bağlam beklentisi farklılaşır." },
    ],
    example: {
      heading: "Fantastik bir kural ihlali nasıl değerlendirilir?",
      text: "Bir büyü sistemi ilk bölümlerde ağır bedel gerektirirken finalde bedelsiz çalışıyorsa sorun ‘gerçekçi olmaması’ değil, eserin kendi kurduğu kuralı gerekçesiz bozmasıdır.",
      questions: ["Kural daha önce nasıl kurulmuştu?", "İhlal bilinçli bir sürpriz mi, yoksa kolay çözüm mü?", "Okura yeni bilgi zamanında verildi mi?"],
    },
    practice: {
      heading: "Bir tür sözleşmesi kartı hazırla",
      text: "Seçtiğin tek bir tür için editör kontrol kartı oluştur.",
      steps: ["Türün okura verdiği üç ana sözü yaz.", "Bu türde sık görülen üç editoryal riski belirle.", "Bir özgün sapmanın ne zaman işe yarayacağını not et.", "Kontrol kartını bir örnek eser üzerinde test et."],
    },
    application: { heading: "Tür bilgisini İlkOku eser çeşitliliğiyle sınayabilirsin.", text: "Farklı türlerdeki eserleri karşılaştırarak aynı editoryal sorunun tür bağlamında nasıl değiştiğini gözlemle.", href: "/eserler", label: "Eserleri incele" },
  },
  {
    slug: "editor-notu-ve-geri-bildirim",
    title: "Editör Notu ve Geri Bildirim",
    shortDescription: "Tespiti gerekçeye, gerekçeyi yazara gerçekten yol gösterecek uygulanabilir geri bildirime dönüştür.",
    lead: "İyi editör notu yalnızca neyin çalışmadığını söylemez; sorunun neden önemli olduğunu ve yazarın hangi seçenekleri değerlendirebileceğini gösterir.",
    promise: "Bu eğitim, sertlik ile açıklığı, ayrıntı ile önceliği ve eleştiri ile uygulanabilir öneriyi dengeli bir editör dilinde birleştirir.",
    seoTitle: "Editör Notu ve Geri Bildirim Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Gerekçeli editör notu, uygulanabilir geri bildirim, profesyonel ton ve rapor yazımı eğitimi.",
    benefits: [
      { title: "Tespiti netleştirmek", text: "Belirsiz ‘olmuyor’ yorumlarını gözlenebilir bir soruna dönüştür." },
      { title: "Gerekçe kurmak", text: "Sorunun okuma deneyimini, karakteri, yapıyı veya anlamı nasıl etkilediğini açıkla." },
      { title: "Seçenek sunmak", text: "Yazara tek çözüm emretmek yerine farklı revizyon yolları gösterebil." },
      { title: "Profesyonel ton korumak", text: "Metni eleştirirken yazarı yargılamayan, açık ve saygılı bir dil oluştur." },
    ],
    learningPath: [
      { title: "Gözlemi yaz", text: "Önce yalnızca metinde ne gördüğünü, yorum eklemeden tanımla." },
      { title: "Etkisini açıkla", text: "Bu seçimin okur veya yapı üzerindeki sonucunu gerekçelendir." },
      { title: "Kanıt göster", text: "Tespitini sahne, cümle, tekrar veya bölüm örneğiyle bağla." },
      { title: "Öncelik belirt", text: "Notun kritik mi, önemli mi, yoksa isteğe bağlı mı olduğunu bağlamla göster." },
      { title: "Seçenek üret", text: "Yazarın değerlendirebileceği bir veya iki uygulanabilir yön sun." },
      { title: "Ton kontrolü yap", text: "Notun metni mi değerlendirdiğini, yazarı mı yargıladığını son kez kontrol et." },
    ],
    concepts: [
      { title: "Gözlem", text: "‘Karakter zayıf’ yorumdur; ‘üç kritik sahnede karar vermek yerine olayları takip ediyor’ gözlemdir." },
      { title: "Etki", text: "Bir tespit ancak okuma deneyimine veya eserin amacına etkisi açıklandığında anlamlı hâle gelir." },
      { title: "Öneri", text: "Öneri, zorunlu yeniden yazım değil; sorunu çözebilecek olası bir yön göstermektir." },
      { title: "Ton", text: "Profesyonel açıklık, yumuşatılmış belirsizlik de saldırgan kesinlik de değildir." },
    ],
    example: {
      heading: "‘Bu karakter inandırıcı değil’ notunu dönüştür",
      text: "Genel yargı yerine, karakterin iki bölüm boyunca aynı hedefi savunup kritik sahnede gerekçesiz biçimde tersini yapmasını işaret etmek ve bunun okur güvenini neden kırdığını açıklamak daha güçlü bir editör notudur.",
      questions: ["Notum gözlenebilir bir davranışa dayanıyor mu?", "Etkisini açıklıyor muyum?", "Yazarın değerlendirebileceği bir yön sunuyor muyum?"],
    },
    practice: {
      heading: "Dört cümlelik profesyonel not yaz",
      text: "Bir sorunu gözlem, etki, kanıt ve seçenek sırasıyla ifade et.",
      steps: ["Ne gördüğünü bir cümlede yaz.", "Bunun okuma deneyimine etkisini açıkla.", "Metinden tek bir kanıt ekle.", "Bir revizyon seçeneği öner ve yaratıcı kararı yazara bırak."],
    },
    application: { heading: "Notlarını İlkOku rapor standardıyla hizala.", text: "İki bağımsız editör modelinde raporun hangi nitelikleri taşıması gerektiğini editoryal standartlar üzerinden kontrol et.", href: "/editoryal-standartlar", label: "Rapor standardına geç" },
  },
  {
    slug: "yazarla-calismak",
    title: "Yazarla Çalışmak",
    shortDescription: "Revizyon, fikir ayrılığı, iletişim ve müdahale sınırlarını profesyonel bir çalışma ilişkisine dönüştür.",
    lead: "Editör-yazar ilişkisi, kimin haklı olduğunu kanıtlama alanı değil; eserin daha bilinçli kararlarla gelişmesini sağlayan profesyonel bir ortak çalışma sürecidir.",
    promise: "Bu eğitim, geri bildirim verirken güveni korumayı, fikir ayrılığını yönetmeyi ve yaratıcı karar sınırını açık tutmayı öğretir.",
    seoTitle: "Yazarla Çalışmak Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Editör-yazar iletişimi, revizyon yönetimi, fikir ayrılığı, sınırlar ve profesyonel çalışma ilişkisi eğitimi.",
    benefits: [
      { title: "Beklentiyi baştan kurmak", text: "Teslim kapsamı, rapor biçimi, iletişim kanalı ve revizyon döngüsünü çalışma başlamadan netleştir." },
      { title: "Savunmayı azaltmak", text: "Yargı yerine metin ve etki üzerinden konuşarak geri bildirimin duyulmasını kolaylaştır." },
      { title: "Fikir ayrılığını yönetmek", text: "Yazar öneriyi reddettiğinde kişisel çatışma üretmeden profesyonel gerekçeni kayda geçir." },
      { title: "Yaratıcı kararı korumak", text: "Editörün otoritesini metnin sahibi olmakla karıştırmadan yazarın son karar hakkını açık tut." },
    ],
    learningPath: [
      { title: "Çalışma çerçevesini kur", text: "Kapsam, teslim, revizyon ve iletişim beklentisini başlangıçta yazılı hâle getir." },
      { title: "Yazarın niyetini dinle", text: "Metnin ne olmaya çalıştığını yazarın ifadesiyle de anlamaya çalış." },
      { title: "Raporu önceliklendir", text: "Yazarı yüzlerce eşit ağırlıklı notla boğmak yerine ana revizyon yönünü belirle." },
      { title: "Soruları kullan", text: "Bazı durumlarda emir vermek yerine doğru soru, yazarın kendi çözümünü bulmasını sağlar." },
      { title: "İtirazı profesyonelce ele al", text: "Anlaşmazlığı kişilik veya yetkinlik tartışmasına çevirmeden metin üzerinden tut." },
      { title: "Kararı kayda geçir", text: "Kabul edilen, ertelenen veya reddedilen önemli editoryal kararları izlenebilir bırak." },
    ],
    concepts: [
      { title: "Niyet", text: "Editör metni kendi istediği türe çevirmeden önce yazarın hedeflediği deneyimi anlamalıdır." },
      { title: "Yetki", text: "Editör önerir, gerekçelendirir ve uyarır; yaratıcı sahiplik yazarın elindedir." },
      { title: "Sınır", text: "Profesyonel ilişki, kişisel yakınlık veya sertlikten bağımsız olarak kapsam ve etik çerçeveyle korunur." },
      { title: "İzlenebilirlik", text: "Önemli kararların kaydı, aynı tartışmanın tekrarını ve yanlış anlaşılmayı azaltır." },
    ],
    example: {
      heading: "Yazar ana öneriyi reddederse ne olur?",
      text: "Editör yapısal bir sorunun neden önemli olduğunu kanıtlarıyla açıklar; yazar bilinçli biçimde farklı bir yaratıcı seçim yaparsa editör bu kararı kabul eder ve raporda riskin ne olduğunu açık bırakır.",
      questions: ["Önerimin gerekçesi yeterince açık mı?", "Bu konu yaratıcı tercih mi, teknik hata mı?", "Yazar farklı kararı bilinçli mi veriyor?"],
    },
    practice: {
      heading: "Zor bir geri bildirim konuşmasını tasarla",
      text: "Yazarın reddedebileceği kritik bir öneriyi dört aşamada ifade et.",
      steps: ["Önce korunması gereken güçlü yönü belirt.", "Sorunu kişiye değil metne bağla.", "Etkisini ve kanıtını açıkla.", "Bir seçenek sun ve son kararı açıkça yazara bırak."],
    },
    application: { heading: "Yaratıcı karar sınırını İlkOku modelinde gör.", text: "İlkOku'nun profesyonel inceleme yaklaşımında editör görüşü ile yazarın son kararı arasındaki sınırı incele.", href: "/editorler-icin", label: "Editörlük akışına dön" },
  },
  {
    slug: "yayincilik-ve-profesyonel-editorluk",
    title: "Yayıncılık ve Profesyonel Editörlük",
    shortDescription: "Dosya değerlendirmeden yayıma hazırlığa uzanan profesyonel editörlük ve yayıncılık sürecini tanı.",
    lead: "Profesyonel editör yalnız metni değil, metnin hangi aşamada olduğunu ve bir sonraki aşamada hangi karara ihtiyaç duyduğunu da bilmelidir.",
    promise: "Bu eğitim, dosya değerlendirme, editoryal süreç, yayıma hazırlık ve profesyonel çalışma disiplinini tek akışta anlamanı sağlar.",
    seoTitle: "Yayıncılık ve Profesyonel Editörlük Eğitimi | İlkOku Editörlük Okulu",
    seoDescription: "Dosya değerlendirme, editoryal süreç, yayıma hazırlık, teslim ve profesyonel editör çalışma disiplini eğitimi.",
    benefits: [
      { title: "Süreç aşamasını tanımak", text: "Dosyanın geliştirme, dil editörlüğü, son okuma veya yayıma hazırlık aşamasında olup olmadığını ayırt et." },
      { title: "Dosya değerlendirme yazmak", text: "Bir eserin potansiyelini, risklerini, hedef okurunu ve geliştirme ihtiyacını kısa profesyonel raporda özetle." },
      { title: "Teslim disiplini kurmak", text: "Versiyon, dosya adı, tarih, kapsam ve revizyon notlarını izlenebilir biçimde yönet." },
      { title: "Profesyonel sınırları bilmek", text: "Editörlük, hukuki danışmanlık, yayımlama garantisi ve temsil hizmeti arasındaki farkı açık tut." },
    ],
    learningPath: [
      { title: "Dosya aşamasını belirle", text: "Metnin hangi editoryal hizmete gerçekten ihtiyaç duyduğunu teşhis et." },
      { title: "Kısa değerlendirme yap", text: "Eserin güçlü yönlerini, ana riskini, hedef okurunu ve geliştirme ihtiyacını özetle." },
      { title: "Kapsamı sözleştir", text: "Hangi işin yapılacağını, neyin kapsam dışında olduğunu ve teslim biçimini netleştir." },
      { title: "Versiyon yönet", text: "Üzerinde çalışılan sürümü ve sonraki revizyonları karıştırmayacak kayıt sistemi kullan." },
      { title: "Teslimi yapılandır", text: "Ana rapor, satır içi notlar ve öncelikli aksiyonları okunabilir bir paket hâline getir." },
      { title: "Sonraki aşamayı tanımla", text: "Dosyanın yeni revizyon, son okuma, tasarım veya yayınevi değerlendirmesine hazır olup olmadığını açıkla." },
    ],
    concepts: [
      { title: "Aşama", text: "Yapısal sorunları duran dosyada yalnız son okuma yapmak yanlış hizmet eşleşmesidir." },
      { title: "Kapsam", text: "Profesyonel editörlükte işin sınırı açık değilse kalite ve teslim beklentisi kolayca bozulur." },
      { title: "Versiyon", text: "Doğru raporun yanlış sürüme uygulanması ciddi üretim hatasıdır; sürüm kaydı temel disiplindir." },
      { title: "Beklenti", text: "Editör metni geliştirir; yayımlanmayı, satış başarısını veya hukuki sonucu garanti etmez." },
    ],
    example: {
      heading: "Bir dosya yayıma hazır mı?",
      text: "Dil temizliği iyi görünen bir romanın ana karakter motivasyonu finalde hâlâ kırılıyorsa dosya son okumaya değil yapısal revizyona ihtiyaç duyar. Profesyonel editör, aşamayı yanlış adlandırıp sahte ilerleme üretmez.",
      questions: ["Dosyanın en büyük riski hangi seviyede?", "Bu aşamada yapılacak çalışma sonraki adımı gerçekten mümkün kılıyor mu?", "Teslim kapsamı ve sürüm net mi?"],
    },
    practice: {
      heading: "Bir profesyonel teslim paketi tasarla",
      text: "Örnek bir dosya için editörlük sürecinin başından sonuna mini teslim standardı oluştur.",
      steps: ["Dosyanın mevcut aşamasını ve ihtiyaç duyduğu hizmeti yaz.", "Kapsam içi ve kapsam dışı işleri ayır.", "Versiyon adlandırma kuralı belirle.", "Teslimde ana rapor, öncelik listesi ve sonraki adımı tanımla."],
    },
    application: { heading: "Profesyonel süreci İlkOku ekosisteminde konumlandır.", text: "Editörlerin eserlerle nasıl buluştuğunu ve profesyonel incelemenin platformdaki yerini ana editör sayfasından yeniden değerlendir.", href: "/editorler-icin", label: "Editörler İçin sayfasına dön" },
  },
] as const satisfies readonly EditorEducationCategory[];

export function getEditorEducationCategory(slug: string) {
  return EDITOR_EDUCATION_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function editorEducationPublicPath(category: Pick<EditorEducationCategory, "slug">) {
  return `/editorler-icin/egitim/${category.slug}`;
}
