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
- **Banco de Dados e Persistência:** SQLite por empresa, com sincronização opcional para Supabase (PostgreSQL)
- **Segurança:** Sessões aleatórias revogáveis, cookies HttpOnly e controle de acesso por perfil


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
O ambiente original continua em `/login` e `/tecnico`; seus cadastros não são transferidos
automaticamente para as novas empresas. Novas empresas começam vazias.

### Landing page

A rota `/` é a página pública do GridStock. O botão **Entrar** leva a `/login`,
que preserva a autenticação por CPF e senha e a identificação da empresa.
Os endereços `/tecnico`, `/administracao` e `/empresa/[slug]` continuam disponíveis.

O contato comercial é centralizado em `src/components/landing/config.ts`.
O número `5511999999999` é **provisório**: substitua `WHATSAPP_NUMBER` pelo WhatsApp
comercial antes de divulgar a página. A mensagem inicial também está nesse arquivo.
As demonstrações da landing usam dados ilustrativos e não consultam os bancos das empresas.
As notas de posicionamento e fontes da copy estão em `docs/landing-page.md`.

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

A sincronização Supabase inclui o ambiente original, as empresas e a administração em
snapshots privados. Configure `NEXT_PUBLIC_SUPABASE_URL` e **uma chave exclusivamente do
servidor** (`SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`). Nunca use prefixo
`NEXT_PUBLIC_` para a chave secreta e nunca a coloque no código. Reinicie o servidor depois.
Sem a chave secreta, quando há URL configurada, as operações remotas são bloqueadas.
O esquema em `supabase/schema.sql` revoga acesso de `anon` e `authenticated` às tabelas.

O modelo de snapshots exige **um único processo Node e disco persistente**; requisições da
API são serializadas nesse processo. Não use cluster, réplicas ou múltiplos servidores.
As APIs bloqueiam execução na Vercel. Para hospedagem distribuída, migre os dados e sessões
para transações centrais no PostgreSQL com isolamento por empresa. Snapshots não oferecem
transação atômica entre bancos locais e remotos e não substituem backups consistentes.

### Verificação

`npm test` inclui testes de isolamento entre empresas, unicidade de CPF,
persistência após reabrir o banco, suspensão/reativação, logout, acesso administrativo,
troca de senha e validação de cadastros. Os testes usam bancos temporários.


### Central de Administração — acesso único

A página `/administracao` reúne as funções do administrador do sistema no mesmo login
anteriormente usado em “Administrar empresas”. O link na entrada do sistema passa a se
chamar **Central de Administração**. Não é necessário criar uma segunda conta.

- **Visão geral:** totais de empresas, usuários, estoques e produtos, situação das operações e atalhos.
- **Empresas e módulos:** cadastros, identidade visual, perfil de negócio, módulos, limites e ações de manutenção já existentes.
- **Histórico de ações:** consulta e busca nas últimas 30 ações administrativas registradas.
- **Minha conta:** identificação do administrador da plataforma, alteração do nome de login mediante senha atual e troca de senha.

O administrador da plataforma é independente das contas operacionais das empresas.
Alterar seu nome de usuário não altera o login de nenhum cliente. A mudança fica registrada
no histórico. O botão **Atualizar dados** consulta novamente os indicadores e o histórico.


### Login por CPF

Os acessos da plataforma, da operação e dos técnicos utilizam **CPF e senha**.
São aceitos CPF com ou sem pontuação; os dígitos verificadores são validados.
Novos cadastros e alterações verificam se o CPF já está registrado em outra empresa,
incluindo empresas pausadas. O login geral identifica uma única empresa e não apresenta
um seletor de empresas. Novas senhas de usuários exigem pelo menos oito caracteres.

**Contas anteriores:** na página de login, selecione “Primeiro acesso por CPF? Converter
conta antiga”. Informe seu login antigo, a senha atual e seu CPF verdadeiro. Para contas
operacionais e técnicas, faça isso no endereço da respectiva empresa. O administrador
da plataforma utiliza a mesma opção em `/administracao`. A conversão preserva senha,
perfil, vínculo e histórico. Nenhum CPF é inventado ou atribuído automaticamente.

A aplicação mantém o identificador na coluna interna `username` para compatibilidade
com os snapshots existentes; após a conversão, essa coluna contém os 11 dígitos do CPF.
As credenciais antigas são aceitas somente no fluxo de conversão, sem entregar uma
sessão operacional. O CPF identifica o cadastro, mas não comprova a identidade civil.
A validação de unicidade é feita no servidor sobre os bancos carregados da plataforma;
a sincronização atual por snapshots não substitui uma restrição transacional global
para implantações com múltiplas instâncias concorrentes.

### Segurança revisada em 09/11/2026

