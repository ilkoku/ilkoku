import "server-only";

export type CommercePaymentMethod = "card" | "carrier";
export type CommerceProviderMode = "test" | "active";

export type ProviderCreatePaymentInput = {
  amount: bigint;
  currency: string;
  orderId: string;
  orderNo: string;
  paymentId: string;
  readerId: string;
  returnUrl: string;
  workId: string;
};

export type ProviderCreatePaymentResult = {
  providerTransactionId: string;
  redirectUrl: string;
};

export type PaymentProviderAdapter = {
  code: string;
  label: string;
  method: CommercePaymentMethod;
  mode: CommerceProviderMode;
  createPayment(
    input: ProviderCreatePaymentInput,
  ): Promise<ProviderCreatePaymentResult>;
};

export type PaymentMethodAvailability = {
  available: boolean;
  label: string;
  method: CommercePaymentMethod;
  providerCode: string | null;
};

const adapters: PaymentProviderAdapter[] = [];

/**
 * Provider adapters are intentionally empty in Commerce Foundation v1.
 * Real card / carrier implementations must be registered here only after
 * provider credentials, webhook verification and production review exist.
 */
export function getPaymentProviderAdapter(
  method: CommercePaymentMethod,
): PaymentProviderAdapter | null {
  return adapters.find((adapter) => adapter.method === method) ?? null;
}

export function getPaymentMethodAvailability(): PaymentMethodAvailability[] {
  const methods: Array<{ label: string; method: CommercePaymentMethod }> = [
    { label: "Kredi / Banka Kartı", method: "card" },
    { label: "Telefon Faturama Yansıt", method: "carrier" },
  ];

  return methods.map(({ label, method }) => {
    const adapter = getPaymentProviderAdapter(method);
    return {
      available: Boolean(adapter),
      label,
      method,
      providerCode: adapter?.code ?? null,
    };
  });
}
