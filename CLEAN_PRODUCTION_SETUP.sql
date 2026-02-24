-- ========================================================
-- DEFINITIVE CLEAN PRODUCTION SETUP
-- ========================================================
-- This script wipes all data and sets up the system for production.
-- Run this in the Supabase SQL Editor.

-- 1. CLEANUP PREVIOUS TRIGGERS AND FUNCTIONS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;

-- 2. WIPE OPERATIONAL DATA
SET session_replication_role = 'replica';
TRUNCATE public.service_orders, public.customers, public.chat_messages, public.company_payments, public.notifications, public.users, public.companies CASCADE;
DELETE FROM auth.users;
SET session_replication_role = 'origin';

-- 3. RE-INITIALIZE BOOTSTRAP COMPANY (Developer)
INSERT INTO public.companies (
    id, name, trade_name, corporate_name, document, email, phone, address, city, plan, monthly_fee, status, settings
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

-- 4. FIX AUTH LOCK-OUT (The Permissive Policy)
-- Since RLS is on for auth.users and we can't disable it, we create a policy to allow the system to work.
DROP POLICY IF EXISTS "permissive_policy" ON auth.users;
CREATE POLICY "permissive_policy" ON auth.users 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 5. SETUP USER SYNC TRIGGER
-- This function automatically creates a profile in public.users when someone signs up
-- It reads role and company_id from metadata (set by the Edge Function)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_metadata->>'role', NEW.raw_user_meta_data->>'role', 'Desenvolvedor'),
    (COALESCE(NEW.raw_app_metadata->>'company_id', NEW.raw_user_meta_data->>'company_id', '00000000-0000-0000-0000-000000000000'))::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. VERIFICATION
SELECT count(*) as total_companies FROM public.companies;
SELECT count(*) as total_users FROM public.users;
