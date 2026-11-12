export const HOUSES = [
  { id: "leao", label: "Casa do Leão", animal: "🦁", background: "#782c24", border: "#d6b061" },
  { id: "texugo", label: "Casa do Texugo", animal: "🦡", background: "#d4ad30", border: "#24241d" },
  { id: "aguia", label: "Casa da Águia", animal: "🦅", background: "#25517f", border: "#bf9364" },
  { id: "serpente", label: "Casa da Serpente", animal: "🐍", background: "#26634c", border: "#c9ccd1" },
] as const;
export type HouseId = (typeof HOUSES)[number]["id"];
export const HOUSE_CHANGED_EVENT = "hiraeth:house-changed";
export function getHouse(id: string | null | undefined) { return HOUSES.find(item => item.id === id); }
export function percentage(part: number, total: number) { return total > 0 ? Math.round((part / total) * 100) : 0; }
