# Acessos por usuário

## Uso

Na conta de administrador da empresa, abra **Usuários e acessos → Editar acesso**. Escolha administrador, operacional personalizado, somente consulta ou técnico e salve. As permissões de consulta, cadastros, movimentações, ajuste de saldo e exportação são independentes. Para um operacional movimentar peças de um técnico, é necessário também permitir a consulta dos estoques dos técnicos.

Consultar um técnico mantém a identidade de quem está conectado. Os registros realizados pelo operacional identificam o operador real. Técnicos permanecem limitados ao próprio estoque; ajustar saldos não faz parte do acesso padrão do técnico. Administrar uma empresa não concede acesso à administração da plataforma nem a outras empresas.

O próprio usuário não altera seu perfil de acesso. Não é possível remover ou rebaixar o último administrador da empresa.

## Compatibilidade e armazenamento

Na primeira atualização sem permissões gravadas, a conta operacional mais antiga da empresa passa a ser seu administrador; outras contas operacionais recebem permissões padrão limitadas. O administrador deve revisar a equipe após a atualização. Novos operacionais não se tornam administradores automaticamente.

As permissões locais usam `app_meta.company_access_v1`. Em modo remoto, um registro dedicado `__access_policy__:<empresa>` na tabela existente `app_meta` é consultado em cada requisição autenticada. Ele fica fora das gravações de inventário e usa comparação da versão anterior ao salvar, impedindo que um inventário antigo restaure permissões revogadas. Falhas na consulta das permissões bloqueiam a operação. Não há alteração de colunas.

## Validação realizada em 23/11/2026

- 59 testes automatizados de domínio, autenticação, empresas e permissões passaram.
- Teste de integração com aplicação Next compilada: bloqueios por ação, revogação na mesma sessão, tentativa de autopromoção, identidade do operador, isolamento do técnico e caminhos indiretos de alteração passaram.
- Compilação de produção e verificação TypeScript passaram.
- Interface local: administrador abriu e salvou permissões existentes; formulário verificado no desktop e largura de celular de 390 px, sem transbordamento horizontal.
- Sincronização de permissões: testes simulados de conflito entre instâncias e indisponibilidade remota passaram.

A mudança não foi publicada nesta etapa. Os testes de sincronização não substituem uma validação com duas empresas no Supabase/Vercel publicado. Esta entrega não resolve nem certifica os demais riscos históricos de concorrência e persistência dos snapshots de estoque.
