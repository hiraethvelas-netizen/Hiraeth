# Produtos: lista, pesquisa e edição em janela; verificação do acesso das casas

**Problemas encontrados:** no celular, a tabela de produtos apertava nomes e categorias e escondia parte das ações. O aviso de estoque baixo tinha pouco contraste. Editar abria o formulário acima da lista. A busca existente não tratava bem diferenças de acento. No acesso das casas, falhas técnicas de sessão ou consulta podiam ser confundidas com falta de ativação NFC.

**Esclarecimento sobre a imagem da Taça das Casas:** a proprietária confirmou que abriu a prévia/link geral. Nesse acesso, exigir o NFC individual para ativar o selo é o comportamento previsto. A regra foi preservada. A correção do componente distingue uma falha técnica dessa recusa legítima; não libera o selo pelo link público.

**Correção realizada nos produtos:**

- A lista se adapta ao celular com informações separadas, nomes e categorias legíveis, ações visíveis e destaque de estoque baixo. No computador, mantém a apresentação em tabela. O critério de estoque baixo continua sendo até cinco unidades.
- A busca local permite nome, SKU e categoria, ignorando acentos, maiúsculas/minúsculas e espaços extras. Há contador, limpeza da pesquisa e mensagem própria para pesquisa sem resultados.
- O formulário completo existente abre em uma janela sobre a lista, tanto para editar como para cadastrar. Mantém campos, fotos originais, recorte opcional, variações, receitas por tamanho, essências, valores, estoques e selos da versão recente do projeto.
- A janela permite fechar, cancelar e usar Escape, controla a rolagem e devolve o foco. Os recortes de produto e variação abrem em janelas aninhadas; envios em andamento impedem o fechamento acidental.
- A busca permanece preenchida. A lista já carregada continua visível durante a atualização após salvar, preservando altura e contexto. Respostas atrasadas das receitas não reabrem um cadastro cancelado nem preenchem outro produto.
- Os avisos de validação e falha aparecem na janela ativa, incluindo os de essência e imagem. Uma falha de consulta inicial mostra o erro e a tentativa novamente, sem afirmar que o catálogo está vazio.

**Correção realizada no botão das casas:** falhas de sessão, consulta e ativação recebem mensagens específicas e permitem nova tentativa. Cliques repetidos não iniciam ativações duplicadas; o código é preservado após uma falha e só é limpo depois da validação bem-sucedida. A escolha da casa continua condicionada à validação no servidor. Nenhuma permissão, política, cadastro ou regra de exclusividade foi alterada.

As alterações partiram da principal recente, preservando as novidades do portal, do quiz e dos selos feitas no outro chat. A atualização mais recente do placar — recuperação, última contagem, nova tentativa e atualização ao voltar à conexão — e o menu da conta também foram mantidos. A proposta anterior de contraste já consta integrada no GitHub por outra atualização; esta tarefa não a desfez.

**Arquivos alterados:**

- `src/routes/admin/produtos.tsx`
- `src/components/admin/AdminProductList.tsx`
- `src/components/admin/AdminProductList.test.tsx`
- `src/components/admin/AdminEditorDialog.tsx`
- `src/components/admin/AdminEditorDialog.test.tsx`
- `src/components/admin/CandleEssenceEditor.tsx`
- `src/components/admin/ProductVariantsEditor.tsx`
- `src/components/admin/ProductVariantsEditor.test.tsx`
- `src/test/admin-workflows.test.tsx`
- `src/components/HouseCup.tsx`
- `src/test/house-cup-access.test.tsx`
- este relatório.

**Testes executados:** a suíte completa final passou com 417 testes em 84 arquivos. TypeScript e build passaram. Também passaram 29 testes direcionados de produtos, 14 de essências/receitas/pesquisa e 12 de acesso das casas. A revisão independente encontrou um botão de fechar aviso que podia submeter o formulário no recorte da variação. A ação padrão foi neutralizada e uma regressão com o Sonner real confirmou que fechar o aviso não salva o produto; o salvamento intencional continua funcionando. Os demais pontos revisados foram preservados; `git diff --check` passou. Os arquivos novos estão limpos no lint; arquivos antigos mantêm apontamentos de formatação, `any` e avisos anteriores. O lint completo não está limpo.

No navegador local, os 16 casos de acesso das casas passaram, incluindo prévia sem código, sessão ausente, falhas, resposta inválida, código recusado, validação positiva simulada, repetição, preservação do código, redirecionamento ao cadastro e falha ao salvar a escolha. O teste usa códigos fictícios; nenhum código ou selo real foi ativado. Uma consulta somente de metadados confirmou que as rotinas e tabelas de validação existem no banco atual, sem alterar dados.

A conferência final do navegador passou em oito combinações de largura e tema (1440, 768, 390 e 320 pixels, claro e escuro), dois cenários de rolagem com consulta atrasada em 500 ms e complementos de falha, carregamento, cadastro, essências e tipos de produto. Busca, campos, fotos originais, recortes opcionais, receitas por tamanho, fechamento por X/Cancelar/Escape e retorno de foco foram conferidos. A busca e a rolagem permaneceram durante o salvamento e recarga simulada. Fechar o aviso dentro do recorte da variação não salvou o produto; o salvamento intencional posterior enviou uma única gravação.

A pesquisa aberta de essências e o cadastro inline passaram nas mesmas oito combinações, incluindo clique, teclado, Escape, gramas/mililitros e notas puras/compostas. Contraste normal mínimo das áreas avaliadas: 4,57:1; lista e editor ficaram em pelo menos 4,72:1 no claro e 5,03:1 no escuro. Nas rodadas finais não houve erros de página, console ou solicitações externas. As capturas foram inspecionadas visualmente. Toda persistência, autenticação e ativação positiva foram simuladas; não equivalem ao uso real do Supabase.

**Testes pendentes:** o navegador usa autenticação e armazenamento simulados. O teste autenticado real com uma etiqueta NFC individual e o salvamento de um cadastro real não foram realizados; não há código genuíno de teste nesta sessão, e nenhum dado real será alterado para simular uma compra. As larguras simuladas também não equivalem a aparelhos físicos Android/iPhone.

**GitHub:** branch separada `fix/produtos-acesso-casas`, baseada na principal atual. Os ajustes estão preparados para revisão em commits separados de produtos e acesso às casas. Nenhuma integração foi executada nesta tarefa.

**Lovable:** as novas mudanças ainda não estão sincronizadas. Nenhuma mensagem foi enviada à inteligência artificial do Lovable.

**Publicação:** não foi executado deploy ou comando de publicação. A loja publicada permaneceu inalterada por este trabalho.

**Status final:** parcialmente validado — código, suíte completa, TypeScript, build e navegador local aprovados. Uso autenticado real, NFC físico e integração ainda pendentes. Não houve alteração de banco ou dados reais.

**Evidências:** [relatório visual](/workspace/hiraeth-validation/produtos-casas-2026-11-13/README.md), que inclui roteiros, dados fictícios, medições e capturas para reproduzir as conferências.
