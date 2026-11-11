# Revisão e acabamento do portal NFC — 11 de novembro de 2026

**Status: código e interface local validados. O uso real com contas, armazenamento e etiquetas NFC físicas permanece parcialmente validado. Nenhuma publicação foi executada.**

## Problemas encontrados e correções realizadas

### Navegação e botões

- Os dois links **Voltar ao portal**, na página de inspirações, voltavam ao início da abertura em vídeo. Agora levam diretamente ao conteúdo inicial, usando uma âncora de retorno. O primeiro acesso pelo endereço original do NFC continua exibindo o vídeo.
- A abertura da categoria da loja podia mostrar os banners gerais enquanto a categoria ainda carregava. A exibição agora aguarda essa resolução.
- Banners sem fotografia repetiam o título em duas camadas. A legenda agora aparece uma vez.
- O modal das velas de Natal permitia sair com o teclado e rolar a página ao fundo. Agora mantém o foco dentro da janela, fecha por Escape e restaura foco e rolagem ao fechar.

### Visual do portal

- Paleta geral ajustada para verde, vinho e dourado. O azul permanece apenas onde faz parte da identificação de uma das casas.
- **Mais magia** alterna as luzes e bolinhas vermelhas e verdes nas seções da página, com pulsação suave. Movimento reduzido é respeitado, inclusive na rolagem da galeria.
- As faixas das quatro casas aparecem novamente no final da página.
- O espaço das fotografias foi corrigido para impedir que as velas avancem sobre seus nomes em telas pequenas.
- Os recortes antigos tinham cerca de 90 pixels de largura. Foram preparadas duas versões ilustrativas de alta resolução a partir das referências disponíveis, identificadas na interface como **Imagem ilustrativa**. Elas não são fotografias novas dos produtos reais e podem ter diferenças de detalhes em relação à embalagem. Os arquivos anteriores e eventuais fotos próprias cadastradas foram preservados; uma foto própria continua tendo preferência. As fotos do catálogo de produtos não foram substituídas.

### Conheça o acervo

- Quadro com até cinco velas publicadas, imagens deslizantes, setas de navegação e acesso direto à página de cada produto.
- Foto, nome e endereço são consultados no cadastro atual do produto, sem exigir novo envio da mesma imagem.
- Em **Administração → Produtos**, cada produto salvo tem o botão **Colocar no portal NFC**. A administradora escolhe o portal e pode retirar uma seleção.
- Limite de cinco por portal, sem substituir escolhas anteriores automaticamente. Rascunhos e artefatos não são incluídos como velas publicadas.
- Seleções antigas de produtos indisponíveis podem ser retiradas explicitamente, liberando vagas sem apagar produtos.
- Falhas e edições concorrentes são tratadas sem informar sucesso indevidamente nem perder outra seleção. Fechar e reabrir durante um salvamento não permite que uma leitura antiga desfaça visualmente a confirmação.
- Galerias manuais existentes permanecem como alternativa enquanto não houver seleção configurada; nenhum conteúdo cadastrado foi apagado.

### Inspirações e conteúdo recente

- As alterações recentes do outro chat foram consultadas e incorporadas antes de editar. Os textos, a carta com selo verde, a página de inspirações e as duas histórias natalinas foram preservados.
- A página principal apresenta um trecho da Vela Seletora, lido do texto visível já cadastrado, com acesso à história completa.
- O mapa de rotas gerado foi atualizado para registrar a página de inspirações existente. Nenhum endereço NFC foi renomeado ou removido.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| Suíte completa | 335 testes aprovados em 58 arquivos, no fuso de São Paulo |
| TypeScript | Aprovado |
| Build | Aprovado, sem publicação |
| Lint | Arquivos novos e componentes formatados aprovados. Componentes antigos mantêm pendências de formatação e apontamentos preexistentes; comparação funcional sem novos apontamentos. Nenhuma regra foi desativada |
| Carrossel e seleção | Incluir/retirar, limite, erro, recarga, concorrência, escolha por portal, seleção indisponível, ordem, fotos atuais e filtro de publicados |
| Modal | Abrir, fechar, Escape, Tab/Shift+Tab, foco e rolagem |
| Navegação | Entrada original com vídeo; ambos os links de retorno sem repetir nem piscar a abertura; slug preservado |
| Navegador local | Computador e celulares simulados, claro/escuro e movimento reduzido; fotos, carta, histórias, seletor, links, setas e ausência de sobreposições/erros nos cenários conferidos |
| Integração da administração | Componente real da tabela de produtos, em ambiente isolado com banco fictício: abrir seletor, escolher, limite e múltiplos portais |