- Sessões de 12 horas em cookies HttpOnly/SameSite=Strict, Secure em HTTPS. O navegador
  guarda apenas o marcador não secreto `cookie`; login antigo exige nova autenticação.
- Dez tentativas por identidade a cada 15 minutos, mais limite global de 120/minuto,
  persistidos em SQLite. Proteja também a borda com HTTPS e limitação de tráfego.
- Requisições de outras origens bloqueadas, corpo JSON até 1 MB, respostas sem cache.
- Alterações de senha, CPF, perfil ou vínculo revogam sessões do usuário. Alteração de
  credenciais da plataforma revoga as outras sessões administrativas.
- Senhas novas exigem 8 caracteres (10 na alteração do administrador geral), máximo 256.
- Servidor antigo `server/index.js` desativado para operação; resta apenas para testes.

Consulte `SECURITY_REVIEW.md` para evidências e limitações desta revisão.

### Testar no celular pela rede local

Execute `npm run dev -- --hostname 0.0.0.0` e acesse o endereço de rede mostrado
no terminal. O host `172.16.1.48` está permitido em `allowedDevOrigins` para os
recursos de desenvolvimento. Se o IP da máquina mudar, atualize esse host em
`next.config.mjs` e reinicie o servidor. Após a mudança, recarregue a página no
celular. Não use curingas para liberar qualquer origem.

O desenvolvimento usa Turbopack e compila rotas sob demanda. Para avaliar a
velocidade de uso sem o custo de compilação, use `npm run build` e `npm start`
(porta 8080). Mantenha apenas um processo de desenvolvimento por checkout;
não remova o lock de um processo que ainda está rodando.

### Administração da plataforma e financeiro

A central fica em `/administracao`. Os acessos operacionais continuam por CPF;
a central aceita também usuários dedicados de administração. A conta antiga é
preservada. Cada administrador altera sua própria senha, e a mudança encerra
somente as outras sessões dessa mesma conta.

Para provisionar uma conta dedicada, configure o Supabase no `.env`, pare os
servidores deste checkout e execute `npm run admin:create`. O comando valida a
conexão, cria um backup SQLite, mantém contas existentes e sincroniza o registro
da plataforma. Usa `GRIDSTOCK_PLATFORM_ADMIN_USERNAME` (padrão `admin-gridstock`)
e `GRIDSTOCK_PLATFORM_ADMIN_PASSWORD`; se a conta ainda não existe e a senha não
foi definida, gera uma senha e a salva no `.env`, sem imprimi-la. Alterar essas
variáveis depois não troca automaticamente a senha já gravada no banco.

O painel inclui filtros e paginação de empresas, alertas a partir de 80% dos
limites, acompanhamento dos primeiros cadastros, uso agregado, cópia de links,
reutilização de módulos/limites e até 200 ações recentes com detalhes.

O financeiro é de lançamento manual: receitas, despesas, vencimentos, datas de
pagamento e estados pendente/pago/cancelado. O resultado de caixa usa pagamentos
do período; pendências usam vencimentos. Cancelar preserva o registro e o remove
dos totais. Há filtro por empresa/período, gráfico e CSV. Esses dados pertencem
à plataforma, não ao estoque dos clientes, e estão no snapshot remoto do registro.
Não há cobrança automática, gateway, MRR calculado por contratos nem apuração
contábil de lucro. Taxas e custos precisam ser registrados para compor o resultado.

`GRIDSTOCK_STORAGE_MODE=local` desativa explicitamente a sincronização, para bases
isoladas de teste ou servidor único com disco persistente. Não use esse modo em
serverless. O ambiente conectado continua exigindo a chave secreta do Supabase.

### Nova interface da central

A interface em `/administracao` tem navegação lateral recolhível, menu móvel e
busca rápida por páginas ou empresas (`Ctrl K` / `Cmd K`). As transições mantêm
a estrutura da tela e respeitam a preferência de movimento reduzido. O estilo
novo está restrito à central de administração.

O financeiro oferece Hoje, Este mês (até hoje), Últimos 30 dias e intervalo
personalizado de até 366 dias. As comparações usam o intervalo imediatamente
anterior com a mesma duração. O gráfico inclui dias sem pagamentos, e os painéis
mostram as cinco maiores receitas por empresa e até cinco pendências por
vencimento no intervalo escolhido. A lista tem busca e filtros por tipo/situação,
incluindo atrasos; o CSV segue esses filtros. Os indicadores continuam seguindo
somente a empresa e o período, conforme explicado na tela.

Ao alternar seções, o financeiro permanece carregado e conserva filtros e edição.
Use Atualizar dentro dele para buscar novos lançamentos de outros administradores.
Empresas também podem ser exportadas em CSV e filtradas por cadastro inicial
pendente. Exportações protegem células de texto contra fórmulas de planilha.
