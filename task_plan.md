# Plano de Trabalho - Correções e Melhorias no Módulo de Estoque

Este plano detalha as ações para resolver os cinco problemas relatados pelo usuário no Sistema-OS.

## Problemas Identificados

1.  **Erro no upload de imagem de produto**: Falha ao enviar imagens no catálogo.
2.  **Campos numéricos iniciando com "0"**: Desejo de que campos numéricos fiquem em branco por padrão.
3.  **Financeiro do estoque não afetado por saídas**: Movimentações de saída (como para técnicos) devem deduzir do valor total do estoque.
4.  **Categorias de produtos não listadas**: Novas categorias não aparecem para seleção em outros produtos.
5.  **SKU Sequencial Automático**: O campo SKU deve ser preenchido automaticamente (01, 02, ...) e ser único.

## Plano de Ação

### Fase 1: Diagnóstico e Preparação
- [x] Verificar existência e permissões do bucket `product-images` no Supabase.
- [x] Analisar o comportamento da Trigger `trigger_stock_update` no banco de dados.
- [x] Verificar por que novas categorias não estão sendo indexadas no estado `availableCategories`.

### Fase 2: Correções de UI e UX (`EstoqueProdutos.tsx`)
- [x] **Campos Numéricos**: Alterar a exibição dos campos numéricos para mostrar vazio em vez de `0` quando o valor for zero.
- [x] **Categorias**: Validar a lógica de extração de categorias únicas.
- [x] **Upload de Imagem**: Adicionar logs detalhados de erro e garantir que o `companyId` e o bucket estejam configurados.

### Fase 3: Lógica de Banco e Backend (`dbService.ts`)
- [x] **SKU Sequencial**: 
    - Criar função no `dbService` para buscar o último SKU e gerar o próximo (ex: "01", "02").
    - Integrar essa lógica no formulário de criação.
- [x] **Financeiro de Estoque**:
    - Ajustar a Trigger SQL ou a lógica de cálculo no frontend para que movimentações de SAÍDA (mesmo para técnicos) deduzam do valor total financeiro.
    - *Nota*: Se um produto sai para um técnico, ele "sai" do valor financeiro do estoque principal.

### Fase 4: Validação
- [x] Testar criação de produto com imagem.
- [x] Testar criação de produto com novo SKU automático.
- [x] Testar movimentação de saída e verificar atualização do "Valor Total" no cabeçalho.
- [x] Verificar se a nova categoria aparece no autocomplete após o cadastro.

---
**Status**: ✅ Concluído
**Prioridade**: Alta (Bloqueios de uso básico)
