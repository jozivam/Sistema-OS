# Descobertas e Arquitetura

O erro HTTP 400 ao editar produtos era causado pelo envio do campo `unidade_medida` no payload do Supabase. Através de testes unitários com scripts Node.js, descobrimos que este campo **não existe** na tabela `products` do banco de dados, apesar de estar presente no código do frontend.

Além disso:
- Os campos `seo_title` e `seo_description` existem no banco, mas não estavam sendo enviados na função `updateProduct` do `dbService`.
- Realizamos a correção removendo o envio de `unidade_medida` e adicionando o mapeamento correto par os campos de SEO na atualização.
