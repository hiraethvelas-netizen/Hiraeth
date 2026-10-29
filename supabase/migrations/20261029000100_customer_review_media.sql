-- Customer experience reviews: public display name and photo/video attachments.
ALTER TABLE public.customer_reviews
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT 'Cliente Hiraeth',
  ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.customer_reviews ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Public can submit Hiraeth experiences" ON public.customer_reviews;
CREATE POLICY "Public can submit Hiraeth experiences"
  ON public.customer_reviews FOR INSERT TO anon, authenticated
  WITH CHECK (
    order_id IS NULL
    AND user_id IS NOT DISTINCT FROM auth.uid()
    AND char_length(trim(display_name)) BETWEEN 2 AND 80
    AND char_length(trim(message)) BETWEEN 3 AND 1200
    AND rating BETWEEN 1 AND 5
    AND approved = false
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-media', 'review-media', true, 26214400,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime'];

DROP POLICY IF EXISTS "Public can upload Hiraeth review media" ON storage.objects;
CREATE POLICY "Public can upload Hiraeth review media"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'review-media' AND (storage.foldername(name))[1] = 'public');

DROP POLICY IF EXISTS "Public can view Hiraeth review media" ON storage.objects;
CREATE POLICY "Public can view Hiraeth review media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-media');
