-- ========================================================
-- DATABASE REPAIR: ADD MISSING COLUMNS FOR CHECKOUT
-- ========================================================

-- 1. Adicionar coluna plan_period se não existir em companies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='plan_period') THEN
        ALTER TABLE public.companies ADD COLUMN plan_period TEXT DEFAULT 'MENSAL';
    END IF;
END $$;

-- 2. Adicionar coluna password se não existir em users
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='password') THEN
        ALTER TABLE public.users ADD COLUMN password TEXT;
    END IF;
END $$;

-- 3. Garantir que a tabela de pagamentos existe
CREATE TABLE IF NOT EXISTS public.company_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_reference TEXT NOT NULL,
    expires_at_after TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 4. Atualizar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'Colunas plan_period e password adicionadas e tabela de pagamentos verificada!' as status;
