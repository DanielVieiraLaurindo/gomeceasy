
CREATE TABLE public.ml_anuncios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL DEFAULT '',
  mlb TEXT DEFAULT '',
  foto_url TEXT DEFAULT '',
  suitable_for_sale INTEGER DEFAULT 0,
  not_suitable_for_sale INTEGER DEFAULT 0,
  on_the_way INTEGER DEFAULT 0,
  vendas_30_dias INTEGER DEFAULT 0,
  is_star_product BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ml_anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ml_anuncios"
  ON public.ml_anuncios FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ml_anuncios"
  ON public.ml_anuncios FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ml_anuncios"
  ON public.ml_anuncios FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ml_anuncios"
  ON public.ml_anuncios FOR DELETE
  TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_anuncios;
