# Revisão do portal mágico e correções pontuais — 10 de novembro de 2026

**Status: código validado por testes e interface conferida localmente. A revisão integral da loja permanece parcialmente validada, pois não foram testados todos os fluxos autenticados nem a leitura física de NFC.**

## Problemas encontrados e correções realizadas

1. **Mais magia:** o botão chamava um voo da Fênix. Conforme solicitado, agora alterna somente as luzes coloridas, com pulsação suave. A abertura principal da loja e o Tarô da Fênix foram preservados.
2. **Aparência do portal:** árvores, presentes e bolas natalinas deram lugar a estrelas, velas suspensas e astrolábios. O portal mantém sua estrutura e fotografias cadastradas, com tons noturnos, dourado e títulos cursivos na fonte já existente. Textos natalinos fixos foram substituídos por referências ao universo mágico; conteúdos cadastrados não foram reescritos.
3. **Contraste:** no modo claro, o rodapé do portal usava cores escuras sobre seu fundo noturno. Os textos e ícones agora respeitam a paleta do próprio portal, sem alterar o rodapé nas demais páginas.
4. **Carregamento NFC:** erros na consulta das inspirações eram confundidos com ausência de conteúdo; uma requisição rejeitada podia deixar a página carregando. Agora há mensagem de erro e nova tentativa. Recarregar as inspirações não repete a abertura; respostas antigas são descartadas ao trocar de portal.
5. **Busca de essências:** ainda havia pesquisa, lista de escolhas e um seletor duplicado. Agora há uma única pesquisa com sugestões, seleção por clique ou teclado e busca sem distinção de acentos. Alterar o texto limpa a seleção anterior. Cadastro e atualização de estoque continuam disponíveis.
6. **Horários de promoções:** editar uma promoção ou a configuração do Tarô podia mudar o horário por interpretar UTC como hora local. O formulário agora apresenta a hora local corretamente e preserva o instante salvo.
7. **Acúmulo de descontos:** após autorização expressa da proprietária nesta tarefa, a soma ficou limitada aos produtos participantes. Duas ofertas de 60% para uma vela de R$100 passam a descontar no máximo R$100, sem abater produtos de fora. Ofertas de alcances diferentes continuam somando os benefícios possíveis; frete grátis e brinde continuam acumuláveis. Loja e cálculo de servidor usam a mesma distribuição em centavos.

Nenhum cadastro, pedido, estoque, mensagem, imagem cadastrada, endereço NFC ou regra de segurança foi alterado no banco. Não foram aplicadas migrações nesta tarefa.

## Testes executados

| Verificação | Resultado e limite |
| --- | --- |
| Suíte completa | 270 testes aprovados em 49 arquivos, executados no fuso de São Paulo |
| TypeScript | Aprovado |
| Build | Aprovado; não equivale a publicação |
| Funções de servidor | Verificação Deno aprovada para checkout, webhook e expedição |
| Lint geral | Não aprovado: já existiam milhares de apontamentos, principalmente de formatação, além de problemas de tipagem e avisos |
| Lint dos arquivos modificados | Executado. Arquivos novos passaram; arquivos antigos ainda têm pendências. Comparação antes/depois sem novos apontamentos nas regras funcionais. Há formatação pendente em trechos editados; nenhuma regra do lint foi alterada |
| Revisão independente | Sem regressões concretas nos trechos revisados; alocação de descontos também comparada com um cálculo independente |
| Navegador local | Chromium, computador de 1440 px e celulares simulados de 390 e 320 px; claro/escuro em 1440 e 390, claro em 320 |
| Portal visual | Conferidos títulos, luzes, botão Mais magia, galeria, âncora das inspirações, destinos dos links, contraste, movimento reduzido e ausência de corte horizontal |
| Vídeo | O arquivo real configurado para a abertura reproduziu naturalmente; o botão apareceu apenas no trecho final. Os dados do portal nesse teste foram simulados |
| Recuperação de erros | Falhas de portal e inspirações simuladas no navegador, com nova tentativa bem-sucedida |
| Essências no navegador | Dados e retornos fictícios: busca, teclado, clique, quantidade, cadastro, erro e atualização; claro no computador e escuro no celular simulado |
| Estabilidade de NFC | Teste de edição administrativa com banco simulado preservou slug e estado publicado ao mudar nome e vídeo |

