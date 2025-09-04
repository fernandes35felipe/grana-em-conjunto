-- Create investment_goals table
CREATE TABLE public.investment_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  color TEXT DEFAULT 'blue',
  description TEXT,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investment_goals
CREATE POLICY "Users can view their own investment goals"
ON public.investment_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment goals"
ON public.investment_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment goals"
ON public.investment_goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment goals"
ON public.investment_goals
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investment_goals_updated_at
BEFORE UPDATE ON public.investment_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();