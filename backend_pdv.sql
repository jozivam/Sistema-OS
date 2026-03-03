-- Adicionar novas colunas na tabela customers para suporte ao PDV
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS document text,
ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'COMPLETO';

-- ==========================================
-- TABELA FORNECEDORES (Loja de peças, etc)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    name text NOT NULL,
    document text,
    phone text,
    email text,
    city text,
    status text DEFAULT 'ACTIVE',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas para Fornecedores (Somente leitura para tech, edição/inserção para admin)
CREATE POLICY "Usuários podem ver suppliers de sua empresa" 
    ON public.suppliers FOR SELECT 
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins podem inserir suppliers" 
    ON public.suppliers FOR INSERT 
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrador', 'Desenvolvedor'));

CREATE POLICY "Admins podem atualizar suppliers" 
    ON public.suppliers FOR UPDATE 
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrador', 'Desenvolvedor'));


-- ==========================================
-- TABELA DE TRANSAÇÕES FINANCEIRAS (Fluxo de Caixa)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    type text NOT NULL CHECK (type IN ('RECEITA', 'DESPESA')),
    category text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    description text NOT NULL,
    date timestamp with time zone NOT NULL,
    order_id uuid, -- não aplica foreign key complexa se usar trial mock
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    status text DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING', 'CANCELLED')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para Financeiro (Apenas administradores)
CREATE POLICY "Apenas admins podem ver do financeiro de sua empresa" 
    ON public.financial_transactions FOR SELECT 
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrador', 'Desenvolvedor'));

CREATE POLICY "Apenas admins podem criar lançamentos" 
    ON public.financial_transactions FOR INSERT 
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrador', 'Desenvolvedor'));

CREATE POLICY "Apenas admins podem atualizar lançamentos" 
    ON public.financial_transactions FOR UPDATE 
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrador', 'Desenvolvedor'));
