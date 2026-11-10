# Inspirações — O Mundo de Magia

- Alterar exclusivamente a apresentação de “Conheça as inspirações” em `/portal/o-mundo-de-magia`, preservando abertura, navegação e todas as outras seções e páginas.
- Organizar os fragmentos em cinco capítulos: origem da coleção, Vela Seletora, quatro casas, Natal com duas velas e carta. Usar títulos normalizados e ordem dos registros; preservar conteúdos não classificados sem descartá-los.
- Nomear as casas somente Casa do Leão, Casa do Texugo, Casa da Serpente e Casa da Águia.
- Criar envelope com selo oliva, abertura/fechamento acessível, pergaminho e movimento reduzido. Não adicionar imagens.
- Não escrever textos narrativos no código nem alterar o banco: a carta e os relatos serão exibidos dos `portal_fragments` existentes. Se a carta não estiver preenchida, mostrar estado vazio, não inventar uma narrativa. Assinatura e slogan solicitados fazem parte da apresentação.
- A carta a ser preenchida pela proprietária seguirá os fatos fornecidos: 2021/pandemia, reencontro com filmes e livros de Harry Potter, aromas para compartilhar conforto, primeira vela de pimenta-rosa e desejo de fazer a pessoa se sentir em casa.

## Detalhes técnicos
- Componente isolado, ativado apenas pelo slug exato, com agrupamento testável e CSS restrito à seção.
- Sem migrações, alterações de dados, autenticação adicional ou publicação.
- Executar testes pertinentes e conferir o resultado da validação automática e a interação pública em computador/celular.