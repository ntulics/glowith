-- Add banking details and Paystack subaccount fields to ProviderProfile
ALTER TABLE "ProviderProfile"
  ADD COLUMN IF NOT EXISTS "bankName"               TEXT,
  ADD COLUMN IF NOT EXISTS "bankCode"               TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountNumber"      TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountName"        TEXT,
  ADD COLUMN IF NOT EXISTS "paystackSubaccountCode" TEXT;
