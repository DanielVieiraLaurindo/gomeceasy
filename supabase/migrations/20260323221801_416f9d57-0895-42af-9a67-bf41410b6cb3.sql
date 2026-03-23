
-- case_items: items associated with a return case
CREATE TABLE IF NOT EXISTS public.case_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.return_cases(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL DEFAULT '',
  item_type TEXT NOT NULL DEFAULT 'DEVOLUCAO',
  item_condition TEXT,
  analysis_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage case_items" ON public.case_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- case_photos: photos for cases
CREATE TABLE IF NOT EXISTS public.case_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.return_cases(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'produto',
  file_size INTEGER,
  original_name TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage case_photos" ON public.case_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- case_history: history/audit trail for cases
CREATE TABLE IF NOT EXISTS public.case_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.return_cases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  comment TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage case_history" ON public.case_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- backoffice_actions: actions taken by backoffice on cases
CREATE TABLE IF NOT EXISTS public.backoffice_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.return_cases(id) ON DELETE CASCADE,
  marketplace TEXT,
  ticket_number TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL DEFAULT 'mediacao',
  result TEXT NOT NULL DEFAULT 'pendente',
  refund_value NUMERIC DEFAULT 0,
  loss_value NUMERIC DEFAULT 0,
  gain_value NUMERIC DEFAULT 0,
  comments TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.backoffice_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage backoffice_actions" ON public.backoffice_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- backoffice_documents: documents attached to backoffice actions
CREATE TABLE IF NOT EXISTS public.backoffice_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.backoffice_actions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_url TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.backoffice_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage backoffice_documents" ON public.backoffice_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add missing columns to return_cases that the Controle Devoluções project uses
ALTER TABLE public.return_cases 
  ADD COLUMN IF NOT EXISTS is_company BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analyst_name TEXT,
  ADD COLUMN IF NOT EXISTS item_condition TEXT,
  ADD COLUMN IF NOT EXISTS analysis_reason TEXT,
  ADD COLUMN IF NOT EXISTS nf_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nf_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_full BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_code TEXT,
  ADD COLUMN IF NOT EXISTS protocol_number TEXT,
  ADD COLUMN IF NOT EXISTS mediator_name TEXT,
  ADD COLUMN IF NOT EXISTS reimbursed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_account TEXT,
  ADD COLUMN IF NOT EXISTS fullfilment_tracking TEXT,
  ADD COLUMN IF NOT EXISTS client_document TEXT,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Create storage bucket for case photos if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('case-photos', 'case-photos', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Authenticated users can upload case photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'case-photos');
CREATE POLICY "Anyone can view case photos" ON storage.objects FOR SELECT USING (bucket_id = 'case-photos');
CREATE POLICY "Authenticated users can delete case photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'case-photos');
