
-- Enum for purchase request status
CREATE TYPE public.request_status AS ENUM (
  'solicitado',
  'autorizado',
  'em_cotacao',
  'aguardando_aprovacao',
  'aprovado',
  'reprovado',
  'pedido_efetuado',
  'a_caminho',
  'recebido',
  'concluido'
);

-- Manager mappings (solicitante -> gestor)
CREATE TABLE public.manager_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solicitante_id)
);

-- Purchase requests
CREATE TABLE public.purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  req_number TEXT NOT NULL DEFAULT '',
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gestor_id UUID REFERENCES auth.users(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  application TEXT,
  reference_models TEXT,
  delivery_deadline DATE,
  store TEXT,
  department TEXT,
  observations TEXT,
  current_status request_status NOT NULL DEFAULT 'solicitado',
  gestor_decision TEXT,
  assigned_buyer_id UUID REFERENCES auth.users(id),
  assigned_approver_id UUID REFERENCES auth.users(id),
  assigned_controller_id UUID REFERENCES auth.users(id),
  approver_decision TEXT,
  approver_observations TEXT,
  controller_decision TEXT,
  controller_observations TEXT,
  requires_controller_approval BOOLEAN NOT NULL DEFAULT false,
  selected_quotation_id UUID,
  order_number TEXT,
  invoice_number TEXT,
  supplier_delivery_estimate TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate req_number
CREATE OR REPLACE FUNCTION public.generate_req_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.req_number := 'UC-' || LPAD(nextval('purchase_requests_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS purchase_requests_seq START 1;

CREATE TRIGGER trg_generate_req_number
  BEFORE INSERT ON public.purchase_requests
  FOR EACH ROW
  WHEN (NEW.req_number = '' OR NEW.req_number IS NULL)
  EXECUTE FUNCTION public.generate_req_number();

-- Purchase request items
CREATE TABLE public.purchase_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  reference_models TEXT,
  destinado_a TEXT,
  gestor_approved BOOLEAN NOT NULL DEFAULT true,
  purchased BOOLEAN NOT NULL DEFAULT false,
  quotation_batch INTEGER,
  item_attachment_name TEXT,
  item_attachment_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotations
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  quotation_batch INTEGER NOT NULL DEFAULT 1,
  total_value NUMERIC,
  selected BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotation items
CREATE TABLE public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.purchase_request_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER,
  unit_price NUMERIC,
  total_price NUMERIC,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Request attachments
CREATE TABLE public.request_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Request status history
CREATE TABLE public.request_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  new_status request_status NOT NULL,
  old_status request_status,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  observation TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-track status changes
CREATE OR REPLACE FUNCTION public.track_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO public.request_status_history (request_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.current_status, NEW.current_status, auth.uid());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_track_request_status
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_request_status_change();

-- RLS
ALTER TABLE public.manager_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything (internal ERP)
CREATE POLICY "Authenticated users full access" ON public.manager_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.purchase_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.purchase_request_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.request_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.request_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'request-attachments');
CREATE POLICY "Authenticated users can read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'request-attachments');
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'request-attachments');
