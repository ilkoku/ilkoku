"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  saveSecurePublicationPlanAction,
  saveSecurePublisherContractAction,
} from "@/features/publisher-contracts/actions";
import type {
  PublisherContractData,
  PublisherContractActionState,
  PublisherPublicationPlanData,
} from "../types";

const initialState: PublisherContractActionState = { message: "", status: "idle" };
const toDateInput = (value: string | null) => value ? value.slice(0, 10) : "";
const contractStatusLabel = {
  accepted: "Kabul edildi",
  draft: "Taslak",
  rejected: "Reddedildi",
  sent: "Yazara gönderildi",
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
  const [contractState, contractAction, contractPending] = useActionState(saveSecurePublisherContractAction, initialState);
  const [planState, planAction, planPending] = useActionState(saveSecurePublicationPlanAction, initialState);
  const contractTerminal = contract?.status === "accepted" || contract?.status === "rejected";
  const contractAlreadySent = contract?.status === "sent";

  return (
    <section className="publisher-contract-center" aria-labelledby="publisher-contract-title">
      <header>
        <p className="publisher-eyebrow">Yayın operasyonu</p>
        <h2 id="publisher-contract-title">Sözleşme ve yayın planı</h2>
        <p>Kabul edilen eserin ticari koşullarını ve üretim takvimini yönetin.</p>
      </header>

      <div className="publisher-contract-center__grid">
        {canManageContract ? (
          contractTerminal ? (
            <div className="publisher-operation-form">
              <div className="publisher-operation-form__heading">
                <h3>Yayın sözleşmesi</h3>
                <span>{contract ? `Sürüm ${contract.version} · ${contractStatusLabel[contract.status]}` : "—"}</span>
              </div>
              <p>Nihai duruma ulaşmış sözleşme yayınevi tarafından değiştirilemez.</p>
            </div>
          ) : (
            <form action={contractAction} className="publisher-operation-form">
              <input name="submissionId" type="hidden" value={submissionId} />
              <div className="publisher-operation-form__heading">
                <h3>Yayın sözleşmesi</h3>
                <span>{contract ? `Sürüm ${contract.version} · ${contractStatusLabel[contract.status]}` : "Henüz oluşturulmadı"}</span>
              </div>
              <div className="publisher-operation-form__fields">
                <label><span>Telif oranı (%)</span><input defaultValue={contract?.royaltyPercentage ?? "10"} max="100" min="0" name="royaltyPercentage" required step="0.01" type="number" /></label>
                <label><span>Avans (TL)</span><input defaultValue={contract?.advanceAmount ?? ""} min="0" name="advanceAmount" step="0.01" type="number" /></label>
                <label><span>Hak süresi (ay)</span><input defaultValue={contract?.rightsPeriodMonths ?? 60} max="240" min="1" name="rightsPeriodMonths" required type="number" /></label>
                <label><span>Bölge</span><input defaultValue={contract?.territory ?? "Türkiye"} maxLength={180} name="territory" required /></label>
              </div>
              <label><span>Sözleşme notları</span><textarea defaultValue={contract?.notes ?? ""} maxLength={10000} name="notes" rows={5} /></label>
              <div className="publisher-operation-form__actions">
                {!contractAlreadySent ? <Button disabled={contractPending} name="intent" type="submit" value="draft" variant="outline">Taslağı kaydet</Button> : null}
                <Button disabled={contractPending} name="intent" type="submit" value="send">{contractAlreadySent ? "Yeni sürümü yazara gönder" : "Yazara gönder"}</Button>
              </div>
              {contractState.message ? <p data-status={contractState.status}>{contractState.message}</p> : null}
            </form>
          )
        ) : null}

        {canManagePlan ? <form action={planAction} className="publisher-operation-form">
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
        </form> : null}
      </div>
    </section>
  );
}
