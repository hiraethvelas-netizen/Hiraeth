# Roadmap Hiraeth — Prompt Mestre

## Etapa 1 — Fundação (concluída)
- [x] Lovable Cloud ativado
- [x] Banco de dados: produtos, categorias, pedidos, perfis, roles, portais NFC, biblioteca, desejos, newsletter
- [x] Login/cadastro com e-mail e senha (+ recuperação de senha)
- [x] Catálogo público: listagem, busca, filtros, página de produto
- [x] Carrinho persistente + criação de pedido
- [x] Painel admin: dashboard, produtos, categorias, pedidos
- [x] Portais NFC: páginas públicas + painel com copiar link, duplicar, arquivar
- [x] Minha Biblioteca: coleção e desejos
- [x] Newsletter gravando no banco

## Etapa 2 — Financeiro (próxima)
- [ ] Integração Mercado Pago (credenciais via secrets, checkout real)
- [ ] Webhook de pagamento + conciliação
- [ ] Taxas, recebimentos e reembolsos reais

## Etapa 3 — Operação
- [ ] Frete (Correios), rastreamento
- [ ] Cupons e promoções
- [ ] Editor visual de seções da homepage
- [ ] Fragmentos dos portais pelo painel (hoje: estrutura pronta no banco)
- [ ] Biblioteca de mídia / upload de imagens
- [ ] Avaliações, histórico de alterações

## Bloqueios
- Domínio definitivo: ainda não adquirido (links NFC usam a URL atual; trocar após publicar no domínio)
- Credenciais Mercado Pago: usuária precisa fornecer via secrets
- Tornar a conta da administradora "admin": inserir role no banco após ela criar a conta
- Política de privacidade real: texto atual é provisório
