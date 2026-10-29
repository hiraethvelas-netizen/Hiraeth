# Plano — Cards minimalistas, Favoritos, Selos e "O Segredo das Quatro Chamas"

Nada será alterado até sua aprovação explícita.

## 1. Cards da loja (visual)
- Na página da Loja, trocar o card atual por: foto do produto em destaque (proporção retrato), nome e preço abaixo, sobre o mesmo fundo da loja — sem moldura pesada, sem descrição e sem botão Comprar.
- Preço promocional mostrado com o preço antigo riscado discreto.
- Clique continua levando à página do produto. Grade: 2 colunas no celular, 3–4 no computador.
- Os controles de edição inline da administradora continuam funcionando (ficam visíveis só no modo edição).

## 2. Favoritos (coração na foto)
- Coração no canto superior da foto: contornado quando não favoritado, preenchido verde-oliva quando favoritado.
- Reutiliza a lista de desejos já existente (a mesma usada na página do produto e na Minha Biblioteca) — nenhuma tabela nova.
- Cliente logado: salva na conta na hora, persiste entre aparelhos.
- Visitante: ao tocar, aparece um aviso "Entre para salvar seus favoritos" com link para login, voltando à loja depois. (Não guardamos favoritos de visitante, para evitar duplicidade com a lista da conta.)

## 3. Selos por produto
- Novo campo opcional no produto: Nenhum / Novidade / Edição limitada / Mais vendido (padrão: Nenhum, então nada muda nos produtos atuais).
- Seletor no cadastro/edição de produtos do painel.
- Selo pequeno, em tom creme/dourado envelhecido, no canto da foto oposto ao coração.

## 4. "O Segredo das Quatro Chamas" (dentro de Promoções)
Administração (nova seção na página Promoções):
- Ativar/desativar (começa **desativado**).
- Quatro velas: imagem misteriosa (upload) + benefício de cada uma (texto e, opcionalmente, ligação a uma promoção/cupom já cadastrado em Promoções).
- Regras: valor mínimo, data de início/fim, texto de condições.
- Lista de resultados: quem participou, quando, qual vela, qual benefício.
- Nenhum benefício ou cupom é criado automaticamente.

Na loja:
- Se ativo e dentro da validade, aparece um modal com as quatro velas; o benefício só é revelado após a escolha.
- Uma participação por pessoa:
  - Logado: registrada no banco com regra de "uma por conta" — fechar, recarregar ou trocar de aparelho não permite nova escolha; mostra a vela já escolhida.
  - Visitante: identificador anônimo persistente no navegador + registro no banco com regra de "um por identificador". Limitação honesta: um visitante que limpar os dados do navegador ou usar outro aparelho consegue participar de novo; para garantia total, a administradora pode exigir login para participar (opção no painel).
- A escolha e o benefício são decididos no servidor (o navegador não consegue escolher o resultado nem ver os benefícios antes).

## 5. Preservação
- Só adições: novas colunas/tabelas, nenhuma exclusão de dados, rotas, imagens ou configurações.
- Lista de desejos, Minha Biblioteca, página do produto, promoções existentes e edição inline seguem iguais.
- Nenhuma etapa manual: as alterações do banco são aplicadas por mim após sua aprovação.

## Detalhes técnicos
- Migração aditiva:
  - `products.badge text null` com validação (`new`, `limited`, `bestseller`).
  - `four_flames_campaign` (linha única: active=false, require_login, min_cart_value, starts_at, ends_at, terms) e `four_flames_options` (position 1–4, image_url, benefit_title, benefit_description, promotion_id opcional). Leitura pública só de imagem/posição; benefícios lidos apenas pelo servidor; escrita só admin via `has_role`.
  - `four_flames_entries` (campaign_id, user_id null, visitor_id null, option_id, created_at) com índices únicos parciais por user_id e por visitor_id; leitura própria para o cliente, total para admin; inserção somente via server function.
  - GRANTs + RLS em todas as tabelas novas.
- Server functions (`createServerFn`): `getFourFlamesState` e `chooseFlame` (valida campanha ativa/janela, insere com conflito → retorna escolha existente, devolve o benefício). Visitor id gerado com `crypto.randomUUID()` em localStorage + cookie.
- Componentes: `ProductCard` (com `WishlistHeart` e `ProductBadge`) e `FourFlamesModal`, usados em `src/routes/loja.tsx`; seção nova em `src/routes/admin/promocoes.tsx`; seletor em `src/routes/admin/produtos.tsx`.
- Teste pequeno da regra "uma participação por pessoa" e da campanha começar desativada.
- Validação: build/typecheck + Playwright (loja visitante, coração logado, modal, painel).

## Estimativa de créditos (aproximada, pode variar)
- Cards + favoritos + selos: ~3–5 créditos
- Quatro Chamas (banco, servidor, modal, painel, resultados): ~6–9 créditos
- Validação e ajustes: ~2–3 créditos
- **Total aproximado: 11–17 créditos.** Pode ser feito em etapas (itens 1–3 primeiro, depois o item 4).
