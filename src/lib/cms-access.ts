import "server-only";

export type CmsAccess = {
  canManage: boolean;
  canPublish: boolean;
};

export function getCmsAccessForRole(role: string): CmsAccess {
  return {
    canManage: role === "admin",
    canPublish: role === "admin",
  };
}
