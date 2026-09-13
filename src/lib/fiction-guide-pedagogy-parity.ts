export type PedagogyItem = { title: string; text: string };

export type FictionPedagogyParity = {
  ideaHeading: string;
  ideaIntro: string;
  ideaItems: PedagogyItem[];
  contrastHeading: string;
  contrastItems: PedagogyItem[];
  routeHeading: string;
  routeIntro: string;
  routeItems: PedagogyItem[];
  workspaceHeading: string;
  workspaceIntro: string;
  workspaceItems: PedagogyItem[];
  draftHeading: string;
  draftIntro: string;
  draftItems: PedagogyItem[];
  finalHeading: string;
  finalIntro: string;
  finalItems: PedagogyItem[];
  outputsHeading: string;
  outputsIntro: string;
  outputItems: PedagogyItem[];
};

type Seed = {
  idea: [string, string, string];
  contrast: [PedagogyItem, PedagogyItem];
  plan: string;
  scene: string;
  draft: string;
  revise: string;
  finish: string;
  workspace: [string, string, string];
  draftAvoid: string;
  draftFinish: string;
  finalFormat: string;
  finalReader: string;
  outputCore: string;
  outputPlan: string;
  outputScene: string;
  outputRevision: string;
};

const seeds: Record<string, Seed> = {
  fantastik: {
    idea: [
      "Gündelik bir ihtiyacı olağanüstü bir kuralla değiştir: enerji, ulaşım, miras, hafıza veya hukuk büyü yüzünden nasıl farklı işliyor?",
      "Bir güce bedel ekle; güç ne kadar çekiciyse karakterin ödeyeceği kişisel, toplumsal veya fiziksel maliyet de o kadar görünür olsun.",
      "Harita, mit veya yaratıkla değil bir sorunla başla: hangi dünya kuralı bir karakteri bugün karar vermeye zorluyor?",
    ],
    contrast: [
      { title: "Fantastik ≠ yalnız dekor", text: "Ejderha, krallık veya büyü tek başına türün motoru değildir; olağanüstü kural olay örgüsünü ve seçimi değiştirmelidir." },
      { title: "Fantastik ≠ mitoloji özeti", text: "Mitlerden yararlanabilirsin; fakat eser kendi dünya kurallarını, karakter hedefini ve bedelini kurmalıdır." },
    ],
    plan: "Dünya farkı, büyü kuralı, kaynak dağılımı ve karakter bedelini aynı plan sayfasında birbirine bağla.",
    scene: "Her sahnede ya dünya hakkında işe yarayan yeni bilgi ortaya çıksın ya da mevcut kural karakterin seçimini zorlaştırsın.",
    draft: "İlk taslakta ansiklopedi yazma; yalnız sahnenin anlaması gereken terim ve kuralları zamanında ver.",
    revise: "Revizyonda özellikle güç sınırlarını, yolculuk sürelerini, özel adların tutarlılığını ve bedelin gerçekten sonuç üretip üretmediğini test et.",
    finish: "Finalde yalnız düşman veya görev değil, dünya içindeki güç-bilgi dengesi ve karakterin inancı da değişmiş olmalı.",
    workspace: [
      "Dünya sözlüğü: yer, unvan, topluluk ve özel kavramların tek satırlık açıklamalarını tut.",
      "Kural defteri: büyünün ne yapabildiğini, yapamadığını ve hangi bedeli doğurduğunu sabitle.",
      "Süreklilik çizelgesi: rota, tarih, nesne ve karakter bilgisini sahneler arasında takip et.",
    ],
    draftAvoid: "İlk bölümde bütün tarihi, haritayı ve mitolojiyi açıklama; okurun ihtiyacı doğmadan bilgi yükleme.",
    draftFinish: "Taslağı bitirmek için önce ana yolculuğu ve final seçimini tamamla; terim cilası ve dünya ayrıntısını ikinci turda düzelt.",
    finalFormat: "Özel ad, harita, bölüm başlığı, italik kullanım ve terim yazımlarının eser boyunca tek biçimde kaldığını kontrol et.",
    finalReader: "İlk kez okuyan biri, açıklama dosyasına ihtiyaç duymadan güç kuralını ve final seçiminin bedelini anlayabilmeli.",
    outputCore: "Dünya farkı + karakter hedefi + bedeli tek cümlede birleştir.",
    outputPlan: "6 eşiklik olay omurgasını ve her eşikte açılacak dünya bilgisini yaz.",
    outputScene: "Güç sisteminin işlevini ve maliyetini aynı anda gösteren bir sahne yaz.",
    outputRevision: "Finalde kolay çözüm üreten bir kural esnemesi varsa işaretle ve düzelt.",
  },
  "bilim-kurgu": {
    idea: [
      "Bugünkü bir bilimsel sınırı seç ve tek bir varsayımla ileri taşı: mümkün olursa ilk değil ikinci ve üçüncü sonuç ne olur?",
      "Yeni teknolojiyi cihaz olarak değil kurum ve gündelik hayat değişikliği olarak düşün: kim erişir, kim dışarıda kalır?",
      "Bilimin cevapsız bıraktığı bir alanı karakter kararıyla birleştir; belirsizlik olay örgüsünde somut risk üretmeli.",
    ],
    contrast: [
      { title: "Bilim kurgu ≠ teknoloji vitrini", text: "Yeni cihaz veya uzay mekânı, insan hayatında sonuç üretmiyorsa yalnız dekor olarak kalır." },
      { title: "Bilim kurgu ≠ gelecek tahmini", text: "Amaç geleceği doğru bilmek değil, seçtiğin varsayımın kendi kuralları içinde tutarlı sonuçlarını araştırmaktır." },
    ],
    plan: "Bilinen gerçek, makul çıkarım, kurmaca sıçrama ve etik sonucu ayrı sütunlarda planla.",
    scene: "Her teknik bilgi bir karar, başarısızlık, risk veya yeni soru doğursun; bilgi kendi başına ders paragrafı olmasın.",
    draft: "İlk taslakta araştırmayı durdurmadan yazabilmek için doğrulanacak noktaları işaretle ve sahnenin dramatik akışını tamamla.",
    revise: "Revizyonda neden-sonuç zincirini geriye doğru test et; final çözümü daha önce kurulmamış bir teknolojiye yaslanmasın.",
    finish: "Final, varsayımın insan, kurum veya etik düzeyde açtığı yeni gerçekliği göstermeli; yalnız keşfin cevabını vermek yetmez.",
    workspace: [
      "Kaynak dosyası: gerçek bilgi, çıkarım ve kurmaca icadı birbirinden ayır.",
      "Sistem diyagramı: teknoloji veya keşfin enerji, iletişim, ekonomi, beden ve kurumlar üzerindeki etkisini izle.",
      "Tutarlılık matrisi: bir kural değiştiğinde etkilenen sahneleri işaretle.",
    ],
    draftAvoid: "Araştırma uğruna taslağı sonsuza kadar erteleme ve açıklama yükünü karakter diyaloğuna yığma.",
    draftFinish: "Önce varsayımın karakteri geri dönülmez bir seçime götürdüğü tam hikâyeyi bitir; teknik ayrıntıları doğrulama turunda güçlendir.",
    finalFormat: "Terim, kurum, cihaz adları ve ölçü birimlerinin yazımını tekleştir; çelişen sürümleri temizle.",
    finalReader: "Okur hangi kısmın bugünkü bilgiye, hangi kısmın eser içi varsayıma dayandığını dipnota ihtiyaç duymadan sezebilmelidir.",
    outputCore: "Varsayım + sınır + karakter hedefi + etik bedeli tek cümlede yaz.",
    outputPlan: "Varsayımın en az üç ardışık sonucunu ve bunların karaktere indiği noktayı çıkar.",
    outputScene: "Teknik bilgiyi açıklamadan, bir deney veya arıza sonucu üzerinden gösteren sahne yaz.",
    outputRevision: "Finalde daha önce kurulmamış bir bilimsel kolaylık varsa onu kaldır veya erken kur.",
  },
  distopya: {
    idea: [
      "Bugün savunulabilir bir toplumsal vaadi seç: güvenlik, sağlık, adalet veya verimlilik tek ölçüte indirgenirse ne bozulur?",
      "Bir baskı aracını günlük kolaylıkla eşleştir; insanların sisteme yalnız korkudan değil faydadan da bağlanmasını düşün.",
      "Kahramanı sistemin dışından değil içinden başlat: hangi ayrıcalık onun görmediği bir başkasının bedeline dayanıyor?",
    ],
    contrast: [
      { title: "Distopya ≠ karanlık gelecek", text: "Karanlık atmosfer yetmez; baskıyı üreten kurum, teşvik, ölçüm ve normalleşme mekanizması gerekir." },
      { title: "Distopya ≠ tek kötü lider", text: "Düzen yalnız bir zalimin iradesiyle ayakta duruyorsa toplumsal sistem değil kişisel kötülük hikâyesine dönüşür." },
    ],
    plan: "Kurucu kriz, resmi vaat, ölçüm kuralı, ödül, ceza, ayrıcalık ve görünmeyen bedeli tek sistem şemasında kur.",
    scene: "Baskıyı nutukla değil form, sıra, puan, izin, teşvik, komşu davranışı veya küçük bir kayıp üzerinden sahnele.",
    draft: "İlk taslakta kahramanı hemen isyancı yapma; sistemden faydalandığı ve onu savunduğu anlara da yer ver.",
    revise: "Revizyonda meşruiyet, fayda, kurum zinciri ve direnişin gerçek bedelini kontrol et.",
    finish: "Finalde kahramanın seçimi yalnız kişisel kaçış değil, sistemle kurduğu suç ortaklığı veya sorumluluk ilişkisinde değişim yaratmalı.",
    workspace: [
      "Sistem kural defteri: puan, izin, kota, yasak ve istisnaları yaz.",
      "Ayrıcalık-bedel matrisi: bir grubun kazancını başka bir grubun kaybıyla eşleştir.",
      "Propaganda sözlüğü: kurumun kullandığı olumlu kelimeler ile gerçek sonuçlarını yan yana tut.",
    ],
    draftAvoid: "Her görevlini kötü, her yurttaşı korkmuş yazma; sistemin neden sürdüğünü gösteren gerçek fayda ve alışkanlıkları unutma.",
    draftFinish: "Taslağı, kahramanın düzenle ilişkisinin geri dönülmez biçimde değiştiği seçime kadar tamamla.",
    finalFormat: "Kurum, puan, yasa ve propaganda terimlerinin eser boyunca aynı anlamda kullanıldığını kontrol et.",
    finalReader: "Okur sistemin neden kurulduğunu, kime yarar sağladığını ve bedeli kimin ödediğini açıkça anlayabilmeli.",
    outputCore: "Vaat + kontrol aracı + ayrıcalık + görünmeyen bedel + karakter bağını tek cümlede yaz.",
    outputPlan: "Normalleşmiş düzen ile ana seçim arasındaki 6 kırılmayı çıkar.",
    outputScene: "Baskıyı açıklamadan, sıradan bir kurum işlemi üzerinden gösteren sahne yaz.",
    outputRevision: "Sistemi yalnız kötülükle ayakta tutan sahneleri işaretle; fayda, teşvik veya alışkanlık ekle.",
  },
  utopya: {
    idea: [
      "Bugün çözülemeyen bir ortak sorunu seç ve tek bir değeri merkeze alarak gerçekten işleyen bir kurum tasarla.",
      "İki iyi değeri karşı karşıya getir: eşitlik ile özgürlük, şeffaflık ile mahremiyet veya hız ile katılım gibi.",
      "İdeal sonucu değil gündelik işlemi düşün; çocuk bakımı, barınma, bakım emeği ve itiraz hakkı bu düzende nasıl yürür?",
    ],
    contrast: [
      { title: "Ütopya ≠ kusursuz dekor", text: "İyi görünen şehirler değil, değerleri günlük karar ve kurumlarla üreten işleyen düzen anlatının merkezidir." },
      { title: "Ütopya ≠ gizli distopya zorunluluğu", text: "Gerilim yaratmak için sistemi mutlaka sahte veya kötü çıkarmak gerekmez; iki olumlu değerin çakışması yeterlidir." },
    ],
    plan: "Kurucu değer, kaynak modeli, karar sistemi, itiraz hakkı ve düzeltme kapasitesini aynı toplumsal tasarımda birleştir.",
    scene: "İdeali açıklamak yerine toplantı, paylaşım, bakım, uyuşmazlık ve yeniden karar verme ritüelleri üzerinden yaşat.",
    draft: "İlk taslakta her sorunu kolay çözüme bağlama; sistemin gerçek maliyetini ve görünmeyen emeğini sahneye taşı.",
    revise: "Revizyonda bedelsiz çözüm, görünmeyen emek, muhalefet hakkı ve kurum tutarlılığını test et.",
    finish: "Final, ideal düzenin hatasızlığını değil kendini düzeltme, sınır kabul etme veya değerler arasında yeni denge kurma kapasitesini göstermeli.",
    workspace: [
      "Değer-kural matrisi: soyut ilkelerin hangi somut uygulamaya dönüştüğünü yaz.",
      "Kaynak akışı: emek, konut, enerji, sağlık ve bakımın kim tarafından nasıl dağıtıldığını izle.",
      "İtiraz dosyası: sistemi reddeden veya istisna isteyen kişilerin gerçek seçeneklerini kaydet.",
    ],
    draftAvoid: "Herkesi aynı fikirde, bütün kurumları kusursuz ve bütün çözümleri bedelsiz yazma.",
    draftFinish: "Taslağı, idealin gerçek bir istisna karşısında karar vermek zorunda kaldığı ve yeni sözleşmenin görünür olduğu noktaya kadar tamamla.",
    finalFormat: "Kurum ve kavram adlarını, karar süreçlerini ve zaman çizelgesini tutarlı hâle getir.",
    finalReader: "Okur bu toplumun neyi iyi yaptığını kadar bunu nasıl yaptığını ve hangi bedeli kabul ettiğini de anlayabilmeli.",
    outputCore: "Kurucu değer + kurum + değer çatışması + karakter seçimini tek cümlede yaz.",
    outputPlan: "İdeal düzenin sınanacağı 6 aşamayı ve her aşamadaki karar mekanizmasını çıkar.",
    outputScene: "İki olumlu değerin gerçekten çatıştığı bir topluluk kararı sahnesi yaz.",
    outputRevision: "Görünmeyen emek veya itiraz hakkı belirsiz kalan bir alanı seçip somutlaştır.",
  },
  polisiye: {
    idea: [
      "Önce çözümü bilinen bir suç veya sır kur; sonra okurun hangi izlerle geriye doğru ilerleyeceğini tasarla.",
      "Sıradan bir davranıştaki küçük çelişkiyi ipucuna dönüştür: saat, rota, alışkanlık veya tanıklık neden tutmuyor?",
      "Suçtan önce ilişki ağı kur; kimin neyi kaybetmekten korktuğu şüpheli listesini doğal biçimde üretir.",
    ],
    contrast: [
      { title: "Polisiye ≠ yalnız suç", text: "Suç başlangıçtır; türün motoru bilgi dağıtımı, ipucu, şüpheli ve adil çözüm ilişkisidir." },
      { title: "Polisiye ≠ gerilim", text: "Gerilim baskıyı merkezleyebilir; polisiye okurun ve araştırmacının gerçeğe ulaşabileceği iz zincirini de kurmak zorundadır." },
    ],
    plan: "Gerçek çözüm, sahte ihtimaller, ipuçları, kırmızı ringalar ve şüphelilerin bilgi sınırını ayrı tabloda kur.",
    scene: "Her sorgu veya keşif sahnesi en az bir yeni bilgi versin ama aynı anda yeni bir soru da doğursun.",
    draft: "İlk taslakta ipuçlarını sonradan serpiştirmeye güvenme; çözümün temel kanıtlarını baştan yerleştir.",
    revise: "Revizyonda çözümün geriye dönük adilliğini test et: okur gerekli kanıtları görmüş mü, yoksa finalde yeni bilgi mi uydurulmuş?",
    finish: "Final, yalnız suçluyu söylemek değil, delil zincirinin neden başka bir açıklamayı dışladığını da göstermeli.",
    workspace: [
      "İpucu çizelgesi: ipucu nerede görünür, kim fark eder, hangi yanlış yoruma izin verir?",
      "Şüpheli matrisi: fırsat, motivasyon, sır, alibi ve bilgi düzeyini karşılaştır.",
      "Zaman çizelgesi: suç öncesi, suç anı ve araştırma sürecindeki hareketleri saat bazında eşleştir.",
    ],
    draftAvoid: "Finalde suçluyu kurtarmak için tesadüf, gizli ikiz, son anda çıkan belge veya okurun hiç görmediği kanıt kullanma.",
    draftFinish: "Taslağı gerçek çözüm, yanlış çözüm ihtimali ve kanıtların yeniden anlam kazandığı final yüzleşmesine kadar tamamla.",
    finalFormat: "İsim, saat, tarih, rota ve kanıt konumlarının sahneler arasında çelişmediğini kontrol et.",
    finalReader: "Dikkatli bir okur finalden önce doğru ihtimali kurabilmeli; fakat çözüm yine de yeterince zor olmalı.",
    outputCore: "Suç + araştırmacı hedefi + ana çelişki + çözüm anahtarını tek cümlede yaz.",
    outputPlan: "Gerçek ipuçlarını, kırmızı ringaları ve her birinin görüneceği sahneyi sırala.",
    outputScene: "Aynı ayrıntının ilk bakışta masum, ikinci okumada anlamlı olduğu bir sorgu sahnesi yaz.",
    outputRevision: "Finalde kullanılan her kanıtın daha önce görünür olup olmadığını işaretle.",
  },
  dedektif: {
    idea: [
      "Bir gözlem hatasından başla: herkesin gördüğü ama yanlış yorumladığı hangi küçük ayrıntı gerçeği saklıyor?",
      "Araştırmacıya yöntem ver; hafıza, mekân okuma, arşiv, davranış analizi veya teknik uzmanlık olay çözüm biçimini belirlesin.",
      "Vaka ile dedektifin kişisel kör noktasını çarpıştır; çözüm yalnız zekâ değil karakter gelişimi de gerektirsin.",
    ],
    contrast: [
      { title: "Dedektif ≠ her polisiye", text: "Dedektif anlatısında araştırmacının düşünme ve soru sorma yöntemi eserin görünür motorudur." },
      { title: "Dedektif ≠ polis prosedürü zorunluluğu", text: "Kahraman polis olmak zorunda değildir; önemli olan sistemli araştırma ve kanıt yorumudur." },
    ],
    plan: "Vakanın gerçeğini, dedektifin hipotezlerini, her hipotezi çürüten kanıtı ve son çıkarım zincirini ayrı tut.",
    scene: "Her araştırma sahnesinde dedektif yalnız bilgi almasın; bir varsayım kursun, sınasın ve gerekirse değiştirsin.",
    draft: "İlk taslakta kahramanı her şeyi bilen dâhi yapma; yanlış hipotezler yöntemi görünür kılar.",
    revise: "Revizyonda çıkarım adımlarını denetle; dedektifin bildiği ile okurun bildiği arasındaki fark bilinçli olmalı.",
    finish: "Final çözümü tek parlak tahmine değil gözlem, karşılaştırma ve eleme zincirine dayanmalı.",
    workspace: [
      "Hipotez defteri: her şüpheyi destekleyen ve çürüten kanıtları birlikte yaz.",
      "Gözlem listesi: sahnede görülen ayrıntıyı yorumdan ayrı kaydet.",
      "Sorgu haritası: her görüşmenin amacı, alınan bilgi ve doğurduğu yeni soruyu takip et.",
    ],
    draftAvoid: "Dedektifin çözümü yalnız yazarın bildiği görünmez bilgiye dayandırma.",
    draftFinish: "Taslağı yanlış ana hipotezin kırıldığı ve gerçek açıklamanın kanıtlarla kurulabildiği noktaya kadar tamamla.",
    finalFormat: "İpucu isimleri, tarihler, tanık ifadeleri ve dedektif notlarındaki tutarlılığı kontrol et.",
    finalReader: "Okur dedektifin sonuca nasıl ulaştığını adım adım yeniden kurabilmeli.",
    outputCore: "Vaka + dedektif yöntemi + yanıltıcı görünüm + gerçek açıklama eksenini tek cümlede yaz.",
    outputPlan: "En az üç hipotez ve her birini değiştirecek kanıtı sırala.",
    outputScene: "Dedektifin ilk yorumunun yanlış çıktığı ama gözlemin doğru kaldığı bir sahne yaz.",
    outputRevision: "Çözüm sıçraması yapan bir çıkarımı seç ve eksik ara kanıtı ekle.",
  },
  gerilim: {
    idea: [
      "Karakter için gerçekten kaybettirecek bir saat kur: süre dolduğunda ne geri alınamaz biçimde değişecek?",
      "Bir bilgi asimetrisi seç; okur, kahraman veya tehdit diğerlerinden neyi daha önce biliyor?",
      "Güvenli görünen bir seçeneğe gizli bedel ekle; gerilim en iyi, bütün seçenekler bir şey kaybettirdiğinde çalışır.",
    ],
    contrast: [
      { title: "Gerilim ≠ aksiyon", text: "Aksiyon hareketin kendisini, gerilim ise hareketten önce ve sonra seçeneklerin daralmasını merkezler." },
      { title: "Gerilim ≠ korku", text: "Korku tekinsizlik ve güven kaybına yaslanabilir; gerilim çoğu zaman bilgi, zaman ve karar baskısıyla işler." },
    ],
    plan: "Saat, bilgi farkı, kaçış seçenekleri ve karakterin kişisel zayıf noktasını aynı baskı şemasında kur.",
    scene: "Her sahnenin sonunda seçenekleri azalt, maliyeti yükselt veya karakterin bildiği şeyi değiştir.",
    draft: "İlk taslakta sürekli yüksek sesli olay yazma; sessiz bekleme sahneleri de yaklaşan sonucu hissettirmeli.",
    revise: "Revizyonda kolay kaçışları, sahte zaman sınırlarını ve tesadüfi tehditleri temizle.",
    finish: "Final, en büyük patlamadan çok karakterin artık erteleyemediği en pahalı seçime ulaşmalı.",
    workspace: [
      "Saat çizgisi: kalan süreyi ve gerçekten neyin değiştiğini sahne sahne izle.",
      "Bilgi matrisi: kim neyi ne zaman biliyor, hangi yanlış varsayımla hareket ediyor?",
      "Güven haritası: ittifak ve şüphe değişimlerini karar anlarıyla eşleştir.",
    ],
    draftAvoid: "Karakterin kullanabileceği bariz güvenli çıkışları açıklamasız yok sayma.",
    draftFinish: "Taslağı zaman baskısının sona erdiği değil, karakterin geri dönülmez seçimi yaptığı ana kadar götür.",
    finalFormat: "Saat, konum, ulaşım süresi ve iletişim imkânlarının sahneler arasında gerçekçi kaldığını kontrol et.",
    finalReader: "Okur neden bekleyemeyeceğini, neden kaçamayacağını ve yanlış kararın bedelini net hissetmeli.",
    outputCore: "Tehdit + saat + bilgi farkı + kişisel zayıflığı tek cümlede yaz.",
    outputPlan: "Her sahnede hangi seçeneğin kaybolacağını veya hangi bedelin artacağını sırala.",
    outputScene: "Görünürde hiçbir şey olmadan baskının arttığı kısa bir bekleme sahnesi yaz.",
    outputRevision: "Kolay kaçış sağlayan bir sahneyi seç ve neden mümkün olmadığını dramatik olarak kur.",
  },
  korku: {
    idea: [
      "Güvenli bir alan seç ve onu tek bir tekrar eden ihlalle boz: ses, koku, nesne, ritüel veya zaman örüntüsü.",
      "Tehdide kural ver ama kökenini hemen açıklama; okur neye dikkat edeceğini bilsin fakat nedenini tam bilmesin.",
      "Dış korkuyu karakterin kaçındığı bir geçmiş, suçluluk veya yasla bağla; tehdit kişisel anlam kazansın.",
    ],
    contrast: [
      { title: "Korku ≠ yalnız şiddet", text: "Kan, ölüm veya canavar olmadan da güven kaybı, bekleyiş ve bilinmeyen güçlü korku üretir." },
      { title: "Korku ≠ paranormal", text: "Paranormal olağanüstü olgunun varlığına odaklanabilir; korkuda temel amaç okurun güven duygusunu sistemli biçimde aşındırmaktır." },
    ],
    plan: "Güvenli alan, ilk ihlal, tekrar eden kural, yaklaşma biçimi ve karşılaşma bedelini önceden belirle.",
    scene: "Aynı duyusal motifi her tekrarda biraz değiştir; okur yaklaşmayı açıklamadan hissedebilsin.",
    draft: "İlk taslakta tehdidi her sahnede büyütmek zorunda değilsin; inkâr, merak ve yanlış açıklamalar gerilim alanı yaratır.",
    revise: "Revizyonda kuralsız tehdidi, fazla açıklamayı, tek duyguya sıkışmış karakteri ve bedelsiz finali temizle.",
    finish: "Finalde her gizemi çözmek gerekmez; fakat karakterin neyi kaybettiği ve dünyanın hangi güven kuralının artık kırıldığı görünür olmalı.",
    workspace: [
      "Duyusal motif listesi: hangi ses, koku, ışık veya sıcaklık değişimi tehditle bağlantılı?",
      "Tehdit kuralı: ne zaman belirir, neye tepki verir, neyi yapamaz?",
      "Güven haritası: karakterin sığındığı yerlerin hangi sırayla bozulduğunu izle.",
    ],
    draftAvoid: "Korkuyu yalnız sıfatlarla anlatma ve tehdidin istediği anda her şeyi yapabilmesine izin verme.",
    draftFinish: "Taslağı karakterin tehditle yüzleştiği veya geri dönülmez biçimde etkilendiği ana kadar tamamla.",
    finalFormat: "Zaman, mekân, tekrar eden motif ve tehdidin kurallarındaki küçük çelişkileri temizle.",
    finalReader: "Okur tehdidin tam kökenini bilmek zorunda değil; fakat neyin değiştiğini ve neden artık güvende olunmadığını hissetmeli.",
    outputCore: "Güvenli alan + ihlal + tekrar eden kural + kişisel bağ + bedeli tek cümlede yaz.",
    outputPlan: "Tehdidin ilk işaretinden karşılaşmaya kadar 6 yaklaşma basamağı çıkar.",
    outputScene: "Tehdidi göstermeden aynı duyusal işaretin daha yakından tekrarlandığı sahne yaz.",
    outputRevision: "Aşırı açıkladığın bir bölümü seç ve yalnız sahnede kanıtlanan bilgiyi bırak.",
  },
  macera: {
    idea: [
      "Bir hedefi haritaya bağla: bulunacak yer, ulaştırılacak nesne veya tamamlanacak rota karakteri gerçekten hareket ettirsin.",
      "Yolculuğa değişen çevresel sorunlar ekle; her durak aynı engelin başka versiyonu olmasın.",
      "Dış hedef ile iç ihtiyaç arasında gerilim kur; karakter varış noktasına yaklaşırken kendisi hakkında neyi değiştirmek zorunda?",
    ],
    contrast: [
      { title: "Macera ≠ sürekli aksiyon", text: "Macera keşif, rota, engel ve merak duygusuyla ilerler; her bölüm çatışma sahnesi olmak zorunda değildir." },
      { title: "Macera ≠ gezi yazısı", text: "Yeni mekân yalnız güzel görünmek için değil, hedefi ve karakter kararını değiştirmek için var olmalıdır." },
    ],
    plan: "Hedef, rota, duraklar, kaynaklar, yol arkadaşları ve geri dönüşsüz seçimleri harita üzerinde planla.",
    scene: "Her durak yeni bir coğrafi bilgi, ilişki değişimi veya hedefe dair yeni risk üretmeli.",
    draft: "İlk taslakta rastgele engel ekleme; her engel rota, kaynak veya karakter kusurundan doğsun.",
    revise: "Revizyonda tekrar eden engelleri, işlevsiz durakları ve hedefi unutturan yan yolları çıkar.",
    finish: "Final yalnız varış değil, karakterin yol boyunca kazandığı veya kaybettiği şeyin hedefe verdiği yeni anlam olmalı.",
    workspace: [
      "Rota haritası: mesafe, süre ve ulaşım koşullarını tut.",
      "Kaynak listesi: para, yiyecek, araç, bilgi ve güven ilişkilerinin ne zaman azaldığını izle.",
      "Durak kartları: her mekânın hedefe etkisini ve karakterde yarattığı değişimi yaz.",
    ],
    draftAvoid: "Karakteri yalnız tesadüflerle bir sonraki durağa taşıma ve her problemi yeni bir yardımcı karakterle çözme.",
    draftFinish: "Taslağı hedefe ulaşma veya vazgeçme kararının verildiği ve yolculuğun anlamının değiştiği noktaya kadar tamamla.",
    finalFormat: "Mesafe, rota, hava, araç ve zaman bilgilerinin coğrafi olarak mümkün kaldığını kontrol et.",
    finalReader: "Okur hem dış hedefin ilerlediğini hem yolculuğun karakteri değiştirdiğini hissedebilmeli.",
    outputCore: "Hedef + rota + ana engel + iç ihtiyaç + varış bedelini tek cümlede yaz.",
    outputPlan: "En az beş durak ve her durakta değişecek bir kaynak veya ilişki çıkar.",
    outputScene: "Mekânın yalnız fon değil karar zorlayıcı olduğu bir geçiş sahnesi yaz.",
    outputRevision: "Aynı işlevi gören iki engeli birleştir ve yolculuğu sıkılaştır.",
  },
  aksiyon: {
    idea: [
      "Karakterin hemen çözmesi gereken fiziksel bir hedef seç ve başarısızlığın somut sonucunu belirle.",
      "Sahneyi hareketten önce mekân ve kaynak kısıtıyla kur; kapı, yükseklik, trafik, ekipman veya süre çözümü belirlesin.",
      "Karakter becerisine sınır ekle; yetenek kadar yorgunluk, bilgi eksikliği ve ahlaki kural da aksiyonu şekillendirsin.",
    ],
    contrast: [
      { title: "Aksiyon ≠ hız", text: "Kısa cümleler ve sürekli koşmak tek başına aksiyon değildir; net hedef, mekân ve değişen taktik gerekir." },
      { title: "Aksiyon ≠ gerilim", text: "Gerilim bekleyişle çalışabilir; aksiyon sahnesinde karakter fiziksel olarak bir hedefe ulaşmak için eylem üretir." },
    ],
    plan: "Hedef, mekân geometrisi, kullanılabilir araçlar, engeller, zaman ve sivil/ahlaki kısıtı sahne planına yerleştir.",
    scene: "Her hareket bir öncekinin sonucu olsun; taktik değişsin, mekân kullanılsın ve sahnenin sonunda durum gerçekten farklılaşsın.",
    draft: "İlk taslakta koreografiyi süsleme; kim nerede, ne istiyor ve hangi engeli aşıyor sorularını görünür tut.",
    revise: "Revizyonda fiziksel imkânsızlıkları, tekrar eden hareketleri ve sonucu değiştirmeyen aksiyon parçalarını kes.",
    finish: "Final aksiyonu karakterin en zor beceri gösterisi değil, fiziksel hedef ile ahlaki seçimin aynı anda çarpıştığı yer olmalı.",
    workspace: [
      "Mekân krokisi: giriş, çıkış, yükseklik, görüş hattı ve engelleri çiz.",
      "Kaynak kartı: araç, mühimmat, enerji, yaralanma ve iletişim imkânını takip et.",
      "Beat listesi: her aksiyon vuruşunda hedefin veya taktiğin nasıl değiştiğini yaz.",
    ],
    draftAvoid: "Karakteri darbe ve düşüşlerden sonuçsuz çıkarma; fiziksel bedelin sonraki sahneye taşınmasına izin ver.",
    draftFinish: "Taslağı ana fiziksel hedefin sonuçlandığı ve karakterin bu sonuç için neyi feda ettiğinin göründüğü noktaya kadar tamamla.",
    finalFormat: "Mekân, süre, yaralanma, araç ve hareket sürekliliğini sahne sahne kontrol et.",
    finalReader: "Okur hızlı okurken bile karakterlerin nerede olduğunu ve neden o hareketi yaptığını anlayabilmeli.",
    outputCore: "Fiziksel hedef + mekân kısıtı + saat + beceri sınırı + ahlaki bedeli tek cümlede yaz.",
    outputPlan: "Ana aksiyon sahnesini en az 8 neden-sonuç vuruşuna böl.",
    outputScene: "Mekândaki bir özelliğin taktiği tamamen değiştirdiği kısa aksiyon sahnesi yaz.",
    outputRevision: "Sadece gösterişli olduğu için duran bir hareketi çıkar ve sahne amacını sıkılaştır.",
  },
  casusluk: {
    idea: [
      "Bir devlet sırrından önce çıkar çatışması kur: hangi kurum aynı bilgiyi farklı amaçla kullanmak istiyor?",
      "Karaktere iki sadakat ver; görev ile kişisel bağ aynı kararda çarpışsın.",
      "Bilginin kendisini meta yap: belge, kaynak, kimlik, kod veya tanığın kime ulaştığı güç dengesini değiştirsin.",
    ],
    contrast: [
      { title: "Casusluk ≠ yalnız gizli ajan", text: "Türün motoru kimlik, bilgi, sadakat ve karşı istihbarat arasındaki belirsizliktir." },
      { title: "Casusluk ≠ aksiyon zorunluluğu", text: "Takip ve çatışma olabilir; fakat bir dosyanın yanlış kişiye gitmesi bazen silahlı sahneden daha büyük sonuç üretir." },
    ],
    plan: "Taraflar, gerçek hedefler, kapak kimlikleri, kaynaklar, bilgi akışı ve ihanet ihtimallerini ayrı katmanlarda çiz.",
    scene: "Her görüşmede söylenen bilgi kadar saklanan amaç da değişsin; karakterler aynı cümleyi farklı çıkarlarla kullansın.",
    draft: "İlk taslakta sürekli sürpriz ihanet ekleme; önceden kurulmuş çıkar ve bilgi farkı üzerinden güven kır.",
    revise: "Revizyonda kim neyi ne zaman biliyor, hangi kimliği neden koruyor ve hangi bilginin değeri neden yüksek sorularını test et.",
    finish: "Finalde görev başarısı ile sadakat bedeli aynı şey olmasın; karakter neyi koruduğunu seçmek zorunda kalsın.",
    workspace: [
      "Taraf haritası: kurum, fraksiyon ve kişisel hedefleri birbirinden ayır.",
      "Bilgi akışı: her belgenin veya sırrın kimden kime ne zaman geçtiğini izle.",
      "Kapak dosyası: karakterin gerçek kimliği, kullandığı hikâye ve açığa çıkarabilecek ayrıntıları tut.",
    ],
    draftAvoid: "Her karakteri çift ajan yaparak belirsizlik yaratma; belirsizlik çıkar ve bilgi sınırından doğmalı.",
    draftFinish: "Taslağı ana bilginin kaderi ve karakterin gerçek sadakati hakkında geri dönülmez seçim yapılana kadar tamamla.",
    finalFormat: "Kod adları, kurumlar, tarih, belge ve kimlik ayrıntılarında tutarlılık kontrolü yap.",
    finalReader: "Okur finalde hangi tarafın ne istediğini yeniden kurabilmeli; karmaşa ile gizem birbirine karışmamalı.",
    outputCore: "Görev + bilgi varlığı + iki sadakat + karşı kuvvet + ihanet bedelini tek cümlede yaz.",
    outputPlan: "Bilginin el değiştirdiği ana noktaları ve her geçişte değişen gücü sırala.",
    outputScene: "İki kişinin aynı konuşmada farklı amaç peşinde olduğu bir temas sahnesi yaz.",
    outputRevision: "Son anda çıkan bir ihaneti seç ve daha önce görünür çıkar işaretleriyle hazırla.",
  },
  "tarihi-roman": {
    idea: [
      "Büyük olaydan önce görünmeyen insanı seç: aynı tarihsel kırılma sıradan bir meslek, aile veya mahalleyi nasıl etkiliyor?",
      "Bir arşiv ayrıntısını dramatik soruya çevir; belgeyi bilgi olarak değil karakterin kararını zorlayan unsur olarak kullan.",
      "Dönemin kurumlarından birini günlük hayatla bağla: hukuk, ulaşım, sınıf, savaş, ticaret veya eğitim neyi mümkün kılıyor?",
    ],
    contrast: [
      { title: "Tarihî roman ≠ tarih dersi", text: "Gerçek dönem ve olaylar zemin sağlar; anlatının merkezi yine karakter hedefi, çatışma ve seçimdir." },
      { title: "Tarihî roman ≠ alternatif tarih", text: "Tarihî roman temel tarihsel sonucu değiştirmek zorunda değildir; alternatif tarih bilinçli bir kırılma üzerinden yeni zaman çizgisi kurar." },
    ],
    plan: "Kesin bilinenler, tartışmalı bilgiler, kurmaca boşluklar ve karaktere verdiğin özgür alanı ayrı notlarda tut.",
    scene: "Dönem bilgisini eşya, işlem, sınırlama ve günlük alışkanlık üzerinden göster; açıklama paragrafını azalt.",
    draft: "İlk taslakta her araştırma bulgusunu kullanma; yalnız sahneyi, karakteri veya dönemin baskısını değiştiren ayrıntıyı taşı.",
    revise: "Revizyonda kronoloji, maddi kültür, dil tonu ve tarihsel kişilerin gereksiz biçimde olay çözücü yapılmadığını kontrol et.",
    finish: "Final kurmaca karakterin dönüşümünü tamamlamalı; gerçek tarihin kendisi yalnızca sonuç cümlesi olarak kullanılmamalı.",
    workspace: [
      "Kaynak fişi: bilgi, kaynak türü, güven düzeyi ve kullanacağın sahneyi not et.",
      "Kronoloji: gerçek olaylarla kurmaca olayları iki ayrı satırda eşleştir.",
      "Dönem sözlüğü: para, meslek, ulaşım, hitap ve kurum terimlerini tutarlı kullan.",
    ],
    draftAvoid: "Karakterlere bugünün bilgi ve değerlerini açıklamasız biçimde yükleme; dönemin imkân ve sınırlamalarını hissettir.",
    draftFinish: "Taslağı tarihsel dönüm noktası ile karakterin kişisel seçiminin kesiştiği final sonucuna kadar tamamla.",
    finalFormat: "Tarih, unvan, yer adı, para birimi ve kurum adlarının dönemle uyumunu kontrol et.",
    finalReader: "Okur dönemi anlayabilmeli ama metni takip etmek için ansiklopediye ihtiyaç duymamalı.",
    outputCore: "Tarihsel dönem + karakter hedefi + kurum baskısı + kurmaca çatışmayı tek cümlede yaz.",
    outputPlan: "Gerçek kronoloji ve kurmaca sahne zincirini yan yana çıkar.",
    outputScene: "Dönem bilgisini açıklamadan bir işlem veya günlük davranış içinde gösteren sahne yaz.",
    outputRevision: "Sırf araştırdığın için metinde duran bir ayrıntıyı çıkar veya dramatik işleve bağla.",
  },
  "psikolojik-roman": {
    idea: [
      "Karakterin dış hedefinden önce kendine anlattığı yanlış cümleyi bul; roman bu inancın nasıl çatladığını izlesin.",
      "Tek bir ilişkiyi algı laboratuvarına çevir; aynı olay iki karakter için neden farklı anlam taşıyor?",
      "Güvenilmezliği yalan söylemekle sınırlama; eksik hafıza, savunma, utanç ve seçici dikkat de algıyı bozabilir.",
    ],
    contrast: [
      { title: "Psikolojik roman ≠ iç monolog yığını", text: "İç dünya sahne, davranış ve ilişki değişimine bağlanmadığında dramatik hareket durur." },
      { title: "Psikolojik roman ≠ gerilim zorunluluğu", text: "Zihinsel belirsizlik gerilim üretebilir; fakat türün ana odağı karakterin algısı, savunmaları ve dönüşümüdür." },
    ],
    plan: "Dış olay çizgisi ile karakterin iç yorum çizgisini paralel yaz; aynı olayın algıyı nasıl değiştirdiğini takip et.",
    scene: "Her iç çözümleme öncesinde veya sonrasında gözlenebilir bir davranış, seçim veya ilişki sonucu göster.",
    draft: "İlk taslakta karakterin her duygusunu adlandırma; tekrar eden hareket, kaçınma ve yanlış yorumlarla iç durumu görünür kıl.",
    revise: "Revizyonda iç monolog tekrarlarını, nedensiz ruh değişimlerini ve yalnız açıklamayla var olan travma bilgilerini azalt.",
    finish: "Finalde karakterin bütün sorunları çözülmek zorunda değil; fakat kendine anlattığı ana yanlış cümleyle ilişkisi değişmiş olmalı.",
    workspace: [
      "İnanç çizgisi: karakterin kendisi ve başkaları hakkında inandığı ana cümleleri takip et.",
      "Tetikleyici listesi: hangi olay hangi savunma davranışını açığa çıkarıyor?",
      "Algı-gerçek ayrımı: sahnede olan ile karakterin yorumunu ayrı not et.",
    ],
    draftAvoid: "Tanı koyan açıklamalarla karakter derinliği yaratmaya çalışma; yaşanan davranış ve seçim önce gelsin.",
    draftFinish: "Taslağı ana ilişkinin veya olayın karakterin öz-anlatısını geri dönülmez biçimde değiştirdiği noktaya kadar tamamla.",
    finalFormat: "Bakış açısı, zaman atlamaları, anı sahneleri ve iç ses biçiminde tutarlılık kontrolü yap.",
    finalReader: "Okur karakterin neden böyle düşündüğünü anlayabilmeli; fakat metin onun her yorumunu doğru kabul etmek zorunda değil.",
    outputCore: "Dış hedef + yanlış inanç + tetikleyici ilişki + dönüşüm eşiğini tek cümlede yaz.",
    outputPlan: "Karakterin ana inancını güçlendiren ve kıran sahneleri iki sütunda sırala.",
    outputScene: "Karakterin söylediği ile yaptığı şeyin farklı olduğu kısa bir sahne yaz.",
    outputRevision: "Aynı duyguyu üç kez açıklayan bölümü seç ve davranışa dönüştür.",
  },
  romantik: {
    idea: [
      "İki karakteri yalnız çekimle değil çatışan ihtiyaçlarla kur; birlikte olmak için neyi değiştirmeleri gerekiyor?",
      "İlişkiye dış engelden önce iç engel ver: güven, bağlanma, kariyer, aile, değer veya geçmiş kararı.",
      "Tanışmayı değil ilişkiyi düşün; karakterler birbirlerini gördükçe hangi yanlış varsayım çözülüyor veya büyüyor?",
    ],
    contrast: [
      { title: "Romantik ≠ yan aşk hikâyesi", text: "Romantik anlatıda ilişkinin gelişimi ve seçimi ana dramatik omurgayı taşır." },
      { title: "Romantik ≠ yalnız uyum", text: "Kimya kadar değer, ihtiyaç ve sınır çatışması da ilişkiyi inandırıcı kılar." },
    ],
    plan: "İki karakterin hedefini, korkusunu, sınırını, yanlış varsayımını ve ortak gelecek için gereken değişimi ayrı ayrı planla.",
    scene: "Her buluşma yalnız yakınlaştırmasın; bilgi, güven, sınır veya ilişki dengesi değişsin.",
    draft: "İlk taslakta yanlış anlamaları yapay biçimde uzatma; karakterlerin neden konuşamadığını gerçek korku veya çıkarla temellendir.",
    revise: "Revizyonda çekim dışındaki uyum, çatışmanın karşılıklılığı ve final kararının iki karakter için de maliyetini test et.",
    finish: "Finalde birlikte olmak tek ödül olmasın; iki karakterin de ilişki içinde daha doğru bir seçim yapabildiği görünür olsun.",
    workspace: [
      "Çift karakter kartı: istek, korku, sınır ve yanlış varsayımı yan yana yaz.",
      "Yakınlık çizgisi: güvenin arttığı ve kırıldığı sahneleri işaretle.",
      "Çatışma matrisi: dış engel ile iç engeli karıştırmadan takip et.",
    ],
    draftAvoid: "Bir karakteri yalnız diğerinin ödülü veya iyileştiricisi olarak yazma.",
    draftFinish: "Taslağı ilişki kararının iki karakterin de önceki korkusunu veya sınırını gerçekten sınadığı noktaya kadar tamamla.",
    finalFormat: "Zaman çizgisi, iletişim geçmişi ve ilişki dönüm noktalarının sırasını kontrol et.",
    finalReader: "Okur karakterlerin neden birbirini istediğini kadar neden birlikte olmanın zor olduğunu da anlayabilmeli.",
    outputCore: "Karakter A ihtiyacı + karakter B ihtiyacı + ortak çekim + ana engel + değişim bedelini tek cümlede yaz.",
    outputPlan: "İlişkiyi değiştiren 6 dönüm noktasını ve her birinde güvenin ne olduğuna yaz.",
    outputScene: "Çekim ile sınırın aynı anda görünür olduğu kısa bir yakınlaşma sahnesi yaz.",
    outputRevision: "Yapay yanlış anlama üzerine kurulu bir engeli seç ve gerçek karakter korkusuna bağla.",
  },
  dram: {
    idea: [
      "Sıradan bir hayatın taşıdığı ağır seçimi bul; büyük olaydan çok ilişkinin veya kararın sonucu önemli olabilir.",
      "İki haklı taraf yarat; çatışma kötü niyetten değil uyumsuz ihtiyaç ve değerlerden doğsun.",
      "Kaybı yalnız ölüm olarak düşünme: statü, güven, aile bağı, ev, iş veya kendilik algısı da dramatik kayıp olabilir.",
    ],
    contrast: [
      { title: "Dram ≠ sürekli üzüntü", text: "Dramın gücü acı miktarından değil karakterlerin anlamlı seçimlerinin sonuçlarından gelir." },
      { title: "Dram ≠ melodram", text: "Duyguyu büyütmek için tesadüf ve aşırı kötülük yerine anlaşılır ihtiyaçlar ve gerçek sonuçlar kullan." },
    ],
    plan: "Karakterlerin ihtiyaçlarını, ortak geçmişini, kırılma noktasını ve kimsenin tam kazanamayacağı ana seçimi planla.",
    scene: "Her sahnede duyguyu açıklamak yerine ilişki davranışında küçük bir değişim yarat.",
    draft: "İlk taslakta her yoğun sahnenin ardından sonuçlarına yer ver; sürekli zirve duygusu etkiyi azaltır.",
    revise: "Revizyonda tesadüfi acıları, tek taraflı kötü karakterleri ve açıklama ağırlıklı duygusal anları temizle.",
    finish: "Final, kaybın veya seçimin karakterlerin birbirine ve kendilerine bakışını nasıl değiştirdiğini göstermeli.",
    workspace: [
      "İlişki haritası: yakınlık, borç, sır ve kırgınlıkları işaretle.",
      "Sonuç zinciri: her büyük kararın sonraki sahnede neye mal olduğunu yaz.",
      "Duygu ritmi: yoğunluk, sessizlik ve günlük hayat sahnelerini dengede tut.",
    ],
    draftAvoid: "Okuru ağlatmak için nedensiz felaket ekleme; kayıp karakterin mevcut hayatından doğmalı.",
    draftFinish: "Taslağı ana ilişkinin veya seçimin sonucunun kabul edildiği yeni dengeye kadar tamamla.",
    finalFormat: "Zaman atlamaları, ilişki geçmişi ve olay sonuçlarının kronolojisini kontrol et.",
    finalReader: "Okur bütün tarafların neden o seçimi yaptığını anlayabilmeli, aynı fikirde olmak zorunda değil.",
    outputCore: "İki ihtiyaç + ortak geçmiş + geri dönülmez seçim + duygusal bedeli tek cümlede yaz.",
    outputPlan: "Ana seçime götüren beş ilişki değişimini çıkar.",
    outputScene: "İki karakterin aynı olayı farklı ama haklı biçimde gördüğü bir konuşma sahnesi yaz.",
    outputRevision: "Tesadüfle gelen bir duygusal darbeyi seç ve önceki kararlardan doğan sonuca dönüştür.",
  },
  mizah: {
    idea: [
      "Sıradan bir kuralı ciddiye alıp sonucunu büyüt; küçük bir sosyal alışkanlık ne kadar ileri giderse absürtleşir?",
      "Karakterin kendisi hakkında inandığı ciddi imaj ile dışarıdan görünen davranış arasındaki farkı kullan.",
      "Tekrar eden bir düzen kur ve üçüncü tekrarında beklenmedik biçimde boz; komik ritim öngörü ile sapma arasında doğar.",
    ],
    contrast: [
      { title: "Mizah ≠ sürekli şaka", text: "Komik etki karakter, durum, ritim ve sonuçtan doğabilir; her cümlenin espri olması gerekmez." },
      { title: "Mizah ≠ hiciv", text: "Hiciv belirli bir kurum veya düşünceyi eleştiri hedefi yapar; mizah yalnız insan davranışındaki çelişkiden de doğabilir." },
    ],
    plan: "Komik öncül, karakterin ciddi hedefi, tekrar düzeni, büyüyen sonuç ve final ters çevirmesini planla.",
    scene: "Karakter şakacı olmak zorunda değil; ciddi amaç ile durumun mantığı çarpıştığında komediyi sahnenin sonucu üretsin.",
    draft: "İlk taslakta espriyi açıklama; ritmi, beklemeyi ve karakter tepkisini yazıp fazlalığı sonra kes.",
    revise: "Revizyonda aynı tür şakaları, gereksiz açıklamayı ve yalnız referansa dayanan kısa ömürlü mizahı azalt.",
    finish: "Final, komik öncülün en büyük ama mantıklı sonucunu göstermeli; rastgele punchline ile bitmemeli.",
    workspace: [
      "Tekrar listesi: hangi motif kaç kez dönüyor ve her dönüşte nasıl değişiyor?",
      "Karakter ciddiyeti: karakterin gerçekten ne istediğini ve neden komik olmadığını kendisi açısından yaz.",
      "Ritim notu: kurulum, bekleme, sapma ve tepki sırasını sahne bazında tut.",
    ],
    draftAvoid: "Karakteri yalnız espri makinesine çevirme ve her şakayı açıklama cümlesiyle öldürme.",
    draftFinish: "Taslağı ana komik öncülün sonuçlarının karakteri gerçek bir seçim yapmaya zorladığı noktaya kadar tamamla.",
    finalFormat: "Tekrar motifleri, isimler, zamanlama ve bilgi sırasının komik etkiyi bozmadığını kontrol et.",
    finalReader: "Okur komik durumu anlamak için iç referans listesine ihtiyaç duymamalı; karakter hedefi tek başına da takip edilebilir olmalı.",
    outputCore: "Ciddi hedef + çelişkili kural + tekrar düzeni + büyüyen sonucu tek cümlede yaz.",
    outputPlan: "Aynı komik motifin üç tekrarını ve her tekrarın nasıl büyüdüğünü çıkar.",
    outputScene: "Karakterin tamamen ciddi kaldığı ama durumun giderek komikleştiği kısa sahne yaz.",
    outputRevision: "Açıklayarak öldürdüğün bir espriyi seç ve tepki/ritimle çalışır hâle getir.",
  },
  hiciv: {
    idea: [
      "Eleştirmek istediğin kurum veya alışkanlığı tek cümlede tanımla ve kendi mantığını sonuna kadar uygulandığında doğacak çelişkiyi bul.",
      "Gerçek dünyadaki dili biraz büyüt; slogan, form, performans ölçütü veya kurumsal jargon kendi absürtlüğünü açığa çıkarsın.",
      "Hedefi insan grubuna değil güç ilişkisine yönelt; kim ne kazanıyor, kim görünmez kalıyor?",
    ],
    contrast: [
      { title: "Hiciv ≠ yalnız mizah", text: "Hicvin komik olması şart değildir; asıl fark görünür bir eleştiri hedefi ve güç ilişkisi taşımasıdır." },
      { title: "Hiciv ≠ hakaret", text: "Kişiyi küçümsemek yerine sistemin çelişkisini, dilini ve sonuçlarını dramatik olarak görünür kıl." },
    ],
    plan: "Eleştiri hedefi, resmi söylem, gerçek teşvik, kazananlar, kaybedenler ve absürt sonuca giden mantık zincirini planla.",
    scene: "Karakterler sistemin mantığını ciddi biçimde uygulasın; çelişkiyi yazarın açıklaması değil sonuç açığa çıkarsın.",
    draft: "İlk taslakta mesajı tekrar tekrar söyleme; aynı eleştiriyi farklı olaylarla kanıtlamak yerine en güçlü sahneleri seç.",
    revise: "Revizyonda hedefin bulanıklaştığı, aşağı doğru yumruklayan veya yalnız güncel referansa yaslanan bölümleri temizle.",
    finish: "Finalde eleştiri hedefinin mantığı kendi sonucuna ulaşmalı; mesajı açıklayan son paragraf gerekmemeli.",
    workspace: [
      "Söylem-gerçeklik tablosu: kurum ne diyor, gerçekte neyi teşvik ediyor?",
      "Güç haritası: kim karar veriyor, kim sonuç taşıyor?",
      "Abartı sınırı: hangi öğe büyütüldü ve gerçeklikle bağı nerede korunuyor?",
    ],
    draftAvoid: "Eleştiri hedefini yalnız aptal veya kötü karakterlere yükleme; sistemin ödül yapısını göster.",
    draftFinish: "Taslağı kurumun kendi mantığıyla en çelişkili sonucu üretmesine kadar götür.",
    finalFormat: "Kurum dili, sloganlar, unvanlar ve tekrar eden bürokratik terimleri tutarlılaştır.",
    finalReader: "Okur neyin eleştirildiğini anlayabilmeli ama metin tez makalesine dönüşmemeli.",
    outputCore: "Eleştiri hedefi + resmi söylem + gerçek teşvik + görünmeyen bedeli tek cümlede yaz.",
    outputPlan: "Sistemin mantığını üç aşamada büyüt ve her aşamadaki çelişkiyi çıkar.",
    outputScene: "Kurumun en absürt kuralının herkes tarafından normal karşılandığı sahne yaz.",
    outputRevision: "Mesajı açıklayan bir paragrafı seç ve sahnenin sonucuna dönüştür.",
  },
  "alternatif-tarih": {
    idea: [
      "Tek bir tarihsel kırılma noktası seç ve önce doğrudan sonucu, sonra kurumlar ve gündelik hayat üzerindeki uzun vadeli etkisini düşün.",
      "Büyük liderden önce sıradan insanı sor: farklı tarih çizgisi onun işi, dili, eğitimi veya ailesini nasıl değiştiriyor?",
      "Kırılmanın her şeyi sihirli biçimde değiştirmesine izin verme; değişmeyen yapılar ve beklenmedik süreklilikler de kur.",
    ],
    contrast: [
      { title: "Alternatif tarih ≠ tarihî roman", text: "Tarihî roman bilinen geçmiş içinde kurmaca boşluk açar; alternatif tarih belirli bir kırılmadan sonra yeni nedensellik kurar." },
      { title: "Alternatif tarih ≠ rastgele 'ya şöyle olsaydı'", text: "Kırılmadan sonraki siyaset, ekonomi, teknoloji ve kültür sonuçları birbirini mantıklı biçimde izlemelidir." },
    ],
    plan: "Gerçek zaman çizgisi, kırılma noktası, ilk üç sonuç ve uzun vadeli kurumsal değişimleri iki kolonlu kronolojide kur.",
    scene: "Dünya farkını ders gibi anlatmak yerine para, haber, sınır, eğitim, dil ve gündelik nesneler üzerinden göster.",
    draft: "İlk taslakta her tarihsel ayrıntıyı değiştirme; kırılmanın gerçekten etkilediği alanlara odaklan.",
    revise: "Revizyonda domino etkisini geriye doğru test et ve kolaycı anakronizmleri temizle.",
    finish: "Final, yalnız alternatif dünyanın ilginçliğini değil karakterin bu farklı düzen içindeki somut seçimini sonuçlandırmalı.",
    workspace: [
      "Çift kronoloji: gerçek tarih ile alternatif hattı yan yana tut.",
      "Nedensellik ağacı: her büyük değişimin hangi önceki sonuca dayandığını yaz.",
      "Değişmeyenler listesi: kırılmaya rağmen süren kurum, kültür ve teknolojileri kaydet.",
    ],
    draftAvoid: "Kırılmadan bağımsız gelişmeleri açıklamasız biçimde tamamen tersine çevirme.",
    draftFinish: "Taslağı alternatif düzenin karaktere yüklediği ana bedel veya fırsatın sonuçlandığı noktaya kadar tamamla.",
    finalFormat: "Tarih, coğrafya, unvan, kurum ve teknolojik gelişim çizgisindeki tutarlılığı kontrol et.",
    finalReader: "Okur gerçek tarihi ayrıntılı bilmese bile kırılmanın ne olduğunu ve bu dünyayı nasıl değiştirdiğini anlayabilmeli.",
    outputCore: "Kırılma noktası + ilk sonuç + uzun vadeli dünya farkı + karakter hedefini tek cümlede yaz.",
    outputPlan: "Kırılmadan bugüne en az beş nedensel sonuç zinciri çıkar.",
    outputScene: "Alternatif tarihi açıklamadan, gündelik bir nesne veya kurum üzerinden farkı gösteren sahne yaz.",
    outputRevision: "Nedensellik bağı zayıf bir dünya farkını seç ve ya temellendir ya çıkar.",
  },
  gotik: {
    idea: [
      "Bir mekân seç ve geçmişteki toplumsal ya da ailevi sırrı o mekânın fiziksel düzenine bağla.",
      "Çekici ile tehditkâr olanı aynı unsurda birleştir: ev, aile, aşk, miras veya gelenek hem sığınak hem baskı kaynağı olsun.",
      "Doğaüstü açıklamayı tek seçenek yapma; psikolojik, tarihsel ve gerçeküstü ihtimaller bir süre birlikte yaşayabilsin.",
    ],
    contrast: [
      { title: "Gotik ≠ yalnız eski konak", text: "Mekân dekor değil; geçmişin, sınıfın, aile sırlarının ve bastırılan şeylerin taşıyıcısıdır." },
      { title: "Gotik ≠ doğrudan korku", text: "Korku olabilir; fakat gotik anlatı çekim, çürüme, miras ve belirsizlik duygusunu daha uzun süre taşır." },
    ],
    plan: "Mekân katları, aile/geçmiş sırrı, yasak alan, tekrar eden motif ve karakterin mekânla kişisel bağını birlikte planla.",
    scene: "Mekân her sahnede aynı görünmesin; bilgi değiştikçe oda, eşya veya koridorun anlamı da değişsin.",
    draft: "İlk taslakta atmosferi yalnız sıfatla kurma; ışık, ses, koku, eşya ve mimari işlev üzerinden tekrar eden motif kullan.",
    revise: "Revizyonda mekânın olay örgüsüne etkisini, belirsizliğin adil oluşunu ve geçmiş sırrın bugünkü kararı gerçekten değiştirdiğini test et.",
    finish: "Finalde mekânın sırrı tamamen çözülmese bile karakterin miras, aile veya geçmişle kurduğu ilişki değişmiş olmalı.",
    workspace: [
      "Mekân planı: kapalı alanlar, geçişler, yasak bölgeler ve tarihsel izleri işaretle.",
      "Motif listesi: tekrar eden nesne, hava, ses veya renklerin anlam değişimini izle.",
      "Geçmiş-bugün tablosu: eski olayın bugünkü her sonucunu sahneyle eşleştir.",
    ],
    draftAvoid: "Her tekinsizliği hayaletle açıklama ve dekoru olaydan bağımsız süs olarak kullanma.",
    draftFinish: "Taslağı karakterin geçmişin sırrıyla veya onun bugünkü sonucu ile geri dönülmez biçimde yüzleştiği noktaya kadar tamamla.",
    finalFormat: "Mekân geometrisi, aile ilişkileri, tarih ve motif tekrarlarının çelişmediğini kontrol et.",
    finalReader: "Okur mekânın neden rahatsız edici ve çekici olduğunu hissedebilmeli; yalnız 'eski olduğu için' değil.",
    outputCore: "Mekân + geçmiş sırrı + karakter bağı + yasak/çekim + bugünkü bedeli tek cümlede yaz.",
    outputPlan: "Mekânın anlamını değiştiren beş keşif anını sırala.",
    outputScene: "Aynı odanın yeni bilgiyle tamamen farklı anlam kazandığı kısa sahne yaz.",
    outputRevision: "Yalnız atmosfer için duran bir ayrıntıyı seç ve geçmiş veya çatışmayla bağla.",
  },
  mitoloji: {
    idea: [
      "Bir miti isim olarak değil çatışma yapısı olarak seç; hangi tabu, sınav, dönüşüm veya borç bugün yeniden anlam kazanabilir?",
      "Tek bir tanrı veya kahramandan önce kozmik düzeni sor: insan, doğa, kader ve kutsal arasındaki ilişki nasıl işliyor?",
      "Kaynağa saygı ile yeni yorum arasında sınır kur; hangi öğeyi koruyor, hangisini bilinçli olarak dönüştürüyorsun?",
    ],
    contrast: [
      { title: "Mitoloji ≠ fantastik isim deposu", text: "Tanrı veya yaratık adını almak yetmez; mitin işlevini, sembolünü ve kültürel bağlamını anlamak gerekir." },
      { title: "Mitoloji ≠ yeniden anlatım zorunluluğu", text: "Kaynağı birebir tekrar etmek yerine motif, sınav veya kozmik düzeni yeni karakter ve bağlamla dönüştürebilirsin." },
    ],
    plan: "Kaynak mit, değişmez çekirdek, dönüştürdüğün öğe, kültürel bağlam ve yeni dramatik soruyu ayrı not et.",
    scene: "Sembol ve ritüeli açıklamak yerine karakterin yaptığı seçim ve taşıdığı sonuç üzerinden görünür kıl.",
    draft: "İlk taslakta araştırma bilgisini sergileme; yalnız karakterin dünyasını ve ana temayı etkileyen mitik unsurları kullan.",
    revise: "Revizyonda kaynakların karıştığı, bağlamın silindiği veya sembolün yalnız dekor kaldığı yerleri düzelt.",
    finish: "Final, eski motifin yeni hikâyede hangi anlama dönüştüğünü karakter seçimiyle göstermeli.",
    workspace: [
      "Kaynak tablosu: mitin farklı sürümlerini ve ortak çekirdeği ayır.",
      "Sembol sözlüğü: nesne, hayvan, mekân ve ritüellerin kaynak ve eser içi anlamını yaz.",
      "Dönüşüm notu: hangi öğeyi neden değiştirdiğini ve bunun hikâyeye etkisini kaydet.",
    ],
    draftAvoid: "Farklı kültürlerden unsurları bağlamsız biçimde tek estetik kolajda eritme.",
    draftFinish: "Taslağı mitik sınav veya motifin karakter için yeni bir anlam kazandığı final seçimine kadar tamamla.",
    finalFormat: "Özel ad, soy ağacı, ritüel ve kaynaklardan türetilen kavramların yazımını tutarlılaştır.",
    finalReader: "Kaynak miti bilmeyen okur hikâyeyi anlayabilmeli; bilen okur ise dönüşümün bilinçli olduğunu hissedebilmeli.",
    outputCore: "Kaynak motif + yeni bağlam + karakter hedefi + tabu/sınav + yeni anlamı tek cümlede yaz.",
    outputPlan: "Mitik çekirdeğin hikâyede görüneceği üç ana dönüşüm noktasını çıkar.",
    outputScene: "Bir ritüelin anlamını açıklamadan eylem ve sonuç üzerinden gösteren sahne yaz.",
    outputRevision: "Sırf tanıdık olduğu için kullandığın bir mitik öğeyi seç ve işlevini güçlendir ya da çıkar.",
  },
  paranormal: {
    idea: [
      "Gündelik dünyaya tek bir doğaüstü sapma ekle ve onun tekrar eden kanıtını belirle.",
      "Olayın açıklamasını değil etkisini önce kur; karakterin ilişkileri ve kararları doğaüstü ihtimal yüzünden nasıl değişiyor?",
      "İnanan ve şüphe eden iki makul bakış kur; kanıtlar bir süre iki yorumu da taşıyabilsin.",
    ],
    contrast: [
      { title: "Paranormal ≠ otomatik korku", text: "Doğaüstü olay korkutucu olmak zorunda değildir; merak, yas, aşk veya kimlik çatışması da merkez olabilir." },
      { title: "Paranormal ≠ sınırsız büyü", text: "Olağanüstü olayın gözlenebilir örüntüsü ve sınırı olmalı; aksi hâlde her sonuç açıklanabilir hâle gelir." },
    ],
    plan: "Normal düzen, ilk kanıt, tekrar örüntüsü, olası açıklamalar ve doğaüstü olgunun karaktere maliyetini planla.",
    scene: "Her yeni kanıt, önceki yorumu ya güçlendirsin ya da bozsın; yalnız daha büyük efekt üretmek için eklenmesin.",
    draft: "İlk taslakta karakterleri hemen kesin inanan veya kesin reddeden klişelere ayırma.",
    revise: "Revizyonda kanıtların tutarlılığını, olgunun sınırını ve belirsizliğin hileye dönüşmediğini kontrol et.",
    finish: "Finalde olay tamamen açıklanabilir veya gizemli kalabilir; fakat karakterin ilişki ve seçimi sonuçlanmalı.",
    workspace: [
      "Kanıt çizelgesi: olay, tanık, fiziksel iz ve alternatif açıklamayı birlikte yaz.",
      "Kural listesi: olgu ne zaman görünür, kim etkilenir, neyi yapamaz?",
      "İnanç haritası: karakterlerin yorumlarının hangi olayla değiştiğini izle.",
    ],
    draftAvoid: "Her çözümsüz problemi yeni bir doğaüstü yetenekle kapatma.",
    draftFinish: "Taslağı karakterin olgunun varlığı veya anlamı hakkında geri dönülmez bir seçim yaptığı ana kadar tamamla.",
    finalFormat: "Kanıt sırası, tarih, tanık bilgisi ve tekrar eden paranormal kuralların tutarlılığını kontrol et.",
    finalReader: "Okur hangi kanıtların gerçekten görüldüğünü ve hangilerinin yorum olduğunu ayırt edebilmeli.",
    outputCore: "Normal düzen + paranormal sapma + tekrar kuralı + karakter bağı + bedeli tek cümlede yaz.",
    outputPlan: "İnanç ile şüphe arasındaki dengeyi değiştiren beş kanıt anı çıkar.",
    outputScene: "Aynı olayı iki makul açıklamaya açık bırakacak kısa sahne yaz.",
    outputRevision: "Sınırsız çalışan bir doğaüstü yeteneği seç ve net sınır getir.",
  },
  "post-apokaliptik": {
    idea: [
      "Felaketten önce 'sonra ne kaldı?' sorusunu sor; hangi altyapı, bilgi ve ilişki parçaları yaşamı yeniden kurmayı mümkün kılıyor?",
      "Kaynak kıtlığını yalnız açlık olarak düşünme; ilaç, güven, bilgi, enerji, doğurgan toprak veya uzmanlık da kıt olabilir.",
      "Toplulukların farklı yeniden kurma ilkeleri geliştirmesine izin ver; hayatta kalma ile nasıl yaşanacağı aynı soru değildir.",
    ],
    contrast: [
      { title: "Post-apokaliptik ≠ felaket filmi", text: "Tür çoğu zaman yıkım anından çok sonrasında insanların düzen, kaynak ve anlamı nasıl yeniden kurduğunu inceler." },
      { title: "Post-apokaliptik ≠ distopya", text: "Distopyada işleyen baskıcı sistem merkezde olabilir; post-apokaliptikte kurumların çöküşü ve yeniden kuruluşu daha temel bir motordur." },
    ],
    plan: "Felaket türü, hayatta kalan altyapı, kıt kaynak, bilgi kaybı, topluluk kuralları ve yeni tehditleri aynı dünya dosyasında kur.",
    scene: "Her yolculuk veya çatışma, kaynak hesabını ve topluluklar arasındaki değer farkını görünür kılmalı.",
    draft: "İlk taslakta sürekli çatışma yaratmak yerine bakım, onarım, yiyecek üretimi ve karar alma gibi gündelik yeniden kurma işlerini göster.",
    revise: "Revizyonda kaynakların sihirli biçimde tükenip çoğalmasını, lojistik boşlukları ve topluluk kurallarının sonuçsuz kalmasını düzelt.",
    finish: "Final yalnız hayatta kalmayı değil karakterin nasıl bir düzen içinde yaşamak istediğine dair seçimini göstermeli.",
    workspace: [
      "Kaynak envanteri: yiyecek, su, ilaç, enerji, araç ve uzmanlık miktarını takip et.",
      "Harita: güvenli alan, tehlike, üretim ve ulaşım noktalarını işaretle.",
      "Topluluk sözleşmesi: her grubun paylaşım, ceza, bakım ve karar kurallarını yaz.",
    ],
    draftAvoid: "Karakterlerin ihtiyaç duyduğu malzemeyi sahne gerektirdiğinde tesadüfen buldurma.",
    draftFinish: "Taslağı ana kaynak veya topluluk krizinin çözülüp karakterin yeni düzen için taraf seçtiği noktaya kadar tamamla.",
    finalFormat: "Kaynak miktarı, rota, nüfus, zaman ve altyapı durumundaki sürekliliği kontrol et.",
    finalReader: "Okur bu insanların nasıl hayatta kaldığını ve hangi toplumsal bedellerle yeni düzen kurduğunu anlayabilmeli.",
    outputCore: "Felaket sonrası durum + kıt kaynak + topluluk çatışması + karakter hedefi + yeni düzen seçimini tek cümlede yaz.",
    outputPlan: "Kaynak, yolculuk ve topluluk kararlarının birbirini etkilediği altı aşama çıkar.",
    outputScene: "Hayatta kalma işi ile ahlaki seçimin aynı anda çalıştığı bir paylaşım sahnesi yaz.",
    outputRevision: "Lojistik olarak kolaylaştırdığın bir bölümü seç ve gerçek kaynak hesabıyla düzelt.",
  },
};

