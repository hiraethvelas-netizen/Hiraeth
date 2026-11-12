import { HOUSES, type HouseId } from "@/lib/house-cup";
import { HouseBadge } from "@/components/HouseBadge";

export function HouseChoiceCards({
  selected, onSelect, busy = false,
}: {
  selected: HouseId | null;
  onSelect: (house: HouseId | null) => void | Promise<void>;
  busy?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {HOUSES.map(house => (
          <button key={house.id} type="button" disabled={busy}
            aria-pressed={selected === house.id}
            onClick={() => void onSelect(house.id)}
            className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors disabled:opacity-60 sm:text-sm ${selected === house.id ? "border-[#878e47] bg-[#e8ebd8] text-[#26382d] ring-2 ring-[#878e47]/35" : "border-[#878e47]/40 bg-[#f7efda] text-[#26382d] hover:bg-[#eeead8]"}`}>
            <HouseBadge house={house.id} large />
            {house.label}
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={() => void onSelect(null)}
        className="w-full rounded-xl border border-dashed border-[#878e47]/60 bg-[#f7efda] px-4 py-3 text-sm font-medium text-[#34452f] hover:bg-[#eeead8] disabled:opacity-60">
        Ainda não sei qual é minha casa
      </button>
    </div>
  );
}
