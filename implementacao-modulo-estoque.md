# Planejamento de Implementação: Módulo de Estoque (Sistema-OS)

## Objetivos Aprovados
1.  **Importação de Telas:** Reescrever componentes e páginas de `ModuloEstoque` para a estrutura principal `Sistema-OS` (dentro de `pages/`).
2.  **Mescla do Banco de Dados:** Aplicar o script `backend_estoque.sql` atual no Supabase e verificar integração de chaves estrangeiras (`company_id`, `ordem_servico`).
3.  **Gerenciamento de Dependências:** Adicionar apenas os pacotes estritamente necessários (`lucide-react`, `date-fns`, `recharts`) no projeto raiz (`Sistema-OS`), sem redundâncias, pois o Sistema-OS já roda Vite com Tailwindcss.

---

## Fases de Execução

### Fase 1: Atualização de Dependências (Projeto Root)
-   [ ] Identificar e rodar a instalação das libs necessárias (`npm install lucide-react date-fns recharts --save`).
-   [ ] Adicionar referência das libs, se necessário, no import map do arquivo `index.html`.

### Fase 2: Mescla do Banco de Dados
-   [ ] Ler e revisar as tabelas presentes no `backend_estoque.sql`.
-   [ ] Aplicar script via painel do Supabase. Como existem integrações `company_id` logado (RLS etc.), vamos conferir compatibilidade (aparentemente o módulo exige RLS não listado em `backend_estoque.sql` ou roda sem).

### Fase 3: Transplante e Adaptação de Código (Frontend)
-   [ ] Copiar `Produtos.tsx`, `DepositosSaldos.tsx` e `Movimentacoes.tsx` para `Sistema-OS/pages/`.
-   [ ] Ajustar para usar o cliente `supabase` e hooks do sistema já logado.

### Fase 4: Integração Roteamento e Layout
-   [ ] Adicionar as novas páginas no roteamento central `App.tsx`.
-   [ ] Adicionar atalhos de navegação no `Layout.tsx`.

---

**Status:** Aprovado e pronto para início da Fase 1 e 2.
