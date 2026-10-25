import Image from "next/image";

type WorkCoverImageProps = {
  src: string;
  alt: string;
  className?: string;
  width: number;
  height: number;
  sizes: string;
};

/**
 * Serve first-party CMS work covers through Next's responsive image optimizer.
 * Preserve the exact original URL for external or non-CMS cover providers.
 * Original uploaded bytes remain untouched and accessible in the CMS.
 */
export function WorkCoverImage({
  src,
  alt,
  className,
  width,
  height,
  sizes,
}: WorkCoverImageProps) {
  const firstPartyMediaPath = src.match(
    /^(?:https:\/\/(?:www\.)?ilkoku\.com)?(\/api\/media\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})(?:\?.*)?$/iu,
  )?.[1];

  if (!firstPartyMediaPath) {
    // Keep external cover providers unchanged; Next only optimizes our CMS.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <Image
      src={firstPartyMediaPath}
      alt={alt}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      quality={75}
    />
  );
}
