export type HistoryContent = Record<string, string>;

export const historyDefaults: HistoryContent = {
  backgroundColor: "#F5F2FA",
  introEyebrow: "HİKÂYENİN YOLCULUĞU",
  introTitle: "Her şey bir “ilk” ile başlar.",
  introDescription1: "Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor.",
  introDescription2: "Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.",

  card1Period: "MÖ 23. YÜZYIL – YAZ",
  card1Title: "Enheduanna",
  card1Lead: "Bir yazar, adını eserinin yanında bıraktı.",
  card1Body: "Binlerce yıl geçti. Adı hâlâ okunuyor.",
  card1Image: "/landing/history/real/enheduanna-disk.webp",
  card1Alt: "Enheduanna kabartmalı diskinin müze fotoğrafı",

  card2Period: "MÖ 3. YÜZYIL – DÜZENLE",
  card2Title: "Zenodotos",
  card2Lead: "Homeros metinlerini karşılaştırdı, düzenledi ve okura hazırladı.",
  card2Body: "Bir metnin güvenilir biçimde aktarılması, dikkatli bir ikinci bakışla başladı.",
  card2Image: "/landing/history/real/homer-papyrus.webp",
  card2Alt: "Homeros'un İlyada metnini taşıyan antik papirüsün fotoğrafı",

  card3Period: "1534 – YAYINLA",
  card3Title: "Cambridge University Press",
  card3Lead: "Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.",
  card3Body: "Yazarın sözü, dünyanın yankısı oldu.",
  card3Image: "/landing/history/real/cambridge-pitt-building.webp",
  card3Alt: "Cambridge University Press Pitt Building binasının fotoğrafı",

  card4Period: "1896 – PERDEYE TAŞI",
  card4Title: "Hikâye perdeye çıktı.",
  card4Lead: "Hikâyeler artık yalnızca okunmuyordu, izlenmeye de başlandı.",
  card4Body: "Bir eser, yaşadığı yerde kalmak zorunda değildi.",
  card4Image: "/landing/history/real/lumiere-train-stills.webp",
  card4Alt: "Lumière kardeşlerin Trenin La Ciotat Garı'na Varışı filminden gerçek kareler",

  leftDecorImage: "/landing/history/reference-15/left-decor.webp",
  leftDecorAlt: "Kitap, mürekkep, kalem, kâğıt ve lavanta",

  cardVisible: "1",
  cardBackgroundImage: "",
  cardEyebrow: "2026 – ŞİMDİ SIRA SENDE.",
  cardTitleLine1: "Bugünün ilk cümlesi,",
  cardTitleLine2: "yarının kitabı olabilir.",

  step1Image: "/landing/history/reference-15/reader.svg",
  step1Alt: "Açık kitap ve büyüteç",
  step1Text: "Bir okur onu ilk kez keşfedebilir.",
  step2Image: "/landing/history/reference-15/editor.svg",
  step2Alt: "Mürekkep, tüy kalem ve açık kitap",
  step2Text: "Bir editör onu geliştirebilir.",
  step3Image: "/landing/history/reference-15/publisher.svg",
  step3Alt: "Mühürlü mektup",
  step3Text: "Bir yayınevi ona inanabilir.",
  step4Image: "/landing/history/reference-15/journey.svg",
  step4Alt: "Dağa ve ufka uzanan yol",
  step4Text: "Ve bir gün o hikâye başladığından çok daha uzağa gidebilir.",

  closingQuestion: "Seninki neden sıradaki hikâye olmasın?",
  bottomSlogan: "Her şey bir “ilk” ile başlar.",
  brandText: "İlkOku.",
  sealImage: "/landing/history/reference-15/seal.svg",
  sealAlt: "İlkOku mor mühür",
  sealVisible: "1",
};

export function mergeHistoryContent(value?: Record<string, unknown> | null): HistoryContent {
  if (!value) return { ...historyDefaults };
  const strings = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return { ...historyDefaults, ...strings };
}

export function safeHistoryImageSrc(value: string, fallback: string) {
  const src = value.trim();
  if (src.startsWith("/")) return src;
  if (src.startsWith("https://")) return src;
  return fallback;
}
