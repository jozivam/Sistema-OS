-- 1. Cria ou substitui a função para ser segura e não falhar na conversão de UUID
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Tenta converter o company_id de forma segura
  BEGIN
    v_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_company_id := NULL;
  END;

  INSERT INTO public.users (
    id, 
    company_id, 
    name, 
    email, 
    phone, 
    role, 
    city, 
    password, 
    is_blocked
  )
  VALUES (
    new.id, 
    v_company_id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email, 
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'Técnico'),
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'password',
    false
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora erros e não bloqueia a criação do usuário no Auth
    -- Assim você evita o "Database error creating new user"
    RAISE LOG 'Erro no handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que o trigger está adicionado (não custa recriar caso falte)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
