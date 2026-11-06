# GridStock

**Plataforma de Gestão de Almoxarifado, Endereçamento Físico e Rastreabilidade de Estoque em Campo**

O **GridStock** é uma solução corporativa desenvolvida para operações técnicas que demandam controle rigoroso sobre insumos, peças de reposição e equipamentos distribuídos entre bases físicas e equipes externas.

A plataforma conecta o **Controle Operacional** aos **Técnicos em Campo** em tempo real, garantindo visibilidade ponta a ponta desde a entrada do material no almoxarifado até a sua aplicação final, com comprovação por geolocalização GPS.

---

## Visão do Produto

Em operações de campo, o maior desafio logístico não está apenas no agendamento do atendimento, mas no **controle real sobre o material que sai da empresa e permanece sob posse da equipe técnica**.

O **GridStock** estrutura a operação sobre quatro pilares fundamentais:

1. **Controle de Saída Diária:** Registro exato das peças e quantidades com que cada técnico inicia o expediente, diretamente vinculado à base de origem.
2. **Gestão de Estoque Pessoal (Móvel):** Acompanhamento individualizado e em tempo real de todas as peças que estão em posse de cada técnico.
3. **Monitoramento Preventivo de Nível Crítico:** Alertas imediatos para o setor operacional sempre que qualquer item do almoxarifado atinge o estoque mínimo de segurança.
4. **Auditoria de Utilização por Geolocalização:** Captura automática das coordenadas GPS no momento em que o técnico dá baixa em uma peça utilizada, permitindo verificação direta no mapa.

---

## Módulos da Plataforma

### 1. Painel de Controle Operacional
Ambiente gerencial voltado para coordenadores, supervisores e responsáveis pelo almoxarifado:

- **Indicadores Operacionais em Tempo Real:** Visão consolidada da proporção de materiais armazenados nas bases versus materiais alocados com a equipe técnica.
- **Alertas de Reposição do Almoxarifado:** Identificação automática de itens com saldo abaixo do mínimo nas bases físicas, exibindo código SKU, localização física e acionamento rápido de reposição.
- **Gestão Multi-Base e Endereçamento Físico:** Organização de múltiplos almoxarifados com endereçamento padronizado por **Corredor** e **Prateleira**, além de transferências auditadas entre unidades.
- **Controle de Equipe e Abastecimento de Rota:** Cadastro simplificado de técnicos já integrado à montagem da carga de saída do dia e ao acompanhamento visual dos itens em posse de cada profissional.
- **Rastreabilidade e Exportação de Dados:** Histórico imutável de movimentações com filtros avançados e exportação de relatórios gerenciais em formato **CSV**.

### 2. Portal do Técnico em Campo
Ambiente dedicado e otimizado para dispositivos móveis, focado na agilidade da rotina externa:

- **Inventário Pessoal Individualizado:** Visualização clara das peças sob responsabilidade do técnico e indicação automática de itens que necessitam de reposição.
- **Baixa de Material com Geolocalização GPS:** Ao registrar o uso de uma peça do seu estoque pessoal, o sistema captura automaticamente a localização exata do dispositivo (latitude, longitude e endereço) e a vincula ao registro de auditoria.
- **Declaração de Carga do Dia:** Confirmação rápida dos materiais levados para a jornada diária, sincronizada instantaneamente com a central operacional.
- **Ciclo de Retirada, Devolução e Conferência:** Fluxos estruturados para abastecimento na base, retorno de sobras não utilizadas e ajuste de inventário mediante justificativa.

---

## Governança e Regras de Negócio

| Operação | Descrição no Fluxo | Efeito Contábil no Estoque |
| :--- | :--- | :--- |
| **Entrada em Base** | Recebimento de novos lotes ou reposição de fornecedores no almoxarifado. | Incrementa o saldo da Base e vincula o endereço físico. |
| **Saída / Retirada** | Abastecimento do técnico a partir de uma base operacional. | Deduz do saldo da Base · Incrementa o Estoque Pessoal do Técnico. |
| **Declaração de Saída** | Registro formal das peças em posse do técnico para a rota do dia. | Atualiza o painel de controle diário da operação. |
| **Utilização em Campo** | Aplicação definitiva da peça pelo técnico com captura de coordenadas GPS. | Deduz do Estoque Pessoal do Técnico · Registra o local exato de uso. |
| **Devolução à Base** | Retorno de peças íntegras não utilizadas ao endereço original do almoxarifado. | Deduz do Técnico · Recompõe o saldo da Base. |
| **Transferência entre Bases** | Remanejamento interno de materiais entre almoxarifados distintos. | Deduz da Base de Origem · Incrementa a Base de Destino. |
| **Conferência / Ajuste** | Alinhamento de saldo físico com registro obrigatório de justificativa. | Atualiza o saldo auditado mantendo o histórico de divergência. |

