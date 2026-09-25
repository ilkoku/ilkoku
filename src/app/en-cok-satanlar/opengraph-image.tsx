import { ImageResponse } from "next/og";

export const alt = "En Çok Satan Kitaplar — İlkOku Kitap Endeksi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function BookIndexOpenGraphImage() {
  const year = new Date().getFullYear();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "70px 78px",
        color: "#ffffff",
        background:
          "linear-gradient(135deg, #140e30 0%, #31206f 52%, #7657ef 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 850 }}>
          İlkOku
        </div>
        <div
          style={{
            display: "flex",
            padding: "12px 18px",
            border: "1px solid rgba(255,255,255,.24)",
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Kitap Endeksi
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            display: "flex",
            maxWidth: 980,
            fontSize: 74,
            lineHeight: 1.02,
            fontWeight: 900,
            letterSpacing: -2,
          }}
        >
          En Çok Satan Kitaplar {year}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 930,
            fontSize: 31,
            lineHeight: 1.35,
            opacity: 0.9,
          }}
        >
          Birden fazla bağımsız Türkiye kaynağının çok satan sinyallerinden
          oluşturulan şeffaf sıralama.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          opacity: 0.78,
        }}
      >
        <span>ilkoku.com/en-cok-satanlar</span>
        <span>Türkiye · Güncel endeks</span>
      </div>
    </div>,
    size,
  );
}
