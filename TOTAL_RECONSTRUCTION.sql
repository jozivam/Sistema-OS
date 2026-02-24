-- ========================================================
-- TOTAL SYSTEM RECONSTRUCTION - GESTÃO ONLINE
-- ========================================================
-- OBSERVAÇÃO: Este script reconstrói TODO o banco de dados.
-- Use após o comando "Reset Database" no Supabase.

-- 1. LIMPEZA INICIAL (PRECAUÇÃO)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;

-- 2. CRIAÇÃO DAS TABELAS (SCHEMA)

-- Empresas
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    corporate_name TEXT,
    trade_name TEXT,
    document TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    plan TEXT DEFAULT 'MENSAL',
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    settings JSON_B DEFAULT '{
        "enableAI": true,
        "enableAttachments": true,
        "enableChat": true,
        "enableHistory": true,
        "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]
    }'::jsonb
);

-- Usuários (Extensão do auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    address TEXT,
    number TEXT,
    sector TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    tech_id UUID REFERENCES public.users(id),
    type TEXT NOT NULL,
    description TEXT,
    daily_history TEXT,
    ai_report TEXT,
    status TEXT DEFAULT 'Aberta',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    posts JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb
);

-- Mensagens de Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id),
    sender_name TEXT,
    receiver_id UUID REFERENCES public.users(id),
    channel_id TEXT,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE IF NOT EXISTS public.company_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_reference TEXT NOT NULL,
    expires_at_after TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BOOTSTRAP (Empresa Desenvolvedor)
INSERT INTO public.companies (
    id, name, trade_name, corporate_name, document, email, phone, address, city, plan, monthly_fee, status, settings
) VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'Gestão Online Developer', 
    'Gestão Online', 
    'Gestão Online Soluções em Software LTDA', 
    '00.000.000/0001-00', 
    'contato@gestao.online', 
    '(00) 0000-0000', 
    'Av. Developer, 1000', 
    'Silicon Valley', 
    'LIVRE', 
    0, 
    'ACTIVE', 
    '{"enableAI": true, "enableAttachments": true, "enableChat": true, "enableHistory": true, "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 4. SEGURANÇA (RLS) E POLÍTICAS

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de Perfil
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Políticas Multi-tenant (Baseadas em company_id)
CREATE POLICY "Multi-tenant access customers" ON public.customers FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Multi-tenant access orders" ON public.service_orders FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Multi-tenant access messages" ON public.chat_messages FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Multi-tenant access notifications" ON public.notifications FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- 5. FUNÇÃO DE SINCRONIZAÇÃO (O "Robô" que cria o perfil)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_metadata->>'role', NEW.raw_user_meta_data->>'role', 'Desenvolvedor'),
    (COALESCE(NEW.raw_app_metadata->>'company_id', NEW.raw_user_meta_data->>'company_id', '00000000-0000-0000-0000-000000000000'))::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. SEGURANÇA NO SCHEMA AUTH (CORREÇÃO PARA O ERRO 500)
-- Create a permissive policy just in case RLS gets enabled on auth.users again
DROP POLICY IF EXISTS "permissive_policy" ON auth.users;
CREATE POLICY "permissive_policy" ON auth.users FOR ALL USING (true) WITH CHECK (true);

-- 7. VERIFICAÇÃO FINAL
SELECT 'Banco reconstruído com sucesso!' as status;
