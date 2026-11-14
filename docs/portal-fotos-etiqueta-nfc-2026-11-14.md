# Fotos de Natal e ativação pela etiqueta NFC

## Problemas encontrados

O painel permitia trocar o arquivo das duas velas de Natal, mas não ajustar o zoom ou o enquadramento da foto já cadastrada. As proporções e áreas transparentes diferentes mudavam o tamanho aparente das velas. A prévia administrativa também podia ultrapassar seu espaço depois de salvar uma foto.

A etiqueta física abre o conteúdo do portal, mas a escolha do selo exige um código individual registrado. Uma consulta agregada somente de leitura confirmou que o portal publicado O Mundo da Magia ainda não tinha nenhum código individual emitido ou ativado. As rotinas de emissão, ativação e consulta existem. Não foram lidos tokens, hashes ou dados de clientes, nem emitido ou ativado um código real.

No caminho de uma etiqueta individual para o cadastro, o navegador também reproduziu uma falha de montagem da tela: o servidor não lia o código local, enquanto o primeiro desenho da página no navegador já o usava para incluir a escolha das casas.

## Correção realizada

- Cada vela de Natal ganhou a ação **Ajustar zoom e enquadramento**, que abre a foto atual em uma janela sobre o painel.
- A foto começa inteira; permite aproximar, arrastar, girar e restaurar o enquadramento. A transparência é preservada na exportação.
- O envio do arquivo original continua disponível, sem recorte obrigatório. Fotos, histórias, aromas, layout e textos existentes não foram substituídos automaticamente.
- Cancelar não grava; inclusive quando a geração do recorte termina depois do fechamento. O diálogo impede fechamento durante envio, evita gravações repetidas e mantém a foto anterior quando ocorre erro.
- Falhas aparecem na própria janela. Foco, rolagem e ações de teclado foram conferidos.
- O novo modo de enquadramento é opcional. Todos os demais usos do editor mantêm o comportamento anterior de preencher a moldura.
- A tela de cadastro agora começa com o mesmo conteúdo no servidor e no navegador, carregando o código local após a montagem. Login, cadastro, envio de dados, validação do NFC e permissões permanecem com as mesmas regras.

Os mecanismos de autenticação, regras de selo, permissões, políticas, estrutura do banco, endereço do portal e etiqueta física foram preservados. O problema de emissão do NFC exige uma etapa operacional pelo painel existente; mudar mensagens ou sincronizar este ajuste de fotos não cria os códigos individuais.

## Arquivos alterados

- `src/routes/admin/portal-inspiracoes.tsx`
- `src/components/admin/PortalPhotoCropDialog.tsx`
- `src/components/ImageCropEditor.tsx`
- `src/lib/image-crop.ts`
- `src/lib/image-crop.test.ts`
- `src/test/portal-christmas-photo-editor.test.tsx`
- `src/routes/auth.tsx`
- `src/test/auth-nfc-hydration.test.tsx`
- este relatório.

## Validação

A suíte completa final passou com **414 testes em 83 arquivos**. TypeScript e build passaram. Os arquivos de código finais foram comparados aos usados nessa validação e permaneceram idênticos. `git diff --check` passou. A rodada final foi executada em sequência após uma rodada simultânea apresentar lentidão e timeouts no ambiente.

O lint dos oito arquivos de código foi executado: os três arquivos novos passaram; arquivos antigos mantêm apontamentos de formatação e os mesmos três `any` anteriores da tela de autenticação. O lint completo não está limpo. Os testes de escrita usam dados fictícios e não comprovam persistência ou permissões reais no Supabase.

A regressão de montagem do cadastro reproduziu a falha antes da correção. Após o ajuste, passaram cinco cenários de montagem e cinco de redirecionamento. O teste também confirma que exibir a tela não ativa o código nem grava dados.

A matriz visual final das fotos passou nas larguras de 320, 390, 768 e 1440 pixels em claro e escuro. Zoom, arraste, rotação, restauração, foco, rolagem, fechamento e salvamento simulado foram conferidos. As duas prévias permanecem dentro do seu espaço antes e depois de salvar; não sobrepõem títulos ou ações. O menor contraste medido foi 5,08:1. Envio original, transparência, erros de envio/gravação, nova tentativa e erro de permissão de leitura da imagem também foram exercitados com arquivos fictícios. O resultado foi relido no portal e nas inspirações, com abertura e fechamento das histórias preservados.

A investigação do transporte NFC passou em cinco cenários locais: captura do código pela URL, ida ao cadastro, volta das inspirações, recarga e aviso sem código. A rodada final do navegador também aprovou quatro percursos completos, incluindo vídeo, captura do código, navegação, ativação fictícia, escolha de casa e chegada ao cadastro após a correção de montagem. Não houve erros inesperados de página ou console nem chamadas externas nas matrizes finais. O teste deliberado de CORS tem as mensagens esperadas desse bloqueio simulado. A ativação positiva foi simulada, sem etiqueta ou código reais. Não foi reproduzida perda do código no percurso normal na mesma origem e aba.

As duas fotos padrão foram abertas no Chromium e em canvas sem erro de decodificação. Têm resolução pequena (96 × 180 e 93 × 180); o zoom permite enquadrar, mas não recupera detalhes ausentes do arquivo original.

## Testes pendentes

- Uso do editor com conta administrativa real, gravação no armazenamento e releitura do Supabase real. Os testes locais simulam essas operações para preservar os dados existentes.
- Emissão e ativação de um código individual de teste e leitura da etiqueta física. Nenhum código real foi gerado ou consumido nesta tarefa.
- Aparelhos Android/iPhone físicos e Safari; as conferências locais usam Chromium com larguras e temas simulados.

## GitHub, Lovable e publicação

Branch separada: `fix/portal-fotos-tag-nfc`, baseada na principal conferida. Os ajustes de fotos e de montagem do cadastro são separados para revisão. Nenhuma integração na principal foi executada nesta tarefa.

Lovable: nenhuma mensagem foi enviada à IA e nenhuma sincronização destas alterações foi executada nesta tarefa.

Publicação: não foi executado deploy nem publicação. A versão publicada permaneceu inalterada por este trabalho.

Status: **parcialmente validado** — código, testes automatizados, TypeScript, build e navegador local aprovados; uso autenticado real, emissão individual, etiqueta física e integração ainda pendentes.

Evidências locais: [fotos e percurso NFC](/workspace/hiraeth-validation/portal-fotos-tag-2026-11-14/README.md), [investigação da etiqueta](/workspace/hiraeth-validation/nfc-etiqueta-2026-11-14/README.md) e consulta agregada `nfc-codes-readonly.json` no diretório das evidências. As capturas e roteiros usam arquivos e códigos fictícios; os ativos publicados não foram alterados.
