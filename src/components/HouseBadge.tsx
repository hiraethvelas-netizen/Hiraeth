import { getHouse, type HouseId } from "@/lib/house-cup";

export function HouseBadge({ house, large = false }: { house?: HouseId | null; large?: boolean }) {
  const detail = getHouse(house);
  if (!detail) return null;
  return (
    <span
      role="img"
      aria-label={detail.label}
      title={detail.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 shadow-sm ${large ? "h-9 w-9 text-lg" : "h-6 w-6 text-sm"}`}
      style={{ backgroundColor: detail.background, borderColor: detail.border }}
    >
      <span aria-hidden="true" className="leading-none">{detail.animal}</span>
    </span>
  );
}
