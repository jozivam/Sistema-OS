-- ========================================================
-- DATABASE REPAIR: CASCADING DELETES FOR COMPANIES (ROBUST VERSION)
-- ========================================================

-- 1. Garantir que as tabelas necessárias existam (Caso o usuário tenha pulado algum script de reconstrução)
CREATE TABLE IF NOT EXISTS public.company_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_reference TEXT NOT NULL,
    expires_at_after TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ajustar a tabela public.users para deletar em cascata
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. Garantir cascade em todas as tabelas operacionais
-- Função auxiliar para adicionar cascade de forma segura
DO $$ 
DECLARE 
    t TEXT;
    c TEXT;
BEGIN
    -- Lista de tabelas que precisam de cascade no company_id
    FOR t, c IN 
        VALUES 
            ('customers', 'customers_company_id_fkey'),
            ('service_orders', 'service_orders_company_id_fkey'),
            ('company_payments', 'company_payments_company_id_fkey'),
            ('chat_messages', 'chat_messages_company_id_fkey'),
            ('notifications', 'notifications_company_id_fkey')
    LOOP
        -- Remove o constraint se existir
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, c);
        -- Adiciona novamente com ON DELETE CASCADE
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE', t, c);
    END LOOP;
END $$;

SELECT 'Banco de dados REPARADO com sucesso. Agora a exclusão de empresas funcionará sem erros.' as status;
