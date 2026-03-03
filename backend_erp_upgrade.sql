-- ==========================================
-- UPGRADE ERP TÉCNICO V4 - FASE 1
-- Estrutura Base (Obrigatória)
-- ==========================================

-- 1. TABELA DE VENDAS (PDV)
CREATE TABLE IF NOT EXISTS public.vendas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    cliente_id uuid REFERENCES public.customers(id),
    ordem_servico_id uuid, -- Referência solta para a OS associada
    subtotal numeric(10, 2) DEFAULT 0,
    desconto_total numeric(10, 2) DEFAULT 0,
    total numeric(10, 2) DEFAULT 0,
    status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'confirmada', 'cancelada')),
    user_id uuid, -- Quem fez a venda
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE ITENS DA VENDA
CREATE TABLE IF NOT EXISTS public.venda_itens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    venda_id uuid REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id uuid,
    descricao_personalizada text,
    quantidade numeric(10, 3) NOT NULL,
    preco_unitario numeric(10, 2) NOT NULL,
    desconto numeric(10, 2) DEFAULT 0,
    total numeric(10, 2) NOT NULL
);

-- 3. TABELA CONTAS A RECEBER (Fase 2 adiantada p/ Financeiro)
CREATE TABLE IF NOT EXISTS public.contas_receber (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    venda_id uuid REFERENCES public.vendas(id),
    valor numeric(10, 2) NOT NULL,
    vencimento date NOT NULL,
    status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'parcial')),
    forma_pagamento text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. HISTÓRICO STATUS OS
CREATE TABLE IF NOT EXISTS public.historico_status_os (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ordem_servico_id uuid NOT NULL,
    status_anterior text,
    status_novo text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. AUDITORIA (LOGS ROBUSTOS)
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    user_id uuid,
    entidade text NOT NULL,
    entidade_id uuid NOT NULL,
    acao text NOT NULL CHECK (acao IN ('create', 'update', 'delete')),
    dados_anteriores jsonb,
    dados_novos jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ATUALIZAÇÃO NAS TABELAS EXISTENTES
-- (Soft Delete e Campos Logísticos/Financeiros)
-- ==========================================

-- PRODUTOS & MATERIAIS
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS codigo_barras text,
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'produto' CHECK (tipo IN ('produto', 'servico', 'mao_obra')),
ADD COLUMN IF NOT EXISTS categoria text,
ADD COLUMN IF NOT EXISTS unidade_medida text DEFAULT 'UN',
ADD COLUMN IF NOT EXISTS controla_estoque boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS permite_estoque_negativo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custo_medio numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_custo numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_sugerido numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estoque_minimo numeric(10, 3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true; -- Soft Delete

-- CLIENTES
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true; -- Soft Delete

-- EMPRESAS
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true, -- Soft Delete
ADD COLUMN IF NOT EXISTS limite_usuarios integer DEFAULT 5;

-- USUÁRIOS
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true; -- Soft Delete

-- ORDENS DE SERVIÇO
ALTER TABLE public.service_orders
ADD COLUMN IF NOT EXISTS prazo timestamp with time zone,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true; -- Soft Delete

-- MOVIMENTAÇÕES DE ESTOQUE
ALTER TABLE public.movimentacoes_estoque
ADD COLUMN IF NOT EXISTS rerefencia_tipo text CHECK (rerefencia_tipo IN ('venda', 'ajuste', 'manual', 'entrada_os', 'saida_os', 'compra_externa')),
ADD COLUMN IF NOT EXISTS rerefencia_id uuid;

-- DEPÓSITOS DE ESTOQUE
ALTER TABLE public.depositos
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'central' CHECK (tipo IN ('central', 'tecnico')),
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- ==========================================
-- ÍNDICES PARA ALTA PERFORMANCE (ESCALABILIDADE)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_vendas_company ON public.vendas(company_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON public.vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_os ON public.vendas(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_company ON public.auditoria_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON public.auditoria_logs(entidade, entidade_id);

-- HABILITAR RLS NAS NOVAS TABELAS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_status_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS BASES (Apenas mesma empresa)
CREATE POLICY "vendas_isolation" ON public.vendas
    FOR ALL USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "auditoria_isolation" ON public.auditoria_logs
    FOR ALL USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));
