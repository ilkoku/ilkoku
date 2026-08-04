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
          <Image src={retinaLogo} alt="" aria-hidden="true" width={72} height={72} sizes="56px" priority />
          <span>{tr.brand.name}</span>
        </Link>
        <AuthenticatedUser />
      </nav>
    </header>
  );
}
