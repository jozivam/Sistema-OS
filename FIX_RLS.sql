-- EXECUTAR ESTE SQL NO SQL EDITOR DO SUPABASE PARA CORRIGIR O PROBLEMA DE DADOS EM BRANCO
-- Por que isso é necessário? O sistema atual usa um login customizado que não gera uma sessão oficial no Supabase.
-- Com o RLS (Row Level Security) ligado, o Supabase bloqueia o acesso por segurança.
-- Desabilitando o RLS, o sistema volta a conseguir ler os dados.

ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_payments DISABLE ROW LEVEL SECURITY;

-- Nota: No futuro, para ter segurança máxima, o ideal é reativar o RLS 
-- e migrar o sistema para usar Supabase Auth oficial.
