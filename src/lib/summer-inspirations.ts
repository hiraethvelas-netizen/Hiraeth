/**
 * A prévia do Portal de Verão revela sensações antes das fotos dos produtos.
 * Os campos olfativos continuam vazios até a Guardiã informar as pirâmides.
 * Cada item é editável em Portais NFC > Portal de Verão, sem usar códigos individuais.
 */
export type SummerInspiration = {
  id: string;
  emoji: string;
  /** Original uploaded image URL: never downsampled by the app. */
  image_url: string;
  /** Non-destructive circular framing controls, saved independently of the original photo. */
  image_zoom: number;
  image_rotation: number;
  image_x: number;
  image_y: number;
  image_fit: "cover" | "contain";
  title: string;
  teaser: string;
  sensation: string;
  pyramid: { saida: string; corpo: string; fundo: string };
  visible: boolean;
};

const emptyPyramid = () => ({ saida: "", corpo: "", fundo: "" });
const defaultImage = () => ({ image_url: "", image_zoom: 1, image_rotation: 0, image_x: 0, image_y: 0, image_fit: "contain" as const });

export const defaultSummerInspirations: SummerInspiration[] = [
  {
    id: "flores-de-janeiro",
    ...defaultImage(),
    image_url: "/images/portal-verao/flores-de-janeiro.webp",
    image_fit: "cover",
    emoji: "🌺",
    title: "Flores de Janeiro",
    teaser: "Um janeiro leve, dourado e delicado.",
    sensation: "Imagine abrir a janela numa manhã de janeiro e descobrir que o verão já chegou. O sol entra devagar, as flores estão abertas e o ar parece trazer a promessa de novos começos. Eu quis guardar exatamente essa sensação: a delicadeza de um dia bonito que ainda tem tantas histórias pela frente.",
    pyramid: emptyPyramid(),
    visible: true,
  },
  {
    id: "sol-na-pele",
    ...defaultImage(),
    image_url: "/images/portal-verao/sol-na-pele.webp",
    image_fit: "cover",
    emoji: "🍍",
    title: "Sol na Pele",
    teaser: "O calor gostoso de um dia que você queria repetir.",
    sensation: "Imagine sair do mar, sentir os pés na areia quente e deixar o sol secar cada gotinha de água na sua pele. O tempo parece passar mais devagar. Foi essa memória tropical, luminosa e cheia de liberdade que eu quis transformar em uma sensação para levar para casa.",
    pyramid: emptyPyramid(),
    visible: true,
  },
  {
    id: "caipirinha",
    ...defaultImage(),
    image_url: "/images/portal-verao/caipirinha.webp",
    image_fit: "cover",
    emoji: "🍋",
    title: "Caipirinha",
    teaser: "Um fim de tarde cítrico, leve e cheio de vida.",
    sensation: "Imagine a mesa cercada de amigos, o tilintar do gelo e aquele primeiro gole refrescante quando o dia começa a ficar dourado. Há risadas, conversa boa e nenhuma vontade de ir embora. Para mim, o verão brasileiro também mora nesses pequenos instantes.",
    pyramid: emptyPyramid(),
    visible: true,
  },
  {
    id: "sombra-fresca",
    ...defaultImage(),
    image_url: "/images/portal-verao/sombra-fresca.webp",
    image_fit: "cover",
    emoji: "🌿",
    title: "Sombra Fresca",
    teaser: "Um respiro verde no meio do calor.",
    sensation: "Imagine encontrar um cantinho à sombra depois de uma tarde muito quente. As folhas se movem devagar, uma brisa passa e tudo parece ficar mais silencioso. Eu quis guardar esse instante de pausa, como se o verão também nos lembrasse de descansar.",
    pyramid: emptyPyramid(),
    visible: true,
  },
  {
    id: "aguas-de-cristal",
    ...defaultImage(),
    image_url: "/images/portal-verao/aguas-de-cristal.webp",
    image_fit: "cover",
    emoji: "🍐",
    title: "Águas de Cristal",
    teaser: "Leveza, transparência e serenidade.",
    sensation: "Imagine a luz do sol desenhando reflexos na água cristalina. Você respira fundo, sente a brisa e parece que o mundo inteiro ficou mais leve. Eu imaginei essa sensação como um mergulho na tranquilidade, delicada e quase transparente.",
    pyramid: emptyPyramid(),
    visible: true,
  },
  {
    id: "brisa-do-mar",
    ...defaultImage(),
    emoji: "🐚",
    title: "Brisa do Mar",
    teaser: "A paz de ficar mais um pouco à beira-mar.",
    sensation: "Imagine o fim da tarde na praia, quando a maresia chega com o vento e as ondas parecem conversar baixinho. As cortinas balançam, a luz começa a mudar e você não precisa estar em nenhum outro lugar. É essa saudade boa de um verão tranquilo que eu quis guardar.",
    pyramid: emptyPyramid(),
    visible: true,
  },
];

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
function numberWithin(value: unknown, defaultValue: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : defaultValue;
}


export function summerInspirationsFromTheme(theme: unknown): SummerInspiration[] {
  if (!object(theme)) return defaultSummerInspirations;
  const summer = object(theme["summer"]) ? theme["summer"] : {};
  const raw = Array.isArray(summer["inspirations"]) ? summer["inspirations"] : null;
  if (!raw) return defaultSummerInspirations;
  const overrides = raw.filter(object);
  if (!overrides.length && summer["inspirations_configured"] !== true) return defaultSummerInspirations;
  return overrides.map((entry, index) => {
    const def = defaultSummerInspirations.find(item => item.id === entry["id"]) ??
      defaultSummerInspirations[index];
    const p = object(entry["pyramid"]) ? entry["pyramid"] : {};
    return {
      id: stringOr(entry["id"], def?.id ?? `inspiracao-${index}`),
      emoji: stringOr(entry["emoji"], def?.emoji ?? "🌞"),
      image_url: stringOr(entry["image_url"], def?.image_url ?? ""),
      image_zoom: numberWithin(entry["image_zoom"], def?.image_zoom ?? 1, 0.8, 3.5),
      image_rotation: numberWithin(entry["image_rotation"], def?.image_rotation ?? 0, -180, 180),
      image_x: numberWithin(entry["image_x"], def?.image_x ?? 0, -100, 100),
      image_y: numberWithin(entry["image_y"], def?.image_y ?? 0, -100, 100),
      image_fit: entry["image_fit"] === "cover" || entry["image_fit"] === "contain" ? entry["image_fit"] : (def?.image_fit ?? "contain"),
      title: stringOr(entry["title"], def?.title ?? ""),
      teaser: stringOr(entry["teaser"], def?.teaser ?? ""),
      sensation: stringOr(entry["sensation"], def?.sensation ?? ""),
      pyramid: {
        saida: stringOr(p["saida"], ""),
        corpo: stringOr(p["corpo"], ""),
        fundo: stringOr(p["fundo"], ""),
      },
      visible: entry["visible"] === true,
    };
  });
}
