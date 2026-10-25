import { authContent } from "./auth";
import { dashboardContent } from "./dashboard";
import { editorsContent } from "./editors";
import { commonContent, navigationContent } from "./navigation";
import { notificationContent } from "./notifications";
import { publisherContent } from "./publisher";
import { readingContent } from "./reading";
import { validationContent } from "./validation";
import { writerContent } from "./writer";
import { systemContent } from "./system";

export const tr = {
  brand: {
    name: commonContent.brandName,
    tagline: commonContent.tagline,
    homeLabel: commonContent.homeLabel,
    logoAlt: commonContent.logoAlt,
  },
  system: systemContent,
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