Os testes de componentes e cálculo usam dados fictícios. Capturas visuais também apresentam textos e imagens de teste; não representam uma edição de conteúdo da loja real. Não foram realizados pagamentos ou gravações reais para comprovar persistência.

## Verificações de leitura no ambiente real

- Os commits recentes e a versão principal do repositório foram consultados antes da edição.
- A consulta de leitura pela integração do Lovable confirmou o portal publicado, o vídeo configurado e a ausência de URL de playlist. O arquivo de vídeo existe no repositório e é reproduzível localmente.
- A leitura de metadados confirmou que os campos de notas de essências, tipo de produto e vela acabada já existem no banco atual. Isso não comprova o funcionamento de todos os salvamentos.
- A consulta REST anônima direta foi bloqueada na borda da infraestrutura. O navegador deste ambiente também apresentou problema de certificado na conexão externa. Isso não demonstra, isoladamente, uma falha das permissões do aplicativo.
- Não foram usadas credenciais administrativas para contornar o acesso nem consultados dados de clientes.

## Testes e ativações pendentes

- Conferir a prévia autenticada com contas de teste de administradora e cliente: salvar, recarregar e confirmar persistência de essências e demais formulários. Não há uma sessão autenticada dessas contas disponível neste ambiente.
- Conferir o portal real por uma etiqueta NFC já gravada, em Android e iPhone físicos. Os endereços publicados foram preservados.
- Confirmar mídia, conteúdo e playlist reais na rede dos clientes. A playlist do portal atualmente não tem URL cadastrada; a interface mantém o aviso de preparação.
- Testar compras, pagamento, frete, cupons, brindes e limite de usos em ambiente apropriado, sem afetar pedidos ou estoques reais. Os testes automáticos não certificam todas as integrações de produção.
- **Ativar a correção do checkout no servidor:** o arquivo de cálculo da função foi corrigido e verificado, mas nenhuma função foi publicada nesta tarefa. Sincronização GitHub/Lovable não implanta essa função. Sessões de checkout já preparadas mantêm seu cálculo anterior; nenhum registro foi reescrito.
- Resolver o restante do lint requer revisão própria; não foi feita reformatação geral do projeto.

## Arquivos alterados

### Aplicação

- `src/components/PortalChristmasDecor.tsx`
- `src/components/admin/CandleEssenceEditor.tsx`
- `src/lib/local-datetime.ts`
- `src/lib/promotions.ts`
- `src/lib/store-pricing.ts`
- `src/routes/admin/promocoes.tsx`
- `src/routes/portal.$slug.tsx`
- `src/styles.css`
- `supabase/functions/_shared/commerce-pricing.ts`
- `supabase/functions/_shared/promotion-allocation.ts`

### Testes e documentação

- `src/components/admin/CandleEssenceEditor.test.tsx`
- `src/lib/local-datetime.test.ts`
- `src/test/admin-workflows.test.tsx`
- `src/test/candle-essence-search.test.tsx`
- `src/test/nfc-permanence.test.tsx`
- `src/test/nfc-world-of-magic.test.tsx`
- `src/test/portal-loading.test.tsx`
- `src/test/promotion-schedule.test.tsx`
- `src/test/promotion-scope-limits.test.ts`
- Este relatório.

## GitHub, Lovable e publicação

- Branch de trabalho: `fix/portal-magico-nfc`.
- Commits separados por correção para preservar o histórico e facilitar revisão.
- A integração e a sincronização serão registradas no relatório final da conversa após confirmação do GitHub e do Lovable; a presença deste arquivo não comprova essas etapas.
- Não foi acionada a IA do Lovable. Foram usadas somente consultas de leitura e operações do GitHub.
- Nenhuma publicação da loja ou função de servidor foi executada. A versão publicada permaneceu inalterada por esta tarefa.

**Status final da revisão integral: parcialmente validado.** Os ajustes de interface têm validação automatizada e visual local; acesso real, persistência, integrações e dispositivos físicos continuam com os limites descritos acima.
