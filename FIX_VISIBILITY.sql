-- 1. Garantir que a função get_my_company_id existe
CREATE OR REPLACE FUNCTION public.get_my_company_id() 
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid,
    (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Redefinir a função is_developer para ser robusta
-- O "SECURITY DEFINER" permite que a função consulte public.users mesmo com RLS ativo.
CREATE OR REPLACE FUNCTION public.is_developer() 
RETURNS boolean AS $$
BEGIN
  -- 1. Tenta buscar no Banco de Dados
  -- 2. Tenta buscar no JWT (App ou User metadata)
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Desenvolvedor'
  ) OR (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'Desenvolvedor'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Garantir acesso GOD MODE em todas as tabelas
-- Companies
DROP POLICY IF EXISTS "Admins view own company" ON public.companies;
CREATE POLICY "Admins view own company" ON public.companies
    FOR SELECT USING (id = public.get_my_company_id() OR public.is_developer());

DROP POLICY IF EXISTS "Developer God Mode - Full Access Companies" ON public.companies;
CREATE POLICY "Developer God Mode - Full Access Companies" ON public.companies 
    FOR ALL USING (public.is_developer());

-- Users
DROP POLICY IF EXISTS "Users can view company members" ON public.users;
CREATE POLICY "Users can view company members" ON public.users
    FOR SELECT USING (company_id = public.get_my_company_id() OR id = auth.uid() OR public.is_developer());

DROP POLICY IF EXISTS "Developer God Mode - Full Access Users" ON public.users;
CREATE POLICY "Developer God Mode - Full Access Users" ON public.users 
    FOR ALL USING (public.is_developer());

-- Customers
DROP POLICY IF EXISTS "Tenant isolation" ON public.customers;
CREATE POLICY "Tenant isolation" ON public.customers
    FOR ALL USING (company_id = public.get_my_company_id() OR public.is_developer());

-- Orders
DROP POLICY IF EXISTS "Tenant isolation" ON public.service_orders;
CREATE POLICY "Tenant isolation" ON public.service_orders
    FOR ALL USING (company_id = public.get_my_company_id() OR public.is_developer());

-- Payments
DROP POLICY IF EXISTS "Tenant isolation" ON public.company_payments;
CREATE POLICY "Tenant isolation" ON public.company_payments
    FOR ALL USING (company_id = public.get_my_company_id() OR public.is_developer());

-- 4. Limpar cache de esquema
NOTIFY pgrst, 'reload schema';

SELECT 'Visibilidade TOTAL de Desenvolvedor (God Mode) restaurada com sucesso!' as status;
