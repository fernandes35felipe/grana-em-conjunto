BEGIN;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_select_own_or_group" ON transactions;
CREATE POLICY "transactions_select_own_or_group" ON transactions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = transactions.group_id
      AND group_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "transactions_insert_own_or_group" ON transactions;
CREATE POLICY "transactions_insert_own_or_group" ON transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = transactions.group_id
      AND group_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "transactions_update_own" ON transactions;
CREATE POLICY "transactions_update_own" ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_delete_own" ON transactions;
CREATE POLICY "transactions_delete_own" ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investments_select_own_or_group" ON investments;
CREATE POLICY "investments_select_own_or_group" ON investments
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = investments.group_id
      AND group_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "investments_insert_own_or_group" ON investments;
CREATE POLICY "investments_insert_own_or_group" ON investments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = investments.group_id
      AND group_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "investments_update_own" ON investments;
CREATE POLICY "investments_update_own" ON investments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "investments_delete_own" ON investments;
CREATE POLICY "investments_delete_own" ON investments
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "groups_select_member" ON groups;
CREATE POLICY "groups_select_member" ON groups
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "groups_insert_own" ON groups;
CREATE POLICY "groups_insert_own" ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "groups_update_creator_or_admin" ON groups;
CREATE POLICY "groups_update_creator_or_admin" ON groups
  FOR UPDATE
  USING (
    auth.uid() = created_by
    OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.is_admin = true
    )
  );

DROP POLICY IF EXISTS "groups_delete_creator" ON groups;
CREATE POLICY "groups_delete_creator" ON groups
  FOR DELETE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "group_members_select_member" ON group_members;
CREATE POLICY "group_members_select_member" ON group_members
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_members_insert_admin" ON group_members;
CREATE POLICY "group_members_insert_admin" ON group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_admin = true
    )
  );

DROP POLICY IF EXISTS "group_members_delete_self_or_admin" ON group_members;
CREATE POLICY "group_members_delete_self_or_admin" ON group_members
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.is_admin = true
    )
  );

DROP POLICY IF EXISTS "investment_goals_select_own" ON investment_goals;
CREATE POLICY "investment_goals_select_own" ON investment_goals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_goals_insert_own" ON investment_goals;
CREATE POLICY "investment_goals_insert_own" ON investment_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_goals_update_own" ON investment_goals;
CREATE POLICY "investment_goals_update_own" ON investment_goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_goals_delete_own" ON investment_goals;
CREATE POLICY "investment_goals_delete_own" ON investment_goals
  FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
