-- ========================================================
-- SECURITY OVERHAUL: SECURE MULTI-TENANCY WITH RLS (CORRIGIDO)
-- ========================================================

-- 1. FUNÇÃO PARA RECUPERAR O COMPANY_ID DO TOKEN JWT
-- Esta função será usada em todas as políticas de RLS.
-- Busca o ID tanto em app_metadata quanto user_metadata para máxima compatibilidade.
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

-- 2. FUNÇÃO E TRIGGER PARA SINCRONIZAR TABELA PÚBLICA DE USUÁRIOS
-- Mantém a tabela public.users atualizada com os novos usuários do Auth.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
  v_name text;
  v_role text;
BEGIN
  -- Extrair dados do metadata (definidos no SignUp.tsx ou Dashboard)
  v_company_id := COALESCE(
    (new.raw_user_meta_data ->> 'company_id')::uuid, 
    (new.raw_app_meta_data ->> 'company_id')::uuid
  );
  v_name := COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  v_role := COALESCE(new.raw_user_meta_data ->> 'role', 'Técnico');

  -- Inserir/Atualizar na tabela pública users (incluindo senha se disponível)
  INSERT INTO public.users (id, company_id, name, email, role, password, is_blocked)
  VALUES (
    new.id, 
    v_company_id, 
    v_name, 
    new.email, 
    v_role, 
    new.raw_user_meta_data ->> 'password', -- Sincronizar senha
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

-- Ajustar trigger existente ou criar novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. HABILITAR RLS EM TODAS AS TABELAS SENSÍVEIS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_payments ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO (NÃO-RECURSIVAS)

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Multi-tenant access" ON public.customers;
DROP POLICY IF EXISTS "Multi-tenant access" ON public.service_orders;
DROP POLICY IF EXISTS "Multi-tenant access" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view company members" ON public.users;
DROP POLICY IF EXISTS "Tenant isolation" ON public.customers;
DROP POLICY IF EXISTS "Tenant isolation" ON public.service_orders;
DROP POLICY IF EXISTS "Tenant isolation" ON public.chat_messages;
DROP POLICY IF EXISTS "Tenant isolation" ON public.company_payments;
DROP POLICY IF EXISTS "Developer God Mode - Users" ON public.users;
DROP POLICY IF EXISTS "Developer God Mode - Customers" ON public.customers;
DROP POLICY IF EXISTS "Developer God Mode - Orders" ON public.service_orders;
DROP POLICY IF EXISTS "Developer God Mode - Companies" ON public.companies;
DROP POLICY IF EXISTS "Admins view own company" ON public.companies;

-- Função auxiliar para checar se é desenvolvedor via JWT (evita recursão)
CREATE OR REPLACE FUNCTION public.is_developer() 
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'Desenvolvedor' 
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Desenvolvedor';
END;
$$ LANGUAGE plpgsql STABLE;

-- A) POLÍTICA PARA USUÁRIOS (Ver a si mesmo e outros da mesma empresa)
CREATE POLICY "Users can view company members" ON public.users
    FOR SELECT USING (
        company_id = public.get_my_company_id() 
        OR id = auth.uid() 
        OR public.is_developer()
    );

-- B) POLÍTICA MULTI-TENANT PARA DADOS OPERACIONAIS
CREATE POLICY "Tenant isolation" ON public.customers
    FOR ALL USING (company_id = public.get_my_company_id() OR public.is_developer());

CREATE POLICY "Tenant isolation" ON public.service_orders
    FOR ALL USING (company_id = public.get_my_company_id() OR public.is_developer());

CREATE POLICY "Tenant isolation" ON public.chat_messages
    FOR ALL USING (company_id = public.get_my_company_id() OR public.is_developer());

CREATE POLICY "Tenant isolation" ON public.company_payments
    FOR SELECT USING (company_id = public.get_my_company_id() OR public.is_developer());

-- C) POLÍTICAS PARA EMPRESAS (Administradores verem seus dados de faturamento)
CREATE POLICY "Admins view own company" ON public.companies
    FOR SELECT USING (id = public.get_my_company_id() OR public.is_developer());

-- D) PERMISSÕES TOTAIS PARA DESENVOLVEDOR (GOD MODE)
-- Como usamos public.is_developer() acima, as políticas ja cobrem Select.
-- Adicionamos uma política extra para Insert/Update/Delete geral se necessário.
CREATE POLICY "Developer God Mode - Full Access Users" ON public.users 
    FOR ALL USING (public.is_developer());

CREATE POLICY "Developer God Mode - Full Access Companies" ON public.companies 
    FOR ALL USING (public.is_developer());
