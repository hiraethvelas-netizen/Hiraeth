-- Avaliações verificadas do Acervo Hiraeth: uma avaliação por pedido/cliente.
CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 3 AND 1200),
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, user_id)
);

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved Hiraeth reviews" ON public.customer_reviews;
CREATE POLICY "Public can read approved Hiraeth reviews"
  ON public.customer_reviews FOR SELECT USING (approved = true);

DROP POLICY IF EXISTS "Customers can read their own reviews" ON public.customer_reviews;
CREATE POLICY "Customers can read their own reviews"
  ON public.customer_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all Hiraeth reviews" ON public.customer_reviews;
CREATE POLICY "Admins can read all Hiraeth reviews"
  ON public.customer_reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can moderate Hiraeth reviews" ON public.customer_reviews;
CREATE POLICY "Admins can moderate Hiraeth reviews"
  ON public.customer_reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Customers can review their completed paid orders" ON public.customer_reviews;
CREATE POLICY "Customers can review their completed paid orders"
  ON public.customer_reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
        AND lower(coalesce(o.payment_status, '')) IN ('paid', 'approved', 'succeeded')
        AND lower(coalesce(o.status, '')) IN ('delivered', 'completed', 'concluido', 'concluído', 'entregue')
    )
  );
