-- Schedule temporary categories and subcategories.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starts_at date,
  ADD COLUMN IF NOT EXISTS ends_at date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_temporary_dates_check'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_temporary_dates_check
      CHECK (
        NOT is_temporary
        OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at >= starts_at)
      );
  END IF;
END $$;
