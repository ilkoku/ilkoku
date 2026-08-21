"use client";

export function ContractLegalReviewPrintButton() {
  return (
    <button className="contract-legal-pack-print" type="button" onClick={() => window.print()}>
      Yazdır / PDF olarak kaydet
    </button>
  );
}