---

## Diretrizes de Integridade Operacional

- **Prevenção de Saldos Negativos:** Nenhuma retirada, transferência, utilização ou devolução é permitida acima da quantidade disponível na origem.
- **Unicidade de Catálogo e Bases:** Códigos de almoxarifado e SKUs de produtos são validados globalmente para evitar duplicidade de registros.
- **Proteção Patrimonial na Exclusão:** Bases de estoque, produtos do catálogo e cadastros de técnicos possuem trava de segurança e não podem ser removidos enquanto houver saldo físico vinculado.
- **Segregação de Acesso:** Controle de sessão independente entre o perfil administrativo (**Operação**) e o perfil externo (**Técnico**), garantindo que cada profissional opere exclusivamente sobre sua própria carga.

---

## Stack Tecnológica

- **Aplicação:** Next.js (App Router), React 19 e TypeScript
- **Banco de Dados e Persistência:** Supabase (PostgreSQL) com camada de alta disponibilidade
- **Segurança:** Autenticação baseada em tokens assinados (HMAC-SHA256) e controle de acesso por perfil (RBAC)


## Administração multiempresa

Acesse `/administracao` ou o link **Administrar empresas** na página de login.
No primeiro acesso, a conta da administração geral é criada com o login e a senha
que o administrador principal (`u-admin`) possui no banco local naquele momento.
Depois disso, ela é independente das contas operacionais. Altere sua senha em
**Segurança da administração**. A sessão administrativa dura 12 horas. Para instalações
com outro administrador principal, defina `GRIDSTOCK_MASTER_USER_ID` antes do primeiro acesso.

No painel você pode cadastrar empresas, definir o primeiro responsável operacional,
personalizar nome, cor principal e mensagem de boas-vindas, buscar empresas e pausar
ou reativar acessos. O endereço escolhido no cadastro é permanente para preservar os links.
Cada empresa tem duas páginas:

- `/empresa/endereco-da-empresa` para a operação.
- `/empresa/endereco-da-empresa/tecnico` para os técnicos cadastrados pelo responsável.

A personalização cobre a apresentação da empresa. Mudanças de regras de negócio ou
novos módulos continuam sendo desenvolvimento no código compartilhado.
O ambiente original continua em `/` e `/tecnico`; seus cadastros não são transferidos
automaticamente para as novas empresas. Novas empresas começam vazias.

### Armazenamento e isolamento

Esta versão usa **um SQLite independente por empresa**, no mesmo servidor do sistema,
em `data/companies/<id-interno>.db`. Se `GRIDSTOCK_DB` apontar para outro arquivo,
a pasta `companies` fica ao lado dele. O catálogo de empresas, a conta administrativa
e suas sessões ficam no banco principal. Nenhuma empresa recebe o usuário padrão `admin`.

As APIs resolvem a empresa pelo cabeçalho `X-Gridstock-Company` e validam a sessão
no banco daquela empresa. O cabeçalho sozinho não concede acesso. Os tokens são aleatórios
e revogáveis, sem recuperação de acesso pelo nome de usuário. Cada empresa e perfil
possui uma chave de sessão distinta no navegador. Pausar uma empresa bloqueia as APIs
e encerra suas sessões; reativá-la exige novo login.

**Hospedagem:** requer Node.js com SQLite e disco persistente, em uma única instância.
Para backup, pare o serviço e copie o banco principal e toda a pasta `companies`, ou use
backups SQLite consistentes incluindo os respectivos arquivos WAL. Não copie apenas
`gridstock.db`, pois os estoques dos clientes ficam em arquivos separados.

A sincronização Supabase anterior continua restrita ao ambiente original. Os bancos das
novas empresas e a administração geral **não são sincronizados com o Supabase**. O cadastro
multiempresa é bloqueado em Vercel, cujo disco é temporário. Para publicar em Vercel ou escalar
em múltiplas instâncias, será necessária uma migração para armazenamento central com
isolamento por empresa. As permissões públicas do esquema Supabase legado também precisam
ser revisadas antes de exposição externa.

### Verificação

`npm test` inclui testes de isolamento entre empresas, usuários com o mesmo login,
persistência após reabrir o banco, suspensão/reativação, logout, acesso administrativo,
troca de senha e validação de cadastros. Os testes usam bancos temporários.
