/** Curadoria inaugural do Portal de Verão. Editável no painel administrativo.
 * A lista é usada somente quando ainda não há receitas configuradas no portal.
 * Não recoloca receitas que a administradora ocultou intencionalmente.
 */
export type SummerRecipe = {
  title: string;
  ingredients: string;
  method: string;
  image_url: string;
  visible: boolean;
};

export const defaultSummerRecipes: SummerRecipe[] = [
  {
    title: "Bolo Gelado de Coco e Laranja — Flores de Janeiro",
    ingredients: "Para cerca de 12 pedaços: 3 ovos; 1 xícara de açúcar; 1/2 xícara de óleo; 1 xícara de suco de laranja; 2 xícaras de farinha de trigo; 1 colher (sopa) de fermento químico. Para a calda: 200 ml de leite de coco, 100 ml de leite e 1/2 xícara de coco ralado.",
    method: "Preaqueça o forno a 180 °C. Bata os ovos, o açúcar e o óleo. Adicione o suco e a farinha aos poucos e misture até ficar liso. Incorpore o fermento delicadamente. Asse em forma média untada por cerca de 35 a 40 minutos, até o palito sair limpo. Misture o leite de coco com o leite. Com o bolo já morno, corte em quadrados, regue com a calda e cubra com coco ralado. Leve à geladeira por pelo menos 3 horas e sirva gelado.",
    image_url: "",
    visible: true,
  },
  {
    title: "Caipirinha da Hiraeth — Caipirinha",
    ingredients: "Para 1 copo: 1 limão-tahiti; 8 folhas de hortelã; 2 colheres (chá) de açúcar; 50 ml de cachaça (opcional); gelo a gosto; água com gás para a versão sem álcool.",
    method: "Corte o limão em pedaços e retire a parte branca central para evitar amargor. Coloque no copo com o açúcar e pressione delicadamente. Acrescente a hortelã e amasse só de leve para liberar o aroma. Junte o gelo e a cachaça, misture e sirva. Para uma versão sem álcool, substitua a cachaça por água com gás.",
    image_url: "",
    visible: true,
  },
  {
    title: "Suco Solar — Sol na Pele",
    ingredients: "Para 1 copo grande: 1/2 cenoura pequena picada; 1/4 de beterraba pequena crua; suco de 1 laranja; 1 fatia grossa de abacaxi; 120 ml de água de coco gelada; gelo a gosto.",
    method: "Higienize e pique os ingredientes. Bata a cenoura, a beterraba, a laranja, o abacaxi e a água de coco no liquidificador até ficar homogêneo. Sirva com gelo. Se preferir, coe; sem coar você aproveita mais fibras. A bebida fornece nutrientes como carotenoides, mas não garante bronzeado e não substitui o protetor solar.",
    image_url: "",
    visible: true,
  },
  {
    title: "Torradas de Pera, Ricota e Mel — Águas de Cristal",
    ingredients: "Para 2 torradas: 2 fatias de pão rústico; 1/2 pera madura e firme; 4 colheres (sopa) de ricota; 1 colher (chá) de mel; 1 fio de azeite; algumas folhas de alecrim fresco; uma pitada de sal.",
    method: "Toste o pão em uma frigideira ou forno até dourar. Amasse a ricota com o azeite e o sal até obter um creme. Espalhe nas torradas, acrescente a pera em fatias finas e finalize com mel e uma quantidade pequena de alecrim. Sirva na hora.",
    image_url: "",
    visible: true,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Retorna receitas personalizadas, inclusive se todas estiverem ocultas.
 * Para a configuração inicial ainda vazia, mostra a curadoria de verão.
 */
export function summerRecipesFromTheme(summer: unknown): SummerRecipe[] {
  if (!isRecord(summer)) return defaultSummerRecipes;
  const saved = Array.isArray(summer["recipes"]) ? summer["recipes"].filter(isRecord) : [];
  const configured = summer["recipes_configured"] === true ||
    saved.some(item => typeof item["title"] === "string" && item["title"].trim().length > 0);
  if (!configured) return defaultSummerRecipes;
  return saved.slice(0, 4).map(item => ({
    title: typeof item["title"] === "string" ? item["title"] : "",
    ingredients: typeof item["ingredients"] === "string" ? item["ingredients"] : "",
    method: typeof item["method"] === "string" ? item["method"] : "",
    image_url: typeof item["image_url"] === "string" ? item["image_url"] : "",
    visible: item["visible"] === true,
  }));
}
