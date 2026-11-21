-- Portal sazonal de Verão da Hiraeth.
-- Seed idempotente: não substitui um portal que a Guardiã já criou ou editou.
-- As quatro receitas e indicações são configuráveis no painel de Portais.
-- O acervo começa oculto; o vídeo de abertura será adicionado depois.
begin;

insert into public.portals (
  slug, name, universe, category, intro_title, intro_subtitle,
  intro_enabled, intro_duration_ms, intro_cta_text, intro_video_url,
  cover_url, store_category_url,
  spotify_playlist_url, spotify_title, spotify_description, spotify_visible,
  status, theme
)
select
  'verao',
  'Portal de Verão',
  'Coleção Sazonal de Verão',
  'verao',
  'Portal de Verão',
  'Sol, memórias e novas histórias.',
  true,
  3000,
  'Atravesse o Portal',
  null,
  null,
  null,
  null,
  'A trilha sonora do nosso verão',
  'Uma playlist para acompanhar dias de sol e histórias inesquecíveis.',
  true,
  'published',
  '{
    "palette": {
      "background": "#fff8ec",
      "surface": "#edf6ee",
      "text": "#153e50",
      "accent": "#087d98",
      "buttonText": "#fffaf0"
    },
    "carousel_items": [],
    "summer": {
      "show_catalog": false,
      "recipes": [
        {"title": "", "ingredients": "", "method": "", "image_url": "", "visible": false},
        {"title": "", "ingredients": "", "method": "", "image_url": "", "visible": false},
        {"title": "", "ingredients": "", "method": "", "image_url": "", "visible": false},
        {"title": "", "ingredients": "", "method": "", "image_url": "", "visible": false}
      ],
      "recommendations": [
        {"kind": "livro", "title": "", "description": "", "image_url": "", "url": "", "visible": false},
        {"kind": "serie", "title": "", "description": "", "image_url": "", "url": "", "visible": false},
        {"kind": "livro", "title": "", "description": "", "image_url": "", "url": "", "visible": false},
        {"kind": "serie", "title": "", "description": "", "image_url": "", "url": "", "visible": false}
      ]
    }
  }'::jsonb
where not exists (
  select 1 from public.portals where slug = 'verao'
)
on conflict (slug) do nothing;

commit;
