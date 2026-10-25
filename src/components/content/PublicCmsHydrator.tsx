"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";

/**
 * The page, footer links and canonical navigation are SSR HTML. The optional
 * CMS footer/contact enhancement is only needed when its surface approaches
 * the viewport, so keep its 400+ line client module out of first-view JS.
 */
export function PublicCmsHydrator() {
  const pathname = usePathname();
  const [FooterEnhancer, setFooterEnhancer] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (FooterEnhancer) return;

    let active = true;
    let loading = false;
    let observer: IntersectionObserver | null = null;
    let mountObserver: MutationObserver | null = null;

    function startImport() {
      if (!active || loading) return;
      loading = true;
      observer?.disconnect();
      mountObserver?.disconnect();
      void import("@/components/content/PublicFooterHydrator")
        .then(({ PublicFooterHydrator }) => {
          if (active) setFooterEnhancer(() => PublicFooterHydrator);
        })
        .catch(() => {
          // The server-rendered footer and links remain functional if the
          // optional enhancement fails to load; retry on a subsequent route.
          loading = false;
        });
    }

    function attach(element: Element) {
      if (typeof IntersectionObserver === "undefined") {
        startImport();
        return;
      }
      observer?.disconnect();
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) startImport();
      }, { rootMargin: "1000px 0px" });
      observer.observe(element);
    }

    function findSurface() {
      if (pathname === "/iletisim") {
        return document.querySelector(".contact-page .contact-section__intro");
      }
      return document.querySelector(".landing-footer, .public-trust-footer");
    }

    const target = findSurface();
    if (target) {
      attach(target);
    } else if (typeof MutationObserver !== "undefined") {
      // The homepage footer can arrive later from a React Server Component stream.
      mountObserver = new MutationObserver(() => {
        const surface = findSurface();
        if (surface) {
          mountObserver?.disconnect();
          attach(surface);
        }
      });
      mountObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      startImport();
    }

    return () => {
      active = false;
      observer?.disconnect();
      mountObserver?.disconnect();
    };
  }, [pathname, FooterEnhancer]);

  return FooterEnhancer ? <FooterEnhancer /> : null;
}
