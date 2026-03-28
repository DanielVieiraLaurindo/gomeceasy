
ALTER TABLE chamados_ti 
ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'outros',
ADD COLUMN IF NOT EXISTS subcategoria text,
ADD COLUMN IF NOT EXISTS equipamento text,
ADD COLUMN IF NOT EXISTS atribuido_a uuid,
ADD COLUMN IF NOT EXISTS sla_horas integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS chamado_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES chamados_ti(id) ON DELETE CASCADE,
  usuario_id uuid,
  mensagem text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chamado_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chamado_comentarios"
ON chamado_comentarios FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS chamado_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES chamados_ti(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chamado_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chamado_anexos"
ON chamado_anexos FOR ALL TO authenticated
USING (true) WITH CHECK (true);
