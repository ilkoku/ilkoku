"use client";

import { usePathname, useRouter } from "next/navigation";

import { consumePublicNavigationBackTarget } from "@/components/layout/PublicNavigationHistory";

const explicitBackRoutes = new Set([
  "/nasil-calisir",
  "/editoryal-standartlar",
  "/icerik-ve-yas-politikasi",
  "/topluluk-kurallari",
  "/telif-bildirimi",
  "/yazarlar-icin",
  "/editorler-icin",
  "/yayinevleri-icin",
  "/editorler",
  "/yardim",
]);

function currentLocationPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function fallbackFor(pathname: string) {
  if (pathname.startsWith("/editorler/")) return "/editorler";
  return "/";
}

export function PublicBackNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isVisible = explicitBackRoutes.has(pathname) || pathname.startsWith("/editorler/");

  if (!isVisible) return null;

  const goBack = () => {
    const destination =
      consumePublicNavigationBackTarget(currentLocationPath()) ?? fallbackFor(pathname);
    router.push(destination);
  };

  return (
    <nav className="public-back-navigation" aria-label="Sayfa dönüş navigasyonu">
      <button type="button" onClick={goBack} aria-label="Geldiğin sayfaya dön">
        <span aria-hidden="true">←</span>
        <span>Geri</span>
      </button>
    </nav>
  );
}
