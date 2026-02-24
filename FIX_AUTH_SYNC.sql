-- ========================================================
-- FIX: DUAL TRIGGER FOR USER SYNC & CLEANUP
-- ========================================================

-- 1. Atualizar o Trigger para rodar em INSERT e UPDATE
-- Isso garante que se o Edge Function apenas atualizar o metadado do usuário,
-- a tabela pública public.users também seja atualizada.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Limpeza de registros duplicados (Opcional, mas recomendado para seu teste)
-- Este comando remove empresas com o mesmo documento, mantendo apenas a mais recente.
DELETE FROM public.companies
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY document ORDER BY created_at DESC) as row_num
        FROM public.companies
        WHERE document IS NOT NULL AND document != ''
    ) t
    WHERE t.row_num > 1
);

SELECT 'Trigger atualizado e duplicatas removidas!' as status;
