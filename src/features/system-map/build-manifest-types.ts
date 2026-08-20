export interface SystemMapManifestRoute {
  kind: "page" | "handler";
  route: string;
  sourceFile: string;
}

export interface SystemMapManifestReference {
  origin: string;
  originRoute: string | null;
  target: string;
}

export interface SystemMapManifestModule {
  actionNames: string[];
  consumers: string[];
  dataModels: string[];
  file: string;
  guardEvidence: string[];
  imports: string[];
  methods: string[];
  rawSql: boolean;
}

export interface SystemMapSourceManifestData {
  modules: SystemMapManifestModule[];
  references: SystemMapManifestReference[];
  routes: SystemMapManifestRoute[];
  sourceFileCount: number;
  version: number;
}

export interface RuntimeManifestEnvUsage {
  documented: boolean;
  key: string;
  usedBy: string[];
}

export interface RuntimeManifestRouteRule {
  destination: string;
  kind: "redirect" | "rewrite";
  permanent: boolean | null;
  source: string;
}

export interface RuntimeManifestEventProducer {
  email: boolean;
  notification: boolean;
  relatedEntityTypes: string[];
  sourceFile: string;
  templates: string[];
}

export interface RuntimeManifestExternalDomain {
  domain: string;
  sourceFiles: string[];
}

export interface RuntimeManifestSchemaModel {
  degree: number;
  model: string;
  relations: string[];
}

export interface RuntimeInfrastructureManifestData {
  envUsage: RuntimeManifestEnvUsage[];
  eventProducers: RuntimeManifestEventProducer[];
  externalDomains: RuntimeManifestExternalDomain[];
  routeRules: RuntimeManifestRouteRule[];
  schema: {
    latestMigration: string | null;
    migrationCount: number;
    migrationOnlyTables: string[];
    modelCount: number;
    models: RuntimeManifestSchemaModel[];
    relationCount: number;
  };
  sourceFileCount: number;
  version: number;
}
