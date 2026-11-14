/** Public, permanent destination for the URL written to each Hiraeth NFC tag.
 * NEVER derive this from window.location.origin: admin/preview runs on private
 * lovableproject.com hosts that are inaccessible to customers.
 */
export const HIRAETH_PUBLIC_ORIGIN = "https://hiraeth-oficial.lovable.app";

export function permanentPortalUrl(slug: string): string {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("O portal precisa ter um identificador válido para gerar a URL NFC.");
  }
  return `${HIRAETH_PUBLIC_ORIGIN}/portal/${slug}`;
}
