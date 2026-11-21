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
    title: "Piña Colada — Sol na Pele",
    ingredients: "Para 1 taça: 120 ml de suco natural de abacaxi gelado; 60 ml de leite de coco; 50 ml de rum branco (opcional); 1 xícara de gelo; açúcar ou mel a gosto, se necessário.",
    method: "Bata o suco de abacaxi, o leite de coco e o gelo no liquidificador até ficar cremoso. Se quiser a versão alcoólica, acrescente o rum e bata rapidamente. Prove antes de adoçar. Sirva imediatamente e decore com um triângulo de abacaxi. Para uma Piña Colada sem álcool, simplesmente não use o rum.",
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
    title: "Suco Dourado — Flores de Janeiro",
    ingredients: "Para 1 copo grande: suco de 2 laranjas; 1 cenoura pequena descascada e picada; 1/4 de beterraba pequena crua e picada; 100 ml de água gelada; gelo a gosto; algumas gotas de limão (opcional).",
    method: "Bata a cenoura, a beterraba, o suco de laranja e a água até ficar homogêneo. Se desejar, coe; sem coar, você preserva mais fibras. Acrescente gelo e finalize com gotinhas de limão. É um suco colorido com carotenoides; não garante bronzeado e não substitui o protetor solar.",
    image_url: "",
    visible: true,
  },
  {
    title: "Torradas de Pera, Ricota e Mel — Águas de Cristal",
    ingredients: "Para 2 torradas: 2 fatias de pão rústico; 1/2 pera madura e firme; 4 colheres (sopa) de ricota; 1 colher (chá) de mel; 1 fio de azeite; algumas folhas de alecrim fresco; uma pitada de sal.",
    method: "Toste o pão em uma frigideira ou forno até dourar. Amasse a ricota com o azeite e o sal até obter um creme. Espalhe nas torradas, acrescente a pera em fatias finas e finalize com mel e uma quantidade pequena de alecrim. Sirva na hora. A pera lembra Águas de Cristal, enquanto o alecrim faz uma referência à vela Sombra Fresca.",
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
