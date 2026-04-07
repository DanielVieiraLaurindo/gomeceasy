
ALTER TABLE public.return_cases ADD COLUMN IF NOT EXISTS sem_antecipacao boolean DEFAULT false;
ALTER TABLE public.return_cases ADD COLUMN IF NOT EXISTS itens_retorno text;
