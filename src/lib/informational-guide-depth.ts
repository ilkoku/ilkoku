import type { GuideItem } from "@/lib/education-guide-batch";

export type InformationalExtraSection = {
  id: string;
  type: "text" | "cards" | "steps";
  heading: string;
  intro?: string;
  body?: string;
  items?: GuideItem[];
};

const depth: Record<string, InformationalExtraSection[]> = {
  tarih: [
    { id: "kaynak-elestirisi", type: "cards", heading: "Tarih yazısında kaynağı yalnız bulma; sorgula", intro: "Her belge aynı ağırlıkta kanıt değildir.", items: [
      { title: "Kaynağın üreticisi", text: "Belgeyi kim, hangi amaçla ve hangi koşulda üretti?" },
      { title: "Yakınlık", text: "Kaynak olayla ne kadar zaman ve mekân yakınlığı taşıyor?" },
      { title: "Çıkar ve sessizlik", text: "Kaynak neyi vurguluyor, neyi söylemiyor ve bundan kim yararlanıyor?" },
      { title: "Çapraz doğrulama", text: "Tek belgeyi farklı türde bağımsız kaynaklarla sınamadan kesin hükme dönüştürme." },
    ]},
    { id: "anakronizm", type: "cards", heading: "Geçmişe bugünün kavramlarını zorla taşıma", items: [
      { title: "Kavram tarihi", text: "Bugün kullandığın sözcüğün o dönemde aynı anlamı taşıyıp taşımadığını kontrol et." },
      { title: "Kurumsal bağlam", text: "Devlet, aile, sınıf, din veya vatandaşlık gibi kurumların dönemsel biçimini açıkla." },
      { title: "Sonucu bilme yanılgısı", text: "Tarihsel aktörlerin geleceği bildiği varsayımıyla kararlarını değerlendirme." },
    ]},
    { id: "kronoloji-nedensellik", type: "steps", heading: "Kronolojiyi nedensellik sanma", items: [
      { title: "Önce sıralama", text: "Olayları güvenilir tarihlerle yerleştir." },
      { title: "Sonra mekanizma", text: "A olayından B olayına hangi kurum, karar veya maddi koşul üzerinden geçildiğini göster." },
      { title: "Alternatif neden", text: "Aynı sonucu açıklayabilecek başka etkenleri metinde tartış." },
    ]},
    { id: "nicel-tarih", type: "cards", heading: "Rakamları dönem ve ölçüm sistemiyle birlikte ver", items: [
      { title: "Birim", text: "Para, nüfus, fiyat ve alan ölçülerinin dönemsel birimini açıklamadan bugünkü karşılığa çevirme." },
      { title: "Seri tutarlılığı", text: "Farklı yılların verileri aynı tanım ve kapsama mı sahip kontrol et." },
      { title: "Belirsizlik", text: "Tahminî veya eksik serileri kesin sayı gibi sunma." },
    ]},
    { id: "etik-temsil", type: "cards", heading: "Şiddet, topluluk ve travma anlatımında temsil sorumluluğu", items: [
      { title: "İnsanlaştır", text: "İnsanları yalnız sayı veya kurban kategorisine indirgeme." },
      { title: "Sansasyon sınırı", text: "Şiddet ayrıntısını merak uyandırmak için gereksizce büyütme." },
      { title: "Adlandırma", text: "Toplulukları dönemin ve kaynağın dilini açıklayarak, aşağılayıcı ifadeleri bağlamlandırarak aktar." },
    ]},
  ],
  felsefe: [
    { id: "arguman-haritasi", type: "steps", heading: "Felsefi argümanı öncül–sonuç haritasına çevir", items: [
      { title: "İddiayı ayır", text: "Metindeki ana sonucu tek cümleye indir." },
      { title: "Öncülleri çıkar", text: "Sonucu taşıyan varsayımları ve ara sonuçları sırala." },
      { title: "Bağlantıyı sınay", text: "Öncüller doğru olsa sonuç gerçekten takip ediyor mu kontrol et." },
    ]},
    { id: "kavram-tanimi", type: "cards", heading: "Kavramları tartışmadan önce kullanımını sabitle", items: [
      { title: "Çalışma tanımı", text: "Özgürlük, adalet veya bilinç gibi kavramı bu metinde hangi anlamda kullandığını belirt." },
      { title: "Rakip tanım", text: "Aynı kavramın güçlü alternatif kullanımını dürüstçe göster." },
      { title: "Sınır örneği", text: "Tanımın zorlandığı karşı örneği test et." },
    ]},
    { id: "itiraz-ve-cevap", type: "steps", heading: "En güçlü itirazı kendin kur", items: [
      { title: "Karşı görüşü güçlendir", text: "Zayıf karikatür yerine rakibin kabul edeceği en güçlü biçimi yaz." },
      { title: "Cevap türünü seç", text: "İtirazı reddediyor, sınırlandırıyor veya tezin kapsamını mı daraltıyorsun?" },
      { title: "Kalan sorun", text: "Cevabından sonra hâlâ açık kalan noktayı gizleme." },
    ]},
    { id: "ornek-deneyi", type: "cards", heading: "Düşünce deneyini kanıt yerine araç olarak kullan", items: [
      { title: "Amaç", text: "Örneğin hangi sezgiyi veya kavramsal ayrımı test ettiğini açıkla." },
      { title: "Varsayım", text: "Senaryonun sonucu önceden belirleyen gizli varsayımlarını göster." },
      { title: "Gerçek dünya", text: "Düşünce deneyinin ampirik iddia üretmediğini gerektiğinde belirt." },
    ]},
  ],
  psikoloji: [
    { id: "kanıt-hiyerarsisi", type: "cards", heading: "Psikoloji yazısında kanıt türlerini ayır", items: [
      { title: "Meta-analiz / derleme", text: "Tek çalışmadan daha geniş tablo verir; kapsam ve heterojenliği yine kontrol et." },
      { title: "Deney / gözlem", text: "Nedensellik gücü tasarıma bağlıdır; korelasyonu neden gibi yazma." },
      { title: "Vaka / anekdot", text: "İnsan deneyimini gösterebilir ama genelleme kanıtı değildir." },
    ]},
    { id: "tani-siniri", type: "cards", heading: "Bilgilendirici metni tanı koyan dile dönüştürme", items: [
      { title: "Belirti ≠ tanı", text: "Tek davranışı ruhsal bozukluk etiketiyle eşitleme." },
      { title: "Uzman değerlendirmesi", text: "Tanı ve tedavi kararlarının klinik değerlendirme gerektirdiğini açık tut." },
      { title: "Kişiye özel öneri", text: "Okura özel tedavi, ilaç veya tanı talimatı vermekten kaçın." },
    ]},
    { id: "istatistik-etki", type: "cards", heading: "İstatistiksel anlamlılık ile gerçek etkiyi ayır", items: [
      { title: "Etki büyüklüğü", text: "Yalnız p değerini değil etkinin büyüklüğünü ve belirsizliğini aktar." },
      { title: "Örneklem", text: "Yaş, kültür ve seçilim sınırlarını genelleme cümlesine yansıt." },
      { title: "Tekrarlanabilirlik", text: "Tek çalışmayı yerleşik gerçek diye sunmadan önce tekrar ve derlemelere bak." },
    ]},
    { id: "damgalama-dili", type: "cards", heading: "Ruh sağlığı konusunda damgalayıcı dilden kaçın", items: [
      { title: "Kişi önce", text: "İnsanı tanısıyla özdeşleştiren genellemelerden kaçın." },
      { title: "Şiddet varsayımı", text: "Ruhsal durum ile tehlikeliliği kanıtsız biçimde bağlama." },
      { title: "Kesinlik", text: "Karmaşık davranışları tek nedene indirgeme." },
    ]},
    { id: "kriz-guvenligi", type: "cards", heading: "Kriz ve kendine zarar konularında güvenlik katmanı kur", items: [
      { title: "Yöntem ayrıntısı verme", text: "Zarar verme yöntemlerini öğretici veya özendirici ayrıntıyla aktarma." },
      { title: "Yardım yönü", text: "Kriz içeriğinde profesyonel ve acil destek yollarını görünür tut." },
      { title: "Romantize etme", text: "Acıyı estetik başarı veya kaçınılmaz kader gibi sunma." },
    ]},
    { id: "guncellik", type: "steps", heading: "Psikoloji içeriğini güncellik damgasıyla yönet", items: [
      { title: "Kılavuz tarihi", text: "Tanı sınıflandırması ve klinik rehberlerin sürümünü kaydet." },
      { title: "Kaynak tarihi", text: "Hızla değişen bulgularda eski kaynakla güncel uzlaşıyı karıştırma." },
      { title: "Revizyon tarihi", text: "Yayımlanan metne düzenli yeniden kontrol tarihi koy." },
    ]},
  ],
  sosyoloji: [
    { id: "olcek-katmani", type: "cards", heading: "Bireysel örnek ile yapısal iddiayı ayır", items: [
      { title: "Mikro", text: "Birey ve küçük grup deneyimini göster." },
      { title: "Mezo", text: "Kurum, örgüt ve ağ düzeyini ayrı analiz et." },
      { title: "Makro", text: "Sınıf, devlet, ekonomi ve kültürel yapı iddialarını geniş veriyle destekle." },
    ]},
    { id: "kategori-insasi", type: "cards", heading: "Toplumsal kategorilerin nasıl tanımlandığını açıkla", items: [
      { title: "Operasyonel tanım", text: "Araştırmada kategori nasıl ölçülmüş veya sınıflanmış?" },
      { title: "Tarihsel değişim", text: "Kategori zaman ve toplum arasında aynı kalmayabilir." },
      { title: "Özdeşlik sınırı", text: "Araştırma etiketini insanların kendi kimliğiyle otomatik eşitleme." },
    ]},
    { id: "veri-temsil", type: "cards", heading: "Oran, ortalama ve dağılımı birbirine karıştırma", items: [
      { title: "Payda", text: "Yüzdenin hangi toplam üzerinden hesaplandığını belirt." },
      { title: "Dağılım", text: "Ortalamanın içindeki büyük farklılıkları görünmez kılma." },
      { title: "Karşılaştırılabilirlik", text: "Farklı veri setlerinin tanım ve örneklem farklarını açıkla." },
    ]},
    { id: "saha-etigi", type: "cards", heading: "Saha gözlemi ve anlatıda etik mesafe", items: [
      { title: "Onam", text: "Özel ortam ve kişisel anlatıları yayımlarken onam sınırını düşün." },
      { title: "Anonimlik", text: "Küçük topluluklarda isim silmenin tek başına anonimlik sağlamayabileceğini hesaba kat." },
      { title: "Temsil", text: "Bir kişiyi tüm grubun sözcüsü gibi sunma." },
    ]},
    { id: "nedensellik", type: "steps", heading: "Toplumsal ilişkilerde tek nedenli açıklamadan kaçın", items: [
      { title: "İlişkiyi göster", text: "Birlikte değişen unsurları önce tanımla." },
      { title: "Mekanizmayı ara", text: "İki değişkeni bağlayan kurum veya süreç ne?" },
      { title: "Rakip açıklama", text: "Üçüncü değişken ve ters nedensellik olasılığını tartış." },
    ]},
  ],
  "kisisel-gelisim": [
    { id: "kanıt-iddia", type: "cards", heading: "Kişisel deneyimi evrensel yöntem gibi sunma", items: [
      { title: "Anekdot", text: "Sende işe yarayan şeyi deneyim olarak adlandır; herkes için kanıt sayma." },
      { title: "Araştırma", text: "Bilimsel iddia kuruyorsan doğrudan ve uygun kaynak kullan." },
      { title: "Koşul", text: "Yöntemin kimde, hangi şartlarda işe yaramayabileceğini belirt." },
    ]},
    { id: "hedef-davranis", type: "steps", heading: "Motivasyon cümlesini uygulanabilir davranışa çevir", items: [
      { title: "Davranışı tanımla", text: "‘Daha disiplinli ol’ yerine gözlenebilir eylem yaz." },
      { title: "Tetikleyici", text: "Eylemin hangi ortam veya zamanda başlayacağını belirle." },
      { title: "Geri bildirim", text: "İlerlemenin nasıl ölçüleceğini basit biçimde göster." },
    ]},
    { id: "sinir-ve-uzmanlik", type: "cards", heading: "Koçluk dili ile sağlık, hukuk ve finans uzmanlığını ayır", items: [
      { title: "Ruh sağlığı", text: "Klinik belirti ve krizleri irade eksikliği gibi çerçeveleme." },
      { title: "Finans", text: "Kişisel gelişim ilkelerini yatırım sonucu garantisi gibi sunma." },
      { title: "Sağlık", text: "Tıbbi durumlarda profesyonel değerlendirme gerektiren sınırı belirt." },
    ]},
    { id: "suc-ve-utanc", type: "cards", heading: "Okuru suçluluk ve utançla yönetme", items: [
      { title: "Yapısal koşul", text: "Her sonucu yalnız kişisel iradeye bağlama." },
      { title: "Gerçekçi hedef", text: "Başarısızlığı ahlaki kusur gibi yazma." },
      { title: "Seçenek", text: "Tek doğru yaşam biçimi ilan etmek yerine alternatif yollar göster." },
    ]},
    { id: "uygulama-testi", type: "steps", heading: "Öneriyi yayımlamadan küçük uygulama testine sok", items: [
      { title: "Talimatı uygula", text: "Kendi yazdığın adımları dışarıdan biri gibi dene." },
      { title: "Sürtünmeyi kaydet", text: "Belirsiz veya uygulanamaz adımları işaretle." },
      { title: "İstisnayı ekle", text: "Yöntemin çalışmadığı koşulu metinde görünür kıl." },
    ]},
  ],
  "is-dunyasi": [
    { id: "vaka-kaniti", type: "cards", heading: "Şirket hikâyesini iş kanıtı gibi kullanırken sınır koy", items: [
      { title: "Seçilim yanlılığı", text: "Başarılı örnekleri görüp başarısız benzerleri unutma." },
      { title: "Bağlam", text: "Sektör, dönem, ölçek ve sermaye koşullarını belirt." },
      { title: "Nedensellik", text: "Sonucu tek bir yönetim uygulamasına bağlamadan alternatif nedenleri tartış." },
    ]},
    { id: "metrik", type: "cards", heading: "İş metriğini tanımıyla birlikte kullan", items: [
      { title: "Tanım", text: "Büyüme, verimlilik veya kârlılık hangi formülle ölçülüyor?" },
      { title: "Dönem", text: "Aylık, yıllık ve kümülatif değerleri karıştırma." },
      { title: "Karşılaştırma", text: "Farklı şirket metriklerinin aynı muhasebe ve kapsam mantığına sahip olup olmadığını kontrol et." },
    ]},
    { id: "calisan-etigi", type: "cards", heading: "İnsan yönetimi yazısında çalışanı yalnız kaynak olarak görme", items: [
      { title: "Mahremiyet", text: "Çalışan vakalarını anonimleştir ve gereksiz kişisel bilgiyi çıkar." },
      { title: "Güç ilişkisi", text: "Yönetici önerisinin çalışan üzerinde baskı yaratabileceğini hesaba kat." },
      { title: "Haklar", text: "Yönetim pratiğini hukuk ve temel çalışma haklarından bağımsız sunma." },
    ]},
    { id: "uygulanabilirlik", type: "steps", heading: "İş önerisini bağlama göre uygulanabilir hale getir", items: [
      { title: "Ölçek", text: "Küçük işletme ile çok uluslu yapı için aynı reçeteyi verme." },
      { title: "Kaynak", text: "Önerinin zaman, bütçe ve insan kaynağı maliyetini belirt." },
      { title: "Başarı ölçütü", text: "Uygulamanın işe yarayıp yaramadığını hangi göstergeyle anlayacağını yaz." },
    ]},
  ],
  girisimcilik: [
    { id: "problem-dogrulama", type: "steps", heading: "Fikri değil problemi doğrula", items: [
      { title: "Kullanıcı", text: "Sorunu yaşayan somut kullanıcı grubunu tanımla." },
      { title: "Mevcut çözüm", text: "İnsanların bugün bu sorunu nasıl çözdüğünü araştır." },
      { title: "Ödeme / davranış", text: "Beğeni yerine gerçek davranış veya ödeme sinyali ara." },
    ]},
    { id: "birim-ekonomi", type: "cards", heading: "Büyüme hikâyesinin altına birim ekonomiyi koy", items: [
      { title: "Gelir birimi", text: "Müşteri veya işlem başına gerçek geliri tanımla." },
      { title: "Maliyet", text: "Edinme, üretim, hizmet ve destek maliyetlerini ayır." },
      { title: "Nakit", text: "Kârlılık ile nakit akışının aynı şey olmadığını göster." },
    ]},
    { id: "pazar-verisi", type: "cards", heading: "Pazar büyüklüğünü afiş rakamıyla değil yöntemle açıkla", items: [
      { title: "TAM / SAM / SOM", text: "Toplam pazar ile erişilebilir gerçek pazarı ayır." },
      { title: "Kaynak tarihi", text: "Hızla değişen pazarlarda verinin yılını görünür kıl." },
      { title: "Varsayım", text: "Kendi hesapladığın pazar tahmininin varsayımlarını açıkla." },
    ]},
    { id: "basarisizlik", type: "cards", heading: "Başarı kadar başarısızlık mekanizmasını da öğret", items: [
      { title: "Hayatta kalan yanlılığı", text: "Yalnız ünlü başarı hikâyelerinden evrensel kural çıkarma." },
      { title: "Pivot", text: "Değişimin hangi veriye dayanarak yapıldığını göster." },
      { title: "Kapanış", text: "Bir girişimin ne zaman durdurulmasının rasyonel olabileceğini de tartış." },
    ]},
    { id: "hukuki-finansal-sinir", type: "cards", heading: "Girişim rehberini hukuk ve yatırım tavsiyesiyle karıştırma", items: [
      { title: "Şirket yapısı", text: "Ülkeye özgü kuruluş ve vergi süreçlerinde güncel profesyonel kaynağa yönlendir." },
      { title: "Yatırım", text: "Fonlama sonuçlarını garanti diliyle anlatma." },
      { title: "Sözleşme", text: "Örnekleri eğitim amaçlı çerçevele; özel durum için hukuki danışmanlık sınırını belirt." },
    ]},
  ],
  finans: [
    { id: "veri-kaynagi", type: "cards", heading: "Finans rakamında kaynak, tarih ve para birimini birlikte ver", items: [
      { title: "Tarih", text: "Fiyat, faiz, kur ve getiri verisinin hangi tarihe ait olduğunu açıkça yaz." },
      { title: "Nominal / reel", text: "Enflasyon etkisini içerip içermediğini belirt." },
      { title: "Brüt / net", text: "Vergi, ücret ve maliyet sonrası değeri brüt sonuçla karıştırma." },
    ]},
    { id: "risk-getiri", type: "cards", heading: "Getiriyi riskten koparma", items: [
      { title: "Volatilite", text: "Dalgalanma ve kalıcı kayıp riskini ayrı düşün." },
      { title: "Likidite", text: "Paraya erişim süresi ve satış maliyetini hesaba kat." },
      { title: "Yoğunlaşma", text: "Tek varlık veya tek senaryoya bağlı riski görünür kıl." },
    ]},
    { id: "gecmis-performans", type: "cards", heading: "Geçmiş performansı gelecek garantisi gibi yazma", items: [
      { title: "Dönem seçimi", text: "Sonucu iyi gösteren başlangıç-bitiş tarihini seçmeci kullanma." },
      { title: "Karşılaştırma ölçütü", text: "Uygun benchmark olmadan başarı iddiası kurma." },
      { title: "Belirsizlik", text: "Senaryo ile tahmini kesin sonuçtan ayır." },
    ]},
    { id: "tavsiye-siniri", type: "cards", heading: "Eğitim içeriği ile kişiye özel finansal tavsiyeyi ayır", items: [
      { title: "Profil", text: "Okurun gelir, borç, vade ve risk kapasitesini bilmeden kesin yatırım talimatı verme." },
      { title: "Ürün tanıtımı", text: "Çıkar çatışması ve sponsorluk varsa açıkça belirt." },
      { title: "Mevzuat", text: "Yatırım hizmetleri ve tavsiye kurallarının ülkeye göre değiştiğini belirt." },
    ]},
    { id: "hesaplama-seffafligi", type: "steps", heading: "Finans hesabını okurun tekrar edebileceği biçimde göster", items: [
      { title: "Formül", text: "Kullandığın hesaplama mantığını açıkla." },
      { title: "Varsayım", text: "Faiz, süre, enflasyon veya büyüme varsayımlarını tek tek yaz." },
      { title: "Duyarlılık", text: "Ana varsayım değişince sonucun nasıl değiştiğini en az bir alternatif senaryoyla göster." },
    ]},
    { id: "guncelleme", type: "steps", heading: "Finans içeriğine son kullanma tarihi koy", items: [
      { title: "Veri kontrolü", text: "Yayın öncesi oran, mevzuat ve ürün koşullarını yeniden doğrula." },
      { title: "Güncelleme damgası", text: "Metnin son kontrol tarihini görünür tut." },
      { title: "Eski içerik", text: "Geçerliliğini yitiren rakamları sessizce bırakma; güncelle veya arşiv etiketi ekle." },
    ]},
  ],
  ekonomi: [
    { id: "gosterge-tanimi", type: "cards", heading: "Ekonomik göstergeyi tanım ve metodolojiyle birlikte kullan", items: [
      { title: "Nominal / reel", text: "Fiyat etkisini ayırmadan büyüme karşılaştırması yapma." },
      { title: "Mevsimsellik", text: "Aylık veride mevsim düzeltilmiş ve ham seriyi karıştırma." },
      { title: "Revizyon", text: "İstatistik kurumlarının geçmiş verileri revize edebileceğini belirt." },
    ]},
    { id: "korelasyon-nedensellik", type: "steps", heading: "Makro ilişkide nedensellik iddiasını yavaşlat", items: [
      { title: "Birlikte hareket", text: "Önce verilerin gerçekten birlikte hareket edip etmediğini göster." },
      { title: "Mekanizma", text: "İlişkinin hangi ekonomik kanal üzerinden çalışacağını açıkla." },
      { title: "Rakip açıklama", text: "Politika, dış şok veya üçüncü değişken olasılığını tartış." },
    ]},
    { id: "dagilim", type: "cards", heading: "Ortalama ekonomi ile hane deneyimini aynı sayma", items: [
      { title: "Gelir grubu", text: "Ortalama etkinin farklı gruplarda değişebileceğini göster." },
      { title: "Bölge", text: "Ulusal verinin yerel farklılıkları gizleyebileceğini belirt." },
      { title: "Sektör", text: "Tek bir sektörün hareketini tüm ekonomi gibi sunma." },
    ]},
    { id: "tahmin-senaryo", type: "cards", heading: "Tahmin ile senaryoyu açık etiketle", items: [
      { title: "Merkez senaryo", text: "En olası varsayımları açıkla." },
      { title: "Risk senaryosu", text: "Ana varsayımlar bozulduğunda yönün nasıl değişebileceğini göster." },
      { title: "Güven aralığı", text: "Tek sayı yerine belirsizliği mümkün olduğunda nicel veya nitel ver." },
    ]},
    { id: "veri-tarihi", type: "steps", heading: "Ekonomi yazısını veri takvimiyle güncel tut", items: [
      { title: "Yayın tarihi", text: "Kullandığın göstergenin son açıklanma tarihini kaydet." },
      { title: "Kesim tarihi", text: "Metindeki bütün verilerin hangi tarihe kadar güncel olduğunu belirt." },
      { title: "Revizyon planı", text: "Yeni veri geldiğinde hangi tabloların ve cümlelerin yeniden kontrol edileceğini not et." },
    ]},
  ],
  teknoloji: [
    { id: "surum-ve-tarih", type: "cards", heading: "Teknoloji içeriğinde sürüm ve tarihi görünür kıl", items: [
      { title: "Sürüm", text: "Ürün, işletim sistemi, protokol veya API sürümünü belirt." },
      { title: "Test tarihi", text: "Davranışı ne zaman doğruladığını kaydet." },
      { title: "Değişebilirlik", text: "Hızla değişen özellikleri kalıcı gerçek gibi yazma." },
    ]},
    { id: "mimari-katman", type: "cards", heading: "Kullanıcı deneyimi ile altyapı iddiasını ayır", items: [
      { title: "Arayüz", text: "Kullanıcının gördüğü davranışı tanımla." },
      { title: "Sistem", text: "Arka plandaki mekanizmayı kaynak yoksa kesinmiş gibi tahmin etme." },
      { title: "Tedarikçi", text: "Üretici iddiasını bağımsız test sonucu gibi sunma." },
    ]},
    { id: "guvenlik", type: "cards", heading: "Teknoloji rehberinde güvenlik ve mahremiyet katmanı kur", items: [
      { title: "Yetki", text: "Kullanıcıya gereksiz geniş erişim izni önermemeye dikkat et." },
      { title: "Veri", text: "Hangi verinin toplandığını ve nereye gittiğini açıklayabildiğin kadar açıkla." },
      { title: "Riskli adım", text: "Güvenliği zayıflatan geçici çözümleri normal öneri gibi verme." },
    ]},
    { id: "benchmark", type: "steps", heading: "Performans karşılaştırmasını tekrarlanabilir yap", items: [
      { title: "Ortam", text: "Donanım, ağ, yazılım ve test koşullarını yaz." },
      { title: "Metodoloji", text: "Hangi ölçümü nasıl aldığını açıkla." },
      { title: "Tekrar", text: "Tek ölçüm yerine değişkenliği gösterecek tekrarlar kullan." },
    ]},
    { id: "kaynak-hiyerarsisi", type: "cards", heading: "Teknik iddiada birincil kaynağı öncele", items: [
      { title: "Resmî dokümantasyon", text: "Özellik ve sınır için ilk başvuru kaynağıdır." },
      { title: "Standart / RFC", text: "Protokol davranışında normatif metni blog özetinden ayır." },
      { title: "Bağımsız test", text: "Üretici performans iddiasını gerçek kullanım testiyle karşılaştır." },
    ]},
  ],
  "yapay-zeka": [
    { id: "model-surum", type: "cards", heading: "Yapay zekâ içeriğinde model, sürüm ve tarih üçlüsünü yaz", items: [
      { title: "Model", text: "Hangi model veya sistem hakkında konuştuğunu açıkça belirt." },
      { title: "Sürüm / erişim", text: "Aynı ürün adının farklı sürüm ve planlarda değişebileceğini hesaba kat." },
      { title: "Test tarihi", text: "Davranışın zamanla değişebileceği için gözlem tarihini kaydet." },
    ]},
    { id: "benchmark-gerceklik", type: "cards", heading: "Benchmark sonucunu gerçek kullanım başarısı gibi sunma", items: [
      { title: "Veri seti", text: "Testin neyi ölçtüğünü ve neyi ölçmediğini açıkla." },
      { title: "Kontaminasyon", text: "Modelin değerlendirme verisini görmüş olma olasılığını hesaba kat." },
      { title: "Görev uyumu", text: "Laboratuvar metriği ile kullanıcının gerçek görevini eşitleme." },
    ]},
    { id: "halusinasyon-dogrulama", type: "steps", heading: "Model çıktısını kaynak yerine taslak kabul et", items: [
      { title: "İddiaları ayır", text: "Doğrulanabilir olguları metinden çıkar." },
      { title: "Birincil kaynak", text: "Her kritik olguyu bağımsız ve güvenilir kaynaktan kontrol et." },
      { title: "Belirsizliği işaretle", text: "Doğrulayamadığın bilgiyi kesin cümleye dönüştürme." },
    ]},
    { id: "veri-mahremiyet", type: "cards", heading: "Prompt ve veri kullanımında mahremiyet sınırı koy", items: [
      { title: "Kişisel veri", text: "Gerekmedikçe tanımlayıcı kişisel bilgiyi modele yüklemeyi önermemelisin." },
      { title: "Kurumsal sır", text: "Gizli belge ve müşteri verisinde kurum politikasını ve sağlayıcı şartlarını kontrol et." },
      { title: "Saklama", text: "Verinin nasıl saklandığına dair güncel sağlayıcı politikasını kaynakla." },
    ]},
    { id: "etik-yanlilik", type: "cards", heading: "Yapay zekâ hatasını yalnız teknik hata olarak görme", items: [
      { title: "Yanlılık", text: "Farklı gruplarda hata oranlarının değişebileceğini tartış." },
      { title: "Otomasyon etkisi", text: "İnsanların sistem çıktısına gereğinden fazla güvenebileceğini hesaba kat." },
      { title: "Sorumluluk", text: "Karar yetkisini belirsiz biçimde modele devretme." },
    ]},
    { id: "hizli-guncelleme", type: "steps", heading: "AI rehberini yaşayan belge gibi yönet", items: [
      { title: "Kaynak kesim tarihi", text: "Dokümantasyon ve ürün davranışı için son kontrol tarihini yaz." },
      { title: "Tekrar test", text: "Önemli örnekleri sürüm değişiminde yeniden çalıştır." },
      { title: "Değişiklik notu", text: "Eski davranış geçersiz olduğunda revizyon kaydı tut." },
    ]},
  ],
  programlama: [
    { id: "calisan-ornek", type: "steps", heading: "Kod örneğini yayımlamadan gerçekten çalıştır", items: [
      { title: "Temiz ortam", text: "Örneği açıklanmamış yerel bağımlılıklardan arındırılmış ortamda dene." },
      { title: "Girdi / çıktı", text: "Okurun beklenen sonucu karşılaştırabilmesi için örnek girdi ve çıktıyı göster." },
      { title: "Hata yolu", text: "Yalnız mutlu yolu değil temel hata durumunu da test et." },
    ]},
    { id: "surum-bagimlilik", type: "cards", heading: "Dil, framework ve bağımlılık sürümlerini sabitle", items: [
      { title: "Dil sürümü", text: "Sözdiziminin hangi sürümde çalıştığını belirt." },
      { title: "Paket sürümü", text: "API değişikliğini önlemek için kullanılan sürümü kaydet." },
      { title: "Kurulum", text: "Okurun örneği çalıştırması için minimum kurulum bilgisini ver." },
    ]},
    { id: "guvenli-kod", type: "cards", heading: "Kolay örnek uğruna güvenliği bozma", items: [
      { title: "Girdi doğrulama", text: "Kullanıcı girdisini güvenilir kabul eden örnekleri uyarısız verme." },
      { title: "Sır yönetimi", text: "API anahtarı ve parola kod içine gömülmemeli." },
      { title: "Yetki", text: "Örneği gereksiz yönetici ayrıcalığıyla çalıştırmayı normalleştirme." },
    ]},
    { id: "karmaşıklık", type: "cards", heading: "Kodun yalnız ne yaptığını değil maliyetini de öğret", items: [
      { title: "Zaman", text: "Algoritmik maliyet önemliyse yaklaşık karmaşıklığı açıkla." },
      { title: "Bellek", text: "Büyük veri setinde bellek davranışını hesaba kat." },
      { title: "Bakım", text: "Kısa ama kırılgan hile ile okunabilir çözüm arasındaki farkı tartış." },
    ]},
    { id: "test-debug", type: "steps", heading: "Okura hata ayıklama yolu bırak", items: [
      { title: "Beklenen durum", text: "Doğru çalışmanın işaretlerini belirt." },
      { title: "Yaygın hata", text: "En sık görülen hata mesajını ve nedenini açıkla." },
      { title: "Doğrulama testi", text: "Okurun kendi çözümünü sınayabileceği küçük test ekle." },
    ]},
  ],
  hukuk: [
    { id: "yargi-alani", type: "cards", heading: "Hukuk içeriğinde ülke, tarih ve mevzuat sürümünü baştan yaz", items: [
      { title: "Yargı alanı", text: "Kuralın hangi ülke veya hukuk sistemine ait olduğunu belirt." },
      { title: "Yürürlük tarihi", text: "Maddenin veya düzenlemenin hangi tarihte geçerli olduğunu kontrol et." },
      { title: "Değişiklik", text: "Mülga, değişmiş veya geçici düzenlemeyi güncel kural gibi sunma." },
    ]},
    { id: "kaynak-hiyerarsisi", type: "cards", heading: "Hukuki iddiayı birincil kaynağa bağla", items: [
      { title: "Mevzuat", text: "Kanun, yönetmelik ve resmî düzenlemeyi ikincil özetten ayır." },
      { title: "İçtihat", text: "Kararın bağlayıcılık ve olay benzerliği sınırını belirt." },
      { title: "Doktrin", text: "Yorum ile pozitif hukuk kuralını aynı kesinlikte yazma." },
    ]},
    { id: "olay-uygulama", type: "steps", heading: "Genel kural ile somut olay uygulamasını ayır", items: [
      { title: "Kural", text: "Genel hukuki çerçeveyi kaynağıyla açıkla." },
      { title: "Unsurlar", text: "Kuralın uygulanması için gereken şartları sırala." },
      { title: "Belirsiz olay", text: "Somut olay bilgisi eksikse kesin sonuç yerine hangi bilginin gerekli olduğunu yaz." },
    ]},
    { id: "hukuki-tavsiye-siniri", type: "cards", heading: "Bilgilendirme ile kişiye özel hukuki tavsiyeyi ayır", items: [
      { title: "Genel eğitim", text: "Kural ve süreç açıklaması genel tutulabilir." },
      { title: "Somut hak kaybı", text: "Süre, dava, ceza veya sözleşme riski olan durumda profesyonel yardım sınırını açıkça belirt." },
      { title: "Belge görmeden sonuç", text: "Sözleşme veya dosya içeriğini görmeden kesin hüküm verme." },
    ]},
    { id: "sure-ve-usul", type: "cards", heading: "Süre ve usul bilgisini yüksek riskli veri olarak işle", items: [
      { title: "Başlangıç anı", text: "Sürenin hangi olaydan itibaren başladığını kaynakla." },
      { title: "İstisna", text: "Tatil, tebligat veya özel usul kuralı gibi istisnaları araştır." },
      { title: "Güncellik", text: "Süre bilgisini yayımdan hemen önce tekrar doğrula." },
    ]},
    { id: "ornek-guvenligi", type: "cards", heading: "Hukuki örneği gerçek kişi ve dosya güvenliğiyle yaz", items: [
      { title: "Anonimleştirme", text: "Kişiyi dolaylı olarak tanımlayan ayrıntıları da değerlendir." },
      { title: "Masumiyet", text: "İddia ile kesinleşmiş olguyu dilde ayır." },
      { title: "İtibar", text: "Gereksiz suçlayıcı ve kesin ifadelerden kaçın." },
    ]},
  ],
  egitim: [
    { id: "ogrenme-hedefi", type: "steps", heading: "Eğitim metnini ölçülebilir öğrenme hedefiyle başlat", items: [
      { title: "Davranış", text: "Okur bölüm sonunda ne yapabilecek?" },
      { title: "Koşul", text: "Bu beceriyi hangi araç veya bağlamda gösterecek?" },
      { title: "Başarı ölçütü", text: "Doğru yaptığını nasıl anlayacak?" },
    ]},
    { id: "bilissel-yuk", type: "cards", heading: "Bilgiyi çalışma belleğine göre parçalara ayır", items: [
      { title: "Ön bilgi", text: "Yeni kavramın dayandığı bilgiyi varsayıp geçme." },
      { title: "Parçalama", text: "Tek bölümde çok sayıda yeni kavramı üst üste bindirme." },
      { title: "Örnek", text: "Soyut açıklamadan hemen sonra somut uygulama ver." },
    ]},
    { id: "degerlendirme", type: "cards", heading: "Alıştırma ile öğrenme hedefini aynı çizgide tut", items: [
      { title: "Hatırlama", text: "Sadece tanım sorusu, uygulama becerisini ölçmez." },
      { title: "Uygulama", text: "Okurun bilgiyi yeni durumda kullanmasını iste." },
      { title: "Geri bildirim", text: "Yanlış cevabın neden yanlış olduğunu açıklayan geri bildirim tasarla." },
    ]},
    { id: "erisilebilirlik", type: "cards", heading: "Eğitim içeriğini farklı okurlar için erişilebilir kur", items: [
      { title: "Dil", text: "Gereksiz jargon ve uzun cümleyi azalt." },
      { title: "Görsel alternatifi", text: "Görsel bilgiye metinsel açıklama sağlayacak şekilde planla." },
      { title: "Örnek çeşitliliği", text: "Tek kültür veya tek öğrenen profilini varsayma." },
    ]},
    { id: "kanıt", type: "cards", heading: "Öğretim yöntemi iddiasını eğitim araştırmasıyla sınırla", items: [
      { title: "Moda yöntem", text: "Popüler pedagojik etiketi kanıt düzeyi olmadan mucize yöntem gibi sunma." },
      { title: "Bağlam", text: "Yaş, konu ve ortam değişince yöntemin etkisinin değişebileceğini belirt." },
      { title: "Kaynak", text: "Öğrenme etkisi iddiasında güvenilir derleme ve araştırmaları öncele." },
    ]},
  ],
  siyaset: [
    { id: "kaynak-taraf", type: "cards", heading: "Siyasi kaynakta taraf, çıkar ve birincillik bilgisini görünür kıl", items: [
      { title: "Birincil beyan", text: "Parti veya siyasetçinin kendi iddiasını bağımsız doğrulama gibi sunma." },
      { title: "Resmî veri", text: "Resmî istatistiğin tanım ve metodolojisini yine kontrol et." },
      { title: "Bağımsız kaynak", text: "Tartışmalı olguları mümkün olduğunda birden fazla bağımsız kaynaktan doğrula." },
    ]},
    { id: "olgu-yorum", type: "cards", heading: "Olgu, yorum ve değer yargısını dilde ayır", items: [
      { title: "Olgu", text: "Doğrulanabilir iddiayı kaynakla." },
      { title: "Yorum", text: "Neden-sonuç veya niyet çıkarımını analiz olarak etiketle." },
      { title: "Değer yargısı", text: "Normatif tercih ile ampirik iddiayı birbirine dönüştürme." },
    ]},
    { id: "anket-secim", type: "cards", heading: "Anket ve seçim verisini metodolojisiz kullanma", items: [
      { title: "Örneklem", text: "Kimlerin ve nasıl seçildiğini belirt." },
      { title: "Hata payı", text: "Tek puan farkını kesin üstünlük gibi sunma." },
      { title: "Soru etkisi", text: "Soru biçimi ve kararsız dağılımının sonucu değiştirebileceğini açıkla." },
    ]},
    { id: "adil-temsil", type: "cards", heading: "Karşı görüşü çarpıtmadan temsil et", items: [
      { title: "Güçlü sürüm", text: "Rakip görüşün en zayıf değil en ciddi gerekçesini aktar." },
      { title: "Asimetri", text: "Kanıt gücü eşit değilse yalnız biçimsel denge uğruna eşit ağırlık verme." },
      { title: "Dil", text: "Hakaret ve etiket yerine politika, karar ve kanıta odaklan." },
    ]},
    { id: "hizli-guncellik", type: "steps", heading: "Siyasi içeriği yayın anında yeniden doğrula", items: [
      { title: "Görev ve unvan", text: "Kişinin güncel görevini kontrol et." },
      { title: "Mevzuat / sonuç", text: "Oylama, seçim, karar veya yasa durumunun değişip değişmediğini doğrula." },
      { title: "Zaman damgası", text: "Hızla değişen metne güncelleme tarihi ekle." },
    ]},
    { id: "guvenlik-nefret", type: "cards", heading: "Şiddet ve nefret söylemini bağlamlandır", items: [
      { title: "Alıntı ekonomisi", text: "Zararlı söylemi gereğinden fazla tekrar etme." },
      { title: "Hedef grup", text: "İnsanları kimlikleri üzerinden insanlıktan çıkaran dili normalleştirme." },
      { title: "Şiddet", text: "Tehdit ve şiddet çağrısını haber değeri dışında büyütme veya teşvik edici biçimde sunma." },
    ]},
  ],
  iletisim: [
    { id: "hedef-kitle", type: "cards", heading: "İletişim önerisini hedef kitle ve bağlamla sınırla", items: [
      { title: "Kitle", text: "Aynı mesajın çalışan, müşteri, kamu ve uzman için farklı okunacağını hesaba kat." },
      { title: "Kanal", text: "E-posta, toplantı, sosyal medya ve kriz açıklamasının ritmi farklıdır." },
      { title: "Amaç", text: "Bilgilendirme, ikna ve ilişki kurma hedeflerini birbirine karıştırma." },
    ]},
    { id: "mesaj-mimarisi", type: "steps", heading: "Mesajı ana fikir → kanıt → eylem şeklinde kur", items: [
      { title: "Ana fikir", text: "Okurun tek cümlede ne anlaması gerektiğini belirle." },
      { title: "Kanıt", text: "İddiayı destekleyen örnek veya veriyi seç." },
      { title: "Eylem", text: "Okurdan ne yapmasını beklediğini açıklaştır." },
    ]},
    { id: "kriz-iletisimi", type: "cards", heading: "Kriz iletişiminde hız ile doğruluğu dengele", items: [
      { title: "Bilinen", text: "Doğrulanmış olguyu açıkça söyle." },
      { title: "Bilinmeyen", text: "Henüz doğrulanmayan noktayı gizleme veya tahminle doldurma." },
      { title: "Sonraki güncelleme", text: "Yeni bilginin ne zaman ve hangi kanaldan paylaşılacağını belirt." },
    ]},
    { id: "olcum", type: "cards", heading: "İletişim başarısını yalnız görüntülenmeyle ölçme", items: [
      { title: "Anlama", text: "Mesaj doğru anlaşılmış mı?" },
      { title: "Davranış", text: "İstenen eylem gerçekleşmiş mi?" },
      { title: "Güven", text: "Kısa vadeli tıklama uzun vadeli güveni zedeliyor mu?" },
    ]},
  ],
  sanat: [
    { id: "eser-gorme", type: "steps", heading: "Sanat yazısına yorumdan önce yakın bakış ekle", items: [
      { title: "Betimle", text: "Eserde gerçekten gördüğün biçim, malzeme ve düzeni yaz." },
      { title: "İlişkilendir", text: "Biçimsel tercihin deneyime etkisini açıkla." },
      { title: "Yorumla", text: "Anlam iddianı betimlenebilir ayrıntıya bağla." },
    ]},
    { id: "baglam", type: "cards", heading: "Eseri yalnız sanatçı biyografisiyle açıklama", items: [
      { title: "Dönem", text: "Üretim tarihindeki sanat ve toplum bağlamını araştır." },
      { title: "Malzeme", text: "Teknik ve maddi kısıtların biçime etkisini düşün." },
      { title: "Alımlama", text: "Eserin farklı dönemlerde farklı okunabileceğini belirt." },
    ]},
    { id: "niyet", type: "cards", heading: "Sanatçı niyeti ile eser etkisini ayır", items: [
      { title: "Niyet kaynağı", text: "Sanatçının kendi açıklaması varsa kaynakla." },
      { title: "Eser kanıtı", text: "Niyet beyanını eserin tek geçerli yorumu yapma." },
      { title: "Okur / izleyici", text: "Alımlamanın tarihsel ve kültürel değişimini hesaba kat." },
    ]},
    { id: "gorsel-haklar", type: "cards", heading: "Görsel kullanımı ve telif bilgisini metnin parçası yap", items: [
      { title: "Hak durumu", text: "Eser görselinin kullanım iznini kontrol et." },
      { title: "Kredi", text: "Sanatçı, eser, tarih, kurum ve görsel kaynağını uygun biçimde belirt." },
      { title: "Detay kırpma", text: "Görseli bağlamını bozacak biçimde kırpıyorsan bunu açıklamayı düşün." },
    ]},
  ],
  mimarlik: [
    { id: "olcek-plan", type: "cards", heading: "Mimarlık yazısında plan, kesit ve fotoğrafın farklı bilgi taşıdığını öğret", items: [
      { title: "Plan", text: "Dolaşım ve mekânsal ilişkiyi gösterir; insan deneyimini tek başına açıklamaz." },
      { title: "Kesit", text: "Yükseklik, ışık ve düşey ilişkiyi görünür kılar." },
      { title: "Fotoğraf", text: "Seçilmiş bakış açısıdır; bütün yapıyı temsil ettiğini varsayma." },
    ]},
    { id: "yer-baglam", type: "cards", heading: "Yapıyı parselden ve kentten koparma", items: [
      { title: "İklim", text: "Güneş, rüzgâr ve yağış kararlarının tasarıma etkisini incele." },
      { title: "Doku", text: "Sokak, komşuluk, yoğunluk ve erişim ilişkisini göster." },
      { title: "Toplum", text: "Yapının kim için ve nasıl kullanıldığını estetik yorumdan ayrı araştır." },
    ]},
    { id: "teknik-iddia", type: "cards", heading: "Taşıyıcı sistem ve performans iddiasında uzmanlık sınırı koy", items: [
      { title: "Kaynak", text: "Strüktür, yangın ve enerji performansı iddiasını güvenilir teknik kaynağa bağla." },
      { title: "Gözlem sınırı", text: "Fotoğraftan mühendislik sonucu çıkarmayı kesin bilgi gibi sunma." },
      { title: "Mevzuat", text: "Kod ve standartların ülke ve tarihe göre değiştiğini belirt." },
    ]},
    { id: "m2-veri", type: "cards", heading: "Alan ve yoğunluk verisini tanımıyla birlikte ver", items: [
      { title: "Brüt / net", text: "Alan türünü açıkça belirt." },
      { title: "Emsal", text: "Planlama terimini yerel mevzuat bağlamında açıkla." },
      { title: "Kapasite", text: "Kullanıcı sayısı veya birim sayısını yalnız toplam alandan türetme." },
    ]},
    { id: "kullanim-sonrasi", type: "steps", heading: "Mimarlığı yalnız açılış fotoğrafıyla değerlendirme", items: [
      { title: "Kullanım", text: "Yapının zaman içindeki gerçek kullanımını araştır." },
      { title: "Bakım", text: "Malzeme ve sistemlerin bakım davranışını hesaba kat." },
      { title: "Uyarlama", text: "Mekânın değişen ihtiyaçlara nasıl cevap verdiğini incele." },
    ]},
  ],
  saglik: [
    { id: "kanıt-hiyerarsisi", type: "cards", heading: "Sağlık iddiasında kanıt düzeyini açıkça ayır", items: [
      { title: "Kılavuz / derleme", text: "Geniş kanıtı ve uzman uzlaşısını gösterir; güncelliğini kontrol et." },
      { title: "Tek çalışma", text: "İlginç bulguyu yerleşik tedavi gerçeği gibi sunma." },
      { title: "Anekdot", text: "Kişisel iyileşme hikâyesi etkinlik kanıtı değildir." },
    ]},
    { id: "tani-tedavi-siniri", type: "cards", heading: "Bilgilendirici sağlık yazısını kişisel tanı veya tedaviye dönüştürme", items: [
      { title: "Belirti", text: "Benzer belirti birçok nedenden kaynaklanabilir; kesin tanı dili kullanma." },
      { title: "İlaç", text: "Doz, kesme veya değiştirme kararını kişiye özel tıbbi değerlendirme olmadan verme." },
      { title: "Acil durum", text: "Acil belirti veya ciddi riskte profesyonel/acil yardıma yönlendirme sınırını görünür tut." },
    ]},
    { id: "risk-mutlak", type: "cards", heading: "Göreli risk ile mutlak riski birlikte düşün", items: [
      { title: "Başlangıç riski", text: "Yüzde artışın hangi temel risk üzerinden hesaplandığını göster." },
      { title: "Mutlak fark", text: "Okurun gerçek büyüklüğü anlayabilmesi için mümkünse mutlak farkı ver." },
      { title: "Belirsizlik", text: "Güven aralığı ve çalışma sınırlılığını saklama." },
    ]},
    { id: "zarar-fayda", type: "cards", heading: "Yalnız faydayı değil zarar ve yan etkiyi de anlat", items: [
      { title: "Yan etki", text: "Müdahalenin olası zararlarını kanıt düzeyiyle birlikte ver." },
      { title: "Kimde farklı", text: "Yaş, gebelik, eşlik eden hastalık ve ilaç etkileşimi gibi bağlamların sonucu değiştirebileceğini belirt." },
      { title: "Alternatif", text: "Tek seçeneği kaçınılmaz çözüm gibi sunma." },
    ]},
    { id: "kaynak-guncellik", type: "steps", heading: "Sağlık içeriğini güncel kılavuzla yeniden kontrol et", items: [
      { title: "Kılavuz tarihi", text: "Önerinin hangi kurum ve hangi sürüme dayandığını kaydet." },
      { title: "Yayın tarihi", text: "Hızla değişen alanda eski derlemeyi güncel gerçek gibi bırakma." },
      { title: "Revizyon tarihi", text: "Metne düzenli yeniden kontrol takvimi koy." },
    ]},
    { id: "dil-etik", type: "cards", heading: "Hastalık ve beden hakkında suçlayıcı dilden kaçın", items: [
      { title: "Neden karmaşıklığı", text: "Sağlık sonucunu yalnız irade veya karakter kusuruna bağlama." },
      { title: "Beden dili", text: "Kilo, engellilik ve kronik hastalıkta aşağılayıcı veya utandırıcı çerçeve kurma." },
      { title: "Mahremiyet", text: "Hasta hikâyesinde onam ve tanınabilirlik riskini değerlendir." },
    ]},
  ],
  spor: [
    { id: "performans-verisi", type: "cards", heading: "Spor verisini bağlamıyla yorumla", items: [
      { title: "Dakika / rol", text: "Ham toplamı oyun süresi ve rolle normalize etmeden karşılaştırma." },
      { title: "Rakip seviyesi", text: "Performansın rakip ve lig bağlamını hesaba kat." },
      { title: "Örneklem", text: "Birkaç maçlık seriyi sezon seviyesi gerçek gibi sunma." },
    ]},
    { id: "antrenman-kaniti", type: "cards", heading: "Antrenman önerisini performans bilimiyle sınırla", items: [
      { title: "Amaç", text: "Kuvvet, dayanıklılık, hız veya beceri hedefini ayır." },
      { title: "Yük", text: "Yoğunluk ve toparlanma ihtiyacını bağlama göre açıkla." },
      { title: "Bireysellik", text: "Profesyonel sporcu protokolünü herkes için uygun sayma." },
    ]},
    { id: "sakatlik-siniri", type: "cards", heading: "Sakatlık içeriğinde tıbbi sınırı koru", items: [
      { title: "Tanı", text: "Belirtiden kesin sakatlık tanısı çıkarma." },
      { title: "Dönüş", text: "Spora dönüş kararını tek internet testiyle belirleme." },
      { title: "Acil işaret", text: "Ciddi belirti ve travmada profesyonel değerlendirme gereğini belirt." },
    ]},
    { id: "adil-karsilastirma", type: "cards", heading: "Sporcu ve takım karşılaştırmasını aynı ölçekte yap", items: [
      { title: "Dönem", text: "Farklı çağların kural, tempo ve rekabet yapısını hesaba kat." },
      { title: "Pozisyon", text: "Farklı görevleri tek metrikle sıralama." },
      { title: "Takım etkisi", text: "Bireysel istatistiği takım sistemi ve rolünden koparma." },
    ]},
    { id: "doping-etik", type: "cards", heading: "Doping ve performans artırıcı maddeleri özendirici ayrıntıyla anlatma", items: [
      { title: "Sağlık riski", text: "Riskleri görünür kıl; güvenli kullanım reçetesi üretme." },
      { title: "Kural", text: "Yasaklı madde bilgisini güncel resmî listeden doğrula." },
      { title: "Yöntem ayrıntısı", text: "Kaçınma veya test atlatma taktiği öğretme." },
    ]},
  ],
  "yemek-ve-gastronomi": [
    { id: "tarif-tekrarlanabilirlik", type: "steps", heading: "Tarifi okurun mutfağında tekrar edilebilir yaz", items: [
      { title: "Ölçü", text: "Bardak gibi değişken ölçülerde gram veya mililitre karşılığını gerektiğinde ver." },
      { title: "İşaret", text: "Sadece dakika değil renk, kıvam ve sıcaklık gibi pişme işaretlerini yaz." },
      { title: "Sıra", text: "Hazırlık ve pişirme adımlarını aynı anda yapılabilirlik açısından test et." },
    ]},
    { id: "gida-guvenligi", type: "cards", heading: "Lezzetten önce gıda güvenliğini koru", items: [
      { title: "Çiğ ürün", text: "Et, yumurta ve deniz ürünlerinde güvenli hazırlama ve çapraz bulaş riskini belirt." },
      { title: "Saklama", text: "Oda sıcaklığı ve buzdolabı süresi gibi kritik noktaları güvenilir kaynaktan doğrula." },
      { title: "Alerjen", text: "Yaygın alerjen ve ikame bilgisini görünür kıl." },
    ]},
    { id: "kultur-kaynak", type: "cards", heading: "Yemeğin kültürel kökenini tek hikâyeye indirgeme", items: [
      { title: "Çoklu gelenek", text: "Bir yemeğin bölgesel varyasyonlarını ve ortak geçmişini araştır." },
      { title: "Kaynak", text: "‘İlk kez burada yapıldı’ gibi köken iddialarını güvenilir tarihsel kaynağa bağla." },
      { title: "Adlandırma", text: "Toplulukların kendi adlandırmalarını ve varyasyonlarını görünür kıl." },
    ]},
    { id: "beslenme-siniri", type: "cards", heading: "Tarif yazısını sağlık tedavisi iddiasına dönüştürme", items: [
      { title: "Besin bilgisi", text: "Hesaplanan besin değerinin yaklaşık ve porsiyona bağlı olduğunu belirt." },
      { title: "Tedavi iddiası", text: "Bir gıdayı hastalık tedavisi veya garanti kilo kaybı gibi sunma." },
      { title: "Özel durum", text: "Alerji, hastalık veya özel diyet gereksiniminde profesyonel sınırı belirt." },
    ]},
    { id: "test-mutfagi", type: "steps", heading: "Tarifi en az iki tur test et", items: [
      { title: "İlk test", text: "Miktar, süre ve ekipmanı gerçek uygulamada kaydet." },
      { title: "Kör nokta", text: "Yazar olarak otomatik yaptığın ama yazmadığın adımları bul." },
      { title: "İkinci test", text: "Düzeltilmiş tarifin farklı bir uygulayıcı tarafından takip edilebilirliğini sınamaya çalış." },
    ]},
  ],
  seyahat: [
    { id: "guncellik", type: "steps", heading: "Seyahat bilgisini tarih damgasıyla yayımla", items: [
      { title: "Açılış / kapanış", text: "Mekân ve hizmet durumunu yayın öncesi kontrol et." },
      { title: "Ulaşım", text: "Hat, saat ve ücretin değişebilir olduğunu kaynakla." },
      { title: "Güncelleme", text: "Metnin son kontrol tarihini görünür tut." },
    ]},
    { id: "vize-kural", type: "cards", heading: "Vize, giriş ve sağlık kuralında resmî kaynağı öncele", items: [
      { title: "Vatandaşlık farkı", text: "Kuralın pasaporta göre değişebileceğini açıkla." },
      { title: "Resmî kaynak", text: "Blog veya forum yerine konsolosluk, sınır ve resmî kurum bilgisini temel al." },
      { title: "Değişebilirlik", text: "Okuru seyahat öncesi yeniden kontrol etmeye yönlendir." },
    ]},
    { id: "butce", type: "cards", heading: "Fiyat bilgisini tek rakam değil aralık ve tarihle ver", items: [
      { title: "Sezon", text: "Fiyatın düşük/yüksek sezon farkını belirt." },
      { title: "Kur", text: "Döviz karşılığını güncel kurla ve yaklaşık olarak etiketle." },
      { title: "Dahil olan", text: "Vergi, servis, bagaj veya rezervasyon ücretlerini ayır." },
    ]},
    { id: "yerel-temsil", type: "cards", heading: "Destinasyonu dekor gibi anlatma", items: [
      { title: "Yerel yaşam", text: "Bölgeyi yalnız ziyaretçi tüketimine indirgeme." },
      { title: "Dil", text: "İnsanları egzotikleştiren genellemelerden kaçın." },
      { title: "Davranış", text: "Yerel kurallar, kutsal alanlar ve gündelik yaşam için saygılı pratikleri araştır." },
    ]},
    { id: "guvenlik", type: "cards", heading: "Güvenlik bilgisini korku veya garanti dilinden uzak tut", items: [
      { title: "Resmî uyarı", text: "Güncel seyahat tavsiyesini yetkili kaynaktan kontrol et." },
      { title: "Bağlam", text: "Tek olaydan bütün şehre veya ülkeye kesin güvenlik hükmü çıkarma." },
      { title: "Acil bilgi", text: "Gerekli yerlerde yerel acil numara ve yardım kaynaklarını doğrula." },
    ]},
  ],
  "din-ve-inanc": [
    { id: "gelenek-ici-kaynak", type: "cards", heading: "Din ve inanç yazısında kaynak türlerini birbirinden ayır", items: [
      { title: "Kutsal metin", text: "Metnin kendisi ile daha sonraki yorum geleneğini aynı şey gibi sunma." },
      { title: "Mezhep / ekol", text: "Bir yorumun bütün gelenek adına konuşmayabileceğini belirt." },
      { title: "Akademik çalışma", text: "Tarihsel veya filolojik iddiayı inanç beyanından ayrı kaynaklandır." },
    ]},
    { id: "ic-cesitlilik", type: "cards", heading: "Bir dini tek sesli yapı gibi anlatma", items: [
      { title: "Coğrafya", text: "Uygulama ve yorumların bölgelere göre değişebileceğini göster." },
      { title: "Tarih", text: "Bugünkü pratiği bütün geçmişe yayma." },
      { title: "Ekol", text: "Farklı mezhep, cemaat veya düşünce okulunun görüşünü doğru adlandır." },
    ]},
    { id: "inanc-olgu", type: "cards", heading: "İnanç iddiası ile tarihsel/ampirik iddiayı açıkça ayır", items: [
      { title: "İnanç dili", text: "Bir topluluğun neye inandığını ‘X geleneğine göre’ gibi çerçevele." },
      { title: "Tarihsel iddia", text: "Tarih, kişi ve olay iddiasını uygun tarihsel kaynakla destekle." },
      { title: "Metafizik", text: "Deneysel olarak doğrulanamayan iddiayı bilimsel kanıtlanmış gerçek gibi sunma." },
    ]},
    { id: "saygili-dil", type: "cards", heading: "Kutsal ve tartışmalı konularda saygılı ama analitik dil kur", items: [
      { title: "Aşağılama", text: "İnanan veya inanmayan kişileri küçümseyen genellemeden kaçın." },
      { title: "İç terimler", text: "Geleneğin kendi kavramlarını doğru yaz ve gerektiğinde açıkla." },
      { title: "Eleştiri", text: "Fikir ve tarihsel iddiayı eleştirirken insan grubunu hedef alma." },
    ]},
    { id: "hassas-tarih", type: "cards", heading: "Çatışma, zulüm ve kutsal mekân anlatısında kaynak disiplinini artır", items: [
      { title: "Çoklu kaynak", text: "Tartışmalı olayı tek tarafın kroniğine dayandırma." },
      { title: "Terminoloji", text: "Siyasi ve teolojik yüklü terimleri açıklamadan kullanma." },
      { title: "Şiddet ayrıntısı", text: "Travmatik içeriği sansasyon üretmek için büyütme." },
    ]},
    { id: "guncel-hassasiyet", type: "steps", heading: "Güncel dinî konu yazısında zaman ve yer bağlamını kontrol et", items: [
      { title: "Yerel uygulama", text: "Hukuk ve geleneklerin ülkeye göre değişebileceğini kontrol et." },
      { title: "Güncel liderlik / kurum", text: "Unvan ve kurumsal durumu yayımdan önce doğrula." },
      { title: "Revizyon", text: "Hızla değişen toplumsal tartışmalarda güncelleme tarihini görünür tut." },
    ]},
  ],
};

// Dört modüllü daha düşük riskli alanlar
Object.assign(depth, {
  sanat: depth.sanat,
});

export function getInformationalGuideExtraSections(slug: string): InformationalExtraSection[] {
  return depth[slug] ?? [];
}

export const INFORMATIONAL_GUIDE_DEPTH = depth;
