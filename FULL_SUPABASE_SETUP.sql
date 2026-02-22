
-- ==========================================
-- AVISO: Este script irá RECOMEÇAR o banco de dados.
-- Todos os dados nas tabelas abaixo serão apagados.
-- ==========================================

-- 1. REMOVER TRIGGERS E FUNÇÕES ANTIGAS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. REMOVER TABELAS EXISTENTES (Limpeza)
DROP TABLE IF EXISTS public.company_payments CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.service_orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 3. CRIAÇÃO DAS TABELAS COM TIPOS CORRETOS (UUID)

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
    plan TEXT DEFAULT 'MENSAL',
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
    password TEXT, -- Senha em texto para este fluxo simplificado
    role TEXT NOT NULL,
    city TEXT,
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
    status TEXT DEFAULT 'Aberta',
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

-- Tabela de Pagamentos das Empresas
CREATE TABLE public.company_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_reference TEXT NOT NULL,
    expires_at_after TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 4. AUTOMAÇÃO: Sincronizar auth.users com public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, is_blocked)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email, 
    'Técnico', 
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. SEGURANÇA (RLS) E POLÍTICAS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Multi-tenant access customers" ON public.customers FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Multi-tenant access orders" ON public.service_orders FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Multi-tenant access messages" ON public.chat_messages FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- 6. DADOS INICIAIS (DEMO)
INSERT INTO public.companies (id, name, trade_name, corporate_name, document, email, phone, address, city, plan, monthly_fee, status, settings)
VALUES 
('00000000-0000-0000-0000-000000000000', 'Gestão Online Developer', 'Gestão Online', 'Gestão Online Soluções em Software LTDA', '00.000.000/0001-00', 'contato@gestao.online', '(00) 0000-0000', 'Av. Developer, 1000', 'Silicon Valley', 'LIVRE', 0, 'ACTIVE', '{"enableAI": true, "enableAttachments": true, "enableChat": true, "enableHistory": true, "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]}'::jsonb),
('11111111-1111-1111-1111-111111111111', 'Tech Solutions', 'Tech Solutions', 'Tech Solutions Hardware e Servicos LTDA', '12.345.678/0001-90', 'admin@techsolutions.com', '(11) 98888-7777', 'Rua das Tecnologias, 45', 'São Paulo/SP', 'TRIMESTRAL', 59.90, 'ACTIVE', '{"enableAI": true, "enableAttachments": true, "enableChat": true, "enableHistory": true, "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;
