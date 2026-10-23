# Guia do usuário

Portal da Reforma Tributária: onde ficam os pareceres, o plano de implementação, os impactos, os testes de sistemas, a legislação e as decisões do projeto.

## Entrar

Abra o endereço do portal e entre com sua conta corporativa. O que você pode fazer depende do seu perfil:

| Perfil | Pode |
|---|---|
| Consulta | Ver tudo o que tem acesso. Não cadastra, não edita, não exporta. |
| Colaborador | Cadastrar registros e editar os da sua área ou sob sua responsabilidade. Exportar. |
| Gestor | Tudo do Colaborador em qualquer área, mais aprovar pareceres, registrar e revogar decisões e arquivar registros. |
| Administrador | Usuários, perfis, criação das listas e remoção dos dados de demonstração. |

Se algum botão não aparece para você, é porque seu perfil não permite aquela ação. Fale com o gestor do projeto.

Por segurança, a sessão é encerrada depois de 30 minutos sem uso.

## Pesquisar

- **Em todo o portal:** use a caixa de pesquisa no topo.
- **Dentro de um módulo:** use os filtros acima da lista. "Incluir arquivados" mostra também o que foi arquivado.
- **Ordenar:** clique no título de uma coluna para ordenar; clique de novo para inverter.

## Pareceres e estudos

1. **Cadastrar:** clique em **Novo parecer**, preencha os campos marcados com * e anexe o documento original.
2. **Status:** todo documento novo entra como **Recebido**. Durante a análise, mude para **Em elaboração** e, ao terminar, para **Análise concluída**.
3. **Aprovar:** só um **Gestor** aprova, pelo botão **Aprovar internamente** na tela do parecer. A aprovação fica registrada com nome e data.
4. **Nova versão do documento:** anexar uma nova versão a um parecer aprovado devolve o parecer para **Análise concluída**, e ele precisa de nova aprovação.

**Documentos que já estão na pasta da equipe:** em **Pareceres e estudos** › **Documentos da pasta**, o portal lista os arquivos da pasta de pareceres (SharePoint, Teams ou OneDrive) que ainda não viraram parecer.
1. Marque os arquivos.
2. Confira o título e a data sugeridos.
3. Complete tipo, categoria, origem, área e descrição. O botão **Aplicar aos selecionados** preenche o mesmo valor em vários de uma vez.
4. Cadastre.

O documento é copiado para o portal, o link do original fica guardado e o arquivo aparece como "Já cadastrado" na próxima vez. Detalhes na seção 6.3 do [passo a passo](PASSO-A-PASSO-DADOS-REAIS.md).

**Período e histórico do parecer:**
- **Período de elaboração** guarda o mês e o ano em que o parecer foi feito (`MM/AAAA`).
- Na tela do parecer, **Solicitações e retornos** mostra a linha do tempo: o que foi pedido à consultoria ou à área e o que voltou.
- Use **Registrar solicitação** e **Registrar retorno** a cada etapa. Os registros ficam com data e autor e não podem ser apagados.

"Aprovação verificada" quer dizer que o portal confirmou, pelo registro do SharePoint, que um gestor gravou a aprovação.

## Perguntas e respostas

Dúvidas da equipe sobre a reforma e as respostas dadas.
- Clique numa pergunta para ver a resposta, quem respondeu, quando e em quais pareceres e normas ela se apoia.
- Os botões **Aguardando resposta**, **Respondida** e **Em revisão** filtram a lista. A pesquisa procura na pergunta e na resposta.
- **Nova pergunta** registra a dúvida com seu nome e a data de hoje.
- Uma pergunta só pode ser marcada como **Respondida** com a resposta, quem respondeu e a data.

## Plano de implementação

- **Plano por área:** no topo, escolha a área (Fiscal e tributária, Contratos…). A tabela, o quadro, o cronograma e os números passam a mostrar só o plano dela, com o resumo da área e os responsáveis com ações em aberto. **Nova ação nesta área** já vem com a área preenchida. **Todas as áreas** volta ao plano completo.

- **Visualizações:**
  - **Tabela:** lista completa, com filtros;
  - **Quadro:** colunas por status. Arraste um cartão para mudar o status;
  - **Cronograma:** barras por prazo, com a linha de hoje.
- **Destaques:** os botões **Atrasadas**, **Críticas**, **Bloqueadas** e **Travando outras** filtram rapidamente.
- **Bloquear ou cancelar** exige descrever o motivo. **Concluir** exige a data de conclusão.
- **Dependências:** uma ação pode depender de outras. O portal mostra quem está esperando quem e não aceita dependências circulares.

## Impactos, sistemas e testes

- **Matriz de impactos:** clique em um número para filtrar a lista por frente e criticidade.
- **Vínculos:** cada impacto aponta para as ações que o resolvem e os pareceres que o fundamentam. Na tela de cada registro, a seção **Vínculos** mostra também onde ele é citado.
- **Testes:**
  - teste aprovado ou reprovado exige o resultado obtido, a data e quem executou;
  - em um teste reprovado, use **Registrar defeito**.

## Legislação e cronograma

Cada marco tem uma natureza:
- **Legal:** prazo confirmado em norma publicada;
- **Previsão:** depende de regulamentação ainda não publicada;
- **Interno:** prazo do próprio projeto.

Normas são cadastradas sempre com o link da publicação oficial.

## Decisões e diretrizes

Uma decisão vigente não é editada.
- **Registrar nova versão:** a versão anterior continua visível, marcada como **Substituída**.
- **Revogar:** a decisão deixa de valer e continua consultável. A revogação exige um motivo.

## Relatórios e exportação

- **Relatórios:** no menu **Relatórios**, escolha um relatório e ajuste os filtros.
- **Exportar Excel:** gera uma planilha com os filtros aplicados e uma aba "Sobre" com quem gerou e quando.
- **Imprimir ou salvar PDF:** abre a impressão do navegador. Para gerar o PDF, escolha "Salvar como PDF".
- **Listas dos módulos:** também têm os botões **Excel** e **Imprimir ou PDF**.

Toda exportação fica registrada. As planilhas são documentos internos: não compartilhe fora da empresa.

## Importar planilha (Gestor e Administrador)

Para cadastrar muitos registros de uma vez, use o menu **Importar planilha**:
1. Escolha o módulo e baixe o modelo em Excel.
2. Preencha uma linha por registro.
3. Envie o arquivo.
4. Confira as colunas.
5. Valide e grave.

Linhas com erro não são gravadas e aparecem com o motivo, e o relatório de problemas pode ser baixado em Excel. O passo a passo completo está em [PASSO-A-PASSO-DADOS-REAIS.md](PASSO-A-PASSO-DADOS-REAIS.md), seção 6.4.

## Arquivar em vez de excluir

Registros não são excluídos. **Arquivar** (Gestor ou Administrador) tira o registro das listas e dos indicadores, mas ele continua consultável com "Incluir arquivados" e pode ser restaurado.
