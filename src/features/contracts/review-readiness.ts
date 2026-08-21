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
};

export const contractReviewReadiness: readonly ContractReviewReadiness[] = [
  {
    code: "LIB_GENERAL_NDA",
    targetRole: "any",
    reviewState: "legal_review",
    summary: "Genel gizlilik, sınırlı kullanım, yetkisiz kopyalama/paylaşım ve veri güvenliği sınırları operasyon akışıyla uyumlu.",
    legalReviewItems: [
      "Gizlilik yükümlülüğünün süresi ve sona erme etkisi hukuki incelemede kesinleştirilmeli.",
      "İhlal, zorunlu açıklama ve uyuşmazlık hükümleri hukukçu tarafından sonlandırılmalı.",
    ],
    ownerDecisionItems: [
      "Gizlilik yükümlülüğünün iş ilişkisi bittikten sonra süreli mi, süresiz mi hedeflendiği iş tercihi olarak belirtilmeli.",
    ],
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
  },
  {
    code: "LIB_WRITER_EDITOR_REVIEW",
    targetRole: "writer",
    reviewState: "product_decision",
    summary: "Birinci ve ikinci editörlü inceleme, dış editör daveti ve yayınevi paylaşımından ayrılık mevcut ürün akışıyla uyumlu.",
    legalReviewItems: [
      "Editör incelemesinin hizmet/sonuç garantisi oluşturmadığı dil hukukçu tarafından doğrulanmalı.",
      "Gizlilik ve eser bütünlüğü hükümleri editör tarafındaki metinlerle karşılıklı tutarlılık açısından kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "Birinci editörün ikinci editör değerlendirmesini görüp göremeyeceği ürün politikası kesinleştirilmeli.",
      "Yazarın editör görevi alındıktan veya ilk inceleme tamamlandıktan sonra talebi geri çekebilme sınırı kesinleştirilmeli.",
    ],
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
  },
  {
    code: "LIB_PUBLISHER_TEAM_CONFIDENTIALITY",
    targetRole: "publisher",
    reviewState: "legal_review",
    summary: "Kişi bazlı yetki, least-privilege, hesap paylaşmama, offboarding ve korunan sözleşme/yayın planı izinlerini gerçek ekip modeline bağlıyor.",
    legalReviewItems: [
      "Ekip üyeliği sona erdiğinde yerel kopyaların saklanması/silinmesi yükümlülüğü hukukçu ve veri saklama politikasıyla kesinleştirilmeli.",
      "Şirket ile ekip üyesi arasındaki temsil ve sorumluluk sınırları hukuki olarak kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "Ekipten ayrılan kişinin daha önce indirdiği gizli dosyaları silmesi konusunda operasyonel politika kesinleştirilmeli.",
    ],
  },
  {
    code: "LIB_PUBLICATION_INTENT_WRITER",
    targetRole: "writer",
    reviewState: "commercial_decision",
    summary: "Yazar tarafındaki yayın niyetini bağlayıcı nihai yayın sözleşmesinden ayırıyor; hak devri ve ticari garanti üretmiyor.",
    legalReviewItems: [
      "Belgenin bağlayıcı olmayan niyet metni niteliği ve hangi maddelerin istisnaen bağlayıcı olabileceği hukukçu tarafından açıklaştırılmalı.",
      "Nihai yayın sözleşmesine geçiş ve görüşmelerin sona ermesi etkisi hukuki olarak kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "İlkOku sürecinde bağlayıcı olmayan yayın niyeti belgesinin gerçekten kullanılıp kullanılmayacağına karar verilmeli.",
      "Niyet aşamasında münhasırlık/no-shop istenip istenmediği; istenecekse süresi belirlenmeli.",
      "Niyet belgesinin kendiliğinden sona ereceği bir geçerlilik süresi olup olmayacağı belirlenmeli.",
    ],
  },
  {
    code: "LIB_PUBLICATION_INTENT_PUBLISHER",
    targetRole: "publisher",
    reviewState: "commercial_decision",
    summary: "Yayınevinin yayın ilgisini/niyetini kayıt altına alıyor; keşif erişimi, yayın planı veya niyeti otomatik hak devrine çevirmiyor.",
    legalReviewItems: [
      "Yayınevi niyet beyanının bağlayıcı olmayan niteliği ve olası bağlayıcı istisnalar hukukçu tarafından kesinleştirilmeli.",
      "Nihai sözleşmeye kadar duyuru, üretim taahhüdü ve ticari beklenti yaratmama dili kontrol edilmeli.",
    ],
    ownerDecisionItems: [
      "Yayınevinden resmi yayın niyeti belgesi istenip istenmeyeceğine karar verilmeli.",
      "Yazar ve yayınevi niyet belgelerinin aynı geçerlilik süresi/münhasırlık politikasını kullanıp kullanmayacağı belirlenmeli.",
    ],
  },
] as const;

const readinessByCode = new Map(contractReviewReadiness.map((item) => [item.code, item]));

export function getContractReviewReadiness(code: string) {
  return readinessByCode.get(code) ?? null;
}
