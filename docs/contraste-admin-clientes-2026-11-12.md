# Contraste e clareza no editor NFC e nas áreas dos clientes

**Problema encontrado:** as imagens enviadas mostram títulos amarelos e textos claros pouco legíveis sobre o fundo claro no editor NFC, instruções extensas e um campo técnico de configuração aberto ocupando muito espaço. As recomendações de produtos exibiam três chamadas para a mesma seção; o convite e o formulário das avaliações também repetiam explicações. O preço das recomendações tinha contraste insuficiente no modo claro.

**Correção realizada:**

- O formulário de configuração do portal usa a superfície baunilha e textos escuros da identidade Hiraeth, com campos, textos de apoio e botões legíveis nos dois temas.
- O texto “Menu do painel” e os estados ativo/hover da navegação administrativa usam cores legíveis; o menu compacto, seus grupos e seu funcionamento recente foram preservados.
- Campos recebem rótulos persistentes e ficam agrupados em dados do portal, abertura em vídeo e playlist. O endereço NFC permanente continua destacado em um aviso curto; as explicações adicionais ficam acessíveis ao expandir a ajuda.
- As configurações técnicas e seu exemplo ficam recolhidos em “Configurações avançadas”. Os valores continuam no formulário ao recolher essa seção. Um erro de JSON abre a seção e leva o foco ao campo para correção.
- O editor de fotos conserva upload, recorte, ordem, legendas e links, com cores de campos e instruções ajustadas à superfície administrativa.
- As recomendações mantêm apenas o título principal “Outras Chamas para Descobrir”, com fotos, nomes, preços e links dos produtos preservados. Os preços usam texto de maior contraste.
- As avaliações mantêm um título e o botão de participação, com rótulos e avisos mais curtos no formulário. Depoimentos, nomes, notas, mídias, limites de arquivo, moderação e envio foram preservados.
- A conferência revelou que a mensagem de falha no envio da avaliação ficava atrás do formulário. O aviso agora aparece dentro do formulário aberto, preservando o preenchimento e os arquivos para nova tentativa.

As alterações partem da principal atual, incluindo as mudanças recentes do menu e das abas administrativas. Não há migração, alteração de autenticação ou permissões, nem edição de produtos, preços, estoques, clientes, pedidos, avaliações ou conteúdos cadastrados.

**Arquivos alterados:**

- `src/routes/admin/portais.tsx`
- `src/routes/admin.tsx`
- `src/components/admin/PortalGalleryEditor.tsx`
- `src/components/RelatedProducts.tsx`
- `src/components/CustomerReviews.tsx`
- `src/test/nfc-permanence.test.tsx`
- `src/test/related-products.test.tsx`
- `src/test/customer-reviews.test.tsx`
- este relatório.

**Testes executados:** a suíte completa passou com 330 testes em 59 arquivos. TypeScript e build passaram. Também passaram 21 testes direcionados do editor NFC, três de recomendações e oito de avaliações. Incluem tema preservado ao recolher as opções, JSON inválido sem gravação parcial, cancelamento, conteúdo de clientes, mídia, payload e falhas de envio. A revisão independente de código terminou sem problemas bloqueadores e `git diff --check` passou. Lint foi executado: os testes novos estão limpos; arquivos existentes mantêm apontamentos de formatação e avisos anteriores, portanto o lint completo não está limpo.

A validação no Chromium passou em 12 cenários: editor/menu administrativo e áreas dos clientes nas larguras de 1440, 390 e 320 pixels, nos modos claro e escuro. Foram conferidos contraste de texto, placeholders, foco, estados ativo/hover, menu móvel, abas, ajuda, configurações avançadas, salvar, falha sem perder rascunho, cancelamento, galeria, recorte, recomendações e envio de avaliação com mídia. Salvar/reabrir foi testado com persistência simulada; o endereço NFC e o status publicado foram preservados na fixture.

Nas áreas avaliadas, o menor contraste de texto normal foi 5,38:1 na administração e 5,23:1 nos clientes; ambos superam o mínimo adotado de 4,5:1. Não houve transbordamento horizontal ou erro de página. O recorte gerou avisos preexistentes de URLs temporárias descartadas no modo de desenvolvimento; aplicar/cancelar funcionou e o componente global de recorte permaneceu intacto. Esses avisos estão registrados, portanto não se afirma que o console inteiro ficou sem avisos.

**Testes pendentes:** o navegador local usa autenticação e armazenamento simulados. Essa validação não equivale ao fluxo autenticado real no Supabase nem a testes em aparelhos físicos. Nenhum cadastro real será usado para testes destrutivos.

**GitHub:** branch separada `fix/contraste-admin-textos`, criada a partir da principal atual. A proposta contém somente os ajustes de contraste, clareza e seus testes, preservando os commits recentes da principal. Ainda não foi integrada.

**Lovable:** esta atualização ainda não está sincronizada. Nenhuma mensagem foi enviada à inteligência artificial do Lovable.

**Publicação:** nenhum deploy ou comando de publicação foi executado; a versão publicada da loja permaneceu inalterada por este trabalho.

**Status final:** parcialmente validado — código, testes automatizados, TypeScript, build e comportamento visual local conferidos; uso autenticado real e integração no Lovable ainda pendentes. Integração e publicação não foram executadas.

**Evidências:** [relatório visual](/workspace/hiraeth-validation/contraste-admin-clientes/README.md), [editor no celular claro](/workspace/hiraeth-validation/contraste-admin-clientes/admin-config-390-light.png), [recomendações no celular escuro](/workspace/hiraeth-validation/contraste-admin-clientes/related-390-dark.png) e [erro de avaliação visível](/workspace/hiraeth-validation/contraste-admin-clientes/review-error-390-dark.png).
