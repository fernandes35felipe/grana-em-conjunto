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

#### 4. Configure o banco de dados:

- Execute as migrations no Supabase Dashboard
- Configure as políticas RLS conforme documentação

#### 5. Execute o projeto:

```bash
npm run dev       # Desenvolvimento
npm run build     # Build de produção
npm run preview   # Preview da build
```

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
