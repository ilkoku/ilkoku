import "server-only";

import part0 from "@/components/content/about-hero-data/part0";
import part1 from "@/components/content/about-hero-data/part1";
import part2 from "@/components/content/about-hero-data/part2";

const ABOUT_HERO_BASE64 = `${part0}${part1}${part2}`;

export function getAboutHeroImageBytes() {
  return Uint8Array.from(Buffer.from(ABOUT_HERO_BASE64, "base64"));
}
