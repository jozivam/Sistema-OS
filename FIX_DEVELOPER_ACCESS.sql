-- ========================================================
-- RLS REPAIR: ROBUST DEVELOPER CHECK
-- ========================================================

-- Atualizar a função is_developer para verificar a tabela pública
-- Isso garante que mesmo que o JWT não tenha o role (metadata incompleto), 
-- o desenvolvedor original consiga acessar tudo.
CREATE OR REPLACE FUNCTION public.is_developer() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Desenvolvedor'
  ) OR (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'Desenvolvedor'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Re-aplicar políticas de God Mode para garantir consistência
DROP POLICY IF EXISTS "Developer God Mode - Full Access Users" ON public.users;
CREATE POLICY "Developer God Mode - Full Access Users" ON public.users 
FOR ALL USING (public.is_developer());

DROP POLICY IF EXISTS "Developer God Mode - Full Access Companies" ON public.companies;
CREATE POLICY "Developer God Mode - Full Access Companies" ON public.companies 
FOR ALL USING (public.is_developer());

-- CORREÇÃO: Sincronização de Senha
-- Atualiza o gatilho para capturar a senha do metadata
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
    new.raw_user_meta_data ->> 'password', false
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password = COALESCE(EXCLUDED.password, public.users.password);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Segurança e Sincronização de Senha atualizadas.' as status;
