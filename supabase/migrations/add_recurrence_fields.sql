-- Add recurrence fields to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_id UUID,
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER;

-- Add comments
COMMENT ON COLUMN transactions.is_recurring IS 'Indica se a transação é recorrente';
COMMENT ON COLUMN transactions.is_fixed IS 'Indica se a transação é fixa mensal';
COMMENT ON COLUMN transactions.recurrence_id IS 'ID compartilhado entre transações da mesma recorrência';
COMMENT ON COLUMN transactions.recurrence_count IS 'Número de vezes que a transação deve se repetir';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_recurrence_id ON transactions(recurrence_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_fixed ON transactions(is_fixed);