export type FoundationalGuide = {
  body: string;
  description: string;
  slug: string;
  summary: string;
  title: string;
  updatedAt: string;
};

const updatedAt = "2026-08-24T00:00:00.000Z";

export const foundationalGuides: readonly FoundationalGuide[] = [
  {
    slug: "ilk-eseri-yayinlama-rehberi",
    title: "İlk Eseri Yayımlama Rehberi",
    summary:
      "Taslağı herkese açmadan önce eser kaydını, bölüm sırasını, tanıtım metnini ve görünürlük kararını birlikte hazırlayın.",
    description:
      "İlkOku’da ilk eseri yayımlamadan önce taslak, bölüm, tanıtım ve görünürlük adımlarını güvenli biçimde planlama rehberi.",
    updatedAt,
    body: `## Yayınlamak ile taslağı kaydetmek aynı şey değildir

İlk taslağın amacı düşünceyi kaybetmemektir. Yayının amacı ise okurun karşısına anlaşılır, sıralı ve bilinçli biçimde çıkmaktır. Bu nedenle yazmaya başladığınız anda eseri herkese açmanız gerekmez. Önce başlık, kısa tanıtım, tür, bölüm sırası ve yayımlamak istediğiniz metin üzerinde son bir kontrol yapın.

İlkOku’da taslak çalışma alanı ile herkese açık eser yüzeyi ayrıdır. Bir eserin taslakta bulunması, arama motorlarına veya platform dışındaki ziyaretçilere gösterildiği anlamına gelmez. Public katalog yalnız yayımlanmış ve herkese açık eserleri listeler.

## Yayından önce beş kontrol

1. Eser başlığı metnin türünü ve tonunu doğru yansıtıyor mu?
2. Tanıtım metni temel çatışmayı anlatıyor fakat sonucu açık etmiyor mu?
3. Bölümler doğru sırada mı ve her bölümün anlaşılır bir başlığı var mı?
4. Yayımlanacak bölümde taslak notu, kişisel bilgi veya yanlışlıkla bırakılmış açıklama var mı?
5. Eserin herkese açık görünmesini gerçekten istiyor musunuz?

## İlk bölüm tek başına ne söylemeli?

İlk bölüm bütün dünyayı açıklamak zorunda değildir. Okura bir karakter, bir amaç veya çözülmesi gereken bir soru vermesi yeterlidir. Uzun bir ön bilgi yerine olayın içine giren net bir sahne çoğu zaman daha güçlü bir başlangıç sağlar.

Bölüm başında okurun bilmesi gerekenleri seçin. Daha sonra öğrenilebilecek ayrıntıları ilk sayfalara yığmayın. Bölüm bittiğinde okurun “sonra ne olacak?” sorusunu sorması, her sırrın açıklanmasından daha değerlidir.

## Tanıtım, tür ve bölüm sırası birlikte çalışır

Tür bilgisi okurun beklentisini kurar. Tanıtım metni hikâyenin vaadini açıklar. Bölüm sırası ise bu vaadin nasıl ilerlediğini gösterir. Bu üç alan birbirini desteklemezse eser doğru okura ulaşmakta zorlanır.

Örneğin tanıtımda polisiye bir soru kuruluyorsa tür bilgisinin ve ilk bölümün de bu beklentiyi taşıması gerekir. Sadece popüler olduğu için ilgisiz bir tür seçmek kısa vadede görünürlük sağlayabilir; fakat yanlış okur beklentisi doğurur.

## Yayından sonra ne yapılmalı?

Yayın sonrasında eser sayfasını bir ziyaretçi gibi açın. Başlık, yazar adı, tanıtım, bölüm sayısı ve bağlantıların doğru göründüğünü kontrol edin. Yazım hatası fark ederseniz metni düzeltin; fakat okur geri bildirimini yalnızca “beğendi veya beğenmedi” şeklinde değerlendirmeyin. Tekrarlanan ve somut örneğe dayanan geri bildirimler revizyon için daha yararlıdır.

İlk yayın son karar değildir. Düzenli, ölçülü ve kayıtlı geliştirme sürecinin başlangıcıdır.`,
  },
  {
    slug: "eser-tanitim-metni-nasil-yazilir",
    title: "Eser Tanıtım Metni Nasıl Yazılır?",
    summary:
      "İyi bir tanıtım metni hikâyeyi özetlemek yerine doğru okura karakteri, çatışmayı ve eserin vaadini gösterir.",
    description:
      "Roman ve hikâyeler için spoiler vermeden karakter, çatışma ve okur vaadini anlatan etkili eser tanıtım metni hazırlama rehberi.",
    updatedAt,
    body: `## Tanıtım metninin görevi

Tanıtım metni eserin küçültülmüş özeti değildir. Okura üç sorunun cevabını verir: Kimi izleyeceğim, hangi temel sorunla karşılaşacağım ve bu hikâyeyi neden şimdi okumalıyım?

Bütün karakterleri, geçmiş olayları ve yan çatışmaları aynı paragrafa sığdırmaya çalışmak metni ağırlaştırır. En güçlü karakteri, geri dönüşü zorlaştıran olayı ve eserin ayırt edici yönünü seçin.

## Kullanılabilecek dört parçalı yapı

1. Ana karakteri bugünkü durumu içinde tanıtın.
2. Alışılmış düzeni bozan olayı açıklayın.
3. Karakterin kaybetme riskini veya vermesi gereken kararı gösterin.
4. Sonucu söylemeden hikâyenin temel sorusuyla bitirin.

Bu yapı zorunlu bir şablon değildir. Şiirsel veya deneysel eserlerde daha kısa bir yaklaşım kullanılabilir. Yine de okurun metinle karşılaştığında ne tür bir deneyime gireceğini anlayabilmesi gerekir.

## Spoiler ile merak arasındaki sınır

Tanıtım metni başlangıç koşullarını açıklayabilir; çözümü açıklamamalıdır. Hikâyenin ortasında ortaya çıkan büyük sırrı veya final kararını tanıtıma taşımayın. Bunun yerine o sırrın yarattığı baskıyı anlatın.

“Zeynep katilin kardeşi olduğunu öğrenir” demek yerine “Zeynep, soruşturma ilerledikçe ailesini korumak ile gerçeği açıklamak arasında kalır” ifadesi merakı korur.

## Genel ifadeleri somutlaştırın

“Hayatı tamamen değişecektir”, “hiçbir şey göründüğü gibi değildir” veya “büyük bir macera başlar” gibi cümleler tek başına ayırt edici değildir. Değişimin neye dokunduğunu gösterin: karakterin mesleği, ailesi, yaşadığı şehir, verdiği söz veya sakladığı sır.

Somut ayrıntı, uzun açıklama anlamına gelmez. Tek bir özgün nesne, mekân ya da karar eserin tonunu gösterebilir.

## Son kontrol

- Metin ilk iki cümlede karakteri veya temel durumu kuruyor mu?
- Tür ve ton, eser sayfasındaki tür bilgisiyle uyumlu mu?
- Final veya büyük sürpriz açıklanıyor mu?
- Gereksiz özel isimler okumayı zorlaştırıyor mu?
- Metin yüksek sesle okunduğunda doğal geliyor mu?

Tanıtımı yayımlamadan önce mümkünse 120–180 kelime arasında ikinci bir sürüm hazırlayın. Sonra iki sürümü karşılaştırıp yalnız eserin vaadine hizmet eden cümleleri bırakın.`,
  },
  {
    slug: "okur-geri-bildirimi-rehberi",
    title: "Yazara Yararlı Geri Bildirim Nasıl Verilir?",
    summary:
      "Yararlı okur geri bildirimi kişiye değil metne odaklanır, somut bir okuma anını tarif eder ve yazarın karar alanını korur.",
    description:
      "Okurlar için yazara saygılı, somut ve uygulanabilir geri bildirim verme; spoiler, üslup ve eleştiri sınırlarını koruma rehberi.",
    updatedAt,
    body: `## Beğeni ile geri bildirim farklıdır

“Çok güzel” veya “sevmedim” okur tepkisini gösterir; fakat yazarın neyi koruyacağını ya da geliştireceğini anlamasına yetmez. Yararlı geri bildirim, tepkinin hangi bölümde ve hangi nedenle oluştuğunu açıklar.

Amaç metni sizin yazacağınız biçime çevirmek değildir. Yazarın hedefini anlamaya çalışıp okuma deneyiminizi dürüstçe aktarmaktır.

## Somut geri bildirim formülü

Bir gözlem, etkisi ve mümkünse bir soru kullanın:

- Gözlem: “İkinci sahnede mekân üç kez değişiyor.”
- Etki: “Bu nedenle karakterlerin nerede olduğunu takip etmekte zorlandım.”
- Soru: “Sahne geçişleri ayrı paragraflarla belirginleştirilebilir mi?”

Bu yaklaşım “Burası kötü olmuş” gibi yargılardan daha açıklayıcıdır ve çözümün tek sahibi olduğunuzu iddia etmez.

## Neye bakabilirsiniz?

### Anlaşılırlık

Karakterlerin amacı, sahnenin yeri ve olayların sırası takip edilebiliyor mu? Anlamadığınız noktayı doğrudan belirtin; yazarın ne demek istediğini tahmin ederek kesin hüküm vermeyin.

### Tempo

Hangi bölümde hızlandığınızı, nerede durakladığınızı veya hangi açıklamayı uzun bulduğunuzu söyleyin. “Yavaş” demek yerine okuma ritminin nerede değiştiğini gösterin.

### Karakter

Karakterin bir kararı size beklenmedik geldiyse bunun önceki davranışlarla neden uyuşmadığını açıklayın. Karakteri sevmemek ile karakterin tutarsız yazılması aynı şey değildir.

### Duygu ve merak

Sizi etkileyen cümleyi, meraklandıran soruyu veya duygunun zayıfladığı anı belirtin. Yazar için güçlü çalışan bölümleri bilmek de sorunlu alanları bilmek kadar değerlidir.

## Saygı ve spoiler sınırı

Eleştiriyi yazara, kimliğine veya yeteneğine yöneltmeyin. Metin üzerinde konuşun. Herkese açık yorumda ilerideki bölümlere ait önemli bilgileri açıklamayın; gerekiyorsa yorumun başında spoiler uyarısı verin.

## Göndermeden önce

Yorumunuzun somut bir örnek içerdiğini, kişisel saldırı taşımadığını ve “benim okuma deneyimimde” sınırını koruduğunu kontrol edin. İyi geri bildirim yazarı savunmaya zorlamaz; metnine yeniden bakabileceği açık bir pencere sunar.`,
  },
  {
    slug: "editor-incelemesi-nasil-calisir",
    title: "İlkOku Editör İncelemesi Nasıl Çalışır?",
    summary:
      "Editör incelemesi okur yorumundan farklıdır: kapsamı belirli, kanıtı metne dayanan ve bağımsız değerlendirme adımları içeren profesyonel bir süreçtir.",
    description:
      "İlkOku’daki birinci ve bağımsız ikinci editör incelemesinin amacı, aşamaları, rapor sınırları ve yazarın karar alanı.",
    updatedAt,
    body: `## Profesyonel incelemenin amacı

Editör incelemesi eseri yazarın yerine yeniden yazmak veya yayımlanma garantisi vermek değildir. Metnin yapısını, anlatımını, karakterlerini, tutarlılığını ve okur deneyimini belirli ölçütlerle değerlendirmektir.

Raporun değeri yalnız sonuç cümlesinden değil, metindeki somut örneklerden ve gerekçelerden gelir.

## Birinci editör aşaması

Birinci editör metni kendi değerlendirme çerçevesi içinde okur, bulgularını kategorilere ayırır ve profesyonel raporunu tamamlar. İnceleme sırasında taslak rapor yalnız yetkili çalışma alanında tutulur.

Tamamlanan rapor; güçlü yönler, geliştirilmesi gereken alanlar ve bunların metindeki dayanaklarını açık biçimde sunmalıdır. “Olmamış” veya “çok iyi” gibi gerekçesiz hükümler profesyonel değerlendirme için yeterli değildir.

## Bağımsız ikinci değerlendirme

İkinci editörün görevi birinci raporu onaylamak değildir. Metni bağımsız biçimde değerlendirerek aynı veya farklı bulgulara kendi gerekçeleriyle ulaşır. Bağımsızlık, iki raporun birbirini kopyalamamasını ve yazarın tek görüşe bağlı kalmamasını sağlar.

İlkOku politikasında ikinci değerlendirme tamamlanmadan birinci editör ikinci raporu göremez. Böylece sonraki rapor önceki görüş tarafından yönlendirilmez. İkinci değerlendirme bittikten sonra raporlar süreç kuralları kapsamında karşılaştırılabilir.

## Yazarın kontrolü

Yazar inceleme talebini, ikinci editör incelemeye başlamadan önce geri çekebilir. İnceleme başladıktan sonra süreç kayıtlarının ve editör emeğinin korunması gerekir.

Editör önerileri karar desteğidir. Metindeki değişikliklerin sahibi yazardır. Yazar her öneriyi uygulamak zorunda değildir; fakat uygulamadığı önemli bir önerinin gerekçesini kendi revizyon planında değerlendirmesi yararlı olur.

## İyi bir editör raporunda ne bulunur?

- İncelemenin kapsamı ve okunan sürüm
- Güçlü çalışan anlatı unsurları
- Yapı, tempo, karakter ve dil bulguları
- Metinden somut örnekler
- Önceliklendirilmiş geliştirme alanları
- Çözümü dayatmayan, uygulanabilir sorular veya öneriler

Profesyonel inceleme, okur tepkisinin yerine geçmez. Okur geri bildirimi eserin nasıl deneyimlendiğini; editör raporu ise metnin neden bu etkiyi oluşturduğunu daha sistemli biçimde anlamaya yardımcı olur.`,
  },
  {
    slug: "yayinevi-eser-kesfi-rehberi",
    title: "Yayınevleri İçin Eser Keşfi Rehberi",
    summary:
      "Bir eseri yalnız popülerlik sayılarıyla değil; tür uyumu, metin bütünlüğü, yazar süreci ve yayın potansiyeliyle birlikte değerlendirin.",
    description:
      "Yayınevlerinin İlkOku’da eser keşfederken tür uyumu, metin olgunluğu, editör kanıtı ve yazar sürecini değerlendirmesi için rehber.",
    updatedAt,
    body: `## Keşif bir kabul kararı değildir

Bir eseri keşfetmek, yayın sözleşmesi teklif etmek anlamına gelmez. İlk değerlendirme; yayınevinin yayın çizgisiyle uyum, hedef okur, metnin mevcut olgunluğu ve geliştirme potansiyeli hakkında kontrollü bir ön incelemedir.

Yüksek görüntülenme veya yorum sayısı tek başına yayınlanabilirlik ölçütü değildir. Yeni bir eser az okura ulaşmış olabilir; buna rağmen belirgin bir anlatı sesi ve güçlü bir hedef kitle vaadi taşıyabilir.

## İlk taramada bakılabilecek alanlar

1. Tür ve alt tür yayınevinin yayın çizgisiyle uyumlu mu?
2. Tanıtım metni eserin temel vaadini açık biçimde kuruyor mu?
3. Yayımlanmış bölümler arasında anlatım ve kalite tutarlılığı var mı?
4. Yazar revizyon ve geri bildirim sürecini düzenli yürütmüş mü?
5. Profesyonel editör incelemesi varsa kapsamı ve tamamlanma durumu nedir?

## Eser Pasaportu nasıl okunmalı?

Eser Pasaportu, platform üzerinde oluşan yazım ve revizyon sürecine ilişkin kayıtları bir araya getirir. Bu kayıtlar tek başına edebî kalite kararı değildir; eserin gelişim yolunu ve hangi aşamalardan geçtiğini anlamaya yardımcı olan süreç kanıtlarıdır.

Bir sürüm kaydı, metnin değiştirildiğini gösterir. Değişikliğin iyi olup olmadığı ancak metin ve rapor birlikte incelenerek değerlendirilebilir.

## Ekip içinde kontrollü takip

İlgilenilen eserleri ekip içinde paylaşırken neden ilgilenildiğini kısa ve somut bir notla kaydedin. “Güzel görünüyor” yerine “çağdaş polisiye listemizle uyumlu; ilk üç bölümde karakter sesi tutarlı” gibi bir not sonraki değerlendirmeyi hızlandırır.

Eser dosyası, rapor veya kişisel veri aktarımı yapılacaksa yalnız yetkili çalışma alanları kullanılmalıdır. Kişisel cihazlarda veya kontrolsüz mesajlaşma kanallarında kurumsal kopya biriktirilmemelidir.

## Yazarla iletişimden önce

Yayınevinin neyi değerlendirmek istediği, hangi materyale ihtiyaç duyduğu ve sürecin bağlayıcı olup olmadığı açıkça belirtilmelidir. Yayın niyeti veya münhasırlık gibi başlıklar sıradan bir keşif mesajına gizlenmemeli; ayrı ve açık bir hukuki süreç olarak ele alınmalıdır.

Sağlıklı keşif, hızlı karar vermekten çok doğru eseri gerekçeli biçimde izleyebilme yeteneğidir.`,
  },
  {
    slug: "eser-pasaportu-nedir",
    title: "Eser Pasaportu Nedir?",
    summary:
      "Eser Pasaportu, bir metnin platform üzerindeki yazım, sürüm ve profesyonel inceleme sürecini tek bir kayıt zincirinde görünür kılar.",
    description:
      "İlkOku Eser Pasaportu’nun kaydettiği yazım, sürüm ve editör inceleme bilgilerinin anlamı ve sınırları.",
    updatedAt,
    body: `## Sonuçtan önce süreci görmek

Bir eser yalnız son metinden ibaret değildir. Taslaklar, bölüm eklemeleri, revizyonlar ve profesyonel değerlendirmeler zaman içinde bir gelişim yolu oluşturur. Eser Pasaportu bu yolun platform üzerinde oluşan parçalarını tek bir eser kaydı altında birleştirir.

Amaç yazara “bu eserin sahibi sensin” şeklinde tek başına hukuki hüküm vermek değildir. Amaç, İlkOku üzerinde hangi kayıtların ne zaman oluştuğunu düzenli ve izlenebilir biçimde göstermek, süreç hakkında kanıt üretmektir.

## Hangi bilgiler anlamlıdır?

- Eserin platform üzerindeki temel kimliği
- Oluşturulma ve güncellenme zamanları
- Bölüm ve sürüm hareketleri
- İçerik değişikliklerini ayırt etmeye yarayan kayıtlar
- Profesyonel editör inceleme durumu
- Yayın ve görünürlük aşamaları

Bu alanların her biri farklı bir soruya cevap verir. Güncelleme tarihi metnin değiştiğini, editör durumu inceleme sürecini, görünürlük ise eserin kimler tarafından görülebileceğini anlatır.

## Eser Pasaportu ne değildir?

Eser Pasaportu ISBN değildir, telif tescil belgesi değildir ve yayınevi kabulü anlamına gelmez. Editör incelemesi bulunması da eserin otomatik olarak yayımlanmaya hazır olduğu sonucunu doğurmaz.

Süreç kaydı ile edebî değerlendirme birbirinden ayrılmalıdır. Kayıt, bir olayın gerçekleştiğini gösterir; o olayın metne etkisini anlamak için içerik ve rapor ayrıca incelenir.

## Sürüm kaydının değeri

Revizyon sırasında yalnız son dosyayı saklamak, hangi kararın ne zaman alındığını görünmez kılar. Sürüm yaklaşımı ise yazarın gelişim sürecini karşılaştırabilmesini sağlar. Büyük bir değişiklikten önceki ve sonraki metni ayırt etmek, editör önerilerinin nasıl değerlendirildiğini anlamayı kolaylaştırır.

## Kimler nasıl kullanabilir?

Yazar kendi çalışma geçmişini ve inceleme aşamalarını takip eder. Editör yalnız yetkili olduğu sürüm ve inceleme bağlamında çalışır. Yayınevi ise kendisine açık süreç bilgilerini eser değerlendirmesinin bir parçası olarak görebilir.

Her rolün gördüğü bilgi aynı olmak zorunda değildir. Taslak içerik, özel not ve yetki kontrollü belgeler public eser sayfasına taşınmaz. Eser Pasaportu’nun güvenilirliği, yalnız kayıt üretmesine değil, erişim sınırlarını korumasına da bağlıdır.`,
  },
] as const;

export function getFoundationalGuide(
  slug: string,
): FoundationalGuide | null {
  return (
    foundationalGuides.find(
      (guide) => guide.slug === slug,
    ) ?? null
  );
}
