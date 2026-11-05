# GridStock — Gestão Operacional de Estoques e Equipes em Campo

O **GridStock** é um sistema completo de controle de almoxarifado e estoque móvel desenvolvido para empresas que possuem equipes técnicas em campo.

O objetivo central do sistema é eliminar a falta de visibilidade operacional sobre **o que existe em cada base**, **com quais peças cada técnico saiu para trabalhar no dia**, **qual é o estoque pessoal em posse de cada profissional** e **onde exatamente cada material foi utilizado**.

---

## 🎯 O Problema que o GridStock Resolve

Em operações externas de manutenção, instalação e suporte técnico, é comum a empresa saber qual ordem de serviço o técnico vai atender, mas perder o controle sobre os insumos e peças:
- Não saber exatamente com quais materiais o técnico saiu pela manhã;
- Não ter controle atualizado do **estoque pessoal (móvel)** que já está guardado com cada técnico;
- Descobrir tarde demais que uma peça acabou no almoxarifado principal;
- Não conseguir auditar onde uma peça retirada foi efetivamente aplicada em campo.

O **GridStock** centraliza todo esse fluxo em duas visões integradas em tempo real: **Controle Operacional** e **Espaço do Técnico**.

---

## 👥 Perfis e Visões do Sistema

### 1. Controle Operacional (`/`)
Painel administrativo voltado para gestores, almoxarifes e coordenadores de operação:

- **Visão Geral da Operação:**
  - Indicadores em tempo real do total de peças nos almoxarifados versus peças em posse dos técnicos;
  - Distribuição visual de saldo por localização (bases e técnicos);
  - Painel de últimas movimentações e declarações de saída do dia.
- **Alerta Automático de Estoque Baixo na Base:**
  - Sempre que uma peça atinge ou fica abaixo do limite mínimo definido para o almoxarifado (ou zera), o sistema destaca um alerta visual informando a peça, a base, o corredor/prateleira e um botão rápido para **Repor no estoque**.
- **Gestão de Estoques / Almoxarifados:**
  - Cadastro de múltiplas bases físicas com código identificador, cidade, endereço e responsável;
  - Transferência rastreada de peças entre bases diferentes.
- **Catálogo de Produtos e Endereçamento Físico:**
  - Cadastro de peças por código **SKU único**, categoria, estoque mínimo na base e estoque mínimo por técnico;
  - Endereçamento físico obrigatório por **Corredor** e **Prateleira** (`C01 / P02`) independente para cada base.
- **Equipe e Controle de Saída do Dia:**
  - No momento de cadastrar ou editar um técnico, o operacional já seleciona o **estoque base de saída** e define as quantidades de peças com que o técnico está saindo no dia (ou cadastra uma peça nova na hora, já vinculada à saída);
  - Visualização imediata dos itens que estão no **estoque pessoal** de cada técnico em forma de etiquetas (*chips*) de saldo.
- **Histórico Completo e Auditoria CSV:**
  - Filtros combinados por peça, SKU, tipo de operação ou técnico;
  - Exportação de relatórios para planilha **CSV**.

---

### 2. Espaço do Técnico em Campo (`/tecnico`)
Interface simplificada e responsiva (pensada para uso no celular em campo) onde cada técnico acessa exclusivamente o seu próprio estoque:

- **Meu Estoque Pessoal:**
  - Consulta rápida de todas as peças e quantidades sob sua responsabilidade naquele momento, com aviso visual de itens que precisam de reposição.
- **Utilização de Peça com Localização GPS Automática:**
  - Ao dar baixa em uma peça utilizada do seu estoque pessoal, o sistema ativa automaticamente o **GPS do dispositivo** (`navigator.geolocation`), captura as coordenadas exatas (`latitude`, `longitude` e precisão em metros) e preenche o endereço do local;
  - No painel do Controle Operacional, o uso aparece vinculado a um link **"📍 Ver no Mapa"** que abre o ponto exato no Google Maps onde a peça foi aplicada.
- **Declaração de Saída do Dia:**
  - Permite ao técnico declarar com quais peças e quantidades está saindo hoje, atualizando o painel operacional em tempo real.
- **Retirada, Devolução e Conferência de Estoque Pessoal:**
  - **Retirar peças:** transfere saldo de uma base física para o estoque pessoal do técnico;
  - **Devolver peças:** retorna ao almoxarifado as peças que sobraram em bom estado, exigindo motivo/observação;
  - **Informar estoque pessoal (Contagem):** ajusta o saldo físico em mãos mediante justificativa auditada, registrando o saldo anterior e a diferença.

---

## 🔄 Fluxo Operacional das Movimentações

| Tipo de Registro | O que faz no sistema | Impacto no Saldo |
| :--- | :--- | :--- |
| **Entrada de Estoque** | Registra chegada de novos materiais comprados/recebidos em um almoxarifado. | Aumenta o saldo da Base. |
| **Retirada / Saída** | Transfere peças do almoxarifado para a posse do técnico. | Diminui na Base · Aumenta no Técnico. |
| **Saída do Dia** | Declara o kit de peças que o técnico está levando na rota do dia. | Mantém o saldo pessoal e notifica a operação. |
| **Utilização (com GPS)** | Dá baixa definitiva em uma peça aplicada em campo com localização GPS. | Diminui no Técnico · Soma em Peças Utilizadas. |
| **Devolução** | Retorna sobras não utilizadas do técnico de volta para a prateleira da base. | Diminui no Técnico · Aumenta na Base. |
| **Transferência** | Move peças de um almoxarifado para outro almoxarifado. | Diminui na Base de Origem · Aumenta na Base de Destino. |
| **Ajuste / Estoque Pessoal** | Atualiza o saldo após conferência física com justificativa obrigatória. | Atualiza o saldo do Técnico e grava a diferença. |

---

## 🛠️ Arquitetura e Tecnologias

- **Frontend & Backend:** [Next.js](https://nextjs.org/) (App Router) com [React](https://react.dev/) e [TypeScript](https://www.typescriptlang.org/).
- **Banco de Dados e Persistência:**
  - Integração com **Supabase (PostgreSQL)** via `@supabase/supabase-js` e `@supabase/ssr` para persistência em nuvem;
  - Camada local em **SQLite** (`node:sqlite`) sincronizada automaticamente, garantindo alta velocidade e funcionamento contínuo.
- **Regras de Negócio Isoladas (`src/lib/domain.ts`):**
  - Validações atômicas que impedem saldos negativos, códigos duplicados ou exclusão de locais/técnicos que ainda possuam peças em mãos.

---

## 🚀 Como Executar o Projeto Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente (opcional para sincronização em nuvem)
Crie um arquivo `.env.local` na raiz do projeto com os dados do seu projeto Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_do_supabase
```
*(O script de criação das tabelas para o SQL Editor do Supabase encontra-se em `supabase/schema.sql`.)*

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse no navegador:
- **Painel do Controle Operacional:** `http://localhost:3000`
- **Acesso exclusivo do Técnico:** `http://localhost:3000/tecnico`

### 4. Executar testes e build de produção
```bash
# Rodar a suíte de testes automatizados de domínio e API
npm test

# Gerar o build otimizado de produção
npm run build
```
