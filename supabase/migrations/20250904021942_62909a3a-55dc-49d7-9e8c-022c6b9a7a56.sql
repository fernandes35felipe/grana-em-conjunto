-- Create helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id AND g.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = _group_id AND gm.user_id = auth.uid()
  );
$$;

-- Replace existing SELECT policies with function-based ones to prevent recursion
DROP POLICY IF EXISTS "Users can view groups they created" ON groups;
DROP POLICY IF EXISTS "Users can view groups where they are members" ON groups;

CREATE POLICY "Users can view groups they created or joined"
ON public.groups
FOR SELECT
USING (
  public.is_group_creator(id) OR public.is_group_member(id)
);

-- Replace group_members SELECT policy
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
CREATE POLICY "Users can view group members (self or creator)"
ON public.group_members
FOR SELECT
USING (
  user_id = auth.uid() OR public.is_group_creator(group_id)
);

-- Replace INSERT policy for group_members to use function (to avoid recursion)
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;
CREATE POLICY "Group creators can add members"
ON public.group_members
FOR INSERT
WITH CHECK (
  public.is_group_creator(group_id)
);
