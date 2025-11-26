// src/utils/investmentUtils.ts
import { supabase } from "@/integrations/supabase/client";

export const recalculateGoalBalance = async (goalId: string) => {
  try {
    // 1. Busca todos os investimentos (ativos e retiradas) vinculados a esta meta
    const { data: investments, error } = await supabase.from("investments").select("current_value").eq("goal_id", goalId);

    if (error) throw error;

    // 2. Soma tudo (valores negativos de retiradas serão subtraídos automaticamente)
    const totalBalance = investments?.reduce((acc, inv) => acc + Number(inv.current_value), 0) || 0;

    // 3. Atualiza a meta com o valor real calculado
    const { error: updateError } = await supabase.from("investment_goals").update({ current_amount: totalBalance }).eq("id", goalId);

    if (updateError) throw updateError;

    return totalBalance;
  } catch (error) {
    console.error("Erro ao sincronizar saldo da meta:", error);
  }
};
