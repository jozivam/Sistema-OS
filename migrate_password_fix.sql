-- Execute este comando no SQL Editor do seu Supabase para corrigir o erro de login
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;

-- Opcional: Criar um usuário administrador inicial se necessário
-- Substitua 'seu-id-do-auth' pelo ID real que você encontra na aba 'Authentication' do Supabase
-- UPDATE public.users SET password = 'suasenhasegura', role = 'Administrador' WHERE id = 'seu-id-do-auth';
