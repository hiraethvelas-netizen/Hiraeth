/**
 * Credential prefixes are only a local readiness check, NOT authentication
 * or proof of the provider's environment. The Mercado Pago API must validate
 * the token, and live_mode must be checked on every returned payment.
 *
 * Some sandbox credentials use TEST-; newer application credentials may use
 * APP_USR- in both environments. TEST- is NEVER allowed in production.
 */
export function hasAllowedMercadoPagoCredential(
  token: string,
  mode: string | undefined,
  testCredentialsConfirmed: boolean,
  allowLiveCharges: boolean,
): boolean {
  const credential = token.trim();
  if (mode === "sandbox") {
    // The merchant has verified these credentials in their Mercado Pago
    // test panel. Neither prefix by itself verifies the account or validity.
    return testCredentialsConfirmed &&
      (credential.startsWith("TEST-") || credential.startsWith("APP_USR-"));
  }
  if (mode === "production") {
    // Never let a sandbox-only credential authorize real money movements.
    return allowLiveCharges && credential.startsWith("APP_USR-");
  }
  return false;
}
