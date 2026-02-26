-- Create Service Orders Table
CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    tech_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    daily_history TEXT,
    ai_report TEXT,
    status TEXT NOT NULL DEFAULT 'Aberta',
    posts JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see orders from their own company
CREATE POLICY "Users can view orders from their company" ON public.service_orders
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Policy: Users can only insert orders for their own company
CREATE POLICY "Users can insert orders for their company" ON public.service_orders
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Policy: Users can only update orders from their own company
CREATE POLICY "Users can update orders from their company" ON public.service_orders
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Policy: Users can only delete orders from their own company
CREATE POLICY "Users can delete orders from their company" ON public.service_orders
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_orders_company_id ON public.service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id ON public.service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_tech_id ON public.service_orders(tech_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);
