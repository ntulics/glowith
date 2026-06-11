// Thin Paystack helper. All calls use the secret key from env.
// If the key is missing we treat payments as "not configured" so the app
// can fall back to confirming bookings without taking real money.

export const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
export const paystackEnabled = () => PAYSTACK_SECRET.length > 0;

const BASE = "https://api.paystack.co";

function headers() {
  return { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" };
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function initTransaction(input: {
  email: string;
  amountCents: number;   // ZAR cents (Paystack subunit)
  reference: string;
  callbackUrl: string;
  subaccount?: string;   // ACCT_xxxxx — provider's subaccount for split pay
  bearerType?: "account" | "subaccount"; // who absorbs Paystack's fee
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email: input.email,
      amount: input.amountCents,
      currency: "ZAR",
      reference: input.reference,
      callback_url: input.callbackUrl,
      subaccount: input.subaccount,
      bearer: input.bearerType ?? "account",
      metadata: input.metadata ?? {}
    })
  });
  const data = await res.json();
  if (!res.ok || !data.status) throw new Error(data.message ?? "Paystack init failed");
  return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
}

export async function verifyTransaction(reference: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: headers()
  });
  const data = await res.json();
  return { success: !!data.status && data.data?.status === "success" };
}

// ── Subaccounts ───────────────────────────────────────────────────────────────

/** Create a Paystack subaccount for a provider. Returns the subaccount code. */
export async function createSubaccount(input: {
  businessName: string;  // used as alias/description
  accountName: string;   // shown as "Account Name" in Paystack dashboard
  bankCode: string;
  accountNumber: string;
  /** Percentage of each charge the platform keeps (0-100). Provider receives the rest. */
  platformPercent: number;
}): Promise<{ subaccountCode: string }> {
  // Paystack's percentage_charge is the platform's (master account) share.
  // Send platformPercent directly: 20 → platform keeps 20%, subaccount gets 80%.
  const percentageCharge = input.platformPercent;

  const res = await fetch(`${BASE}/subaccount`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      business_name: input.accountName,   // shown as "Account Name" in Paystack
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: percentageCharge,
      description: input.businessName,    // shown as "Account Alias"
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) throw new Error(data.message ?? "Failed to create Paystack subaccount");
  return { subaccountCode: data.data.subaccount_code };
}

/** Update an existing subaccount (e.g. new bank details or platform percentage change). */
export async function updateSubaccount(
  subaccountCode: string,
  input: { businessName?: string; bankCode?: string; accountNumber?: string; platformPercent?: number }
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (input.businessName) body.business_name = input.businessName;
  if (input.bankCode) body.bank_code = input.bankCode;
  if (input.accountNumber) body.account_number = input.accountNumber;
  if (input.platformPercent !== undefined) body.percentage_charge = input.platformPercent;

  const res = await fetch(`${BASE}/subaccount/${subaccountCode}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.status) throw new Error(data.message ?? "Failed to update subaccount");
}

// ── Bank helpers ──────────────────────────────────────────────────────────────

/** List all banks supported by Paystack for South Africa. */
export async function listBanks(): Promise<{ name: string; code: string }[]> {
  const res = await fetch(`${BASE}/bank?country=south%20africa&perPage=100`, {
    headers: headers()
  });
  const data = await res.json();
  if (!res.ok || !data.status) return [];
  return (data.data ?? []).map((b: { name: string; code: string }) => ({ name: b.name, code: b.code }));
}

/** Resolve the account name for an account number + bank code via Paystack lookup. */
export async function resolveAccountName(accountNumber: string, bankCode: string): Promise<string | null> {
  const res = await fetch(
    `${BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    { headers: headers() }
  );
  const data = await res.json();
  if (!res.ok || !data.status) return null;
  return data.data?.account_name ?? null;
}
