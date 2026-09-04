import { ImageResponse } from "next/og";
import {
  publicBrandDescription,
  publicBrandName,
  publicBrandPositioning,
  publicBrandShortSlogan,
  publicBrandTitle,
} from "@/lib/public-brand";

export const alt = publicBrandTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 82px",
        color: "white",
        background: "linear-gradient(135deg, #0f0e2d 0%, #28205e 55%, #6847e8 100%)",
      }}
    >
      <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>{publicBrandName}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", maxWidth: 980, fontSize: 66, fontWeight: 850, lineHeight: 1.04 }}>
          {publicBrandPositioning}
        </div>
        <div style={{ display: "flex", maxWidth: 950, fontSize: 38, fontWeight: 650, lineHeight: 1.16, opacity: 0.96 }}>
          {publicBrandShortSlogan}.
        </div>
        <div style={{ display: "flex", maxWidth: 920, fontSize: 26, lineHeight: 1.4, opacity: 0.82 }}>
          {publicBrandDescription}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 22, opacity: 0.72 }}>ilkoku.com</div>
    </div>,
    size,
  );
}