Os testes de navegador usaram respostas fictícias, sem contornar a autenticação real nem gravar cadastros. O vídeo original foi reproduzido localmente. As novas imagens foram carregadas nas dimensões de alta resolução e conferidas no espaço dos cartões. Isso não comprova login, pagamento ou persistência pela sessão real da proprietária.

## Leituras reais e limitações

- O portal e os textos visíveis foram consultados apenas para leitura. Nenhum texto pessoal foi reescrito no banco.
- O catálogo consultado tem somente **duas velas publicadas nessa categoria, ambas com nomes de teste**. Não há cinco velas definitivas selecionadas. A proprietária deverá publicar os produtos desejados e marcá-los pelo novo botão para preencher o quadro com cinco imagens reais.
- Não foram marcados produtos de teste automaticamente, publicados rascunhos ou modificados preços, estoque, pedidos, clientes, políticas ou estrutura do banco.
- A base consultada não tinha banners gerais ativos nem um banner próprio salvo para Harry Potter. Foram corrigidas as duplicações comprovadas no código; a existência de duas fotografias reais iguais na sessão da proprietária não foi reproduzida.

## Testes pendentes

- Conferir os controles e salvamentos na prévia com as contas reais de administradora e cliente.
- Selecionar os produtos definitivos e confirmar a leitura/gravação reais da associação ao portal.
- Conferir as etiquetas NFC já vendidas em Android e iPhone físicos, além de Safari.
- Confirmar a apresentação das imagens ilustrativas e substituí-las por fotos próprias de alta resolução quando desejado.
- Se a duplicação de fotografia continuar na sessão real, identificar a origem específica dessa imagem sem excluir cadastros.

## Arquivos alterados

- `src/components/PortalChristmasDecor.tsx`
- `src/components/PortalChristmasShowcase.tsx`
- `src/components/PortalFestiveAccents.tsx`
- `src/components/PortalProductCarousel.tsx`
- `src/components/StoreBanners.tsx`
- `src/components/admin/PortalProductPicker.tsx`
- `src/lib/portal-products.ts`
- `src/routes/admin/produtos.tsx`
- `src/routes/loja.tsx`
- `src/routes/portal.$slug.tsx`
- `src/routes/portal_.$slug.inspiracoes.tsx`
- `src/routeTree.gen.ts` (gerado)
- `src/styles.css`
- `src/assets/natal-entre-fios-ilustracao.webp`
- `src/assets/natal-grande-salao-ilustracao.webp`
- `src/test/nfc-world-of-magic.test.tsx`
- `src/test/portal-festive-controls.test.tsx`
- `src/test/portal-loading.test.tsx`
- `src/test/portal-natal-showcase.test.tsx`
- `src/test/portal-product-carousel.test.tsx`
- `src/test/portal-product-picker.test.tsx`
- `src/test/store-banner-duplication.test.tsx`
- Este relatório.

## GitHub, Lovable e publicação

- Branch de trabalho: `fix/portal-inspiracoes-natal`, preservando as atualizações mais recentes da principal.
- Commits separados por funcionalidade. A integração e a correspondência da versão no Lovable serão confirmadas no resultado final da conversa.
- Não foi acionada a IA do Lovable. A geração de imagens ilustrativas utilizou a ferramenta de imagens, separadamente do Lovable.
- Nenhum deploy, migração ou publicação da loja foi executado. A versão publicada permaneceu inalterada por esta tarefa.

**Status final: parcialmente validado**, com código e interface local conferidos e os limites reais registrados acima.
