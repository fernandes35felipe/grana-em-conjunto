# 💰 Zeni Wallet

**Gerenciamento Financeiro Inteligente, Pessoal e Compartilhado.**

<div align="center">
  <img src="https://img.shields.io/badge/React-18.0+-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-2.0+-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa" alt="PWA" />
</div>

<br>

O **Zeni Wallet** é uma plataforma completa para quem busca retomar o controle de suas finanças. Mais do que apenas registrar gastos, ele permite gerenciar investimentos, dividir despesas em grupo e planejar o futuro com metas claras, tudo em uma interface moderna e acessível via navegador ou instalada como aplicativo (PWA).

---

## 👤 Para Usuários

### Por que usar o Zeni Wallet?

Cansado de planilhas complexas ou aplicativos que só registram o passado? O Zeni Wallet foi desenhado para oferecer **clareza e previsibilidade**. Seja você um investidor iniciante, alguém organizando as contas de casa ou planejando uma viagem em grupo, esta é a ferramenta ideal.

### ✨ Funcionalidades Atuais

#### **Dashboard Intuitivo**

- Visão geral do seu saldo, receitas, despesas e evolução patrimonial em tempo real
- Gráficos interativos para análise visual instantânea
- Resumo mensal e anual de suas finanças

#### **Gestão de Transações**

- **Categorização** automática e personalizada
- **Lançamentos Fixos**: Previsibilidade do seu saldo futuro com despesas recorrentes
- **Eventos**: Agrupe gastos de uma viagem ou reforma para saber exatamente quanto aquele projeto custou
- Filtros avançados por data, categoria e valor

#### **Investimentos Avançados**

- Controle de Ações, FIIs, Renda Fixa e Criptomoedas
- Cálculo automático de rentabilidade e preço médio
- Definição e acompanhamento de **Metas Financeiras** visuais
- Análise de performance da carteira

#### **Grupos e Compartilhamento**

- Crie grupos (ex: "Casa", "Viagem") para dividir despesas com amigos ou familiares
- Controle de quem pagou o quê com divisão automática
- Relatórios detalhados por membro do grupo
- Sistema de permissões (administradores e membros)

#### **Lembretes Inteligentes**

- Receba **notificações Push** (no celular ou PC) para não esquecer de pagar contas
- Lembretes recorrentes para aportes e pagamentos fixos
- Funciona mesmo com o app fechado

#### **Modo Offline (PWA)**

- Instale o app no seu celular e acesse seus dados mesmo sem internet
- Sincronização automática quando voltar online
- Experiência nativa no Android e iOS

### 🚀 O Futuro do Zeni Wallet (Roadmap)

Estamos trabalhando constantemente para melhorar. Confira o que vem por aí:

- **Open Finance**: Conexão automática com seus bancos para importação de extratos
- **IA Financeira**: Insights personalizados sobre seus hábitos de consumo e sugestões de economia
- **Relatórios PDF**: Exportação de dados para declaração de imposto de renda
- **Marketplace de Templates**: Compartilhe e baixe templates de orçamento da comunidade
- **Integração com Cartões**: Acompanhe seus gastos no cartão em tempo real

---

## 💻 Para Desenvolvedores

O Zeni Wallet é um projeto **Open Source** construído com as tecnologias mais modernas do ecossistema React, focando em performance, segurança e escalabilidade.

### 🛠️ Tecnologias e Ferramentas

#### **Frontend**

- **React 18** com Concurrent Features
- **TypeScript** para type safety
- **Vite** para build ultrarrápido
- **Tailwind CSS** para estilização utility-first
- **Shadcn/ui** (baseado em Radix UI) para componentes acessíveis

#### **Gerenciamento de Estado & Data**

- **TanStack Query** (React Query) para cache e sincronização eficiente
- **Context API** para estado global leve
- **Zod** para validação de schemas

#### **Backend & Infraestrutura**

- **Supabase** (PostgreSQL, Authentication, Realtime, Edge Functions)
- **Row Level Security (RLS)** para segurança em nível de banco
- **Triggers PostgreSQL** para cálculos automáticos

#### **Segurança**

- Sanitização de inputs contra XSS/SQL Injection
- Rate Limiting no client-side
- Validação dupla (frontend + backend)
- Políticas RLS para isolamento de dados

#### **PWA & Performance**

- **vite-plugin-pwa** com Service Workers customizados
- Suporte offline completo
- **Web Push API** para notificações
- Code splitting e lazy loading
- React Window para virtualização de listas

#### **Visualização de Dados**

- **Recharts** para gráficos interativos
- Dashboards responsivos e performáticos

### 🗂️ Arquitetura do Projeto

A estrutura de pastas segue um padrão modular e escalável:

