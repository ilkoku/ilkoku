import { ImageResponse } from "next/og";

export const alt = "İlkOku Kitap Endeksi — En Çok Satan Kitaplar";
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
        padding: "72px 82px",
        color: "white",
        background:
          "linear-gradient(135deg, #0f0e2d 0%, #28205e 56%, #6847e8 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        İlkOku Kitap Endeksi
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            maxWidth: 1000,
            fontSize: 72,
            fontWeight: 850,
            lineHeight: 1.02,
          }}
        >
          En Çok Satan Kitaplar {year}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 960,
            fontSize: 34,
            fontWeight: 650,
            lineHeight: 1.16,
            opacity: 0.96,
          }}
        >
          Türkiye&apos;de birden fazla bağımsız kaynağın ortak satış sinyali
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 920,
            fontSize: 24,
            lineHeight: 1.4,
            opacity: 0.82,
          }}
        >
          Şeffaf kaynak yaklaşımı · 1 kaynak = 1 oy · sponsor organik sıralamaya
          etki etmez
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 22, opacity: 0.72 }}>
        ilkoku.com/en-cok-satanlar
      </div>
    </div>,
    size,
  );
}
