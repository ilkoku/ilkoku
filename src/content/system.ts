import { commonContent } from "./navigation";

export const systemContent = {
  notFound: {
    code: "404",
    title: "Sayfa bulunamadı.",
    description: "Aradığın sayfa taşınmış, silinmiş veya henüz yazılmamış olabilir.",
    action: commonContent.homeAction,
  },
  pageError: {
    code: "Bir sorun oluştu",
    title: "Sayfa şu anda açılmıyor.",
    description: "Çalışmanı kaybetmedin. Yeniden deneyebilir veya ana sayfaya dönebilirsin.",
    retry: "Yeniden Dene",
    home: commonContent.homeAction,
  },
  globalError: {
    code: "500",
    title: "Beklenmeyen bir sorun oluştu.",
    description: "İlkOku kısa süre içinde yeniden hazır olacak. Şimdi tekrar deneyebilirsin.",
    retry: "Yeniden Dene",
    home: commonContent.homeAction,
  },
} as const;