function build(seed: Seed, label: string, projectName: string): FictionPedagogyParity {
  return {
    ideaHeading: `${label} fikri nereden gelir?`,
    ideaIntro: "İlhamı beklemek yerine türün kendi motorunu kullan. Aşağıdaki başlangıç yollarından biri tek cümlelik çekirdeğe dönüşebilir.",
    ideaItems: [
      { title: "Gözlem / sorun", text: seed.idea[0] },
      { title: "Kural / karşıtlık", text: seed.idea[1] },
      { title: "Karakter / sonuç", text: seed.idea[2] },
    ],
    contrastHeading: `${label} hangi komşu türlerden ayrılır?`,
    contrastItems: seed.contrast,
    routeHeading: `${label} eserini fikirden bitmiş taslağa götür`,
    routeIntro: "Bu rota türün kendi tekniğini, ilk taslak disiplinini ve final hazırlığını aynı üretim zincirinde tutar.",
    routeItems: [
      { title: "1 · Çekirdeği kur", text: seed.outputCore },
      { title: "2 · Plan dosyasını aç", text: seed.plan },
      { title: "3 · Sahne motorunu belirle", text: seed.scene },
      { title: "4 · İlk taslağı tamamla", text: seed.draft },
      { title: "5 · Türe göre revize et", text: seed.revise },
      { title: "6 · Bitmiş eser ölçütünü karşıla", text: seed.finish },
    ],
    workspaceHeading: `${label} için yazım ve çalışma düzeni`,
    workspaceIntro: "Görsel olmasa da öğrenci hangi dosyaları, notları ve süreklilik kayıtlarını tutacağını bilmelidir.",
    workspaceItems: [
      { title: "Ana çalışma dosyası", text: seed.workspace[0] },
      { title: "Süreklilik / sistem kaydı", text: seed.workspace[1] },
      { title: "Kontrol dosyası", text: seed.workspace[2] },
    ],
    draftHeading: `${label} ilk taslağını nasıl yazmalısın?`,
    draftIntro: "İlk taslağın işi kusursuz cümle üretmek değil, türün dramatik motorunu baştan sona çalışır hâle getirmektir.",
    draftItems: [
      { title: "Yazarken öncelik", text: seed.draft },
      { title: "Şimdilik yapma", text: seed.draftAvoid },
      { title: "Taslak ne zaman biter?", text: seed.draftFinish },
    ],
    finalHeading: `${label} taslağını yayıma / paylaşmaya hazırlamadan önce`,
    finalIntro: "Önce yapıyı ve türe özgü tutarlılığı kapat; en son biçim ve son okuma turuna geç.",
    finalItems: [
      { title: "Türe özgü son kontrol", text: seed.revise },
      { title: "Biçim ve süreklilik", text: seed.finalFormat },
      { title: "İlk okur testi", text: seed.finalReader },
      { title: "Tamamlama kararı", text: seed.finish },
    ],
    outputsHeading: "Şimdi sen yap — bu sayfadan çıkmadan 4 çıktı üret",
    outputsIntro: `${projectName} örneğini okumak yetmez. Aynı adımları kendi ${label.toLocaleLowerCase("tr-TR")} eserin için uygula.`,
    outputItems: [
      { title: "1 · Tek cümlelik çekirdek", text: seed.outputCore },
      { title: "2 · Plan çıktısı", text: seed.outputPlan },
      { title: "3 · İlk sahne", text: seed.outputScene },
      { title: "4 · Revizyon notu", text: seed.outputRevision },
    ],
  };
}

export function getFictionPedagogyParity(slug: string, label: string, projectName: string) {
  const seed = seeds[slug];
  if (!seed) throw new Error(`Fiction pedagogy parity missing: ${slug}`);
  return build(seed, label, projectName);
}

export const fictionPedagogyParitySlugs = Object.freeze(Object.keys(seeds));
