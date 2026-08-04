import type {
  PublisherMemberRole,
} from "@/generated/prisma/client";

export type PublisherPermission =
  // Geçiş süresince korunan eski başvuru yetkileri.
  | "view_submission"
  | "decide_submission"
  | "add_internal_note"
  | "download_file"

  // Sözleşme aşamasına kadar teknik olarak korunan yetkiler.
  | "manage_contract"
  | "manage_publication_plan"

  // Güncel yayınevi keşif ve ekip yetkileri.
  | "discover_works"
  | "discover_authors"
  | "like_work"
  | "like_author"
  | "favorite_work"
  | "favorite_author"
  | "follow_author"
  | "share_internal"
  | "share_email"
  | "view_shared_items"
  | "add_share_note"
  | "view_editor_requests"
  | "route_editor_request"
  | "claim_editor_assignment"
  | "write_editor_review"
  | "view_authorized_passport"
  | "view_authorized_content"
  | "view_files"
  | "download_files"
  | "manage_members"
  | "manage_permissions"
  | "view_publisher_audit";

const legacyTransitionPermissionKeys = [
  "view_submission",
  "decide_submission",
  "add_internal_note",
  "download_file",
] as const satisfies readonly PublisherPermission[];

const protectedContractPermissionKeys = [
  "manage_contract",
  "manage_publication_plan",
] as const satisfies readonly PublisherPermission[];

export const customizablePublisherPermissionKeys = [
  "discover_works",
  "discover_authors",
  "like_work",
  "like_author",
  "favorite_work",
  "favorite_author",
  "follow_author",
  "share_internal",
  "share_email",
  "view_shared_items",
  "add_share_note",
  "view_editor_requests",
  "route_editor_request",
  "claim_editor_assignment",
  "write_editor_review",
  "view_authorized_passport",
  "view_authorized_content",
  "view_files",
  "download_files",
  "manage_members",
  "manage_permissions",
  "view_publisher_audit",
] as const satisfies readonly PublisherPermission[];

export const publisherPermissionKeys = [
  ...legacyTransitionPermissionKeys,
  ...protectedContractPermissionKeys,
  ...customizablePublisherPermissionKeys,
] as const satisfies readonly PublisherPermission[];

export const publisherPermissionGroups = [
  {
    id: "discovery",
    title: "Keşif",
    permissions: [
      "discover_works",
      "discover_authors",
    ],
  },
  {
    id: "engagement",
    title: "Etkileşim",
    permissions: [
      "like_work",
      "like_author",
      "favorite_work",
      "favorite_author",
      "follow_author",
    ],
  },
  {
    id: "sharing",
    title: "Paylaşım",
    permissions: [
      "share_internal",
      "share_email",
      "view_shared_items",
      "add_share_note",
    ],
  },
  {
    id: "editorial",
    title: "Editörlük",
    permissions: [
      "view_editor_requests",
      "route_editor_request",
      "claim_editor_assignment",
      "write_editor_review",
    ],
  },
  {
    id: "content",
    title: "İçerik ve dosyalar",
    permissions: [
      "view_authorized_passport",
      "view_authorized_content",
      "view_files",
      "download_files",
    ],
  },
  {
    id: "management",
    title: "Yönetim",
    permissions: [
      "manage_members",
      "manage_permissions",
      "view_publisher_audit",
    ],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  permissions: readonly PublisherPermission[];
}[];


const rolePermissions: Record<
  PublisherMemberRole,
  ReadonlySet<PublisherPermission>
> = {
  owner: new Set(publisherPermissionKeys),

  manager: new Set([
    ...legacyTransitionPermissionKeys,
    "discover_works",
    "discover_authors",
    "like_work",
    "like_author",
    "favorite_work",
    "favorite_author",
    "follow_author",
    "share_internal",
    "share_email",
    "view_shared_items",
    "add_share_note",
    "view_editor_requests",
    "route_editor_request",
    "view_authorized_passport",
    "view_authorized_content",
    "view_files",
    "download_files",
    "manage_members",
    "view_publisher_audit",
  ]),

  submissions_manager: new Set([
    ...legacyTransitionPermissionKeys,
    "discover_works",
    "discover_authors",
    "share_internal",
    "view_shared_items",
    "add_share_note",
    "view_editor_requests",
    "route_editor_request",
    "view_authorized_passport",
    "view_authorized_content",
    "view_files",
    "download_files",
  ]),

  editorial: new Set([
    "view_shared_items",
    "claim_editor_assignment",
    "write_editor_review",
    "view_authorized_passport",
    "view_authorized_content",
    "view_files",
  ]),

  contract_manager: new Set([
    ...protectedContractPermissionKeys,
    "view_shared_items",
    "view_files",
    "download_files",
  ]),

  reviewer: new Set([
    "view_shared_items",
  ]),

  viewer: new Set([
    "view_shared_items",
  ]),
};

const customizablePermissionSet =
  new Set<PublisherPermission>(
    customizablePublisherPermissionKeys,
  );

function parsePermissionOverrides(
  value: unknown,
): PublisherPermission[] | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (
          item,
        ): item is PublisherPermission =>
          typeof item === "string" &&
          customizablePermissionSet.has(
            item as PublisherPermission,
          ),
      ),
    ),
  );
}

