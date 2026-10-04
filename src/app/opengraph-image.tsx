import { ImageResponse } from "next/og";
import {
  publicBrandPositioning,
  publicBrandTitle,
} from "@/lib/public-brand";

export const alt = `${publicBrandTitle} — ${publicBrandPositioning}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const backgroundSrc =
    "https://ilkoku.com/og/ilkoku-social-selected-2026.webp";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        background: "#17103f",
      }}
    >
      <img
        src={backgroundSrc}
        width={1200}
        height={630}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>,
    size,
  );
}
