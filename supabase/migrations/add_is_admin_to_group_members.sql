ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

COMMENT ON COLUMN group_members.is_admin IS 'Indica se o membro é administrador do grupo e pode adicionar/remover membros';

UPDATE group_members
SET is_admin = true
WHERE user_id IN (
  SELECT created_by 
  FROM groups 
  WHERE groups.id = group_members.group_id
);