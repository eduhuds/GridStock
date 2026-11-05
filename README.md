# GridStock

Sistema web para gestão operacional de estoques, endereçamento físico (corredor e prateleira), controle de saída diária de materiais e acompanhamento de estoque pessoal de técnicos em campo com geolocalização GPS.

## Tecnologias

- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Supabase** (PostgreSQL) & **SQLite**

## Funcionalidades Principais

- **Gestão de Estoques (Bases):** Cadastro de almoxarifados, endereçamento físico por corredor e prateleira e transferência entre bases.
- **Alertas de Estoque Baixo:** Monitoramento automático de peças abaixo do estoque mínimo tanto nas bases quanto em campo.
- **Controle de Equipe e Saída do Dia:** Cadastro de técnicos com vinculação das peças de saída diária e acompanhamento do estoque pessoal em mãos.
- **Rastreabilidade com GPS:** Registro de utilização de peças em campo com captura de localização GPS e visualização no mapa.
- **Perfis de Acesso:** Visões dedicadas para o Controle Operacional (`/`) e para o Técnico em Campo (`/tecnico`).

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto (não versionado no Git) com as credenciais do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_do_supabase
```

## Comandos

- **Desenvolvimento:**
  ```bash
  npm run dev
  ```
- **Build de produção:**
  ```bash
  npm run build
  ```
- **Iniciar servidor de produção:**
  ```bash
  npm start
  ```
- **Executar testes:**
  ```bash
  npm test
  ```
