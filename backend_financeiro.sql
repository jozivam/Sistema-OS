-- TABELA DE CONTAS (Bancos, Caixas, Carteiras)
CREATE TABLE IF NOT EXISTS finance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'BANK', -- 'BANK', 'CASH', 'WALLET'
    initial_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE CATEGORIAS FINANCEIRAS (Plano de Contas)
CREATE TABLE IF NOT EXISTS finance_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'INCOME' ou 'EXPENSE'
    parent_id UUID REFERENCES finance_categories(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE LANÇAMENTOS (Contas a Pagar/Receber e Transações)
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES finance_accounts(id),
    category_id UUID REFERENCES finance_categories(id),
    contact_id UUID NULL, -- Pode ser ID de Customer ou Provider
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL, -- Vínculo com PDV
    order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL, -- Vínculo com OS
    
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type TEXT NOT NULL, -- 'INCOME' (Receita) ou 'EXPENSE' (Despesa)
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'CANCELLED'
    
    due_date DATE NOT NULL,
    payment_date TIMESTAMPTZ,
    payment_method TEXT, -- 'DINHEIRO', 'PIX', 'CREDITO', etc
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ADIÇÃO DE COLUNA DE SALDO DE CRÉDITO NO CLIENTE
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='customers' AND COLUMN_NAME='credit_balance') THEN
        ALTER TABLE customers ADD COLUMN credit_balance DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- TRIGGER PARA ATUALIZAR SALDO DA CONTA AO PAGAR TRANSAÇÃO
CREATE OR REPLACE FUNCTION update_account_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a transação mudou para PAID
    IF (TG_OP = 'UPDATE' AND OLD.status != 'PAID' AND NEW.status = 'PAID') THEN
        IF NEW.type = 'INCOME' THEN
            UPDATE finance_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSE
            UPDATE finance_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
    -- Se a transação foi inserida já como PAID
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'PAID') THEN
        IF NEW.type = 'INCOME' THEN
            UPDATE finance_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSE
            UPDATE finance_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_finance_balance ON finance_transactions;
CREATE TRIGGER tr_update_finance_balance
AFTER INSERT OR UPDATE ON finance_transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_payment();
