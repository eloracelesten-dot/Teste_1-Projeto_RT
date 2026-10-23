# Testes do Portal da Reforma Tributária (Etapa 6)

## Como rodar os testes automatizados

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Abra `http://localhost:8765/tests/`. Os 59 testes rodam sozinhos em poucos segundos e mostram o resultado de cada um. Nada é gravado: os dados são os de demonstração e o SharePoint é simulado.

Rode a suíte a cada mudança no código e antes de cada publicação.

**Último resultado: 59 de 59 passaram** (23/10/2026, Edge/Chromium).

## O que os testes cobrem

| Código | Tema |
|---|---|
| T01 | Matriz de permissões dos quatro perfis |
| T02–T07 | Validações: obrigatórios, formatos, regras de ações, testes, marcos e usuários |
| T08–T09 | Anexos: extensão, tamanho, assinatura do conteúdo, nomes saneados |
| T10 | Status "Aprovado" fora do formulário |
| T11–T14 | Atrasos, indicadores, evolução mensal, dependências |
| T15–T24 | Cadastro, histórico, arquivamento, aprovação, versões, vínculos, remoção da demonstração, códigos repetidos, anexos |
| T25–T30 | Filtros, ordenação, todas as telas nos quatro perfis, proteção contra código injetado, acesso direto sem permissão |
| T31–T35 | Relatórios e planilhas Excel |
| T36–T41 | SharePoint (Graph simulado): listas, paginação, conflito, anexos em partes, autoria, remoção |
| T42 | Perfil pelos papéis do Entra ID |
| T43–T49 | Importação de planilhas: leitura de arquivo salvo pelo Excel, modelo, validação linha a linha, gravação com histórico, permissões e relatório de problemas |
| T50–T54 | Pareceres a partir de uma pasta: leitura de pasta compartilhada com subpastas e paginação, cadastro com cópia do documento e link do original, arquivos já cadastrados, linhas incompletas, conteúdo falso, arquivos do computador, permissões |
| T55–T59 | Perguntas e respostas, período MM/AAAA do parecer (inclusive vindo do Excel), solicitações e retornos, plano por área, colunas novas em listas já existentes no SharePoint |

## Matriz de requisitos

Cada requisito do pedido original, onde está e como foi verificado.

| Requisito | Onde | Verificação |
|---|---|---|
| **Visão geral:** indicadores calculados dos registros | `regras.indicadores`, `telas.visaoGeral` | T12, T13, T27 |
| Gráficos, próximos prazos, pendências críticas, últimas atualizações | `telas.visaoGeral` | T27 e conferência visual nas Etapas 2 e 3 |
| **Pareceres:** todos os campos pedidos | `esquema.pareceres` | T02, T15 |
| As 11 categorias | `RT.listas.categorias` | T03 |
| Pesquisa e filtros por categoria, período, responsável, status e unidade | `telas.barraFiltros` | T25, T26 |
| Anexo original e histórico de versões | anexos + histórico | T19, T24, T39 |
| Recebido, em elaboração, concluído e aprovado bem distintos; anexar não aprova | `regras.opcoesDeStatus`, `aprovarParecer` | T10, T18, T19, T30, T40 |
| **Plano:** campos, seis status, tabela, quadro e cronograma | `esquema.atividades`, `telas.plano` | T04, T27 |
| Prazos vencidos, ações críticas e dependências que travam | `regras.atrasada`, `bloqueiaOutras` | T11, T14 |
| **Impactos:** campos, 10 frentes, vínculo com ações | `esquema.impactos` | T12, T21 |
| **Sistemas e testes:** adequações, cenários, defeitos, cinco status de teste, vínculos | `esquema.adequacoes/testes/defeitos` | T05, T21, T27 |
| **Legislação:** normas, linha do tempo, legal × previsão × interno | `esquema.normas/marcos`, `telas.legislacao` | T06, T27 |
| **Decisões:** campos e histórico para não confundir antigas com vigentes | `novaVersaoDecisao`, `revogarDecisao` | T20 |
| **Relatórios:** os nove pedidos | `js/relatorios.js` | T31, T32 |
| Exportação Excel | `js/xlsx.js` | T33, T34, T35 e abertura no Excel (Etapa 5) |
| Exportação PDF | impressão do navegador | Conferência manual parcial (ver limitações) |
| Cadastrar, editar, consultar, arquivar | `js/repositorio.js` | T15, T16, T17 |
| Anexar formatos autorizados e validar arquivos | `regras.validarAnexo`, `validarConteudoAnexo` | T08, T09 |
| Relacionar registros de módulos diferentes | campos `ref`/`refs`, `referenciadoPor` | T21 |
| Registrar usuário e data das alterações | histórico + autoria do SharePoint | T15, T16, T40 |
| Controlar permissões e restringir edição por perfil | `regras.pode` | T01, T29, T42 |
| Evitar exclusão acidental | arquivamento + script de permissões | T17, T22 |
| Validar campos obrigatórios e formatos | `regras.validar` | T02, T03, T07 |
| Quatro perfis | `regras.pode`, papéis do Entra ID | T01, T42 |
| Documentos sem acesso anônimo | Static Web Apps + SharePoint | Configurado; depende de publicação |
| Dados de demonstração identificados e removíveis | `demonstracao: true` | T22, T41 |
| Identidade personalizável (logotipo, nome, cores) | `config.js`, variáveis CSS | Conferência manual |
| Perguntas e respostas | `esquema.perguntas`, `telas.perguntas` | T55 |
| Período de elaboração (MM/AAAA) e histórico de solicitações e retornos do parecer | `esquema.pareceres`, `telas.detalhe` | T56, T57 |
| Plano de implementação por área | `telas.plano` | T58 |
| Pareceres puxados da pasta de documentos da equipe (SharePoint, Teams, OneDrive) | `js/pasta.js` | T50–T54 (pasta simulada no Graph) e teste pela tela com arquivos do computador |
| Carga de dados em lote a partir de planilhas, com validação antes de gravar | `js/importacao.js` | T43–T49, com planilha de teste salva pelo Excel (`tests/fixtures/importacao-excel.xlsx`) |

