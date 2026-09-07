export const WRITER_MOTIVATION_NAMESPACE = "writer_motivation";
export const WRITER_MOTIVATION_KEY = "series";
export const WRITER_MOTIVATION_MINIMUM = 30;
export const WRITER_MOTIVATION_MAXIMUM = 365;
const WRITER_MOTIVATION_MAX_LENGTH = 240;

export const defaultWriterMotivations = [
  "Küçük bir bölüm de ilerlemedir.",
  "Bugün yazdığın tek paragraf, yarının sayfasını açar.",
  "Metin, geri döndükçe güçlenir.",
  "İlk taslağın görevi kusursuz olmak değil, var olmaktır.",
  "Bir cümle daha, hikâyeyi senden biraz daha ileri taşır.",
  "Ritim hızdan değil, geri dönmekten doğar.",
  "Bugün metne dokunman bile yolculuğun bir parçası.",
  "Yazının yönü bazen ancak yazarken görünür.",
  "Bitirmek için önce devam etmek gerekir.",
  "Her bölüm, eserin dünyasını biraz daha görünür kılar.",
  "Kendine değil, bugünkü cümleye odaklan.",
  "İyi metinler çoğu zaman yeniden dönülen metinlerdir.",
  "Bir sahneyi çözmek, bütün kitabı çözmek zorunda değildir.",
  "Bugünün işi yalnızca bir sonraki adımı atmaktır.",
  "Yarım kalan cümle, geri dönmek için bir kapıdır.",
  "Yazma disiplini, ilhamı beklemekten daha güvenilirdir.",
  "Metnin sesi, tekrar geldikçe belirginleşir.",
  "Bir sayfa az görünür; birikince eser olur.",
  "Bugün yazdığın şey, yarın değiştirebileceğin bir şeydir.",
  "İlerleme bazen yeni yazmak, bazen doğru yeri yeniden görmektir.",
  "Hikâyenin senden istediği tek şey, ona tekrar dönmen.",
  "Kusursuz cümleyi değil, yaşayan cümleyi ara.",
  "Her dönüş, metinle arandaki mesafeyi biraz azaltır.",
  "Bir karakteri anlamanın yolu bazen onu bir sayfa daha yürütmektir.",
  "Bugün küçük görünse de devamlılık metnin hafızasıdır.",
  "Bir bölüm daha değil; bir adım daha.",
  "Yazdıkça kararların netleşir, hikâye yerini bulur.",
  "Metnin ritmi sen döndükçe oluşur.",
  "Başladığın yere bak; artık aynı yerde değilsin.",
  "Otuz aktif gün: artık yalnız başlamadın, bir ritim kurdun.",
] as const;

export function normalizeWriterMotivations(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > WRITER_MOTIVATION_MAXIMUM) {
    return null;
  }

  const motivations: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") return null;
    const value = item.trim();
    if (value.length < 4 || value.length > WRITER_MOTIVATION_MAX_LENGTH) return null;
    motivations.push(value);
  }

  return motivations;
}
