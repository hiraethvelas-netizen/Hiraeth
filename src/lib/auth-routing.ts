export function getSafeInternalRedirect(value?: string | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    // Never send an authenticated person back into signup/login via a stale redirect.
    const pathname = value.split(/[?#]/, 1)[0] ?? "";
    if (pathname === "/auth" || pathname.startsWith("/auth/")) return "/inicio";
    return value;
  }
  return "/inicio";
}

export function getPostLoginDestination(destination: string, isAdmin: boolean): string {
  if (isAdmin && (destination === "/" || destination === "/inicio")) {
    return "/admin";
  }
  return destination;
}
