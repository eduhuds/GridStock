# Landing page do GridStock

## Direção editorial

Público prioritário: responsáveis por almoxarifados e operações com equipes técnicas externas.
Mensagem central: acompanhar cada peça da base ao técnico, à utilização e à devolução.
A primeira dobra explica categoria, público e mecanismo; o próximo passo é uma conversa
no WhatsApp para conhecer o sistema e solicitar acesso. A hipótese de posicionamento é que
o estoque com o técnico é a necessidade mais relevante para abrir a comunicação.

Copy criada com `.agents/skills/saas-copy-10s/SKILL.md`, incluindo o playbook e a revisão.
Referências visuais consultadas: https://www.abacatepay.com/ e https://biip.club/.
Inspiração: hierarquia clara, áreas de respiro, demonstração de produto e detalhes lúdicos.
Identidade própria: cores do GridStock, tipografia Manrope e personagem de caixa em CSS.

## Fontes das afirmações

| Mensagem | Evidência local |
| --- | --- |
| Gestão de estoque para operações em campo | `README.md`, `src/lib/companyConfig.ts` |
| Endereçamento por corredor/prateleira, múltiplas bases | `src/lib/domain.ts`: `saveWarehouse`, `saveProduct`, `apply` |
| Retirada transfere saldo da base para o técnico | `src/lib/domain.ts`: `apply`, operação `withdraw` |
| Uso e devolução atualizam saldo e registram movimentação | `src/lib/domain.ts`: `apply`, operações `use` e `return` |
| Avisos de estoque mínimo | `src/lib/domain.ts`: `alerts` |
| Portal de técnico no navegador | `src/app/tecnico/page.tsx`, `src/components/GridStockApp.tsx` |
| GPS com permissão e alternativa manual | `src/components/GridStockApp.tsx`: `navigator.geolocation`, tratamento de falha e campo de local |
| Login por CPF/senha e identificação da empresa | `src/app/api/auth/login/route.ts`, `src/lib/cpf.ts` |
| Liberação de empresas pela administração | Pedido do responsável; `src/components/CompanyAdmin.tsx`, `src/lib/companies.ts` |

O código sustenta as capacidades descritas, não comprova disponibilidade em produção nem
resultados de clientes. Por isso a página não anuncia métricas de conversão, economias,
depoimentos, garantias, gratuidade ou condições comerciais não confirmadas.

## Demonstrações

As telas da landing são composições ilustrativas dos fluxos existentes, identificadas como
demonstração. Nomes, quantidades e horários são fictícios. Não há conexão com dados de clientes.
O fluxo interativo conserva as 120 peças de exemplo: entrada 120/0/0, retirada 100/20/0,
uso 100/12/8 e devolução 112/0/8 (base/técnico/utilizadas).

## Revisão e pendências

- WhatsApp comercial confirmado pelo responsável e configurado em 16/11/2026.
- A copy principal já está implementada nos componentes, com CTA único de contato.
- A avaliação editorial identifica categoria, público, benefício, mecanismo e destino do clique.
- Validação humana ainda pendente: mostrar a primeira dobra por 10 segundos a pessoas do público
  e perguntar o que o sistema faz, para quem serve e o que acontece ao clicar no CTA.
- Preços e condições são tratados no atendimento; não foram inventados na página.

## Verificação desta implementação

- `npm run build` concluído; `/` e `/login` geradas estaticamente.
- `npm test`: 36 testes existentes aprovados.
- Navegador: primeira dobra em 320 e 390 px, layouts intermediários em 768 e 1024 px
  e desktop; menu móvel, FAQ, abas por clique e teclado e etapas de saldo verificadas.
- `/login` exibe CPF e senha; o retorno do portal técnico aponta para `/login`.
- Compilação de produção verificada no navegador, incluindo aviso de cookies no celular;
  sem erros ou avisos no console durante a checagem da landing.
- URLs comerciais verificadas sem enviar mensagens para o número provisório.

## Atualização visual — 16/11/2026

