# 🟦 OsRepo
## O Repositório Digital das Suas Ordens de Serviço

O OsRepo é uma plataforma de gestão de Ordens de Serviço desenvolvida para empresas que desejam organizar atendimentos técnicos, controlar equipes externas e centralizar informações em um único sistema digital.

---

## 🚀 Sobre o Projeto

O OsRepo foi criado para resolver um problema comum em empresas de serviços: desorganização operacional.

Muitas empresas ainda utilizam planilhas, anotações em papel ou mensagens espalhadas em aplicativos, o que gera:

- Perda de informações
- Retrabalho
- Atrasos
- Falta de controle sobre técnicos
- Dificuldade na tomada de decisão

O OsRepo centraliza todas as Ordens de Serviço em um ambiente moderno, simples e eficiente.

---

## 🎯 Público-Alvo

O sistema é ideal para:

- Empresas de manutenção
- Assistências técnicas
- Provedores de internet
- Empresas de energia solar
- Segurança eletrônica
- Telecomunicações
- Técnicos autônomos
- Empresas com equipes externas

---

## ✨ Funcionalidades Principais

- ✔ Criação e gerenciamento de Ordens de Serviço
- ✔ Cadastro de clientes
- ✔ Controle de técnicos e equipes
- ✔ Atualização de status em tempo real
- ✔ Histórico completo de atendimentos
- ✔ Relatórios gerenciais
- ✔ Sistema 100% em nuvem

---

## 🛠 Tecnologias Utilizadas

(Exemplo — ajuste conforme seu projeto)

- React / Next.js
- TypeScript
- Node.js
- PostgreSQL / Firebase
- TailwindCSS
- API REST

---

## ⚙️ Configuração de Ambiente

Para rodar o projeto localmente ou fazer o deploy, você precisará configurar as variáveis de ambiente.

1.  Crie um arquivo `.env.local` na raiz do projeto (ele já está ignorado no Git para sua segurança).
2.  Copie o conteúdo de [`.env.example`](file:///c:/Users/jps/Documents/Sistema-OS/.env.example) para o seu `.env.local`.
3.  Preencha com suas chaves do Supabase e Gemini.

### 🚀 Deploy (Vercel/Netlify/etc)

**Nunca envie o arquivo `.env.local` para o repositório.** No seu painel de deploy (como a Vercel), procure pela seção **Environment Variables** e adicione cada uma das chaves definidas no `.env.example` com seus respectivos valores.

---


## 📦 Estrutura do Projeto

```bash
src/
 ├── components/
 ├── pages/
 ├── services/
 ├── hooks/
 └── styles/