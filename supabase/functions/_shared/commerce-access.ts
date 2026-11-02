/**
 * The sandbox checkout is exclusively for authenticated Hiraeth admins.
 * Production requires isCommerceEnabled() to have independently verified
 * the live-payment authorizations; the role restriction is sandbox-only.
 * All unknown modes fail closed.
 */
export function canAccessCommerce(enabled: boolean, mode: string | undefined, isAdmin: boolean): boolean {
  return enabled && (mode === "production" || (mode === "sandbox" && isAdmin));
}
