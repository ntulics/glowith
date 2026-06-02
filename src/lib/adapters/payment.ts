import type { PaymentProvider } from "@/domain/types";

export type DepositIntent = {
  id: string;
  provider: PaymentProvider;
  amountCents: number;
  status: "requires_payment" | "captured";
  tapToPayReady: boolean;
};

export interface PaymentAdapter {
  provider: PaymentProvider;
  createDepositIntent(input: {
    bookingId: string;
    amountCents: number;
    customerEmail: string;
  }): Promise<DepositIntent>;
}

class MockPaymentAdapter implements PaymentAdapter {
  provider: PaymentProvider = "mock";

  async createDepositIntent(input: { bookingId: string; amountCents: number }) {
    return {
      id: `dep_${input.bookingId}_${Date.now()}`,
      provider: this.provider,
      amountCents: input.amountCents,
      status: "requires_payment" as const,
      tapToPayReady: true
    };
  }
}

export function getPaymentAdapter(): PaymentAdapter {
  return new MockPaymentAdapter();
}
