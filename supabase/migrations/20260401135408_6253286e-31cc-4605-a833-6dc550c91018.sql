
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE rupturas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE products; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE brands; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
