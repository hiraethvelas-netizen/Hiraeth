# Diagnóstico: prévia pedindo atualização e falhando

## Causa principal (confirmada pelos registros)
O arquivo `src/routes/produto.$slug.tsx` tem dois trechos com o texto literal `\n` (barra + n) no lugar de uma quebra de linha real:
- Linha 10: `type Product = Tables<"products">;\ntype AromaNote = {...}`
- Linha 31: `useState<string | null>(null);\n  const [aromaNotes, ...]`

Isso causa erros de leitura do código ("Invalid Unicode escape sequence", TS1127/TS1435). O construtor de rotas falha em seguida ("Crawling result not available"), a prévia não compila e fica pedindo atualização.

## O que NÃO é a causa
- **Commit 02c5f6c**: altera só `src/components/SiteLayout.tsx` (2 linhas). Não toca na página do produto.
- **Import de `src/assets/fenix.png`**: o arquivo existe (40 KB) e o import na linha 5 está correto.
- **Link com `search={{ redirect: "/admin" }}`** (SiteLayout linhas 103-105): válido, porque `src/routes/auth.tsx` (linhas 6-10) declara `validateSearch` com `redirect`.
- **Sincronização GitHub-Lovable**: o commit 02c5f6c já é o mais recente aqui, então o código chegou. Não consigo ver o status da conexão; os erros vêm do conteúdo do código.

## Pontos secundários (não bloqueiam agora)
- `src/routes/src/routes/admin.aparencia.tsx`: arquivo duplicado numa pasta aninhada por engano, que pode gerar uma rota estranha.
- `src/assets/hira app...mp4` (10,7 MB): grande demais para o Lovable editar e pesa no build.

## Correção proposta (após sua autorização)
1. Trocar os dois `\n` literais por quebras de linha reais em `produto.$slug.tsx` (linhas 10 e 31).
2. Conferir que o build fique limpo e abrir a página de um produto e a abertura para confirmar.
3. Opcional, só com sua confirmação: remover o arquivo duplicado em `src/routes/src/`.

## Estimativa de créditos (aproximada)
- Correção + validação do build: cerca de 1 a 2 créditos.
- Com teste visual no navegador: cerca de 2 a 3 créditos.
