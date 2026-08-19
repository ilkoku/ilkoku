"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { saveSecurePublicationPlanAction } from "@/features/publisher-contracts/actions";
import type {
  PublisherContractActionState,
  PublisherContractData,
  PublisherPublicationPlanData,
} from "../types";

const initialState: PublisherContractActionState = { message: "", status: "idle" };
const toDateInput = (value: string | null) => value ? value.slice(0, 10) : "";
const contractStatusLabel = {
  accepted: "Kabul edildi",
  draft: "Tarihsel taslak",
  rejected: "Reddedildi",
  sent: "Gönderildi",
} as const;

export function PublisherContractCenter({
  canManageContract,
  canManagePlan,
  contract,
  plan,
  submissionId,
}: {
  canManageContract: boolean;
  canManagePlan: boolean;
  contract: PublisherContractData | null;
  plan: PublisherPublicationPlanData | null;
  submissionId: string;
}) {
  const [planState, planAction, planPending] = useActionState(saveSecurePublicationPlanAction, initialState);

  return (
    <section className="publisher-contract-center" aria-labelledby="publisher-contract-title">
      <header>
        <p className="publisher-eyebrow">Yayın operasyonu</p>
        <h2 id="publisher-contract-title">Sözleşme ve yayın planı</h2>
        <p>Sözleşmeler İlkOku merkezi yönetimi tarafından gönderilir; yayınevi bu alanda yalnız tarihsel sözleşme durumunu ve yayın planını görür.</p>
      </header>

      <div className="publisher-contract-center__grid">
        <div className="publisher-operation-form">
          <div className="publisher-operation-form__heading">
            <h3>Merkezi sözleşme yönetimi</h3>
            <span>
              {contract
                ? `Tarihsel sürüm ${contract.version} · ${contractStatusLabel[contract.status]}`
                : "Yeni gönderim Admin merkezinden"}
            </span>
          </div>
          <p>
            Yeni sözleşme oluşturma ve kullanıcıya gönderme yetkisi merkezi İlkOku Sözleşme Yönetimi&apos;ndedir. Bu ekrandan sözleşme gönderilemez veya eski sözleşme değiştirilemez.
          </p>
          {canManageContract ? (
            <p>
              Yayınevi sözleşme yetkiniz korunur; sözleşme talebi gerektiğinde İlkOku yönetim süreci üzerinden ilerler.
            </p>
          ) : null}
        </div>

        {canManagePlan ? (
          <form action={planAction} className="publisher-operation-form">
            <input name="submissionId" type="hidden" value={submissionId} />
            <div className="publisher-operation-form__heading">
              <h3>Yayın planı</h3>
              <span>{plan ? "Plan kayıtlı" : "Henüz oluşturulmadı"}</span>
            </div>
            <div className="publisher-operation-form__fields">
              <label><span>Aşama</span><select defaultValue={plan?.status ?? "planning"} name="planStatus"><option value="planning">Planlama</option><option value="preproduction">Ön hazırlık</option><option value="production">Üretim</option><option value="distribution">Dağıtım</option><option value="published">Yayımlandı</option></select></label>
              <label><span>Hedef yayın tarihi</span><input defaultValue={toDateInput(plan?.targetPublicationDate ?? null)} name="targetPublicationDate" type="date" /></label>
              <label><span>ISBN</span><input defaultValue={plan?.isbn ?? ""} maxLength={32} name="isbn" /></label>
              <label><span>Baskı adedi</span><input defaultValue={plan?.printRun ?? ""} min="1" name="printRun" type="number" /></label>
              <label><span>Kapak</span><select defaultValue={plan?.coverStatus ?? "not_started"} name="coverStatus"><option value="not_started">Başlamadı</option><option value="in_progress">Devam ediyor</option><option value="completed">Tamamlandı</option></select></label>
              <label><span>Mizanpaj</span><select defaultValue={plan?.layoutStatus ?? "not_started"} name="layoutStatus"><option value="not_started">Başlamadı</option><option value="in_progress">Devam ediyor</option><option value="completed">Tamamlandı</option></select></label>
            </div>
            <label><span>Plan notları</span><textarea defaultValue={plan?.notes ?? ""} maxLength={10000} name="planNotes" rows={5} /></label>
            <Button disabled={planPending} type="submit">Yayın planını kaydet</Button>
            {planState.message ? <p data-status={planState.status}>{planState.message}</p> : null}
          </form>
        ) : null}
      </div>
    </section>
  );
}
