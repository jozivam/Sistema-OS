-- ============================================================
-- SCRIPT DE RECONCILIAÇÃO DE SCHEMA (Português -> Inglês)
-- Alinha o banco com o código sem apagar dados existentes.
-- ============================================================

-- 1. RENOMEAR TABELAS (Se existirem em português)
ALTER TABLE IF EXISTS public."Usuários" RENAME TO users;
ALTER TABLE IF EXISTS public."clientes" RENAME TO customers;
ALTER TABLE IF EXISTS public."ordens_de_serviço" RENAME TO service_orders;
ALTER TABLE IF EXISTS public."empresas" RENAME TO companies;
ALTER TABLE IF EXISTS public."mensagens_de_chat" RENAME TO chat_messages;
ALTER TABLE IF EXISTS public."pagamentos_da_empresa" RENAME TO company_payments;

-- 2. RENOMEAR COLUNAS: TABELA users
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND (column_name='id_da_empresa' OR column_name='id_empresa')) THEN
        ALTER TABLE public.users RENAME COLUMN id_da_empresa TO company_id;
    EXCEPTION WHEN OTHERS THEN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_empresa') THEN
            ALTER TABLE public.users RENAME COLUMN id_empresa TO company_id;
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='nome') THEN
        ALTER TABLE public.users RENAME COLUMN nome TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='telefone') THEN
        ALTER TABLE public.users RENAME COLUMN telefone TO phone;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cidade') THEN
        ALTER TABLE public.users RENAME COLUMN cidade TO city;
    END IF;
END $$;

-- 3. RENOMEAR COLUNAS: TABELA customers (clientes)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='id_da_empresa') THEN
        ALTER TABLE public.customers RENAME COLUMN id_da_empresa TO company_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='nome') THEN
        ALTER TABLE public.customers RENAME COLUMN nome TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='telefone') THEN
        ALTER TABLE public.customers RENAME COLUMN telefone TO phone;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='cidade') THEN
        ALTER TABLE public.customers RENAME COLUMN cidade TO city;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='endereco') THEN
        ALTER TABLE public.customers RENAME COLUMN endereco TO address;
    END IF;
END $$;

-- 4. RENOMEAR COLUNAS: TABELA service_orders
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_orders' AND column_name='id_da_empresa') THEN
        ALTER TABLE public.service_orders RENAME COLUMN id_da_empresa TO company_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_orders' AND column_name='id_do_cliente') THEN
        ALTER TABLE public.service_orders RENAME COLUMN id_do_cliente TO customer_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_orders' AND column_name='id_do_tecnico') THEN
        ALTER TABLE public.service_orders RENAME COLUMN id_do_tecnico TO tech_id;
    END IF;
END $$;

-- 5. ATUALIZAR POLÍTICAS RLS (Garanta que continuem funcionando)
-- Desativa temporariamente para garantir acesso do desenvolvedor se necessário
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders DISABLE ROW LEVEL SECURITY;

-- 6. VERIFICAÇÃO FINAL
SELECT count(*) as total_clientes FROM public.customers;
