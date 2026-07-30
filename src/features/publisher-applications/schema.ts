import { z } from "zod";

export const publisherCompanyTypes = [
  { label: "Şahıs işletmesi", value: "sole_proprietorship" },
  { label: "Limited şirket", value: "limited" },
  { label: "Anonim şirket", value: "joint_stock" },
  { label: "Kooperatif", value: "cooperative" },
  { label: "Dernek veya vakıf iktisadi işletmesi", value: "association_foundation" },
  { label: "Diğer", value: "other" },
] as const;

export const publicationCategoryOptions = [
  "Roman",
  "Öykü",
  "Şiir",
  "Çocuk",
  "Genç yetişkin",
  "Bilim kurgu",
  "Fantastik",
  "Polisiye",
  "Kişisel gelişim",
  "Araştırma",
  "Akademik",
  "Diğer",
] as const;

const currentYear = new Date().getFullYear();
const phonePattern = /^[+0-9][0-9+\s().-]{8,23}$/;
const taxNumberPattern = /^\d{10,11}$/;
const registryNumberPattern = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9./\s-]{6,64}$/;

const httpUrl = z
  .string()
  .url("Geçerli bir bağlantı girin.")
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "Bağlantı http veya https ile başlamalıdır.",
  );

const optionalUrl = z.union([
  z.literal(""),
  httpUrl,
]);

export const publisherApplicationSchema = z.object({
  acceptsSubmissions: z.boolean(),
  address: z.string().min(10, "Açık adres en az 10 karakter olmalıdır.").max(1000),
  authorizedPersonEmail: z.string().email("Yetkili kişi e-postası geçerli değil.").max(320),
  authorizedPersonFirstName: z.string().min(2, "Yetkili kişi adı zorunludur.").max(100),
  authorizedPersonLastName: z.string().min(2, "Yetkili kişi soyadı zorunludur.").max(100),
  authorizedPersonPhone: z.string().regex(phonePattern, "Yetkili kişi telefonu geçerli değil."),
  authorizedPersonTitle: z.string().min(2, "Yetkili kişinin görevi zorunludur.").max(160),
  city: z.string().min(2, "İl bilgisi zorunludur.").max(120),
  companyType: z.enum(
    publisherCompanyTypes.map((option) => option.value) as [
      (typeof publisherCompanyTypes)[number]["value"],
      ...(typeof publisherCompanyTypes)[number]["value"][],
    ],
    { message: "Şirket türünü seçin." },
  ),
  corporateEmail: z.string().email("Kurumsal e-posta geçerli değil.").max(320),
  corporatePhone: z.string().regex(phonePattern, "Kurumsal telefon geçerli değil."),
  description: z.string().min(20, "Tanıtım yazısı en az 20 karakter olmalıdır.").max(5000),
  district: z.string().min(2, "İlçe bilgisi zorunludur.").max(120),
  establishmentYear: z.coerce
    .number()
    .int("Kuruluş yılı tam sayı olmalıdır.")
    .min(1450, "Kuruluş yılı geçerli değil.")
    .max(currentYear, "Kuruluş yılı gelecekte olamaz."),
  legalCompanyName: z.string().min(2, "Resmî şirket unvanı zorunludur.").max(240),
  logoUrl: optionalUrl,
  mersisOrRegistryNumber: z
    .string()
    .regex(registryNumberPattern, "MERSİS veya ticaret sicil numarası geçerli değil."),
  publicationCategories: z
    .array(z.string().max(80))
    .min(1, "En az bir yayın kategorisi seçin.")
    .max(20),
  publisherName: z.string().min(2, "Yayınevi adı zorunludur.").max(220),
  taxNumber: z.string().regex(taxNumberPattern, "Vergi numarası 10 veya 11 rakam olmalıdır."),
  taxOffice: z.string().min(2, "Vergi dairesi zorunludur.").max(160),
  verificationDocumentUrls: z
    .array(httpUrl)
    .max(10, "En fazla 10 doğrulama belgesi ekleyebilirsiniz."),
  websiteUrl: optionalUrl,
});

export type PublisherApplicationInput = z.infer<typeof publisherApplicationSchema>;

export type PublisherApplicationDefaults = Omit<
  PublisherApplicationInput,
  "establishmentYear"
