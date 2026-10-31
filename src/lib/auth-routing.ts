export function getSafeInternalRedirect(value?: string | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
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
