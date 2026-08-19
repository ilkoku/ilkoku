export type SystemMapRouteKind = "page" | "handler" | "alias";

export type SystemMapAccessMode =
  | "public"
  | "authenticated"
  | "role"
  | "publisher_membership"
  | "admin";

export interface SystemMapMenuReference {
  href: string;
  itemLabel: string;
  menuLabel: string;
}

export interface SystemMapRouteRecord {
  accessLabel: string;
  accessMode: SystemMapAccessMode;
  approvedRoleRequired: boolean;
  area: string;
  dynamic: boolean;
  inbound: string[];
  kind: SystemMapRouteKind;
  menuReferences: SystemMapMenuReference[];
  orphanCandidate: boolean;
  outbound: string[];
  roles: string[];
  route: string;
  sourceFile: string;
}

export interface SystemMapWorkflow {
  description: string;
  id: string;
  steps: string[];
  title: string;
}

export interface SystemMapSnapshot {
  generatedAt: string;
  routes: SystemMapRouteRecord[];
  scanMode: "source" | "build" | "hybrid" | "fallback";
  stats: {
    adminOnly: number;
    apiHandlers: number;
    orphanCandidates: number;
    pages: number;
    protectedRoutes: number;
    publicRoutes: number;
    total: number;
  };
  warnings: string[];
  workflows: SystemMapWorkflow[];
}
