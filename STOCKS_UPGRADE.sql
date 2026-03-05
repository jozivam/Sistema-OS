-- 1. Tabelas de Vendas (PDV)
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    total DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) DEFAULT 0,
    desconto DECIMAL(10,2) DEFAULT 0,
    taxa_maquina DECIMAL(10,2) DEFAULT 0,
    forma_pagamento TEXT, -- 'DINHEIRO', 'PIX', 'CREDITO', 'DEBITO'
    parcelas INTEGER DEFAULT 1,
    status TEXT DEFAULT 'COMPLETED',
    user_id UUID,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.venda_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL
);

-- 2. Habilitar RLS e Políticas para Vendas
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Multi-tenant access vendas" ON public.vendas;
CREATE POLICY "Multi-tenant access vendas" ON public.vendas
    FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Multi-tenant access venda_itens" ON public.venda_itens;
CREATE POLICY "Multi-tenant access venda_itens" ON public.venda_itens
    FOR ALL USING (venda_id IN (SELECT id FROM public.vendas WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())));

-- 3. Trigger para Atualizar quantidade_estoque em products
CREATE OR REPLACE FUNCTION public.handle_stock_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for ENTRADA (sem origem, apenas destino) ou Destino de TRANSFERENCIA
    IF (NEW.tipo = 'ENTRADA') OR (NEW.destino_id IS NOT NULL) THEN
        UPDATE public.products 
        SET quantidade_estoque = quantidade_estoque + NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;

    -- Se for SAIDA (apenas origem, sem destino) ou Origem de TRANSFERENCIA
    IF (NEW.tipo = 'SAIDA') OR (NEW.origem_id IS NOT NULL) THEN
        UPDATE public.products 
        SET quantidade_estoque = quantidade_estoque - NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_update ON public.stock_movements;
CREATE TRIGGER trigger_stock_update
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.handle_stock_update();

-- 4. Adicionar coluna unidade_medida se não existir
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'UN';
