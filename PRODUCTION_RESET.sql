-- ========================================================
-- PRODUCTION DATABASE RESET SCRIPT
-- ========================================================
-- This script clears all operational data to prepare for production.
-- Use with extreme caution as this action is irreversible.

-- 1. Disable triggers to allow mass deletion without foreign key constraint issues in some contexts
-- Note: 'replica' mode disables all triggers and constraints for the session.
SET session_replication_role = 'replica';

-- 2. Clear Operational Data (Truncate is faster and cleaner)
TRUNCATE public.service_orders CASCADE;
TRUNCATE public.customers CASCADE;
TRUNCATE public.chat_messages CASCADE;
TRUNCATE public.company_payments CASCADE;
TRUNCATE public.notifications CASCADE;
TRUNCATE public.users CASCADE;
TRUNCATE public.companies CASCADE;

-- 3. Clear Auth Users 
-- This requires high privileges. If executing via Supabase Dashboard SQL Editor, 
-- ensure you have the necessary permissions.
DELETE FROM auth.users;

-- 4. Re-initialize Bootstrap Data
-- Insert the primary Developer company that allows the system to function initially.
INSERT INTO public.companies (
    id, 
    name, 
    trade_name, 
    corporate_name, 
    document, 
    email, 
    phone, 
    address, 
    city, 
    plan, 
    monthly_fee, 
    status, 
    settings
) VALUES (
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
);

-- 5. Restore replication role to default
SET session_replication_role = 'origin';

-- 6. Verification
SELECT count(*) as total_companies FROM public.companies;
SELECT count(*) as total_users FROM public.users;
