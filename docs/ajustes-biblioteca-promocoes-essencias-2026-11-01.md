# Biblioteca, Meu Universo, promoções, categorias e essências — Hiraeth

**Status: código preparado e validado por testes; integração e validação real pendentes. Não publicar nem integrar antes de aprovar e aplicar as atualizações do banco.**

## Problemas encontrados

- A categoria da Biblioteca era somente texto livre, sem sugestões da loja; diferenças de caixa e espaçamento criavam grupos distintos.
- Meu Universo usava distribuição alternada entre três fileiras e inseria novos interesses no começo da lista.
- O campo `finished`, utilizado por “Marcar que a vela acabou”, não existe no Supabase conectado.
- O cadastro de essências tentava enviar notas olfativas que também não existem no banco conectado. A tela de estoque não oferecia o cadastro dessas notas.
- O cadastro do produto não distinguia vela de artefato e descartava erros ao salvar a receita.
- Promoções não ofereciam seleção de produtos/categorias na interface, e o carrinho tratava apenas cupons simples. Os campos claros sob o tema escuro também precisavam de uma combinação explícita de texto e fundo.
- As Quatro Chamas pediam URLs de imagens e exibiam imagens enviadas.

## Alterações preparadas

### Biblioteca e Meu Universo

- Sugestões das categorias visíveis da loja, junto às categorias pessoais existentes. Continua permitido escrever outra, como Verity; isso não cria uma categoria no catálogo oficial.
- Harry Potter, harry potter e variantes de espaços são agrupados sob o nome oficial. Isso não apaga nem reclassifica registros existentes no banco.
- A atualização de “acabou” só é exibida como concluída após a resposta de confirmação. Enquanto faltar o campo no banco, a mensagem explica a atualização pendente.
- Meu Universo passa a preencher três itens por fileira, da esquerda para a direita; a quarta entrada inicia a próxima fileira. A leitura e a inclusão usam a ordem cronológica. O visual de madeira e as ações de edição/exclusão próprias foram preservados.

### Categorias na loja

- O menu é recarregado ao abrir e ao retornar à janela. Também possui assinatura de alterações em tempo real e consulta periódica a cada 15 segundos como alternativa. A entrega em tempo real depende da configuração existente do Supabase; ela não foi modificada.
- Alterações feitas pela administração disparam atualização na mesma janela.
- Categorias temporárias têm selo no menu e nos cartões dos produtos correspondentes, inclusive quando a categoria principal é temporária. Os portais de coleção preservam o selo.
- Categorias fora do período e descendentes de categorias indisponíveis não são oferecidos. As datas continuam inclusivas.

### Produtos e essências

- Escolha “Uma vela” ou “Um artefato”. Velas oferecem 100 g ou 250 g, combinação de várias essências do estoque e quantidades internas por ingrediente. As variações avançadas existentes continuam disponíveis.
- Um tamanho antigo diferente não é apagado automaticamente. Produtos antigos sem tipo não são reclassificados em lote.
- É possível cadastrar uma essência no estoque a partir do formulário do produto, informando saldo inicial e suas notas.
- “Essência pura” usa seu próprio nome como nota, na posição saída/corpo/fundo escolhida pela administradora. A posição não é inferida automaticamente do nome.
- Essência composta possui notas de saída, corpo e fundo no cadastro da essência. A combinação da vela reúne as notas dos ingredientes sem duplicatas.
- A leitura pública proposta retorna apenas descrição e notas de produtos publicados, sem fornecedor, estoque ou quantidade da receita.
- A receita passa a ser gravada em uma operação transacional. Se um ingrediente falhar, a receita anterior não fica parcialmente apagada. Falha na receita não gera aviso de sucesso completo do produto.
- Artefatos classificados no novo cadastro ficam excluídos das futuras inclusões automáticas na estante de velas. Não há remoção ou alteração retroativa de registros.

### Promoções e Quatro Chamas