export function getPublisherPermissions(
  role: PublisherMemberRole,
  permissionOverrides?: unknown,
): PublisherPermission[] {
  const defaults =
    rolePermissions[role];

  if (role === "owner") {
    return [...defaults];
  }

  const overrides =
    parsePermissionOverrides(
      permissionOverrides,
    );

  if (overrides === null) {
    return [...defaults];
  }

  const protectedPermissions =
    protectedContractPermissionKeys.filter(
      (permission) =>
        defaults.has(permission),
    );

  return Array.from(
    new Set([
      ...overrides,
      ...protectedPermissions,
    ]),
  );
}

export function getCustomizablePublisherPermissions(
  role: PublisherMemberRole,
  permissionOverrides?: unknown,
): PublisherPermission[] {
  const effective = new Set(
    getPublisherPermissions(
      role,
      permissionOverrides,
    ),
  );

  return customizablePublisherPermissionKeys.filter(
    (permission) =>
      effective.has(permission),
  );
}

export function hasPublisherPermission(
  role: PublisherMemberRole,
  permission: PublisherPermission,
  permissionOverrides?: unknown,
) {
  return getPublisherPermissions(
    role,
    permissionOverrides,
  ).includes(permission);
}

export const publisherPermissionLabels:
  Record<PublisherPermission, string> = {
    view_submission:
      "Geçiş sürecindeki eser kayıtlarını görüntüleme",
    decide_submission:
      "Geçiş sürecindeki başvuru kararını yönetme",
    add_internal_note:
      "Geçiş sürecindeki iç değerlendirme notunu ekleme",
    download_file:
      "Geçiş sürecindeki yetkili dosyayı indirme",

    manage_contract:
      "Sözleşme işlemlerini yönetme",
    manage_publication_plan:
      "Yayın planını yönetme",

    discover_works:
      "Eser keşfetme",
    discover_authors:
      "Yazar keşfetme",
    like_work:
      "Eser beğenme",
    like_author:
      "Yazar beğenme",
    favorite_work:
      "Eseri favoriye alma",
    favorite_author:
      "Yazarı favoriye alma",
    follow_author:
      "Yazarı takip etme",
    share_internal:
      "Eser veya yazarı ekip içinde paylaşma",
    share_email:
      "Eser veya yazarı e-postayla paylaşma",
    view_shared_items:
      "Kendisiyle paylaşılan kayıtları görme",
    add_share_note:
      "Paylaşım notu ekleme",
    view_editor_requests:
      "Editör talebi isteyen eserleri görme",
    route_editor_request:
      "Editör talebini ekip editörüne yönlendirme",
    claim_editor_assignment:
      "Editör görevini alma",
    write_editor_review:
      "Editör incelemesi hazırlama",
    view_authorized_passport:
      "Yetki verilen Eser Pasaportu'nu görme",
    view_authorized_content:
      "Yetki verilen özel veya tam içeriği görme",
    view_files:
      "Dosya merkezini görme",
    download_files:
      "İzin verilen dosyaları indirme",
    manage_members:
      "Ekip üyelerini ve davetleri yönetme",
    manage_permissions:
      "Kişisel yetkileri ve yetki taleplerini yönetme",
    view_publisher_audit:
      "Yayınevi işlem geçmişini görme",
  };

export const publisherRoleLabels:
  Record<PublisherMemberRole, string> = {
    owner:
      "Yayınevi sahibi",
    manager:
      "Yönetici",
    submissions_manager:
      "Editoryal yönetici",
    editorial:
      "Editoryal kullanıcı",
    contract_manager:
      "Sözleşme yetkilisi",
    reviewer:
      "Değerlendirici",
    viewer:
      "Salt okunur kullanıcı",
  };
