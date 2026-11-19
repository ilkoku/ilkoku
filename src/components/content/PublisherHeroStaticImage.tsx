"use client";

import Image, { type ImageLoaderProps } from "next/image";

const sourceImage = "/trust-pages/for-publishers.webp";
const supportedWidths = new Set([384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]);

function publisherHeroStaticLoader({ src, width, quality }: ImageLoaderProps) {
  // Fallback protects against future image variants or registry changes.
  if (src !== sourceImage || quality !== 60 || !supportedWidths.has(width)) {
    return "/_next/image?url=" + encodeURIComponent(src) + "&w=" + width + "&q=" + (quality ?? 75);
  }
  // Byte-identical to verified production Next q60 image responses.
  return "/trust-pages/for-publishers-w" + width + "-q60-v1.webp";
}

export function PublisherHeroStaticImage({
  src,
  alt,
  focalPoint,
}: {
  src: string;
  alt: string;
  focalPoint: string;
}) {
  return (
    <Image
      loader={publisherHeroStaticLoader}
      src={src}
      alt={alt}
      fill
      priority
      fetchPriority="high"
      quality={60}
      sizes="(max-width: 860px) 100vw, 54vw"
      style={{ objectPosition: focalPoint }}
    />
  );
}
