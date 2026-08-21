"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markContractViewedAction } from "./view-actions";

export function ContractViewedMarker({
  contractId,
  shouldMark,
}: {
  contractId: string;
  shouldMark: boolean;
}) {
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (!shouldMark || attempted.current) return;
    attempted.current = true;

    void markContractViewedAction(contractId)
      .then((result) => {
        if (result.status === "viewed") {
          router.refresh();
        }
      })
      .catch(() => {
        // Görüntüleme kanıtı yardımcı telemetridir; sayfayı bozmaz.
      });
  }, [contractId, router, shouldMark]);

  return null;
}
