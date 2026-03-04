# Product Requirements Document (PRD)
## Sistema ERP Técnico (Gestão de OS + Estoque + Frente de Caixa)

---

## 1. Visão Geral do Produto
O **Sistema-OS** é um SaaS (Software as a Service) multi-tenant (multiempresa) voltado para prestadores de serviços técnicos e assistências que precisam de uma gestão centralizada, unindo o **Operacional** (Ordens de Serviço), o **Logístico** (Estoque por Depósitos) e o **Financeiro** (Frente de Caixa e Contas a Receber).

O objetivo principal corporativo do sistema é evitar o "furo de caixa e estoque" criando integrações irreversíveis: uma peça usada em reparo afeta o estoque ou uma venda de balcão alimenta o financeiro e baixa o estoque simultaneamente, operando em uma fundação tecnológica robusta e segura.

---

## 2. Tecnologias Utilizadas (Stack)
* **Frontend:** React.js (via Vite) + TypeScript.
* **Estilos e UI:** Tailwind CSS, ícones `lucide-react` e FontAwesome.
* **Roteamento:** React Router Dom.
* **Componentes Adicionais:** `recharts` (Gráficos), `xlsx` e `jszip` (Exportações Gerenciais).
* **Backend como Serviço (BaaS):** Supabase (Banco de dados PostgreSQL, Autenticação, Functions).
* **Segurança e Arquitetura:** Row Level Security (RLS) Nativo do Postgres (separação blindada de dados por `company_id`), Multi-tenant, Tratamento Global de Falhas (Error Boundaries) com logs invisíveis para o usuário e visíveis para o desenvolvedor.

---

## 3. Arquitetura Desacoplada e Princípios
O sistema possui 3 motores primários que operam de forma isolada, mas conversam através de regras de negócio estritas:
1. **OS (Operacional):** Focado puramente na execução da assistência e histórico de status. Não modifica saldos diretamente de forma ad-hoc sem trilha.
2. **Estoque (Logístico):** Focado na guarda de valores físicos (Depósitos), movimentações rastreáveis com custo médio, controle de estoque negativo e limites estritos.
3. **PDV (Financeiro):** Uma frente de Loja responsiva. Pode vender produtos ou vender itens ligados a uma OS específica, com foco em checkout e entrada e saída de caixa.

**Princípio de Exclusão (Soft Delete):**
Devido ao alto rigor de relacionamentos e histórico contábil, nenhuma exclusão de registros transacionais ou cruciais (Ex: Clientes, Ordens, Vendas, Produtos) resultará em `DELETE` no banco de dados. Uma "Soft Delete" flag (`ativo: boolean = false`) é utilizada de ponta a ponta.

---

## 4. Estrutura do Banco de Dados (PostgreSQL)
A fundação mestre Multi-tenant exige que 95% das tabelas possuam a coluna estamental `company_id`.
* `companies`: Empresas (SaaS).
* `users`: Usuários do sistema (Role based: ADMIN, TECH, DEVELOPER).
* `customers`: Clientes (Inclui fluxos "Completos" e "Cliente Balcão").
* `produtos`: Cadastro base de todos os itens (Tipo: 'produto', 'servico', 'mao_obra'). Possui flags de `controla_estoque`.
* `depositos`: Locais físicos ou virtuais ('tecnico', 'central').
* `estoque_saldos`: Saldo exato vinculado a tabela de depósito.
* `movimentacoes_estoque`: Razão de cada milímetro que algo andou ('ENTRADA', 'SAIDA', 'TRANSFERENCIA').
* `service_orders` (Ordens de Serviço): Entidade operadora, com anotações e funil.
* `historico_status_os`: Linha do tempo de mudança de estágios de uma OS.
* `vendas` e `venda_itens` (PDV): Carrinhos faturados (Rascunhos, Confirmados, Cancelados).
* `contas_receber`: Boletos, PIX e Cartões aguardando quitação atrelados à vendas.
* `auditoria_logs`: Tabelão de logs registrando (Quem, Onde e Quando um Update/Delete ou Insert) ocorreu na plataforma.

---

## 5. Regras de Negócio Cruciais

### 📌 Sobre Vendas (PDV)
- Produtos com `controla_estoque = true` baixam saldo da tabela `estoque_saldos` quando a Venda for para Status "CONFIRMADA". 
- Se a venda for cancelada, o logístico revira a transação de movimentação de volta ao depósito.
- Mão de obra ou serviços (`controla_estoque = false`) permitem faturamento direto e flutuação livre de preço ditada pelo Administrador.

### 📌 Sobre Múltiplos Depósitos
- Cada técnico ter um depósito "Virtual" atrelado permite criar o fluxo de "Material no Carro do Técnico". Entregas de peças entre a "Central" e o "Técnico" devem usar Movimentações do tipo Transferência.

### 📌 Fluxo Financeiro Indireto (Compra Externa)
- Há a existência do processo de "Compra Avulsa". Quando em campo a OS demandar um parafuso urgente, a compra externa dele credita um custo transacional (Financeiro) atrelado diretamente do Logístico que debita para a OS, fechando a conta perfeita de Lucro Real por Ordem de Serviço (Soma de Custo vs Faturamento).

---

## 6. Fases e RoadMap de Execução 

- **Fase 1 (Estrutura Base Baseada no Soft Delete):** (Em Andamento) Consolidação de Arquitetura Multi-Tenant isolando queries para buscar `ativo = true`.
- **Fase 2 (Controle Financeiro Rigoroso):** Implantação total de Relatórios Financeiros atrelados ao PDV e à aba de "Despesas de OS". Permite que uma empresa enxergue Contas a Receber e lucro final.
- **Fase 3 (Inteligência e Métrica):** Relatórios focados na produtividade dos perfis 'TECH'. (Alertas de estoques furando a linha mínima através de Dashboards analíticos ou Email).
- **Fase 4 (Aplicativo Técnico na Ponta):** PWA ou App para o técnico poder apontar uso de materiais através de Código de Barras (QR Code), recolher assinatura digital do cliente na ponta, preencher um Check List e uma APR (Análise Preliminar de Riscos) associada àquela OS.
