import Image from "next/image";
import Link from "next/link";
import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";
import { AuthenticatedUser } from "@/components/layout/AuthenticatedUser";
import { publisherContent, tr } from "@/content";

interface PublisherHeaderProps {
  backHref?: string;
}

export async function PublisherHeader({ backHref = "/" }: PublisherHeaderProps) {
  return (
    <header className="publisher-topbar">
      <nav className="publisher-topbar__inner" aria-label={publisherContent.tools}>
        <Link className="publisher-back" href={backHref} aria-label={publisherContent.backLabel}>
          <span aria-hidden="true">←</span><span>{publisherContent.back}</span>
        </Link>
        <Link className="publisher-brand" href="/" aria-label={publisherContent.homeLabel}>
          <Image src={mobileLogo} alt="" aria-hidden="true" width={36} height={36} priority />
          <span>{tr.brand.name}</span>
        </Link>
        <AuthenticatedUser />
      </nav>
    </header>
  );
}
