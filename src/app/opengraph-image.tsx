import { ImageResponse } from "next/og";

export const alt = "İlkOku — dijital edebiyat platformu";
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
      <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>İlkOku</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", maxWidth: 950, fontSize: 70, fontWeight: 850, lineHeight: 1.04 }}>
          İlk cümle, ilk okurun, ilk adımın.
        </div>
        <div style={{ display: "flex", maxWidth: 920, fontSize: 28, lineHeight: 1.4, opacity: 0.88 }}>
          Yazarları, okuyucuları, editörleri ve yayınevlerini buluşturan dijital edebiyat ekosistemi.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 22, opacity: 0.72 }}>ilkoku.com</div>
    </div>,
    size,
  );
}
