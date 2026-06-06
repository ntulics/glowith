import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export function generateTOTPSecret(): string {
  return new OTPAuth.Secret().base32;
}

export function buildTOTPUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "Glowith",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  });
  return totp.toString();
}

export async function buildTOTPQRCode(secret: string, email: string): Promise<string> {
  const uri = buildTOTPUri(secret, email);
  return QRCode.toDataURL(uri, { width: 200, margin: 1 });
}

export function verifyTOTPCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  });
  const delta = totp.validate({ token: code.trim(), window: 1 });
  return delta !== null;
}
