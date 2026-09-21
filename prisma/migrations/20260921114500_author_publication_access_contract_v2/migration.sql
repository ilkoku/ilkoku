-- Commerce Foundation V1 yazar sözleşmesi placeholder metnini gerçek çalışma metnine yükseltir.
-- Ürün sahibi kararı ile metin İncelemede aşamasına taşınır; hukukçu inceleme kanıtı olmadan approved/active yapılmaz.

UPDATE `ContractTemplate`
SET
  `title` = 'İlkOku Yazar Yayın ve Erişim Sözleşmesi',
  `description` = 'Yazarın eser bazlı ücretsiz/ücretli yayın modeli, bölüm erişimi, sınırlı platform izni, kupon finansmanı, satış hazırlığı ve elektronik onay kanıtlarını düzenleyen sözleşme.',
  `body` = 'İLKOKU YAZAR YAYIN VE ERİŞİM SÖZLEŞMESİ

Sürüm: v2

1. TARAFLAR VE KAPSAM
İşbu sözleşmenin platform tarafı, ilkoku.com ve İlkOku hizmetlerini işleten Ersin UZUN (“İlkOku”); diğer tarafı ise hesabı üzerinden bu sözleşmeyi kabul eden eser sahibi veya eser üzerinde gerekli yetkilere sahip yazar (“Yazar”)dır. İletişim adresi: destek@ilkoku.com.

Bu sözleşme, Yazarın eserini İlkOku üzerinde ücretsiz veya ücretli modele hazırlaması, bölüm bazlı erişim planı belirlemesi, eseri okuyuculara dijital olarak sunması ve ileride gerçek ödeme altyapısı devreye alındığında satışa açılması için tarafların hak ve yükümlülüklerini düzenler. Kullanım Şartları, Telif Hakkı Politikası, KVKK Aydınlatma Metni ve diğer yürürlükteki platform kuralları bu sözleşmenin tamamlayıcı parçalarıdır; emredici mevzuat hükümleri saklıdır.

2. ESER SAHİPLİĞİ VE YAZARIN BEYANI
Yazar, İlkOku’ya yüklediği veya platformda oluşturduğu eser, bölüm, kapak, görsel, alıntı ve diğer materyaller bakımından eser sahibi olduğunu veya bunları bu sözleşmede belirtilen kapsamda kullanıma sunmak için gerekli yetkiye sahip bulunduğunu beyan eder.

Eser üzerindeki manevi ve mali haklar, bu sözleşmede açıkça verilen sınırlı kullanım izinleri dışında Yazar veya ilgili hak sahibinde kalır. Bu sözleşme eser sahipliğinin, mali hakların tamamının veya münhasır yayın hakkının İlkOku’ya devri değildir.

Üçüncü kişilere ait içerik kullanılması halinde gerekli izinlerin alınması Yazarın sorumluluğundadır. Hak ihlali iddiası halinde İlkOku, ilgili içeriği geçici olarak sınırlandırabilir ve Yazarın açıklama veya hak sahipliği/izin belgesi sunmasını isteyebilir.

3. İLKOKU’YA VERİLEN SINIRLI TEKNİK VE DİJİTAL ERİŞİM İZİNLERİ
Yazar, eser İlkOku üzerinde tutulduğu ve kendi yayın/erişim tercihleri kapsamında hizmete sunulduğu sürece, hizmetin teknik olarak çalışması için gerekli ölçüde ve münhasır olmayan şekilde:
a) eserin sunucuya kaydedilmesi, veri tabanında saklanması, güvenlik yedeği, önbellek ve kullanıcı cihazına teknik iletim için gerekli çoğaltma işlemlerine;
b) Yazarın seçtiği erişim planına uygun olarak eserin veya ilgili bölümlerin İlkOku kullanıcılarına dijital ortamda gösterilmesine ve erişilebilir kılınmasına;
izin verir.

Bu izin; basılı çoğaltma ve dağıtım, çeviri, uyarlama, sesli kitap, sinema/dizi uyarlaması, sahneleme, merchandising, üçüncü kişilere bağımsız ticari lisans verme veya eser üzerinde münhasırlık hakkı içermez.

Barındırma, güvenlik, yedekleme, ödeme ve benzeri teknik hizmet sağlayıcılar yalnız İlkOku adına ve hizmetin sunulması için gerekli ölçüde işlem yapabilir; bu durum sağlayıcıya eser üzerinde bağımsız fikrî hak vermez.

