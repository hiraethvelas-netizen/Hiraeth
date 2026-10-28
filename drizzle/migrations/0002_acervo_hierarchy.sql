-- Acervo Hiraeth: hierarquia editorial inicial.
-- Execute esta migration no Supabase depois de revisar os slugs existentes.
INSERT INTO public.categories (name, slug, description, position, visible, parent_id, is_temporary, starts_at, ends_at)
VALUES
  ('Livros', 'livros', 'Universos literários do Acervo Hiraeth', 1, true, NULL, false, NULL, NULL),
  ('Séries', 'series', 'Séries que moram na memória', 2, true, NULL, false, NULL, NULL),
  ('Filmes', 'filmes', 'Universos do cinema', 3, true, NULL, false, NULL, NULL),
  ('Músicas', 'musicas', 'Artistas, álbuns e eras musicais', 4, true, NULL, false, NULL, NULL)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  position = EXCLUDED.position,
  visible = true;

WITH desired(name, slug, parent_slug, position) AS (
  VALUES
    ('Harry Potter', 'harry-potter', 'livros', 1),
    ('Universo Sarah J. Maas', 'universo-sarah-j-maas', 'livros', 2),
    ('Friends', 'friends', 'series', 1),
    ('The Vampire Diaries', 'the-vampire-diaries', 'series', 2),
    ('Gilmore Girls', 'gilmore-girls', 'series', 3),
    ('Crepúsculo', 'crepusculo', 'filmes', 1),
    ('Taylor Swift', 'taylor-swift', 'musicas', 1)
)
INSERT INTO public.categories (name, slug, description, position, visible, parent_id, is_temporary, starts_at, ends_at)
SELECT desired.name, desired.slug, NULL, desired.position, true, parent.id, false, NULL, NULL
FROM desired
JOIN public.categories parent ON parent.slug = desired.parent_slug
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  position = EXCLUDED.position,
  visible = true;

-- Categorias temporárias continuam sem registros iniciais. O recurso permanece disponível
-- no painel administrativo para futuras edições especiais com data de início e término.
