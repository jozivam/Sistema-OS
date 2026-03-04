-- 1. ADICIONAR CAMPOS FALTANTES NAS TABELAS EXISTENTES
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS corporate_name TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS corporate_name TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT;

-- 2. CRIAR TABELAS DE ESTOQUE (NOMES EM INGLÊS CONFORME DBSERVICE)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    imagens TEXT[],
    preco_venda DECIMAL(10,2) DEFAULT 0,
    sku TEXT,
    peso DECIMAL(10,2),
    altura DECIMAL(10,2),
    largura DECIMAL(10,2),
    comprimento DECIMAL(10,2),
    quantidade_estoque INTEGER DEFAULT 0,
    ean TEXT,
    ncm TEXT,
    variacoes JSONB,
    categoria TEXT,
    marca TEXT,
    seo_title TEXT,
    seo_description TEXT,
    fornecedor_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    valor_compra DECIMAL(10,2) DEFAULT 0,
    margem_lucro DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    localizacao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'ENTRADA', 'SAIDA', 'TRANSFERENCIA'
    quantidade INTEGER NOT NULL,
    origem_id UUID REFERENCES public.storage_locations(id),
    destino_id UUID REFERENCES public.storage_locations(id),
    fornecedor_id UUID REFERENCES public.suppliers(id),
    document_ref TEXT, -- Número da Nota Fiscal
    user_id UUID,
    user_name TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir 'Estoque Matriz' para novas empresas
CREATE OR REPLACE FUNCTION public.ensure_main_stock()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.storage_locations (company_id, nome, localizacao)
    VALUES (NEW.id, 'Estoque Matriz', 'Sede Principal');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_main_stock ON public.companies;
CREATE TRIGGER trigger_ensure_main_stock
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.ensure_main_stock();

-- 3. RESTAURAR RELACIONAMENTOS (FOREIGN KEYS)
-- Nota: 'users_id_fkey' para auth.users pode falhar se usarmos IDs fakes, 
-- mas 'service_orders_tech_id_fkey' para public.users é necessária para o Join.

ALTER TABLE public.service_orders 
DROP CONSTRAINT IF EXISTS service_orders_tech_id_fkey,
ADD CONSTRAINT service_orders_tech_id_fkey 
FOREIGN KEY (tech_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey,
ADD CONSTRAINT chat_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_receiver_id_fkey,
ADD CONSTRAINT chat_messages_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. HABILITAR RLS NAS NOVAS TABELAS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (Multi-tenant)
DROP POLICY IF EXISTS "Multi-tenant access products" ON public.products;
CREATE POLICY "Multi-tenant access products" ON public.products
    FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Multi-tenant access locations" ON public.storage_locations;
CREATE POLICY "Multi-tenant access locations" ON public.storage_locations
    FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Multi-tenant access stock_movements" ON public.stock_movements;
CREATE POLICY "Multi-tenant access stock_movements" ON public.stock_movements
    FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Multi-tenant access suppliers" ON public.suppliers;
CREATE POLICY "Multi-tenant access suppliers" ON public.suppliers
    FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_company ON public.storage_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(produto_id);

-- 7. RESGATE DE ACESSO (ADMIN)
-- Garante que a empresa existe
INSERT INTO public.companies (id, name, corporate_name, trade_name, document, email, phone, status, plan, ativo)
VALUES ('2f193dc6-1615-4131-a9be-5b4b7673b840', 'TEST TECH', 'TEST TECH', 'TEST TECH', '77777777777777', 'admin@admin.com', '63888888888', 'ACTIVE', 'DIAMANTE', true)
ON CONFLICT (id) DO UPDATE SET ativo = true;

-- Restaura seu usuário Admin (Com novos dados solicitados)
INSERT INTO public.users (id, company_id, name, email, role, ativo, is_blocked, password)
VALUES ('e1515601-9f2d-4747-98aa-ed00f26957da', '2f193dc6-1615-4131-a9be-5b4b7673b840', 'ADMIN TECH', 'admin@admin.com', 'Administrador', true, false, '123456')
ON CONFLICT (id) DO UPDATE SET email = 'admin@admin.com', password = '123456', ativo = true, is_blocked = false;