4. BÖLÜM ERİŞİM PLANI
Yazar, eserindeki her bölümü bağımsız olarak “Ön İzleme” veya “Kilitli” olarak işaretler. Sistem kendiliğinden “ilk N bölüm ücretsiz” benzeri bir kural uygulamaz.

Ücretsiz eserde okuyucudan ödeme istenmez. Ücretli eserde Ön İzleme bölümleri uygun okuyucular tarafından erişilebilir kalır; Kilitli bölümlere erişim geçerli eser erişim hakkı ile sağlanır.

Bir eser için eksik bölüm erişim planı varsa eser bazlı son onay tamamlanamaz.

5. ÜCRETSİZ VE ÜCRETLİ YAYIN MODELİ
Yazar, eser bazında Ücretsiz veya Ücretli model seçebilir. Model değişikliği yalnız kaydedilmiş taslak değişiklikle okuyucu tarafında yürürlüğe girmez; yürürlük için eser bazlı son onay gerekir.

Ücretsiz → Ücretli veya Ücretli → Ücretsiz geçişleri, ilgili eser için verilen yeni son onaydan sonra etkili olur. Önceki siparişler, erişim hakları, finans kayıtları ve geçmiş onay kanıtları geriye dönük olarak silinmez veya değiştirilmez.

6. HAZIRLIK MODU VE 0 TL KURALI
Gerçek ödeme yolu ve üretim için güvenli ödeme sağlayıcısı birlikte devreye alınana kadar yeni ücretli eser yapılandırmaları yalnız hazırlık modunda tutulur ve ücretli hazırlık fiyatı 0 TL olarak kaydedilir. Bu aşamada Yazar gerçek satış fiyatı girmez ve sırf “Ücretli” seçimi yapılması okuyucunun mevcut erişimini kilitlemez.

Gerçek ödeme altyapısı devreye alındığında Yazar, gerçek satış fiyatını ve o tarihte geçerli ticari koşulları görerek yeni eser bazlı son onay verir. Daha önce gerçek ücretli erişim olarak aktive edilmiş bir eserde geçici ödeme altyapısı kesintisi, Kilitli bölümleri ücretsiz hale getirmez; mevcut erişim hakları korunur ve yeni satın alma geçici olarak kullanılamayabilir.

7. FİYAT, SİPARİŞ VE ERİŞİM HAKKI
Okuyucu ücretli eserde tek tek bölüm değil eserin tamamı için erişim hakkı edinir. Geçerli bir satın alma, eserin satın alma anındaki ve sonradan aynı esere eklenen Kilitli bölümlerine erişim sağlar.

Sonradan yapılan fiyat değişikliği, daha önce tamamlanmış siparişlerin fiyatını değiştirmez. Her siparişte eser, fiyat, indirim, toplam tutar ve ilgili koşullar işlem anındaki halleriyle kayıt altına alınır.

Erişim kararı yalnız güncel fiyata bakılarak verilmez; açık bir eser erişim hakkı kaydı esas alınır.

8. KUPONLAR VE KAMPANYALAR
Yazar yalnız kendi eserleri için Yazar kuponu oluşturabilir. Yazar kuponunda indirim Yazar tarafından finanse edilmiş sayılır ve Yazar hakediş hesabının matrahı okuyucunun indirim sonrası ödediği tutar üzerinden oluşur.

İlkOku tarafından oluşturulan platform kuponunda indirim İlkOku kampanya maliyeti sayılır; bu indirim Yazarın hakediş matrahını düşürmez. Platform tarafından finanse edilen yüzde yüz indirim kampanyasında okuyucu 0 TL ödeyebilir; bu durumda dış ödeme sağlayıcısı çağrılmadan sipariş ve erişim hakkı oluşturulabilir ve Yazar hakediş matrahı eserin indirimsiz fiyatı üzerinden korunur.

Varsayılan olarak bir siparişte bir kupon kullanılır; kupon birleştirme uygulanmaz.

9. YAZAR HAKEDİŞİ, KESİNTİLER VE FİNANS KAYITLARI
İlkOku finansal kayıtlarında brüt satış, Yazar tarafından finanse edilen kupon indirimi, İlkOku tarafından finanse edilen kampanya maliyeti, ödeme hizmeti maliyeti, İlkOku hizmet payı, Yazar hakedişi, iade, vergi/stopaj, düzeltme ve ödeme hareketleri ayrı kayıt türleri olarak tutulabilir.

