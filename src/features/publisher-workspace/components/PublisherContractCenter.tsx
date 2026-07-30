"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { savePublicationPlanAction, savePublisherContractAction } from "../actions";
import type { PublisherContractData, PublisherContractActionState, PublisherPublicationPlanData } from "../types";

const initialState: PublisherContractActionState = { message: "", status: "idle" };
const toDateInput = (value: string | null) => value ? value.slice(0, 10) : "";

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
  const [contractState, contractAction, contractPending] = useActionState(savePublisherContractAction, initialState);
  const [planState, planAction, planPending] = useActionState(savePublicationPlanAction, initialState);

  return (
    <section className="publisher-contract-center" aria-labelledby="publisher-contract-title">
      <header>
        <p className="publisher-eyebrow">Yayın operasyonu</p>
        <h2 id="publisher-contract-title">Sözleşme ve yayın planı</h2>
        <p>Kabul edilen eserin ticari koşullarını ve üretim takvimini yönetin.</p>
      </header>

      <div className="publisher-contract-center__grid">
        {canManageContract ? <form action={contractAction} className="publisher-operation-form">
          <input name="submissionId" type="hidden" value={submissionId} />
          <div className="publisher-operation-form__heading">
            <h3>Sözleşme taslağı</h3>
            <span>{contract ? `Sürüm ${contract.version} · ${contract.status}` : "Henüz oluşturulmadı"}</span>
          </div>
          <div className="publisher-operation-form__fields">
            <label><span>Telif oranı (%)</span><input defaultValue={contract?.royaltyPercentage ?? "10"} max="100" min="0" name="royaltyPercentage" required step="0.01" type="number" /></label>
            <label><span>Avans (TL)</span><input defaultValue={contract?.advanceAmount ?? ""} min="0" name="advanceAmount" step="0.01" type="number" /></label>
            <label><span>Hak süresi (ay)</span><input defaultValue={contract?.rightsPeriodMonths ?? 60} max="240" min="1" name="rightsPeriodMonths" required type="number" /></label>
            <label><span>Bölge</span><input defaultValue={contract?.territory ?? "Türkiye"} maxLength={180} name="territory" required /></label>
          </div>
          <label><span>Sözleşme notları</span><textarea defaultValue={contract?.notes ?? ""} name="notes" rows={5} /></label>
          <div className="publisher-operation-form__actions">
            <Button disabled={contractPending} name="intent" type="submit" value="draft" variant="outline">Taslağı kaydet</Button>
            <Button disabled={contractPending} name="intent" type="submit" value="send">Yazara gönder</Button>
          </div>
          {contractState.message ? <p data-status={contractState.status}>{contractState.message}</p> : null}
        </form> : null}

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
          <label><span>Plan notları</span><textarea defaultValue={plan?.notes ?? ""} name="planNotes" rows={5} /></label>
          <Button disabled={planPending} type="submit">Yayın planını kaydet</Button>
          {planState.message ? <p data-status={planState.status}>{planState.message}</p> : null}
        </form> : null}
      </div>
    </section>
  );
}
