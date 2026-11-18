# Hiraeth — operação de venda assistida para a live

> Procedimento provisório. A loja Hiraeth Oficial e seu banco permanecem na Lovable Cloud. **Não equivale à homologação do checkout automático.**

## Fluxo da cliente

1. Escolhe produtos e variações no acervo e adiciona à sacola.
2. Entra na conta e abre **Continuar / finalizar** na sacola.
3. Em **Seu pedido, com carinho**, confere os itens e preenche nome, e-mail, telefone, CEP, rua, número, complemento, bairro, cidade, UF, opção de presente e recado.
4. Seleciona apenas a **preferência de pagamento** (Pix, crédito por link seguro ou débito a combinar).
5. Marca consentimento para enviar os dados de entrega ao WhatsApp da Hiraeth.
6. Abre o WhatsApp, revisa e **envia** a mensagem. Sem o envio da mensagem, a Hiraeth não recebe a solicitação.
7. Aguarda resposta humana com disponibilidade, valor final, frete, prazo e instruções de pagamento.

**Limites:** não há reserva de estoque, criação de pedido no banco, cobrança ou etiqueta automática. O subtotal na tela é apenas referência e deve ser confirmado pela Hiraeth. O checkout automático permanece disponível no frontend somente para conta administradora durante a homologação.

## O que fazer ao receber a mensagem

- **Novo contato:** identifique a conversa no WhatsApp Business e confira os itens, casas, tamanhos, quantidade e embalagem. Não prometa a unidade até verificar estoque físico.
- **Conferência:** calcule preço final e descontos aprovados, depois consulte frete **manualmente no Melhor Envio** com peso e dimensões reais da embalagem. Para referência inicial, os pacotes individuais de 100 g e 250 g estão estimados em 300 g e 500 g, respectivamente — confirmar na balança.
- **Confirmação:** responda com itens, total de produtos, desconto, frete, valor final, previsão e política de troca/atendimento. Só então confirme a solicitação com a cliente.
- **Pix:** envie a chave ou QR Code de uma conta bancária da Hiraeth **após** confirmar o valor. Confirme crédito na conta; comprovante enviado em imagem não prova liquidação.
- **Crédito:** use link de pagamento seguro do provedor autorizado, quando estiver disponível e conforme as regras desse provedor. **Nunca peça número, validade, senha ou CVV no WhatsApp**.
- **Débito:** informe se seu provedor oferece modalidade apropriada; não prometa uma função que não foi habilitada.
- **Após recebimento:** registre manualmente a venda e baixa de estoque conforme seu controle atual. Prepare documentação fiscal com dados aprovados pela contabilidade, gere/compre a etiqueta no Melhor Envio e envie código de rastreio pelo WhatsApp.
- **Pós-venda:** mantenha os estados de atendimento organizados (recebido → aguardando pagamento → pago confirmado → preparando → postado). Esse fluxo manual **não aparecerá automaticamente em “Meus pedidos” ou “Pedidos” no app**.

## Privacidade e segurança

- Mensagem WhatsApp contém nome, e-mail, telefone e endereço somente após consentimento e envio explícito da cliente.
- O formulário não solicita CPF nesta etapa, nem dados de cartão. Colete dados adicionais estritamente necessários para documento fiscal por um canal adequado e de acordo com a orientação contábil.
- Não copie pedidos e endereços para locais públicos, logs, GitHub ou mensagens de diagnóstico.
- Não marque um pedido como pago ou enviado sem conferência do provedor ou do recebimento bancário.
- Não ative cobranças automáticas de produção, criação de pedidos, compra de etiquetas ou emissão fiscal pelo app ainda.

## Quando o backend for atualizado

- Reimplantar as funções existentes no **Lovable Cloud do projeto Hiraeth Oficial**, jamais no projeto Supabase legado de referência divergente.
- A função `commerce-checkout` possui a trava `HIRAETH_CUSTOMER_AUTOMATED_CHECKOUT_ENABLED`: ausência/valor diferente de `true` conserva pagamento automático reservado a administradoras, mesmo com outras integrações ativas. **A mudança no código não é eficaz até que a função seja realmente implantada.**
- Homologar Pix, cartão, frete, webhooks, fiscal e estoque em ambientes próprios e testar a jornada completa no celular antes de mudar para `true`.
- Não publicar novos preços ou migrar clientes sem aprovação da proprietária.

## Teste manual rápido para a live

Use uma conta **não administradora** em um navegador separado, sem concluir pagamentos:

1. Abra a loja, escolha uma vela 100 g e sua casa e adicione à sacola.
2. Confira se o link **finalizar/continuar** abre o formulário assistido e se endereço e e-mail aparecem corretamente para a conta.
3. Altere CEP/endereço, selecione Pix e presente. Sem consentimento não deve abrir WhatsApp.
4. Marque consentimento, abra o WhatsApp e **confira o rascunho**, inclusive produto, tamanho, endereço e preferência de pagamento. Não precisa enviar mensagem real para validar a formatação.
5. Verifique que nenhum pedido, pagamento ou alteração de estoque foi criado automaticamente.
6. Repita com uma variação grande e com cartão por link seguro. A conta administradora deve continuar vendo o checkout de homologação.

Esse fluxo é um canal temporário de solicitação, **não um checkout de pagamento publicado**.