## Experiência e acessibilidade

Auditoria automática nas 13 telas principais (desktop):

| Verificação | Resultado |
|---|---|
| Contraste de texto (WCAG AA: 4,5:1, ou 3:1 em texto grande) | Nenhum problema |
| Campos de formulário com rótulo | Nenhum problema |
| Botões e links com nome acessível | Nenhum problema |
| Imagens com texto alternativo | Nenhum problema |
| Um título principal (h1) por tela | Nenhum problema |
| IDs duplicados | Nenhum problema |

A auditoria foi conferida injetando de propósito um texto de baixo contraste e um campo sem rótulo: os dois foram detectados.

Outras verificações:
- **Celular (375 px):** 14 telas sem rolagem horizontal.
- **Teclado:**
  - link "Pular para o conteúdo";
  - foco visível em todos os elementos interativos;
  - a janela de confirmação prende o foco, fecha com Esc e devolve o foco ao botão de origem.
- **Corrigido nesta etapa:** foco escapando da janela de confirmação; falta do link de pular; cache de scripts antigos após publicação (agora há versão no endereço de cada script e `Cache-Control: no-cache` na hospedagem).

**Limitação conhecida:** no quadro do plano, mover cartões depende de arrastar com o mouse. Pelo teclado, a mudança de status é feita no formulário da ação.

## Limitações dos testes

- Nenhum teste rodou com Entra ID, SharePoint ou Static Web Apps reais.
- O script `configurar-permissoes.ps1` nunca foi executado; só a sintaxe foi conferida.
- O PDF gerado pela impressão não foi aberto e conferido: só o que a folha de estilo de impressão esconde e mostra.
- A aparência foi conferida em Chromium (Edge/Chrome). Firefox e Safari não foram testados.
- O encerramento de sessão por inatividade foi testado com limite reduzido, na Etapa 5; não está na suíte porque leva 30 segundos.

## Roteiro de testes com usuários (homologação)

Para validar a experiência com pessoas reais, de preferência uma de cada perfil, em homologação e sem ajuda. Anote para cada tarefa: concluiu (sim/não), tempo aproximado, onde hesitou e comentários.

| # | Perfil | Tarefa | Sucesso quando |
|---|---|---|---|
| 1 | Colaborador | Cadastrar um parecer recebido de uma consultoria, com o PDF | Parecer aparece como Recebido, com o arquivo e o seu nome no histórico |
| 2 | Colaborador | Encontrar todos os pareceres de "Créditos de IBS e CBS" recebidos no último mês | Usa pesquisa ou filtros e chega à lista certa |
| 3 | Colaborador | Atualizar o percentual de uma ação da sua área e marcá-la como bloqueada | Portal pede o motivo; ação aparece em "Bloqueadas" |
| 4 | Colaborador | Tentar editar uma ação de outra área | Percebe que não há botão de edição e entende por quê |
| 5 | Gestor | Aprovar internamente um parecer com análise concluída | Parecer fica "Aprovado internamente" e "Aprovação verificada" |
| 6 | Gestor | Registrar uma nova versão de uma decisão vigente | Versão anterior aparece como Substituída |
| 7 | Gestor | Descobrir quais ações estão atrasadas e quais travam outras | Usa os destaques do plano ou o relatório de pendências |
| 8 | Gestor | Exportar o relatório de pareceres para Excel e salvar a Visão geral em PDF | Arquivos abrem e mostram os filtros usados |
| 9 | Consulta | Ver os prazos legais dos próximos 6 meses | Chega à linha do tempo ou ao relatório de prazos |
| 10 | Administrador | Cadastrar um usuário novo como Colaborador e remover os dados de demonstração | Usuário aparece na lista; contador de demonstração zera |

Critério de aceite sugerido: pelo menos 8 das 10 tarefas concluídas sem ajuda, e nenhum erro que impeça concluir uma tarefa.
