/*
 * Esquema de dados. Cada entidade descreve seus campos uma única vez; daqui saem
 * os formulários, as validações, as colunas das tabelas e as listas do SharePoint.
 *
 * Tipos de campo:
 *   texto, textoLongo, numero, data (AAAA-MM-DD), opcao, multiOpcao, usuario,
 *   ref (código de outro registro), refs (vários códigos), anexos, email, url, booleano
 * Campos com `sistema: true` são preenchidos pelas regras do portal e não aparecem no formulário.
 */
window.RT = window.RT || {};

RT.listas = {
  areas: [
    "Fiscal e tributária", "Contábil", "Financeira", "Suprimentos e compras", "Faturamento",
    "Contratos", "Cadastros", "Sistemas e tecnologia", "Obrigações acessórias", "Dados e relatórios"
  ],
  categorias: [
    "Incidência tributária", "Créditos de IBS e CBS", "Compras e contratação de serviços",
    "Faturamento e vendas", "Contratos e fornecedores", "Obrigações acessórias",
    "Documentos fiscais eletrônicos", "Parametrização de sistemas", "Contabilidade e apuração",
    "Impactos financeiros", "Interpretação jurídica e legislação"
  ],
  unidades: ["Distribuição", "Transmissão", "Geração", "Serviços compartilhados", "Holding"],
  sistemas: [
    "ERP · módulo fiscal", "ERP · contábil", "ERP · suprimentos", "Faturamento comercial",
    "Emissor NF3e", "Escrituração fiscal", "Gestão de contratos", "Tesouraria", "Power BI"
  ],
  perfis: ["Administrador", "Gestor", "Colaborador", "Consulta"],
  statusParecer: ["Recebido", "Em elaboração", "Análise concluída", "Aprovado internamente"],
  statusAtividade: ["Não iniciada", "Em andamento", "Bloqueada", "Em validação", "Concluída", "Cancelada"],
  prioridades: ["Crítica", "Alta", "Média", "Baixa"],
  criticidades: ["Alta", "Média", "Baixa"],
  statusImpacto: ["Identificado", "Em tratamento", "Adequado", "Não aplicável"],
  statusAdequacao: ["Não iniciada", "Em desenvolvimento", "Em teste", "Implantada", "Bloqueada"],
  statusTeste: ["Não iniciado", "Em execução", "Aprovado", "Reprovado", "Bloqueado"],
  statusDefeito: ["Aberto", "Em correção", "Aguarda reteste", "Corrigido", "Cancelado"],
  tiposNorma: [
    "Emenda Constitucional", "Lei Complementar", "Lei", "Decreto", "Instrução Normativa",
    "Resolução", "Ato do Comitê Gestor do IBS", "Nota Técnica", "Outro"
  ],
  statusNorma: ["Não avaliada", "Em avaliação", "Avaliada"],
  naturezas: ["Legal confirmado", "Previsão oficial", "Interno"],
  situacoesDecisao: ["Vigente", "Substituída", "Revogada"],
  statusPergunta: ["Aguardando resposta", "Respondida", "Em revisão"],
  tiposInteracao: ["Solicitação", "Retorno"],
  extensoesAnexo: ["pdf", "docx", "xlsx", "pptx", "csv", "png", "jpg", "jpeg"]
};