> & {
  establishmentYear: number | "";
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function splitDocumentUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStoredList(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function validatePublisherApplicationFormData(formData: FormData) {
  const result = publisherApplicationSchema.safeParse({
    acceptsSubmissions: formData.get("acceptsSubmissions") === "accepted",
    address: getText(formData, "address"),
    authorizedPersonEmail: getText(formData, "authorizedPersonEmail").toLowerCase(),
    authorizedPersonFirstName: getText(formData, "authorizedPersonFirstName"),
    authorizedPersonLastName: getText(formData, "authorizedPersonLastName"),
    authorizedPersonPhone: getText(formData, "authorizedPersonPhone"),
    authorizedPersonTitle: getText(formData, "authorizedPersonTitle"),
    city: getText(formData, "city"),
    companyType: getText(formData, "companyType"),
    corporateEmail: getText(formData, "corporateEmail").toLowerCase(),
    corporatePhone: getText(formData, "corporatePhone"),
    description: getText(formData, "description"),
    district: getText(formData, "district"),
    establishmentYear: getText(formData, "establishmentYear"),
    legalCompanyName: getText(formData, "legalCompanyName"),
    logoUrl: getText(formData, "logoUrl"),
    mersisOrRegistryNumber: getText(formData, "mersisOrRegistryNumber"),
    publicationCategories: formData
      .getAll("publicationCategories")
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean),
    publisherName: getText(formData, "publisherName"),
    taxNumber: getText(formData, "taxNumber").replace(/\s/g, ""),
    taxOffice: getText(formData, "taxOffice"),
    verificationDocumentUrls: splitDocumentUrls(
      getText(formData, "verificationDocumentUrls"),
    ),
    websiteUrl: getText(formData, "websiteUrl"),
  });

  if (result.success) {
    return { data: result.data, message: "", success: true as const };
  }

  return {
    data: null,
    message: result.error.issues[0]?.message ?? "Kurumsal başvuru bilgileri geçerli değil.",
    success: false as const,
  };
}

export function toPublisherApplicationData(input: PublisherApplicationInput) {
  return {
    ...input,
    logoUrl: input.logoUrl || null,
    publicationCategories: JSON.stringify(input.publicationCategories),
    verificationDocumentUrls: JSON.stringify(input.verificationDocumentUrls),
    websiteUrl: input.websiteUrl || null,
  };
}

export function getPublisherApplicationDefaults(application?: {
  acceptsSubmissions: boolean;
  address: string;
  authorizedPersonEmail: string;
  authorizedPersonFirstName: string;
  authorizedPersonLastName: string;
  authorizedPersonPhone: string;
  authorizedPersonTitle: string;
  city: string;
  companyType: string;
  corporateEmail: string;
  corporatePhone: string;
  description: string;
  district: string;
  establishmentYear: number;
  legalCompanyName: string;
  logoUrl: string | null;
  mersisOrRegistryNumber: string;
  publicationCategories: string;
  publisherName: string;
  taxNumber: string;
  taxOffice: string;
  verificationDocumentUrls: string;
  websiteUrl: string | null;
} | null): Partial<PublisherApplicationDefaults> {
  if (!application) return {};

  return {
    acceptsSubmissions: application.acceptsSubmissions,
    address: application.address,
    authorizedPersonEmail: application.authorizedPersonEmail,
    authorizedPersonFirstName: application.authorizedPersonFirstName,
    authorizedPersonLastName: application.authorizedPersonLastName,
    authorizedPersonPhone: application.authorizedPersonPhone,
    authorizedPersonTitle: application.authorizedPersonTitle,
    city: application.city,
    companyType: application.companyType as PublisherApplicationInput["companyType"],
    corporateEmail: application.corporateEmail,
    corporatePhone: application.corporatePhone,
    description: application.description,
    district: application.district,
    establishmentYear: application.establishmentYear,
    legalCompanyName: application.legalCompanyName,
    logoUrl: application.logoUrl ?? "",
    mersisOrRegistryNumber: application.mersisOrRegistryNumber,
    publicationCategories: parseStoredList(application.publicationCategories),
    publisherName: application.publisherName,
    taxNumber: application.taxNumber,
    taxOffice: application.taxOffice,
    verificationDocumentUrls: parseStoredList(application.verificationDocumentUrls),
    websiteUrl: application.websiteUrl ?? "",
  };
}

export function validateStoredPublisherApplication(application: Parameters<
  typeof getPublisherApplicationDefaults
>[0]) {
  const defaults = getPublisherApplicationDefaults(application);

  return publisherApplicationSchema.safeParse({
    ...defaults,
    verificationDocumentUrls: defaults.verificationDocumentUrls ?? [],
  });
}
