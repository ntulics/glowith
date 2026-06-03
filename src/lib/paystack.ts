// Thin Paystack helper. All calls use the secret key from env.
// If the key is missing we treat payments as "not configured" so the app
// can fall back to confirming bookings without taking real money.

export const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
export const paystackEnabled = () => PAYSTACK_SECRET.length > 0;

const BASE = "https://api.paystack.co";

export async function initTransaction(input: {
  email: string;
  amountCents: number;   // ZAR cents (Paystack subunit)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountCents,
      currency: "ZAR",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {}
    })
  });
  const data = await res.json();
  if (!res.ok || !data.status) throw new Error(data.message ?? "Paystack init failed");
  return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
}

export async function verifyTransaction(reference: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
  });
  const data = await res.json();
  return { success: !!data.status && data.data?.status === "success" };
}