```bash
src/
├── components/        # Componentes UI (Shadcn) e funcionais
│   ├── dialogs/      # Modais de criação/edição (Transações, Investimentos)
│   ├── dashboard/    # Cards e widgets específicos da home
│   ├── groups/       # Componentes relacionados a grupos
│   ├── layout/       # Sidebar, Headers, Layouts
│   └── ui/          # Componentes base (Button, Input, Card)
├── contexts/        # Context API (AuthContext)
├── hooks/          # Custom Hooks (useAuth, useReminders, usePWA)
├── pages/          # Rotas da aplicação (Dashboard, Transactions, etc.)
├── services/       # Camada de serviço (Regras de negócio e chamadas API)
├── utils/          # Utilitários de data, formatação e segurança
│   ├── services/   # Serviços específicos (push notifications, reminders)
│   └── types/      # TypeScript types e interfaces
├── integrations/   # Configuração do cliente Supabase
└── sw.ts          # Service Worker customizado
```

### ⚙️ Instalação e Configuração

#### Pré-requisitos

- Node.js 18+ e npm/yarn
- Conta no [Supabase](https://supabase.com)

#### 1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/zeni-wallet.git
cd zeni-wallet
```

#### 2. Instale as dependências:

```bash
npm install
```

#### 3. Variáveis de Ambiente:

Crie um arquivo `.env` na raiz e configure suas credenciais:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_key_anon
VITE_VAPID_PUBLIC_KEY=sua_chave_publica_webpush
```

#### 4. Execute o projeto:

```bash
npm run dev       # Desenvolvimento
npm run build     # Build de produção
npm run preview   # Preview da build
```

### 🗄️ Configuração do Supabase

Para que o Zeni Wallet funcione corretamente, você precisa configurar seu projeto Supabase com as tabelas, políticas RLS, triggers e funções necessárias.

#### 📊 1. Estrutura do Banco de Dados

Execute as seguintes queries SQL no SQL Editor do Supabase para criar as tabelas principais:

```sql
-- Tabela de perfis de usuários
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de grupos
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de membros dos grupos
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Tabela de transações
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  group_id UUID REFERENCES groups ON DELETE SET NULL,
  is_fixed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de investimentos
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  current_value NUMERIC(10, 2) NOT NULL,
  quantity NUMERIC(10, 4),
  unit_price NUMERIC(10, 4),
  maturity_date DATE,
  group_id UUID REFERENCES groups ON DELETE SET NULL,
  goal_id UUID REFERENCES investment_goals ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de metas de investimento
CREATE TABLE investment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(10, 2) NOT NULL,
  current_amount NUMERIC(10, 2) DEFAULT 0,
  target_date DATE,
  color TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lembretes
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  is_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  repeat_type TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de inscrições para push notifications
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 🔒 2. Políticas de Segurança RLS (Row Level Security)

Ative o RLS em todas as tabelas e configure as políticas:

```sql
-- Ativar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para groups
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only creators can update groups" ON groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Only creators can delete groups" ON groups
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas para group_members
CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can manage members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_members.group_id
      AND created_by = auth.uid()
    )
  );

