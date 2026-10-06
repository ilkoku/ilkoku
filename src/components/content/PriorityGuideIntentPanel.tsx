type PriorityGuideIntent = {
  eyebrow: string;
  question: string;
  answer: string;
  difference: string;
  caseLabel: string;
  caseText: string;
  outputs: readonly string[];
};

const PRIORITY_GUIDE_INTENTS: Readonly<Record<string, PriorityGuideIntent>> = {
  roman: {
    eyebrow: "Roman yazarlığı · arama niyeti",
    question: "Roman nasıl yazılır ve uzun bir hikâye dağılmadan nasıl planlanır?",
    answer:
      "Romanı yalnız uzun bir metin olarak değil; karakter dönüşümü, ana çatışma, bölüm/sahne omurgası ve revizyon sırasıyla çalışan bir sistem olarak kur.",
    difference:
      "Öyküden farklı olarak roman, tek bir kırılma anından çok daha uzun süre taşıyabilen karakter, ilişki ve alt olay sürekliliği ister. Bu nedenle fikirden önce değil, fikirle birlikte bir devamlılık planı kurmak gerekir.",
    caseLabel: "Bu sayfada çözmek istediğimiz temel problem",
    caseText:
      "Bir roman fikrini ilk bölüm heyecanından çıkarıp yüzlerce sayfa boyunca taşıyabilecek karakter hedefi, çatışma zinciri ve bölüm ritmine dönüştürmek.",
    outputs: [
      "Tek cümlelik roman motoru",
      "Karakter dönüşüm çizgisi",
      "Bölüm / sahne omurgası",
      "Büyükten küçüğe revizyon sırası",
    ],
  },
  oyku: {
    eyebrow: "Öykü yazarlığı · arama niyeti",
    question: "Kısa öykü nasıl yazılır ve az sayfada güçlü etki nasıl kurulur?",
    answer:
      "Öyküyü küçültülmüş roman gibi değil; tek bir değişim, sınırlı zaman/mekân, seçilmiş ayrıntı ve final yankısı üzerinden yoğunlaştırılmış bir anlatı olarak kur.",
    difference:
      "Roman genişleme hakkına sahipken öykü seçme ve çıkarma disiplinine dayanır. Her karakter, geçmiş bilgisi ve nesne merkezdeki değişime hizmet etmiyorsa metinden yük çalar.",
    caseLabel: "Bu sayfadaki özgün çalışma problemi",
    caseText:
      "Bir karakterin bütün hayatını anlatmadan, tek bir zarf, karar ve zaman baskısıyla geçmişle ilişkisinin değiştiği anı görünür kılmak.",
    outputs: [
      "Tek kırılma anı",
      "Sınırlı zaman ve mekân planı",
      "Seçilmiş ayrıntı listesi",
      "Açıklamadan çalışan final yankısı",
    ],
  },
  fantastik: {
    eyebrow: "Fantastik kurgu · arama niyeti",
    question: "Fantastik kurgu nasıl yazılır ve dünya kurma hikâyeyi boğmadan nasıl yapılır?",
    answer:
      "Dünyayı ansiklopedi gibi büyütmek yerine bir kural, o kuralın sınırı, bedeli ve karakterin seçimi üzerinden çalışan bir sistem kur.",
    difference:
      "Fantastikte olağanüstü unsur yalnız dekor olduğunda hikâye zayıflar. Güçlü kurgu; büyü, kaynak, kültür ve iktidar kararlarını doğrudan karakterin hedefi ve kaybıyla bağlar.",
    caseLabel: "Örnek vaka odağı",
    caseText:
      "Kül Haritası örneğinde büyü sistemi, şehri besleyen ateş damarları ve Haritacıların her kullanımda anı kaybetmesi üzerinden aynı anda dünya, bedel ve karakter çatışması üretir.",
    outputs: [
      "Dünya kuralı ve sınırı",
      "Büyü / güç bedeli",
      "Kültür ve iktidar etkisi",
      "Karaktere bağlanan dünya çatışması",
    ],
  },
  "bilim-kurgu": {
    eyebrow: "Bilim kurgu · arama niyeti",
    question: "Bilim kurgu nasıl yazılır ve bilimsel fikir hikâyeye nasıl dönüştürülür?",
    answer:
      "Bir 'ya şöyle olsaydı?' varsayımını tek başına bırakma; kuralını, ilk sonucunu, ikinci sonucunu ve karakterin vermek zorunda kaldığı etik kararı zincir hâline getir.",
    difference:
      "Bilim kurgu, teknoloji kataloğu değildir. Okurun ikna olduğu şey cihazın ne kadar havalı olduğu değil; varsayımın kendi kuralları içinde neyi değiştirdiği ve bu değişimin insan hayatında gerçek bedel üretmesidir.",
    caseLabel: "Örnek vaka odağı",
    caseText:
      "Derin Sessizlik örneğinde Europa'daki olası yaşam, yalnız keşif konusu değil; gözlem ile müdahale arasındaki sınırı ve bilim insanının başarı arzusu ile koruma sorumluluğunu aynı kararda çatıştırır.",
    outputs: [
      "Spekülatif varsayım",
      "Gerçek / çıkarım / icat ayrımı",
      "Sonuç zinciri",
      "Etik ve kişisel karar noktası",
    ],
  },
  distopya: {
    eyebrow: "Distopya · arama niyeti",
    question: "Distopya nasıl yazılır ve baskıcı sistem inandırıcı biçimde nasıl kurulur?",
    answer:
      "Kötü bir yönetim ilan etmek yerine sistemin hangi korku veya vaatle meşrulaştığını, gündelik hayatı hangi mekanizmalarla kontrol ettiğini ve karakteri hangi seçimlere zorladığını göster.",
    difference:
      "Distopyayı yalnız karanlık atmosferden ayıran şey sistem mantığıdır. Kural, propaganda, teşvik, ceza ve vatandaşın gündelik uyumu birlikte çalışmadığında dünya yalnız dekor olarak kalır.",
    caseLabel: "Bu sayfadaki temel çözüm problemi",
    caseText:
      "Okurun 'bu sistem neden böyle sürüyor?' sorusuna kurum, alışkanlık ve çıkar düzeyinde cevap verirken; karakterin direnişini de yalnız cesaret değil gerçek bedel üzerinden kurmak.",
    outputs: [
      "Sistemin vaat ettiği düzen",
      "Kontrol ve teşvik mekanizması",
      "Gündelik hayata yansıyan kural",
      "Bedelli direniş kararı",
    ],
  },
  siir: {
    eyebrow: "Şiir yazarlığı · arama niyeti",
    question: "Şiir nasıl yazılır ve duygu açıklamadan nasıl hissettirilir?",
    answer:
      "Duyguyu isimlendirmek yerine onu taşıyacak imgeyi, kelime alanını, sesi, dize kırılmasını ve sessizliği birlikte çalıştır.",
    difference:
      "Şiiri kısa düzyazıdan ayıran şey yalnız satır sonları değildir. Anlam, ritim, nefes ve boşluk aynı anda karar verir; bu nedenle revizyon çoğu zaman eklemekten çok kelimeyi ve açıklamayı azaltır.",
    caseLabel: "Örnek vaka odağı",
    caseText:
      "İskelede Kalan Ses örneği, 'özlem' veya 'kayıp' demeden boş bank, sustuğu fark edilen anons ve bekleyen beden üzerinden duyguyu kurar.",
    outputs: [
      "Taşıyıcı ana imge",
      "Kelime ve ses alanı",
      "Bilinçli dize kırılması",
      "Sesli okuma sonrası revizyon",
    ],
  },
};

