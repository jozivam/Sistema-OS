-- ========================================================
-- MASTER DATABASE SETUP - GESTÃO ONLINE (NEW PROJECT)
-- ========================================================
-- INSTRUÇÕES: 
-- 1. Crie um projeto NOVO no Supabase.
-- 2. Rode este script INTEGRALMENTE no SQL Editor.
-- ========================================================
-- 1. LIMPEZA TOTAL (OPCIONAL - USE SE QUISER APAGAR TUDO E RECOMEÇAR)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.service_orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 2. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS DO NÚCLEO (CORE)

-- Tabela de Empresas
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    corporate_name TEXT,
    trade_name TEXT,
    document TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    plan TEXT DEFAULT 'OURO',
    plan_period TEXT DEFAULT 'MENSAL',
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{
        "enableAI": true,
        "enableAttachments": true,
        "enableChat": true,
        "enableHistory": true,
        "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]
    }'::jsonb
);

-- Tabela de Usuários (Extensão do auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL, -- Desenvolvedor, Administrador, Técnico
    password TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE public.customers (
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

-- Tabela de Ordens de Serviço
CREATE TABLE public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    tech_id UUID REFERENCES public.users(id),
    type TEXT NOT NULL,
    description TEXT,
    daily_history TEXT,
    ai_report TEXT,
    status TEXT DEFAULT 'Aberta', -- Aberta, Em Andamento, Concluída, Cancelada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    posts JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb
);

-- Tabela de Mensagens de Chat
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id),
    sender_name TEXT,
    receiver_id UUID REFERENCES public.users(id),
    channel_id TEXT,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Notificações
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pagamentos das Empresas
CREATE TABLE IF NOT EXISTS public.company_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_reference TEXT NOT NULL,
    expires_at_after TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 3. BOOTSTRAP: EMPRESA "DEVELOPER"
-- Esta empresa é a âncora para o seu primeiro usuário.
INSERT INTO public.companies (
    id, name, trade_name, corporate_name, document, email, phone, address, city, plan, monthly_fee, status
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
    'ACTIVE'
);

-- 4. AUTOMAÇÃO DE SINCRONIZAÇÃO (AUTH -> PUBLIC)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'Desenvolvedor'),
    (COALESCE(NEW.raw_app_meta_data->>'company_id', NEW.raw_user_meta_data->>'company_id', '00000000-0000-0000-0000-000000000000'))::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. SEGURANÇA (ROW LEVEL SECURITY)

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
CREATE POLICY "Acesso ao próprio perfil" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Permitir inserção do próprio perfil" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Atualização do próprio perfil" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Políticas Multi-Tenant (Segregação por empresa)
CREATE POLICY "Clientes por empresa" ON public.customers FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Ordens por empresa" ON public.service_orders FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Mensagens por empresa" ON public.chat_messages FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Notificações por empresa" ON public.notifications FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- 6. STATUS FINAL
SELECT 'Banco de dados reconstrído com sucesso! Pronto para criar o primeiro usuário.' as status;
