# GridStock — Next.js + TypeScript + React

Aplicação funcional full-stack construída em **Next.js (App Router)**, **React**, **TypeScript** e **SQLite** (`node:sqlite`), pronta para deploy na **Vercel** e preservando integralmente o design e as regras de negócio do GridStock v2.

## Comandos Principais

- **Modo de desenvolvimento:**
  ```bash
  npm run dev
  ```
- **Build de produção (Next.js + TypeScript):**
  ```bash
  npm run build
  ```
- **Servidor de produção (porta 8080):**
  ```bash
  npm start
  ```
- **Testes automatizados:**
  ```bash
  npm test
  ```

## Acesso Inicial (Login)

- **Usuário:** `admin`
- **Senha:** `admin123`
- **Perfil:** Controle Operacional (`ops`)

## Estrutura em Next.js + TypeScript

- `src/app/layout.tsx` e `src/app/page.tsx`: Entrada do App Router do Next.js.
- `src/app/globals.css`: Estilos responsivos e identidade visual do GridStock.
- `src/components/GridStockApp.tsx`: Aplicação React tipada em TypeScript com todas as páginas, filtros, modais, autenticação e exportação CSV.
- `src/lib/domain.ts`: Regras de domínio tipadas em TypeScript (estoques, produtos, endereçamento físico por corredor/prateleira, técnicos e movimentações).
- `src/lib/db.ts`: Camada de persistência SQLite e autenticação com tokens assinados via HMAC-SHA256 (compatível com ambientes serverless como a Vercel usando `/tmp/gridstock.db` quando `process.env.VERCEL` está ativo, ou `data/gridstock.db` localmente).
- `src/app/api/**`: Route Handlers do Next.js (`/api/auth/login`, `/api/auth/logout`, `/api/bootstrap`, `/api/warehouses`, `/api/products`, `/api/technicians`, `/api/movements`, `/api/users` e `/api/system/reset`).
