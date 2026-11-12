-- Pesquisa de criação colaborativa do Mundo da Magia.
-- Manter enquetes anteriores e respostas históricas; apenas arquivar as três iniciais.
UPDATE public.community_magic_polls
SET active = false
WHERE question IN ('Como você imagina o aroma de um jovem bruxo aventureiro?',
 'Como seria uma tarde na cabana do guardião da floresta?',
 'Qual fragrância combina com os corredores de um castelo mágico?');

INSERT INTO public.community_magic_polls (question,options,position,active)
SELECT seed.question,seed.options,seed.position,seed.active
FROM (VALUES
 ('Como você imagina uma tarde tomando chá na cabana do Hagrid?', ARRAY['Terra úmida, pinheiros e lenha','Chá preto, biscoitos e mel','Chocolate quente, canela e madeira','Couro, fumaça e café'], 10, true),
 ('Que aroma teria a sala comunal da Casa do Leão ao anoitecer?', ARRAY['Madeira, âmbar e lareira','Couro e canela','Cedro e chá quente','Baunilha e livros antigos'], 20, true),
 ('Qual fragrância combina com uma manhã na biblioteca do castelo?', ARRAY['Papel antigo, madeira e chá','Tinta, couro e café','Lavanda e pergaminho','Chuva, pedra e musgo'], 30, true),
 ('Qual seria o cheiro das estufas de Herbologia?', ARRAY['Folhas verdes e terra úmida','Flores brancas e alecrim','Hortelã e ervas frescas','Musgo, limão e bambu'], 40, true),
 ('Como você imagina o aroma de uma loja de doces em Hogsmeade?', ARRAY['Chocolate e caramelo','Frutas vermelhas e algodão-doce','Biscoitos amanteigados e baunilha','Mel, maçã e canela'], 50, true),
 ('Qual aroma você associaria a Draco Malfoy?', ARRAY['Champagne e madeiras claras','Cedro, couro e âmbar','Chá branco e musk','Hortelã, bergamota e pinho'], 60, true),
 ('Qual fragrância parece combinar com Hermione Granger?', ARRAY['Pergaminho, jasmim e chá','Lavanda, baunilha e livros','Chá preto, bergamota e cedro','Florais delicados e musk'], 70, true),
 ('Como seria o cheiro de um passeio pela Floresta Proibida?', ARRAY['Pinho, terra e musgo','Névoa, eucalipto e cedro','Flores noturnas e âmbar','Folhas úmidas e alecrim'], 80, true),
 ('Que perfume envolveria um baile no Grande Salão?', ARRAY['Rosas, âmbar e baunilha','Champagne e frutas vermelhas','Sândalo, jasmim e musk','Especiarias, baunilha e madeira'], 90, true),
 ('Qual personagem você gostaria de ver virar uma vela na próxima coleção?', ARRAY['Luna Lovegood','Sirius Black','Severus Snape','Ginny Weasley'], 100, true)
) AS seed(question,options,position,active)
WHERE NOT EXISTS (SELECT 1 FROM public.community_magic_polls p WHERE p.question=seed.question);
