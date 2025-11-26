💰 Zeni Wallet
Gerenciamento Financeiro Inteligente, Pessoal e Compartilhado.

O Zeni Wallet é uma plataforma completa para quem busca retomar o controle de suas finanças. Mais do que apenas registrar gastos, ele permite gerenciar investimentos, dividir despesas em grupo e planejar o futuro com metas claras, tudo em uma interface moderna e acessível via navegador ou instalada como aplicativo (PWA).

👤 Para Usuários
Por que usar o Zeni Wallet?
Cansado de planilhas complexas ou aplicativos que só registram o passado? O Zeni Wallet foi desenhado para oferecer clareza e previsibilidade. Seja você um investidor iniciante, alguém organizando as contas de casa ou planejando uma viagem em grupo, esta é a ferramenta ideal.

✨ Funcionalidades Atuais

Dashboard Intuitivo: Visão geral do seu saldo, receitas, despesas e evolução patrimonial em tempo real.

Gestão de Transações:

Categorização automática e personalizada.

Lançamentos Fixos: Previsibilidade do seu saldo futuro com despesas recorrentes.

Eventos: Agrupe gastos de uma viagem ou reforma para saber exatamente quanto aquele projeto custou.

Investimentos Avançados:

Controle de Ações, FIIs, Renda Fixa e Criptomoedas.

Cálculo automático de rentabilidade e preço médio.

Definição e acompanhamento de Metas Financeiras visuais.

Grupos e Compartilhamento: Crie grupos (ex: "Casa", "Viagem") para dividir despesas com amigos ou familiares, com controle de quem pagou o quê.

Lembretes Inteligentes: Receba notificações Push (no celular ou PC) para não esquecer de pagar contas ou realizar aportes.

Modo Offline (PWA): Instale o app no seu celular e acesse seus dados mesmo sem internet.

🚀 O Futuro do Zeni Wallet (Roadmap)
Estamos trabalhando constantemente para melhorar. Confira o que vem por aí:

Open Finance: Conexão automática com seus bancos para importação de extratos.

IA Financeira: Insights personalizados sobre seus hábitos de consumo e sugestões de economia.

Relatórios PDF: Exportação de dados para declaração de imposto de renda.

Modo Escuro Aprimorado: Temas visuais totalmente personalizáveis.

💻 Para Desenvolvedores
O Zeni Wallet é um projeto Open Source construído com as tecnologias mais modernas do ecossistema React, focando em performance, segurança e escalabilidade.

🛠️ Tecnologias e Ferramentas
Frontend: React 18, TypeScript, Vite.

Estilização: Tailwind CSS, Shadcn/ui (baseado em Radix UI) para componentes acessíveis.

Gerenciamento de Estado & Data Fetching: TanStack Query (React Query) para cache e sincronização eficiente.

Backend & Auth: Supabase (PostgreSQL, Authentication, Realtime).

Segurança: Zod para validação de schemas, sanitização de inputs contra XSS/SQL Injection e Rate Limiting no client-side.

PWA: vite-plugin-pwa com Service Workers customizados para suporte offline e notificações push.

Gráficos: Recharts para visualização de dados.

🏗️ Arquitetura do Projeto
A estrutura de pastas segue um padrão modular:

Bash

src/
├── components/ # Componentes UI (Shadcn) e funcionais (Widgets)
│ ├── dialogs/ # Modais de criação/edição (Transações, Investimentos)
│ ├── dashboard/ # Cards e listas específicas da home
│ └── ui/ # Componentes base (Button, Input, Card)
├── contexts/ # Context API (AuthContext)
├── hooks/ # Custom Hooks (useAuth, useReminders, usePWA)
├── pages/ # Rotas da aplicação (Dashboard, Transactions, etc.)
├── services/ # Camada de serviço (Regras de negócio e chamadas API)
├── utils/ # Utilitários de data, formatação e segurança
└── integrations/ # Configuração do cliente Supabase
⚙️ Instalação e Configuração
Clone o repositório:

Bash

git clone https://github.com/seu-usuario/zeni-wallet.git
cd zeni-wallet
Instale as dependências:

Bash

npm install
Variáveis de Ambiente: Crie um arquivo .env na raiz e configure suas credenciais do Supabase e VAPID (para notificações):

Snippet de código

VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_key_anon
VITE_VAPID_PUBLIC_KEY=sua_chave_publica_webpush
Execute o projeto:

Bash

npm run dev
🐛 Reportando Bugs
Encontrou um problema? Por favor, abra uma Issue no GitHub seguindo este modelo:

Título: Descrição concisa do erro.

Passos para reproduzir: Como podemos ver o erro acontecendo?

Comportamento esperado vs. real.

Screenshots: Se possível, adicione imagens.

Ambiente: (Desktop/Mobile, Navegador).

🤝 Como Contribuir (Pull Requests)
Quer ajudar a evoluir o Zeni Wallet? Siga os passos:

Faça um Fork do projeto.

Crie uma Branch para sua feature (git checkout -b feature/nova-funcionalidade).

Commit suas mudanças (git commit -m 'feat: Adiciona nova funcionalidade').

Push para a Branch (git push origin feature/nova-funcionalidade).

Abra um Pull Request.

Dicas para Devs:

Utilize os componentes de UI existentes em src/components/ui para manter a consistência visual.

Sempre use useSanitizedForm ou sanitização manual ao lidar com inputs de usuário.

Para novas tabelas no banco, atualize os tipos em src/integrations/supabase/types.ts.

📄 Licença
Este projeto está sob a licença MIT. Consulte o arquivo LICENSE para mais detalhes.

<p align="center">Feito com 💚 para organizar sua vida financeira.</p>
