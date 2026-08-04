import type { PublisherMemberRole } from "@/generated/prisma/client";

export type PublisherPermission =
  | "view_submission"
  | "decide_submission"
  | "add_internal_note"
  | "manage_contract"
  | "manage_publication_plan"
  | "download_file"
  | "manage_members";

const permissions: Record<PublisherMemberRole, ReadonlySet<PublisherPermission>> = {
  owner: new Set([
    "view_submission",
    "decide_submission",
    "add_internal_note",
    "manage_contract",
    "manage_publication_plan",
    "download_file",
    "manage_members",
  ]),
  manager: new Set([
    "view_submission",
    "decide_submission",
    "add_internal_note",
    "manage_contract",
    "manage_publication_plan",
    "download_file",
    "manage_members",
  ]),
  submissions_manager: new Set([
    "view_submission",
    "decide_submission",
    "add_internal_note",
    "download_file",
  ]),
  editorial: new Set([
    "view_submission",
    "add_internal_note",
    "download_file",
  ]),
  contract_manager: new Set([
    "view_submission",
    "manage_contract",
    "manage_publication_plan",
    "download_file",
  ]),
  reviewer: new Set([
    "view_submission",
    "add_internal_note",
    "download_file",
  ]),
  viewer: new Set(["view_submission", "download_file"]),
};

export function hasPublisherPermission(
  role: PublisherMemberRole,
  permission: PublisherPermission,
) {
  return permissions[role].has(permission);
}

export const publisherRoleLabels: Record<PublisherMemberRole, string> = {
  owner: "Yayınevi sahibi",
  manager: "Yönetici",
  submissions_manager: "Başvuru yöneticisi",
  editorial: "Editoryal kullanıcı",
  contract_manager: "Sözleşme yetkilisi",
  reviewer: "Değerlendirici",
  viewer: "Salt okunur kullanıcı",
};