- Seleção de toda a loja, categorias ou produtos. Uma categoria selecionada inclui suas subcategorias.
- Regras implementadas e testadas em ambiente isolado: cupom percentual/fixo, desconto automático, Leve X/pague Y, frete grátis e brinde.
- Conforme a escolha da proprietária, os descontos são somados, junto com frete grátis e brindes. Cada percentual usa o subtotal dos produtos elegíveis antes dos demais descontos. O total dos descontos é limitado ao valor dos produtos.
- Em Leve X/pague Y, as unidades elegíveis mais baratas são gratuitas; grupos incompletos não recebem o benefício. Essa regra está descrita na edição da promoção.
- O pedido recebe um resumo de frete grátis e brindes, exibido no histórico e na administração. O recebimento físico do brinde e a tarifa real de frete continuam dependendo da operação da loja.
- A proposta do banco inclui um registro de uso por pedido/promoção e bloqueio ao atingir o limite, sem contar pedidos antigos retroativamente. O uso é contabilizado quando os itens são inseridos; não foi introduzida restituição automática de usos em cancelamentos.
- Se a inserção dos itens falhar, uma função restrita pode descartar apenas o pedido pendente, vazio, sem pagamento, recém-criado e da própria conta. Não foi criada permissão geral para clientes excluírem pedidos.
- Quatro cartas com vela desenhada já estão prontas. Não é necessário enviar imagem nem informar URL. Os campos de imagem foram retirados da edição conforme solicitado; valores antigos no banco não foram apagados.
- Continuam editáveis título, apresentação e os quatro prêmios. Benefícios de cupom/desconto precisam de código vinculado. A escolha e os registros existentes foram preservados.
- Os campos de Promoções usam texto escuro, fundo claro e esquema de controles nativos claro dentro dos cartões, inclusive no tema escuro.

## Testes executados

- Suíte completa: 82 testes aprovados em 16 arquivos.
- TypeScript: aprovado.
- Build: aprovado, sem deploy.
- Lint dos arquivos novos de componentes, lógica e testes: aprovado. O lint dos arquivos antigos modificados ainda aponta formatação e pendências anteriores; a comparação das regras fora de formatação não encontrou novos apontamentos nos arquivos de aplicação.
- Testes de componentes: categorias sugeridas e personalizadas, agrupamento de nomes, estado “acabou” em sucesso/falha, fileiras 3/3/1 em Meu Universo, atualização do menu, selo temporário, tipos de produto, pesos, vários ingredientes, criação de essência, falha de receita e edição de prêmios.
- Testes de regras e checkout simulado: elegibilidade, descendentes, desconto fixo/percentual, Leve X/pague Y, datas, mínimo, limites, frete, brinde, soma e teto de descontos, envio do resumo no pedido e bloqueio quando não é possível consultar promoções.
- PostgreSQL descartável, sem conexão com a loja: as três migrações foram aplicadas sobre tabelas fictícias. Foram verificados persistência de “acabou”, retorno público sem dados internos, proteção de rascunhos, restrição da receita à administração, restauração transacional em erro, exclusão de artefatos das novas compras da Biblioteca, contagem de uso uma vez por pedido e recusa de uso acima do limite. Também foi testado que o descarte de pedido não exclui um pedido com itens.
- O teste de banco usa uma função de autenticação fictícia e tabelas mínimas. Ele não certifica as políticas, contas ou integrações reais do Supabase.

## Atualizações do banco aguardando aprovação

1. `20261101000100_hiraeth_library_essence_workflows.sql`: campos de vela acabada, notas/tipo de essência, tipo de produto e resumo de promoção; gravação transacional da receita e leitura pública restrita das notas.
2. `20261101000200_exclude_artifacts_from_candle_library.sql`: preserva o gatilho atual de compras, acrescentando apenas a exclusão dos novos produtos classificados como artefatos.
3. `20261101000300_track_order_promotion_uses.sql`: controle de uso por pedido, proteção do registro de usos e descarte restrito de pedidos novos que ficaram vazios por falha.

Nenhuma foi aplicada à loja. Não foram executadas migrações antigas em lote, backfills ou mudanças nos registros reais. As novas funções e permissões exigem aprovação conforme as instruções permanentes da proprietária.

