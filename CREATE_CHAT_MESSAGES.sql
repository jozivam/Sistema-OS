    -- CREATE CHAT MESSAGES TABLE
    CREATE TABLE IF NOT EXISTS public.chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES auth.users(id),
        sender_name TEXT NOT NULL,
        receiver_id UUID REFERENCES auth.users(id),
        channel_id TEXT,
        text TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Enable Row Level Security (RLS)
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view messages related to their company
    CREATE POLICY "Users can view messages from their company" ON public.chat_messages
        FOR SELECT USING (
            company_id IN (
                SELECT company_id FROM public.users WHERE id = auth.uid()
            )
        );

    -- Policy: Users can insert messages for their company
    CREATE POLICY "Users can insert messages for their company" ON public.chat_messages
        FOR INSERT WITH CHECK (
            company_id IN (
                SELECT company_id FROM public.users WHERE id = auth.uid()
            )
        );

    -- Support policy for the developer (Owner) to view any message across companies
    -- Only applicable for 'Desenvolvedor' role
    CREATE POLICY "Developers can view all support messages" ON public.chat_messages
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role = 'Desenvolvedor'
            )
        );

    -- Support policy for the developer to insert answers
    CREATE POLICY "Developers can insert support messages" ON public.chat_messages
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role = 'Desenvolvedor'
            )
        );

    -- Index recommendations for high volume querying
    CREATE INDEX IF NOT EXISTS idx_chat_messages_company_id ON public.chat_messages(company_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON public.chat_messages(channel_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp);

    -- Set Replica Identity to Full so Supabase Realtime picks up all fields
    ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
