/*
 * Dados de demonstração. TODOS FICTÍCIOS.
 * Pessoas, consultorias, pareceres, ações, impactos, testes, defeitos, decisões e prazos internos
 * foram inventados para mostrar o funcionamento do portal. As únicas referências reais são
 * a EC 132/2023, a LC 214/2025 e os marcos da transição definidos nelas.
 * Cada registro recebe `demonstracao: true` e pode ser removido em lote pela Administração.
 */
window.RT = window.RT || {};

RT.dadosDemo = function () {
  const U = (nome, area, perfil) => ({
    nome, area, perfil, ativo: true,
    email: nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(" ", ".") + "@exemplo.com.br"
  });

  const usuarios = [
    U("Sérgio Ramos", "Sistemas e tecnologia", "Administrador"),
    U("Mariana Costa", "Fiscal e tributária", "Gestor"),
    U("Rafael Lima", "Fiscal e tributária", "Colaborador"),
    U("Diego Martins", "Obrigações acessórias", "Colaborador"),
    U("Juliana Prado", "Suprimentos e compras", "Colaborador"),
    U("André Souza", "Contábil", "Colaborador"),
    U("Camila Rocha", "Contratos", "Colaborador"),
    U("Bruno Teixeira", "Sistemas e tecnologia", "Colaborador"),
    U("Tiago Nunes", "Sistemas e tecnologia", "Colaborador"),
    U("Patrícia Melo", "Cadastros", "Colaborador"),
    U("Lucas Ferreira", "Faturamento", "Colaborador"),
    U("Renata Alves", "Financeira", "Colaborador"),
    U("Fernanda Lopes", "Dados e relatórios", "Colaborador"),
    U("Paulo Henrique", "Diretoria", "Consulta")
  ];

  const anexo = (nome, kb, versao, por, em) => ({ nome, tamanho: kb * 1024, versao, enviadoPor: por, enviadoEm: em });
  const demoConclusao = "Texto de demonstração. As conclusões de um parecer real são copiadas do documento original e revisadas pelo responsável pela análise.";

  const P = (codigo, titulo, tipo, categoria, origem, dataRecebimento, status, responsavel, area, extra) => Object.assign({
    codigo, titulo, tipo, categoria, origem, dataRecebimento, status, responsavel: responsavel || "", area,
    descricao: "Descrição de demonstração. Neste campo vai o objetivo do documento e a pergunta que ele responde.",
    periodo: `${dataRecebimento.slice(5, 7)}/${dataRecebimento.slice(0, 4)}`, interacoes: [],
    resumo: "", conclusoes: "", legislacao: "LC 214/2025", prazo: "", unidades: ["Distribuição"], anexos: [],
    aprovadoPor: "", aprovadoEm: ""
  }, extra || {});

  const pareceres = [
    P("PT-003", "Mapeamento inicial de operações sujeitas a IBS e CBS", "Estudo", "Incidência tributária", "Interno · Fiscal", "2026-03-02", "Aprovado internamente", "Rafael Lima", "Fiscal e tributária",
      { conclusoes: demoConclusao, aprovadoPor: "Mariana Costa", aprovadoEm: "2026-04-06T10:12:00", unidades: ["Distribuição", "Transmissão", "Geração"],
        anexos: [anexo("PT-003_mapeamento_operacoes.xlsx", 310, 1, "Rafael Lima", "2026-03-02T09:00:00")] }),
    P("PT-008", "Compras de materiais de fornecedores optantes pelo Simples Nacional", "Estudo", "Compras e contratação de serviços", "Interno · Suprimentos", "2026-06-10", "Aprovado internamente", "Juliana Prado", "Suprimentos e compras",
      { conclusoes: demoConclusao, aprovadoPor: "Mariana Costa", aprovadoEm: "2026-07-08T15:40:00",
        anexos: [anexo("PT-008_estudo_simples.pdf", 820, 1, "Juliana Prado", "2026-06-10T11:00:00")] }),
    P("PT-011", "Leitura da LC 214/2025 aplicada ao faturamento de energia", "Apresentação", "Interpretação jurídica e legislação", "Consultoria Alfa (fictícia)", "2026-07-01", "Aprovado internamente", "Mariana Costa", "Fiscal e tributária",
      { conclusoes: demoConclusao, aprovadoPor: "Mariana Costa", aprovadoEm: "2026-07-20T09:30:00",
        anexos: [anexo("PT-011_apresentacao.pptx", 2400, 1, "Mariana Costa", "2026-07-01T14:00:00")] }),
    P("PT-014", "Créditos de CBS na aquisição de serviços de manutenção", "Parecer", "Créditos de IBS e CBS", "Consultoria Alfa (fictícia)", "2026-08-12", "Aprovado internamente", "Mariana Costa", "Fiscal e tributária",
      { descricao: "Avaliar se a aquisição de serviços de manutenção de rede, contratados de terceiros, gera direito a crédito de CBS, e em quais condições o crédito pode ser aproveitado.",
        resumo: "Texto de demonstração. Neste campo entra o resumo executivo redigido pela consultoria ou pela área tributária.",
        conclusoes: demoConclusao, prazo: "2026-10-15", unidades: ["Distribuição", "Transmissão"], periodo: "08/2026",
        interacoes: [
          { tipo: "Solicitação", data: "2026-07-28", texto: "Solicitada à Consultoria Alfa a avaliação do crédito de CBS nos contratos de manutenção de rede, com prazo de 15 dias.", registradoPor: "Mariana Costa", registradoEm: "2026-07-28T10:00:00" },
          { tipo: "Retorno", data: "2026-08-12", texto: "Recebida a versão 1 do parecer.", registradoPor: "Mariana Costa", registradoEm: "2026-08-12T17:02:00" },
          { tipo: "Solicitação", data: "2026-08-20", texto: "Pedido de esclarecimento sobre serviços com material incluso.", registradoPor: "Rafael Lima", registradoEm: "2026-08-20T09:15:00" },
          { tipo: "Retorno", data: "2026-09-30", texto: "Recebida a versão 3, com o esclarecimento incorporado.", registradoPor: "Mariana Costa", registradoEm: "2026-09-30T14:48:00" }
        ],
        aprovadoPor: "Mariana Costa", aprovadoEm: "2026-10-21T09:42:00",
        anexos: [
          anexo("PT-014_parecer_v1.pdf", 1050, 1, "Mariana Costa", "2026-08-12T17:02:00"),
          anexo("PT-014_parecer_v2.pdf", 1130, 2, "Mariana Costa", "2026-09-02T10:12:00"),
          anexo("PT-014_parecer_v3.pdf", 1230, 3, "Mariana Costa", "2026-09-30T14:48:00"),
          anexo("PT-014_memoria_calculo.xlsx", 84, 1, "Juliana Prado", "2026-10-05T11:20:00")
        ] }),
    P("PT-016", "Tratamento contábil dos créditos de IBS e CBS", "Nota técnica", "Contabilidade e apuração", "Interno · Contábil", "2026-08-20", "Análise concluída", "André Souza", "Contábil",
      { prazo: "2026-10-10", anexos: [anexo("PT-016_nota_tecnica.docx", 190, 2, "André Souza", "2026-10-02T16:00:00")] }),
    P("PT-019", "Destaque de IBS e CBS na NF3e durante o ano de teste", "Nota técnica", "Documentos fiscais eletrônicos", "Interno · Fiscal", "2026-09-03", "Análise concluída", "Rafael Lima", "Fiscal e tributária",
      { prazo: "2026-10-03", anexos: [anexo("PT-019_nota_nf3e.pdf", 640, 1, "Rafael Lima", "2026-09-03T10:00:00")] }),
    P("PT-021", "Impacto do IBS no custo de materiais de estoque", "Estudo", "Contabilidade e apuração", "Interno · Contábil", "2026-09-25", "Em elaboração", "André Souza", "Contábil",
      { prazo: "2026-11-15", anexos: [anexo("PT-021_estudo_v1.xlsx", 260, 1, "André Souza", "2026-09-25T09:00:00"), anexo("PT-021_estudo_v2.xlsx", 275, 2, "André Souza", "2026-10-18T15:27:00")] }),
    P("PT-022", "Cláusulas de repasse tributário em contratos de serviço", "Parecer", "Contratos e fornecedores", "Consultoria Beta (fictícia)", "2026-09-29", "Em elaboração", "Camila Rocha", "Contratos",
      { prazo: "2026-10-31", anexos: [anexo("PT-022_parecer_minuta.pdf", 980, 1, "Camila Rocha", "2026-09-29T13:00:00")] }),
    P("PT-023", "Parametrização de CST e cClassTrib no ERP", "Nota técnica", "Parametrização de sistemas", "Interno · TI Fiscal", "2026-10-02", "Em elaboração", "Bruno Teixeira", "Sistemas e tecnologia",
      { prazo: "2026-10-24", anexos: [anexo("PT-023_parametros.xlsx", 150, 1, "Bruno Teixeira", "2026-10-02T09:00:00")] }),
    P("PT-024", "Escrituração de IBS e CBS nas obrigações acessórias", "Parecer", "Obrigações acessórias", "Consultoria Alfa (fictícia)", "2026-09-28", "Recebido", "", "Obrigações acessórias",
      { anexos: [anexo("PT-024_parecer.pdf", 1500, 1, "Diego Martins", "2026-09-28T16:00:00")] }),
    P("PT-025", "Efeitos da CBS no fluxo de caixa e no capital de giro", "Estudo", "Impactos financeiros", "Consultoria Beta (fictícia)", "2026-10-07", "Recebido", "", "Financeira",
      { anexos: [anexo("PT-025_estudo.pdf", 2100, 1, "Renata Alves", "2026-10-07T10:00:00")] }),
    P("PT-026", "Incidência de IBS e CBS sobre encargos setoriais na conta de energia", "Parecer", "Incidência tributária", "Consultoria Alfa (fictícia)", "2026-10-14", "Recebido", "", "Fiscal e tributária",
      { anexos: [anexo("PT-026_parecer.pdf", 1700, 1, "Mariana Costa", "2026-10-14T11:00:00")] })
  ];

  const A = (codigo, nome, frente, responsavel, inicio, prazo, status, prioridade, percentual, extra) => Object.assign({
    codigo, nome, frente, area: frente, responsavel, inicio, prazo, status, prioridade, percentual,
    descricao: "", dependencias: [], riscos: "", documentos: [], evidencias: [], resultadoEsperado: "", dataConclusao: ""
  }, extra || {});

  const atividades = [
    A("AT-001", "Levantar operações sujeitas a IBS e CBS", "Fiscal e tributária", "Rafael Lima", "2026-02-02", "2026-03-31", "Concluída", "Alta", 100, { dataConclusao: "2026-03-27", documentos: ["PT-003"] }),
    A("AT-002", "Mapear contratos de serviço vigentes", "Contratos", "Camila Rocha", "2026-02-16", "2026-04-15", "Concluída", "Média", 100, { dataConclusao: "2026-04-10" }),
    A("AT-003", "Inventariar sistemas afetados pela reforma", "Sistemas e tecnologia", "Bruno Teixeira", "2026-02-16", "2026-03-31", "Concluída", "Alta", 100, { dataConclusao: "2026-03-30" }),
    A("AT-004", "Definir governança e rotina de acompanhamento do projeto", "Fiscal e tributária", "Mariana Costa", "2026-03-02", "2026-03-20", "Concluída", "Média", 100, { dataConclusao: "2026-03-18" }),
    A("AT-005", "Capacitar a equipe fiscal na LC 214/2025", "Fiscal e tributária", "Mariana Costa", "2026-03-16", "2026-04-30", "Concluída", "Média", 100, { dataConclusao: "2026-04-28" }),
    A("AT-006", "Contratar consultoria para pareceres", "Fiscal e tributária", "Mariana Costa", "2026-03-02", "2026-05-15", "Concluída", "Alta", 100, { dataConclusao: "2026-05-12" }),
    A("AT-008", "Definir layout do relatório gerencial de carga tributária", "Dados e relatórios", "Fernanda Lopes", "2026-07-01", "2026-09-30", "Em andamento", "Média", 80),
    A("AT-010", "Criar contas contábeis de IBS e CBS a recuperar", "Contábil", "André Souza", "2026-06-01", "2026-07-31", "Concluída", "Alta", 100, { dataConclusao: "2026-07-29" }),
    A("AT-012", "Mapear CST e cClassTrib por tipo de fornecimento", "Fiscal e tributária", "Rafael Lima", "2026-08-01", "2026-10-17", "Em andamento", "Crítica", 70, { documentos: ["PT-023"] }),
    A("AT-014", "Ajustar emissão da NF3e para o ano de teste", "Sistemas e tecnologia", "Bruno Teixeira", "2026-05-04", "2026-08-31", "Concluída", "Crítica", 100, { dataConclusao: "2026-08-28", documentos: ["PT-019"] }),
    A("AT-015", "Revisar cadastro de materiais com a nova classificação", "Cadastros", "Patrícia Melo", "2026-06-15", "2026-09-15", "Em andamento", "Média", 85),
    A("AT-017", "Contratar segunda consultoria para revisão de contratos", "Contratos", "Camila Rocha", "2026-06-01", "2026-07-15", "Cancelada", "Baixa", 0, { riscos: "Cancelada: o escopo foi incorporado ao parecer PT-022." }),
    A("AT-020", "Definir premissas de fluxo de caixa com a CBS", "Financeira", "Renata Alves", "2026-08-03", "2026-10-09", "Em andamento", "Alta", 50),
    A("AT-026", "Simular apuração assistida da CBS com dados de setembro", "Fiscal e tributária", "Diego Martins", "2026-09-01", "2026-10-15", "Concluída", "Alta", 100, { dataConclusao: "2026-10-14" }),
    A("AT-029", "Mapear efeitos da CBS no fluxo de caixa", "Financeira", "Renata Alves", "2026-09-15", "2026-11-21", "Bloqueada", "Alta", 15, { riscos: "Aguarda a análise do estudo PT-025, ainda sem responsável.", documentos: ["PT-025"] }),
    A("AT-031", "Validar cálculo de crédito de CBS na compra de materiais", "Suprimentos e compras", "Juliana Prado", "2026-08-15", "2026-10-24", "Em validação", "Alta", 90, { documentos: ["PT-014"] }),
    A("AT-033", "Ajustar plano de contas para IBS e CBS a recuperar", "Contábil", "André Souza", "2026-09-01", "2026-10-31", "Em andamento", "Alta", 60, { dependencias: ["AT-010"], documentos: ["PT-014", "PT-016"] }),
    A("AT-036", "Definir regra de repasse tributário nos contratos de serviço", "Contratos", "Camila Rocha", "2026-09-01", "2026-11-07", "Bloqueada", "Crítica", 30, { riscos: "Aguarda a conclusão do parecer PT-022.", documentos: ["PT-022"] }),
    A("AT-038", "Concluir testes de emissão da NF3e com novos grupos", "Sistemas e tecnologia", "Bruno Teixeira", "2026-09-15", "2026-11-14", "Em andamento", "Crítica", 55, { dependencias: ["AT-014"], documentos: ["PT-019"] }),
    A("AT-040", "Parametrizar CBS plena no ERP", "Sistemas e tecnologia", "Bruno Teixeira", "2026-11-03", "2026-12-31", "Não iniciada", "Crítica", 0, { dependencias: ["AT-012", "AT-033"] }),
    A("AT-041", "Atualizar cadastro de fornecedores com regime do IBS e da CBS", "Cadastros", "Patrícia Melo", "2026-11-03", "2026-11-28", "Não iniciada", "Média", 0),
    A("AT-044", "Revisar contratos de fornecimento com cláusula tributária", "Contratos", "Camila Rocha", "2026-11-10", "2026-12-12", "Não iniciada", "Alta", 0, { dependencias: ["AT-036"] }),
    A("AT-047", "Ajustar pedidos de compra para destaque de CBS", "Suprimentos e compras", "Juliana Prado", "2026-11-10", "2026-12-18", "Não iniciada", "Alta", 0, { dependencias: ["AT-036"] }),
    A("AT-048", "Homologar escrituração fiscal com IBS e CBS", "Obrigações acessórias", "Diego Martins", "2027-01-05", "2027-03-31", "Não iniciada", "Crítica", 0, { dependencias: ["AT-056"], documentos: ["PT-024"] }),
    A("AT-050", "Validar faturamento com base de cálculo por componente", "Faturamento", "Lucas Ferreira", "2026-09-01", "2026-10-30", "Em andamento", "Alta", 40),
    A("AT-052", "Atualizar treinamento do atendimento sobre a fatura de 2027", "Faturamento", "Lucas Ferreira", "2026-10-01", "2026-11-30", "Em andamento", "Baixa", 20),
    A("AT-054", "Rever premissas tributárias do orçamento de 2027", "Financeira", "Renata Alves", "2026-10-05", "2026-11-20", "Em validação", "Alta", 85),
    A("AT-056", "Validar escrituração do período de teste", "Obrigações acessórias", "Diego Martins", "2026-08-01", "2026-10-10", "Bloqueada", "Alta", 40, { riscos: "Aguarda a adequação AS-11 no sistema de escrituração." })
  ];

  const I = (codigo, processo, area, sistema, criticidade, status, atividades, pareceres, extra) => Object.assign({
    codigo, processo, area, sistema, criticidade, status, atividades, pareceres,
    tipoOperacao: "", tributo: "IBS e CBS", cenarioAtual: "", mudanca: "", impactoEsperado: "", responsavel: "", acao: ""
  }, extra || {});

  const impactos = [
    I("IM-001", "Emissão da nota de energia elétrica no ano de teste", "Faturamento", "Emissor NF3e", "Alta", "Adequado", ["AT-014"], ["PT-019"],
      { tipoOperacao: "Venda de energia", mudanca: "Destacar IBS e CBS no documento fiscal durante o ano de teste.", responsavel: "Lucas Ferreira" }),
    I("IM-003", "Emissão da nota de energia elétrica a partir de 2027", "Faturamento", "Emissor NF3e", "Alta", "Em tratamento", ["AT-038"], ["PT-019"],
      { tipoOperacao: "Venda de energia", mudanca: "Incluir os novos grupos de IBS e CBS no XML da NF3e.", responsavel: "Lucas Ferreira" }),
    I("IM-005", "Base de cálculo por componente da fatura", "Faturamento", "Faturamento comercial", "Média", "Em tratamento", ["AT-050"], [],
      { mudanca: "Separar a base de cálculo de cada componente da fatura.", responsavel: "Lucas Ferreira" }),
    I("IM-006", "Atendimento ao consumidor sobre a nova fatura", "Faturamento", "", "Baixa", "Identificado", ["AT-052"], [],
      { mudanca: "Atualizar roteiros e treinamento do atendimento.", responsavel: "Lucas Ferreira" }),
    I("IM-008", "Contratação de serviços de manutenção", "Fiscal e tributária", "ERP · módulo fiscal", "Alta", "Em tratamento", ["AT-031"], ["PT-014"],
      { tipoOperacao: "Aquisição de serviço", tributo: "CBS · não cumulatividade", responsavel: "Rafael Lima",
        cenarioAtual: "O ERP calcula créditos apenas de PIS e Cofins, pela regra vigente.",
        mudanca: "Registrar e conciliar o crédito de CBS por documento, conforme o tratamento definido no parecer.",
        impactoEsperado: "Sem o ajuste, o crédito não é apropriado e o custo do serviço fica maior que o devido.",
        acao: "Ajustar o cálculo no ERP e validar com a memória de cálculo do parecer." }),
    I("IM-009", "Classificação tributária por tipo de fornecimento", "Fiscal e tributária", "ERP · módulo fiscal", "Alta", "Em tratamento", ["AT-012"], ["PT-023"],
      { mudanca: "Definir CST e cClassTrib para cada tipo de fornecimento.", responsavel: "Rafael Lima" }),
    I("IM-010", "Apuração assistida da CBS", "Fiscal e tributária", "ERP · módulo fiscal", "Média", "Adequado", ["AT-026"], [],
      { mudanca: "Conferir a apuração assistida com os dados internos.", responsavel: "Diego Martins" }),
    I("IM-012", "Lançamento de tributos a recuperar", "Contábil", "ERP · contábil", "Média", "Em tratamento", ["AT-033"], ["PT-014", "PT-016"],
      { mudanca: "Criar e usar contas de IBS e CBS a recuperar.", responsavel: "André Souza" }),
    I("IM-013", "Custo de materiais em estoque", "Contábil", "ERP · contábil", "Média", "Identificado", [], ["PT-021"],
      { mudanca: "Rever a composição do custo de estoque com o IBS.", responsavel: "André Souza" }),
    I("IM-015", "Preço em contratos de serviço", "Contratos", "Gestão de contratos", "Alta", "Em tratamento", ["AT-036"], ["PT-022"],
      { mudanca: "Prever cláusula de repasse da nova tributação.", responsavel: "Camila Rocha" }),
    I("IM-016", "Contratos de fornecimento de materiais", "Contratos", "Gestão de contratos", "Média", "Identificado", ["AT-044"], [],
      { mudanca: "Revisar cláusulas tributárias dos contratos de fornecimento.", responsavel: "Camila Rocha" }),
    I("IM-018", "Pedidos de compra com destaque de CBS", "Suprimentos e compras", "ERP · suprimentos", "Média", "Identificado", ["AT-047"], [],
      { mudanca: "Exibir a CBS nos pedidos de compra.", responsavel: "Juliana Prado" }),
    I("IM-019", "Cadastro de fornecedores", "Cadastros", "ERP · suprimentos", "Baixa", "Identificado", ["AT-041"], [],
      { mudanca: "Registrar o regime de cada fornecedor no IBS e na CBS.", responsavel: "Patrícia Melo" }),
    I("IM-020", "Cadastro de materiais", "Cadastros", "ERP · suprimentos", "Baixa", "Em tratamento", ["AT-015"], [],
      { mudanca: "Revisar a classificação dos materiais.", responsavel: "Patrícia Melo" }),
    I("IM-021", "Previsão de caixa", "Financeira", "Tesouraria", "Média", "Identificado", ["AT-020", "AT-029"], ["PT-025"],
      { mudanca: "Rever premissas de pagamento de tributos.", responsavel: "Renata Alves" }),
    I("IM-024", "Escrituração fiscal", "Obrigações acessórias", "Escrituração fiscal", "Alta", "Identificado", ["AT-048", "AT-056"], ["PT-024"],
      { mudanca: "Gerar os novos registros de IBS e CBS na escrituração.", responsavel: "Diego Martins" }),
    I("IM-026", "Parametrização da CBS plena", "Sistemas e tecnologia", "ERP · módulo fiscal", "Alta", "Identificado", ["AT-040"], [],
      { mudanca: "Parametrizar o ERP para a CBS integral a partir de 2027.", responsavel: "Bruno Teixeira" }),
    I("IM-027", "Relatório gerencial de carga tributária", "Dados e relatórios", "Power BI", "Baixa", "Em tratamento", ["AT-008"], [],
      { mudanca: "Separar PIS, Cofins, CBS e IBS no período de transição.", responsavel: "Fernanda Lopes" })
  ];

  const S = (codigo, sistema, requisito, alteracao, respTecnico, respTributario, status, impactos, atividades, pareceres, extra) => Object.assign({
    codigo, sistema, requisito, alteracao, respTecnico, respTributario, status, impactos, atividades, pareceres, processo: "", dependencias: ""
  }, extra || {});

  const adequacoes = [
    S("AS-01", "Emissor NF3e", "Destaque de IBS e CBS no ano de teste", "Incluir os campos de IBS e CBS no XML durante 2026.", "Bruno Teixeira", "Lucas Ferreira", "Implantada", ["IM-001"], ["AT-014"], ["PT-019"], { processo: "Faturamento" }),
    S("AS-02", "ERP · contábil", "Registro contábil dos créditos", "Criar contas de IBS e CBS a recuperar.", "Tiago Nunes", "André Souza", "Implantada", ["IM-012"], ["AT-010"], [], { processo: "Contabilidade" }),
    S("AS-03", "ERP · módulo fiscal", "Não cumulatividade da CBS", "Calcular o crédito de CBS por item do documento.", "Bruno Teixeira", "Rafael Lima", "Em teste", ["IM-008"], ["AT-031"], ["PT-014"], { processo: "Compras de serviços" }),
    S("AS-04", "ERP · módulo fiscal", "Apuração assistida", "Gerar relatório de conferência da apuração assistida.", "Bruno Teixeira", "Diego Martins", "Implantada", ["IM-010"], ["AT-026"], [], { processo: "Apuração" }),
    S("AS-05", "Emissor NF3e", "Novos grupos de IBS e CBS", "Grupos de IBS e CBS no XML a partir de 2027.", "Bruno Teixeira", "Lucas Ferreira", "Em teste", ["IM-003"], ["AT-038"], ["PT-019"], { processo: "Faturamento" }),
    S("AS-06", "ERP · módulo fiscal", "CST e cClassTrib", "Tabela de CST e cClassTrib por tipo de fornecimento.", "Bruno Teixeira", "Rafael Lima", "Em desenvolvimento", ["IM-009"], ["AT-012"], ["PT-023"]),
    S("AS-07", "Faturamento comercial", "Base de cálculo por componente", "Separar a base de cálculo por componente da fatura.", "Bruno Teixeira", "Lucas Ferreira", "Em desenvolvimento", ["IM-005"], ["AT-050"], []),
    S("AS-08", "ERP · módulo fiscal", "CBS integral", "Parametrizar alíquotas e regras da CBS plena.", "Bruno Teixeira", "Rafael Lima", "Não iniciada", ["IM-026"], ["AT-040"], [], { dependencias: "Depende de AS-06 e da conclusão de AT-012." }),
    S("AS-09", "ERP · suprimentos", "Regime do fornecedor", "Campo de regime tributário no cadastro de fornecedor.", "Tiago Nunes", "Juliana Prado", "Não iniciada", ["IM-019"], ["AT-041"], []),
    S("AS-10", "Power BI", "Separação dos tributos na transição", "Medidas separadas para PIS, Cofins, CBS e IBS.", "Tiago Nunes", "Fernanda Lopes", "Em desenvolvimento", ["IM-027"], ["AT-008"], []),
    S("AS-11", "Escrituração fiscal", "Escrituração de IBS e CBS", "Gerar os novos registros na escrituração.", "Tiago Nunes", "Diego Martins", "Bloqueada", ["IM-024"], ["AT-056"], ["PT-024"], { dependencias: "Aguarda a análise do parecer PT-024." })
  ];

  const T = (codigo, cenario, adequacao, status, extra) => Object.assign({
    codigo, cenario, adequacao, status, dados: "", esperado: "Resultado conforme a regra definida para o cenário.", obtido: "",
    executadoPor: "", executadoEm: "", evidencias: []
  }, extra || {});
  const ok = (por, em) => ({ obtido: "Conforme esperado.", executadoPor: por, executadoEm: em });

  const testes = [
    T("CT-001", "NF3e residencial com IBS e CBS destacados", "AS-01", "Aprovado", Object.assign({ dados: "Fatura de teste nº 0001" }, ok("Bruno Teixeira", "2026-08-10"))),
    T("CT-002", "NF3e comercial com IBS e CBS destacados", "AS-01", "Aprovado", Object.assign({ dados: "Fatura de teste nº 0002" }, ok("Bruno Teixeira", "2026-08-11"))),
    T("CT-003", "NF3e com refaturamento", "AS-01", "Aprovado", Object.assign({ dados: "Fatura de teste nº 0003" }, ok("Lucas Ferreira", "2026-08-18"))),
    T("CT-004", "Validação do XML no ambiente de homologação", "AS-01", "Aprovado", Object.assign({ dados: "Lote de teste nº 4" }, ok("Bruno Teixeira", "2026-08-25"))),
    T("CT-005", "Lançamento de CBS a recuperar", "AS-02", "Aprovado", Object.assign({ dados: "Lote contábil de teste nº 12" }, ok("André Souza", "2026-07-27"))),
    T("CT-006", "Lançamento de IBS a recuperar", "AS-02", "Aprovado", Object.assign({ dados: "Lote contábil de teste nº 13" }, ok("André Souza", "2026-07-28"))),
    T("CT-007", "Relatório de conferência da apuração", "AS-04", "Aprovado", Object.assign({ dados: "Apuração de agosto (ambiente de testes)" }, ok("Diego Martins", "2026-10-06"))),
    T("CT-008", "Conferência com a apuração assistida", "AS-04", "Aprovado", Object.assign({ dados: "Apuração de setembro (ambiente de testes)" }, ok("Diego Martins", "2026-10-13"))),
    T("CT-010", "Crédito de CBS em nota de serviço com item único", "AS-03", "Aprovado", Object.assign({ dados: "Nota de serviço de teste nº 1000" }, ok("Rafael Lima", "2026-10-08"))),
    T("CT-011", "Crédito de CBS em nota de serviço de manutenção", "AS-03", "Reprovado", { dados: "Nota de serviço de teste nº 1001", esperado: "Crédito igual ao valor destacado no documento.", obtido: "Base de cálculo divergente.", executadoPor: "Rafael Lima", executadoEm: "2026-10-14" }),
    T("CT-012", "Crédito de CBS em nota com vários itens", "AS-03", "Reprovado", { dados: "Nota de serviço de teste nº 1002", esperado: "Um crédito por item.", obtido: "Crédito lançado em duplicidade.", executadoPor: "Rafael Lima", executadoEm: "2026-10-16" }),
    T("CT-013", "Crédito de CBS com retenção na fonte", "AS-03", "Em execução", { dados: "Nota de serviço de teste nº 1003", executadoPor: "Rafael Lima" }),
    T("CT-014", "Crédito de CBS em nota cancelada", "AS-03", "Não iniciado", { dados: "Nota de serviço de teste nº 1004" }),
    T("CT-015", "Emissão de NF3e para consumidor residencial", "AS-05", "Aprovado", Object.assign({ dados: "Fatura de teste nº 0038", esperado: "XML válido com IBS e CBS destacados." }, ok("Bruno Teixeira", "2026-10-09"))),
    T("CT-016", "NF3e com IBS municipal", "AS-05", "Reprovado", { dados: "Fatura de teste nº 0047", esperado: "Grupo do IBS municipal preenchido no XML.", obtido: "Grupo ausente no XML gerado.", executadoPor: "Bruno Teixeira", executadoEm: "2026-10-20" }),
    T("CT-017", "Nota com desconto incondicional", "AS-05", "Em execução", { dados: "Fatura de teste nº 0052", esperado: "Desconto fora da base do IBS e da CBS.", executadoPor: "Bruno Teixeira" }),
    T("CT-018", "NF3e de consumidor com geração distribuída", "AS-05", "Não iniciado", { dados: "Fatura de teste nº 0060" }),
    T("CT-019", "Validação do XML com novos grupos no validador oficial", "AS-05", "Aprovado", Object.assign({ dados: "Lote de teste nº 7" }, ok("Bruno Teixeira", "2026-10-15"))),
    T("CT-020", "Fatura com bandeira tarifária", "AS-07", "Não iniciado", { dados: "Fatura de teste nº 0070" }),
    T("CT-021", "Arredondamento entre fatura e XML", "AS-07", "Reprovado", { dados: "Fatura de teste nº 0071", esperado: "Valores iguais na fatura e no XML.", obtido: "Diferença de um centavo.", executadoPor: "Lucas Ferreira", executadoEm: "2026-10-02" }),
    T("CT-022", "Escrituração do período de teste", "AS-11", "Bloqueado", { dados: "Apuração de setembro (ambiente de testes)", esperado: "Registros gerados sem erro de validação." }),
    T("CT-023", "Classificação de fornecimento residencial", "AS-06", "Em execução", { dados: "Tabela de parâmetros versão 0.3", executadoPor: "Rafael Lima" })
  ];

  const defeitos = [
    { codigo: "DF-001", descricao: "Diferença de arredondamento entre fatura e XML", teste: "CT-021", severidade: "Média", responsavel: "Tiago Nunes", abertoEm: "2026-10-02", status: "Aguarda reteste", detalhes: "" },
    { codigo: "DF-002", descricao: "Base de cálculo da CBS divergente em nota de serviço", teste: "CT-011", severidade: "Alta", responsavel: "Bruno Teixeira", abertoEm: "2026-10-14", status: "Em correção", detalhes: "" },
    { codigo: "DF-003", descricao: "Crédito duplicado em nota com mais de um item", teste: "CT-012", severidade: "Alta", responsavel: "Bruno Teixeira", abertoEm: "2026-10-16", status: "Em correção", detalhes: "" },
    { codigo: "DF-004", descricao: "Grupo do IBS municipal ausente no XML da NF3e", teste: "CT-016", severidade: "Alta", responsavel: "Bruno Teixeira", abertoEm: "2026-10-20", status: "Aberto", detalhes: "" },
    { codigo: "DF-005", descricao: "XML rejeitado no validador por ordem dos grupos", teste: "CT-019", severidade: "Média", responsavel: "Bruno Teixeira", abertoEm: "2026-10-12", status: "Corrigido", detalhes: "" }
  ];

  const normas = [
    { codigo: "NR-001", tipo: "Emenda Constitucional", numero: "132", ano: 2023, orgao: "Congresso Nacional", publicacao: "2023-12-21",
      vigencia: "Conforme o cronograma de transição da própria emenda", assunto: "Reforma do Sistema Tributário Nacional",
      resumo: "Cria o IBS, a CBS e o Imposto Seletivo e define a transição até 2033.", areas: RT.listas.areas.slice(), necessidade: "Sim",
      responsavel: "Mariana Costa", fonte: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm", status: "Avaliada" },
    { codigo: "NR-002", tipo: "Lei Complementar", numero: "214", ano: 2025, orgao: "Presidência da República", publicacao: "2025-01-16",
      vigencia: "Conforme as disposições da própria lei", assunto: "Institui o IBS, a CBS e o Imposto Seletivo",
      resumo: "Regulamenta o IBS, a CBS e o Imposto Seletivo.", areas: RT.listas.areas.slice(), necessidade: "Sim",
      responsavel: "Mariana Costa", fonte: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm", status: "Em avaliação" }
  ];

  const M = (codigo, titulo, natureza, data, extra) => Object.assign({ codigo, titulo, natureza, data, dataTexto: "", descricao: "", norma: "", fonte: "" }, extra || {});
  const marcos = [
    M("MC-001", "Promulgação da EC 132/2023", "Legal confirmado", "2023-12-20", { descricao: "Cria IBS, CBS e Imposto Seletivo e fixa o calendário de transição.", norma: "NR-001" }),
    M("MC-002", "Publicação da LC 214/2025", "Legal confirmado", "2025-01-16", { descricao: "Regulamenta IBS, CBS e Imposto Seletivo.", norma: "NR-002" }),
    M("MC-003", "Início do ano de teste", "Legal confirmado", "2026-01-01", { descricao: "CBS a 0,9% e IBS a 0,1%, destacados nos documentos fiscais e compensáveis com PIS e Cofins.", norma: "NR-001" }),
    M("MC-004", "Alíquotas de referência da CBS e do IBS", "Previsão oficial", "", { dataTexto: "Data a confirmar", descricao: "Fixadas por resolução do Senado Federal, conforme a EC 132/2023. Data e percentuais dependem de publicação.", norma: "NR-001", fonte: "Conferir no portal do Senado Federal antes de usar" }),
    M("MC-005", "CBS em vigor", "Legal confirmado", "2027-01-01", { descricao: "Extinção de PIS e Cofins. Início da cobrança do Imposto Seletivo.", norma: "NR-001" }),
    M("MC-006", "Transição do ICMS e do ISS", "Legal confirmado", "2029-01-01", { dataTexto: "2029 a 2032", descricao: "Redução gradual de ICMS e ISS com aumento proporcional do IBS.", norma: "NR-001" }),
    M("MC-007", "Modelo pleno", "Legal confirmado", "2033-01-01", { descricao: "Extinção do ICMS e do ISS. IBS e CBS integralmente vigentes.", norma: "NR-001" }),
    M("MC-008", "Homologação da NF3e com novos grupos", "Interno", "2026-11-14", { descricao: "Entrega vinculada à ação AT-038." }),
    M("MC-009", "CBS plena parametrizada para produção", "Interno", "2026-12-31", { descricao: "Entrega vinculada à ação AT-040." }),
    M("MC-010", "Escrituração fiscal homologada", "Interno", "2027-03-31", { descricao: "Entrega vinculada à ação AT-048." })
  ];

  const D = (codigo, versao, situacao, assunto, dataDecisao, decisao, extra) => Object.assign({
    codigo, versao, situacao, assunto, dataDecisao, decisao, aprovador: "Mariana Costa",
    contexto: "Contexto de demonstração.", alternativas: "", justificativa: "Justificativa de demonstração.",
    areas: [], processos: "", pareceres: [], atividades: [], motivoRevogacao: "", situacaoEm: ""
  }, extra || {});

  const decisoes = [
    D("DC-003", 1, "Revogada", "Comitê semanal do projeto às quintas-feiras", "2026-04-15", "O comitê do projeto se reúne toda quinta-feira.",
      { areas: RT.listas.areas.slice(0, 3), motivoRevogacao: "Substituído pelo acompanhamento quinzenal com a diretoria.", situacaoEm: "2026-06-30T10:00:00" }),
    D("DC-005", 1, "Substituída", "Ordem dos testes de sistemas", "2026-05-10", "Testar o ERP contábil antes da NF3e.",
      { areas: ["Sistemas e tecnologia"], situacaoEm: "2026-07-30T16:00:00" }),
    D("DC-005", 2, "Vigente", "Ordem dos testes de sistemas", "2026-07-30", "Testar a NF3e antes do ERP contábil.",
      { areas: ["Sistemas e tecnologia", "Faturamento"], justificativa: "A NF3e é a primeira obrigação com prazo fixo.", atividades: ["AT-038"] }),
    D("DC-007", 1, "Vigente", "Repositório único de pareceres no portal", "2026-06-02", "Todos os pareceres e estudos ficam na biblioteca do portal; versões enviadas por e-mail não são consideradas.",
      { areas: RT.listas.areas.slice() }),
    D("DC-010", 1, "Vigente", "Aprovação interna de pareceres", "2026-08-15", "A aprovação interna de pareceres é feita somente pelo gestor tributário.",
      { areas: ["Fiscal e tributária", "Contratos"] }),
    D("DC-012", 1, "Substituída", "Tratamento de notas de ajuste no período de teste", "2026-09-02", "Notas de ajuste do período de teste são emitidas pelo Faturamento, com conferência posterior por amostragem.",
      { areas: ["Faturamento"], situacaoEm: "2026-10-20T11:03:00", pareceres: ["PT-019"] }),
    D("DC-012", 2, "Vigente", "Tratamento de notas de ajuste no período de teste", "2026-10-20", "Notas de ajuste do período de teste passam pela aprovação do Fiscal antes da emissão.",
      { areas: ["Faturamento", "Fiscal e tributária"], processos: "Emissão de nota de energia elétrica", pareceres: ["PT-019"], atividades: ["AT-038"],
        contexto: "Notas de ajuste emitidas durante o ano de teste estavam saindo sem conferência prévia da área fiscal, o que gerou retrabalho nos testes da NF3e.",
        alternativas: "Manter a emissão direta pelo Faturamento, com conferência por amostragem.\nExigir aprovação do Fiscal antes de cada emissão.\nExigir aprovação do Fiscal apenas acima de um valor definido.",
        justificativa: "O volume é baixo no período de teste e a conferência prévia evita reprocessar cenários já aprovados." })
  ];

  // Perguntas fictícias. As respostas não trazem conclusões jurídicas: só indicam onde a resposta real se apoia.
  const Q = (codigo, pergunta, categoria, area, perguntadoPor, dataPergunta, status, extra) => Object.assign({
    codigo, pergunta, categoria, area, perguntadoPor, dataPergunta, status,
    detalhes: "", resposta: "", respondidoPor: "", dataResposta: "", pareceres: [], normas: []
  }, extra || {});
  const perguntas = [
    Q("QA-001", "Serviços de manutenção de rede contratados de terceiros geram crédito de CBS?", "Créditos de IBS e CBS", "Suprimentos e compras", "Juliana Prado", "2026-08-05", "Respondida",
      { detalhes: "Dúvida surgida na validação dos pedidos de compra de serviços.", resposta: "Resposta de demonstração. A resposta real é registrada pela área tributária, com base no parecer PT-014.",
        respondidoPor: "Mariana Costa", dataResposta: "2026-10-21", pareceres: ["PT-014"], normas: ["NR-002"] }),
    Q("QA-002", "A NF3e precisa destacar IBS e CBS durante o ano de teste?", "Documentos fiscais eletrônicos", "Faturamento", "Lucas Ferreira", "2026-08-20", "Respondida",
      { resposta: "Resposta de demonstração. A resposta real é registrada pela área fiscal, com base na nota técnica PT-019.",
        respondidoPor: "Rafael Lima", dataResposta: "2026-09-05", pareceres: ["PT-019"], normas: ["NR-001"] }),
    Q("QA-003", "Como tratar contratos de serviço assinados antes da reforma?", "Contratos e fornecedores", "Contratos", "Camila Rocha", "2026-09-28", "Aguardando resposta",
      { detalhes: "Depende do parecer PT-022, ainda em elaboração.", pareceres: ["PT-022"] }),
    Q("QA-004", "Em que conta contábil fica o IBS a recuperar?", "Contabilidade e apuração", "Contábil", "Diego Martins", "2026-09-10", "Em revisão",
      { resposta: "Resposta de demonstração em revisão pela área contábil.", respondidoPor: "André Souza", dataResposta: "2026-09-15", pareceres: ["PT-016"] })
  ];

  const H = (entidade, ref, acao, usuario, data, detalhes) => ({ entidade, ref, acao, usuario, data, detalhes: detalhes || "" });
  const historico = [
    H("pareceres", "PT-003", "Aprovado internamente", "Mariana Costa", "2026-04-06T10:12:00"),
    H("pareceres", "PT-008", "Aprovado internamente", "Mariana Costa", "2026-07-08T15:40:00"),
    H("pareceres", "PT-011", "Aprovado internamente", "Mariana Costa", "2026-07-20T09:30:00"),
    H("atividades", "AT-026", "Status alterado para Concluída", "Diego Martins", "2026-10-14T17:30:00"),
    H("testes", "CT-011", "Status alterado para Reprovado", "Rafael Lima", "2026-10-14T15:10:00"),
    H("testes", "CT-012", "Status alterado para Reprovado", "Rafael Lima", "2026-10-16T10:05:00"),
    H("pareceres", "PT-021", "Anexo incluído: PT-021_estudo_v2.xlsx (versão 2)", "André Souza", "2026-10-18T15:27:00"),
    H("decisoes", "DC-012", "Nova versão registrada (v2). A versão 1 passou a Substituída", "Mariana Costa", "2026-10-20T11:03:00"),
    H("testes", "CT-016", "Status alterado para Reprovado", "Bruno Teixeira", "2026-10-20T17:15:00"),
    H("pareceres", "PT-014", "Aprovado internamente", "Mariana Costa", "2026-10-21T09:42:00")
  ];

  return { usuarios, pareceres, perguntas, atividades, impactos, adequacoes, testes, defeitos, normas, marcos, decisoes, historico };
};
