-- Reformulação participativa: predominam sensações, atmosferas e desejos de futuras experiências.
-- Não reescrever opções de enquetes que já receberam votos; arquivar e preservar o histórico.
UPDATE public.community_magic_polls SET active = false, updated_at = now()
WHERE id IN ('1689bb42-e466-4c84-872a-46d351b41c71', '1518a6cc-bc62-4f20-b780-806ef20b6960', '1b6c27bf-0d77-4a83-b39f-6b9304a0f23f', 'dda40270-918d-492e-9a2c-1dfd336a0a00', '646d0b84-37eb-4e27-aabc-d52b318e3639', 'd6f588d5-06e6-4ff0-8ac4-4597dbbad20e', 'dcfe35b1-af45-4826-a5bb-b6b82f29caa1', '3e6c02db-7d54-41fb-a9c5-3c97c0a58963', 'f9221130-1fe9-4450-86c8-bbba8e4b14b4', 'e4b3033a-0065-439e-a541-fbc1fc1adb4e');

INSERT INTO public.community_magic_polls(question,options,position,active)
SELECT fresh.question,fresh.options,fresh.position,fresh.active
FROM (VALUES
  ('Você está tomando chá na cabana do Hagrid. Qual sensação gostaria de guardar?',ARRAY['Acolhimento, como se estivesse entre amigos', 'Paz ao ouvir a chuva batendo nas janelas', 'Aventura por estar tão perto da floresta', 'Nostalgia de uma tarde simples e inesquecível']::text[],10,true),
  ('Qual detalhe faria você se sentir de verdade dentro da cabana do Hagrid?',ARRAY['O calor da lareira e a caneca entre as mãos', 'O ranger da madeira e o som da chuva', 'O cheirinho de bolo recém-assado e chá', 'O vento frio entrando pela porta']::text[],20,true),
  ('Qual dessas experiências você mais gostaria de viver através de uma vela?',ARRAY['Uma noite na Torre de Astronomia', 'Uma aula de Poções nas masmorras', 'Uma manhã nas estufas de Herbologia', 'Uma tarde em Hogsmeade no inverno']::text[],30,true),
  ('Em uma aula de Poções, que sensação não poderia faltar?',ARRAY['O mistério de misturar ingredientes secretos', 'O frio das pedras e o silêncio das masmorras', 'A alegria de acertar uma poção difícil', 'A tensão de ter que prestar atenção em tudo']::text[],40,true),
  ('Você entrou na estufa de Herbologia ao amanhecer. O que mais te encantaria?',ARRAY['O silêncio e a calma entre as plantas', 'A sensação de terra úmida nas mãos', 'O sol atravessando as folhas', 'A curiosidade de conhecer plantas mágicas']::text[],50,true),
  ('Observando as estrelas na Torre de Astronomia, o que você gostaria de sentir?',ARRAY['Paz, como se o tempo parasse', 'Encantamento de uma noite especial', 'Saudade de um momento que não volta', 'Liberdade de estar acima de tudo']::text[],60,true),
  ('Em um passeio por Hogsmeade coberta de neve, qual momento você escolheria?',ARRAY['Entrar em um lugar quentinho depois do frio', 'Dividir doces e risadas com amigos', 'Olhar as vitrines iluminadas com encantamento', 'Caminhar sem pressa pelas ruas tranquilas']::text[],70,true),
  ('Imagine encontrar Draco nos corredores: hortelã-pimenta e maçã verde passam qual impressão?',ARRAY['Frieza elegante e um pouco provocadora', 'Frescor inesperado e marcante', 'Leveza demais para a personalidade dele', 'Eu imaginaria outro aroma para essa cena']::text[],80,true),
  ('Hermione no Baile de Inverno: o que a flor de cerejeira faz você sentir nessa cena?',ARRAY['Delicadeza e romantismo', 'Confiança e uma elegância diferente', 'Surpresa ao conhecer outro lado dela', 'Eu imaginaria outra fragrância para esse momento']::text[],90,true),
  ('Qual dessas próximas histórias você mais gostaria de transformar em um portal?',ARRAY['Chá na cabana do Hagrid', 'O mistério de uma aula de Poções', 'O encanto de uma estufa de Herbologia', 'Uma noite na Torre de Astronomia']::text[],100,true)
) AS fresh(question,options,position,active)
WHERE NOT EXISTS (SELECT 1 FROM public.community_magic_polls p WHERE p.question = fresh.question);