## Verificação manual e testes ainda pendentes

**Não foi possível comprovar todas as promoções no aplicativo real. A proprietária deverá verificar manualmente esses fluxos, ou disponibilizar uma sessão de teste apropriada após a atualização aprovada.**

- No celular e no computador, conferir legibilidade e disposição dos novos campos nos temas claro e escuro. Os testes de componentes não renderizam CSS como um navegador.
- Na Biblioteca, criar uma vela de teste em Harry Potter, recarregar, conferir o agrupamento com uma compra e depois marcar/desmarcar “acabou”. Confirmar também uma categoria pessoal.
- Em Meu Universo, criar entradas de teste até passar de três e seis, recarregar e conferir a ordem.
- Em Promoções, usar registros exclusivos de teste para cada tipo, escopo, data e limite de uso. Conferir carrinho, total, resumo do pedido, visibilidade administrativa e persistência após recarregar.
- Conferir a soma de duas promoções e um cupom, o teto do desconto, frete e brinde na operação real.
- Nas Quatro Chamas, testar uma conta exclusiva com participação ainda não registrada. Não foram apagadas participações reais para repetir escolhas.
- No produto, cadastrar uma vela e um artefato de teste, combinar essências puras/compostas, recarregar e conferir a receita e a pirâmide na loja.
- A precificação e o estoque do checkout existente ainda não constituem uma transação de pagamento completa no servidor. Pagamento, tarifa de frete, entrega do brinde e concorrência de compras reais não foram certificados por esta tarefa.

## GitHub, Lovable e publicação

As mudanças ficam na proposta de revisão existente, em branch separada, preservando as correções anteriores e as atualizações recentes da principal. Os commits separam categorias/Biblioteca, produtos/essências, promoções e a preparação do banco.

Não houve integração na principal, sincronização das novas mudanças no editor Lovable nem publicação. A versão publicada permaneceu inalterada por esta tarefa.

## Arquivos alterados nesta solicitação

- `src/components/AcervoNavigation.tsx`
- `src/components/CandleBookshelf.tsx`
- `src/components/CollectionPortals.tsx`
- `src/components/SecretFlamesPromotion.tsx`
- `src/lib/cart.tsx`
- `src/routes/_authenticated/biblioteca.tsx`
- `src/routes/_authenticated/comunidade.tsx`
- `src/routes/_authenticated/pedidos.tsx`
- `src/routes/admin/categorias.tsx`
- `src/routes/admin/essencias.tsx`
- `src/routes/admin/pedidos.tsx`
- `src/routes/admin/produtos.tsx`
- `src/routes/admin/promocoes.tsx`
- `src/routes/carrinho.tsx`
- `src/routes/loja.tsx`
- `src/routes/produto.$slug.tsx`
- `src/test/candle-bookshelf.test.tsx`
- `src/test/cart-coupon.test.tsx`
- `src/test/community-chat.test.tsx`
- `src/test/product-wishlist.test.tsx`
- `scripts/tests/library-essence-assertions.sql`
- `scripts/tests/library-essence-fixture.sql`
- `src/components/OrderPromotionSummary.tsx`
- `src/components/SecretFlameCard.tsx`
- `src/components/admin/EssenceNotesFields.tsx`
- `src/hooks/use-library-categories.ts`
- `src/lib/fragrance.test.ts`
- `src/lib/fragrance.ts`
- `src/lib/library-categories.test.ts`
- `src/lib/library-categories.ts`
- `src/lib/promotions.test.ts`
- `src/lib/promotions.ts`
- `src/lib/store-categories.ts`
- `src/test/acervo-categories.test.tsx`
- `src/test/admin-workflows.test.tsx`
- `src/test/cart-promotions.test.tsx`
- `supabase/migrations/20261101000100_hiraeth_library_essence_workflows.sql`
- `supabase/migrations/20261101000200_exclude_artifacts_from_candle_library.sql`
- `supabase/migrations/20261101000300_track_order_promotion_uses.sql`
- `docs/ajustes-biblioteca-promocoes-essencias-2026-11-01.md`
