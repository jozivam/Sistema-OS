---
description: Plano Oficial de Execução - Funcionalidades Prioritárias
status: Em Análise
---

# Plano de Execução: Próximas Funcionalidades (Sistema-OS)

## Objetivo
Implementar as funcionalidades nucleares e os diferenciais de mercado do **Sistema-OS**, dando prioridade àquilo que agrega valor direto para a operação *Core* (as Ordens de Serviço).

---

## 📅 Roadmap (4 Fases)

### Fase 1: Módulo de Ordens de Serviço (Core Business)
_O coração do sistema. O lugar onde os clientes abrem demandas e os técnicos as finalizam._
- [ ] **Tabela `service_orders` (Banco de Dados Supabase)** 
    - Validar as RLS policies para garantir que as empresas só vejam as suas OS.
- [ ] **Painel Kanban ou Lista Rica**
    - Criar tela para que Administradores vejam as Ordens de Serviço (Abertas, Pendentes, Canceladas e Finalizadas).
- [ ] **Fluxo de Abertura de OS (CRUD)**
    - Modal de Nova Ordem de Serviço, com vinculo direto a um Cliente e um Técnico específico.
- [ ] **Timeline da OS**
    - Adicionar histórico diário de interações. (Ex: "Técnico chegou ao local as 10h", "Peça comprada as 14h").

### Fase 2: Módulo de Comunicação & Chat (Central Chat)
_Se a empresa tiver a flag `enableChat` ativada, liberar chat web-socket._
- [ ] **Configuração do Supabase Realtime**
    - Ativar canais realtime para a tabela `chat_messages`.
- [ ] **Interface do Chat**
    - Criar um componente lateral ou flutuante para mensagens diretas entre a Empresa (Admin) e o Cliente/Técnico.

### Fase 3: Módulo de Relatórios por IA (O Diferencial)
_Se a empresa possuir `enableAI`, o sistema usa Inteligência Artificial para análises textuais._
- [ ] **Integração com LLM (Gemini ou OpenAI)**
    - Usar *Supabase Edge Functions* e o Deno para rodar o script de integração, economizando custos e mantendo a *API Key* segura.
- [ ] **Geração de Report de Fim de Mês**
    - Um botão "Sintetizar com IA" no painel da Empresa que lê todas as OS resolvidas no mês e gera um sumário: *"Quais serviços deram mais lucro"* ou *"Maiores reclamações"*.

### Fase 4: Dashboard Gerencial de Métricas (Dashboard Admin/Dev)
- [ ] **Estatísticas Globais**
    - MRR (Monthly Recurring Revenue), total de empresas ativas vs bloqueadas.
- [ ] **Estatísticas Locais (Por Empresa)**
    - Gráfico de pizza de Status de OS, SLAs (tempo de atendimento).

---

## 🚦 Decisões Técnicas Alinhadas (Socratic Gate)

**Pergunta ao Usuário para podermos avançar para a Fase 1 (Ordem de Serviço):**

1. Como você visualiza o fluxo de uma "Timeline/Histórico" em uma OS? O técnico vai atualizando ela e o cliente final vai lendo as atualizações em tempo real num portal externo, ou esse sistema é apenas de uso **interno** entre Admin e Técnico?

2. Quando formos anexar arquivos (`enableAttachments` ativado), os arquivos serão enviados para o **Supabase Storage**? Teremos limite de MB por imagem/arquivo dependendo do Plano?

---

> **Ação:** Assim que as duas dúvidas acima forem sanadas, faremos a chamada `/create` sobre a Fase 1.
