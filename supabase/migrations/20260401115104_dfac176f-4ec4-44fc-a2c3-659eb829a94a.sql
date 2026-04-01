
-- Add quantidade_pedida and quantidade_reservada to rupturas
ALTER TABLE public.rupturas ADD COLUMN IF NOT EXISTS quantidade_pedida integer DEFAULT 0;
ALTER TABLE public.rupturas ADD COLUMN IF NOT EXISTS quantidade_reservada integer DEFAULT 0;

-- Create storage bucket for pedidos-site files (NF and Etiqueta PDFs)
INSERT INTO storage.buckets (id, name, public) VALUES ('pedidos-site', 'pedidos-site', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/download from pedidos-site bucket
CREATE POLICY "Authenticated users can upload pedidos-site files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pedidos-site');
CREATE POLICY "Anyone can view pedidos-site files" ON storage.objects FOR SELECT USING (bucket_id = 'pedidos-site');
CREATE POLICY "Authenticated users can delete pedidos-site files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pedidos-site');