Direção: manter o verde escuro e verde-lima da marca, usar superfícies arredondadas da referência de relatório enviada pelo responsável e destacar a demonstração existente. A primeira dobra ganha uma superfície escura contínua, chamada objetiva e acesso ao fluxo. Os exemplos continuam identificados como ilustrativos.

Incluídos dois cartões de acesso por perfil (operacional e técnico), preservando as rotas /login e /tecnico. Nenhuma alteração em autenticação, APIs ou banco. WhatsApp comercial configurado conforme resposta do responsável.

Conferência visual em navegador não realizada nesta revisão, conforme preferência do responsável. Validar desktop e celular na prévia antes de publicar em produção.

## Mascote e demonstração animada

Mascote restaurado acima da tela. Abas alternam a cada 5,5 segundos enquanto a demonstração está visível e com movimento permitido. Mouse e foco não interrompem a reprodução; escolher uma aba muda para exploração manual. Reproduzir avança imediatamente e retoma o ciclo automático. Controle explícito de reprodução e respeito à preferência de movimento reduzido do sistema e do hub de acessibilidade. Ícones e mensagem do mascote acompanham a mesma aba selecionada. Dados permanecem fictícios e não há chamadas à API operacional.

## Revisão de landing e acesso — 17/11/2026

Direção visual: manter os verdes da marca, o mascote original e a demonstração. A hierarquia de relatórios da referência fornecida inspira as superfícies arredondadas; a tipografia prioriza leitura e tarefas. A abertura agora combina mensagem à esquerda e um diagrama explícito da jornada do material à direita. Em telas menores, o diagrama secundário é omitido para priorizar a mensagem e o acesso.

Login: seleção operacional/técnico com rotas por empresa preservadas, mostrar/ocultar senha, volta ao site e orientação para solicitar acesso ao administrador. Layout escopado à página de entrada, sem alteração em APIs ou banco.

Controle de reprodução removido a pedido do responsável; a seleção manual de uma aba não desliga mais a alternância. Movimento reduzido continua sendo respeitado.

Validação: build/TypeScript, 45 testes com administrador fictício em banco de memória, conferência visual desktop e celular, mostrar senha e navegação ao portal técnico. Login da conta de teste validado pela API de produção e sessão criada para a conferência encerrada. Não foram armazenadas credenciais no projeto. Projeto sem script de lint; verificação de diff sem erros.


## Apresentação comercial — 18/11/2026

Objetivo: ajudar o responsável por estoque a entender a oferta e pedir uma demonstração.
Direção: superfície clara e verde-lima, tipografia expressiva e um exemplo concreto de material.
A primeira tela explica gestão de estoque, apresenta o benefício e oferece contato ou exploração.
Mantidos mascote, exemplo de dashboard, fluxo de material, FAQ e login. Nenhum dado real é exibido.

Novo seletor de operação: estoques/almoxarifados, equipes em campo e comércio/estoque geral.
A seleção muda recursos, limitações e a mensagem preparada no WhatsApp; não envia mensagens.
Condições, módulos e limites são tratados no atendimento. Não há preço, depoimento, número de clientes,
garantia de resultado ou urgência artificial. Isso é apresentação comercial, não aprovação técnica
para lançar o sistema; as pendências de persistência da auditoria continuam separadas.

Contrato visual: desktop 1440×900 e celular 390×844; ação principal visível na abertura;
sem estouro horizontal; navegação das abas por setas com foco visível e conteúdo associado.
Estados: seleção bem-sucedida exibe recursos e CTA contextual. Carregamento, vazio, erro,
parcial e permissão não se aplicam ao seletor: conteúdo estático local, sem consulta de API.
A demonstração é identificada como ilustrativa; contato abre WhatsApp, fora da página.

Verificação: build de produção; revisão visual nos dois tamanhos; menu móvel abre/fecha por Escape;
abas de operação por clique e teclado; conteúdo e URL contextual conferidos; âncora para demonstração,
aba de movimentações e FAQ de contratação conferidos. Preferência de movimento reduzido respeitada
pelas regras CSS e lógica existentes. Fotos/câmera, login e APIs não fazem parte desta alteração.
Evidências locais: pasta landing-sales-evidence ao lado deste checkout.
