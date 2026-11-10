# Bolinhas e banners das subcategorias — 10 de novembro de 2026

**Status: código validado por testes e interface conferida em navegador local. A configuração de lançamento foi salva e lida de volta no banco. O fluxo autenticado real e aparelhos físicos continuam pendentes.**

## Problemas encontrados

- A Loja exibia uma lista fixa de bolinhas, sem controle próprio de exibição. O controle de visibilidade das categorias também afeta produtos e navegação, portanto não servia para ocultar somente as bolinhas.
- O contador mostrava sempre “7 universos”.
- O banner da subcategoria tinha um campo próprio, mas usava a imagem da bolinha quando o campo estava vazio.
- Ao abrir uma categoria, banner e lista de produtos compartilhavam a mesma identificação interna, provocando aviso do React.
- No modo de edição em telas pequenas, os botões do banner e do nome se sobrepunham e podiam cobrir o título.

## Correções realizadas

- No modo de edição da Loja, o botão **Editar bolinhas de subcategorias** permite mostrar/ocultar a área inteira e escolher cada bolinha.
- O controle continua acessível quando a área ou todas as bolinhas estão ocultas.
- A configuração é separada da disponibilidade das categorias e produtos. O menu do acervo permanece com seu comportamento existente.
- Novas subcategorias podem ser selecionadas no editor. Quando há uma seleção explícita, novas bolinhas aguardam seleção, em vez de aparecer automaticamente.
- O contador acompanha a quantidade visível e usa “1 universo” para uma única bolinha.
- A área aguarda a leitura da configuração para evitar mostrar bolinhas ocultas por um instante. Falhas permitem nova tentativa pela administração.
- Salvar falhando mantém o formulário e as escolhas anteriores. Respostas antigas e categorias que chegam com o editor aberto não apagam as seleções.
- O banner usa somente a foto própria da subcategoria. Sem foto cadastrada, apresenta o fundo já existente. A imagem da bolinha permanece independente.
- Envio, corte, zoom e rotação do banner foram preservados. Os botões de editar banner e nome ficam juntos em uma faixa com quebra de linha nas telas pequenas.
- A identificação interna do banner foi diferenciada da lista de produtos, mantendo a troca por categoria.

## Configuração real solicitada

Após os testes, foi criado um único registro de configuração em `site_content`, na chave `store-collection-visibility`, com a área habilitada e somente Harry Potter selecionada. Uma segunda consulta confirmou a escolha salva.

Essa foi a configuração de exibição solicitada pela proprietária, não uma gravação usada para testar o banco. A chave não existia nas consultas anteriores e a criação foi protegida para não sobrescrever uma configuração concorrente.

Não foram alteradas categorias, produtos, preços, estoques, pedidos, clientes, permissões ou estrutura do banco. Nenhuma imagem real de banner foi substituída. Não houve migração nem mudança dos endereços NFC.

O controle novo se aplica às bolinhas da **Loja**. Outras áreas do aplicativo não foram reformuladas.

## Como usar

1. Entre como administradora e ative **Editar site** na Loja.
2. Abra **Editar bolinhas de subcategorias**, marque quais devem aparecer ou desmarque a exibição da área, e salve.
3. Para trocar o banner, abra a subcategoria e clique em **Editar banner da coleção**. Envie a foto, ajuste o corte e salve. Isso não troca a foto da bolinha.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| Suíte completa | 289 testes aprovados em 51 arquivos, no fuso de São Paulo |
| TypeScript | Aprovado |
| Build | Aprovado, sem publicação |
| Lint | Arquivos novos aprovados. Os componentes antigos ainda têm pendências de formatação; não foram desativadas regras nem feita reformatação geral |
| Regressão de visibilidade | Só Harry Potter, todas, nenhuma, área oculta, contador, nova subcategoria, salvar/recarregar, erro, nova tentativa, leitura atrasada e categorias que chegam com modal aberto |
| Regressão de banner | Imagem independente, envio/corte, salvar/recarregar, erro mantendo a imagem anterior, configuração por subcategoria e preservação da bolinha |
| Navegação | Troca entre categorias sem conflito de identificação entre banner e produtos |
| Navegador local | Chromium: computador de 1440 px e celular de 390 px em claro/escuro; reteste do banner também em 320 px claro |
| Interações visuais | Mostrar/ocultar, salvar/recarregar, falha e nova tentativa, envio de arquivo, corte real em canvas, zoom, rotação, cancelamento, abertura/fechamento de modal e troca de categoria |
| Reteste final visual | Sem sobreposição dos controles, corte horizontal, erro JavaScript ou aviso de console nos cenários conferidos |

Os testes automáticos e de navegador usaram respostas e arquivos fictícios. A gravação real da configuração de lançamento foi confirmada separadamente por leitura no banco; isso não comprova o salvamento pela sessão autenticada da proprietária.

## Testes pendentes

- Entrar na prévia sincronizada com uma conta real de administradora, salvar e recarregar pelo aplicativo, confirmando as permissões da sessão.
- Conferir a apresentação com uma conta real de cliente.
- Enviar a foto escolhida pela proprietária ao armazenamento real e confirmar sua persistência após recarregar. Os testes visuais usaram armazenamento simulado.
- Conferir em iPhone/Safari e Android físicos. As telas pequenas foram simuladas no Chromium.
- Resolver as demais pendências do lint em revisão própria, preservando o escopo desta tarefa.

## Arquivos alterados

- `src/routes/loja.tsx`
- `src/components/CategoryHeroBanner.tsx`
- `src/hooks/use-collection-visibility.ts`
- `src/test/store-circle-visibility.test.tsx`
- `src/test/category-banner-independence.test.tsx`
- Este relatório.

## GitHub, Lovable e publicação

- Branch: `fix/visibilidade-subcategorias`, baseada na principal mais recente consultada.
- Commits separados para visibilidade, banner e documentação. A integração e a correspondência da versão no Lovable serão informadas no resultado final da conversa após confirmação.
- Não foi acionada a IA do Lovable.
- Nenhum deploy ou publicação foi executado. A loja publicada permaneceu inalterada por esta tarefa; salvar a configuração e sincronizar o código não equivalem a publicar essa interface.

**Status final: parcialmente validado**, com testes automatizados, validação visual local e confirmação da configuração solicitada no banco; permanecem os limites reais descritos acima.
