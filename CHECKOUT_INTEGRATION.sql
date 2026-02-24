-- ========================================================
-- CHECKOUT INTEGRATION SETUP
-- ========================================================

-- 1. Tabela para salvar dados de cobrança (Cartões)
-- OBS: Em produção, utilize Gateways como Stripe/Asaas para conformidade PCI.
CREATE TABLE IF NOT EXISTS public.company_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    card_holder_name TEXT NOT NULL,
    card_number_masked TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    brand TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.company_cards ENABLE ROW LEVEL SECURITY;

-- Política de acesso: Apenas Administradores da própria empresa ou Desenvolvedores
CREATE POLICY "Admins podem ver cartões da empresa" 
ON public.company_cards 
FOR ALL 
USING (
    company_id IN (
        SELECT company_id FROM public.users 
        WHERE id = auth.uid() AND (role = 'Administrador' OR role = 'Desenvolvedor')
    )
);

-- 2. Garantir que a tabela companies tenha os campos necessários (já existem, mas reforçar)
-- O campo 'address' e 'document' são essenciais para faturamento.

-- 3. Mensagem de sucesso
SELECT 'Tabela de cartões criada com sucesso! Checkout pronto para integração.' as status;
