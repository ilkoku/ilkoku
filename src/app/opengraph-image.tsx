import { ImageResponse } from "next/og";
import {
  publicBrandName,
  publicBrandPositioning,
  publicBrandShortSlogan,
  publicBrandTitle,
} from "@/lib/public-brand";

export const alt = publicBrandTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  const logoSrc = "https://ilkoku.com/icons/ilkoku-512.png";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        color: "white",
        background: "linear-gradient(135deg, #100d2f 0%, #201754 52%, #5d3ee2 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: 999,
          right: -150,
          top: -170,
          background: "rgba(135, 103, 255, 0.20)",
          border: "2px solid rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: 999,
          right: 40,
          bottom: -250,
          background: "rgba(109, 76, 255, 0.18)",
          border: "2px solid rgba(255,255,255,0.07)",
        }}
      />

      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 76px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img
            src={logoSrc}
            width={118}
            height={118}
            alt=""
            style={{
              borderRadius: 999,
              boxShadow: "0 0 32px rgba(120, 76, 255, 0.32)",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            {publicBrandName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              maxWidth: 980,
              fontSize: 72,
              fontWeight: 850,
              lineHeight: 1.02,
              letterSpacing: -1.5,
            }}
          >
            {publicBrandPositioning}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 920,
              fontSize: 36,
              fontWeight: 600,
              lineHeight: 1.15,
              opacity: 0.9,
            }}
          >
            {publicBrandShortSlogan}.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 24,
            fontWeight: 650,
            opacity: 0.78,
          }}
        >
          <div style={{ width: 44, height: 2, background: "rgba(255,255,255,0.55)" }} />
          ilkoku.com
        </div>
      </div>
    </div>,
    size,
  );
}
