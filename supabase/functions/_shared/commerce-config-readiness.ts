/**
 * Pure, no-secrets checkout preflight. Mirrors values required by freightQuotes.
 * Only configuration KEY NAMES are ever passed to the admin diagnostics.
 */
export function freightSetupIssues(
  get: (key: string) => string | undefined,
  mode: string | undefined,
): string[] {
  const issues: string[] = [];
  const required = ["MELHOR_ENVIO_TOKEN", "MELHOR_ENVIO_USER_AGENT"];
  for (const key of required) {
    if (!get(key)?.trim()) issues.push(key);
  }
  const origin = (get("MELHOR_ENVIO_ORIGIN_POSTAL_CODE") || "").replace(/\D/g, "");
  if (origin.length !== 8) issues.push("MELHOR_ENVIO_ORIGIN_POSTAL_CODE");
  for (const key of [
    "HIRAETH_PACKAGE_WIDTH_CM",
    "HIRAETH_PACKAGE_HEIGHT_CM",
    "HIRAETH_PACKAGE_LENGTH_CM",
  ]) {
    const raw = get(key)?.trim();
    const value = raw ? Number(raw) : NaN;
    if (!Number.isFinite(value) || value <= 0 || value > 200) issues.push(key);
  }
  if (mode === "production") {
    const raw = get("HIRAETH_PACKAGE_TARE_GRAMS")?.trim();
    const tare = raw ? Number(raw) : NaN;
    // Sandbox quotes use the documented 100 g fallback for one known candle,
    // but live orders must use separately verified physical measurements.
    if (!Number.isFinite(tare) || tare <= 0 || tare > 30000) {
      issues.push("HIRAETH_PACKAGE_TARE_GRAMS");
    }
  }
  return issues;
}
