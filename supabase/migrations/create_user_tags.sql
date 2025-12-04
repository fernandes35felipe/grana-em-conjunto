-- Tabela de tags personalizadas do usuário
CREATE TABLE public.user_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Users can view their own tags" 
ON public.user_tags FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" 
ON public.user_tags FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
ON public.user_tags FOR DELETE 
USING (auth.uid() = user_id);

-- Constraints
ALTER TABLE public.user_tags
ADD CONSTRAINT user_tags_name_length 
CHECK (length(trim(name)) > 0 AND length(name) <= 50);