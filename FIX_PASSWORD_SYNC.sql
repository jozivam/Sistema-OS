-- ========================================================
-- REPARO RETROATIVO: SINCRONIZAÇÃO DE SENHAS
-- ========================================================

-- 1. Garantir que a coluna de senha existe na tabela pública
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='password') THEN
        ALTER TABLE public.users ADD COLUMN password TEXT;
    END IF;
END $$;

-- 2. SINCRONIZAÇÃO RETROATIVA
-- Busca a senha salva no metadata do Supabase Auth e traz para a tabela pública
-- Isso corrigirá o usuário "PAMONHA" e qualquer outro que esteja com "NÃO REGISTRADA"
UPDATE public.users u
SET password = (m.raw_user_meta_data ->> 'password')
FROM auth.users m
WHERE u.id = m.id 
  AND (u.password IS NULL OR u.password = '')
  AND (m.raw_user_meta_data ->> 'password') IS NOT NULL;

-- 3. ATUALIZAR O TRIGGER DE SINCRONIZAÇÃO (Garantia para o futuro)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
  v_name text;
  v_role text;
BEGIN
  v_company_id := COALESCE(
    (new.raw_user_meta_data ->> 'company_id')::uuid, 
    (new.raw_app_meta_data ->> 'company_id')::uuid
  );
  v_name := COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  v_role := COALESCE(new.raw_user_meta_data ->> 'role', 'Técnico');

  INSERT INTO public.users (id, company_id, name, email, role, password, is_blocked)
  VALUES (
    new.id, v_company_id, v_name, new.email, v_role, 
    COALESCE(new.raw_user_meta_data ->> 'password', ''), -- Captura a senha do metadata
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password = COALESCE(EXCLUDED.password, public.users.password);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Sincronização de senhas concluída e trigger atualizado!' as status;
