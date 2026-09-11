export type CmsStaticMediaFit = "cover" | "contain" | "responsive" | "intrinsic";

export type CmsStaticMediaAsset = {
  key: string;
  url: string;
  relativePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  sectionKey: string;
  sectionLabel: string;
  publicHref: string | null;
  cmsHref: string | null;
  kind: "image" | "document";
  placementLabel: string;
  targetSpec: string;
  targetWidth?: number;
  targetHeight?: number;
  targetAspectRatio?: string;
  fit: CmsStaticMediaFit;
};

export type CmsStaticMediaSection = {
  key: string;
  label: string;
  publicHref: string | null;
  cmsHref: string | null;
  assets: CmsStaticMediaAsset[];
};
