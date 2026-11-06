/**
 * Only retry the read-only integration diagnostic when the browser/network
 * cancels it. Never reuse this heuristic for checkout, payment, or labels.
 */
export function isCancelledHealthCheck(value: unknown): boolean {
  const visited = new Set<unknown>();
  const messages: string[] = [];
  const visit = (current: unknown, depth: number): void => {
    if (depth > 3 || !current || visited.has(current)) return;
    visited.add(current);
    if (typeof current === "string") {
      messages.push(current);
      return;
    }
    if (typeof current !== "object") return;
    const details = current as Record<string, unknown>;
    for (const key of ["message", "name"] as const) {
      if (typeof details[key] === "string") messages.push(details[key]);
    }
    visit(details["context"], depth + 1);
    visit(details["cause"], depth + 1);
  };
  visit(value, 0);
  return messages.some(message => /\b(cancelled|canceled|aborted|aborterror|timed out|timeout)\b/i.test(message));
}
