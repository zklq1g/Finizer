-- ==========================================
-- 1. ADD RECEIPT COLUMNS
-- ==========================================
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE public.goods_receipts ADD COLUMN IF NOT EXISTS receipt_url text;

-- ==========================================
-- 2. CREATE PRIVATE STORAGE BUCKET FOR RECEIPTS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false) 
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 3. STORAGE RLS POLICIES
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow receipt uploads'
  ) THEN
    CREATE POLICY "Allow receipt uploads"
    ON storage.objects FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (bucket_id = 'receipts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow receipt reads'
  ) THEN
    CREATE POLICY "Allow receipt reads"
    ON storage.objects FOR SELECT
    TO public, anon, authenticated
    USING (bucket_id = 'receipts');
  END IF;
END $$;
