BEGIN;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_description_length 
    CHECK (length(trim(description)) > 0 AND length(description) <= 1000),
  ADD CONSTRAINT transactions_amount_range 
    CHECK (amount >= -999999999.99 AND amount <= 999999999.99),
  ADD CONSTRAINT transactions_type_valid 
    CHECK (type IN ('income', 'expense')),
  ADD CONSTRAINT transactions_recurrence_count_range 
    CHECK (recurrence_count IS NULL OR (recurrence_count >= 1 AND recurrence_count <= 120)),
  ADD CONSTRAINT transactions_category_not_empty 
    CHECK (length(trim(category)) > 0 AND length(category) <= 255),
  ADD CONSTRAINT transactions_date_range 
    CHECK (date >= '1900-01-01' AND date <= '2100-12-31');

ALTER TABLE investments
  ADD CONSTRAINT investments_name_length 
    CHECK (length(trim(name)) > 0 AND length(name) <= 255),
  ADD CONSTRAINT investments_amount_range 
    CHECK (amount >= 0 AND amount <= 999999999.99),
  ADD CONSTRAINT investments_current_value_range 
    CHECK (current_value >= 0 AND current_value <= 999999999.99),
  ADD CONSTRAINT investments_quantity_range 
    CHECK (quantity IS NULL OR (quantity >= 0 AND quantity <= 999999999)),
  ADD CONSTRAINT investments_unit_price_range 
    CHECK (unit_price IS NULL OR (unit_price >= 0 AND unit_price <= 999999999.99)),
  ADD CONSTRAINT investments_type_not_empty 
    CHECK (length(trim(type)) > 0 AND length(type) <= 255),
  ADD CONSTRAINT investments_maturity_date_range 
    CHECK (maturity_date IS NULL OR (maturity_date >= '1900-01-01' AND maturity_date <= '2100-12-31'));

ALTER TABLE groups
  ADD CONSTRAINT groups_name_length 
    CHECK (length(trim(name)) > 0 AND length(name) <= 255),
  ADD CONSTRAINT groups_description_length 
    CHECK (description IS NULL OR length(description) <= 1000),
  ADD CONSTRAINT groups_color_format 
    CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE investment_goals
  ADD CONSTRAINT investment_goals_name_length 
    CHECK (length(trim(name)) > 0 AND length(name) <= 255),
  ADD CONSTRAINT investment_goals_target_amount_range 
    CHECK (target_amount > 0 AND target_amount <= 999999999.99),
  ADD CONSTRAINT investment_goals_current_amount_range 
    CHECK (current_amount >= 0 AND current_amount <= 999999999.99),
  ADD CONSTRAINT investment_goals_target_date_range 
    CHECK (target_date IS NULL OR (target_date >= CURRENT_DATE AND target_date <= '2100-12-31'));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_full_name_length 
    CHECK (full_name IS NULL OR (length(trim(full_name)) > 0 AND length(full_name) <= 255)),
  ADD CONSTRAINT profiles_theme_valid 
    CHECK (theme IS NULL OR theme IN ('light', 'dark', 'system'));

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_group_date ON transactions(group_id, date DESC) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_recurrence ON transactions(recurrence_id) WHERE recurrence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_group ON investments(group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON investment_goals(user_id);

COMMIT;