Brüt satış hacmi İlkOku geliri olarak kabul edilmez. Yazarın finans görünümünde yalnız kaydedilmiş gerçek finans hareketleri gösterilir.

Bu sürümde kesin İlkOku komisyon oranı, vergi/stopaj oranı, ödeme eşiği, ödeme yöntemi veya Yazar para transferi kuralı belirlenmemiştir. Gerçek ücretli satış ve para transferi bu koşullar açıkça tanımlanmadan ve ilgili sistemler devreye alınmadan işletilmez. İleride uygulanacak ticari oran ve kesintiler, yürürlüğe alınmadan önce Yazarın görebileceği şekilde açıkça belirlenir ve gerektiğinde güncel sözleşme/onay sürecine bağlanır.

10. ÖDEME SAĞLAYICILARI VE GÜVENLİK
Ödeme işlemleri, gerçek ödeme altyapısı devreye alındığında yetkili ödeme/operatör sağlayıcıları üzerinden yürütülebilir. İlkOku, ham kart numarası, CVV veya operatör kimlik doğrulama bilgilerini kendi Commerce tablolarında saklamaz.

Ödeme başarılı sayılmadan önce sağlayıcı bildiriminin doğrulanması, tutar ve para biriminin eşleşmesi gerekir. Erişim hakkı yalnız doğrulanmış işlem veya geçerli 0 TL platform kampanyası gibi sistem tarafından izin verilen tamamlanmış sipariş sonucunda oluşturulur.

11. İADE, İPTAL VE YASAL HAKLAR
İade, cayma, iptal ve dijital içerik erişimine ilişkin işlemler; yürürlükteki tüketici mevzuatı, işlem anındaki aktif Okur Dijital İçerik Satın Alma Koşulları ve uygulanabilir ödeme sağlayıcısı kuralları çerçevesinde yürütülür.

Bu sözleşme, okuyucuların veya Yazarın emredici mevzuattan doğan haklarını ortadan kaldırmaz. Kısmi iade, kuponun iade sonrası yeniden kullanılabilmesi ve sağlayıcı iade işlemleri gibi henüz ürün/politika olarak kesinleştirilmemiş konularda sistem, açıkça tanımlanmamış bir hakkı veya otomatik operasyonu varmış gibi uygulamaz.

12. VERGİ VE MALİ YÜKÜMLÜLÜKLER
Tarafların vergi, stopaj, belge düzeni ve diğer mali yükümlülükleri yürürlükteki mevzuata göre belirlenir. İlkOku’nun kanunen kesinti veya bildirim yapması gereken haller saklıdır.

Bu sözleşmede belirli bir vergi veya stopaj oranı taahhüt edilmez. Gerçek Yazar ödemeleri devreye alınmadan önce gerekli mali süreç ve kayıt düzeni ayrıca operasyonel olarak tamamlanır.

13. YAYINDAN KALDIRMA, DURDURMA VE HAK İHLALİ
Yazar, platformun sunduğu ürün kontrolleri çerçevesinde eserini arşivleyebilir veya yayından kaldırabilir. Ancak tamamlanmış siparişler, finansal kayıtlar, erişim kanıtları, sözleşme onayları, güvenlik kayıtları ve mevzuat gereği saklanması gereken kayıtlar geriye dönük olarak silinmez.

Hak ihlali, hukuka aykırılık, güvenlik riski veya yetkili makam talebi halinde İlkOku ilgili içeriği ya da satış/erişim işlevini geçici veya kalıcı olarak sınırlandırabilir. Tarafların kanuni başvuru ve itiraz hakları saklıdır.

14. YASAK İÇERİK VE PLATFORM KURALLARI
Yazar; hukuka aykırı, başkalarının fikrî mülkiyet, kişilik, gizlilik veya diğer haklarını ihlal eden, güvenlik riski yaratan veya İlkOku Kullanım Şartlarında yasaklanan içeriği satışa veya yayına sunamaz.

İlkOku’nun yaptığı teknik veya içerik güvenliği incelemesi, Yazarın hak sahipliği ve hukuka uygunluk sorumluluğunu ortadan kaldırmaz.