export function PriorityGuideIntentPanel({ slug }: { slug: string }) {
  const intent = PRIORITY_GUIDE_INTENTS[slug];
  if (!intent) return null;

  return (
    <section
      aria-labelledby={`priority-guide-intent-${slug}`}
      className="mb-6 rounded-[2rem] border border-[#6b52c7]/12 bg-[#fffdf8] p-6 shadow-[0_14px_44px_rgba(34,23,70,0.06)] sm:p-8"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">
        {intent.eyebrow}
      </p>
      <h2
        id={`priority-guide-intent-${slug}`}
        className="mt-3 max-w-4xl font-serif text-3xl font-semibold tracking-[-0.035em] text-[#211746] sm:text-4xl"
      >
        {intent.question}
      </h2>
      <p className="mt-5 max-w-4xl text-base font-semibold leading-8 text-[#3b3350]">
        {intent.answer}
      </p>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[#686171]">
        {intent.difference}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[1.45rem] bg-[#17122f] p-5 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#b7a8ff]">
            {intent.caseLabel}
          </p>
          <p className="mt-3 text-sm leading-7 text-[#e7e2f2]">{intent.caseText}</p>
        </div>
        <div className="rounded-[1.45rem] border border-[#6b52c7]/12 bg-[#efebff] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#5b35dd]">
            Bu rehberden çıkarken
          </p>
          <ul className="mt-3 space-y-2">
            {intent.outputs.map((output) => (
              <li className="flex gap-2 text-sm font-semibold leading-6 text-[#4a4258]" key={output}>
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6b52c7]" />
                <span>{output}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
