-- ============================================================
-- MIGRAÇÃO: Novos Planos (Ouro/Diamante/Custom), Período, Precificação e Sessões
-- Execute este script no painel do Supabase: SQL Editor
-- ============================================================

-- 1. Adicionar coluna plan_period na tabela companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS plan_period TEXT DEFAULT 'MENSAL';

-- 2. Migrar planos antigos (MENSAL/TRIMESTRAL/ANUAL) para os novos tipos
-- Preserva o período no novo campo e converte o plano para OURO por padrão
UPDATE companies 
SET 
  plan_period = CASE 
    WHEN plan = 'TRIMESTRAL' THEN 'TRIMESTRAL'
    WHEN plan = 'ANUAL' THEN 'ANUAL'
    ELSE 'MENSAL'
  END,
  plan = CASE 
    WHEN plan IN ('TESTE', 'LIVRE') THEN plan
    ELSE 'OURO'
  END
WHERE plan NOT IN ('OURO', 'DIAMANTE', 'CUSTOM');

-- 3. Criar tabela de precificação dos planos (editável pelo desenvolvedor)
CREATE TABLE IF NOT EXISTS plan_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type TEXT NOT NULL,
  period TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_type, period)
);

-- 4. Inserir preços padrão (edite os valores conforme necessário)
INSERT INTO plan_pricing (plan_type, period, base_price, discount_pct) VALUES
  ('OURO',     'MENSAL',      97.00,  0),
  ('OURO',     'TRIMESTRAL',  97.00,  5),
  ('OURO',     'SEMESTRAL',   97.00, 10),
  ('OURO',     'ANUAL',       97.00, 15),
  ('DIAMANTE', 'MENSAL',     197.00,  0),
  ('DIAMANTE', 'TRIMESTRAL', 197.00,  5),
  ('DIAMANTE', 'SEMESTRAL',  197.00, 10),
  ('DIAMANTE', 'ANUAL',      197.00, 15)
ON CONFLICT (plan_type, period) DO NOTHING;

-- 5. Adicionar colunas de controle de sessão na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS active_session_token TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS session_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 6. Habilitar RLS na tabela plan_pricing e criar políticas
ALTER TABLE plan_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_pricing_read" ON plan_pricing;
CREATE POLICY "plan_pricing_read" ON plan_pricing
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_pricing_write" ON plan_pricing;
CREATE POLICY "plan_pricing_write" ON plan_pricing
  FOR ALL USING (true);

-- ============================================================
-- CONCLUÍDO. Verifique se os dados foram inseridos corretamente.
-- ============================================================
