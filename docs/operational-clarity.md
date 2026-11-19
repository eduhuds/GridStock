# Ajustes da rotina operacional e do técnico

## Contrato da interface

- Referência: revisão do sistema publicado em 18/11/2026 e imagem de login fornecida pelo usuário.
- Técnico: saldo e ações antes de instruções; informar onde usou a peça e uma referência opcional, sem incluir chegada ou conclusão de atendimento.
- Operacional: ver origem, destino e saldo antes/depois; reposição separada entre bases e equipe; local de uso disponível no histórico.
- Login: papel claro, verde da marca e lima como detalhe; formulário com hierarquia compacta; alternância local de perfil preservada e animação reduzida conforme preferência do dispositivo.
- Viewports de verificação: 1440x900 e 390x844.
- Formulários: foco contido na janela, rótulos e erro explícitos, envio bloqueado para quantidade inválida, servidor mantendo suas validações.
- Histórico: tabela no desktop e cartões no celular, preservando filtros, paginação, local, referência, responsável e comprovantes.

## Estados e critérios

- Carregamento: botão informa salvamento e impede reenvio.
- Vazio: explicar ausência de saldo e permitir escolher outra peça ou retirada.
- Erro: informar saldo insuficiente/quantidade inválida antes do envio; erro do servidor permanece visível.
- Parcial: campos opcionais ausentes não escondem local, quantidade ou responsável.
- Sucesso: movimentação atualiza saldo e histórico, com mensagem de confirmação.
- Permissão: técnico mantém apenas operações autorizadas; GPS é opcional e depende de escolha explícita.

As verificações e capturas ficam fora do repositório, em `workspace-clarity-evidence`, sem dados de produção ou credenciais.

## Validação concluída em 19/11/2026

- 51 testes automatizados aprovados, incluindo concordância da prévia com os saldos efetivamente gravados, quantidades inválidas e utilização manual sem chegada. Compilação de produção aprovada após os últimos ajustes.
- Fluxo local com acessos separados de operacional e técnico: retirada, utilização com endereço manual e referência, devolução e tentativa de ação administrativa negada ao técnico. O uso não altera o status de atendimento.
- Conferência visual em 1440x900 e 390x844: login, alternância de perfil, jornada do técnico, formulário de utilização, ausência de saldo e histórico em cartões. Os temas claro e escuro foram inspecionados.
- Teclado: foco inicial no título da janela, Tab e Shift+Tab contidos nela, fechamento com Escape e retorno ao botão de origem. Preferência de movimento reduzido respeitada.
- Operacional: retirada de demonstração conferida com base 64 → 4 e técnico 8 → 68; alerta da base passou a indicar reposição de 21 para o mínimo 25, separado dos cinco alertas de técnicos. O atalho de reposição preservou produto, localização e situação do saldo.
- Utilização manual feita pela interface móvel apareceu no operacional com local completo e referência. Histórico móvel sem rolagem horizontal.

Estas verificações usaram bancos locais isolados. Não houve alteração de dados de produção, publicação, mudança no armazenamento ou validação de câmera/GPS em aparelho físico nesta entrega.
