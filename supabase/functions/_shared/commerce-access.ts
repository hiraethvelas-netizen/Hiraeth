/**
 * Public storefront checkout must behave the same for authenticated customers
 * in Sandbox and in Production once the server-side commerce configuration is
 * fully validated. The calling checkout function still requires a signed-in
 * customer for quote/init/pay/status. Sandbox settlement is isolated from
 * real orders and stock by commerce-sandbox.ts and both payment handlers.
 *
 * Neither mode can be enabled by the browser or by a public URL. Unknown or
 * missing modes fail closed.
 */
export function canAccessCommerce(enabled: boolean, mode: string | undefined): boolean {
  return enabled && (mode === "sandbox" || mode === "production");
}
