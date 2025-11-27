import { supabase } from '@/integrations/supabase/client';

import type { PermissionContext } from './types';

export const checkIsResourceOwner = (userId: string, resourceOwnerId: string): boolean => {
  return userId === resourceOwnerId;
};

export const checkGroupMembership = async (userId: string, groupId: string): Promise<boolean> => {
if (!groupId || groupId === "undefined" || groupId === "personal" || groupId === "none") {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .maybeSingle(); // Use maybeSingle para não gerar erro no console se não encontrar

    if (error || !data) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

export const checkGroupAdmin = async (userId: string, groupId: string): Promise<boolean> => {
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      return false;
    }

    if (groupData.created_by === userId) {
      return true;
    }

    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('is_admin')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .single();

    if (memberError || !memberData) {
      return false;
    }

    return memberData.is_admin || false;
  } catch {
    return false;
  }
};

export const checkCanViewTransaction = async (context: PermissionContext): Promise<boolean> => {
  if (context.resourceOwnerId === context.userId) {
    return true;
  }

  if (context.groupId) {
    return checkGroupMembership(context.userId, context.groupId);
  }

  return false;
};

export const checkCanEditTransaction = async (context: PermissionContext): Promise<boolean> => {
  if (context.resourceOwnerId === context.userId) {
    return true;
  }

  if (context.groupId && context.isGroupAdmin !== undefined) {
    return context.isGroupAdmin;
  }

  if (context.groupId) {
    return checkGroupAdmin(context.userId, context.groupId);
  }

  return false;
};

export const checkCanDeleteTransaction = async (context: PermissionContext): Promise<boolean> => {
  return checkCanEditTransaction(context);
};

export const checkCanViewInvestment = async (context: PermissionContext): Promise<boolean> => {
  if (context.resourceOwnerId === context.userId) {
    return true;
  }

  if (context.groupId) {
    return checkGroupMembership(context.userId, context.groupId);
  }

  return false;
};

export const checkCanEditInvestment = async (context: PermissionContext): Promise<boolean> => {
  if (context.resourceOwnerId === context.userId) {
    return true;
  }

  if (context.groupId && context.isGroupAdmin !== undefined) {
    return context.isGroupAdmin;
  }

  if (context.groupId) {
    return checkGroupAdmin(context.userId, context.groupId);
  }

  return false;
};

export const checkCanDeleteInvestment = async (context: PermissionContext): Promise<boolean> => {
  return checkCanEditInvestment(context);
};

export const checkCanViewGroup = async (userId: string, groupId: string): Promise<boolean> => {
  return checkGroupMembership(userId, groupId);
};

export const checkCanEditGroup = async (userId: string, groupId: string): Promise<boolean> => {
  return checkGroupAdmin(userId, groupId);
};

export const checkCanDeleteGroup = async (userId: string, groupId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.created_by === userId;
  } catch {
    return false;
  }
};

export const checkCanAddGroupMember = async (userId: string, groupId: string): Promise<boolean> => {
  return checkGroupAdmin(userId, groupId);
};

export const checkCanRemoveGroupMember = async (userId: string, groupId: string, targetUserId: string): Promise<boolean> => {
  if (userId === targetUserId) {
    return true;
  }

  return checkGroupAdmin(userId, groupId);
};

export const getCurrentUser = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
};

export const ensureAuthenticated = async (): Promise<string> => {
  const userId = await getCurrentUser();
  
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }

  return userId;
};

export const withPermissionCheck = async <T>(
  permissionCheck: () => Promise<boolean>,
  action: () => Promise<T>,
  errorMessage: string = 'Sem permissão para realizar esta ação'
): Promise<T> => {
  const hasPermission = await permissionCheck();

  if (!hasPermission) {
    throw new Error(errorMessage);
  }

  return action();
};
