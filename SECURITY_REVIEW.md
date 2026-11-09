# Revisão de segurança — 09/11/2026

## Escopo e resultado

Revisão do código Next.js, autenticação, administração, isolamento multiempresa,
importação de planilhas, servidor legado, dependências e permissões do projeto
Supabase conectado. Não é certificação de ausência de falhas nem investigação de
acessos históricos. Não foram consultados/expostos valores de senhas ou tokens.

## Problemas corrigidos

| Gravidade | Problema | Correção e evidência |
|---|---|---|
| Crítica | Nove tabelas acessíveis a `anon` e `authenticated`, incluindo usuários, sessões e snapshots | Migração aplicada no Supabase; zero permissões públicas nessas tabelas após verificação. Esquema local atualizado. |
| Alta | Função `rls_auto_enable` SECURITY DEFINER executável publicamente | EXECUTE revogado de PUBLIC, anon e authenticated. |
| Alta | Chave pública usada pelo servidor para operações privilegiadas | Somente SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY; falta de configuração bloqueia operação. |
| Alta | Tokens persistidos no localStorage | Login retorna apenas marcador; token fica em cookie HttpOnly/SameSite=Strict, Secure em HTTPS. |
| Alta | Sessões encerradas podiam reaparecer na sincronização | Importação substitui sessões master; sincronização remove sessões remotas ausentes localmente. |
| Alta | Alteração de senha/CPF/perfil mantinha sessões anteriores | Sessões do usuário revogadas; mudanças da plataforma revogam outras sessões master. |
| Alta | Falhas remotas eram ignoradas e autenticação continuava com estado antigo | Sincronização interrompe operações em falhas; chamadas PostgREST verificam erros. |
| Alta | Requisições podiam intercalar leitura e escrita de snapshots | Ciclo de API serializado no processo; fila limitada; Vercel bloqueada enquanto essa arquitetura existir. |
| Alta | Servidor legado oferecia caminho alternativo sem proteções atuais | Inicialização standalone desativada; createApp restrito a banco em memória para testes. |
| Média | Login/conversão sem limite de tentativas | Contadores persistentes por identidade e globais, sem confiar em IP enviado pelo cliente. |
| Média | Corpo de requisição e senha sem limite superior | JSON até 1 MB; senha até 256 caracteres antes de scrypt. |
| Média | Perfil inválido era promovido implicitamente a operacional | Perfis inválidos rejeitados; preservado o último administrador da empresa. |
| Média | Bootstrap master podia escolher administrador operacional arbitrário | Apenas o usuário principal explicitamente identificado pode originar a conta master. |
| Média | Administrador de empresa podia redefinir todo o estoque pela API antiga | Redefinição de empresa exige Central de Administração; modos inválidos rejeitados. |
| Média | Arquivo compactado sem limite de expansão | Arquivo de até 10 MB, até 500 entradas e limite durante descompressão. |
| Média | IDs de empresa de snapshots usados em caminhos de arquivo | IDs validados antes de abrir o banco. |
| Média | Ausência de proteções de navegador e de origem | Cabeçalhos contra framing e sniffing; política de referência; mutações entre origens rejeitadas; APIs sem cache. |

Também corrigido retorno do cadastro de usuário que podia trocar a identidade exibida
na interface. Login com perfil incompatível remove a sessão temporária criada.

## Contenção aplicada no banco real

Com autorização explícita, foram encerradas as sessões nas tabelas e snapshots remotos,
e nos três bancos SQLite locais encontrados em `data/`. A consulta posterior confirmou
zero sessões remotas de ambiente original, empresas e administrador geral.
Nenhum usuário, senha ou dado de estoque foi removido.

O advisor de segurança do Supabase passou a apresentar apenas nove avisos informativos
`rls_enabled_no_policy`. São esperados: essas tabelas devem ser privadas e acessadas
exclusivamente pelo backend com service_role. Não criar políticas públicas para silenciá-los.
Referência: https://supabase.com/docs/guides/api/securing-your-api

## Validação

- 36 testes automatizados aprovados (`npm test`).
- Verificação TypeScript aprovada (`npx tsc --noEmit`).
- Build de produção aprovado em cópia isolada (`next build --webpack`).
- Teste HTTP da aplicação Next em produção: cookies, CPF, redirecionamento de empresa,
  isolamento de duas empresas, privilégio administrativo, bloqueio de reset operacional,
  rejeição de origem externa e invalidação após logout.
- `npm audit`: zero vulnerabilidades conhecidas nas dependências instaladas na consulta.
- Nenhum arquivo `.env` ou banco SQLite encontrado entre os arquivos versionados atuais.

## Pendências e limites de implantação

1. **Configuração:** usuário optou por configurar a chave secreta no servidor. A presença
   e o funcionamento dessa chave ainda não foram validados. Sem ela, a sincronização
   remota fica bloqueada. Reiniciar o servidor é necessário depois de configurar e
   disponibilizar o código atualizado. Não houve publicação remota do aplicativo.
2. **Arquitetura:** operar apenas um processo Node com disco persistente. O bloqueio de
   Vercel evita executar o modelo atual em instâncias efêmeras independentes. Outros
   provedores também não devem usar cluster/réplicas. A sincronização de tabelas locais
   e remotas ainda não constitui uma transação distribuída; uma interrupção pode deixar
   cópias parciais. Para escala e alta disponibilidade é necessária migração para
   transações centrais PostgreSQL, com identidade única e isolamento por empresa.
3. **Exposição anterior:** as permissões antigas permitiam leitura de hashes de senha e
   dados. Não há evidência nesta revisão para afirmar se houve exploração. Recomenda-se
   trocar as senhas existentes e revisar logs de acesso disponíveis. Encerrar sessões
   não torna um hash anteriormente copiado inacessível.
4. **Infraestrutura:** usar HTTPS; cookie Secure é aplicado quando a URL recebida pelo
   servidor é HTTPS. Validar a configuração do proxy em produção. Limites locais não
   substituem proteção de tráfego na borda. O limite global de login pode afetar outros
   usuários durante abuso intenso.
5. **Cobertura:** não foram executados pentest externo, análise histórica de commits,
   auditoria de contas do provedor, recuperação de backup nem teste de sincronização com
   chave privilegiada real. CSP atual restringe enquadramento, objetos e base URI, mas
   não é uma política estrita de scripts com nonce. HttpOnly reduz roubo de tokens e
   não elimina todo impacto de uma eventual vulnerabilidade XSS.
