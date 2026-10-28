-- Allow customer stories about historical purchases, including purchases not linked to an account order.
ALTER TABLE public.customer_reviews ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.customer_reviews ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "Customers can review their completed paid orders" ON public.customer_reviews;
DROP POLICY IF EXISTS "Authenticated customers can submit Hiraeth experiences" ON public.customer_reviews;
CREATE POLICY "Authenticated customers can submit Hiraeth experiences"
  ON public.customer_reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      order_id IS NULL OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.user_id = auth.uid()
      )
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-photos', 'review-photos', true, 8388608, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 8388608, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif'];

DROP POLICY IF EXISTS "Customers upload their review photos" ON storage.objects;
CREATE POLICY "Customers upload their review photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Public can view Hiraeth review photos" ON storage.objects;
CREATE POLICY "Public can view Hiraeth review photos"
ON storage.objects FOR SELECT USING (bucket_id = 'review-photos');
