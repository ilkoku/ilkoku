import { authContent } from "./auth";
import { dashboardContent } from "./dashboard";
import { editorsContent } from "./editors";
import { commonContent, navigationContent } from "./navigation";
import { notificationContent } from "./notifications";
import { publisherContent } from "./publisher";
import { readingContent } from "./reading";
import { validationContent } from "./validation";
import { writerContent } from "./writer";

export const tr = {
  brand: {
    name: commonContent.brandName,
    tagline: commonContent.tagline,
    homeLabel: commonContent.homeLabel,
    logoAlt: commonContent.logoAlt,
  },
  system: {
    notFound: {
      code: "404",
      title: "Sayfa bulunamadı.",
      description: "Aradığın sayfa taşınmış, silinmiş veya henüz yazılmamış olabilir.",
      action: commonContent.homeAction,
    },
    pageError: {
      code: "Bir sorun oluştu",
      title: "Sayfa şu anda açılmıyor.",
      description:
        "Çalışmanı kaybetmedin. Yeniden deneyebilir veya ana sayfaya dönebilirsin.",
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
  },
  navigation: navigationContent,
  auth: authContent,
  dashboard: dashboardContent,
  writer: writerContent,
  reading: readingContent,
  editors: editorsContent,
  publisher: publisherContent,
  validation: validationContent,
  notifications: notificationContent,
} as const;
