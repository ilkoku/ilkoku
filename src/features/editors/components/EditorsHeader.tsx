import Image from "next/image";
import Link from "next/link";
import retinaLogo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { AuthenticatedUser } from "@/components/layout/AuthenticatedUser";
import { editorsContent, tr } from "@/content";

interface EditorsHeaderProps {
  backHref?: string;
  backLabel?: string;
}

export async function EditorsHeader({ backHref = "/", backLabel = editorsContent.defaultBackLabel }: EditorsHeaderProps) {
  return (
    <header className="editors-topbar">
      <nav className="editors-topbar__inner" aria-label={editorsContent.tools}>
        <Link className="editors-back" href={backHref} aria-label={backLabel}>
          <span aria-hidden="true">←</span>
          <span>{editorsContent.back}</span>
        </Link>
        <Link className="editors-brand" href="/" aria-label={editorsContent.homeLabel}>
          <Image src={retinaLogo} alt="" aria-hidden="true" width={72} height={72} sizes="48px" priority />
          <span>{tr.brand.name}</span>
        </Link>
        <AuthenticatedUser />
      </nav>
      <style>{`
        @media (max-width: 47.99rem) {
          .editors-topbar__inner {
            min-height: 4.75rem !important;
          }

          .editors-brand img {
            width: 3.25rem !important;
            max-width: 3.25rem !important;
            height: 3.25rem !important;
          }
        }
      `}</style>
    </header>
  );
}
