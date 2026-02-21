-- Drop existing table if exists (for fresh setup)
DROP TABLE IF EXISTS public.notifications;

-- Create notifications table with TEXT company_id (supports 'dev-corp' and UUID strings)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to SELECT notifications (app handles filtering)
CREATE POLICY "Allow select notifications" ON public.notifications
    FOR SELECT USING (true);

-- Allow anyone to INSERT notifications
CREATE POLICY "Allow insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Allow anyone to UPDATE notifications (mark as read)
CREATE POLICY "Allow update notifications" ON public.notifications
    FOR UPDATE USING (true);

-- Index for fast lookups
CREATE INDEX idx_notifications_company_unread ON public.notifications(company_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
