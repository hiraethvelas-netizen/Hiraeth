/** Curadoria inaugural do Portal de Verão.
 * A imagem pode ser definida pelo painel admin sem alterar o código.
 * Os ids são estáveis para preservar checklists e avaliações locais.
 */
export type SummerRecommendationKind = "livro" | "serie" | "filme";
export type SummerRecommendation = {
  id: string;
  kind: SummerRecommendationKind;
  title: string;
  description: string;
  creator: string;
  platform: string;
  image_url: string;
  url: string;
  visible: boolean;
};

/** Capas editoriais selecionadas a partir das edições brasileiras e pôsteres oficiais.
 * Se houver uma foto definida pela administração, ela tem prioridade.
 */
export const summerCoverFallbacks: Record<string, string> = {
  "livro-amor-gelato": "https://covers.openlibrary.org/b/isbn/9788551002346-L.jpg?default=false",
  "livro-aconteceu-naquele-verao": "https://livrariascuritiba.vteximg.com.br/arquivos/ids/2122943-1000-1000/lv487114_1.jpg?v=638194872812630000",
  "livro-leitura-de-verao": "https://down-br.img.susercontent.com/file/sg-11134201-7rfha-m9thhixy4djjf6",
  "serie-verao-que-mudou-minha-vida": "https://p2.trrsf.com/image/fget/cf/940/0/images.terra.com/2023/06/30/1178379778-fz0dd0fwwaexr6t.jpg",
  "serie-outer-banks": "https://dnm.nflximg.net/api/v6/mAcAr9TxZIVbINe88xb3Teg5_OA/AAAABRQ5SBBL9B_V7vWDk82TvzX3ll04bHUrcveM1itv0DZEQXpEiZ_SPpcH17iwD5ZAIURI_hFFytbI2UlKsUoCMW2Cf5ojUb3kuevlNiqkz4Bzaq9eoIsO50xW-LD1B_JslpCWUg.jpg?r=ab5",
  "filme-esposa-de-mentirinha": "https://www.querofilme.com.br/images/b/109-esposa-de-mentirinha.jpg",
  "filme-gente-grande": "https://image.tmdb.org/t/p/w500/jJ15tYBtxeLxfMecbnQvgV0uoI5.jpg",
};

export const defaultSummerRecommendations: SummerRecommendation[] = [
  {
    id: "livro-amor-gelato",
    kind: "livro",
    title: "Amor & Gelato",
    description: "Uma viagem à Itália, gelatos e descobertas que mudam tudo.",
    creator: "Jenna Evans Welch",
    platform: "",
    image_url: summerCoverFallbacks["livro-amor-gelato"],
    url: "",
    visible: true,
  },
  {
    id: "livro-aconteceu-naquele-verao",
    kind: "livro",
    title: "Aconteceu Naquele Verão",
    description: "Um romance divertido, uma cidade à beira-mar e surpresas pelo caminho.",
    creator: "Tessa Bailey",
    platform: "",
    image_url: summerCoverFallbacks["livro-aconteceu-naquele-verao"],
    url: "",
    visible: true,
  },
  {
    id: "livro-leitura-de-verao",
    kind: "livro",
    title: "Leitura de Verão",
    description: "Dois escritores, bloqueios criativos e um verão para recomeçar.",
    creator: "Emily Henry",
    platform: "",
    image_url: summerCoverFallbacks["livro-leitura-de-verao"],
    url: "",
    visible: true,
  },
  {
    id: "serie-verao-que-mudou-minha-vida",
    kind: "serie",
    title: "O Verão que Mudou Minha Vida",
    description: "Amizades, primeiros amores e um verão impossível de esquecer.",
    creator: "",
    platform: "Prime Video",
    image_url: summerCoverFallbacks["serie-verao-que-mudou-minha-vida"],
    url: "https://www.primevideo.com/-/pt/detail/0KAW4T6OOSAPQJVCFDCOXNLGJU",
    visible: true,
  },
  {
    id: "serie-outer-banks",
    kind: "serie",
    title: "Outer Banks",
    description: "Mar, aventuras, amizades e mistérios com cara de férias.",
    creator: "",
    platform: "Netflix",
    image_url: summerCoverFallbacks["serie-outer-banks"],
    url: "",
    visible: true,
  },
  {
    id: "filme-esposa-de-mentirinha",
    kind: "filme",
    title: "Esposa de Mentirinha",
    description: "Uma comédia romântica tropical para rir sem compromisso.",
    creator: "",
    platform: "",
    image_url: summerCoverFallbacks["filme-esposa-de-mentirinha"],
    url: "",
    visible: true,
  },
  {
    id: "filme-gente-grande",
    kind: "filme",
    title: "Gente Grande",
    description: "Diversão, amizade e boas risadas em clima de férias.",
    creator: "",
    platform: "",
    image_url: summerCoverFallbacks["filme-gente-grande"],
    url: "",
    visible: true,
  },
];

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function kind(value: unknown): SummerRecommendationKind {
  return value === "livro" || value === "serie" || value === "filme" ? value : "livro";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** O seed inicial não deve reaparecer quando alguém ocultar/remover as indicações.
 * Já existiam quatro espaços vazios: eles são tratados como não configurados.
 */
export function summerRecommendationsFromTheme(summer: unknown): SummerRecommendation[] {
  if (!record(summer)) return defaultSummerRecommendations;
  const saved = Array.isArray(summer["recommendations"])
    ? summer["recommendations"].filter(record) : [];
  const configured = summer["recommendations_configured"] === true ||
    saved.some(item => str(item["title"]).trim().length > 0);
  if (!configured) return defaultSummerRecommendations;
  return saved.map((item, index) => ({
    id: str(item["id"]).trim() || `custom-${kind(item["kind"])}-${str(item["title"]).toLowerCase().replace(/[^a-z0-9]/g, "-")}-${index}`,
    kind: kind(item["kind"]),
    title: str(item["title"]),
    description: str(item["description"]),
    creator: str(item["creator"]),
    platform: str(item["platform"]),
    image_url: str(item["image_url"]),
    url: str(item["url"]),
    visible: item["visible"] === true,
  }));
}
