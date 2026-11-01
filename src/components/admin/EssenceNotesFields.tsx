import type { NotesDraft } from "@/lib/fragrance";

export function EssenceNotesFields({
  value,
  onChange,
  inputClass,
}: {
  value: NotesDraft;
  onChange: (value: NotesDraft) => void;
  inputClass: string;
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.is_pure}
          onChange={(event) => onChange({ ...value, is_pure: event.target.checked })}
        />
        Essência pura
      </label>
      {value.is_pure ? (
        <label className="block text-sm">
          Posição da essência na pirâmide
          <select
            className={inputClass}
            value={value.note_layer}
            onChange={(event) =>
              onChange({ ...value, note_layer: event.target.value as NotesDraft["note_layer"] })
            }
          >
            <option value="top">Saída</option>
            <option value="heart">Corpo</option>
            <option value="base">Fundo</option>
          </select>
        </label>
      ) : (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Pirâmide olfativa da essência</legend>
          {(
            [
              ["top", "Saída"],
              ["heart", "Corpo"],
              ["base", "Fundo"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              Notas de {label.toLowerCase()}
              <input
                className={inputClass}
                value={value[key]}
                onChange={(event) => onChange({ ...value, [key]: event.target.value })}
                placeholder="Separe as notas por vírgula"
              />
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
