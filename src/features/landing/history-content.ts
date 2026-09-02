export type HistoryContent = Record<string, string> | undefined;

export const historyDefaults = {
  backgroundColor: "#F5F2FA",
  headerEyebrow: "HİKÂYENİN YOLCULUĞU",
  headerTitleBefore: "Her şey bir",
  headerTitleEmphasis: "“ilk”",
  headerTitleAfter: "ile başlar.",
  headerDescriptionLine1: "Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor.",
  headerDescriptionLine2: "Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.",
  card1Era: "MÖ 23. YÜZYIL – YAZI",
  card1Title: "Enheduanna",
  card1Body: "Bir yazar, adını eserinin yanında bıraktı.",
  card1Note: "Binlerce yıl geçti. Adı hâlâ okunuyor.",
  card1Image: "/landing/history/cards/history-enheduanna.svg",
  card1ImageAlt: "Enheduanna ve çivi yazısı betimlemesi",
  card2Era: "MÖ 3. YÜZYIL – ÇALIŞTIR",
  card2Title: "Zenodotos",
  card2Body: "Birisi yazılmış bir metne yeniden baktı.",
  card2Note: "Çünkü bazen bir eser, ikinci bir bakışla daha da güçlenir.",
  card2Image: "/landing/history/cards/history-zenodotos.svg",
  card2ImageAlt: "Antik yazı tableti betimlemesi",
  card3Era: "1534 – İNAN",
  card3Title: "Cambridge University Press",
  card3Body: "Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.",
  card3Note: "Yazarın sözü, dünyanın yankısı oldu.",
  card3Image: "/landing/history/cards/history-cambridge.svg",
  card3ImageAlt: "Cambridge University Press tarihî belge ve mühür betimlemesi",
  card4Era: "1895 – HAYATA GEÇİR.",
  card4Title: "Hikâye perdeye çıktı.",
  card4Body: "Hikâyeler artık yalnızca okunmuyordu, izlenmeye de başlandı.",
  card4Note: "Bir eser, yaşadığı yerde kalmak zorunda değildi.",
  card4Image: "/landing/history/cards/history-train.svg",
  card4ImageAlt: "Tarihî tren ve yolculuk sahnesi",
  leftVisual: "/landing/history/history-left-decor.svg",
  leftVisualAlt: "Kitap, mürekkep, kalem, kâğıt ve lavanta kompozisyonu",
  nowVisible: "true",
  nowBackground: "",
  nowEyebrow: "2026 – ŞİMDİ SIRA SENDE.",
  nowTitleLine1: "Bugünün ilk cümlesi,",
  nowTitleLine2: "yarının kitabı olabilir.",
  nowStep1Image: "/icons/roles/reader-role-v2.webp",
  nowStep1Text: "Bir okur onu ilk kez keşfedebilir.",
  nowStep2Image: "/icons/roles/editor-role-v2.webp",
  nowStep2Text: "Bir editör onu geliştirebilir.",
  nowStep3Image: "/icons/roles/publisher-embedded.svg",
  nowStep3Text: "Bir yayınevi ona inanabilir.",
  nowStep4Image: "/icons/roles/writer-embedded.svg",
  nowStep4Text: "Ve bir gün o hikâye başladığından çok daha uzağa gidebilir.",
  nowQuestion: "Seninki neden sıradaki hikâye olmasın?",
  nowTagline: "Her şey bir “ilk” ile başlar.",
  nowBrand: "İlkOku.",
  nowSealImage: "/landing/history/layers/ilkoku-seal-preview.svg",
  nowSealAlt: "İlkOku açık kitap mühürü",
  nowSealVisible: "true",
} as const;

export type HistoryFieldKey = keyof typeof historyDefaults;

export function historyValue(content: HistoryContent, key: HistoryFieldKey): string {
  const value = content?.[key]?.trim();
  return value || historyDefaults[key];
}

export function historyFlag(content: HistoryContent, key: "nowVisible" | "nowSealVisible"): boolean {
  const value = content?.[key]?.trim().toLowerCase();
  if (!value) return historyDefaults[key] === "true";
  return value !== "false" && value !== "0" && value !== "off";
}

export function safeHistoryColor(content: HistoryContent): string {
  const value = content?.backgroundColor?.trim();
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : historyDefaults.backgroundColor;
}

export function safeHistoryAsset(content: HistoryContent, key: HistoryFieldKey): string {
  const value = historyValue(content, key);
  return value.startsWith("/") ? value : historyDefaults[key];
}
