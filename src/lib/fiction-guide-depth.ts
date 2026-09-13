export type FictionGuideExtraSection = {
  id: string;
  heading: string;
  body: string;
};

const FICTION_GUIDE_DEPTH: Record<string, FictionGuideExtraSection[]> = {
  utopya: [
    {
      id: "ideal-duzen-tasarimi",
      heading: "Ütopyayı kusursuz dekor değil işleyen bir toplumsal sistem olarak tasarla",
      body: "Ütopyanın merkezine tek bir güzel fikir koyup bırakma. **Kaynak dağılımı, karar alma, eğitim, bakım, emek, mahremiyet ve çatışma çözümü** gibi alanlarda düzenin nasıl işlediğini göster. Her iyi düzenin hangi varsayıma dayandığını ve hangi insan ihtiyacını öncelediğini açıklaştır.",
    },
    {
      id: "bedel-ve-kor-nokta",
      heading: "İdeal düzenin bedelini ve kör noktasını görünür kıl",
      body: "Bir toplum herkes için iyi görünüyorsa dramatik hareket zayıflayabilir. Düzenin kimi alışkanlıkları sınırladığını, hangi değeri başka bir değerin önüne koyduğunu ve iyi niyetli bir sistemin nerede gerilim üretebileceğini araştır. Ama bunu otomatik olarak distopyaya dönüştürme.",
    },
    {
      id: "gundelik-hayat-kaniti",
      heading: "Ütopyayı manifesto ile değil gündelik hayatın ayrıntılarıyla kanıtla",
      body: "Okur sistemi toplantı konuşmalarından çok **ev bulma, çalışma, sağlık hizmeti, çocuk yetiştirme, yaşlanma, ulaşım ve yas tutma** gibi gündelik pratiklerde görsün. Dünya kuralı bir sahnede insan davranışını gerçekten değiştiriyorsa inandırıcılık güçlenir.",
    },
    {
      id: "catismasiz-utopya-tuzagi",
      heading: "İyi bir dünyada da hikâye üretecek çatışmayı kur",
      body: "Çatışmayı yalnız kötü yönetici icat ederek çözme. Değer çatışması, kuşak farkı, kişisel arzu ile ortak yarar arasındaki gerilim, yanlış uygulama veya beklenmeyen sonuçlar dramatik motor olabilir. Final, düzenin yok edilmesi yerine onun nasıl sınandığını gösterebilir.",
    },
  ],
  polisiye: [
    {
      id: "suclama-mimarisi",
      heading: "Suç, soruşturma ve çözüm arasındaki mantık zincirini baştan kur",
      body: "Önce olayın gerçekte nasıl gerçekleştiğini yazar olarak bil. **Kim, neden, nasıl, ne zaman, hangi fırsatla ve neyi saklamak için** hareket etti? Sonra okurun bu gerçeğe hangi sırayla yaklaşacağını planla. Çözüm sonradan eklenen sürpriz değil, önceden bırakılmış parçaların doğru birleşimi olmalı.",
    },
    {
      id: "ipucu-fair-play",
      heading: "İpucunu saklama; anlamını geciktir",
      body: "İyi polisiye okuru kandırmak için kanıtı yok etmez. Kritik bilgi metinde bulunabilir ama ilk anda önemsiz, yanlış bağlama oturmuş veya birden çok yoruma açık olabilir. Revizyonda her ana çıkarımın metinde gerçek bir dayanağı bulunduğunu kontrol et.",
    },
    {
      id: "supheli-matrisi",
      heading: "Şüphelileri yalnız isim listesi değil ihtimal sistemi olarak yönet",
      body: "Her şüpheli için **motivasyon, fırsat, erişim, yalan, gerçek sır ve görünen davranış** satırları tut. Kırmızı ringa gerçek bir insan davranışından doğsun; yalnız okuru yanlış yola sokmak için anlamsız sahte kanıt üretme.",
    },
    {
      id: "cozum-sahnesi",
      heading: "Çözümü bilgi dökümü değil nedensellik gösterisi hâline getir",
      body: "Finalde dedektif yalnız sonucu açıklamasın. Çelişen ayrıntıların neden artık tek açıklamaya bağlandığını göster. Suçlunun motivasyonu, yöntemi ve hatası aynı mantık içinde birleşsin; çözümden sonra karakter ve dünya üzerinde kalan sonuç da görünür olsun.",
    },
  ],
  dedektif: [
    {
      id: "sorusturma-yontemi",
      heading: "Dedektife tekrar edilebilir bir düşünme ve soruşturma yöntemi ver",
      body: "Dedektif yalnız herkesten zeki olduğu için çözmemeli. Gözlem, kaynak kontrolü, görüşme, hipotez kurma, çelişki yakalama veya saha takibi gibi belirli bir yöntem kullanmalı. Bu yöntem güçlü olduğu kadar hata üretmeye de açık olsun.",
    },
    {
      id: "delil-zinciri",
      heading: "Delil ile yorum arasındaki farkı sürekli koru",
      body: "Bir ayak izi **delildir**; kime ait olduğuna dair çıkarım ise yorumdur. Dedektifin varsayımlarını gerçek bulgularla aynı cümlede kesinleştirme. Her büyük çıkarımdan önce hangi kanıtın onu desteklediğini ve hangi alternatif açıklamanın hâlâ mümkün olduğunu yaz.",
    },
    {
      id: "gorusme-ve-sorgu",
      heading: "Sorgu sahnesini soru-cevap tutanağından psikolojik çatışmaya dönüştür",
      body: "Görüşülen kişinin neyi sakladığını, neyi yanlış hatırladığını ve neyi gönüllü anlatmak istediğini ayır. Dedektif sorularını aldığı cevaba göre değiştirsin. Sessizlik, konu değiştirme ve gereğinden fazla ayrıntı da sahnenin verisi olabilir.",
    },
    {
      id: "dedektif-kor-noktasi",
      heading: "Dedektifin kişisel kör noktasını davanın içine bağla",
      body: "Araştırmacının geçmişi yalnız dekor olmasın. Önyargısı, takıntısı, sadakati veya korkusu bir kanıtı yanlış yorumlamasına yol açabilsin. İyi final, yalnız davanın çözülmesini değil dedektifin kendi yöntemini veya kendisi hakkındaki bir inancı sınamasını da sağlar.",
    },
  ],
  gerilim: [
    {
      id: "gerilim-saati",
      heading: "Gerilime ölçülebilir bir baskı saati kur",
      body: "Gerilim yalnız tehlikenin varlığından değil, **zamanın daralmasından ve seçeneklerin azalmasından** doğar. Son tren, yaklaşan dava, kaybolan ilaç, açığa çıkacak sır veya fiziksel takip gibi baskının ne zaman geri dönülmez olacağını belirle.",
    },
    {
      id: "bilgi-asimetrisi",
      heading: "Okur, karakter ve tehdit arasındaki bilgi farkını bilinçli yönet",
      body: "Bazen okur karakterden fazlasını bilmeli ve tehlikenin yaklaştığını görmeli; bazen karakterin bildiği şey okurdan saklanabilir. Her sahnede kimin ne bildiğini yaz. Rastgele bilgi saklamak yerine gerilimi belirli bir bakış açısı kuralıyla üret.",
    },
    {
      id: "baski-merdiveni",
      heading: "Tehdidi aynı seviyede tekrarlama; baskıyı nitelik değiştirerek yükselt",
      body: "İlk uyarıdan sonra yalnız daha yüksek sesli uyarılar verme. İtibar riski fiziksel riske, kişisel sır başkasının zarar görmesine, kaçış planı zaman kaybına dönüşebilir. Her basamak karakterin yeni ve daha pahalı bir karar vermesini gerektirsin.",
    },
    {
      id: "gerilim-nefesi",
      heading: "Sürekli yüksek tempo yerine gerilim ve nefes ritmi kur",
      body: "Kesintisiz kovalamaca duyarsızlaştırır. Kısa güven anları, yanlış rahatlama, sessiz hazırlık veya normal görünen sahneler sonraki baskıyı büyütür. Revizyonda rahatlama anlarının hikâyeyi durdurmadığını, yeni bilgi veya ilişki yükü taşıdığını kontrol et.",
    },
  ],
  korku: [
    {
      id: "korku-kaynagi-ve-kural",
      heading: "Korkunun kaynağını ve sınırlarını yazar olarak bil",
      body: "Okura her şeyi açıklamak zorunda değilsin; fakat yazar olarak tehdidin **ne yapabildiğini, ne yapamadığını, neyi tetiklediğini ve neyin onu durdurmadığını** bil. Kuralsız tehdit kısa süre şaşırtır ama uzun süre gerilim taşımaz.",
    },
    {
      id: "tekinsizlik-kurma",
      heading: "Tekinsizliği ani korkudan önce gündelik düzenin bozulmasıyla kur",
      body: "Tanıdık bir mekânda küçük bir yanlışlık, tekrar eden bir ses, zamanla uyuşmayan bir nesne veya birinin normalden bir cümle fazla bilmesi korkuyu hazırlayabilir. Okurun ‘bir şey yanlış’ hissi, açık tehdidi gördüğünde daha güçlü çalışır.",
    },
    {
      id: "belirsizlik-ve-kanit",
      heading: "Belirsizliği rastgele değil kanıt dengesiyle yönet",
      body: "Doğaüstü, psikolojik veya maddi açıklamaların hangilerinin mümkün kaldığını takip et. Her yeni olay bir ihtimali güçlendirirken başka bir ihtimali zayıflatabilir. Final açıklamalıysa kanıt zinciri; açık uçluysa da anlamlı bir belirsizlik dengesi bulunmalı.",
    },
    {
      id: "korkunun-artcisi",
      heading: "Korku olayının karakterde bıraktığı artçı etkiyi yaz",
      body: "Tehdit geçince her şey eski hâline dönmesin. Uyku, güven, mekân algısı, ilişki veya beden davranışı değişsin. Korku türünün kalıcı gücü çoğu zaman canavarın görüntüsünden değil, karakterin artık dünyayı eskisi gibi görememesinden gelir.",
    },
  ],
  macera: [
    {
      id: "hedef-rota-haritasi",
      heading: "Macerayı hedef, rota ve engel zinciri olarak planla",
      body: "Karakterin nereye veya neye ulaşmaya çalıştığını netleştir. Rotadaki her durak yalnız yeni dekor sunmasın; **bilgi, kaynak, ilişki veya hedef koşulunu** değiştirsin. Harita kullanıyorsan mesafe ve yolculuk süresi dramatik kararlarla uyumlu olsun.",
    },
    {
      id: "engel-cesitliligi",
      heading: "Engelleri yalnız fiziksel tehlikeden ibaret bırakma",
      body: "İyi macera; coğrafi engel, rakip, kaynak kıtlığı, yanlış bilgi, ekip içi çatışma ve ahlaki seçimleri birbirine karıştırır. Aynı tür engeli art arda tekrarlamak yerine karakterin farklı yeteneklerini ve zayıflıklarını sınayan bir dizi kur.",
    },
    {
      id: "kesif-ve-odul",
      heading: "Keşfi yalnız ödül değil yeni problem üreticisi yap",
      body: "Bulunan harita, geçit, eser veya kişi hikâyeyi kolaylaştırırken yeni bir bedel de getirebilir. Keşif sahnesinin değeri yalnız ‘bulduk’ anında değil, karakterin bundan sonra neyi farklı yapmak zorunda kaldığında ortaya çıkar.",
    },
    {
      id: "ekip-yetkinligi",
      heading: "Ekipli macerada herkesin gerçekten işe yaradığı bir yetkinlik kur",
      body: "Karakterleri sadece mizah veya duygusal destek için taşıma. Her ekip üyesinin belirli bir uzmanlığı, sınırı ve kriz anında yanlış yapabileceği bir alan olsun. Final çözümü tek kahramanın tüm becerileri birden göstermesi yerine ekip dinamiğinin sonucuna bağlanabilir.",
    },
  ],
  aksiyon: [
    {
      id: "aksiyon-cografyasi",
      heading: "Aksiyon sahnesinde mekânı okuyucunun takip edebileceği kadar net kur",
      body: "Kim nerede, çıkış nerede, engel ne, hedef ne? Okur bu dört soruyu kaybederse hız değil karmaşa hisseder. Sahne başlamadan önce mekânın iki-üç önemli noktasını yerleştir; hareket sırasında yalnız değişen konumu anlat.",
    },
    {
      id: "beat-nedenselligi",
      heading: "Her aksiyon beat'ini bir önceki kararın sonucu yap",
      body: "Vuruşları rastgele büyütme. Karakter kapıyı kilitler, bu yüzden rakip başka yola gider; araç zarar görür, bu yüzden rota değişir; yanlış atış yeni risk doğurur. Böylece aksiyon koreografi değil **neden-sonuç zinciri** olur.",
    },
    {
      id: "taktik-ve-yetkinlik",
      heading: "Karakterin becerisini sınırlarla birlikte göster",
      body: "Uzman karakter neyi neden yaptığını bilsin, fakat bilgi sınırsız olmasın. Ekipman, görüş, yorgunluk, zaman ve yanlış istihbarat taktiği etkilesin. Zafer yalnız rakibin aptallaşmasıyla gelmemeli.",
    },
    {
      id: "bedensel-ve-duygusal-bedel",
      heading: "Aksiyonun bedensel ve duygusal sonucunu sonraki sahneye taşı",
      body: "Darbe, düşme, uykusuzluk, kayıp ve korku bir sonraki sahnede yok olmasın. Yaralanma yalnız ‘gerçekçilik’ için değil karar kapasitesini değiştirmek için kullanılabilir. Büyük aksiyon anının ilişki ve hedef üzerindeki bedelini de göster.",
    },
  ],
  casusluk: [
    {
      id: "kimlik-ve-kapak",
      heading: "Kapak kimliğini yalnız isim değişikliği değil sürdürülen davranış sistemi olarak kur",
      body: "Bir ajan için sahte kimlik; meslek bilgisi, sosyal çevre, alışkanlık, dijital iz ve geçmiş sorularına verilecek cevaplar demektir. Kapak ne kadar uzun sürüyorsa küçük tutarsızlıkların açığa çıkma riski o kadar büyüsün.",
    },
    {
      id: "istihbarat-zinciri",
      heading: "Bilginin kaynağını, güvenilirliğini ve dolaşımını takip et",
      body: "Bir bilgi kimin elinden çıktı, kim doğruladı, kim değiştirmiş olabilir? Casuslukta bilgi olay örgüsünün yakıtıdır. Tek bir gizli dosyanın her şeyi çözdüğü kolaylıktan kaçın; çelişen kaynaklar ve eksik doğrulama karar baskısı üretsin.",
    },
    {
      id: "cifte-oyun",
      heading: "Çifte oyunda sadakat, görünür davranış ve gerçek amaç katmanlarını ayır",
      body: "Bir karakterin kime hizmet ettiğini yalnız final sürprizi için saklama. Önceden açıklanabilir davranış izleri bırak. Aynı eylemin iki farklı taraf için farklı anlam taşıyabildiği sahneler kur; böylece ihanet sonradan yapıştırılmış görünmez.",
    },
    {
      id: "jeopolitik-ve-etik",
      heading: "Jeopolitik bağlamı dekor değil kararların sınırı olarak kullan",
      body: "Devlet, kurum ve çıkar gruplarını tek renkli kötü karakterlere indirgeme. Operasyonun diplomatik, hukuki ve insani sonucu olsun. Gerçek ülke ve toplulukları kullanıyorsan güncel stereotiplere yaslanmak yerine bağlam ve güç ilişkilerini araştır.",
    },
  ],
  "tarihi-roman": [
    {
      id: "kaynak-hiyerarsisi",
      heading: "Tarihî roman araştırmasını kaynak hiyerarşisiyle yönet",
      body: "Dönem hakkında **birincil kaynak, akademik çalışma, güvenilir sentez ve popüler anlatı** ayrımını yap. İnternette tekrarlanan tek bir ayrıntıyı gerçek kabul etme. Önemli tarih, kurum, teknoloji ve gündelik yaşam iddialarının kaynağını not et.",
    },
    {
      id: "anakronizm-kontrolu",
      heading: "Anakronizmi yalnız eşya ve tarihte değil düşünce biçiminde de kontrol et",
      body: "Karakter bugünün kelimeleriyle konuşmasa bile bugünün değerlerini otomatik taşıyabilir. Eğitim, sınıf, cinsiyet, din, hukuk ve toplumsal hiyerarşinin dönemdeki sınırlarını araştır; karakterin bunlara karşı çıkması mümkünse karşı çıkışının bedelini de göster.",
    },
    {
      id: "maddi-kultur",
      heading: "Dönemi büyük olaylardan önce maddi kültürle yaşat",
      body: "Yemek, ışık, ulaşım, para, kumaş, çalışma saati, haber alma ve hastalık gibi ayrıntılar sahnenin davranışlarını belirlesin. Araştırma bilgisini sergilemek yerine karakterin günlük problemine bağla.",
    },
    {
      id: "gercek-ve-kurmaca-siniri",
      heading: "Gerçek kişi ve olaylarla kurmaca boşlukların sınırını bilinçli çiz",
      body: "Belgelenmiş olayı değiştirdiğinde bunun tür sözünü nasıl etkilediğini bil. Bilinmeyen boşlukları kurmacayla doldurabilirsin; fakat kanıtlanmış bir gerçeği dramatik kolaylık için tersine çevirmek başka bir karardır. Eser sonunda gerekiyorsa yazar notuyla sınırı açıklayabilirsin.",
    },
  ],
  "psikolojik-roman": [
    {
      id: "ic-dunya-mimarisi",
      heading: "İç dünyayı tekrar eden düşünce değil değişen zihinsel süreç olarak yaz",
      body: "Karakterin korkusu, savunması, arzusu ve kendine anlattığı hikâye zaman içinde değişsin. Aynı kaygıyı farklı kelimelerle tekrarlamak yerine olayların düşünce biçimini nasıl dönüştürdüğünü göster.",
    },
    {
      id: "guvenilmez-algi",
      heading: "Güvenilmez algıyı okuru keyfi biçimde kandırmadan kur",
      body: "Karakter bir olayı yanlış yorumlayabilir; fakat metin geriye dönüp bakıldığında alternatif okumaya izin verecek izler taşımalı. Bilgi saklamayı bakış açısı sınırıyla gerekçelendir, final sürprizi için anlatıcının bildiği şeyi yapay biçimde gizleme.",
    },
    {
      id: "dusunce-eylem-dengesi",
      heading: "İç monolog ile dış eylem arasında karşılıklı baskı kur",
      body: "Her önemli iç fark edişin davranışta bir izi olsun; her dış olay da karakterin iç yorumunu zorlasın. Uzun düşünce bloklarını sahne, beden, nesne ve diyalogla keserek romanın hareketini koru.",
    },
    {
      id: "psikolojik-etik",
      heading: "Ruhsal zorlukları yalnız dramatik araç veya teşhis etiketi olarak kullanma",
      body: "Klinik terim kullanıyorsan güvenilir kaynaklara dayan; şiddet, kötülük veya güvenilmezliği otomatik olarak ruhsal hastalıkla eşitleme. Karakterin deneyimini tek bir teşhise indirgemeden işlev, ilişki ve bağlam içinde göster.",
    },
  ],
  romantik: [
    {
      id: "iliski-yayi",
      heading: "Romantik hikâyeyi iki kişinin ilişki değişimi olarak planla",
      body: "Karakterler yalnız birbirini istemesin; ilişki boyunca birbirleri hakkında neyi yanlış bildiklerini, hangi savunmayı bıraktıklarını ve hangi seçimle yakınlaştıklarını belirle. Dış engel kalkınca ilişki kendiliğinden çözülmemeli.",
    },
    {
      id: "cekim-ve-uyum",
      heading: "Çekim ile sürdürülebilir uyumu ayrı ayrı yaz",
      body: "Kimya hızlı kurulabilir; güven ve uyum ise eylemlerle kanıtlanır. Karakterlerin ortak değerleri kadar gerçek farklılıklarını da göster. Romantik ilerleme yalnız fiziksel çekime değil karşılıklı dikkat, risk alma ve güvenilirliğe bağlansın.",
    },
    {
      id: "rizalik-ve-ozne",
      heading: "Rıza, sınır ve karakter öznesini romantik gerilimin içinde koru",
      body: "Israrı otomatik olarak romantikleştirme. Her iki karakterin de kendi hedefi, reddetme hakkı ve ilişki dışında hayatı olsun. Güç farkı varsa bunun karar özgürlüğünü nasıl etkilediğini metin fark etsin.",
    },
    {
      id: "tur-vaadi-ve-final",
      heading: "Tür vaadini finalde açık bir ilişki sonucu ile karşıla",
      body: "Romantik türde okur ilişkinin nereye vardığını bilmek ister. Mutlu birliktelik, umutlu başlangıç veya bilinçli ayrılık hangi alt tür sözünü verdiysen onunla uyumlu olsun. Final yalnız yanlış anlaşılmanın çözülmesi değil, iki kişinin yeni ilişki biçimini seçmesi olsun.",
    },
  ],
  dram: [
    {
      id: "deger-catismasi",
      heading: "Dramı iyi-kötü karşıtlığından çok değer çatışması üzerine kur",
      body: "İki taraf da anlaşılır bir şeyi korumaya çalıştığında sahne güçlenir. Sadakat ile adalet, aile ile özgürlük, güvenlik ile dürüstlük gibi iki değeri aynı anda geçerli kıl; karakterin seçimi birini kaybetme riski taşısın.",
    },
    {
      id: "sonuc-zinciri",
      heading: "Küçük kararların sonuçlarını biriktirerek dramatik baskıyı büyüt",
      body: "Büyük felaketleri dışarıdan indirmek yerine karakterlerin önceki seçimlerinden sonuç üret. Bir yalan ikinci yalana, gecikmiş özür ilişki kırılmasına, kaçınılan karar daha pahalı seçime dönüşsün.",
    },
    {
      id: "altmetin-ve-suskunluk",
      heading: "Duyguyu açıklayan konuşma yerine alt metin ve suskunlukla taşı",
      body: "Karakterler her zaman ne hissettiklerini adlandırmaz. Gündelik bir görev, yanlış konuya takılma, yarım cümle veya yapılan küçük bir hizmet ilişki gerilimini daha güçlü gösterebilir. Özellikle duygusal zirvelerde açıklama dozunu azaltmayı dene.",
    },
    {
      id: "katharsis-sonrasi",
      heading: "Duygusal zirvenin ardından yeni durumu da göster",
      body: "Ağlama, kavga veya itiraf tek başına final değildir. O anın ardından karakterler neyi yapabilecek, neyi artık yapamayacak? Dramın etkisi çoğu zaman yüksek duygunun sonrasındaki küçük davranışta kesinleşir.",
    },
  ],
  mizah: [
    {
      id: "komik-oncul",
      heading: "Mizahı tek şakadan değil sürdürülebilir bir komik öncülden üret",
      body: "Karakterin hedefi ile dünyanın kuralı arasında tekrar tekrar yeni durum üretebilen bir uyumsuzluk kur. Aynı espriyi yeniden söylemek yerine öncülün sonuçlarını büyüt ve karakteri giderek daha zor seçimlere sok.",
    },
    {
      id: "timing-ve-kurulum",
      heading: "Şakanın kurulum, beklenti ve kırılma zamanını kontrol et",
      body: "Punchline yalnız komik kelime değildir. Okura önce bir beklenti ver, gerekli bilgiyi doğru sırayla yerleştir ve kırılmayı mümkün olduğunca temiz yap. Fazla açıklama esprinin enerjisini tüketebilir.",
    },
    {
      id: "karakter-gercegi",
      heading: "Komik karakteri karikatür değil kendi mantığı olan insan olarak yaz",
      body: "Karakter yaptığı şeyi komik olmak için yapmamalı; kendince ciddi bir hedefi olmalı. Mizah, onun inancı ile gerçekliğin sürtüşmesinden doğsun. Böylece şaka bittiğinde karakter hâlâ hikâye taşıyabilir.",
    },
    {
      id: "mizah-hedefi",
      heading: "Esprinin kimi ve hangi güç ilişkisini hedeflediğini kontrol et",
      body: "Aşağı doğru vuran mizah kolayca stereotipe dönüşebilir. Şaka kişinin kimliğini değil çelişkili davranışı, statü oyununu, kurumu veya güçlü olanın kör noktasını hedeflediğinde daha dayanıklı olur.",
    },
  ],
  hiciv: [
    {
      id: "hiciv-hedefi",
      heading: "Hicvin hedefini kişi değil güç, değer veya sistem çelişkisi olarak netleştir",
      body: "Önce neyi eleştirdiğini tek cümlede yaz: bürokrasi, statü, tüketim, propaganda, sınıf ayrıcalığı veya başka bir yapı. Hedef belirsizse abartı yalnız alay olarak kalır.",
    },
    {
      id: "abarti-mekanizmasi",
      heading: "Abartıyı rastgele büyütme; gerçek bir mekanizmayı görünür kıl",
      body: "Hiciv gerçek dünyadaki küçük bir çelişkiyi mantıksal sonucuna kadar götürdüğünde çalışır. Sistemin kendi dili ve kuralları abartıyı üretsin; yazar dışarıdan sürekli şaka eklemek zorunda kalmasın.",
    },
    {
      id: "anlatici-mesafesi",
      heading: "Anlatıcı ile hicvedilen dünya arasındaki mesafeyi seç",
      body: "Anlatıcı açıkça eleştirebilir, ciddi bir kurum diliyle saçmalığı normal gösterebilir veya karakterin sınırlı bakışını kullanabilir. Seçtiğin mesafeyi sahneden sahneye rastgele değiştirme.",
    },
    {
      id: "yumruk-yonu",
      heading: "Hicvin yumruğunun hangi yöne vurduğunu revizyonda test et",
      body: "Eser güçlü yapıyı hedeflerken sonucu güçsüz karakterlerin aşağılanmasına dönüşüyor mu? Stereotip, sınıf veya kimlik şakaları eleştiri hedefini bulandırıyorsa yeniden kur. Keskinlik, etik körlük anlamına gelmez.",
    },
  ],
  "alternatif-tarih": [
    {
      id: "ayrilma-noktasi",
      heading: "Alternatif tarihin ayrılma noktasını kesinleştir",
      body: "Gerçek tarihin hangi anda farklılaştığını ve o anda hangi aktörlerin hangi seçeneklere sahip olduğunu araştır. Ayrılma noktası ne kadar erkenyse etkilerin kapsamı o kadar büyür; keyfî değişiklikler yerine olası bir neden seç.",
    },
    {
      id: "nedensellik-zinciri",
      heading: "Tek değişikliğin ikinci ve üçüncü derece sonuçlarını hesapla",
      body: "Savaş sonucu değişti diye yalnız bayrakları değiştirme. Ticaret, göç, kurumlar, teknoloji, dil, eğitim ve günlük hayatın nasıl etkileneceğini düşün. Her sonucu ana değişikliğe geri bağlayabilmelisin.",
    },
    {
      id: "gercek-tarih-tabani",
      heading: "Alternatif dünya kurmadan önce gerçek tarih tabanını sağlamlaştır",
      body: "Okurun fark etmeyeceğini düşünerek gerçek tarih hatasını alternatif tarih diye savunma. Ayrılma noktasına kadar olay, kişi, kurum ve teknoloji koşullarını doğru kur; sonrasındaki sapmayı bilinçli tasarla.",
    },
    {
      id: "kelebek-ve-sinir",
      heading: "Kelebek etkisini her şeyi değiştiren sihirli bahane hâline getirme",
      body: "Bazı kurumlar ve coğrafi koşullar değişime dirençlidir. Hangi sonuçların hızlı, hangilerinin kuşaklar boyunca değişeceğini ayır. Alternatif dünyanın tanıdık ve farklı parçaları birlikte bulunursa inandırıcılık artar.",
    },
  ],
  gotik: [
    {
      id: "mekan-baski-makinesi",
      heading: "Gotik mekânı dekor değil karakter üzerinde baskı kuran sistem olarak yaz",
      body: "Ev, malikâne, manastır, şehir veya aile mülkü; erişim, ses, ışık, sınıf ve geçmiş bilgisi üzerinden karakterin davranışını değiştirsin. Mekânın tarihi bugünkü çatışmayla bağlantılı olsun.",
    },
    {
      id: "miras-ve-sir",
      heading: "Miras, aile ve sır katmanlarını aynı dramatik eksende birleştir",
      body: "Eski belge veya kapalı oda yalnız gizem üretmesin. Geçmişteki kararın bugünkü ilişki, mülkiyet, suçluluk veya kimlik üzerinde gerçek sonucu olsun. Açığa çıkan sır karakterin bugünkü seçimini değiştirmeli.",
    },
    {
      id: "dogal-ve-dogaustu-belirsizlik",
      heading: "Doğal ve doğaüstü açıklama arasındaki gerilimi bilinçli yönet",
      body: "Gotik anlatı çoğu zaman iki açıklamayı bir süre birlikte taşıyabilir. Her olayı rastgele muğlak bırakma; hangi kanıtın hangi yorumu desteklediğini takip et. Final açık değilse bile duygusal ve tematik sonuç kesin olabilir.",
    },
    {
      id: "gotik-imge-dili",
      heading: "Gotik atmosferi sıfat yığınıyla değil tekrar eden imge sistemiyle kur",
      body: "Çürüme, gölge, nem, kapı, portre, ses veya bitki gibi birkaç motif seç. Motifler hikâye ilerledikçe yeni anlam kazansın. Aynı ‘karanlık ve ürkütücü’ sıfatları tekrarlamak yerine duyusal ayrıntıyı olayla bağla.",
    },
  ],
  mitoloji: [
    {
      id: "kaynak-gelenekleri",
      heading: "Mitolojik kaynağın tek ve değişmez bir versiyonu olmadığını araştır",
      body: "Aynı figür veya olay farklı dönem, bölge ve metinlerde değişebilir. Hangi geleneği kullandığını not et; birbirinden farklı versiyonları fark etmeden tek kanon gibi birleştirme.",
    },
    {
      id: "uyarlama-ve-saygi",
      heading: "Yaşayan inanç ve kültürel geleneklerle kurmaca uyarlamayı ayır",
      body: "Mitolojik malzemenin bugün hâlâ kutsal veya kimliksel anlam taşıyıp taşımadığını araştır. Yeniden yorumlama yapabilirsin; fakat kaynak topluluğu dekor veya egzotik malzeme gibi kullanmamak için bağlamı bil.",
    },
    {
      id: "tanrisal-kural-ve-bedel",
      heading: "Tanrısal güçleri olay çözme aracı değil kurallı baskı sistemi olarak kur",
      body: "Varlıkların gücü, sınırı, çıkarı ve insanlarla ilişki biçimi net olsun. Tanrısal müdahale finalde kolay çözüm sunuyorsa daha önce kurulmuş bir bedel veya kural tarafından sınırlandırılmalı.",
    },
    {
      id: "mitik-yapi-ve-insan",
      heading: "Arketipi insan davranışını silmeden kullan",
      body: "Kahraman, anne, hilebaz veya kurban gibi arketipler başlangıç şemasıdır; karakterin bütün kişiliği değildir. Mitik yankıyı korurken bireysel amaç, çelişki ve güncel sahne davranışı üret.",
    },
  ],
  paranormal: [
    {
      id: "paranormal-kural",
      heading: "Paranormal olgunun işleyiş sınırlarını yazar olarak sabitle",
      body: "Hayalet, sezgi, nesne, lanet veya başka bir olgu ne zaman ortaya çıkıyor, neyi etkiliyor, neyi yapamıyor? Okura tüm kural kitabını vermek zorunda değilsin; fakat olaylar arasında tutarlılık kurmak için sen bilmelisin.",
    },
    {
      id: "kanit-merdiveni",
      heading: "Paranormal kanıtı küçük şüpheden geri dönülmez doğrulamaya doğru yükselt",
      body: "İlk işaret kişisel yorum olabilir; sonra başka kişinin gözlemi, fiziksel iz veya tekrarlanabilir olay gelebilir. Her basamak karakterin inkâr etmesini biraz daha zorlaştırsın.",
    },
    {
      id: "alternatif-aciklama",
      heading: "Doğaüstü yorumla gündelik açıklama arasındaki dengeyi bilinçli yönet",
      body: "Yanlış hatırlama, tesadüf, manipülasyon veya psikolojik baskı gibi alternatifleri erken düşün. Final paranormal gerçeği doğrulasa bile önceki kuşkunun makul olması gerilimi güçlendirir.",
    },
    {
      id: "duygusal-capa",
      heading: "Paranormal olayı karakterin duygusal ihtiyacına bağla",
      body: "Doğaüstü unsur yalnız merak nesnesi olmasın. Yas, suçluluk, aidiyet, sevgi veya korku gibi bir insan ihtiyacıyla temas etsin. Finalde çözülen yalnız ‘gerçek mi?’ sorusu değil, karakterin bununla ne yapacağı olsun.",
    },
  ],
  "post-apokaliptik": [
    {
      id: "cokus-mantigi",
      heading: "Çöküşün nedenini ve zaman çizgisini gündelik sonuçlarıyla birlikte kur",
      body: "Salgın, savaş, iklim, teknoloji veya başka bir kırılma ne kadar hızlı oldu? Elektrik, iletişim, sağlık, lojistik ve yönetim hangi sırayla aksadı? Karakterlerin bugünkü bilgisi ve alışkanlıkları bu geçmişle uyumlu olsun.",
    },
    {
      id: "kaynak-ekonomisi",
      heading: "Su, gıda, ilaç, enerji ve güvenliği gerçek dramatik sistemlere dönüştür",
      body: "Kaynak kıtlığı yalnız arka plan cümlesi olarak kalmasın. Depolama, bozulma, taşıma, paylaşım ve takas kararları topluluk ilişkisini değiştirsin. Bir kaynağın bulunması başka bir lojistik sorun yaratabilir.",
    },
    {
      id: "topluluk-duzeni",
      heading: "Hayatta kalan topluluğun yeni hukukunu ve meşruiyetini yaz",
      body: "Kim karar veriyor, kurallara neden uyuluyor, yaptırım ne, dışarıdan gelen biri nasıl kabul ediliyor? Eski dünyanın kurumları çöktüyse yeni düzenin de kendi çıkarı, korkusu ve dayanışma biçimi olsun.",
    },
    {
      id: "hayatta-kalma-ve-insanlik",
      heading: "Hayatta kalma kararlarını etik ve duygusal sonuçlarla birlikte taşı",
      body: "Zor seçimleri yalnız ‘gerekliydi’ diyerek kapatma. Bir kişiyi geride bırakmak, kaynak saklamak veya şiddet kullanmak sonraki ilişkileri ve karakterin kendilik algısını değiştirsin. Türün kalbi çoğu zaman yaşamın ne için sürdürüldüğü sorusudur.",
    },
  ],
};

export function getFictionGuideExtraSections(slug: string): FictionGuideExtraSection[] {
  return FICTION_GUIDE_DEPTH[slug] ?? [];
}

export const FICTION_GUIDE_DEPTH_SLUGS = Object.freeze(Object.keys(FICTION_GUIDE_DEPTH));
