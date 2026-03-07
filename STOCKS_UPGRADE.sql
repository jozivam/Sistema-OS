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
DECLARE
    v_origem_nome TEXT;
    v_destino_nome TEXT;
BEGIN
    -- Busca nomes para identificar se é Matriz/Sede
    IF NEW.origem_id IS NOT NULL THEN
        SELECT nome INTO v_origem_nome FROM public.storage_locations WHERE id = NEW.origem_id;
    END IF;
    IF NEW.destino_id IS NOT NULL THEN
        SELECT nome INTO v_destino_nome FROM public.storage_locations WHERE id = NEW.destino_id;
    END IF;

    -- LÓGICA: O estoque_quantidade em products representará o ESTOQUE FINANCEIRO (Matriz)
    
    -- Se for entrada direta ou transferência vindo de fora para Matriz
    IF (NEW.tipo = 'ENTRADA') OR (v_destino_nome ILIKE '%Matriz%' OR v_destino_nome ILIKE '%Sede%') THEN
        -- Mas se for transferência INTERNA Matriz -> Matriz, não muda nada
        IF NOT (v_origem_nome ILIKE '%Matriz%' OR v_origem_nome ILIKE '%Sede%') OR (NEW.tipo = 'ENTRADA') THEN
            UPDATE public.products 
            SET quantidade_estoque = quantidade_estoque + NEW.quantidade
            WHERE id = NEW.produto_id;
        END IF;
    END IF;

    -- Se for saída direta ou transferência saindo da Matriz para outro lugar (e.g. Técnico)
    IF (NEW.tipo = 'SAIDA') OR (v_origem_nome ILIKE '%Matriz%' OR v_origem_nome ILIKE '%Sede%') THEN
        -- Mas se for transferência INTERNA Matriz -> Matriz, não muda nada
        IF NOT (v_destino_nome ILIKE '%Matriz%' OR v_destino_nome ILIKE '%Sede%') OR (NEW.tipo = 'SAIDA') THEN
            UPDATE public.products 
            SET quantidade_estoque = quantidade_estoque - NEW.quantidade
            WHERE id = NEW.produto_id;
        END IF;
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
