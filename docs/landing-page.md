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

- Trocar o número provisório em `src/components/landing/config.ts` antes de divulgar.
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