-- Políticas para transactions
CREATE POLICY "Users can view own and group transactions" ON transactions
  FOR SELECT USING (
    user_id = auth.uid() OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = transactions.group_id
      AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas similares para as demais tabelas...
```

#### ⚙️ 3. Funções Auxiliares

Crie funções úteis para operações complexas:

```sql
-- Função para verificar se usuário é criador do grupo
CREATE OR REPLACE FUNCTION is_group_creator(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups
    WHERE id = _group_id
    AND created_by = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Função para verificar se usuário é membro do grupo
CREATE OR REPLACE FUNCTION is_group_member(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = _group_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Função para atualizar current_amount nas metas
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE investment_goals
    SET current_amount = (
      SELECT COALESCE(SUM(current_value), 0)
      FROM investments
      WHERE goal_id = NEW.goal_id
    ),
    updated_at = NOW()
    WHERE id = NEW.goal_id;
  END IF;

  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE investment_goals
    SET current_amount = (
      SELECT COALESCE(SUM(current_value), 0)
      FROM investments
      WHERE goal_id = OLD.goal_id
    ),
    updated_at = NOW()
    WHERE id = OLD.goal_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

#### 🔄 4. Triggers

Configure triggers para automações:

```sql
-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger para atualizar metas de investimento
CREATE TRIGGER update_goal_on_investment_change
  AFTER INSERT OR UPDATE OR DELETE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_current_amount();

-- Trigger para adicionar criador como admin do grupo
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, is_admin)
  VALUES (NEW.id, NEW.created_by, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_creator_to_group
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION add_creator_as_admin();
```

#### ⏰ 5. Configuração de Edge Functions e Cron Jobs

Para notificações push e tarefas agendadas:

##### a) Crie a Edge Function para verificar lembretes:

No diretório `supabase/functions/check-reminders/index.ts`:

```typescript
// Veja o arquivo completo no projeto
// Esta função verifica lembretes pendentes e envia push notifications
```

##### b) Configure o Cron Job no Supabase:

```sql
-- Ativa a extensão pg_cron se ainda não estiver ativa
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cria o job para verificar lembretes a cada 5 minutos
SELECT cron.schedule(
  'check-reminders', -- nome do job
  '*/5 * * * *', -- a cada 5 minutos
  $$
    SELECT net.http_post(
      url:='https://seu-projeto.supabase.co/functions/v1/check-reminders',
      headers:=jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body:=jsonb_build_object('time', now())
    );
  $$
);
```

#### 🔑 6. Configuração de Autenticação

No painel do Supabase:

1. **Email/Senha**: Ative em Authentication > Providers
2. **Email Templates**: Personalize os templates em português
3. **URL Configuration**: Configure as URLs de redirecionamento:
   - Site URL: `https://seu-dominio.com`
   - Redirect URLs: `https://seu-dominio.com/auth/callback`

#### 🚀 7. Configuração para PWA e Push Notifications

1. **Gere as chaves VAPID** para push notifications:

```bash
npx web-push generate-vapid-keys
```

2. **Configure os secrets no Supabase**:

```bash
supabase secrets set VAPID_PUBLIC_KEY=sua_chave_publica
supabase secrets set VAPID_PRIVATE_KEY=sua_chave_privada
```

3. **Configure o domínio permitido** para Service Workers nas configurações do projeto

#### 📝 8. Migrations e Versionamento

Mantenha suas migrations organizadas:

```bash
# Criar nova migration
supabase migration new nome_da_migration

# Aplicar migrations localmente
supabase db push

# Aplicar em produção
supabase db push --db-url postgresql://...
```

#### ✅ 9. Checklist de Configuração

- [ ] Todas as tabelas criadas
- [ ] RLS ativado em todas as tabelas
- [ ] Políticas RLS configuradas
- [ ] Funções auxiliares criadas
- [ ] Triggers configurados
- [ ] Edge Functions deployadas
- [ ] Cron jobs agendados
- [ ] Autenticação configurada
- [ ] Chaves VAPID geradas e configuradas
- [ ] Variáveis de ambiente configuradas no `.env`

Com todas essas configurações, seu Zeni Wallet estará pronto para funcionar com segurança total e todas as funcionalidades habilitadas!

### 🐛 Reportando Bugs

Encontrou um problema? Por favor, abra uma [Issue](https://github.com/seu-usuario/zeni-wallet/issues) no GitHub seguindo este modelo:

**Título**: Descrição concisa do erro

**Informações**:

- **Passos para reproduzir**: Como podemos ver o erro acontecendo?
- **Comportamento esperado vs. real**
- **Screenshots**: Se possível, adicione imagens
- **Ambiente**: (Desktop/Mobile, Navegador, Versão)
- **Console errors**: Erros do console do navegador

### 🤝 Como Contribuir (Pull Requests)

Quer ajudar a evoluir o Zeni Wallet? Adoramos contribuições!

#### Processo de Contribuição:

1. **Fork** o projeto
2. Crie uma **Branch** para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -m 'feat: Adiciona nova funcionalidade'`)
4. **Push** para a Branch (`git push origin feature/nova-funcionalidade`)
5. Abra um **Pull Request**

#### Padrões de Código:

- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/)

  - `feat:` Nova funcionalidade
  - `fix:` Correção de bug
  - `docs:` Documentação
  - `style:` Formatação
  - `refactor:` Refatoração
  - `test:` Testes
  - `chore:` Tarefas gerais

- **TypeScript**: Sempre tipar completamente (evite `any`)
- **Componentes**: Use functional components com hooks
- **Estilização**: Tailwind classes (evite CSS inline)
- **Segurança**: Sempre sanitize inputs do usuário

#### Dicas para Devs:

✅ **DO's**:

- Utilize os componentes de UI existentes em `src/components/ui`
- Use `useSanitizedForm` para formulários
- Implemente loading states e error handling
- Teste em mobile primeiro (mobile-first)
- Adicione comentários JSDoc para funções complexas

❌ **DON'Ts**:

- Não commitar `.env` ou secrets
- Não usar `console.log` em produção
- Não fazer queries diretas sem RLS
- Não ignorar TypeScript errors

### 🧪 Testes

```bash
npm run test        # Executa os testes
npm run test:watch  # Modo watch
npm run test:coverage # Relatório de cobertura
```

### 📚 Documentação Adicional

- [Configuração do Supabase](./docs/supabase-setup.md)
- [Guia de Contribuição Detalhado](./docs/contributing.md)
- [Arquitetura e Decisões Técnicas](./docs/architecture.md)
- [Segurança e Boas Práticas](./docs/security.md)

### 🌟 Showcase

Usando o Zeni Wallet em produção? Adicione seu caso de uso [aqui](https://github.com/seu-usuario/zeni-wallet/discussions/categories/showcase)!

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.

---

<p align="center">
  Feito com 💚 para organizar sua vida financeira<br>
  <sub>Contribua com o projeto e ajude milhares de pessoas a terem controle financeiro!</sub>
</p>

<div align="center">
  <a href="https://github.com/seu-usuario/zeni-wallet/stargazers">⭐ Dê uma estrela</a> •
  <a href="https://github.com/seu-usuario/zeni-wallet/issues">🐛 Reportar Bug</a> •
  <a href="https://github.com/seu-usuario/zeni-wallet/discussions">💬 Discussões</a>
</div>
