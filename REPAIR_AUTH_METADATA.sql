-- SCRIPT DE REPARO DE METADADOS E SINCRONIZAÇÃO (V3 - FINAL)
-- Este script garante que o sistema de Autenticação do Supabase conheça a Empresa e o Cargo de cada usuário.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT u.id, u.company_id, u.role, u.name
        FROM public.users u
    ) LOOP
        -- Sincroniza tanto app_meta_data (segurança) quanto user_meta_data (perfil)
        UPDATE auth.users 
        SET 
            raw_app_meta_data = 
                jsonb_set(
                    jsonb_set(
                        COALESCE(raw_app_meta_data, '{}'::jsonb), 
                        '{company_id}', 
                        concat('"', r.company_id::text, '"')::jsonb
                    ),
                    '{role}',
                    concat('"', r.role::text, '"')::jsonb
                ),
            raw_user_meta_data = 
                jsonb_set(
                    jsonb_set(
                        COALESCE(raw_user_meta_data, '{}'::jsonb),
                        '{name}',
                        concat('"', r.name::text, '"')::jsonb
                    ),
                    '{role}',
                    concat('"', r.role::text, '"')::jsonb
                )
        WHERE id = r.id;
    END LOOP;
END $$;

-- Garante que o gatilho de novos usuários está corrigido para os novos nomes de colunas
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, company_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
        (NEW.raw_app_meta_data ->> 'company_id')::uuid, 
        (NEW.raw_user_meta_data ->> 'company_id')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE(
        (NEW.raw_app_meta_data ->> 'role'),
        (NEW.raw_user_meta_data ->> 'role'),
        'Técnico'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
