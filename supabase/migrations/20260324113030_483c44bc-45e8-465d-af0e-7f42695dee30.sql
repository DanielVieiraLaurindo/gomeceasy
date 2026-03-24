
INSERT INTO storage.buckets (id, name, public) VALUES ('requisicoes-prazo', 'requisicoes-prazo', true);

CREATE POLICY "Auth users manage requisicoes-prazo" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'requisicoes-prazo') WITH CHECK (bucket_id = 'requisicoes-prazo');
