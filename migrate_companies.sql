
-- ==========================================
-- 1. INSERIR EMPRESAS DE DEMONSTRAÇÃO
-- ==========================================

INSERT INTO public.companies (id, name, trade_name, corporate_name, document, email, phone, address, city, plan, monthly_fee, status, settings)
VALUES 
(
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
),
(
    '11111111-1111-1111-1111-111111111111', 
    'Tech Solutions', 
    'Tech Solutions', 
    'Tech Solutions Hardware e Servicos LTDA', 
    '12.345.678/0001-90', 
    'admin@techsolutions.com', 
    '(11) 98888-7777', 
    'Rua das Tecnologias, 45', 
    'São Paulo/SP', 
    'TRIMESTRAL', 
    59.90, 
    'ACTIVE', 
    '{"enableAI": true, "enableAttachments": true, "enableChat": true, "enableHistory": true, "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]}'::jsonb
),
(
    '22222222-2222-2222-2222-222222222222', 
    'Other Corp', 
    'Other Corp', 
    'Other Services and Consulting Corp', 
    '98.765.432/0001-10', 
    'office@othercorp.com', 
    '(21) 97777-6666', 
    'Av. das Americas, 500', 
    'Rio de Janeiro/RJ', 
    'MENSAL', 
    29.90, 
    'BLOCKED', 
    '{"enableAI": true, "enableAttachments": true, "enableChat": true, "enableHistory": true, "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]}'::jsonb
),
(
    '33333333-3333-3333-3333-333333333333', 
    'System Governance', 
    'System Governance', 
    'Governance Systems e Auditoria LTDA', 
    '00.000.000/0001-00', 
    'suporte@governance.com', 
    '(31) 96666-5555', 
    'Rua da Auditoria, 12', 
    'Belo Horizonte/MG', 
    'ANUAL', 
    99.90, 
    'BLOCKED', 
    '{"enableAI": true, "enableAttachments": true, "enableChat": true, "enableHistory": true, "orderTypes": ["Instalação", "Manutenção", "Orçamento", "Retirada", "Suporte"]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. CORREÇÃO DE POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================

-- Tabela de Usuários: Permitir que o sistema insira e atualize perfis
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Garantir acesso multi-tenant para outras tabelas
DROP POLICY IF EXISTS "Multi-tenant access" ON public.customers;
CREATE POLICY "Multi-tenant access" ON public.customers FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Multi-tenant access" ON public.service_orders;
CREATE POLICY "Multi-tenant access" ON public.service_orders FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
);
