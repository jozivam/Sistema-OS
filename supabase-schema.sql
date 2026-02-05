
-- Tabela de Empresas
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
    settings JSONB DEFAULT '{
        "enableAI": true,
        "enableAttachments": true,
        "enableChat": true,
        "enableHistory": true,
        "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]
    }'::jsonb
);

-- Tabela de Usuários (Extensão do auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL,
    city TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Clientes
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

-- Tabela de Ordens de Serviço
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

-- Tabela de Mensagens de Chat
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

-- Tabela de Pagamentos das Empresas
CREATE TABLE IF NOT EXISTS public.company_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_reference TEXT NOT NULL,
    expires_at_after TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (Exemplo básico: usuários só veem dados da sua empresa)
-- Nota: Para usuários DEVELOPER, pode ser necessária uma regra adicional.

-- Policy para public.users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Policy genérica para multi-tenancy baseada em company_id
-- Usuários autenticados só podem ver dados da sua própria company_id
CREATE POLICY "Multi-tenant access" ON public.customers
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Multi-tenant access" ON public.service_orders
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Multi-tenant access" ON public.chat_messages
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );
