# Continuação da revisão Hiraeth — 1 de novembro de 2026

**Status: parcialmente validado. As verificações que dependem de acesso autenticado, navegador e ambiente separado de testes continuam bloqueadas.**

## Problemas encontrados e correções realizadas

1. **Copiar cupom:** o botão anunciava sucesso antes da confirmação da área de transferência. Agora aguarda a confirmação, bloqueia cliques durante a operação, informa a falha e permite nova tentativa. Navegadores sem essa API recebem uma mensagem orientando a cópia manual.
2. **Desconto após mudança no carrinho:** o desconto anterior continuava aplicado após alterar quantidades. Agora o cupom está associado ao conteúdo do carrinho que foi validado; se ele mudar, o desconto anterior deixa imediatamente de compor o total. A tela orienta reaplicar o cupom. A nova consulta mantém as regras e os valores comerciais existentes.
3. **Resposta atrasada da consulta:** uma consulta de cupom feita antes de alterar o carrinho poderia aplicar o desconto calculado sobre a seleção anterior. Agora essa resposta é descartada. Falhas de rede liberam o botão para tentar novamente, e a finalização fica bloqueada enquanto o cupom está sendo consultado.

Não foram alterados preços, promoções cadastradas, regras do banco, permissões, autenticação, estoque ou dados de clientes.

## Arquivos desta continuação

- `src/components/SecretFlamesPromotion.tsx`
- `src/routes/carrinho.tsx`
- `src/test/secret-flames-copy.test.tsx`
- `src/test/cart-coupon.test.tsx`
- Este relatório e a referência acrescentada no relatório anterior.

## Testes executados

- Os testes de copiar cupom e desconto após mudança do carrinho reproduziram os erros no código anterior e passaram após as correções.
- A suíte completa passou: 45 testes em 10 arquivos.
- Cobertura nova: cópia pendente, cópia negada, nova tentativa, API indisponível, mudança de quantidade, revalidação, resposta atrasada, falha de rede, remoção do cupom, descontos percentuais/fixos, limite do desconto ao total, valor mínimo, datas de início/fim e limite de usos.
- TypeScript: aprovado.
- Build: aprovado, sem publicação.
- Lint dos dois novos arquivos de teste: aprovado.
- Comparação de lint nos dois arquivos de aplicação, com a regra de formatação desativada somente na verificação comparativa: nenhum novo apontamento. As pendências anteriores do lint geral permanecem. A configuração do lint não foi alterada.
- As interações foram executadas em DOM simulado, com respostas fictícias do Supabase e da área de transferência. Isso não comprova gravação real, aparência ou comportamento em dispositivos.

## Verificações reais, sem alteração de dados

### Páginas públicas

Foram feitas requisições HTTP de leitura à loja publicada:

| Página | Resultado |
| --- | --- |
| Abertura | HTTP 200 |
| Início | HTTP 200 |
| Entrada da conta | HTTP 200 |
| Privacidade | HTTP 200 |
| Suporte | HTTP 404 |
| Segurança | HTTP 404 |
| Termos | HTTP 404 |

Isso confirma uma falha de acesso nas três páginas de ajuda da versão publicada. A correção do mapa de rotas já integra a proposta de revisão anterior. Não houve publicação para aplicar essa correção à loja real.

HTTP 200 significa que o servidor respondeu com uma página; não comprova que os botões ou o JavaScript funcionem. As mesmas requisições à prévia do Lovable retornaram HTTP 401: o acesso exige autenticação. Não foi tentado contornar essa proteção.

### Banco e permissões

A conexão com o Supabase foi confirmada. Foram consultados apenas metadados de tabelas e políticas; nenhum cadastro, pedido, mensagem, token ou conteúdo pessoal foi consultado para esta verificação. Todas as tabelas públicas inventariadas estão com proteção por linha habilitada. Isso, isoladamente, não comprova que cada política corresponda ao comportamento esperado.

Foram encontrados dois pontos que exigem revisão específica antes de considerar os fluxos validados:

- **Pirâmide olfativa:** o componente ainda não carrega as notas. A configuração atual de leitura desses dados está restrita à administração. Completar somente a consulta na tela não resolveria a apresentação aos clientes. É necessário definir quais informações podem ser apresentadas e aprovar qualquer mudança de permissões.
- **Privacidade da Biblioteca:** é necessário alinhar a proteção dos dados à preferência de visibilidade mostrada no aplicativo. A política não foi modificada. Essa revisão não deve ser tratada como uma simples alteração visual.

As instruções permanentes da proprietária exigem aprovação antes de alterar políticas, autenticação ou permissões. Por isso, nenhuma migração ou mudança de segurança foi executada. Os detalhes técnicos não foram incluídos neste relatório público.

## Pendências e por que não foram concluídas

- **Visual e responsividade:** o ambiente desta execução não oferece acesso de navegador para os testes visuais. Não foram produzidas capturas novas nem executados cliques reais, testes de toque, teclado virtual ou conferência de contraste renderizado.
- **Prévia autenticada:** as requisições de leitura foram recusadas por exigirem login. Falta acesso de teste autorizado à prévia que contenha as correções.
- **Persistência e fluxos completos:** não foi disponibilizado um ambiente separado com contas exclusivas de cliente e administradora. Foi perguntado à proprietária se esse ambiente já existe. Sem ele, criar pedidos, excluir mensagens ou editar cadastros para testar poderia atingir a loja real.
- **Segurança:** as duas questões de permissões acima precisam de uma proposta específica e aprovação antes de alteração.
- **Lint antigo:** resolver a formatação geral e todos os usos antigos de `any` exigiria uma alteração extensa, incompatível com a orientação de correções pontuais. Não foram alteradas regras para esconder esses apontamentos.
- **NFC, e-mails, uploads e checkout completo:** continuam dependendo dos acessos, integrações e dispositivos de teste adequados.

## GitHub, Lovable e publicação

A continuação é entregue na mesma branch separada e na mesma proposta de correções em rascunho da revisão inicial. Os commits separam a cópia do cupom, a atualização do desconto e a documentação.

As correções não foram integradas à branch principal nem sincronizadas com o editor Lovable. Não houve deploy ou publicação. A versão publicada permaneceu inalterada por esta tarefa.

A revisão completa permanece **parcialmente validada**, sem alegação de que todos os botões, modos de cor ou fluxos reais foram testados.
