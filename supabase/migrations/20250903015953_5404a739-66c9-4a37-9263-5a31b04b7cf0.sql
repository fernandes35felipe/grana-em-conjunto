-- Primeiro, vamos remover as políticas problemáticas
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

-- Criar novas políticas sem recursão
-- Para group_members: permitir visualizar apenas se for criador do grupo ou se for o próprio usuário
CREATE POLICY "Users can view group members" 
ON group_members 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM groups 
    WHERE groups.id = group_members.group_id 
    AND groups.created_by = auth.uid()
  )
);

-- Para groups: permitir visualizar se for o criador
CREATE POLICY "Users can view groups they created" 
ON groups 
FOR SELECT 
USING (created_by = auth.uid());

-- Criar política separada para visualizar grupos como membro
-- Aqui fazemos a busca direta sem recursão
CREATE POLICY "Users can view groups where they are members" 
ON groups 
FOR SELECT 
USING (
  id IN (
    SELECT group_id 
    FROM group_members 
    WHERE user_id = auth.uid()
  )
);