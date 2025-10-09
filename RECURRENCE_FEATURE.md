# Sistema de Lançamentos Recorrentes e Fixos

## Resumo da Implementação

Implementei um sistema completo para gerenciar lançamentos recorrentes e fixos no FinanceAgent.

## 📋 Arquivos Criados/Modificados

### 1. Migration SQL (`supabase/migrations/add_recurrence_fields.sql`)
Adiciona os seguintes campos à tabela `transactions`:
- `is_recurring` (BOOLEAN): Indica se é recorrente
- `is_fixed` (BOOLEAN): Indica se é despesa/receita fixa
- `recurrence_id` (UUID): ID compartilhado entre transações da mesma recorrência
- `recurrence_count` (INTEGER): Número de repetições

### 2. AddTransactionDialog Atualizado (`src/components/dialogs/AddTransactionDialog.tsx`)
**Novas funcionalidades:**
- Switch para marcar como "Lançamento Fixo"
- Switch para marcar como "Lançamento Recorrente"
- Campo para definir quantidade de meses de recorrência
- Lógica para criar múltip