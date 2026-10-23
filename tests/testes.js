/*
 * Testes automatizados. Cada caso tem um código (T01…) citado na matriz de requisitos
 * de implantacao/TESTES.md. Os casos rodam em sequência, cada um a partir dos dados de
 * demonstração recarregados.
 */
(function () {
  const casos = [];
  const teste = (id, nome, fn) => casos.push({ id, nome, fn });

  class Falha extends Error { }
  const ok = (cond, msg) => { if (!cond) throw new Falha(msg || "condição falsa"); };
  const igual = (obtido, esperado, msg) => {
    const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
    if (a !== b) throw new Falha(`${msg ? msg + ": " : ""}esperado ${b}, obtido ${a}`);
  };
  const lanca = async (fn, trecho, msg) => {
    try { await fn(); } catch (e) {
      if (e instanceof Falha) throw e;
      if (trecho && !String(e.message).includes(trecho)) throw new Falha(`${msg || "erro"}: mensagem inesperada "${e.message}"`);
      return;
    }
    throw new Falha(msg || "esperava um erro");
  };

  const repo = () => RT.repositorio;
  const R = () => RT.regras;
  const U = nome => repo().listar("usuarios").find(u => u.nome === nome);
  const gestor = () => U("Mariana Costa");
  const admin = () => U("Sérgio Ramos");
  const colab = () => U("Rafael Lima");      // Fiscal e tributária
  const consulta = () => U("Paulo Henrique");

  async function base() {
    RT.telas.estado.filtros = {};
    RT.telas.estado.fontes = {};
    RT.telas.estado.relatorios = {};
    RT.telas.estado.plano = { vista: "tabela", destaque: "todas" };
    RT.telas.estado.pasta = undefined;
    await repo().iniciar(new RT.AdaptadorMemoria());
    await repo().carregarDemonstracao(null);
    RT.telas.estado.usuario = gestor();
  }

  const arquivo = (bytes, nome, tipo) => new File([new Uint8Array(bytes)], nome, { type: tipo || "" });
  const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
  const parecerValido = extra => Object.assign({
    titulo: "Teste", tipo: "Estudo", categoria: "Incidência tributária", origem: "Teste", dataRecebimento: "2026-10-21",
    descricao: "Objetivo", area: "Contábil", status: "Recebido", unidades: [], anexos: []
  }, extra || {});

  // =====================================================================
  // Regras e permissões
  // =====================================================================
  teste("T01", "Permissões por perfil seguem a matriz da proposta", async () => {
    await base();
    const at036 = repo().obter("atividades", "AT-036"), at012 = repo().obter("atividades", "AT-012");
    const casosMatriz = [
      // [ação, entidade, registro, Admin, Gestor, Colaborador, Consulta]
      ["ver", "pareceres", null, true, true, true, true],
      ["criar", "pareceres", null, true, true, true, false],
      ["editar", "atividades", at012, true, true, true, false],
      ["editar", "atividades", at036, true, true, false, false],
      ["aprovar", "pareceres", null, false, true, false, false],
      ["arquivar", "impactos", null, true, true, false, false],
      ["criar", "decisoes", null, false, true, false, false],
      ["editar", "decisoes", null, false, false, false, false],
      ["criar", "usuarios", null, true, false, false, false],
      ["exportar", null, null, true, true, true, false],
      ["auditoria", null, null, true, true, false, false],
      ["removerDemonstracao", null, null, true, false, false, false]
    ];
    const perfis = [admin(), gestor(), colab(), consulta()];
    for (const [acao, ent, reg, ...esperado] of casosMatriz) {
      igual(perfis.map(u => R().pode(u, acao, ent, reg)), esperado, `${acao} ${ent || ""}`);
    }
  });

  teste("T02", "Campos obrigatórios são exigidos", async () => {
    await base();
    const erros = R().validar("pareceres", {}, {});
    igual(Object.keys(erros).sort(), ["area", "categoria", "dataRecebimento", "descricao", "origem", "status", "tipo", "titulo"]);
  });

  teste("T03", "Formatos inválidos são recusados", async () => {
    await base();
    ok(R().validar("usuarios", { nome: "A", email: "sem-arroba", perfil: "Gestor" }, { usuarios: [] }).email, "e-mail");
    ok(R().validar("normas", { tipo: "Lei", numero: "1", ano: 2025, orgao: "X", assunto: "Y", status: "Avaliada", fonte: "http://inseguro.gov.br" }, {}).fonte, "link sem https");
    ok(R().validar("normas", { tipo: "Lei", numero: "1", ano: 1500, orgao: "X", assunto: "Y", status: "Avaliada", fonte: "https://x.gov.br" }, {}).ano, "ano fora do intervalo");
    ok(R().validar("pareceres", parecerValido({ dataRecebimento: "21/10/2026" }), {}).dataRecebimento, "data em formato errado");
    ok(R().validar("pareceres", parecerValido({ titulo: "x".repeat(256) }), {}).titulo, "texto acima do limite");
    ok(R().validar("pareceres", parecerValido({ descricao: "x".repeat(10001) }), {}).descricao, "texto longo acima de 10.000");
    ok(R().validar("pareceres", parecerValido({ categoria: "Inventada" }), {}).categoria, "opção fora da lista");
    igual(R().validar("pareceres", parecerValido(), {}), {}, "parecer válido");
  });

  teste("T04", "Regras de ações: prazo, conclusão, bloqueio, cancelamento e dependências", async () => {
    await base();
    const a = { nome: "X", frente: "Contábil", area: "Contábil", responsavel: "André Souza", prioridade: "Alta", percentual: 0 };
    ok(R().validar("atividades", Object.assign({}, a, { inicio: "2026-10-10", prazo: "2026-10-01", status: "Em andamento" }), {}).prazo, "prazo antes do início");
    ok(R().validar("atividades", Object.assign({}, a, { prazo: "2026-10-01", status: "Concluída" }), {}).dataConclusao, "concluída sem data");
    ok(R().validar("atividades", Object.assign({}, a, { prazo: "2026-10-01", status: "Bloqueada" }), {}).riscos, "bloqueada sem motivo");
    ok(R().validar("atividades", Object.assign({}, a, { prazo: "2026-10-01", status: "Cancelada" }), {}).riscos, "cancelada sem motivo");
    const todas = repo().listar("atividades");
    ok(R().validar("atividades", Object.assign({}, a, { prazo: "2026-10-01", status: "Em andamento", dependencias: ["AT-012"] }), { codigo: "AT-012", atividades: todas }).dependencias, "depender de si mesma");
    // AT-040 depende de AT-012: AT-012 depender de AT-040 fecha um ciclo
    ok(R().validar("atividades", Object.assign({}, a, { prazo: "2026-10-01", status: "Em andamento", dependencias: ["AT-040"] }), { codigo: "AT-012", atividades: todas }).dependencias, "ciclo");
    const salvo = R().aoSalvar("atividades", { status: "Concluída", percentual: 40, dataConclusao: "2026-10-01" });
    igual(salvo.percentual, 100, "concluída vira 100%");
  });

  teste("T05", "Teste aprovado ou reprovado exige resultado, data e executor", async () => {
    await base();
    const erros = R().validar("testes", { cenario: "C", adequacao: "AS-03", esperado: "E", status: "Reprovado" }, {});
    igual(Object.keys(erros).sort(), ["executadoEm", "executadoPor", "obtido"]);
  });

  teste("T06", "Marco legal exige norma ou fonte; todo marco exige data ou período", async () => {
    await base();
    ok(R().validar("marcos", { titulo: "M", natureza: "Legal confirmado", data: "2027-01-01" }, {}).norma, "legal sem norma");
    ok(R().validar("marcos", { titulo: "M", natureza: "Interno" }, {}).data, "sem data");
    igual(R().validar("marcos", { titulo: "M", natureza: "Previsão oficial", dataTexto: "Data a confirmar" }, {}), {}, "previsão sem data, com período");
  });

  teste("T07", "Usuário com e-mail repetido é recusado", async () => {
    await base();
    const erros = R().validar("usuarios", { nome: "Outra", email: "MARIANA.COSTA@exemplo.com.br", perfil: "Consulta" }, { usuarios: repo().listar("usuarios") });
    ok(erros.email, "e-mail repetido sem diferença de maiúsculas");
  });

  teste("T08", "Anexos: extensão, tamanho e conteúdo real", async () => {
    ok(R().validarAnexo(arquivo([1], "a.exe")), ".exe recusado");
    ok(R().validarAnexo(arquivo([], "a.pdf")), "vazio recusado");
    ok(R().validarAnexo(new File([new ArrayBuffer(RT.config.anexoMaxMB * 1024 * 1024 + 1)], "grande.pdf")), "acima do limite");
    igual(R().validarAnexo(arquivo(PDF, "a.pdf")), "", "pdf aceito");
    igual(await R().validarConteudoAnexo(arquivo(PDF, "a.pdf")), "", "assinatura pdf");
    ok(await R().validarConteudoAnexo(arquivo([0x61, 0x62, 0x63], "falso.pdf")), "texto renomeado para pdf");
    igual(await R().validarConteudoAnexo(arquivo([0x50, 0x4b, 0x03, 0x04, 1], "a.docx")), "", "docx");
    igual(await R().validarConteudoAnexo(arquivo([0x89, 0x50, 0x4e, 0x47], "a.png")), "", "png");
    igual(await R().validarConteudoAnexo(arquivo([0xff, 0xd8, 0xff, 0xe0], "a.jpg")), "", "jpg");
    igual(await R().validarConteudoAnexo(arquivo([0x61, 0x3b, 0x62, 0x0a], "a.csv")), "", "csv");
    ok(await R().validarConteudoAnexo(arquivo([0x61, 0x00, 0x62], "a.csv")), "csv binário recusado");
  });

  teste("T09", "Nomes de arquivo e pasta são saneados para o SharePoint", async () => {
    igual(R().nomeSeguro('a:b*c?"d<e>f|g#h%.pdf'), "a_b_c__d_e_f_g_h_.pdf");
    igual(R().nomeSeguro("  ..nome.  "), "nome");
    igual(R().nomeSeguro(""), "arquivo");
  });

  teste("T10", "Formulário de parecer não oferece o status aprovado", async () => {
    await base();
    ok(!R().opcoesDeStatus("pareceres", null, gestor()).includes("Aprovado internamente"), "novo parecer");
    igual(R().opcoesDeStatus("pareceres", repo().obter("pareceres", "PT-014"), gestor()), ["Aprovado internamente"], "parecer já aprovado fica travado");
  });

  // =====================================================================
  // Indicadores
  // =====================================================================
  teste("T11", "Atraso calculado pelo prazo e pelo status", async () => {
    ok(R().atrasada({ prazo: "2000-01-01", status: "Em andamento" }), "vencida em andamento");
    ok(R().atrasada({ prazo: "2000-01-01", status: "Bloqueada" }), "vencida bloqueada");
    ok(!R().atrasada({ prazo: "2000-01-01", status: "Concluída" }), "concluída não atrasa");
    ok(!R().atrasada({ prazo: "2000-01-01", status: "Cancelada" }), "cancelada não atrasa");
    ok(!R().atrasada({ prazo: "2999-01-01", status: "Em andamento" }), "prazo futuro");
  });

  teste("T12", "Indicadores da Visão geral fecham com os registros", async () => {
    await base();
    const ind = R().indicadores(repo().todos());
    const soma = o => Object.values(o).reduce((s, n) => s + n, 0);
    igual(soma(ind.atividades.status), ind.atividades.total, "status das ações");
    igual(ind.atividades.total, repo().listar("atividades").length, "total de ações");
    igual(soma(ind.pareceres.status), ind.pareceres.total, "status dos pareceres");
    igual(ind.impactos.porArea.reduce((s, a) => s + a.total, 0), ind.impactos.total, "impactos por área");
    igual(soma(ind.testes.status), ind.testes.total, "status dos testes");
    igual(ind.adequacoes.implantadas + ind.adequacoes.pendentes, ind.adequacoes.total, "adequações");
    const validas = ind.atividades.total - ind.atividades.canceladas;
    igual(ind.atividades.percentual, Math.round(ind.atividades.concluidas / validas * 100), "percentual concluído");
    // arquivar uma ação tira do indicador
    await repo().arquivar("atividades", repo().obter("atividades", "AT-052"), "teste", gestor());
    igual(R().indicadores(repo().todos()).atividades.total, ind.atividades.total - 1, "arquivada sai do total");
  });

  teste("T13", "Evolução mensal nunca diminui", async () => {
    await base();
    const ev = R().evolucao(repo().listar("atividades"), 12);
    igual(ev.length, 12);
    for (let i = 1; i < ev.length; i++) {
      ok(ev[i].realizado >= ev[i - 1].realizado, "realizado");
      ok(ev[i].previsto >= ev[i - 1].previsto, "previsto");
    }
  });

  teste("T14", "Dependências: quem trava quem", async () => {
    await base();
    const todas = repo().listar("atividades");
    igual(R().bloqueiaOutras(repo().obter("atividades", "AT-036"), todas).sort(), ["AT-044", "AT-047"]);
    igual(R().dependenciasPendentes(repo().obter("atividades", "AT-040"), todas).sort(), ["AT-012", "AT-033"]);
    igual(R().bloqueiaOutras(repo().obter("atividades", "AT-010"), todas), [], "concluída não trava");
  });

  // =====================================================================
  // Repositório, histórico e fluxos
  // =====================================================================
  teste("T15", "Cadastro gera o próximo código e registra no histórico", async () => {
    await base();
    const { registro } = await repo().criar("pareceres", parecerValido(), gestor());
    igual(registro.codigo, "PT-027");
    igual(registro.criadoPor, "Mariana Costa");
    igual(repo().historicoDe("pareceres", "PT-027").map(h => h.acao), ["Registro criado"]);
  });

  teste("T16", "Edição registra cada campo alterado", async () => {
    await base();
    const reg = repo().obter("impactos", "IM-019");
    await repo().atualizar("impactos", reg, { criticidade: "Alta", status: "Em tratamento" }, gestor());
    const h = repo().historicoDe("impactos", "IM-019")[0];
    igual(h.acao, "Status alterado para Em tratamento");
    const det = JSON.parse(h.detalhes);
    igual(det.map(d => d.campo).sort(), ["Criticidade", "Status da adequação"]);
    const r2 = await repo().atualizar("impactos", repo().obter("impactos", "IM-019"), { criticidade: "Alta" }, gestor());
    igual(r2.aviso, "Nada foi alterado.");
    igual(repo().historicoDe("impactos", "IM-019").length, 1, "sem histórico para edição vazia");
  });

  teste("T17", "Arquivar em vez de excluir; restaurar devolve", async () => {
    await base();
    await repo().arquivar("impactos", repo().obter("impactos", "IM-027"), "Duplicado", gestor());
    ok(!repo().listar("impactos").some(i => i.codigo === "IM-027"), "some da lista padrão");
    ok(repo().listar("impactos", { incluirArquivados: true }).some(i => i.codigo === "IM-027"), "continua guardado");
    igual(repo().historicoDe("impactos", "IM-027")[0].acao, "Arquivado: Duplicado");
    await repo().restaurar("impactos", repo().obter("impactos", "IM-027"), gestor());
    ok(repo().listar("impactos").some(i => i.codigo === "IM-027"), "volta à lista");
  });

  teste("T18", "Aprovação de parecer: só gestor, só após análise concluída", async () => {
    await base();
    await lanca(() => repo().aprovarParecer(repo().obter("pareceres", "PT-019"), colab()), "Somente um gestor");
    await lanca(() => repo().aprovarParecer(repo().obter("pareceres", "PT-021"), gestor()), "análise concluída");
    await repo().aprovarParecer(repo().obter("pareceres", "PT-019"), gestor());
    const p = repo().obter("pareceres", "PT-019");
    igual([p.status, p.aprovadoPor], ["Aprovado internamente", "Mariana Costa"]);
    const v = R().verificarAprovacao(p, repo().listar("historico"), repo().listar("usuarios"), false);
    ok(v.ok, "verificação no modo demonstração");
  });

  teste("T19", "Nova versão do documento exige nova aprovação", async () => {
    await base();
    const p = repo().obter("pareceres", "PT-014");
    const novo = { nome: "v4.pdf", tamanho: 10, versao: 5, enviadoPor: "Mariana Costa", enviadoEm: R().agoraISO() };
    const r = await repo().atualizar("pareceres", p, { anexos: p.anexos.concat([novo]) }, gestor());
    igual([r.registro.status, r.registro.aprovadoPor], ["Análise concluída", ""]);
    ok(r.aviso.includes("nova aprovação"), "aviso ao usuário");
  });

  teste("T20", "Decisões: nova versão substitui a anterior; revogação com motivo", async () => {
    await base();
    const atual = repo().obter("decisoes", "DC-010");
    await repo().novaVersaoDecisao(atual, Object.assign({}, atual, { decisao: "Nova regra" }), gestor());
    igual(repo().versoes("decisoes", "DC-010").map(v => `${v.versao}:${v.situacao}`), ["2:Vigente", "1:Substituída"]);
    igual(repo().obter("decisoes", "DC-010").decisao, "Nova regra", "código aponta para a vigente");
    await repo().revogarDecisao(repo().obter("decisoes", "DC-010"), "Teste", gestor());
    igual(repo().obter("decisoes", "DC-010").situacao, "Revogada");
    igual(repo().obter("decisoes", "DC-010").motivoRevogacao, "Teste");
  });

  teste("T21", "Vínculos aparecem nos dois sentidos", async () => {
    await base();
    const citado = repo().referenciadoPor("pareceres", "PT-014").map(v => v.registro.codigo);
    ok(citado.includes("IM-008"), "impacto");
    ok(citado.includes("AT-031"), "ação");
    ok(citado.includes("AS-03"), "adequação");
  });

  teste("T22", "Dados de demonstração: só administrador remove, e só eles", async () => {
    await base();
    await repo().criar("pareceres", parecerValido({ titulo: "Real" }), gestor());
    await lanca(() => repo().removerDemonstracao(colab()), "administradores");
    await repo().removerDemonstracao(admin());
    igual(repo().contarDemonstracao(), 0);
    igual(repo().listar("pareceres").map(p => p.titulo), ["Real"], "registro real preservado");
  });

  teste("T23", "Códigos repetidos são detectados", async () => {
    await base();
    igual(repo().codigosRepetidos(), []);
    await repo().criar("impactos", { processo: "Duplicado", area: "Contábil", mudanca: "x", criticidade: "Baixa", status: "Identificado" }, gestor(), { codigo: "IM-001" });
    igual(repo().codigosRepetidos(), ["IM-001 (Mapeamento de impactos)"]);
  });

  teste("T24", "Anexo enviado e baixado com o mesmo conteúdo e hash", async () => {
    await base();
    const original = arquivo(PDF.concat([1, 2, 3]), "doc.pdf", "application/pdf");
    const anexo = await repo().enviarArquivo("pareceres", "PT-021", original, gestor(), 3);
    igual(anexo.sha256.length, 64, "SHA-256");
    const baixado = new Uint8Array(await (await repo().baixarArquivo(anexo)).arrayBuffer());
    igual([...baixado], PDF.concat([1, 2, 3]));
    await lanca(() => repo().baixarArquivo(repo().obter("pareceres", "PT-014").anexos[0]), "demonstração", "anexo sem arquivo");
  });

  // =====================================================================
  // Listas, filtros e telas
  // =====================================================================
  teste("T25", "Filtros, pesquisa, período e arquivados", async () => {
    await base();
    const T = RT.telas;
    T.pareceres();
    const f = T.filtrosDe("pareceres");
    f.campos.status = "Recebido";
    igual(T.registrosFiltrados("pareceres").length, 3, "status");
    f.campos.status = ""; f.busca = "nf3e";
    igual(T.registrosFiltrados("pareceres").map(p => p.codigo), ["PT-019"], "pesquisa sem acento e sem maiúscula");
    f.busca = ""; f.de = "2026-09-01"; f.ate = "2026-09-30";
    ok(T.registrosFiltrados("pareceres").every(p => p.dataRecebimento >= "2026-09-01" && p.dataRecebimento <= "2026-09-30"), "período");
    f.de = f.ate = "";
    await repo().arquivar("pareceres", repo().obter("pareceres", "PT-026"), "teste", gestor());
    ok(!T.registrosFiltrados("pareceres").some(p => p.codigo === "PT-026"), "arquivado oculto");
    f.arquivados = true;
    ok(T.registrosFiltrados("pareceres").some(p => p.codigo === "PT-026"), "arquivado com o filtro");
  });

  teste("T26", "Ordenação por coluna", async () => {
    await base();
    RT.telas.pareceres();
    RT.telas.filtrosDe("pareceres").ordem = { campo: "dataRecebimento", dir: 1 };
    const datas = RT.telas.registrosFiltrados("pareceres").map(p => p.dataRecebimento);
    igual(datas, datas.slice().sort());
  });

  teste("T27", "Todas as telas abrem nos quatro perfis", async () => {
    await base();
    const T = RT.telas;
    const telas = [
      () => T.visaoGeral(), () => T.pareceres(), () => T.impactos(), () => T.legislacao(), () => T.decisoes(),
      () => T.relatorios(), () => T.administracao(), () => T.busca("cbs"),
      () => { T.estado.plano.vista = "tabela"; return T.plano(); },
      () => { T.estado.plano.vista = "quadro"; return T.plano(); },
      () => { T.estado.plano.vista = "cronograma"; return T.plano(); },
      () => T.sistemas("adequacoes"), () => T.sistemas("testes"), () => T.sistemas("defeitos"),
      () => T.detalhe("pareceres", "PT-014"), () => T.detalhe("atividades", "AT-036"), () => T.detalhe("impactos", "IM-008"),
      () => T.detalhe("adequacoes", "AS-03"), () => T.detalhe("testes", "CT-011"), () => T.detalhe("defeitos", "DF-002"),
      () => T.perguntas(), () => T.detalhe("perguntas", "QA-001"), () => T.formulario("perguntas", null, "novo"),
      () => { T.filtrosDe("atividades").campos.frente = "Contratos"; const t = T.plano(); T.filtrosDe("atividades").campos.frente = ""; return t; },
      () => T.detalhe("normas", "NR-001"), () => T.detalhe("marcos", "MC-004"), () => T.detalhe("decisoes", "DC-012"),
      () => T.formulario("pareceres", null, "novo"), () => T.formulario("atividades", "AT-012", "editar"),
      () => T.formulario("decisoes", "DC-012", "nova-versao"),
      ...RT.relatorios.lista(admin()).map(d => () => T.relatorio(d.id))
    ];
    for (const u of [admin(), gestor(), colab(), consulta()]) {
      T.estado.usuario = u;
      telas.forEach((fn, i) => {
        const t = fn();
        ok(t && t.html && t.titulo, `tela ${i} vazia para ${u.perfil}`);
      });
    }
  });

  teste("T28", "Texto dos registros não executa código na página", async () => {
    await base();
    window.__ataque = undefined;
    const malicioso = '<img src=x onerror="window.__ataque=1"><script>window.__ataque=2</script>';
    await repo().criar("pareceres", parecerValido({ titulo: malicioso, descricao: malicioso }), gestor());
    const area = document.createElement("div");
    document.body.appendChild(area);
    area.innerHTML = RT.telas.detalhe("pareceres", "PT-027").html + RT.telas.pareceres().html + RT.telas.busca("img").html;
    await new Promise(r => setTimeout(r, 100));
    igual(area.querySelectorAll("img[src='x'], script").length, 0, "nenhum elemento injetado");
    igual(window.__ataque, undefined, "nenhum código executado");
    ok(area.textContent.includes("<img src=x"), "texto exibido como texto");
    area.remove();
  });

  teste("T29", "Acesso direto a formulário sem permissão é bloqueado", async () => {
    await base();
    RT.telas.estado.usuario = consulta();
    igual(RT.telas.formulario("pareceres", null, "novo").titulo, "Sem permissão", "consulta cadastrando");
    RT.telas.estado.usuario = colab();
    igual(RT.telas.formulario("atividades", "AT-036", "editar").titulo, "Sem permissão", "colaborador fora da área");
    igual(RT.telas.formulario("decisoes", "DC-012", "nova-versao").titulo, "Sem permissão", "colaborador versionando decisão");
    igual(RT.telas.relatorio("auditoria").titulo, "Sem permissão", "colaborador na trilha");
  });

  teste("T30", "Aprovação aparece como verificada na tela do parecer", async () => {
    await base();
    ok(RT.telas.detalhe("pareceres", "PT-014").html.includes("Aprovação verificada"), "verificada");
  });

  // =====================================================================
  // Relatórios e Excel
  // =====================================================================
  teste("T31", "Relatórios geram e fecham com os registros", async () => {
    await base();
    for (const d of RT.relatorios.lista(admin())) {
      const r = d.gerar({});
      ok(Array.isArray(r.resumo) && r.secoes.length, d.id);
      r.secoes.forEach(s => s.linhas.forEach(l => igual(l.length, s.colunas.length, `${d.id}/${s.titulo}: colunas`)));
    }
    const pt = RT.relatorios.def("pareceres").gerar({});
    const totalCategorias = pt.secoes[0].linhas.reduce((s, l) => s + l[l.length - 1], 0);
    igual(totalCategorias, pt.secoes[1].linhas.length, "pareceres por categoria x documentos");
    const ev = RT.relatorios.def("evolucao").gerar({});
    igual(ev.secoes[1].linhas.reduce((s, l) => s + l[1], 0), repo().listar("atividades").length, "ações por frente");
    const filtrado = RT.relatorios.def("atividades").gerar({ frente: "Contratos" });
    ok(filtrado.secoes[1].linhas.every(l => l[2] === "Contratos"), "filtro de frente");
  });

  teste("T32", "Trilha de alterações só para gestor e administrador", async () => {
    await base();
    ok(!RT.relatorios.lista(colab()).some(d => d.id === "auditoria"), "colaborador");
    ok(RT.relatorios.lista(gestor()).some(d => d.id === "auditoria"), "gestor");
  });

  async function lerZip(blob) {
    const b = new Uint8Array(await blob.arrayBuffer());
    const dv = new DataView(b.buffer);
    const dec = new TextDecoder();
    const arquivos = {};
    let p = 0;
    while (dv.getUint32(p, true) === 0x04034b50) {
      const crc = dv.getUint32(p + 14, true), tam = dv.getUint32(p + 18, true);
      const n = dv.getUint16(p + 26, true), x = dv.getUint16(p + 28, true);
      const nome = dec.decode(b.subarray(p + 30, p + 30 + n));
      const dados = b.subarray(p + 30 + n + x, p + 30 + n + x + tam);
      arquivos[nome] = { crc, dados, texto: dec.decode(dados) };
      p += 30 + n + x + tam;
    }
    const fim = b.length - 22;
    return { arquivos, assinaturaFinal: dv.getUint32(fim, true), totalCentral: dv.getUint16(fim + 10, true) };
  }

  teste("T33", "Planilha Excel: pacote íntegro e XML válido", async () => {
    await base();
    const r = RT.relatorios.def("testes").gerar({});
    const z = await lerZip(RT.xlsx.gerar(r.secoes, { titulo: "T", linhas: [["a", "b"]] }));
    igual(z.assinaturaFinal, 0x06054b50, "fim do ZIP");
    igual(z.totalCentral, Object.keys(z.arquivos).length, "diretório central");
    for (const parte of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet3.xml"]) ok(z.arquivos[parte], parte);
    for (const [nome, a] of Object.entries(z.arquivos)) {
      igual(RT.xlsx.crc32(a.dados), a.crc, `CRC de ${nome}`);
      const doc = new DOMParser().parseFromString(a.texto, "application/xml");
      igual(doc.getElementsByTagName("parsererror").length, 0, `XML de ${nome}`);
    }
  });

  teste("T34", "Planilha Excel: texto não vira fórmula, datas viram datas, abas válidas", async () => {
    const z = await lerZip(RT.xlsx.gerar([
      { titulo: "Aba: com [inválidos]?*", colunas: [{ rotulo: "Texto" }, { rotulo: "Data", tipo: "data" }, { rotulo: "Número", tipo: "numero" }], linhas: [["=1+1 & <b>\u0007", "2026-08-10", 42]] },
      { titulo: "Aba: com [inválidos]?*", colunas: [{ rotulo: "X" }], linhas: [] }
    ], { titulo: "T", linhas: [] }));
    const s = z.arquivos["xl/worksheets/sheet2.xml"].texto;
    ok(!s.includes("<f>"), "sem fórmula");
    ok(s.includes('t="inlineStr"') && s.includes("=1+1 &amp; &lt;b&gt;"), "texto escapado");
    ok(!s.includes("\u0007"), "caractere de controle removido");
    ok(s.includes('s="2"><v>46244</v>'), "data como número de série com formato de data");
    ok(s.includes("<v>42</v>"), "número");
    const wb = z.arquivos["xl/workbook.xml"].texto;
    ok(wb.includes('name="Aba  com  inválidos"') && wb.includes('name="Aba  com  inválidos (2)"'), "nomes de aba saneados e únicos: " + wb.match(/name="[^"]+"/g));
  });

  teste("T35", "Exportação de lista respeita os filtros da tela", async () => {
    await base();
    RT.telas.pareceres();
    RT.telas.filtrosDe("pareceres").campos.status = "Recebido";
    const p = RT.telas.planilhaDaLista("pareceres");
    igual(p.total, 3);
    ok(p.filtros.includes("Recebido"), "filtros descritos na aba Sobre");
  });

  // =====================================================================
  // SharePoint (Graph simulado)
  // =====================================================================
  async function comSharePoint(fn) {
    const sim = RT_TESTE.instalarGraphSimulado();
    try {
      const cfg = Object.assign({}, RT.config, { siteUrl: "https://empresa.sharepoint.com/sites/RT" });
      const novo = () => new RT.AdaptadorSharePoint(cfg, async () => "token-de-teste");
      await fn(sim.G, novo);
    } finally { sim.restaurar(); }
  }

  teste("T36", "SharePoint: criação das listas e da biblioteca com colunas tipadas", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo();
      igual((await sp.verificarListas()).length, 13);
      await sp.criarListas();
      igual(await sp.verificarListas(), []);
      const pareceres = Object.values(G.listas).find(l => l.nome === "RT_Pareceres");
      const tipo = n => Object.keys(pareceres.colunas.find(c => c.name === n)).find(k => !["name", "displayName"].includes(k));
      igual([tipo("status"), tipo("descricao"), tipo("demonstracao")], ["choice", "text", "boolean"]);
      ok(pareceres.colunas.find(c => c.name === "descricao").text.allowMultipleLines, "texto longo multilinha");
      igual(Object.values(G.listas).find(l => l.nome === "RT_Documentos").template, "documentLibrary");
    });
  });

  teste("T37", "SharePoint: gravação e releitura com paginação preservam os dados", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo(); await sp.criarListas();
      await repo().iniciar(sp);
      await repo().carregarDemonstracao(null);
      const antes = Object.fromEntries(Object.keys(RT.esquema).map(e => [e, repo().listar(e, { incluirArquivados: true }).length]));
      await repo().iniciar(novo());
      const depois = Object.fromEntries(Object.keys(RT.esquema).map(e => [e, repo().listar(e, { incluirArquivados: true }).length]));
      igual(depois, antes, "contagens");
      const pt = repo().obter("pareceres", "PT-014");
      igual([pt.anexos.length, pt.unidades], [4, ["Distribuição", "Transmissão"]], "listas e anexos");
      igual(repo().obter("atividades", "AT-040").dependencias, ["AT-012", "AT-033"], "vínculos");
      igual(typeof repo().obter("normas", "NR-001").ano, "number", "número");
      ok(G.chamadas.filter(c => c.startsWith("GET") && c.includes("/items")).length > Object.keys(RT.esquema).length, "paginação usada");
    });
  });

  teste("T38", "SharePoint: edição simultânea é detectada", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo(); await sp.criarListas();
      await repo().iniciar(sp); await repo().carregarDemonstracao(null);
      const versaoAberta = repo().obter("impactos", "IM-019");
      await repo().atualizar("impactos", versaoAberta, { criticidade: "Média" }, gestor());
      await lanca(() => repo().atualizar("impactos", versaoAberta, { criticidade: "Alta" }, gestor()), "Outra pessoa alterou");
    });
  });

  teste("T39", "SharePoint: anexos pequeno e grande (em partes) chegam íntegros", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo(); await sp.criarListas();
      await repo().iniciar(sp);
      const quem = { nome: "Mariana Costa", perfil: "Gestor" }; // listas ainda vazias neste teste
      const grandeBytes = new Uint8Array(5 * 1024 * 1024 + 321); grandeBytes.set(PDF); grandeBytes[grandeBytes.length - 1] = 7;
      const p = await repo().enviarArquivo("pareceres", "PT-016", arquivo(PDF, "pequeno.pdf"), quem, 1);
      const progresso = [];
      const g = await repo().enviarArquivo("pareceres", "PT-016", new File([grandeBytes], "grande:v2.pdf"), quem, 2, x => progresso.push(x));
      ok(progresso.length >= 2 && progresso[progresso.length - 1] === 100, "envio em partes com progresso");
      const volta = new Uint8Array(await (await repo().baixarArquivo(g)).arrayBuffer());
      igual(volta.length, grandeBytes.length, "tamanho");
      igual(volta[volta.length - 1], 7, "último byte");
      igual(new Uint8Array(await (await repo().baixarArquivo(p)).arrayBuffer()).length, PDF.length, "pequeno");
      ok(Object.values(G.arquivos).every(a => /^Pareceres\/PT-016\/\d{8}T\d{6}_/.test(a.caminho)), "pasta por registro e nome com data");
      ok(Object.values(G.arquivos).some(a => a.caminho.endsWith("grande_v2.pdf")), "nome saneado");
    });
  });

  teste("T40", "SharePoint: aprovação verificada pela autoria do servidor", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo(); await sp.criarListas();
      await repo().iniciar(sp); await repo().carregarDemonstracao(null);
      const usuarios = repo().listar("usuarios");
      G.autor = "mariana.costa@exemplo.com.br";
      await repo().aprovarParecer(repo().obter("pareceres", "PT-016"), gestor());
      G.autor = "rafael.lima@exemplo.com.br";
      await repo().atualizar("pareceres", repo().obter("pareceres", "PT-019"), { status: "Aprovado internamente" }, gestor(), "Aprovado internamente");
      await repo().iniciar(novo());
      const v16 = R().verificarAprovacao(repo().obter("pareceres", "PT-016"), repo().listar("historico"), usuarios, true);
      const v19 = R().verificarAprovacao(repo().obter("pareceres", "PT-019"), repo().listar("historico"), usuarios, true);
      ok(v16.ok, "gravada por gestor: " + v16.texto);
      ok(!v19.ok, "gravada por colaborador: " + v19.texto);
    });
  });

  teste("T41", "SharePoint: remoção da demonstração apaga só os dados fictícios", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo(); await sp.criarListas();
      await repo().iniciar(sp); await repo().carregarDemonstracao(null);
      await repo().criar("pareceres", parecerValido({ titulo: "Real" }), gestor());
      await repo().removerDemonstracao(admin());
      const pareceres = Object.values(G.listas).find(l => l.nome === "RT_Pareceres").itens;
      igual(pareceres.map(i => i.fields.titulo), ["Real"]);
      ok(Object.values(G.listas).every(l => l.itens.every(i => !i.fields.demonstracao)), "nenhum demo restante");
    });
  });

  // =====================================================================
  // Aplicação
  // =====================================================================
  teste("T42", "Perfil pelos papéis do Entra ID, com precedência e sem papel = Consulta", async () => {
    await base();
    const papeis = RT.auth.papeis, cfg = RT.config.perfisPeloEntra;
    try {
      RT.config.perfisPeloEntra = true;
      RT.auth.papeis = () => ["Portal.Colaborador", "Portal.Gestor"];
      const u = RT.app.identificarUsuario({ username: "rafael.lima@exemplo.com.br", name: "Rafael" });
      igual([u.perfil, u.area], ["Gestor", "Fiscal e tributária"]);
      RT.auth.papeis = () => [];
      igual(RT.app.identificarUsuario({ username: "novo@exemplo.com.br", name: "Novo" }).perfil, "Consulta");
      RT.config.perfisPeloEntra = false;
      igual(RT.app.identificarUsuario({ username: "novo@exemplo.com.br", name: "Novo" }).perfil, "Consulta", "fora da lista");
      igual(RT.app.identificarUsuario({ username: "MARIANA.COSTA@exemplo.com.br", name: "M" }).perfil, "Gestor", "lista, e-mail sem diferença de maiúsculas");
    } finally { RT.auth.papeis = papeis; RT.config.perfisPeloEntra = cfg; }
  });

  // =====================================================================
  // Importação de planilhas
  // =====================================================================
  async function planilhaDoExcel() {
    const resp = await fetch("fixtures/importacao-excel.xlsx", { cache: "reload" });
    return new File([await resp.blob()], "importacao-excel.xlsx");
  }
  const I = () => RT.importacao;
  const cabecalhoDe = aba => (aba.linhas[0] || []).map(c => c ? String(c.v) : "");
  const linhaNumero = (v, n) => v.linhas.find(l => l.numero === n);

  teste("T43", "Importação: lê uma planilha salva pelo Excel (compactada, com estilos e fórmulas)", async () => {
    const abas = await I().lerPlanilha(await planilhaDoExcel());
    igual(abas.map(a => a.nome), ["Ações", "Pareceres"]);
    const l2 = abas[0].linhas[1];
    igual([l2[0].v, l2[1].v], ["AT-900", "Mapear CFOP para IBS e CBS"], "textos compartilhados");
    ok(l2[6].data && I().dataDeSerial(l2[6].v) === "2026-11-01", "célula de data (fórmula DATE)");
    igual(l2[10].v, 0.6, "porcentagem");
    igual(abas[0].linhas[2][6].v, "15/11/2026", "data digitada como texto");
    ok(abas[0].linhas[2][7].data, "formato de data d/m/yyyy reconhecido");
    await lanca(() => I().lerPlanilha(new File(["a;b"], "dados.csv")), ".xlsx");
    await lanca(() => I().lerPlanilha(new File(["não é zip"], "falso.xlsx")), "não é uma planilha");
  });

  teste("T44", "Importação: o modelo gerado pelo portal é lido de volta com as mesmas colunas", async () => {
    await base();
    const blob = I().modelo("atividades");
    const abas = await I().lerPlanilha(new File([blob], "modelo.xlsx"));
    igual(abas.map(a => a.nome), ["Sobre", "Plano de implementação", "Instruções"]);
    const mapa = I().mapearAutomatico("atividades", cabecalhoDe(abas[1]));
    igual(mapa[0], "codigo");
    igual(mapa.filter(Boolean).length, cabecalhoDe(abas[1]).length, "todas as colunas do modelo reconhecidas");
  });

  teste("T45", "Importação: validação linha a linha da aba de ações", async () => {
    await base();
    const aba = (await I().lerPlanilha(await planilhaDoExcel()))[0];
    const v = I().validar("atividades", aba, I().mapearAutomatico("atividades", cabecalhoDe(aba)));
    igual(v.linhas.map(l => l.numero), [2, 3, 4, 6, 7], "linha vazia ignorada");
    igual(v.ignoradas, 1);
    const l2 = linhaNumero(v, 2);
    igual(l2.erros, [], "linha 2 válida");
    igual([l2.codigo, l2.dados.inicio, l2.dados.prazo, l2.dados.percentual, l2.dados.documentos], ["AT-900", "2026-11-01", "2026-11-30", 60, ["PT-014"]]);
    const l3 = linhaNumero(v, 3);
    igual(l3.erros, [], "linha 3 válida");
    igual([l3.dados.status, l3.dados.inicio, l3.dados.prazo, l3.dados.dependencias], ["Em andamento", "2026-11-15", "2026-12-20", ["AT-900"]], "texto normalizado e vínculo com outra linha da planilha");
    ok(/^AT-\d{3}$/.test(l3.codigo) && l3.codigo !== "AT-900", "código gerado");
    const e4 = linhaNumero(v, 4).erros.join(" | ");
    ["Frente de trabalho", "Fulano de Tal", "Prazo previsto", "AT-999"].forEach(t => ok(e4.includes(t), `linha 4 deveria acusar ${t}: ${e4}`));
    const e6 = linhaNumero(v, 6).erros.join(" | ");
    ok(e6.includes("Urgente") && e6.includes("dela mesma"), "linha 6: prioridade e autodependência juntas: " + e6);
    ok(linhaNumero(v, 7).erros.join(" ").includes("data de conclusão"), "linha 7: concluída sem data");
  });

  teste("T46", "Importação: parecer não entra aprovado; escolha múltipla separada por ponto e vírgula", async () => {
    await base();
    const aba = (await I().lerPlanilha(await planilhaDoExcel()))[1];
    const v = I().validar("pareceres", aba, I().mapearAutomatico("pareceres", cabecalhoDe(aba)));
    const ok2 = linhaNumero(v, 2);
    igual(ok2.erros, []);
    igual([ok2.dados.unidades, ok2.dados.dataRecebimento, ok2.dados.status], [["Distribuição", "Transmissão"], "2026-10-20", "Recebido"]);
    ok(linhaNumero(v, 3).erros.join(" ").includes("aprovação é feita no portal"), "aprovado recusado");
  });

  teste("T47", "Importação: grava só as linhas válidas, com histórico; reenviar não duplica códigos", async () => {
    await base();
    const aba = (await I().lerPlanilha(await planilhaDoExcel()))[0];
    const mapa = I().mapearAutomatico("atividades", cabecalhoDe(aba));
    const v = I().validar("atividades", aba, mapa);
    const antes = repo().listar("atividades").length;
    const r = await I().gravar("atividades", v, gestor(), "importacao-excel.xlsx");
    igual(r.gravadas.length, 2, "duas linhas válidas");
    igual(repo().listar("atividades").length, antes + 2);
    igual(repo().historicoDe("atividades", "AT-900")[0].acao, "Importado da planilha importacao-excel.xlsx (linha 2)");
    igual(repo().obter("atividades", "AT-900").criadoPor, "Mariana Costa");
    const de3 = repo().obter("atividades", r.gravadas[1]);
    igual(de3.dependencias, ["AT-900"], "vínculo entre linhas preservado");
    const segunda = I().validar("atividades", aba, mapa);
    ok(linhaNumero(segunda, 2).erros.join(" ").includes("já existe"), "código informado repetido");
    ok(linhaNumero(segunda, 3).avisos.join(" ").includes("mesmo título"), "aviso de provável duplicidade");
  });

  teste("T48", "Importação: só gestor e administrador; usuários só pelo administrador", async () => {
    await base();
    RT.telas.estado.usuario = colab();
    igual(RT.telas.importar().titulo, "Sem permissão");
    RT.telas.estado.usuario = gestor();
    ok(!RT.telas.importar().html.includes('value="usuarios"'), "gestor não importa usuários");
    RT.telas.estado.usuario = admin();
    ok(RT.telas.importar().html.includes('value="usuarios"'), "administrador importa usuários");
  });

  teste("T49", "Importação: relatório de problemas em Excel", async () => {
    await base();
    const aba = (await I().lerPlanilha(await planilhaDoExcel()))[0];
    const v = I().validar("atividades", aba, I().mapearAutomatico("atividades", cabecalhoDe(aba)));
    const rel = await I().lerPlanilha(new File([I().relatorioDeErros("atividades", aba, v)], "rel.xlsx"));
    const linhas = rel[1].linhas.slice(1);
    igual(linhas.map(l => l[0].v), [4, 6, 7], "linhas com erro");
    ok(String(linhas[0][2].v).includes("Fulano de Tal"), "motivo descrito");
  });

  // =====================================================================
  // Pareceres a partir de uma pasta de documentos
  // =====================================================================
  const P = () => RT.pasta;
  const PDF2 = n => new Uint8Array(PDF.concat([n]));

  // Pasta compartilhada simulada: 2 arquivos na raiz, 1 numa subpasta, 1 em formato não aceito
  function montarPastaPadrao(G) {
    G.criarPasta({ nome: "Pareceres recebidos", filhos: [
      { nome: "Parecer_creditos_IBS_revenda.pdf", conteudo: PDF2(1) },
      { nome: "Apresentacao_comite.pptx", conteudo: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9]) },
      { nome: "email_consultoria.msg", conteudo: new Uint8Array([1, 2, 3]) },
      { nome: "Consultoria Gama", filhos: [{ nome: "Nota_tecnica_NF3e.pdf", conteudo: PDF2(2) }] }
    ] });
  }

  async function comPasta(fn) {
    const anterior = RT.config.pastaPareceres, sub = RT.config.pastaIncluirSubpastas;
    RT.config.pastaPareceres = "https://empresa.sharepoint.com/:f:/s/RT/Pareceres?e=abc";
    RT.config.pastaIncluirSubpastas = true;
    try {
      await comSharePoint(async (G, novo) => {
        const sp = novo(); await sp.criarListas();
        await repo().iniciar(sp); await repo().carregarDemonstracao(null);
        RT.telas.estado.pasta = undefined;
        RT.telas.estado.usuario = gestor();
        montarPastaPadrao(G);
        await fn(G, novo);
      });
    } finally { RT.config.pastaPareceres = anterior; RT.config.pastaIncluirSubpastas = sub; }
  }

  teste("T50", "Pasta: lê a pasta compartilhada com subpastas e paginação", async () => {
    await comPasta(async G => {
      G.tamanhoPagina = 2;
      await P().carregarPasta();
      const st = P().estado();
      igual(st.raiz.nome, "Pareceres recebidos");
      igual(st.arquivos.map(a => a.caminho + a.nome).sort(), ["Apresentacao_comite.pptx", "Consultoria Gama/Nota_tecnica_NF3e.pdf", "Parecer_creditos_IBS_revenda.pdf", "email_consultoria.msg"]);
      ok(G.links[0].startsWith("u!") && !/[+/=]/.test(G.links[0]), "link codificado no formato do Graph");
      RT.config.pastaIncluirSubpastas = false;
      await P().carregarPasta();
      igual(P().estado().arquivos.length, 3, "sem subpastas");
      const tela = P().tela().html;
      ok(tela.includes("3 novos") || tela.includes("2 novos"), "contagem de novos");
      ok(tela.includes("em formato não aceito"), ".msg indicado como não aceito");
    });
  });

  teste("T51", "Pasta: cadastra, copia o documento, guarda o original e não repete", async () => {
    await comPasta(async (G, novo) => {
      await P().carregarPasta();
      const alvo = P().estado().arquivos.find(a => a.nome === "Parecer_creditos_IBS_revenda.pdf");
      P().selecionar(alvo.origemId, true);
      const linha = P().estado().linhas[alvo.origemId];
      igual([linha.titulo, linha.dataRecebimento, linha.status], ["Parecer creditos IBS revenda", "2026-10-15", "Recebido"], "sugestões a partir do arquivo");
      Object.assign(linha, { tipo: "Parecer", categoria: "Créditos de IBS e CBS", origem: "Consultoria Gama", area: "Fiscal e tributária", descricao: "Avaliar crédito na revenda." });
      const r = await P().cadastrar(gestor());
      igual(r.gravados.length, 1);
      const p = repo().obter("pareceres", r.gravados[0]);
      const a = p.anexos[0];
      igual([p.status, a.nome, a.origemCaminho], ["Recebido", "Parecer_creditos_IBS_revenda.pdf", "Parecer_creditos_IBS_revenda.pdf"]);
      ok(a.origemUrl.endsWith("Parecer_creditos_IBS_revenda.pdf"), "link do original");
      ok(Object.values(G.arquivos).some(x => x.caminho && x.caminho.startsWith(`Pareceres/${p.codigo}/`)), "cópia na biblioteca do portal");
      igual(a.sha256.length, 64, "hash da cópia");
      ok(repo().historicoDe("pareceres", p.codigo)[0].acao.includes("pasta de documentos"), "histórico indica a origem");
      // relendo do SharePoint, o arquivo aparece como já cadastrado
      await repo().iniciar(novo());
      RT.telas.estado.pasta = undefined;
      await P().carregarPasta();
      igual(P().jaCadastrados().get(alvo.origemId), p.codigo, "marcado como já cadastrado");
      P().selecionarTodosNovos(true);
      ok(!P().estado().selecionados[alvo.origemId], "não é selecionado de novo");
    });
  });

  teste("T52", "Pasta: só cadastra linhas completas; conteúdo falso é recusado", async () => {
    await comPasta(async G => {
      await P().carregarPasta();
      P().selecionarTodosNovos(true);
      const st = P().estado();
      igual(Object.keys(st.selecionados).length, 3, ".msg fora da seleção");
      st.comum = { tipo: "Parecer", categoria: "Incidência tributária", origem: "Consultoria Gama", area: "Fiscal e tributária" };
      P().aplicarComum();
      const ids = Object.keys(st.selecionados);
      st.linhas[ids[0]].descricao = "Completo";
      st.linhas[ids[1]].descricao = "Completo";
      // a terceira fica sem descrição
      const pdfFalso = st.arquivos.find(a => a.nome === "Parecer_creditos_IBS_revenda.pdf");
      G.arquivos[pdfFalso.itemId].blob = new Blob(["não é pdf"]);
      const antes = repo().listar("pareceres").length;
      const r = await P().cadastrar(gestor());
      igual(r.comErro, 1, "linha sem descrição");
      ok(st.erros[ids[2]].descricao, "erro apontado no campo");
      igual(r.falhas.length, 1, "pdf falso");
      ok(r.falhas[0].motivo.includes("não corresponde"), r.falhas[0].motivo);
      igual(repo().listar("pareceres").length, antes + 1, "só a linha válida e íntegra entrou");
    });
  });

  teste("T53", "Pasta: arquivos do computador funcionam também no modo demonstração", async () => {
    await base();
    await lanca(() => P().carregarPasta(), "ligado ao SharePoint");
    P().adicionarLocais([new File([PDF2(5)], "Estudo_custos.pdf", { lastModified: Date.UTC(2026, 8, 30, 12) })]);
    P().adicionarLocais([new File([PDF2(5)], "Estudo_custos.pdf", { lastModified: Date.UTC(2026, 8, 30, 12) })]);
    igual(P().estado().locais.length, 1, "mesmo arquivo não entra duas vezes");
    const id = P().estado().locais[0].origemId;
    P().selecionar(id, true);
    Object.assign(P().estado().linhas[id], { tipo: "Estudo", categoria: "Contabilidade e apuração", origem: "Interno", area: "Contábil", descricao: "Teste" });
    const r = await P().cadastrar(gestor());
    igual(r.gravados.length, 1);
    igual(repo().obter("pareceres", r.gravados[0]).dataRecebimento, "2026-09-30", "data sugerida pela data do arquivo");
  });

  teste("T54", "Pasta: Consulta não cadastra; botão só aparece para quem pode", async () => {
    await base();
    RT.telas.estado.usuario = consulta();
    igual(P().tela().titulo, "Sem permissão");
    ok(!RT.telas.pareceres().html.includes("#pareceres/pasta"), "sem botão para Consulta");
    await lanca(() => P().cadastrar(consulta()), "não permite");
    RT.telas.estado.usuario = colab();
    ok(RT.telas.pareceres().html.includes("#pareceres/pasta"), "botão para Colaborador");
  });

  // =====================================================================
  // Perguntas e respostas, período e histórico do parecer, plano por área
  // =====================================================================
  teste("T55", "Perguntas: só conta como respondida com resposta, autor e data", async () => {
    await base();
    const q = { pergunta: "Pergunta de teste?", categoria: "Incidência tributária", dataPergunta: "2026-10-01", status: "Respondida" };
    igual(Object.keys(R().validar("perguntas", q, {})).sort(), ["dataResposta", "respondidoPor", "resposta"]);
    ok(R().validar("perguntas", Object.assign({}, q, { resposta: "R", respondidoPor: "Mariana Costa", dataResposta: "2026-09-01" }), {}).dataResposta, "resposta antes da pergunta");
    igual(R().validar("perguntas", Object.assign({}, q, { status: "Aguardando resposta" }), {}), {}, "aguardando sem resposta é válido");
    const { registro } = await repo().criar("perguntas", Object.assign({}, q, { status: "Aguardando resposta", perguntadoPor: "Rafael Lima" }), colab());
    igual(registro.codigo, "QA-005");
    ok(R().pode(colab(), "editar", "perguntas", registro), "quem perguntou pode editar");
    ok(!R().pode(U("Camila Rocha"), "editar", "perguntas", registro), "colaborador de outra área sem vínculo não edita");
    ok(RT.telas.busca("conta contábil").html.includes("QA-004"), "pesquisa global encontra perguntas");
    ok(repo().referenciadoPor("pareceres", "PT-014").some(v => v.registro.codigo === "QA-001"), "parecer mostra a pergunta que ele fundamenta");
    const tela = RT.telas.perguntas().html;
    ok(tela.includes("<details") && tela.includes("Aguardando resposta"), "lista em formato de perguntas e respostas");
  });

  teste("T56", "Parecer: período no formato MM/AAAA, inclusive vindo do Excel", async () => {
    await base();
    const base1 = parecerValido();
    igual(R().validar("pareceres", Object.assign({}, base1, { periodo: "03/2026" }), {}), {});
    ["13/2026", "3/2026", "2026-03", "março/2026"].forEach(v => ok(R().validar("pareceres", Object.assign({}, base1, { periodo: v }), {}).periodo, v));
    const campo = RT.esquema.pareceres.campo("periodo");
    const ctx = { usuarios: [], existe: () => true };
    igual(RT.importacao.converter("pareceres", campo, { v: 46082, data: true }, ctx).valor, "03/2026", "célula de data do Excel");
    igual(RT.importacao.converter("pareceres", campo, { v: "3/2026" }, ctx).valor, "03/2026", "texto com mês de um dígito");
    ok(RT.importacao.converter("pareceres", campo, { v: "13/2026" }, ctx).erro, "mês inválido");
    ok(RT.telas.pareceres().html.includes("08/2026"), "período na lista");
  });

  teste("T57", "Parecer: solicitações e retornos ficam no histórico e no SharePoint", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo(); await sp.criarListas();
      await repo().iniciar(sp); await repo().carregarDemonstracao(null);
      const p = repo().obter("pareceres", "PT-022");
      const nova = { tipo: "Solicitação", data: "2026-10-22", texto: "Pedido de prazo para a versão final.", registradoPor: "Camila Rocha", registradoEm: "2026-10-22T10:00:00" };
      await repo().atualizar("pareceres", p, { interacoes: [nova] }, U("Camila Rocha"), "Solicitação registrada (22/10/2026): Pedido de prazo para a versão final.");
      await repo().iniciar(novo());
      igual(repo().obter("pareceres", "PT-022").interacoes, [nova], "relido do SharePoint");
      igual(repo().obter("pareceres", "PT-014").interacoes.map(i => i.tipo), ["Solicitação", "Retorno", "Solicitação", "Retorno"]);
      ok(repo().historicoDe("pareceres", "PT-022")[0].acao.startsWith("Solicitação registrada"), "histórico");
      RT.telas.estado.usuario = gestor();
      const html = RT.telas.detalhe("pareceres", "PT-014").html;
      ok(html.includes("Solicitações e retornos") && html.includes("Registrar retorno"), "bloco na tela do parecer");
    });
  });

  teste("T58", "Plano: escolher a área mostra só o plano dela, com números da área", async () => {
    await base();
    const T = RT.telas;
    T.filtrosDe("atividades").campos.frente = "Contratos";
    const html = T.plano().html;
    const daArea = repo().listar("atividades").filter(a => a.frente === "Contratos");
    ok(T.registrosFiltrados("atividades").every(a => a.frente === "Contratos"), "lista só da área");
    igual(T.registrosFiltrados("atividades").length, daArea.length);
    ok(html.includes("Plano de Contratos") && html.includes(`${daArea.length} ações`), "resumo da área");
    const bloqueadas = daArea.filter(a => a.status === "Bloqueada").length;
    ok(html.includes(`Bloqueadas</div><div class="kpi-valor num">${bloqueadas}<`), "indicador calculado só com a área");
    ok(html.includes("atividades/novo?frente=Contratos"), "nova ação já sai na área");
    T.filtrosDe("atividades").campos.frente = "";
    ok(T.plano().html.includes(`Todas as áreas <span class="num">${repo().listar("atividades").length}`), "todas as áreas");
  });

  teste("T59", "SharePoint: listas antigas recebem as colunas novas sem perder dados", async () => {
    await comSharePoint(async (G, novo) => {
      const sp = novo(); await sp.criarListas();
      // simula uma lista criada antes desta versão: sem as colunas de período e histórico
      const lista = Object.values(G.listas).find(l => l.nome === "RT_Pareceres");
      lista.colunas = lista.colunas.filter(c => !["periodo", "interacoes"].includes(c.name));
      lista.itens.push({ id: "999", etag: '"e,1"', versao: 1, fields: { Title: "PT-900", titulo: "Antigo" }, createdBy: { user: { email: "x" } } });
      const faltam = await novo().colunasFaltando();
      igual(faltam.map(f => [f.nome, f.campos.map(c => c.nome)]), [["RT_Pareceres", ["periodo", "interacoes"]]]);
      const r = await novo().criarListas();
      igual([r.listas.length, r.colunas], [0, 2]);
      igual(await novo().colunasFaltando(), [], "nada mais faltando");
      ok(lista.itens.some(i => i.fields.Title === "PT-900"), "item antigo preservado");
      await repo().iniciar(novo());
      await repo().criar("pareceres", parecerValido({ periodo: "10/2026" }), { nome: "Mariana Costa", perfil: "Gestor" }); // listas sem usuários neste teste
      ok(lista.itens.some(i => i.fields.periodo === "10/2026"), "período gravado na coluna nova");
    });
  });

  // =====================================================================
  // Execução
  // =====================================================================
  async function executar() {
    // Espera o app.js terminar a própria inicialização em modo demonstração
    for (let i = 0; i < 50 && !RT.telas.estado.usuario; i++) await new Promise(r => setTimeout(r, 50));
    const corpo = document.getElementById("resultados");
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    let passou = 0, falhou = 0;
    const inicio = performance.now();
    for (const c of casos) {
      const t0 = performance.now();
      let erro = null;
      try { await c.fn(); } catch (e) { erro = e; }
      const ms = Math.round(performance.now() - t0);
      if (erro) falhou++; else passou++;
      corpo.insertAdjacentHTML("beforeend", `<tr><td class="id">${c.id}</td><td>${esc(c.nome)}</td>
        <td class="${erro ? "falha" : "ok"}">${erro ? "Falhou" : "Passou"}</td><td>${ms} ms</td>
        <td class="msg">${erro ? esc(erro instanceof Falha ? erro.message : (erro.stack || erro.message)) : ""}</td></tr>`);
    }
    const total = Math.round(performance.now() - inicio);
    document.getElementById("resumo").innerHTML = `
      <div><strong>${casos.length}</strong>testes</div>
      <div class="ok"><strong>${passou}</strong>passaram</div>
      <div class="${falhou ? "falha" : ""}"><strong>${falhou}</strong>falharam</div>
      <div><strong>${(total / 1000).toFixed(1)} s</strong>duração</div>`;
    window.RESULTADO_TESTES = { total: casos.length, passou, falhou };
    document.title = `Testes: ${passou} de ${casos.length} passaram`;
  }

  window.addEventListener("load", executar);
})();