(function () {
  const L = RT.listas;

  // Campos comuns a todas as entidades (controle, auditoria e marca de demonstração)
  const comuns = [
    { nome: "arquivado", tipo: "booleano", sistema: true },
    { nome: "motivoArquivamento", tipo: "texto", sistema: true },
    { nome: "demonstracao", tipo: "booleano", sistema: true },
    { nome: "criadoPor", tipo: "texto", sistema: true },
    { nome: "criadoEm", tipo: "texto", sistema: true },
    { nome: "atualizadoPor", tipo: "texto", sistema: true },
    { nome: "atualizadoEm", tipo: "texto", sistema: true }
  ];

  const E = {
    pareceres: {
      rotulo: "Pareceres e estudos", singular: "parecer", genero: "o", prefixo: "PT", lista: "Pareceres",
      titulo: r => r.titulo,
      descricao: "Pareceres de consultoria, estudos internos, notas técnicas e apresentações. Anexar um arquivo não aprova o documento: a aprovação interna é feita por um gestor e fica registrada.",
      campos: [
        { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "tipo", rotulo: "Tipo", tipo: "opcao", opcoes: ["Parecer", "Estudo", "Nota técnica", "Apresentação", "Outro"], obrigatorio: true },
        { nome: "categoria", rotulo: "Categoria", tipo: "opcao", opcoes: L.categorias, obrigatorio: true },
        { nome: "origem", rotulo: "Consultoria ou origem", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "dataRecebimento", rotulo: "Data de recebimento", tipo: "data", obrigatorio: true },
        { nome: "periodo", rotulo: "Período de elaboração (MM/AAAA)", tipo: "texto", formato: "mesAno", max: 7, ajuda: "Mês e ano em que o parecer foi elaborado. Ex.: 03/2026." },
        { nome: "descricao", rotulo: "Descrição e objetivo", tipo: "textoLongo", obrigatorio: true },
        { nome: "resumo", rotulo: "Resumo executivo", tipo: "textoLongo" },
        { nome: "conclusoes", rotulo: "Principais conclusões", tipo: "textoLongo", ajuda: "Copie do documento original. Pode ficar em branco enquanto a análise não terminar." },
        { nome: "legislacao", rotulo: "Legislação relacionada", tipo: "texto", max: 255 },
        { nome: "area", rotulo: "Área responsável", tipo: "opcao", opcoes: L.areas, obrigatorio: true },
        { nome: "responsavel", rotulo: "Responsável pela análise", tipo: "usuario" },
        { nome: "prazo", rotulo: "Prazo para conclusão", tipo: "data" },
        { nome: "status", rotulo: "Status da análise", tipo: "opcao", opcoes: L.statusParecer, obrigatorio: true, padrao: "Recebido" },
        { nome: "unidades", rotulo: "Unidades impactadas", tipo: "multiOpcao", opcoes: L.unidades },
        { nome: "anexos", rotulo: "Documento original e versões", tipo: "anexos" },
        { nome: "interacoes", rotulo: "Solicitações e retornos", tipo: "interacoes", sistema: true },
        { nome: "aprovadoPor", rotulo: "Aprovado por", tipo: "texto", sistema: true },
        { nome: "aprovadoEm", rotulo: "Aprovado em", tipo: "texto", sistema: true }
      ],
      colunas: ["codigo", "titulo", "categoria", "periodo", "origem", "responsavel", "dataRecebimento", "status"],
      filtros: ["status", "categoria", "responsavel", "unidades", "area"],
      filtroPeriodo: "dataRecebimento",
      busca: ["codigo", "titulo", "descricao", "resumo", "conclusoes", "legislacao", "origem", "periodo"]
    },

    perguntas: {
      rotulo: "Perguntas e respostas", singular: "pergunta", genero: "a", prefixo: "QA", lista: "Perguntas",
      titulo: r => r.pergunta,
      descricao: "Dúvidas sobre a reforma e as respostas dadas pela equipe. Uma pergunta só aparece como respondida quando a resposta, quem respondeu e a data estão registrados.",
      campos: [
        { nome: "pergunta", rotulo: "Pergunta", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "detalhes", rotulo: "Contexto da pergunta", tipo: "textoLongo" },
        { nome: "categoria", rotulo: "Tema", tipo: "opcao", opcoes: L.categorias, obrigatorio: true },
        { nome: "area", rotulo: "Área", tipo: "opcao", opcoes: L.areas },
        { nome: "perguntadoPor", rotulo: "Perguntado por", tipo: "usuario" },
        { nome: "dataPergunta", rotulo: "Data da pergunta", tipo: "data", obrigatorio: true },
        { nome: "status", rotulo: "Situação", tipo: "opcao", opcoes: L.statusPergunta, obrigatorio: true, padrao: "Aguardando resposta" },
        { nome: "resposta", rotulo: "Resposta", tipo: "textoLongo" },
        { nome: "respondidoPor", rotulo: "Respondido por", tipo: "usuario" },
        { nome: "dataResposta", rotulo: "Data da resposta", tipo: "data" },
        { nome: "pareceres", rotulo: "Pareceres que fundamentam a resposta", tipo: "refs", entidade: "pareceres" },
        { nome: "normas", rotulo: "Normas relacionadas", tipo: "refs", entidade: "normas" }
      ],
      colunas: ["codigo", "pergunta", "categoria", "area", "respondidoPor", "dataResposta", "status"],
      filtros: ["status", "categoria", "area"],
      filtroPeriodo: "dataPergunta",
      busca: ["codigo", "pergunta", "detalhes", "resposta"]
    },

    atividades: {
      rotulo: "Plano de implementação", singular: "ação", genero: "a", prefixo: "AT", lista: "Atividades",
      titulo: r => r.nome,
      descricao: "Ações necessárias para a adequação. Uma ação fica atrasada quando o prazo vence e ela não está concluída nem cancelada.",
      campos: [
        { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "descricao", rotulo: "Descrição", tipo: "textoLongo" },
        { nome: "frente", rotulo: "Frente de trabalho", tipo: "opcao", opcoes: L.areas, obrigatorio: true },
        { nome: "area", rotulo: "Área responsável", tipo: "opcao", opcoes: L.areas, obrigatorio: true },
        { nome: "responsavel", rotulo: "Responsável pela execução", tipo: "usuario", obrigatorio: true },
        { nome: "inicio", rotulo: "Data de início", tipo: "data" },
        { nome: "prazo", rotulo: "Prazo previsto", tipo: "data", obrigatorio: true },
        { nome: "status", rotulo: "Status", tipo: "opcao", opcoes: L.statusAtividade, obrigatorio: true, padrao: "Não iniciada" },
        { nome: "prioridade", rotulo: "Prioridade", tipo: "opcao", opcoes: L.prioridades, obrigatorio: true, padrao: "Média" },
        { nome: "percentual", rotulo: "Percentual de conclusão", tipo: "numero", min: 0, max: 100, padrao: 0 },
        { nome: "dependencias", rotulo: "Depende de", tipo: "refs", entidade: "atividades" },
        { nome: "riscos", rotulo: "Riscos e impedimentos", tipo: "textoLongo" },
        { nome: "documentos", rotulo: "Pareceres e evidências relacionados", tipo: "refs", entidade: "pareceres" },
        { nome: "evidencias", rotulo: "Evidências anexadas", tipo: "anexos" },
        { nome: "resultadoEsperado", rotulo: "Resultado esperado", tipo: "textoLongo" },
        { nome: "dataConclusao", rotulo: "Data de conclusão efetiva", tipo: "data" }
      ],
      colunas: ["codigo", "nome", "responsavel", "prazo", "prioridade", "percentual", "status", "dependencias"],
      filtros: ["status", "frente", "responsavel", "prioridade"],
      filtroPeriodo: "prazo",
      busca: ["codigo", "nome", "descricao", "riscos", "resultadoEsperado"]
    },

    impactos: {
      rotulo: "Mapeamento de impactos", singular: "impacto", genero: "o", prefixo: "IM", lista: "Impactos",
      titulo: r => r.processo,
      descricao: "Onde a reforma muda processos, sistemas e cadastros. Cada impacto aponta para a ação que o resolve e para o parecer que o fundamenta.",
      campos: [
        { nome: "processo", rotulo: "Processo empresarial", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "area", rotulo: "Área afetada", tipo: "opcao", opcoes: L.areas, obrigatorio: true },
        { nome: "tipoOperacao", rotulo: "Tipo de operação", tipo: "texto", max: 255 },
        { nome: "tributo", rotulo: "Tributo ou regra envolvida", tipo: "texto", max: 255 },
        { nome: "sistema", rotulo: "Sistema relacionado", tipo: "opcao", opcoes: L.sistemas },
        { nome: "cenarioAtual", rotulo: "Descrição do cenário atual", tipo: "textoLongo" },
        { nome: "mudanca", rotulo: "Mudança necessária", tipo: "textoLongo", obrigatorio: true },
        { nome: "impactoEsperado", rotulo: "Impacto esperado", tipo: "textoLongo" },
        { nome: "criticidade", rotulo: "Criticidade", tipo: "opcao", opcoes: L.criticidades, obrigatorio: true },
        { nome: "responsavel", rotulo: "Responsável", tipo: "usuario" },
        { nome: "acao", rotulo: "Ação corretiva ou preventiva", tipo: "textoLongo" },
        { nome: "status", rotulo: "Status da adequação", tipo: "opcao", opcoes: L.statusImpacto, obrigatorio: true, padrao: "Identificado" },
        { nome: "pareceres", rotulo: "Pareceres ou evidências", tipo: "refs", entidade: "pareceres" },
        { nome: "atividades", rotulo: "Ações para resolução", tipo: "refs", entidade: "atividades" }
      ],
      colunas: ["codigo", "processo", "area", "sistema", "criticidade", "status", "atividades"],
      filtros: ["area", "criticidade", "sistema", "status"],
      busca: ["codigo", "processo", "mudanca", "cenarioAtual", "tributo", "tipoOperacao"]
    },

    adequacoes: {
      rotulo: "Adequações sistêmicas", singular: "adequação", genero: "a", prefixo: "AS", lista: "Adequacoes",
      titulo: r => r.requisito,
      descricao: "Alterações necessárias nos sistemas. Uma adequação só deve passar a implantada depois que os cenários de teste ligados a ela forem aprovados.",
      campos: [
        { nome: "sistema", rotulo: "Sistema ou aplicação", tipo: "opcao", opcoes: L.sistemas, obrigatorio: true },
        { nome: "processo", rotulo: "Processo impactado", tipo: "texto", max: 255 },
        { nome: "requisito", rotulo: "Requisito tributário", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "alteracao", rotulo: "Alteração necessária", tipo: "textoLongo", obrigatorio: true },
        { nome: "respTecnico", rotulo: "Responsável técnico", tipo: "usuario" },
        { nome: "respTributario", rotulo: "Responsável tributário", tipo: "usuario" },
        { nome: "dependencias", rotulo: "Dependências", tipo: "textoLongo" },
        { nome: "status", rotulo: "Status da implementação", tipo: "opcao", opcoes: L.statusAdequacao, obrigatorio: true, padrao: "Não iniciada" },
        { nome: "impactos", rotulo: "Impactos relacionados", tipo: "refs", entidade: "impactos" },
        { nome: "atividades", rotulo: "Ações do plano", tipo: "refs", entidade: "atividades" },
        { nome: "pareceres", rotulo: "Pareceres relacionados", tipo: "refs", entidade: "pareceres" }
      ],
      colunas: ["codigo", "sistema", "requisito", "respTecnico", "respTributario", "status", "impactos"],
      filtros: ["sistema", "status", "respTecnico"],
      busca: ["codigo", "requisito", "alteracao", "processo"]
    },

    testes: {
      rotulo: "Cenários de teste", singular: "cenário de teste", genero: "o", prefixo: "CT", lista: "Testes",
      titulo: r => r.cenario,
      descricao: "Cenários de teste das adequações, com dados usados, resultado esperado e resultado obtido.",
      campos: [
        { nome: "cenario", rotulo: "Cenário de teste", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "adequacao", rotulo: "Adequação testada", tipo: "ref", entidade: "adequacoes", obrigatorio: true },
        { nome: "dados", rotulo: "Dados utilizados", tipo: "textoLongo" },
        { nome: "esperado", rotulo: "Resultado esperado", tipo: "textoLongo", obrigatorio: true },
        { nome: "obtido", rotulo: "Resultado obtido", tipo: "textoLongo" },
        { nome: "status", rotulo: "Status", tipo: "opcao", opcoes: L.statusTeste, obrigatorio: true, padrao: "Não iniciado" },
        { nome: "executadoPor", rotulo: "Executado por", tipo: "usuario" },
        { nome: "executadoEm", rotulo: "Executado em", tipo: "data" },
        { nome: "evidencias", rotulo: "Evidências anexadas", tipo: "anexos" }
      ],
      colunas: ["codigo", "cenario", "adequacao", "executadoPor", "executadoEm", "status"],
      filtros: ["status", "executadoPor"],
      busca: ["codigo", "cenario", "dados", "esperado", "obtido"]
    },

    defeitos: {
      rotulo: "Defeitos", singular: "defeito", genero: "o", prefixo: "DF", lista: "Defeitos",
      titulo: r => r.descricao,
      descricao: "Defeitos encontrados nos testes.",
      campos: [
        { nome: "descricao", rotulo: "Descrição", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "teste", rotulo: "Cenário de teste", tipo: "ref", entidade: "testes", obrigatorio: true },
        { nome: "severidade", rotulo: "Severidade", tipo: "opcao", opcoes: L.criticidades, obrigatorio: true },
        { nome: "responsavel", rotulo: "Responsável", tipo: "usuario" },
        { nome: "abertoEm", rotulo: "Aberto em", tipo: "data", obrigatorio: true },
        { nome: "status", rotulo: "Status", tipo: "opcao", opcoes: L.statusDefeito, obrigatorio: true, padrao: "Aberto" },
        { nome: "detalhes", rotulo: "Detalhes", tipo: "textoLongo" }
      ],
      colunas: ["codigo", "descricao", "teste", "severidade", "responsavel", "abertoEm", "status"],
      filtros: ["status", "severidade", "responsavel"],
      busca: ["codigo", "descricao", "detalhes"]
    },

    normas: {
      rotulo: "Normas", singular: "norma", genero: "a", prefixo: "NR", lista: "Normas",
      titulo: r => `${r.tipo || ""} nº ${r.numero || ""}/${r.ano || ""}`.trim(),
      descricao: "Normas e atos acompanhados, sempre com link para a publicação oficial.",
      campos: [
        { nome: "tipo", rotulo: "Norma ou ato normativo", tipo: "opcao", opcoes: L.tiposNorma, obrigatorio: true },
        { nome: "numero", rotulo: "Número", tipo: "texto", obrigatorio: true, max: 50 },
        { nome: "ano", rotulo: "Ano", tipo: "numero", obrigatorio: true, min: 1988, max: 2100 },
        { nome: "orgao", rotulo: "Órgão emissor", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "publicacao", rotulo: "Data de publicação", tipo: "data" },
        { nome: "vigencia", rotulo: "Data de vigência", tipo: "texto", max: 255, ajuda: "Pode ser uma data ou uma descrição, quando a vigência é escalonada." },
        { nome: "assunto", rotulo: "Assunto", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "resumo", rotulo: "Resumo", tipo: "textoLongo" },
        { nome: "areas", rotulo: "Operações ou áreas afetadas", tipo: "multiOpcao", opcoes: L.areas },
        { nome: "necessidade", rotulo: "Necessidade de adequação", tipo: "opcao", opcoes: ["Sim", "Não", "Em avaliação"] },
        { nome: "responsavel", rotulo: "Responsável pela análise", tipo: "usuario" },
        { nome: "fonte", rotulo: "Link para a fonte oficial", tipo: "url", obrigatorio: true },
        { nome: "status", rotulo: "Status da avaliação interna", tipo: "opcao", opcoes: L.statusNorma, obrigatorio: true, padrao: "Não avaliada" }
      ],
      colunas: ["codigo", "titulo", "orgao", "publicacao", "assunto", "responsavel", "status"],
      filtros: ["status", "tipo", "responsavel"],
      busca: ["codigo", "numero", "assunto", "resumo", "orgao"]
    },

    marcos: {
      rotulo: "Marcos do cronograma", singular: "marco", genero: "o", prefixo: "MC", lista: "Marcos",
      titulo: r => r.titulo,
      descricao: "Marcos da transição tributária e entregas do projeto.",
      campos: [
        { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "natureza", rotulo: "Natureza", tipo: "opcao", opcoes: L.naturezas, obrigatorio: true },
        { nome: "data", rotulo: "Data", tipo: "data", ajuda: "Deixe em branco quando a data ainda não estiver definida." },
        { nome: "dataTexto", rotulo: "Período ou observação da data", tipo: "texto", max: 100, ajuda: "Ex.: \"2029 a 2032\" ou \"Data a confirmar\"." },
        { nome: "descricao", rotulo: "Descrição", tipo: "textoLongo" },
        { nome: "norma", rotulo: "Norma de origem", tipo: "ref", entidade: "normas" },
        { nome: "fonte", rotulo: "Fonte", tipo: "texto", max: 255 }
      ],
      colunas: ["codigo", "titulo", "natureza", "data"],
      filtros: ["natureza"],
      busca: ["codigo", "titulo", "descricao"]
    },

    decisoes: {
      rotulo: "Decisões e diretrizes", singular: "decisão", genero: "a", prefixo: "DC", lista: "Decisoes",
      titulo: r => r.assunto,
      versionada: true,
      descricao: "Uma decisão vigente não é editada: quando muda, uma nova versão a substitui e a anterior continua consultável, marcada como substituída.",
      campos: [
        { nome: "assunto", rotulo: "Assunto", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "contexto", rotulo: "Contexto da decisão", tipo: "textoLongo", obrigatorio: true },
        { nome: "alternativas", rotulo: "Alternativas avaliadas", tipo: "textoLongo" },
        { nome: "decisao", rotulo: "Decisão adotada", tipo: "textoLongo", obrigatorio: true },
        { nome: "justificativa", rotulo: "Justificativa", tipo: "textoLongo", obrigatorio: true },
        { nome: "aprovador", rotulo: "Responsável pela aprovação", tipo: "usuario", obrigatorio: true },
        { nome: "dataDecisao", rotulo: "Data da decisão", tipo: "data", obrigatorio: true },
        { nome: "areas", rotulo: "Áreas envolvidas", tipo: "multiOpcao", opcoes: L.areas },
        { nome: "processos", rotulo: "Processos impactados", tipo: "texto", max: 255 },
        { nome: "pareceres", rotulo: "Pareceres relacionados", tipo: "refs", entidade: "pareceres" },
        { nome: "atividades", rotulo: "Ações decorrentes", tipo: "refs", entidade: "atividades" },
        { nome: "versao", rotulo: "Versão", tipo: "numero", sistema: true },
        { nome: "situacao", rotulo: "Situação", tipo: "opcao", opcoes: L.situacoesDecisao, sistema: true },
        { nome: "motivoRevogacao", rotulo: "Motivo da revogação", tipo: "textoLongo", sistema: true },
        { nome: "situacaoEm", rotulo: "Situação alterada em", tipo: "texto", sistema: true }
      ],
      colunas: ["codigo", "versao", "assunto", "areas", "aprovador", "dataDecisao", "situacao"],
      filtros: ["situacao", "areas", "aprovador"],
      busca: ["codigo", "assunto", "contexto", "decisao", "justificativa"]
    },

    usuarios: {
      rotulo: "Usuários", singular: "usuário", genero: "o", prefixo: "US", lista: "Usuarios",
      titulo: r => r.nome,
      descricao: "Pessoas com acesso ao portal e seus perfis.",
      campos: [
        { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, max: 255 },
        { nome: "email", rotulo: "E-mail corporativo", tipo: "email", obrigatorio: true },
        { nome: "area", rotulo: "Área", tipo: "opcao", opcoes: L.areas.concat(["Diretoria"]) },
        { nome: "perfil", rotulo: "Perfil", tipo: "opcao", opcoes: L.perfis, obrigatorio: true, padrao: "Consulta" },
        { nome: "ativo", rotulo: "Ativo", tipo: "booleano", padrao: true }
      ],
      colunas: ["nome", "email", "area", "perfil", "ativo"],
      filtros: ["perfil", "area"],
      busca: ["nome", "email"]
    },

    historico: {
      rotulo: "Histórico de alterações", singular: "registro de histórico", genero: "o", prefixo: "HI", lista: "Historico",
      titulo: r => `${r.entidade} ${r.ref}`,
      interno: true,
      campos: [
        { nome: "entidade", rotulo: "Módulo", tipo: "texto" },
        { nome: "ref", rotulo: "Registro", tipo: "texto" },
        { nome: "acao", rotulo: "Ação", tipo: "texto" },
        { nome: "usuario", rotulo: "Usuário", tipo: "texto" },
        { nome: "data", rotulo: "Data e hora", tipo: "texto" },
        { nome: "detalhes", rotulo: "Detalhes", tipo: "textoLongo" }
      ],
      colunas: [],
      filtros: [],
      busca: []
    }
  };

  for (const [chave, ent] of Object.entries(E)) {
    ent.chave = chave;
    ent.campos.unshift({ nome: "codigo", rotulo: "Código", tipo: "texto", sistema: true });
    ent.campos.push(...comuns.map(c => Object.assign({}, c)));
    ent.campo = nome => ent.campos.find(c => c.nome === nome);
  }

  RT.esquema = E;
})();
