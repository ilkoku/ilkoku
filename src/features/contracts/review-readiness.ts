import type { ContractTargetRole } from "./types";

export type ContractReviewState =
  | "legal_review"
  | "product_decision"
  | "commercial_decision";

export type ContractReviewReadiness = {
  code: string;
  targetRole: ContractTargetRole;
  reviewState: ContractReviewState;
  summary: string;
  legalReviewItems: readonly string[];
  ownerDecisionItems: readonly string[];
  pendingOwnerDecisionItems: readonly string[];
};

export const contractReviewPolicyVersion = 1;

export const contractReviewReadiness: readonly ContractReviewReadiness[] = [
  {
    code: "LIB_GENERAL_NDA",
    targetRole: "any",
    reviewState: "legal_review",
    summary: "Genel gizlilik, sınırlı kullanım, yetkisiz kopyalama/paylaşım ve veri güvenliği sınırları operasyon akışıyla uyumlu.",
    legalReviewItems: [
      "Gizlilik kategorileri ve sürelerinin sözleşme hukuku bakımından son kontrolü yapılmalı.",
      "İhlal, zorunlu açıklama ve uyuşmazlık hükümleri hukukçu tarafından sonlandırılmalı.",
    ],
    ownerDecisionItems: [
      "Ticari sır, yayımlanmamış eser ve erişim/güvenlik bilgileri sır niteliğini koruduğu sürece süresiz korunur; diğer gizli bilgiler ilişki bitiminden itibaren 5 yıl korunur.",
    ],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_WRITER_PLATFORM_LICENSE",
    targetRole: "writer",
    reviewState: "legal_review",
    summary: "Platformun eseri saklama, iletme ve görünürlük akışında gösterme yetkisi dar hizmet amacıyla tanımlı; yayıncılık hak devri iddiası yok.",
    legalReviewItems: [
      "Platform lisansının FSEK bakımından kapsamı ve kullanılan mali hak terminolojisi son hukuki kontrolden geçmeli.",
      "Kaldırma, arşiv, yedek ve saklama etkileri Kullanım Koşulları/KVKK metinleriyle çapraz kontrol edilmeli.",
    ],
    ownerDecisionItems: [],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_WRITER_EDITOR_REVIEW",
    targetRole: "writer",
    reviewState: "legal_review",
    summary: "Birinci ve ikinci editörlü inceleme, dış editör daveti ve yayınevi paylaşımından ayrılık mevcut ürün akışıyla uyumlu.",
    legalReviewItems: [
      "Editör incelemesinin hizmet/sonuç garantisi oluşturmadığı dil hukukçu tarafından doğrulanmalı.",
      "Gizlilik ve eser bütünlüğü hükümleri editör tarafındaki metinlerle karşılıklı tutarlılık açısından kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "Birinci editör, bağımsızlık korunması için ikinci editör değerlendirmesi tamamlandıktan sonra ikinci raporu görebilir.",
      "Yazar editör inceleme talebini ikinci editör incelemesi başlamadan önce geri çekebilir; tamamlanmış inceleme ve audit kayıtları silinmez.",
    ],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_EDITOR_REVIEW_ETHICS",
    targetRole: "editor",
    reviewState: "legal_review",
    summary: "Gizlilik, tarafsızlık, çıkar çatışması, bağımsız değerlendirme ve yetkisiz dış araç kullanımı sınırları editör akışıyla uyumlu.",
    legalReviewItems: [
      "Etik yükümlülüklerin yaptırım ve sözleşmesel sonuçları hukukçu tarafından sonlandırılmalı.",
      "Editör ilişkisinin işçi/vekil/hizmet sağlayıcı statüsü doğurmadığı veya doğurduğu durumlar gerçek iş modeline göre kontrol edilmeli.",
    ],
    ownerDecisionItems: [],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_EDITOR_CANDIDATE_NDA",
    targetRole: "editor_pending",
    reviewState: "legal_review",
    summary: "Aday/dış editör erişimi geçici, kişiye bağlı ve görev amacıyla sınırlı; eser üzerinde hak doğurmadığı açık.",
    legalReviewItems: [
      "Davet süresi, erişimin sona ermesi ve elde tutulan kopyaların akıbeti gerçek teknik davet politikasıyla eşleştirilmeli.",
      "Adaylık sürecinde kişisel veri ve gizlilik yükümlülükleri KVKK belgeleriyle çapraz kontrol edilmeli.",
    ],
    ownerDecisionItems: [],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_PUBLISHER_DISCOVERY_NDA",
    targetRole: "publisher",
    reviewState: "legal_review",
    summary: "Eser pasaportu, yetkili içerik, dosya ve paylaşım izinlerini birbirinden ayırıyor; keşif erişimini yayın hakkı devri olarak yorumlamıyor.",
    legalReviewItems: [
      "Yayınevinin eriştiği eser/veri kapsamına ilişkin gizlilik süresi ve ihlal sonuçları hukukçu tarafından kesinleştirilmeli.",
      "Kurumsal kullanıcı ile bağlı ekip üyelerinin sorumluluğu yayınevi ekip metniyle birlikte kontrol edilmeli.",
    ],
    ownerDecisionItems: [],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_PUBLISHER_TEAM_CONFIDENTIALITY",
    targetRole: "publisher",
    reviewState: "legal_review",
    summary: "Kişi bazlı yetki, least-privilege, hesap paylaşmama, offboarding ve korunan sözleşme/yayın planı izinlerini gerçek ekip modeline bağlıyor.",
    legalReviewItems: [
      "Yönetici arşivinde kalan kurumsal kopyanın saklama amacı, erişim yetkisi ve KVKK/veri saklama etkisi hukukçu tarafından kontrol edilmeli.",
      "Şirket ile ekip üyesi arasındaki temsil ve sorumluluk sınırları hukuki olarak kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "Ekipten ayrılan kişinin kişisel/yerel gizli kopyaları silinir; yayınevi yönetici arşivinde yetki kontrollü kurumsal kopya saklanabilir.",
    ],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_PUBLICATION_INTENT_WRITER",
    targetRole: "writer",
    reviewState: "legal_review",
    summary: "Yazar tarafındaki yayın niyetini bağlayıcı nihai yayın sözleşmesinden ayırıyor; hak devri ve ticari garanti üretmiyor. Operasyonel kullanım şimdilik pasif tutuluyor.",
    legalReviewItems: [
      "Belgenin bağlayıcı olmayan niyet metni niteliği ve no-shop/münhasırlık maddesinin bağlayıcılığı hukukçu tarafından açıklaştırılmalı.",
      "60 günlük geçerlilik, 30 günlük no-shop ve nihai yayın sözleşmesine geçiş etkisi hukuki olarak kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "Yayın niyeti şablonu şimdilik pasif kalır ve ayrıca ürün sahibi aktivasyon kararı olmadan gönderime açılmaz.",
      "İleride kullanıma alınırsa no-shop/münhasırlık süresi 30 gündür.",
      "Yayın niyeti belgesinin geçerlilik süresi 60 gündür.",
    ],
    pendingOwnerDecisionItems: [],
  },
  {
    code: "LIB_PUBLICATION_INTENT_PUBLISHER",
    targetRole: "publisher",
    reviewState: "legal_review",
    summary: "Yayınevinin yayın ilgisini/niyetini kayıt altına alıyor; keşif erişimi, yayın planı veya niyeti otomatik hak devrine çevirmiyor. Operasyonel kullanım şimdilik pasif tutuluyor.",
    legalReviewItems: [
      "Yayınevi niyet beyanının bağlayıcı olmayan niteliği ve no-shop/münhasırlık maddesinin bağlayıcılığı hukukçu tarafından kesinleştirilmeli.",
      "Yazar belgesiyle aynı 60 günlük geçerlilik ve 30 günlük no-shop politikasının çift taraflı etkisi kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "Yayınevinden resmi yayın niyeti belgesi alınır; şablon şimdilik pasif kalır ve ayrıca ürün sahibi aktivasyon kararı olmadan gönderime açılmaz.",
      "Yazar ve yayınevi yayın niyeti belgeleri aynı politikayı kullanır: 60 gün geçerlilik ve 30 gün no-shop/münhasırlık.",
    ],
    pendingOwnerDecisionItems: [],
  },
] as const;

const readinessByCode = new Map(contractReviewReadiness.map((item) => [item.code, item]));

export function getContractReviewReadiness(code: string) {
  return readinessByCode.get(code) ?? null;
}
