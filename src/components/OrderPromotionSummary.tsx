export function OrderPromotionSummary({ value }: { value?: unknown }) {
  if (!value || typeof value !== "object") return null;
  const summary = value as Record<string, unknown>;
  const gifts = Array.isArray(summary["gifts"])
    ? summary["gifts"].filter((gift): gift is string => typeof gift === "string")
    : [];
  const freeShipping=summary["free_shipping"]===true || summary["freeShipping"]===true;
  if (!freeShipping && !gifts.length) return null;
  return (
    <div className="mt-3 space-y-1 text-sm text-primary">
      {freeShipping && <p>Frete grátis aplicado</p>}
      {gifts.map((gift) => (
        <p key={gift}>Brinde: {gift}</p>
      ))}
    </div>
  );
}
