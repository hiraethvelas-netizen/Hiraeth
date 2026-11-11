# Receitas e estoque de essência por tamanho

**Problema encontrado:** o cadastro tinha uma única receita por produto, em mililitros. A confirmação de compra baixava o estoque da vela, mas não baixava a essência. Assim, não era possível relacionar corretamente uma vela de 100 g a 8 g de essência e a de 250 g a 20 g. A leitura do banco atual foi feita somente por consultas, sem alterar cadastros.

**Correção preparada:** cada tamanho pode ter sua receita própria, com uma ou mais essências e a quantidade por vela. Por exemplo, duas velas de 100 g e uma de 250 g consomem 36 g da essência, quando suas receitas indicam respectivamente 8 g e 20 g. Tamanhos sem receita própria usam a receita padrão, como explicado na tela. As receitas mantêm o vínculo ao renomear opções, converter variações antigas ou acrescentar cor/casa. Preços, fotos e estoques continuam sendo tratados pelo editor de variações existente.

O produto e suas receitas são salvos juntos: uma falha desfaz a gravação inteira. Uma compra com pagamento confirmado baixa a essência da receita correspondente, multiplicada pela quantidade comprada. A baixa ocorre junto dos demais passos do pedido; uma confirmação repetida não desconta novamente. Saldo insuficiente encaminha o pagamento para conferência, sem baixa parcial. Não há processamento retroativo de pedidos nem reposição automática da essência ao cancelar.

Novas essências podem ser cadastradas em gramas ou mililitros. Cadastros anteriores permanecem em mililitros, com os mesmos valores; não há conversão automática entre as unidades. A unidade de um cadastro existente fica protegida contra simples troca de rótulo. Os movimentos manuais também passam a usar o saldo atualizado e registram seu histórico na mesma operação. Editar apenas nome ou notas não sobrescreve uma baixa ocorrida durante a edição.

**Arquivos alterados:**

- `src/components/admin/CandleEssenceEditor.tsx`
- `src/components/admin/CandleRecipesEditor.tsx`
- `src/components/admin/CandleRecipesEditor.test.tsx`
- `src/lib/candle-recipes.ts`
- `src/lib/candle-recipes.test.ts`
- `src/lib/product-variants.ts`
- `src/routes/admin/produtos.tsx`
- `src/routes/admin/essencias.tsx`
- `src/integrations/supabase/types.ts`
- `src/routeTree.gen.ts` (registro gerado de uma rota já existente; nenhum componente NFC alterado)
- `src/test/admin-workflows.test.tsx`
- `src/test/essence-stock-units.test.tsx`
- `supabase/migrations/20261111000100_variant_essence_recipes.sql`
- `scripts/tests/variant-recipes-fixture.sql`
- `scripts/tests/variant-recipes-assertions.sql`
- `scripts/tests/variant-recipes-concurrency.py`
- este relatório.

**Validação já comprovada:** testes direcionados da interface e identidade de receita passaram; TypeScript e build passaram. A suíte completa final passou com 312 testes em 57 arquivos, incluindo a proteção ao acrescentar dimensões. O TypeScript também revelou que o registro de rotas versionado na principal estava desatualizado em relação a uma página de inspirações já existente. Foi mantido o registro que o build gera automaticamente, sem alterar a página ou outros componentes NFC. Lint foi executado: novos módulos e testes estão limpos; arquivos existentes têm apontamentos de formatação (inclusive em trechos editados) e dívida anterior, portanto o lint completo não está limpo.

No PostgreSQL 17 descartável passaram os casos de 8 g/20 g, múltiplas unidades, herança padrão, renomeação, falha ao salvar produto/receita, permissões, saldo insuficiente, repetição e concorrência de pagamentos, entrada manual simultânea à venda e falha no histórico. Os testes usaram dados fictícios; nenhum provedor de pagamento foi chamado.

No navegador local foram conferidos os formulários completos de produtos e estoque em computador claro e celulares claro/escuro, incluindo 320 pixels. Adicionar, alterar, remover, trocar de tamanho, salvar e reabrir as receitas funcionaram com persistência simulada. Falhas de gravação mantiveram o preenchimento. Na loja simulada o cliente selecionou os dois tamanhos, com preços e linhas de sacola independentes; nenhuma quantidade privada da receita apareceu para ele. A revisão independente terminou sem problemas materiais pendentes.

**Testes pendentes:** aplicar a atualização aprovada no banco real e verificar o fluxo integrado com contas de teste e pagamento de teste do provedor. O navegador usou autenticação e armazenamento simulados; o PostgreSQL local comprova as rotinas SQL, mas não equivale a uma compra real. Nenhum produto ou receita real foi configurado automaticamente com os números do exemplo.

**Alteração do banco preparada para aprovação:** acrescentar a unidade das essências e dos movimentos, um marcador de baixa no pedido e uma tabela privada de receitas por variação; criar as rotinas administrativas de gravação e movimento, a proteção da unidade e a rotina interna de consumo; incluir as notas das receitas específicas na pirâmide pública sem expor quantidades; chamar o consumo dentro da confirmação de pagamento existente. A nova tabela terá acesso restrito à administração, e as novas rotinas verificarão esse papel. As políticas existentes permanecem preservadas. Não será apagado nenhum cadastro nem convertido saldo existente. A migração ainda não foi aplicada no ambiente remoto.

**GitHub:** branch separada `fix/receitas-por-tamanho`, criada a partir da versão atual da principal. Os testes completos, TypeScript e build da versão final passaram; a proposta é preparada para revisão antes da aplicação remota e integração. As mudanças de componentes e conteúdo do portal NFC estão em outra proposta; esta contém somente o registro de rota que o gerador já produz para a página existente.

**Lovable:** esta correção ainda não está sincronizada. Nenhuma mensagem para a inteligência artificial do Lovable foi enviada.

**Publicação:** nenhum deploy ou comando de publicação foi executado. A versão publicada permaneceu inalterada por este trabalho.

**Status final:** parcialmente validado — código e comportamento local conferidos; banco remoto, integração e validação real pendem de aprovação. A exigência de aprovação vem da instrução permanente da proprietária: não alterar a estrutura ou permissões do banco sem aprovação.