15. KİŞİSEL VERİLER
Kişisel verilerin işlenmesi bu sözleşmeden ayrı olarak KVKK Aydınlatma Metni ve ilgili gizlilik belgelerinde açıklanır. Sözleşme kabulü, KVKK kapsamında ayrı açık rıza gereken işlemler için açık rıza yerine geçmez.

Sözleşme ve eser bazlı onay kanıtları; sözleşmenin kurulması/ifası, hukuki yükümlülükler, işlem güvenliği ve bir hakkın tesisi, kullanılması veya korunması amaçlarıyla ilgili yasal çerçevede saklanabilir.

16. ELEKTRONİK KABUL VE KANIT
Yazarın bu sözleşmeyi platform içinde kabul etmesi halinde en az sözleşme sürümü, belge özeti/hash değeri, kabul zamanı ve mevcut teknik işlem kanıtları sistemde kaydedilir. Eser bazlı son onayda ayrıca yayın modeli, fiyat (uygulanıyorsa), bölüm erişim planı, sözleşme sürümü ve onay zamanı değişmez geçmiş kaydı olarak saklanır.

Platform içi kabul kaydı, 5070 sayılı Elektronik İmza Kanunu kapsamında nitelikli elektronik imza kullanıldığı iddiasını taşımaz. Taraflar bu kayıtların elektronik işlem ve irade beyanının ispatında kullanılabileceğini kabul eder; emredici şekil şartları saklıdır.

17. SÜRÜM DEĞİŞİKLİĞİ VE YENİDEN KABUL
Sözleşme metni değiştiğinde yeni sürüm oluşturulur. Yazarın önceki sürümdeki kabulü ve geçmiş eser onayları korunur; yeni sürüm, yeni işlem veya eser bazlı onay için sistem tarafından tekrar kabul edilmesi istenebilir.

Onaylanmamış taslak değişiklikleri, daha önce yürürlüğe girmiş okuyucu durumunu kendiliğinden değiştirmez.

18. SÜRE VE SONA ERME
Bu sözleşme Yazar tarafından kabul edildiği tarihte yürürlüğe girer ve Yazarın İlkOku üzerindeki ilgili yayın/erişim ilişkisi devam ettiği sürece uygulanır. Hesabın veya eserin platformdan kaldırılması, geçmiş sipariş, erişim, finans, sözleşme ve denetim kayıtlarının mevzuat ve hakların korunması için gerekli olduğu ölçüde saklanmasını engellemez.

Sona erme, İlkOku’ya yeni kamuya sunma veya yeni satış yapma yetkisi vermez; teknik yedek ve yasal saklama süreleri ile daha önce doğmuş hak ve yükümlülükler saklıdır.

19. SORUMLULUK VE HİZMET SÜREKLİLİĞİ
İlkOku; eser satışı, okuyucu sayısı, gelir miktarı, yayınevi ilgisi veya kesintisiz hizmet garantisi vermez. Güvenlik, bakım, sağlayıcı arızası, mevzuata uyum veya mücbir sebepler nedeniyle hizmette geçici kesinti yaşanabilir.

Tarafların kasıt, ağır kusur, fikrî mülkiyet, kişisel veriler ve diğer emredici mevzuattan doğan sorumlulukları bu hükümle ortadan kaldırılmaz.

20. UYGULANACAK HUKUK, BAŞVURU VE YÜRÜRLÜK
Bu sözleşmeye Türkiye Cumhuriyeti hukuku uygulanır. Emredici yetki, tüketici, fikrî mülkiyet ve diğer kanuni başvuru hükümleri saklıdır. Taraflar öncelikle destek@ilkoku.com üzerinden uyuşmazlığın çözümü için iletişim kurabilir; kanuni başvuru, arabuluculuk, hakem heyeti veya dava hakları mevzuatın öngördüğü ölçüde saklıdır.

Yazar, platformda gösterilen güncel sürümü okuyup açık kabul işlemini tamamladığında ve sistem kabul kanıtını kaydettiğinde sözleşme Yazar bakımından yürürlüğe girer.',
  `version` = 2,
  `active` = false,
  `lifecycleStatus` = 'review',
  `approvedById` = NULL,
  `approvedAt` = NULL,
  `activatedAt` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'ILKOKU_AUTHOR_PUBLICATION_ACCESS'
  AND `version` = 1
  AND `active` = false;
