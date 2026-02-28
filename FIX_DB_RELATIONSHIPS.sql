-- 1. Cria a Tabela de Preços dos Planos (Dynamic Pricing), que estava faltando
CREATE TABLE IF NOT EXISTS public.plan_pricing (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_type text NOT NULL,
    period text NOT NULL,
    base_price numeric NOT NULL DEFAULT 0,
    discount_pct numeric NOT NULL DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(plan_type, period)
);

-- Ativar RLS na tabela de preços
ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;

-- Liberar leitura para qualquer um no sistema (necessário para calcular vitrine)
CREATE POLICY "Leitura pública de precos"
    ON public.plan_pricing FOR SELECT
    TO public
    USING (true);

-- Permitir alterações apenas por Desenvolvedores ou Admins
CREATE POLICY "Admins e Devs podem alterar precos"
    ON public.plan_pricing FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'Administrador' OR users.role = 'ADMIN' OR users.role = 'Desenvolvedor' OR users.role = 'DEVELOPER')
        )
    );


-- 2. Consertar o relacionamento entre company_payments e companies
-- Primeiro, deletamos qualquer pagamento "órfão" que tenha ficado no banco após uma empresa ser deletada.
-- Se não fizermos isso, o PostgreSQL impede a criação da chave estrangeira.
DELETE FROM public.company_payments 
WHERE company_id NOT IN (SELECT id FROM public.companies);

-- Agora dizemos que "a coluna company_id dentro de company_payments referencia a coluna id da tabela companies"
-- ATENÇÃO: Se causar erro de que a constraint já existe, você pode pular esta etapa ou rodar ALTER TABLE DROP CONSTRAINT antes.
ALTER TABLE public.company_payments 
    ADD CONSTRAINT company_payments_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES public.companies (id) 
    ON DELETE CASCADE;
