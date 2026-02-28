# Plano de Execução: Refatoração do Painel do Desenvolvedor

## Objetivo
Criar um painel do desenvolvedor com estética premium, dark mode, painéis dinâmicos e de alto contraste, focado em monitoramento financeiro de SaaS, gestão de clientes (empresas), conversão e logs, garantindo a integração real com as chamadas de banco de dados (Supabase) existentes.
Foco principal: **Desktop First** (não focaremos em adaptação profunda para mobile agora) e **Substituição da rota atual** (sobreescrever as Views do DeveloperPanel).

## Fases de Implementação

### Fase 1: Análise e Estruturação de Dados
- Revisar as chamadas existentes em `DeveloperPanel.tsx` (`dbService.getCompanies()`, etc).
- Levantar os hooks e dados necessários: métricas de faturamento (MRR total, pendentes, churn), total de lojas ativas, logs e sessões.
- Reestruturar os sub-componentes se necessário, para separar a UI Premium da lógica.

### Fase 2: Design System e Estilos (index.css)
- Adicionar variáveis de cor avançadas para o modo escuro no `index.css` (cores de neon sutis: roxo, azul espacial, verde esmeralda para finanças).
- Implementar efeitos *glassmorphism* e sombras glow.
- Padronizar componentes como botões (glow/gradients), cards estatísticos com hover dinâmico e tipografia moderna.

### Fase 3: Layout e Estrutura do Novo DeveloperPanel
- Refatorar a estrutura do `DeveloperPanel.tsx` (que está sendo injetado dentro do `Layout.tsx`). 
- **⚠️ Observação Arquitetural:** O `Layout.tsx` provê a sidebar padrão branca/clara. Como o usuário quer o visual da imagem para o dev, pode ser necessário desacoplar o DevPanel do `Layout.tsx` padrão ou atualizar as classes de background condicionalmente caso a rota seja `/developer` para permitir a expansão do "Dark Theme" se o Layout limitar a estética. No entanto, é mais seguro injetar os estilos do Dark Panel dentro do `DeveloperPanel.tsx` usando um fundo escuro com raio de borda que ocupe todo o bloco, ou remover o DevPanel do Layout padrão no `App.tsx`.

### Fase 4: Desenvolvimento dos Componentes da UI Real 
- Construir o **Header de Monitoramento** (Saudações + MRR + Lojas Ativas).
- Criar **Gráficos de Conversão / Receita** (simulados com SVG ou CSS Puro, já que o banco não prevê histórico temporal complexo).
- Substituir o design da **Tabela de Empresas** (`CompanyTable`) por um design premium, bordas clean, ícones de status bem definidos (ATIVO/BLOQUEADO).
- Redesenhar as Abas Internas (Atendimento, Backups, Sessões, API) mantendo a coesão dark.

### Fase 5: Integração do Banco de Dados
- Plugar os `states` reais aos novos cards e componentes.
- Testar alteração de plano, e inclusão de nova empresa no novo design.

### Fase 6: Polimento e Checklist
- Revisar a experiência de mouse, hovers, micro-animações.
- Garantir que nenhum console.error de chave CSS esteja presente.
- Validar as rotas e se nada quebrou. 
