# Opção "Administrativo" na área de perfil

## Como está hoje (verificado em `src/components/SiteLayout.tsx`)
- Esquerda (linhas 46-67): ícone de perfil + "Minha conta", leva direto para `/biblioteca` (sem login, ele redireciona para `/auth`).
- Direita (linhas 80-111): ícone de engrenagem "Configurações" e, ao lado, o círculo com a fênix "Acesso administrativo" (`/auth?redirect=/admin`). Esse par fênix + engrenagem é o atalho que está feio.
- O fluxo já funciona: `/auth` lê `redirect` e, após login, vai para `/admin`; `/admin` verifica permissão e manda para login se necessário (`src/routes/admin.tsx` linha 48). Nada disso precisa mudar.

## Alteração visual mínima proposta
1. Remover do cabeçalho o círculo da fênix (linhas 103-111).
2. Transformar "Minha conta" num pequeno menu que abre ao tocar no ícone de perfil, com:
   - Minha conta (biblioteca) - como hoje
   - Configurações
   - Linha fina separadora
   - Fênix pequena + "Administrativo", que leva ao login e depois ao painel
3. Engrenagem de Configurações: proposta é movê-la para dentro desse menu, deixando o topo mais limpo. Se preferir manter a engrenagem visível no topo, só a fênix sai.
4. Estilo: fundo creme/verde do tema, borda dourada fina, fonte do site; funciona por toque no celular e fecha ao tocar fora.

## Fora do escopo
Nenhuma mudança em login, painel, permissões, loja ou na tela de abertura.

## Detalhes técnicos
- Usar o `DropdownMenu` existente em `@/components/ui/dropdown-menu` com itens `Link` (`/biblioteca`, `/configuracoes`, `/auth` com `search={{ redirect: "/admin" }}`).
- Reutilizar `fenixImage` (já importado) no item Administrativo.
- Arquivo único alterado: `src/components/SiteLayout.tsx`.

## Estimativa (aproximada)
- Edição: cerca de 1 crédito.
- Validação (compilação + teste no navegador abrindo o menu e clicando em Administrativo até o login): cerca de 1 a 2 créditos.
- Total: cerca de 2 a 3 créditos.
