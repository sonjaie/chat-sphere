-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_typing_indicators_chat_id ON public.typing_indicators(chat_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_id ON public.typing_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_is_typing ON public.typing_indicators(is_typing);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view typing indicators for chats they are members of" ON public.typing_indicators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_members 
            WHERE chat_members.chat_id = typing_indicators.chat_id 
            AND chat_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own typing indicators" ON public.typing_indicators
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.chat_members 
            WHERE chat_members.chat_id = typing_indicators.chat_id 
            AND chat_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own typing indicators" ON public.typing_indicators
    FOR UPDATE USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.chat_members 
            WHERE chat_members.chat_id = typing_indicators.chat_id 
            AND chat_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own typing indicators" ON public.typing_indicators
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_typing_indicators_updated_at 
    BEFORE UPDATE ON public.typing_indicators 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();
