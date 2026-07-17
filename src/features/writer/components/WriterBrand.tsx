import Image from "next/image";
import Link from "next/link";
import desktopLogo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";
import { writerContent } from "@/content";

interface WriterBrandProps {
  compact?: boolean;
}

export function WriterBrand({ compact = false }: WriterBrandProps) {
  return (
    <Link
      className={compact ? "writer-brand writer-brand--compact" : "writer-brand"}
      href="/"
      aria-label={writerContent.homeLabel}
    >
      <Image
        className="writer-brand__desktop"
        src={desktopLogo}
        alt={writerContent.logoAlt}
        priority
        sizes="132px"
      />
      <Image
        className="writer-brand__mobile"
        src={mobileLogo}
        alt=""
        aria-hidden="true"
        priority
        sizes="40px"
      />
    </Link>
  );
}
