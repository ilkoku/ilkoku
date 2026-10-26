"use client";

import { useState } from "react";

import { saveWriterBillingProfileAction } from "@/features/commerce/writer-billing-actions";
import styles from "./writer-billing.module.css";

type BillingInput = {
  invoiceStatus: "invoicing" | "non_invoicing" | null;
  billingName: string;
  taxIdentifier: string;
  taxOffice: string;
  billingAddress: string;
};
export function WriterBillingForm({ initial }: { initial: BillingInput }) {
  const [status, setStatus] = useState<"invoicing" | "non_invoicing" | "">(
    initial.invoiceStatus ?? "",
  );
  const invoicing = status === "invoicing";
  return (
    <form action={saveWriterBillingProfileAction} className={styles.form}>
      <fieldset className={styles.choice}>
        <legend>Fatura düzenleme durumun</legend>
        <label className={status === "invoicing" ? styles.selected : styles.option}>
          <input
            type="radio" name="invoiceStatus" value="invoicing" required
            checked={invoicing} onChange={() => setStatus("invoicing")}
          />
          <span><strong>Faturalıyım — vergi mükellefiyim</strong>
            <small>Fatura veya uygun mali belge düzenleyebiliyorum.</small></span>
        </label>
        <label className={status === "non_invoicing" ? styles.selected : styles.option}>
          <input
            type="radio" name="invoiceStatus" value="non_invoicing" required
            checked={status === "non_invoicing"} onChange={() => setStatus("non_invoicing")}
          />
          <span><strong>Faturasızım — fatura düzenlemiyorum</strong>
            <small>Gelir ve gider pusulası uygunluğu ayrıca değerlendirilecek.</small></span>
        </label>
      </fieldset>

      {invoicing ? (
        <section aria-label="Fatura bilgilerim" className={styles.details}>
          <h2>Fatura bilgilerim</h2>
          <p>Bu alanları faturada kullanılmasını istediğin resmî bilgilere göre doldur.</p>
          <div className={styles.grid}>
            <label>Ad soyad / şirket unvanı
              <input name="billingName" defaultValue={initial.billingName} required minLength={3} maxLength={240} autoComplete="organization" />
            </label>
            <label>Vergi / T.C. kimlik numarası
              <input name="taxIdentifier" defaultValue={initial.taxIdentifier} required minLength={10} maxLength={11} inputMode="numeric" pattern="[0-9]{10,11}" autoComplete="off" />
            </label>
            <label>Vergi dairesi
              <input name="taxOffice" defaultValue={initial.taxOffice} required minLength={2} maxLength={160}/>
            </label>
            <label className={styles.wide}>Fatura adresi
              <textarea name="billingAddress" defaultValue={initial.billingAddress} required minLength={12} maxLength={5000} rows={3}/>
            </label>
          </div>
        </section>
      ) : status === "non_invoicing" ? (
        <p className={styles.info}>
          Fatura düzenlemediğini beyan ettin. Bu seçim için fatura numarası,
          vergi dairesi veya fatura adresi girmen gerekmiyor.
        </p>
      ) : (
        <p className={styles.info}>Devam etmek için faturalı veya faturasız durumunu seç.</p>
      )}
      <p className={styles.info}>
        Bu seçim vergi durumuna ilişkin kendi beyanındır; otomatik mükellefiyet
        doğrulaması, fatura düzenleme veya ödeme işlemi gerçekleştirmez.
      </p>
      <div className={styles.actions}>
        <button type="submit">Fatura durumumu ve bilgilerimi kaydet</button>
      </div>
    </form>
  );
}
