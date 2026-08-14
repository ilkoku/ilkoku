export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPage = {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

export const operatorIdentity = "Ersin UZUN";
export const contactEmail = "destek@ilkoku.com";

export const legalPages: Record<string, LegalPage> = {
  "kullanim-sartlari": {
    title: "Kullanım Şartları",
    description: "İlkOku platformunun kullanımına ilişkin temel koşullar.",
    updatedAt: "12 Ağustos 2026",
    sections: [
      {
        title: "1. Kapsam ve kabul",
        paragraphs: [
          "Bu Kullanım Şartları, ilkoku.com alan adı ve İlkOku hizmetleri üzerinden sunulan yazar, okuyucu, editör, yayınevi ve yönetim işlevlerinin kullanımını düzenler. Platformu kullanmanız, hesabınız ve kullandığınız özellikler bakımından bu şartlara uymayı kabul ettiğiniz anlamına gelir.",
          "Belirli özellikler için ek kurallar veya rol bazlı koşullar gösterilebilir. Emredici mevzuat hükümleri her durumda saklıdır.",
        ],
      },
      {
        title: "2. Hesap güvenliği ve doğru bilgi",
        bullets: [
          "Hesap bilgilerinin doğru ve güncel tutulması kullanıcının sorumluluğundadır.",
          "Şifre, oturum ve doğrulama bilgilerinin üçüncü kişilerle paylaşılmaması gerekir.",
          "Yetkisiz erişim şüphesinde destek@ilkoku.com adresine bildirim yapılmalıdır.",
          "Başka bir kişiyi yanıltıcı biçimde taklit eden, sahte veya kötüye kullanım amacı taşıyan hesaplar sınırlandırılabilir.",
        ],
      },
      {
        title: "3. Eserler ve kullanıcı içerikleri",
        paragraphs: [
          "Kullanıcı, İlkOku’ya yüklediği veya platform üzerinde oluşturduğu eser, bölüm, yorum, değerlendirme ve diğer içerikler üzerindeki hak sahipliğini korur. İçeriğin platforma yüklenmesi, fikrî mülkiyet haklarının İlkOku’ya devri anlamına gelmez.",
          "Kullanıcı; içeriğin saklanması, seçtiği görünürlük düzeyine göre gösterilmesi, editör incelemesi, okuyucu erişimi, yayınevi keşfi ve platformun ilgili işlevlerinin yürütülmesi için gerekli ölçüde sınırlı, hizmet amaçlı kullanım izni verir. Bu izin hizmetin sunulmasıyla sınırlıdır ve mevzuattan doğan hakları ortadan kaldırmaz.",
        ],
        bullets: [
          "Kullanıcı, yüklediği içeriği paylaşmaya yetkili olduğunu beyan eder.",
          "Başkalarının telif, marka, kişilik, gizlilik veya diğer haklarını ihlal eden içerik yüklenemez.",
          "Hukuka aykırı, tehdit edici, taciz edici, dolandırıcılık veya kötüye kullanım amacı taşıyan içerikler kaldırılabilir veya erişime kapatılabilir.",
        ],
      },
      {
        title: "4. Editör ve yayınevi işlevleri",
        paragraphs: [
          "Editör değerlendirmeleri profesyonel görüş niteliğindedir; yayın garantisi, satış taahhüdü veya eser hakkında kesin bir sonuç oluşturmaz. Yayınevlerinin beğeni, takip, inceleme veya iletişim işlemleri de yayın sözleşmesi ya da kabul taahhüdü sayılmaz.",
          "Yayınevi ve editör kullanıcıları, eriştikleri eser ve profil bilgilerini yalnızca kendilerine tanınan platform yetkileri ve hukuka uygun amaçlar çerçevesinde kullanmalıdır.",
        ],
      },
      {
        title: "5. Yasaklanan kullanım",
        bullets: [
          "Platformun güvenliğini, erişilebilirliğini veya diğer kullanıcıların kullanımını bozacak girişimlerde bulunmak.",
          "Yetkisiz veri toplamak, hesaplara erişmeye çalışmak, otomatik kötüye kullanım veya güvenlik önlemlerini aşmak.",
          "Zararlı yazılım, istenmeyen içerik veya hukuka aykırı materyal yaymak.",
          "Platformu başkalarının haklarını ihlal edecek veya suç teşkil edecek biçimde kullanmak.",
        ],
      },
      {
        title: "6. Hizmet değişiklikleri ve hesap işlemleri",
        paragraphs: [
          "İlkOku, güvenlik, teknik gereklilik, mevzuata uyum veya ürün geliştirme nedenleriyle hizmetlerde değişiklik yapabilir. Planlı veya zorunlu bakım nedeniyle geçici kesintiler yaşanabilir.",
          "Bu şartların veya mevzuatın ihlali, güvenlik riski ya da kötüye kullanım şüphesi halinde içerik görünürlüğü sınırlandırılabilir, işlemler durdurulabilir veya hesap hakkında gerekli tedbirler uygulanabilir. Kullanıcının kanuni başvuru ve itiraz hakları saklıdır.",
        ],
      },
      {
        title: "7. Sorumluluğun sınırları",
        paragraphs: [
          "İlkOku, kullanıcıların birbirleriyle kurduğu editoryal, ticari veya yayın ilişkilerinin tarafı değildir; açıkça ayrıca kararlaştırılmadıkça yayın, satış, gelir, okuyucu sayısı veya yayınevi kabulü garanti edilmez.",
          "Tüketici hukuku, kişisel verilerin korunması, fikrî mülkiyet ve diğer emredici mevzuattan doğan sorumluluklar bu maddeden etkilenmez.",
        ],
      },
      {
        title: "8. Uygulanacak hukuk ve iletişim",
        paragraphs: [
          "Emredici yetki ve tüketici mevzuatı hükümleri saklı kalmak üzere platformun kullanımında Türkiye Cumhuriyeti hukuku uygulanır.",
          `Bu şartlarla ilgili sorular için ${contactEmail} adresinden iletişim kurulabilir.`,
        ],
      },
    ],
  },
  "gizlilik-politikasi": {
    title: "Gizlilik Politikası",
    description: "İlkOku'nun kişisel verileri ve kullanıcı gizliliğini ele alma yaklaşımı.",
    updatedAt: "12 Ağustos 2026",
    sections: [
      {
        title: "1. Politikanın amacı",
        paragraphs: [
          "Bu politika, İlkOku hizmetleri kullanılırken oluşabilecek kişisel verilerin hangi genel kategorilerde işlendiğini, hangi amaçlarla kullanılabileceğini ve kullanıcıların hangi başvuru kanallarına sahip olduğunu açıklar. KVKK kapsamındaki ayrıntılı aydınlatma için KVKK Aydınlatma Metni ayrıca yayımlanır.",
        ],
      },
      {
        title: "2. İşlenebilecek veri kategorileri",
        bullets: [
          "Hesap ve iletişim bilgileri: ad, e-posta adresi, hesap ve rol bilgileri.",
          "Profil ve mesleki bilgiler: kullanıcı tarafından role göre eklenen profil, editör veya yayınevi bilgileri.",
          "Eser ve içerik verileri: eserler, bölümler, revizyonlar, açıklamalar ve kullanıcının oluşturduğu diğer içerikler.",
          "Etkileşim verileri: yorumlar, geri bildirimler, favoriler, takipler, başvurular ve platform içi işlemler.",
          "Güvenlik ve teknik veriler: oturum, cihaz güvenliği, erişim ve hata kayıtları ile kötüye kullanımın önlenmesine yönelik teknik kayıtlar.",
          "İletişim ve teslimat kayıtları: destek talepleri ile platform tarafından gönderilen e-postaların operasyonel teslimat kayıtları.",
        ],
      },
      {
        title: "3. Kullanım amaçları",
        bullets: [
          "Hesap oluşturmak, kimlik doğrulamak ve rol bazlı erişimi sağlamak.",
          "Eser yazma, okuma, editör incelemesi ve yayınevi keşif özelliklerini sunmak.",
          "Güvenliği sağlamak, yetkisiz erişimi ve kötüye kullanımı önlemek.",
          "Bildirim, destek ve hizmet iletişimlerini yürütmek.",
          "Hukuki yükümlülükleri yerine getirmek ve hakların tesisi, kullanılması veya korunmasını sağlamak.",
          "Hizmetin performansını ve güvenilirliğini geliştirmek; bu amaçla mümkün olduğunda toplulaştırılmış veya kişisel olmayan veriler kullanmak.",
        ],
      },
      {
        title: "4. Paylaşım ve aktarım",
        paragraphs: [
          "Kişisel veriler, hizmetin sunulması için gerekli olduğu ölçüde barındırma, e-posta, güvenlik ve teknik altyapı sağlayıcılarıyla; hukuki zorunluluk halinde yetkili kamu kurumlarıyla; kullanıcının seçtiği platform işlevinin doğal gereği olarak ilgili editör, yayınevi veya diğer kullanıcılarla paylaşılabilir.",
          "Her paylaşımın kapsamı amaçla sınırlı tutulur. Yurt dışına veri aktarımı söz konusu olduğunda yürürlükteki kişisel veri mevzuatındaki aktarım şartları dikkate alınır.",
        ],
      },
      {
        title: "5. Saklama ve güvenlik",
        paragraphs: [
          "Veriler, işleme amacı için gerekli süre boyunca ve ilgili mevzuatta öngörülen saklama süreleri dikkate alınarak tutulur. Süre sonunda veriler uygulanabilir mevzuat ve teknik gerekliliklere göre silinir, yok edilir veya anonim hâle getirilir.",
          "İlkOku; erişim kontrolü, oturum güvenliği, yetkilendirme ve operasyonel kayıtlar gibi teknik ve idari önlemler kullanır. İnternet üzerinden hiçbir sistem için mutlak güvenlik garantisi verilemez; buna rağmen risklerle orantılı güvenlik tedbirleri uygulanır.",
        ],
      },
      {
        title: "6. Çerezler",
        paragraphs: [
          "Oturum, hesap güvenliği ve zorunlu platform işlevleri için teknik çerezler kullanılabilir. Güncel ayrıntılar Çerez Politikası içinde açıklanır.",
        ],
      },
      {
        title: "7. Haklar ve iletişim",
        paragraphs: [
          `Kişisel verilerle ilgili talepler ${contactEmail} adresine iletilebilir. KVKK kapsamındaki haklar ve başvuru bilgileri KVKK Aydınlatma Metni'nde açıklanır.`,
        ],
      },
    ],
  },
  kvkk: {
    title: "KVKK Aydınlatma Metni",
    description: "6698 sayılı Kanun kapsamında İlkOku kullanıcılarına yönelik aydınlatma metni.",
    updatedAt: "12 Ağustos 2026",
    sections: [
      {
        title: "1. Veri sorumlusunun kimliği",
        paragraphs: [
          `Veri sorumlusu: ${operatorIdentity}.`,
          `İletişim e-postası: ${contactEmail}.`,
        ],
      },
      {
        title: "2. Kişisel verilerin işlenme amaçları",
        bullets: [
          "Üyelik, giriş, oturum, hesap ve rol süreçlerinin yürütülmesi.",
          "Yazarların eser oluşturma ve yayınlama; okuyucuların okuma ve etkileşim; editörlerin inceleme; yayınevlerinin keşif ve ekip süreçlerinin yürütülmesi.",
          "Hesap, platform ve eser güvenliğinin sağlanması; kötüye kullanım ve yetkisiz erişimin önlenmesi.",
          "Destek, bildirim ve operasyonel e-posta süreçlerinin yürütülmesi.",
          "Hukuki yükümlülüklerin yerine getirilmesi ve bir hakkın tesisi, kullanılması veya korunması.",
          "Hizmet kalitesi, hata tespiti ve sistem güvenilirliğinin geliştirilmesi.",
        ],
      },
      {
        title: "3. İşlenen veri kategorileri",
        bullets: [
          "Kimlik ve iletişim bilgileri.",
          "Hesap, rol, profil ve üyelik bilgileri.",
          "Eser, bölüm, revizyon ve diğer kullanıcı içerikleri.",
          "Yorum, değerlendirme, favori, takip, başvuru ve etkileşim kayıtları.",
          "İşlem güvenliği, oturum, cihaz ve erişim kayıtları.",
          "Destek, bildirim ve e-posta teslimat kayıtları.",
        ],
      },
      {
        title: "4. Toplama yöntemi ve hukuki sebepler",
        paragraphs: [
          "Kişisel veriler; kayıt ve profil formları, platform içi işlemler, eser ve etkileşim özellikleri, destek iletişimleri, zorunlu çerezler ve güvenlik/erişim kayıtları aracılığıyla elektronik ortamda toplanabilir.",
          "İşleme faaliyetine göre 6698 sayılı Kanun'un 5. maddesinde yer alan sözleşmenin kurulması veya ifası, veri sorumlusunun hukuki yükümlülüğü, bir hakkın tesisi/kullanılması/korunması ve ilgili kişinin temel haklarına zarar vermemek kaydıyla meşru menfaat hukuki sebeplerine dayanılabilir. Açık rıza gerektiren işlemler varsa açık rıza ayrıca ve özgür iradeyle alınır.",
        ],
      },
      {
        title: "5. Kişisel verilerin aktarılabileceği taraflar",
        paragraphs: [
          "Veriler; hizmetin sunulması için gerekli teknik altyapı, barındırma, e-posta ve güvenlik hizmet sağlayıcılarına; kanuni yükümlülük halinde yetkili kamu kurum ve kuruluşlarına; hukuki ve mali danışmanlara; kullanıcının kullandığı işlevin gerektirdiği ölçüde editör, yayınevi veya diğer platform kullanıcılarına aktarılabilir.",
          "Yurt dışına aktarım yapılması halinde 6698 sayılı Kanun'un yürürlükteki yurt dışı aktarım hükümleri uygulanır.",
        ],
      },
      {
        title: "6. İlgili kişinin KVKK kapsamındaki hakları",
        bullets: [
          "Kişisel verilerinin işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin bilgi talep etme.",
          "İşleme amacını ve verilerin amacına uygun kullanılıp kullanılmadığını öğrenme.",
          "Kişisel verilerin yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme.",
          "Eksik veya yanlış işlenen verilerin düzeltilmesini isteme.",
          "Kanundaki şartlar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme.",
          "Düzeltme, silme veya yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
          "Münhasıran otomatik sistemlerle analiz sonucu kişinin aleyhine bir sonucun ortaya çıkmasına itiraz etme.",
          "Kanuna aykırı işleme nedeniyle zarara uğranması hâlinde zararın giderilmesini talep etme.",
        ],
      },
      {
        title: "7. Başvuru",
        paragraphs: [
          `KVKK kapsamındaki talepler ${contactEmail} adresine iletilebilir. Başvurunun güvenli şekilde sonuçlandırılması için talebin niteliğine göre kimlik doğrulayıcı ek bilgi istenebilir. Mevzuatta öngörülen diğer başvuru yöntemleri de kullanılabilir.`,
        ],
      },
    ],
  },
  "cerez-politikasi": {
    title: "Çerez Politikası",
    description: "İlkOku'nun zorunlu çerez kullanımına ilişkin açıklamalar.",
    updatedAt: "12 Ağustos 2026",
    sections: [
      {
        title: "1. Çerez nedir?",
        paragraphs: [
          "Çerezler, bir internet sitesinin güvenli ve tutarlı çalışması, oturumun sürdürülmesi veya kullanıcının tercihinin hatırlanması gibi amaçlarla tarayıcıya kaydedilebilen küçük veri parçalarıdır.",
        ],
      },
      {
        title: "2. İlkOku tarafından kullanılan zorunlu çerezler",
        bullets: [
          "ilkoku_session — Kullanıcı oturumunu doğrulamak ve hesabın giriş durumunu sürdürmek için kullanılır. Mevcut uygulama ayarında azami 30 gün süreli, HttpOnly, üretimde Secure ve SameSite=Lax olarak ayarlanır.",
          "ilkoku_known_device — Hesap güvenliği kapsamında daha önce doğrulanmış cihazı tanımaya yardımcı olur. Mevcut uygulama ayarında azami 1 yıl süreli, HttpOnly, üretimde Secure ve SameSite=Lax olarak ayarlanır.",
          "ilkoku_admin_role_view — Yalnızca yönetim işlevlerinde rol görünümünü güvenli biçimde sürdürmek için kullanılır. Azami 4 saat süreli, HttpOnly, üretimde Secure ve SameSite=Strict olarak ayarlanır.",
        ],
      },
      {
        title: "3. Zorunlu olmayan çerezler",
        paragraphs: [
          "Mevcut İlkOku uygulama kodunda reklam/hedefleme veya kullanıcı davranışını takip eden analitik çerez tanımı bulunmamaktadır. İleride zorunlu olmayan çerezler eklenirse, bu politika güncellenir ve yürürlükteki mevzuat gerektiriyorsa bu çerezler varsayılan olarak çalıştırılmadan önce kullanıcıya açık tercih imkânı sunulur.",
          "Barındırma, güvenlik veya ağ katmanında üçüncü taraf altyapı sağlayıcıları kendi teknik çerezlerini kullanıyorsa bunlar ilgili sağlayıcının işlevine ve hukuki rolüne göre ayrıca değerlendirilir.",
        ],
      },
      {
        title: "4. Çerezlerin yönetimi",
        paragraphs: [
          "Tarayıcı ayarlarından çerezler görüntülenebilir, silinebilir veya engellenebilir. Ancak oturum ve güvenlik için zorunlu çerezlerin engellenmesi giriş, hesap güvenliği veya bazı platform işlevlerinin çalışmamasına neden olabilir.",
        ],
      },
      {
        title: "5. İletişim",
        paragraphs: [
          `Çerezler ve kişisel verilerle ilgili sorular ${contactEmail} adresine iletilebilir.`,
        ],
      },
    ],
  },
  "telif-hakki-politikasi": {
    title: "Telif Hakkı Politikası",
    description: "İlkOku'da eser sahipliği, hak ihlali bildirimi ve içerik kaldırma süreci.",
    updatedAt: "12 Ağustos 2026",
    sections: [
      {
        title: "1. Eser sahipliği",
        paragraphs: [
          "İlkOku'ya yüklenen veya platform üzerinde oluşturulan edebî eserlerin ve diğer özgün içeriklerin hak sahipliği, ilgili kullanıcıya veya hukuken yetkili hak sahibine aittir. Platforma içerik yüklemek, eser sahibinin mali veya manevi haklarının İlkOku'ya devri anlamına gelmez.",
          "İlkOku yalnızca platform işlevlerini sağlayabilmek için Kullanım Şartlarında açıklanan sınırlı hizmet kullanım izninden yararlanır.",
        ],
      },
      {
        title: "2. Kullanıcının sorumluluğu",
        bullets: [
          "Kullanıcı yalnızca kendisine ait veya paylaşmaya yetkili olduğu içeriği yüklemelidir.",
          "Başkasına ait eserlerin izinsiz kopyalanması, çoğaltılması, uyarlanması veya paylaşılması yasaktır.",
          "Kaynak göstermek tek başına her kullanım için izin yerine geçmez; kullanımın mevzuata ve varsa lisans şartlarına uygun olması gerekir.",
        ],
      },
      {
        title: "3. Telif ihlali bildirimi",
        paragraphs: [
          `Hak sahibi veya yetkili temsilcisi, ihlal iddiasını ${contactEmail} adresine iletebilir. Bildirimde mümkün olduğunca aşağıdaki bilgiler yer almalıdır:`,
        ],
        bullets: [
          "Hak sahibinin veya yetkili temsilcinin adı ve iletişim bilgileri.",
          "Korunduğu ileri sürülen eserin tanımı.",
          "İhlal edildiği düşünülen İlkOku içeriğinin bağlantısı veya içeriği belirlemeye yeterli bilgi.",
          "İddianın dayanağı ve varsa hak sahipliğini gösteren bilgi veya belgeler.",
          "Bildirimin iyi niyetle ve doğru bilgiye dayanarak yapıldığına ilişkin açıklama.",
        ],
      },
      {
        title: "4. İnceleme ve tedbir",
        paragraphs: [
          "Yeterli bir ihlal bildirimi alındığında içerik ve mevcut bilgiler incelenebilir; uyuşmazlığın niteliğine göre içerik geçici olarak erişime kapatılabilir, ilgili kullanıcıdan açıklama istenebilir veya hukuken gerekli diğer tedbirler uygulanabilir.",
          "İlkOku, karmaşık hak sahipliği uyuşmazlıklarında mahkeme yerine geçerek kesin mülkiyet kararı vermez. Tarafların kanuni başvuru ve dava hakları saklıdır.",
        ],
      },
      {
        title: "5. Kötüye kullanım",
        paragraphs: [
          "Bilerek gerçeğe aykırı telif bildirimi yapmak veya telif sürecini bir kullanıcıyı susturmak, taciz etmek ya da meşru içeriği kaldırmak amacıyla kötüye kullanmak platform kurallarının ihlali sayılabilir.",
        ],
      },
    ],
  },
};

export const legalNavigation = [
  ["kullanim-sartlari", "Kullanım Şartları"],
  ["gizlilik-politikasi", "Gizlilik Politikası"],
  ["kvkk", "KVKK"],
  ["cerez-politikasi", "Çerez Politikası"],
  ["telif-hakki-politikasi", "Telif Hakkı"],
] as const;

export function legalPageToCmsBody(page: LegalPage) {
  return page.sections
    .map((section) => {
      const parts: string[] = [`## ${section.title}`];
      if (section.paragraphs?.length) parts.push(section.paragraphs.join("\n\n"));
      if (section.bullets?.length) parts.push(section.bullets.map((item) => `- ${item}`).join("\n"));
      return parts.join("\n\n");
    })
    .join("\n\n");
}
