/*
 * Telas do portal. Cada função devolve { titulo, html } e lê os registros do repositório;
 * nenhum número é escrito à mão: indicadores, gráficos e contagens vêm dos dados.
 */
window.RT = window.RT || {};

RT.telas = (function () {
  const U = RT.ui;
  const { esc, fmtData, fmtDataCurta, fmtDataHora, tag, prio, natureza, vinculos, progresso } = U;
  const repo = () => RT.repositorio;
  const R = () => RT.regras;
  const E = () => RT.esquema;

  const estado = {
    usuario: null,
    filtros: {},
    fontes: {},
    plano: { vista: "tabela", destaque: "todas" },
    sistemas: { aba: "adequacoes" },
    decisoes: { historico: false },
    anexosPendentes: {}
  };

  const MODULO_DA_ENTIDADE = {
    pareceres: "pareceres", atividades: "plano", impactos: "impactos", adequacoes: "sistemas", testes: "sistemas",
    defeitos: "sistemas", normas: "legislacao", marcos: "legislacao", decisoes: "decisoes", usuarios: "administracao"
  };
  const ROTULO_MODULO = {
    pareceres: "Pareceres e estudos", plano: "Plano de implementação", impactos: "Mapeamento de impactos",
    sistemas: "Sistemas e testes", legislacao: "Legislação e cronograma", decisoes: "Decisões e diretrizes", administracao: "Administração"
  };
  const CAMPO_TITULO = {
    pareceres: "titulo", atividades: "nome", impactos: "processo", adequacoes: "requisito", testes: "cenario",
    defeitos: "descricao", normas: "titulo", marcos: "titulo", decisoes: "assunto", usuarios: "nome"
  };
  const ROTULO_COLUNA = {
    codigo: "Código", dataRecebimento: "Recebido", responsavel: "Responsável", percentual: "Conclusão", dependencias: "Dependências",
    atividades: "Ações", impactos: "Impactos", respTecnico: "Resp. técnico", respTributario: "Resp. tributário", executadoPor: "Executado por",
    executadoEm: "Executado em", abertoEm: "Aberto em", dataDecisao: "Data", areas: "Áreas", situacao: "Situação", versao: "Versão",
    publicacao: "Publicação", adequacao: "Adequação", teste: "Cenário", area: "Área", sistema: "Sistema", prazo: "Prazo"
  };

  const normalizar = s => String(s === undefined || s === null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const usuario = () => estado.usuario;
  const pode = (acao, ent, reg) => R().pode(usuario(), acao, ent, reg);
  const icone = {
    mais: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    editar: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'
  };

  // ======================================================================
  // Filtros e ordenação
  // ======================================================================
  function filtrosDe(ent) {
    if (!estado.filtros[ent]) estado.filtros[ent] = { busca: "", campos: {}, de: "", ate: "", arquivados: false, ordem: { campo: "codigo", dir: -1 } };
    return estado.filtros[ent];
  }

  function aplicarFiltros(ent, registros) {
    const f = filtrosDe(ent);
    const e = E()[ent];
    let r = registros;
    if (!f.arquivados) r = r.filter(x => !x.arquivado);
    for (const [campo, val] of Object.entries(f.campos)) {
      if (!val) continue;
      const c = e.campo(campo);
      r = r.filter(x => c && c.tipo === "multiOpcao" ? (x[campo] || []).includes(val) : x[campo] === val);
    }
    if (e.filtroPeriodo && (f.de || f.ate)) {
      r = r.filter(x => { const v = x[e.filtroPeriodo]; return v && (!f.de || v >= f.de) && (!f.ate || v <= f.ate); });
    }
    if (f.busca) {
      const termo = normalizar(f.busca);
      r = r.filter(x => normalizar(e.titulo(x)).includes(termo) ||
        e.busca.some(c => normalizar(Array.isArray(x[c]) ? x[c].join(" ") : x[c]).includes(termo)));
    }
    return r;
  }

  function valorOrdenacao(ent, campo, r) {
    if (campo === "codigo") { const m = /(\d+)$/.exec(r.codigo || ""); return (m ? Number(m[1]) : 0) * 100 + (Number(r.versao) || 0); }
    const c = E()[ent].campo(campo);
    if (!c) return normalizar(campo === "titulo" ? E()[ent].titulo(r) : "");
    if (c.tipo === "opcao" && c.opcoes) return c.opcoes.indexOf(r[campo]);
    if (c.tipo === "numero") return Number(r[campo] || 0);
    if (Array.isArray(r[campo])) return r[campo].length;
    if (c.tipo === "booleano") return r[campo] ? 1 : 0;
    return normalizar(r[campo]) || "￿";
  }

  function ordenar(ent, registros) {
    const { campo, dir } = filtrosDe(ent).ordem;
    return registros.slice().sort((a, b) => {
      const va = valorOrdenacao(ent, campo, a), vb = valorOrdenacao(ent, campo, b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }

  function opcoesDoFiltro(ent, campo) {
    const c = E()[ent].campo(campo);
    if (c.tipo === "usuario") {
      return [...new Set(repo().listar(ent, { incluirArquivados: true }).map(r => r[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
    return c.opcoes || [];
  }

  function barraFiltros(ent, opcoes) {
    opcoes = opcoes || {};
    const f = filtrosDe(ent);
    const e = E()[ent];
    const campos = (opcoes.filtros || e.filtros).map(nome => {
      const c = e.campo(nome);
      return `<div class="campo"><label for="ff-${ent}-${nome}">${esc(ROTULO_COLUNA[nome] || c.rotulo)}</label>
        <select id="ff-${ent}-${nome}" data-filtro="campo" data-ent="${ent}" data-campo="${nome}">
          <option value="">Todos</option>
          ${opcoesDoFiltro(ent, nome).map(o => `<option${f.campos[nome] === o ? " selected" : ""}>${esc(o)}</option>`).join("")}
        </select></div>`;
    }).join("");
    const periodo = e.filtroPeriodo ? `
      <div class="campo curto"><label for="ff-${ent}-de">${esc(e.campo(e.filtroPeriodo).rotulo)} de</label><input id="ff-${ent}-de" type="date" value="${esc(f.de)}" data-filtro="de" data-ent="${ent}"></div>
      <div class="campo curto"><label for="ff-${ent}-ate">até</label><input id="ff-${ent}-ate" type="date" value="${esc(f.ate)}" data-filtro="ate" data-ent="${ent}"></div>` : "";
    return `
      <div class="filtros">
        <div class="campo largo"><label for="ff-${ent}-busca">Pesquisar</label><input id="ff-${ent}-busca" type="search" value="${esc(f.busca)}" placeholder="Palavra-chave, código…" data-filtro="busca" data-ent="${ent}" autocomplete="off"></div>
        ${campos}${periodo}
        <div class="campo campo-fim">
          <label class="check"><input type="checkbox" data-filtro="arquivados" data-ent="${ent}"${f.arquivados ? " checked" : ""}> Incluir arquivados</label>
          <button type="button" class="botao-texto" data-acao="limpar-filtros" data-ent="${ent}">Limpar filtros</button>
        </div>
        ${pode("exportar") ? `<div class="campo campo-fim exportar">
          <button type="button" class="botao pequeno" data-acao="exportar-lista" data-ent="${ent}">Excel</button>
          <button type="button" class="botao pequeno" data-acao="imprimir" data-ent="${ent}">Imprimir ou PDF</button>
        </div>` : ""}
      </div>`;
  }

  // ======================================================================
  // Tabela genérica
  // ======================================================================
  function celula(ent, col, r) {
    const e = E()[ent];
    if (col === "codigo") {
      const cod = esc(r.codigo) + (e.versionada ? ` <span class="muted">v${esc(r.versao)}</span>` : "");
      return `<td class="codigo"><a class="link-codigo" href="${U.rotaRegistro(ent, r.codigo)}">${cod}</a></td>`;
    }
    if (col === CAMPO_TITULO[ent]) {
      const titulo = col === "titulo" && !e.campo("titulo") ? e.titulo(r) : r[col];
      const sub = [];
      if (ent === "pareceres") sub.push(esc(r.tipo), `${(r.anexos || []).length} anexo${(r.anexos || []).length === 1 ? "" : "s"}`);
      if (ent === "atividades") sub.push(esc(r.frente));
      if (ent === "adequacoes") sub.push(esc(r.alteracao));
      if (ent === "testes") sub.push(esc(r.dados));
      if (ent === "normas") sub.push(esc(r.tipo));
      return `<td><a class="link" href="${U.rotaRegistro(ent, r.codigo)}">${esc(titulo || "(sem título)")}</a>
        ${r.arquivado ? ` ${tag("Arquivado")}` : ""}
        ${sub.filter(Boolean).length ? `<div class="item-sub">${sub.filter(Boolean).join(" · ")}</div>` : ""}</td>`;
    }
    if (ent === "atividades" && col === "status") {
      return `<td>${tag(r.status)}${R().atrasada(r) ? " " + tag("Atrasada") : ""}</td>`;
    }
    if (ent === "atividades" && col === "prazo") {
      let nota = "";
      if (r.status === "Concluída" && r.dataConclusao) nota = `entregue em ${fmtDataCurta(r.dataConclusao)}`;
      else if (!R().encerrada(r) && r.prazo) {
        const d = R().diasEntre(R().hojeISO(), r.prazo);
        nota = d < 0 ? `vencido há ${-d} dia${d === -1 ? "" : "s"}` : d === 0 ? "vence hoje" : d <= 30 ? `em ${d} dia${d === 1 ? "" : "s"}` : "";
      }
      return `<td class="data">${fmtData(r.prazo)}${nota ? `<small>${nota}</small>` : ""}</td>`;
    }
    if (ent === "atividades" && col === "dependencias") {
      const todas = repo().listar("atividades");
      const pend = R().dependenciasPendentes(r, todas);
      const trava = R().bloqueiaOutras(r, todas);
      const partes = [];
      if (pend.length) partes.push(`Aguarda ${vinculos("atividades", pend)}`);
      if (trava.length) partes.push(`<b>Trava</b> ${vinculos("atividades", trava)}`);
      return `<td class="dep">${partes.join("<br>") || '<span class="muted">—</span>'}</td>`;
    }
    const c = e.campo(col);
    if (!c) return `<td></td>`;
    const cls = c.tipo === "data" ? ' class="data"' : "";
    return `<td${cls}>${U.valor(c, r)}</td>`;
  }

  function tabela(ent, registros, opcoes) {
    opcoes = opcoes || {};
    const e = E()[ent];
    const cols = opcoes.colunas || e.colunas;
    const { campo: ordCampo, dir } = filtrosDe(ent).ordem;
    if (!registros.length) {
      return `<div class="vazio">${opcoes.vazio || "Nenhum registro encontrado com esses filtros."}</div>`;
    }
    const cab = cols.map(col => {
      const c = e.campo(col);
      const rot = ROTULO_COLUNA[col] || (c ? c.rotulo : col === "titulo" ? "Norma" : col);
      const ativo = ordCampo === col;
      return `<th aria-sort="${ativo ? (dir === 1 ? "ascending" : "descending") : "none"}"><button type="button" class="th-ordenar" data-acao="ordenar" data-ent="${ent}" data-campo="${col}">${esc(rot)}<span class="seta">${ativo ? (dir === 1 ? "↑" : "↓") : ""}</span></button></th>`;
    }).join("");
    const linhas = registros.map(r => {
      const alerta = ent === "atividades" && R().atrasada(r);
      return `<tr class="${alerta ? "linha-alerta" : ""}${r.arquivado || r.situacao === "Substituída" || r.situacao === "Revogada" ? " linha-apagada" : ""}">${cols.map(col => celula(ent, col, r)).join("")}</tr>`;
    }).join("");
    return `<div class="tabela-wrap"><table><thead><tr>${cab}</tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  // Lista com filtros que se atualiza sem redesenhar a página
  function blocoLista(ent, opcoes) {
    opcoes = opcoes || {};
    estado.fontes[ent] = opcoes;
    return `<div class="bloco">
      ${opcoes.semFiltros ? "" : barraFiltros(ent, opcoes)}
      <div data-lista="${ent}">${conteudoLista(ent)}</div>
    </div>`;
  }

  function conteudoLista(ent) {
    const op = estado.fontes[ent] || {};
    const base = repo().listar(ent, { incluirArquivados: true });
    const preFiltrados = op.preFiltro ? op.preFiltro(base) : base;
    const filtrados = ordenar(ent, aplicarFiltros(ent, preFiltrados));
    const totalAtivos = preFiltrados.filter(r => !r.arquivado).length;
    if (op.render) return op.render(filtrados, totalAtivos);
    return tabela(ent, filtrados, op) +
      `<div class="rodape-tabela">${filtrados.length === totalAtivos ? `${filtrados.length} registro${filtrados.length === 1 ? "" : "s"}` : `${filtrados.length} de ${totalAtivos} registros`}</div>`;
  }

  function atualizarLista(ent) {
    const alvo = document.querySelector(`[data-lista="${ent}"]`);
    if (alvo) alvo.innerHTML = conteudoLista(ent);
  }

  // ======================================================================
  // Peças comuns
  // ======================================================================
  function cabecalho({ titulo, descricao, acoes, voltar, sobre }) {
    return `
      ${voltar ? `<a class="link voltar" href="${voltar.href}">← ${esc(voltar.texto)}</a>` : ""}
      <div class="cabecalho">
        <div>
          ${sobre ? `<div class="codigo">${sobre}</div>` : ""}
          <h1>${esc(titulo)}</h1>
          ${descricao ? `<p>${descricao}</p>` : ""}
        </div>
        ${acoes ? `<div class="acoes">${acoes}</div>` : ""}
      </div>`;
  }

  function botaoNovo(ent, texto) {
    if (!pode("criar", ent)) return "";
    return `<a class="botao primario" href="#${ent}/novo">${icone.mais}${esc(texto || `Nov${E()[ent].genero} ${E()[ent].singular}`)}</a>`;
  }

  function kpi(rotulo, valor, nota, classe, ponto) {
    return `<div class="bloco kpi${classe ? " " + classe : ""}"><div class="kpi-rotulo">${ponto ? `<span class="ponto" style="background:${ponto}"></span>` : ""}${esc(rotulo)}</div><div class="kpi-valor num">${valor}</div>${nota ? `<div class="kpi-nota">${nota}</div>` : ""}</div>`;
  }

  const pct = (n, t) => t ? Math.round((n / t) * 100) : 0;

  // ======================================================================
  // 1. Visão geral
  // ======================================================================
  function visaoGeral() {
    const ind = R().indicadores(repo().todos());
    const a = ind.atividades;
    const st = a.status;

    // Evolução
    const ev = ind.evolucao;
    const xs = ev.map((_, i) => 70 + i * (480 / Math.max(1, ev.length - 1)));
    const y = v => 180 - v * 1.5;
    const linha = campo => ev.map((p, i) => `${xs[i].toFixed(0)},${y(p[campo]).toFixed(0)}`).join(" ");
    const ultimo = ev[ev.length - 1] || { realizado: 0, previsto: 0 };
    const dif = ultimo.realizado - ultimo.previsto;

    // Rosca
    const cores = { "Concluída": "var(--acento-600)", "Em andamento": "var(--marca-600)", "Em validação": "var(--marca-300)", "Bloqueada": "var(--vermelho)", "Não iniciada": "var(--cinza-300)", "Cancelada": "var(--cinza-500)" };
    let acum = 0;
    const fatias = RT.listas.statusAtividade.map(s => {
      const ini = acum; acum += pct(st[s], a.total || 1) ; return `${cores[s]} ${ini}% ${Math.min(acum, 100)}%`;
    });
    const gradiente = a.total ? `conic-gradient(${fatias.join(",")}, var(--cinza-300) ${Math.min(acum, 100)}% 100%)` : "var(--cinza-claro)";

    // Impactos por frente
    const maxArea = Math.max(1, ...ind.impactos.porArea.map(x => x.total));
    const barrasImpacto = ind.impactos.porArea.filter(x => x.total).sort((p, q) => q.total - p.total).map(x => `
      <li>${esc(x.area)}<span class="trilho" style="max-width:${pct(x.total, maxArea)}%">
        <span class="b-alta" style="width:${pct(x.Alta, x.total)}%"></span><span class="b-media" style="width:${pct(x["Média"], x.total)}%"></span><span class="b-baixa" style="width:${100 - pct(x.Alta, x.total) - pct(x["Média"], x.total)}%"></span>
      </span><span class="num">${x.total}</span></li>`).join("");

    // Testes
    const t = ind.testes;
    const ts = t.status;
    const corTeste = { "Aprovado": "var(--verde)", "Reprovado": "var(--vermelho)", "Bloqueado": "var(--ambar)", "Em execução": "var(--marca-400)", "Não iniciado": "var(--cinza-200)" };
    const maxRep = Math.max(1, ...t.reprovadosPorSistema.map(x => x[1]));

    // Linha do tempo
    const marcos = repo().listar("marcos");
    const legais = marcos.filter(m => m.natureza !== "Interno").sort((p, q) => (p.data || "9999").localeCompare(q.data || "9999"));
    const hoje = ind.hoje;
    const internos = marcos.filter(m => m.natureza === "Interno" && m.data >= hoje).sort((p, q) => p.data.localeCompare(q.data)).slice(0, 3);

    // Próximos prazos
    const limite = new Date(); limite.setDate(limite.getDate() + 45);
    const limiteISO = R().isoLocal(limite);
    const prazos = repo().listar("atividades").filter(x => !R().encerrada(x) && x.prazo && x.prazo <= limiteISO)
      .sort((p, q) => p.prazo.localeCompare(q.prazo)).slice(0, 7);

    // Pendências críticas
    const todas = repo().listar("atividades");
    const pend = [];
    todas.filter(x => x.status === "Bloqueada" && ["Crítica", "Alta"].includes(x.prioridade)).forEach(x => {
      const trava = R().bloqueiaOutras(x, todas);
      pend.push({ icone: "cadeado", titulo: `${x.codigo} bloqueada: ${x.nome}`, sub: (x.riscos || "") + (trava.length ? ` Trava ${trava.length} aç${trava.length === 1 ? "ão" : "ões"}.` : ""), href: U.rotaRegistro("atividades", x.codigo) });
    });
    todas.filter(x => R().atrasada(x) && x.prioridade === "Crítica").forEach(x => {
      pend.push({ icone: "relogio", titulo: `${x.codigo} atrasada há ${-R().diasEntre(hoje, x.prazo)} dias`, sub: x.nome, href: U.rotaRegistro("atividades", x.codigo) });
    });
    const defAltos = ind.defeitosAbertos.filter(d => d.severidade === "Alta");
    if (defAltos.length) pend.push({ icone: "alerta", titulo: `${defAltos.length} defeito${defAltos.length === 1 ? "" : "s"} de severidade alta em aberto`, sub: defAltos.map(d => d.codigo).join(", "), href: "#sistemas/defeitos" });
    const semResp = ind.pareceres.semResponsavel;
    if (semResp.length) {
      const maisAntigo = semResp.reduce((p, q) => p.dataRecebimento < q.dataRecebimento ? p : q);
      pend.push({ icone: "doc", titulo: `${semResp.length} parecer${semResp.length === 1 ? "" : "es"} recebido${semResp.length === 1 ? "" : "s"} sem responsável`, sub: `O mais antigo chegou há ${R().diasEntre(maisAntigo.dataRecebimento, hoje)} dias.`, href: "#pareceres" });
    }
    const svgs = {
      cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      alerta: '<path d="M12 8v5M12 16.5v.01"/><circle cx="12" cy="12" r="9"/>',
      doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'
    };

    // Últimas atualizações
    const hist = repo().listar("historico").slice().sort((p, q) => q.data.localeCompare(p.data)).slice(0, 6);

    const pp = ind.pareceres.status;
    const html = `
      ${cabecalho({ titulo: "Visão geral", descricao: `Situação da preparação para a Reforma Tributária em ${fmtData(hoje)}. Os números abaixo são calculados a partir dos registros do portal.` })}

      <h2 class="secao-titulo">Plano de implementação</h2>
      <div class="kpis kpis-6">
        ${kpi("Ações mapeadas", a.total, `em ${a.frentes} frente${a.frentes === 1 ? "" : "s"} de trabalho`, "destaque")}
        ${kpi("Concluídas", `${a.concluidas} <small>${a.percentual}%</small>`, "das ações não canceladas", "", "var(--acento-600)")}
        ${kpi("Em andamento", a.emAndamento, `${a.emValidacao} em validação`, "", "var(--marca-600)")}
        ${kpi("Não iniciadas", a.naoIniciadas, `${a.canceladas} cancelada${a.canceladas === 1 ? "" : "s"} fora da conta`, "", "var(--cinza-300)")}
        ${kpi("Bloqueadas", a.bloqueadas, `${a.travando} aç${a.travando === 1 ? "ão trava" : "ões travam"} outras`, "", "var(--vermelho)")}
        ${kpi("Atrasadas", a.atrasadas, "prazo vencido e não concluídas", a.atrasadas ? "alerta" : "", "var(--vermelho)")}
      </div>

      <h2 class="secao-titulo">Conhecimento, impactos e sistemas</h2>
      <div class="kpis kpis-4">
        <div class="bloco kpi"><div class="kpi-rotulo">Pareceres e estudos</div><div class="kpi-valor num">${ind.pareceres.total}</div>
          <div class="kpi-nota">${pp["Aprovado internamente"]} aprovados internamente · ${pp["Recebido"]} recebidos sem análise</div>
          <div class="barra-mini" aria-hidden="true"><span style="width:${pct(pp["Aprovado internamente"], ind.pareceres.total)}%;background:var(--acento-600)"></span><span style="width:${pct(pp["Análise concluída"], ind.pareceres.total)}%;background:var(--marca-500)"></span><span style="width:${pct(pp["Em elaboração"], ind.pareceres.total)}%;background:var(--marca-300)"></span></div></div>
        <div class="bloco kpi"><div class="kpi-rotulo">Impactos identificados</div><div class="kpi-valor num">${ind.impactos.total}</div>
          <div class="kpi-nota">${ind.impactos.alta} de criticidade alta · ${ind.impactos.adequados} já adequados</div>
          <div class="barra-mini" aria-hidden="true"><span style="width:${pct(ind.impactos.adequados, ind.impactos.total)}%;background:var(--acento-600)"></span></div></div>
        <div class="bloco kpi"><div class="kpi-rotulo">Adequações sistêmicas pendentes</div><div class="kpi-valor num">${ind.adequacoes.pendentes} <small>de ${ind.adequacoes.total}</small></div>
          <div class="kpi-nota">${ind.adequacoes.implantadas} implantadas</div>
          <div class="barra-mini" aria-hidden="true"><span style="width:${pct(ind.adequacoes.implantadas, ind.adequacoes.total)}%;background:var(--acento-600)"></span></div></div>
        <div class="bloco kpi"><div class="kpi-rotulo">Testes executados</div><div class="kpi-valor num">${t.executados} <small>de ${t.total}</small></div>
          <div class="kpi-nota">${ts["Aprovado"]} aprovado${ts["Aprovado"] === 1 ? "" : "s"} · ${ts["Reprovado"]} reprovado${ts["Reprovado"] === 1 ? "" : "s"} · ${ts["Bloqueado"]} bloqueado${ts["Bloqueado"] === 1 ? "" : "s"}</div>
          <div class="barra-mini" aria-hidden="true"><span style="width:${pct(ts["Aprovado"], t.total)}%;background:var(--verde)"></span><span style="width:${pct(ts["Reprovado"], t.total)}%;background:var(--vermelho)"></span><span style="width:${pct(ts["Bloqueado"], t.total)}%;background:var(--ambar)"></span></div></div>
      </div>

      <div class="grade grade-2-1">
        <section class="bloco">
          <div class="bloco-cab"><h2>Evolução do plano</h2><span class="meta">% de ações concluídas no fim de cada mês</span></div>
          <div class="bloco-corpo">
            <div class="legenda"><span><i class="traco"></i>Realizado</span><span><i class="traco tracejado"></i>Previsto pelos prazos</span></div>
            <svg class="grafico-linha" viewBox="0 0 580 210" role="img" aria-label="Realizado ${ultimo.realizado}% contra ${ultimo.previsto}% previsto">
              <g stroke="#ececf0" stroke-width="1">${[0, 25, 50, 75, 100].map(v => `<line x1="40" y1="${y(v)}" x2="570" y2="${y(v)}"/>`).join("")}</g>
              <g text-anchor="end">${[0, 50, 100].map(v => `<text x="30" y="${y(v) + 4}">${v}%</text>`).join("")}</g>
              <g text-anchor="middle">${ev.map((p, i) => `<text x="${xs[i].toFixed(0)}" y="200">${esc(p.mes)}</text>`).join("")}</g>
              <polyline fill="none" stroke="#b2acdd" stroke-width="2" stroke-dasharray="5 5" points="${linha("previsto")}"/>
              <polyline fill="none" stroke="#078e86" stroke-width="2.5" stroke-linejoin="round" points="${linha("realizado")}"/>
              <g fill="#078e86">${ev.map((p, i) => `<circle cx="${xs[i].toFixed(0)}" cy="${y(p.realizado).toFixed(0)}" r="3.5"/>`).join("")}</g>
            </svg>
            <div class="resumo-linha">
              <div><strong class="num">${ultimo.realizado}%</strong>concluído</div>
              <div><strong class="num">${ultimo.previsto}%</strong>previsto até hoje</div>
              <div><strong class="num${dif < 0 ? " neg" : ""}">${dif > 0 ? "+" : ""}${dif} p.p.</strong>diferença</div>
            </div>
          </div>
        </section>
        <section class="bloco">
          <div class="bloco-cab"><h2>Ações por status</h2><a class="link" href="#plano">Abrir plano</a></div>
          <div class="bloco-corpo"><div class="rosca-area">
            <div class="rosca" style="background:${gradiente}" role="img" aria-label="Distribuição das ${a.total} ações por status"><div class="rosca-centro"><div><strong class="num">${a.total}</strong><span>ações</span></div></div></div>
            <ul class="lista-legenda">${RT.listas.statusAtividade.map(s => `<li><span class="ponto" style="background:${cores[s]}"></span>${esc(s)}<span class="num">${st[s]}</span><span class="pct num">${pct(st[s], a.total)}%</span></li>`).join("")}</ul>
          </div></div>
        </section>
      </div>

      <div class="grade grade-1-1">
        <section class="bloco">
          <div class="bloco-cab"><h2>Impactos por frente</h2><a class="link" href="#impactos">Ver matriz</a></div>
          <div class="bloco-corpo">
            <div class="legenda" style="margin-bottom:10px"><span><span class="ponto b-alta"></span>Alta</span><span><span class="ponto b-media"></span>Média</span><span><span class="ponto b-baixa"></span>Baixa</span></div>
            ${barrasImpacto ? `<ul class="barras">${barrasImpacto}</ul>` : `<p class="muted">Nenhum impacto cadastrado.</p>`}
          </div>
        </section>
        <section class="bloco">
          <div class="bloco-cab"><h2>Testes de parametrização</h2><a class="link" href="#sistemas/testes">Ver testes</a></div>
          <div class="bloco-corpo">
            <div class="testes-barra" role="img" aria-label="${RT.listas.statusTeste.map(s => `${ts[s]} ${s}`).join(", ")}">
              ${["Aprovado", "Reprovado", "Bloqueado", "Em execução", "Não iniciado"].map(s => `<span style="width:${pct(ts[s], t.total)}%;background:${corTeste[s]}"></span>`).join("")}
            </div>
            <div class="testes-lista">
              ${["Aprovado", "Reprovado", "Bloqueado", "Em execução", "Não iniciado"].map(s => `<div style="border-color:${corTeste[s] === "var(--cinza-200)" ? "var(--cinza-300)" : corTeste[s]}"><strong class="num">${ts[s]}</strong><span>${esc(s)}${s === "Em execução" || s === "Não iniciado" ? "" : "s"}</span></div>`).join("")}
            </div>
            <h3 class="secao-titulo" style="margin-top:24px">Reprovações por sistema</h3>
            ${t.reprovadosPorSistema.length ? `<ul class="barras">${t.reprovadosPorSistema.map(([s, n]) => `<li>${esc(s)}<span class="trilho" style="max-width:${pct(n, maxRep)}%"><span class="b-alta" style="width:100%"></span></span><span class="num">${n}</span></li>`).join("")}</ul>` : `<p class="muted">Nenhum teste reprovado.</p>`}
          </div>
        </section>
      </div>

      <section class="bloco" style="margin-bottom:16px">
        <div class="bloco-cab"><h2>Transição tributária</h2><a class="link" href="#legislacao">Ver cronograma completo</a></div>
        <div class="bloco-corpo">
          ${legais.length ? `<div class="linha-tempo" style="grid-template-columns:repeat(${Math.min(legais.length, 7)},1fr)">
            ${legais.slice(0, 7).map(m => `<div class="marco ${m.data && m.data <= hoje ? "passado" : ""}">
              <div class="marco-ano">${esc(m.dataTexto || (m.data ? m.data.slice(0, 4) : "A confirmar"))}</div><div class="marco-ponto"></div>
              ${natureza(m.natureza)}<h3><a class="link" href="${U.rotaRegistro("marcos", m.codigo)}">${esc(m.titulo)}</a></h3><p>${esc(m.descricao)}</p></div>`).join("")}
          </div>` : `<p class="muted">Nenhum marco legal cadastrado.</p>`}
          ${internos.length ? `<div class="internos"><h3 class="secao-titulo">Próximas entregas internas</h3><ul>
            ${internos.map(m => `<li><span class="data">${fmtDataCurta(m.data)}</span><span>${natureza("Interno")} ${esc(m.titulo)}</span></li>`).join("")}</ul></div>` : ""}
        </div>
      </section>

      <div class="grade grade-2-1">
        <section class="bloco">
          <div class="bloco-cab"><h2>Próximos prazos</h2><span class="meta">vencidos e próximos 45 dias</span></div>
          ${prazos.length ? `<div class="tabela-wrap" style="margin-top:8px"><table>
            <thead><tr><th>Prazo</th><th>Ação</th><th>Responsável</th><th>Status</th></tr></thead>
            <tbody>${prazos.map(x => {
              const d = R().diasEntre(hoje, x.prazo);
              return `<tr class="${d < 0 ? "linha-alerta" : ""}"><td class="data">${fmtDataCurta(x.prazo)}<small>${d < 0 ? "vencido" : d === 0 ? "hoje" : `em ${d} dia${d === 1 ? "" : "s"}`}</small></td>
                <td><a class="link" href="${U.rotaRegistro("atividades", x.codigo)}">${esc(x.nome)}</a><div class="item-sub">${esc(x.frente)}</div></td>
                <td>${esc(x.responsavel)}</td><td>${d < 0 ? tag("Atrasada") : tag(x.status)}</td></tr>`;
            }).join("")}</tbody></table></div>` : `<div class="bloco-corpo muted">Nenhum prazo nos próximos 45 dias.</div>`}
        </section>
        <section class="bloco">
          <div class="bloco-cab"><h2>Pendências críticas</h2><span class="meta">${pend.length} ite${pend.length === 1 ? "m" : "ns"}</span></div>
          ${pend.length ? `<ul class="lista" style="margin-top:8px">${pend.slice(0, 6).map(p => `<li class="critico"><span class="lista-icone"><svg viewBox="0 0 24 24">${svgs[p.icone]}</svg></span><div class="lista-texto"><a class="link item-titulo" href="${p.href}">${esc(p.titulo)}</a><div class="item-sub">${esc(p.sub)}</div></div></li>`).join("")}</ul>` : `<div class="bloco-corpo muted">Nenhuma pendência crítica.</div>`}
        </section>
      </div>

      <section class="bloco">
        <div class="bloco-cab"><h2>Últimas atualizações</h2><a class="link" href="#administracao">Histórico completo</a></div>
        ${tabelaHistorico(hist, true)}
      </section>`;
    return { titulo: "Visão geral", html };
  }

  function descreverDetalhes(h) {
    if (!h.detalhes) return "";
    try {
      const d = JSON.parse(h.detalhes);
      if (!Array.isArray(d) || !d.length) return "";
      const fmt = v => Array.isArray(v) ? (v.length ? v.map(x => typeof x === "object" ? x.nome : x).join(", ") : "vazio") : (v === "" || v === undefined || v === null ? "vazio" : String(v).length > 60 ? String(v).slice(0, 60) + "…" : String(v));
      return d.map(x => `${x.campo}: ${fmt(x.de)} → ${fmt(x.para)}`).join("; ");
    } catch (e) { return ""; }
  }

  // O nome gravado pelo portal confere com o autor informado pelo SharePoint?
  function autorConfere(h) {
    const autor = String(h._autorServidor).toLowerCase();
    if (autor === String(h.usuario).toLowerCase()) return true;
    const u = repo().listar("usuarios", { incluirArquivados: true }).find(x => x.nome === h.usuario);
    return Boolean(u && String(u.email).toLowerCase() === autor);
  }

  function tabelaHistorico(hist, comRegistro) {
    if (!hist.length) return `<div class="bloco-corpo muted">Nenhuma alteração registrada.</div>`;
    return `<div class="tabela-wrap" style="margin-top:8px"><table>
      <thead><tr><th>Quando</th>${comRegistro ? "<th>Registro</th>" : ""}<th>Alteração</th><th>Por</th></tr></thead>
      <tbody>${hist.map(h => {
        const ent = E()[h.entidade];
        const reg = ent && h.ref && h.ref !== "-" ? repo().obter(h.entidade, h.ref) : null;
        const det = descreverDetalhes(h);
        return `<tr><td class="data">${fmtData(h.data)}<small>${esc(String(h.data).slice(11, 16))}</small></td>
          ${comRegistro ? `<td>${reg ? `<a class="link" href="${U.rotaRegistro(h.entidade, h.ref)}">${esc(ent.titulo(reg))}</a>` : esc(h.ref === "-" ? "Portal" : h.ref)}<div class="item-sub">${esc(h.ref !== "-" ? h.ref + " · " : "")}${esc(ent ? ent.rotulo : h.entidade === "relatorios" ? "Relatórios e exportações" : h.entidade)}</div></td>` : ""}
          <td>${esc(h.acao)}${det ? `<div class="item-sub">${esc(det)}</div>` : ""}</td>
          <td>${esc(h.usuario)}${h._autorServidor && !autorConfere(h) ? `<div class="item-sub alerta-texto">Gravado no SharePoint por ${esc(h._autorServidor)}</div>` : ""}</td></tr>`;
      }).join("")}</tbody></table></div>`;
  }

  // ======================================================================
  // 2. Pareceres
  // ======================================================================
  function pareceres() {
    const todos = repo().listar("pareceres");
    const f = filtrosDe("pareceres");
    const chips = ["", ...RT.listas.statusParecer].map(s => {
      const n = s ? todos.filter(p => p.status === s).length : todos.length;
      const ativo = (f.campos.status || "") === s;
      return `<button type="button" class="chip${ativo ? " ativo" : ""}" aria-pressed="${ativo}" data-acao="filtro-rapido" data-ent="pareceres" data-campo="status" data-valor="${esc(s)}">${esc(s || "Todos")} <span class="num">${n}</span></button>`;
    }).join("");
    return {
      titulo: "Pareceres e estudos",
      html: `${cabecalho({ titulo: "Pareceres e estudos", descricao: esc(E().pareceres.descricao), acoes: botaoNovo("pareceres", "Novo parecer") })}
        <div class="chips" role="group" aria-label="Status">${chips}</div>
        ${blocoLista("pareceres")}`
    };
  }

  // ======================================================================
  // 3. Plano de implementação
  // ======================================================================
  const DESTAQUES = {
    todas: { rotulo: "Todas", f: () => true },
    atrasadas: { rotulo: "Atrasadas", f: a => R().atrasada(a) },
    criticas: { rotulo: "Críticas", f: a => a.prioridade === "Crítica" && !R().encerrada(a) },
    bloqueadas: { rotulo: "Bloqueadas", f: a => a.status === "Bloqueada" },
    travando: { rotulo: "Travando outras", f: (a, todas) => R().bloqueiaOutras(a, todas).length > 0 }
  };

  function plano() {
    const ind = R().indicadores(repo().todos()).atividades;
    const todas = repo().listar("atividades");
    const vista = estado.plano.vista;
    const chips = Object.entries(DESTAQUES).map(([k, d]) => {
      const n = todas.filter(a => d.f(a, todas)).length;
      const ativo = estado.plano.destaque === k;
      return `<button type="button" class="chip${ativo ? " ativo" : ""}" aria-pressed="${ativo}" data-acao="plano-destaque" data-valor="${k}">${esc(d.rotulo)} <span class="num">${n}</span></button>`;
    }).join("");
    const abas = [["tabela", "Tabela"], ["quadro", "Quadro"], ["cronograma", "Cronograma"]].map(([k, r]) =>
      `<button type="button" role="tab" aria-selected="${vista === k}" class="aba${vista === k ? " ativa" : ""}" data-acao="plano-vista" data-valor="${k}">${r}</button>`).join("");

    const opcoes = {
      preFiltro: base => {
        const ativas = base.filter(a => !a.arquivado);
        const d = DESTAQUES[estado.plano.destaque];
        return base.filter(a => d.f(a, ativas));
      }
    };
    if (vista === "quadro") opcoes.render = registros => kanban(registros);
    if (vista === "cronograma") opcoes.render = registros => gantt(registros);

    return {
      titulo: "Plano de implementação",
      html: `${cabecalho({ titulo: "Plano de implementação", descricao: esc(E().atividades.descricao), acoes: botaoNovo("atividades", "Nova ação") })}
        <div class="kpis kpis-5">
          ${kpi("Atrasadas", ind.atrasadas, "", ind.atrasadas ? "alerta" : "")}
          ${kpi("Críticas em aberto", ind.criticasAbertas)}
          ${kpi("Bloqueadas", ind.bloqueadas)}
          ${kpi("Travando outras ações", ind.travando)}
          ${kpi("Vencem em 30 dias", ind.vencem30)}
        </div>
        <div class="abas-lista" role="tablist" aria-label="Visualização">${abas}</div>
        <div class="chips" role="group" aria-label="Destaques">${chips}</div>
        ${blocoLista("atividades", opcoes)}`
    };
  }

  function kanban(registros) {
    const todas = repo().listar("atividades");
    const cores = { "Não iniciada": "var(--cinza-300)", "Em andamento": "var(--marca-600)", "Bloqueada": "var(--vermelho)", "Em validação": "var(--marca-300)", "Concluída": "var(--acento-600)", "Cancelada": "var(--cinza-500)" };
    const colunas = RT.listas.statusAtividade.map(s => {
      const itens = registros.filter(a => a.status === s && !a.arquivado).sort((p, q) => (p.prazo || "").localeCompare(q.prazo || ""));
      return `<div class="kcoluna" data-status="${esc(s)}" aria-label="${esc(s)}">
        <div class="kcoluna-cab"><span class="ponto" style="background:${cores[s]}"></span>${esc(s)}<span class="num">${itens.length}</span></div>
        ${itens.map(a => {
          const atras = R().atrasada(a);
          const trava = R().bloqueiaOutras(a, todas);
          const arrastavel = pode("editar", "atividades", a);
          return `<div class="kcard${atras || a.status === "Bloqueada" ? " alerta" : ""}${arrastavel ? " arrastavel" : ""}"${arrastavel ? ` draggable="true" data-codigo="${esc(a.codigo)}"` : ""}>
            <span class="codigo">${esc(a.codigo)}${atras ? " · atrasada" : ""}${trava.length ? ` · trava ${trava.length}` : ""}</span>
            <a class="kcard-titulo link" href="${U.rotaRegistro("atividades", a.codigo)}" draggable="false">${esc(a.nome)}</a>
            <div class="kcard-rodape"><span>${a.prioridade === "Crítica" ? prio("Crítica") + " · " : ""}${esc(a.responsavel)}</span><span>${fmtDataCurta(a.prazo)}</span></div>
          </div>`;
        }).join("") || `<div class="kmais">Nenhuma ação</div>`}
      </div>`;
    }).join("");
    return `<div class="bloco-corpo"><div class="kanban">${colunas}</div>
      <p class="nota" style="margin-top:12px">Arraste um cartão para outra coluna para mudar o status. A mudança fica registrada no histórico da ação. Cartões que você não pode editar não se movem.</p></div>`;
  }

  function gantt(registros) {
    const itens = registros.filter(a => !a.arquivado && a.status !== "Cancelada" && a.prazo).map(a => Object.assign({}, a, { ini: a.inicio || a.prazo }))
      .sort((p, q) => p.ini.localeCompare(q.ini));
    if (!itens.length) return `<div class="vazio">Nenhuma ação com datas para exibir.</div>`;
    const hoje = R().hojeISO();
    const inicio = new Date(itens[0].ini.slice(0, 7) + "-01T00:00:00");
    let fimISO = itens.reduce((m, a) => a.prazo > m ? a.prazo : m, hoje);
    const fim = new Date(fimISO.slice(0, 7) + "-01T00:00:00"); fim.setMonth(fim.getMonth() + 1);
    const total = (fim - inicio) / 86400000;
    const pos = iso => Math.max(0, Math.min(100, ((new Date(iso.slice(0, 10) + "T00:00:00") - inicio) / 86400000) / total * 100));
    const meses = [];
    for (const d = new Date(inicio); d < fim; d.setMonth(d.getMonth() + 1)) meses.push(new Date(d));
    const larguraMes = 100 / meses.length;
    const hojePos = pos(hoje);
    const fundo = `background:linear-gradient(to right, transparent calc(${hojePos}% - 1px), var(--marca-500) calc(${hojePos}% - 1px), var(--marca-500) calc(${hojePos}% + 1px), transparent calc(${hojePos}% + 1px)), repeating-linear-gradient(to right, var(--borda) 0 1px, transparent 1px ${larguraMes}%)`;
    const classe = a => a.status === "Concluída" ? "concluida" : a.status === "Bloqueada" ? "bloqueada" : a.status === "Não iniciada" ? "nao-iniciada" : "";
    const linhas = itens.map(a => {
      const l = pos(a.ini), r = pos(a.prazo);
      const largura = Math.max(r - l, 0.6);
      const atraso = R().atrasada(a) ? `<span class="gantt-excesso" style="left:${r}%;width:${Math.max(hojePos - r, 0.4)}%"></span>` : "";
      return `<div class="gantt-linha"><div class="gantt-nome"><a class="link item-titulo" href="${U.rotaRegistro("atividades", a.codigo)}">${esc(a.codigo)} · ${esc(a.nome)}</a><div class="item-sub">${esc(a.responsavel)} · ${fmtDataCurta(a.ini)} a ${fmtDataCurta(a.prazo)}</div></div>
        <div class="gantt-trilho" style="${fundo}"><span class="gantt-barra ${classe(a)}" style="left:${l}%;width:${largura}%" title="${esc(a.status)}"></span>${atraso}</div></div>`;
    }).join("");
    return `<div class="bloco-corpo gantt-wrap"><div class="gantt" style="min-width:${Math.max(820, 250 + meses.length * 70)}px">
      <div class="gantt-linha"><div class="gantt-nome muted">Ação</div><div class="gantt-meses" style="grid-template-columns:repeat(${meses.length},1fr)">${meses.map(m => `<span>${m.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", "")}</span>`).join("")}</div></div>
      ${linhas}</div>
      <div class="gantt-legenda">
        <span><i style="background:var(--acento-600)"></i>Concluída</span>
        <span><i style="background:var(--marca-500)"></i>Em andamento ou validação</span>
        <span><i style="background:var(--marca-200)"></i>Não iniciada</span>
        <span><i style="background:repeating-linear-gradient(135deg,var(--vermelho) 0 4px,#cf5a52 4px 8px)"></i>Bloqueada</span>
        <span><i style="background:var(--vermelho-claro);border:1px dashed var(--vermelho)"></i>Atraso até hoje</span>
        <span><i style="width:2px;height:14px;background:var(--marca-500)"></i>Hoje, ${fmtData(hoje)}</span>
      </div></div>`;
  }

  // ======================================================================
  // 4. Impactos
  // ======================================================================
  function impactos() {
    const ind = R().indicadores(repo().todos()).impactos;
    const f = filtrosDe("impactos");
    const max = Math.max(1, ...ind.porArea.flatMap(x => RT.listas.criticidades.map(c => x[c])));
    const nivel = n => n === 0 ? "h0" : `h${Math.min(4, Math.ceil((n / max) * 4))}`;
    const linhas = ind.porArea.map(x => `<tr><td>${esc(x.area)}</td>
      ${RT.listas.criticidades.map(c => {
        const ativo = f.campos.area === x.area && f.campos.criticidade === c;
        return `<td class="cel ${nivel(x[c])}${ativo ? " cel-ativa" : ""}">${x[c] ? `<button type="button" class="cel-botao" data-acao="matriz" data-area="${esc(x.area)}" data-crit="${esc(c)}" aria-pressed="${ativo}" aria-label="${x[c]} impactos de criticidade ${esc(c)} em ${esc(x.area)}">${x[c]}</button>` : "0"}</td>`;
      }).join("")}
      <td class="cel">${x.adequados} de ${x.total}</td></tr>`).join("");
    const tot = c => ind.porArea.reduce((s, x) => s + x[c], 0);
    return {
      titulo: "Mapeamento de impactos",
      html: `${cabecalho({ titulo: "Mapeamento de impactos", descricao: esc(E().impactos.descricao), acoes: botaoNovo("impactos", "Novo impacto") })}
        <section class="bloco" style="margin-bottom:16px">
          <div class="bloco-cab"><h2>Matriz por frente e criticidade</h2><span class="meta">Clique em um número para filtrar a lista</span></div>
          <div class="tabela-wrap" style="margin-top:8px"><table class="matriz">
            <thead><tr><th>Frente</th>${RT.listas.criticidades.map(c => `<th style="text-align:center">${c}</th>`).join("")}<th style="text-align:center">Adequados</th></tr></thead>
            <tbody>${linhas}</tbody>
            <tfoot><tr><td>Total</td>${RT.listas.criticidades.map(c => `<td class="cel">${tot(c)}</td>`).join("")}<td class="cel">${ind.adequados} de ${ind.total}</td></tr></tfoot>
          </table></div>
        </section>
        ${blocoLista("impactos")}`
    };
  }

  // ======================================================================
  // 5. Sistemas e testes
  // ======================================================================
  function sistemas(aba) {
    if (aba && ["adequacoes", "testes", "defeitos"].includes(aba)) estado.sistemas.aba = aba;
    aba = estado.sistemas.aba;
    const t = R().indicadores(repo().todos()).testes;
    const contagem = { adequacoes: repo().listar("adequacoes").length, testes: repo().listar("testes").length, defeitos: repo().listar("defeitos").filter(d => !["Corrigido", "Cancelado"].includes(d.status)).length };
    const abas = [["adequacoes", "Adequações", contagem.adequacoes], ["testes", "Cenários de teste", contagem.testes], ["defeitos", "Defeitos", `${contagem.defeitos} abertos`]]
      .map(([k, r, n]) => `<a role="tab" aria-selected="${aba === k}" class="aba${aba === k ? " ativa" : ""}" href="#sistemas/${k}">${r} <span class="num">${n}</span></a>`).join("");
    const novo = { adequacoes: botaoNovo("adequacoes", "Nova adequação"), testes: botaoNovo("testes", "Novo cenário"), defeitos: botaoNovo("defeitos", "Novo defeito") }[aba];
    return {
      titulo: "Sistemas e testes",
      html: `${cabecalho({ titulo: "Sistemas, parametrizações e testes", descricao: "Adequações nos sistemas, cenários de teste e defeitos encontrados. Uma adequação só deve passar a implantada depois que os cenários ligados a ela forem aprovados.", acoes: novo })}
        <div class="kpis kpis-5">
          ${kpi("Testes não iniciados", t.status["Não iniciado"])}
          ${kpi("Em execução", t.status["Em execução"])}
          ${kpi("Aprovados", t.status["Aprovado"], "", "", "var(--verde)")}
          ${kpi("Reprovados", t.status["Reprovado"], "", t.status["Reprovado"] ? "alerta" : "", "var(--vermelho)")}
          ${kpi("Bloqueados", t.status["Bloqueado"], "", "", "var(--ambar)")}
        </div>
        <div class="abas-lista" role="tablist">${abas}</div>
        ${blocoLista(aba)}`
    };
  }

  // ======================================================================
  // 6. Legislação e cronograma
  // ======================================================================
  function legislacao() {
    const hoje = R().hojeISO();
    const marcos = repo().listar("marcos").map(m => ({ m, chave: m.data || (hoje + "~") }));
    marcos.push({ hoje: true, chave: hoje + "!" });
    marcos.sort((a, b) => a.chave.localeCompare(b.chave));
    const ind = R().indicadores(repo().todos()).atividades;
    const itens = marcos.map(x => {
      if (x.hoje) return `<li><div class="quando">${fmtData(hoje)}<small>hoje</small></div><div class="eixo"><i class="hoje"></i></div><div class="corpo"><h3 style="margin-top:2px">Situação atual do projeto</h3><p>${ind.percentual}% das ações concluídas · ${ind.atrasadas} atrasada${ind.atrasadas === 1 ? "" : "s"}.</p></div></li>`;
      const m = x.m;
      const classe = m.natureza === "Previsão oficial" ? "previsao" : m.natureza === "Interno" ? "interno" : "";
      const norma = m.norma ? repo().obter("normas", m.norma) : null;
      return `<li><div class="quando">${m.dataTexto ? esc(m.dataTexto) : fmtData(m.data)}${m.dataTexto && m.data ? `<small>${fmtData(m.data)}</small>` : ""}</div><div class="eixo"><i class="${classe}"></i></div>
        <div class="corpo">${natureza(m.natureza)}<h3><a class="link" href="${U.rotaRegistro("marcos", m.codigo)}">${esc(m.titulo)}</a></h3><p>${esc(m.descricao)}</p>
        ${norma || m.fonte ? `<div class="fonte">Fonte: ${norma ? esc(E().normas.titulo(norma)) : ""}${norma && m.fonte ? " · " : ""}${esc(m.fonte)}</div>` : ""}</div></li>`;
    }).join("");
    return {
      titulo: "Legislação e cronograma",
      html: `${cabecalho({ titulo: "Legislação e cronograma", descricao: "Normas acompanhadas e marcos da transição. Cada marco indica se é prazo legal confirmado, previsão que depende de regulamentação ou prazo interno do projeto.", acoes: botaoNovo("normas", "Nova norma") + botaoNovo("marcos", "Novo marco").replace("botao primario", "botao") })}
        <p class="nota">Cadastre apenas normas publicadas, sempre com o link da fonte oficial (Planalto, Receita Federal, Comitê Gestor do IBS, Senado). Prazos que dependem de regulamentação entram como previsão, não como prazo legal.</p>
        <h2 class="secao-titulo">Normas acompanhadas</h2>
        ${blocoLista("normas")}
        <section class="bloco" style="margin-top:24px">
          <div class="bloco-cab"><h2>Linha do tempo</h2>
            <div class="legenda"><span>${natureza("Legal confirmado")} confirmado em norma</span><span>${natureza("Previsão oficial")} depende de regulamentação</span><span>${natureza("Interno")} prazo do projeto</span></div>
          </div>
          <div class="bloco-corpo" style="padding-top:24px"><ul class="tempo-v">${itens}</ul></div>
        </section>`
    };
  }

  // ======================================================================
  // 7. Decisões
  // ======================================================================
  function decisoes() {
    const mostrar = estado.decisoes.historico;
    return {
      titulo: "Decisões e diretrizes",
      html: `${cabecalho({ titulo: "Decisões e diretrizes", descricao: esc(E().decisoes.descricao), acoes: botaoNovo("decisoes", "Registrar decisão") })}
        <label class="alternar"><input type="checkbox" data-acao="decisoes-historico"${mostrar ? " checked" : ""}><span class="alternar-trilho"></span>Mostrar versões substituídas e decisões revogadas</label>
        <div style="height:12px"></div>
        ${blocoLista("decisoes", { preFiltro: base => mostrar ? base : base.filter(d => d.situacao === "Vigente") })}`
    };
  }

  // ======================================================================
  // 8. Relatórios
  // ======================================================================
  function relatorios() {
    const defs = RT.relatorios.lista(usuario());
    const exporta = pode("exportar");
    return {
      titulo: "Relatórios",
      html: `${cabecalho({ titulo: "Relatórios", descricao: `Relatórios gerados a partir dos registros do portal, com filtros. ${exporta ? "Cada um pode ser exportado para Excel ou salvo em PDF; toda exportação fica registrada no histórico." : "Seu perfil permite consultar os relatórios, mas não exportá-los."}` })}
        <div class="grade grade-3">${defs.map(d => `<a class="bloco relatorio relatorio-link" href="#relatorios/${d.id}"><h3>${esc(d.titulo)}</h3><p>${esc(d.descricao)}</p><span class="link">Abrir relatório →</span></a>`).join("")}</div>`
    };
  }

  function filtrosDoRelatorio(d) {
    if (!estado.relatorios) estado.relatorios = {};
    if (!estado.relatorios[d.id]) {
      estado.relatorios[d.id] = {};
      d.filtros.forEach(f => { if (f.padrao) estado.relatorios[d.id][f.nome] = f.padrao; });
    }
    return estado.relatorios[d.id];
  }

  function descricaoFiltros(d) {
    const f = filtrosDoRelatorio(d);
    const ativos = d.filtros.filter(x => f[x.nome]).map(x => `${x.rotulo}: ${x.tipo === "data" ? fmtData(f[x.nome]) : f[x.nome]}`);
    return ativos.join(" · ") || "Nenhum";
  }

  function celulaRelatorio(col, v) {
    if (v === "" || v === undefined || v === null) return `<td><span class="muted">—</span></td>`;
    if (col.tipo === "data") return `<td class="data">${fmtData(v)}</td>`;
    if (col.tipo === "status") return `<td>${tag(v)}</td>`;
    if (col.tipo === "numero") return `<td class="num">${esc(v)}</td>`;
    return `<td>${esc(v).replace(/\n/g, "<br>")}</td>`;
  }

  function relatorio(id) {
    const d = RT.relatorios.def(id);
    if (!d) return naoEncontrado(`Relatório ${id}`);
    if (d.restrito && !pode("auditoria")) return semPermissao();
    const f = filtrosDoRelatorio(d);
    const r = d.gerar(f);
    const campos = d.filtros.map(x => {
      const idc = `fr-${d.id}-${x.nome}`;
      if (x.tipo === "data") return `<div class="campo curto"><label for="${idc}">${esc(x.rotulo)}</label><input id="${idc}" type="date" value="${esc(f[x.nome] || "")}" data-filtro-rel="${d.id}" data-campo="${x.nome}"></div>`;
      if (x.tipo === "texto") return `<div class="campo"><label for="${idc}">${esc(x.rotulo)}</label><input id="${idc}" type="search" value="${esc(f[x.nome] || "")}" data-filtro-rel="${d.id}" data-campo="${x.nome}" autocomplete="off"></div>`;
      return `<div class="campo"><label for="${idc}">${esc(x.rotulo)}</label><select id="${idc}" data-filtro-rel="${d.id}" data-campo="${x.nome}">
        <option value="">${esc(x.vazio || "Todos")}</option>${x.opcoes().map(o => `<option${f[x.nome] === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
    }).join("");
    const acoes = pode("exportar")
      ? `<button type="button" class="botao" data-acao="exportar-relatorio" data-rel="${d.id}">Exportar Excel</button>
         <button type="button" class="botao primario" data-acao="imprimir" data-rel="${d.id}">Imprimir ou salvar PDF</button>`
      : "";
    const secoes = r.secoes.map(s => `<section class="bloco secao-relatorio">
        <div class="bloco-cab"><h2>${esc(s.titulo)}</h2><span class="meta">${s.linhas.length} linha${s.linhas.length === 1 ? "" : "s"}</span></div>
        ${s.linhas.length ? `<div class="tabela-wrap" style="margin-top:8px"><table>
          <thead><tr>${s.colunas.map(c => `<th${c.tipo === "numero" ? ' class="num"' : ""}>${esc(c.rotulo)}</th>`).join("")}</tr></thead>
          <tbody>${s.linhas.map(l => `<tr>${s.colunas.map((c, i) => celulaRelatorio(c, l[i])).join("")}</tr>`).join("")}</tbody>
        </table></div>` : `<div class="vazio">Nada a mostrar com esses filtros.</div>`}
      </section>`).join("");
    return {
      titulo: d.titulo,
      html: `${cabecalho({ titulo: d.titulo, descricao: esc(d.descricao), voltar: { href: "#relatorios", texto: "Relatórios" }, acoes })}
        <div class="bloco nao-imprimir" style="margin-bottom:16px"><div class="filtros" style="border-bottom:0">${campos}
          <div class="campo campo-fim"><button type="button" class="botao-texto" data-acao="limpar-relatorio" data-rel="${d.id}">Limpar filtros</button></div></div></div>
        <p class="filtros-aplicados">Filtros: ${esc(descricaoFiltros(d))}</p>
        <div class="kpis kpis-relatorio">${r.resumo.map(x => kpi(x.rotulo, esc(x.valor))).join("")}</div>
        ${secoes}`
    };
  }

  // Registros de uma lista com os mesmos filtros e ordem exibidos na tela
  function registrosFiltrados(ent) {
    const op = estado.fontes[ent] || {};
    const base = repo().listar(ent, { incluirArquivados: true });
    return ordenar(ent, aplicarFiltros(ent, op.preFiltro ? op.preFiltro(base) : base));
  }

  function planilhaDaLista(ent) {
    const e = E()[ent];
    const campos = e.campos.filter(c => !c.sistema || ["versao", "situacao", "aprovadoPor", "aprovadoEm"].includes(c.nome));
    const tipo = c => c.tipo === "data" ? "data" : c.tipo === "numero" ? "numero" : "texto";
    const colunas = [{ rotulo: "Código", tipo: "texto" }]
      .concat(campos.map(c => ({ rotulo: c.rotulo, tipo: tipo(c) })))
      .concat([{ rotulo: "Arquivado", tipo: "texto" }, { rotulo: "Cadastrado por", tipo: "texto" }, { rotulo: "Cadastrado em", tipo: "texto" }, { rotulo: "Última alteração", tipo: "texto" }]);
    const valorPlano = (c, r) => {
      const v = r[c.nome];
      if (c.tipo === "anexos") return (v || []).map(a => `${a.nome} (versão ${a.versao})`).join("\n");
      if (c.tipo === "booleano") return v ? "Sim" : "Não";
      if (Array.isArray(v)) return v.join(", ");
      if (c.tipo === "numero") return v === "" || v === undefined ? "" : Number(v);
      return v;
    };
    const linhas = registrosFiltrados(ent).map(r => [r.codigo]
      .concat(campos.map(c => valorPlano(c, r)))
      .concat([r.arquivado ? `Sim: ${r.motivoArquivamento}` : "Não", r.criadoPor, fmtDataHora(r.criadoEm), r.atualizadoEm ? `${r.atualizadoPor}, ${fmtDataHora(r.atualizadoEm)}` : ""]));
    const f = filtrosDe(ent);
    const filtros = [f.busca ? `Pesquisa: ${f.busca}` : "", ...Object.entries(f.campos).filter(([, v]) => v).map(([k, v]) => `${(e.campo(k) || {}).rotulo || k}: ${v}`),
      f.de || f.ate ? `Período: ${fmtData(f.de) || "início"} a ${fmtData(f.ate) || "hoje"}` : "", f.arquivados ? "Inclui arquivados" : ""].filter(Boolean).join(" · ") || "Nenhum";
    return { secoes: [{ titulo: e.rotulo, colunas, linhas }], filtros, total: linhas.length };
  }

  // ======================================================================
  // Administração
  // ======================================================================
  function administracao() {
    const u = usuario();
    const info = repo().info();
    const admin = pode("administrar");
    const nDemo = repo().contarDemonstracao();
    const hist = repo().listar("historico").slice().sort((p, q) => q.data.localeCompare(p.data)).slice(0, 50);
    const sp = RT.config.modoSharePoint;

    const conexao = `<section class="bloco">
      <div class="bloco-cab"><h2>Onde os dados estão</h2>${info.persistente ? tag("Implantada").replace("Implantada", "Conectado") : tag("Em validação").replace("Em validação", "Demonstração")}</div>
      <div class="bloco-corpo">
        <dl class="meta-lista">
          <div><dt>Armazenamento</dt><dd>${esc(info.nome)}</dd></div>
          ${sp ? `<div><dt>Site</dt><dd><a class="link" href="${esc(RT.config.siteUrl)}" target="_blank" rel="noopener noreferrer">${esc(RT.config.siteUrl)} ↗</a></dd></div>` : ""}
          <div><dt>Gravação</dt><dd>${info.persistente ? "Cada alteração é gravada nas listas do SharePoint, com o usuário e a data." : "Nada é gravado fora desta página. Ao recarregar, os dados voltam ao estado inicial. Para gravar no SharePoint, a TI preenche js/config.js (veja o README)."}</dd></div>
        </dl>
        ${sp && admin ? `<div class="acoes" style="margin-top:16px">
          <button type="button" class="botao" data-acao="verificar-listas">Verificar listas</button>
          <button type="button" class="botao" data-acao="criar-listas">Criar listas e biblioteca que faltam</button>
          <button type="button" class="botao" data-acao="carregar-demo">Carregar dados de demonstração</button>
        </div><div id="resultado-listas" class="nota" style="margin-top:12px" hidden></div>` : ""}
      </div></section>`;

    const acesso = `<section class="bloco">
      <div class="bloco-cab"><h2>Seu acesso</h2></div>
      <div class="bloco-corpo"><dl class="meta-lista">
        <div><dt>Nome</dt><dd>${esc(u.nome)}</dd></div>
        <div><dt>E-mail</dt><dd>${esc(u.email || "—")}</dd></div>
        <div><dt>Perfil</dt><dd>${esc(u.perfil)}${u.origemPerfil ? ` <span class="muted">· ${esc(u.origemPerfil)}</span>` : ""}</dd></div>
        <div><dt>Área</dt><dd>${esc(u.area || "—")}</dd></div>
      </dl></div></section>`;

    if (!admin) {
      return { titulo: "Administração", html: `${cabecalho({ titulo: "Administração", descricao: "Configurações, usuários e dados de demonstração ficam disponíveis apenas para administradores." })}<div class="grade grade-1-1">${acesso}${conexao}</div>` };
    }

    const repetidos = repo().codigosRepetidos();
    return {
      titulo: "Administração",
      html: `${cabecalho({ titulo: "Administração", descricao: "Conexão de dados, usuários, perfis e dados de demonstração." })}
        ${repetidos.length ? `<div class="aviso erro" role="alert"><p><strong>Códigos repetidos:</strong> ${esc(repetidos.join(", "))}. Isso acontece quando duas pessoas cadastram ao mesmo tempo. Arquive o registro duplicado e cadastre de novo.</p></div>` : ""}
        <div class="grade grade-1-1">${conexao}${acesso}</div>
        <section class="bloco" style="margin-bottom:16px">
          <div class="bloco-cab"><h2>Dados de demonstração</h2><span class="meta">${nDemo} registro${nDemo === 1 ? "" : "s"} fictício${nDemo === 1 ? "" : "s"}</span></div>
          <div class="bloco-corpo">
            <p class="texto-corrido">Todo registro fictício leva a marca de demonstração. Antes da entrada em produção, remova todos de uma vez. Registros reais não são afetados.</p>
            <button type="button" class="botao perigo-texto" data-acao="remover-demo"${nDemo ? "" : " disabled"}>Remover dados de demonstração</button>
          </div>
        </section>
        <div class="cabecalho" style="margin:28px 0 12px"><div><h2 class="titulo-secao">Usuários</h2><p>${RT.config.perfisPeloEntra
          ? "Os perfis vêm dos papéis atribuídos no Entra ID. Esta lista guarda a área de cada pessoa e é usada para conferir quem aprovou cada parecer."
          : "O perfil cadastrado aqui define o que cada pessoa vê e edita no portal. Também é usado para conferir quem aprovou cada parecer."}</p></div><div class="acoes">${botaoNovo("usuarios", "Novo usuário")}</div></div>
        ${blocoLista("usuarios")}
        <section class="bloco" style="margin-top:16px">
          <div class="bloco-cab"><h2>Permissões por perfil</h2></div>
          <p class="texto-corrido" style="padding:8px 20px 0">Estas regras definem o que o portal oferece a cada perfil. Quem impede de fato a alteração dos dados são as permissões do site do SharePoint, configuradas pelo script <span class="codigo">implantacao/configurar-permissoes.ps1</span>.</p>
          ${tabelaPermissoes()}
        </section>
        <section class="bloco" style="margin-top:16px">
          <div class="bloco-cab"><h2>Histórico de alterações</h2><a class="link" href="#relatorios/auditoria">Trilha completa, com filtros e exportação</a></div>
          ${tabelaHistorico(hist, true)}
        </section>`
    };
  }

  function tabelaPermissoes() {
    const linhas = [
      ["Consultar módulos", ["Sim", "Sim", "Sim", "Sim"]],
      ["Cadastrar registros", ["Sim", "Sim", "Sim", "Não"]],
      ["Editar registros", ["Todos", "Todos", "Da sua área ou sob sua responsabilidade", "Não"]],
      ["Aprovar parecer internamente", ["Não", "Sim", "Não", "Não"]],
      ["Registrar, versionar ou revogar decisão", ["Não", "Sim", "Não", "Não"]],
      ["Arquivar e restaurar registros", ["Sim", "Sim", "Não", "Não"]],
      ["Gerenciar usuários e dados de demonstração", ["Sim", "Não", "Não", "Não"]]
    ];
    return `<div class="tabela-wrap" style="margin-top:8px"><table class="perm"><thead><tr><th>Ação</th>${RT.listas.perfis.map(p => `<th style="text-align:center">${p}</th>`).join("")}</tr></thead>
      <tbody>${linhas.map(([a, v]) => `<tr><td>${a}</td>${v.map(x => `<td class="c ${x === "Não" ? "nao" : "sim"}">${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  // ======================================================================
  // Busca global
  // ======================================================================
  function busca(q) {
    const termo = normalizar(q);
    const grupos = [];
    if (termo.length >= 2) {
      for (const [ent, e] of Object.entries(E())) {
        if (e.interno || ent === "usuarios") continue;
        const achados = repo().listar(ent).filter(r => (!e.versionada || r.situacao === "Vigente") &&
          (normalizar(e.titulo(r)).includes(termo) || e.busca.some(c => normalizar(Array.isArray(r[c]) ? r[c].join(" ") : r[c]).includes(termo))));
        if (achados.length) grupos.push({ ent, e, achados });
      }
    }
    const total = grupos.reduce((s, g) => s + g.achados.length, 0);
    return {
      titulo: "Pesquisa",
      html: `${cabecalho({ titulo: `Pesquisa: “${q}”`, descricao: termo.length < 2 ? "Digite pelo menos duas letras." : `${total} resultado${total === 1 ? "" : "s"} em ${grupos.length} módulo${grupos.length === 1 ? "" : "s"}.` })}
        ${grupos.map(g => `<section class="bloco"><div class="bloco-cab"><h2>${esc(g.e.rotulo)}</h2><span class="meta">${g.achados.length}</span></div>
          <ul class="lista" style="margin-top:8px">${g.achados.slice(0, 20).map(r => `<li><div class="lista-texto"><span class="codigo">${esc(r.codigo)}</span> <a class="link" href="${U.rotaRegistro(g.ent, r.codigo)}">${esc(g.e.titulo(r))}</a> ${r.status ? tag(r.status) : r.situacao ? tag(r.situacao) : ""}</div></li>`).join("")}</ul></section>`).join("")}`
    };
  }

  // ======================================================================
  // Detalhe de registro
  // ======================================================================
  function detalhe(ent, codigo) {
    const e = E()[ent];
    const r = repo().obter(ent, codigo);
    if (!r) return naoEncontrado(`${e.rotulo}: ${codigo}`);
    const modulo = MODULO_DA_ENTIDADE[ent];
    const voltarHref = ent === "adequacoes" || ent === "testes" || ent === "defeitos" ? `#sistemas/${ent}` : `#${modulo}`;
    const todasAt = repo().listar("atividades");

    // Ações disponíveis
    const acoes = [];
    if (ent === "pareceres" && r.status === "Análise concluída" && pode("aprovar", ent, r) && !r.arquivado) {
      acoes.push(`<button type="button" class="botao primario" data-acao="aprovar" data-codigo="${esc(r.codigo)}">Aprovar internamente</button>`);
    }
    if (ent === "testes" && r.status === "Reprovado" && pode("criar", "defeitos")) {
      acoes.push(`<a class="botao" href="#defeitos/novo?teste=${encodeURIComponent(r.codigo)}">Registrar defeito</a>`);
    }
    if (e.versionada) {
      if (r.situacao === "Vigente" && pode("novaVersao", ent, r)) acoes.push(`<a class="botao primario" href="#${ent}/${encodeURIComponent(r.codigo)}/nova-versao">Registrar nova versão</a>`);
      if (r.situacao === "Vigente" && pode("revogar", ent, r)) acoes.push(`<button type="button" class="botao" data-acao="revogar" data-codigo="${esc(r.codigo)}">Revogar</button>`);
    } else if (!r.arquivado && pode("editar", ent, r)) {
      acoes.push(`<a class="botao${acoes.length ? "" : " primario"}" href="#${ent}/${encodeURIComponent(r.codigo)}/editar">${icone.editar}Editar</a>`);
    }
    if (!e.versionada && pode("arquivar", ent, r)) {
      acoes.push(r.arquivado
        ? `<button type="button" class="botao" data-acao="restaurar" data-ent="${ent}" data-codigo="${esc(r.codigo)}">Restaurar</button>`
        : `<button type="button" class="botao" data-acao="arquivar" data-ent="${ent}" data-codigo="${esc(r.codigo)}">Arquivar</button>`);
    }

    // Etiquetas do cabeçalho
    const etiquetas = [];
    if (r.status) etiquetas.push(tag(r.status));
    if (r.situacao) etiquetas.push(tag(r.situacao));
    if (ent === "atividades" && R().atrasada(r)) etiquetas.push(tag("Atrasada"));
    if (r.arquivado) etiquetas.push(tag("Arquivado"));
    if (r.demonstracao) etiquetas.push(`<span class="tag t-demo">Dado de demonstração</span>`);

    let complemento = "";
    let blocoVerificacao = "";
    if (ent === "pareceres") {
      const v = R().verificarAprovacao(r, repo().listar("historico"), repo().listar("usuarios", { incluirArquivados: true }), repo().info().persistente);
      if (v) blocoVerificacao = `<div class="verificacao ${v.ok ? "ok" : "falha"}" role="note"><strong>${v.ok ? "Aprovação verificada." : "Aprovação não verificada."}</strong> ${esc(v.texto)}</div>`;
      if (r.status === "Aprovado internamente") complemento = `Aprovado por ${esc(r.aprovadoPor)} em ${fmtDataHora(r.aprovadoEm)}`;
      else if (r.status !== "Análise concluída") complemento = "Para aprovar, a análise precisa estar concluída.";
      else if (!pode("aprovar", ent, r)) complemento = "Aguardando aprovação de um gestor.";
    }
    if (r.arquivado) complemento = `Arquivado: ${esc(r.motivoArquivamento)}`;
    if (ent === "decisoes" && r.situacao === "Revogada") complemento = `Revogada em ${fmtDataHora(r.situacaoEm)}: ${esc(r.motivoRevogacao)}`;

    // Campos
    const ocultos = ["codigo", CAMPO_TITULO[ent]];
    const visiveis = e.campos.filter(c => !c.sistema && !ocultos.includes(c.nome));
    const longos = visiveis.filter(c => c.tipo === "textoLongo");
    const anexos = visiveis.filter(c => c.tipo === "anexos");
    const refs = visiveis.filter(c => c.tipo === "refs" || c.tipo === "ref");
    const curtos = visiveis.filter(c => !longos.includes(c) && !anexos.includes(c) && !refs.includes(c));

    const corpoLongo = longos.map(c => `<h3>${esc(c.rotulo)}</h3><p>${U.valor(c, r)}</p>`).join("");
    const corpoAnexos = anexos.map(c => {
      const lista = (r[c.nome] || []).map((a, indice) => ({ a, indice })).sort((p, q) => q.a.enviadoEm.localeCompare(p.a.enviadoEm));
      return `<h3>${esc(c.rotulo)}</h3>${lista.length ? lista.map(({ a, indice }, i) => `<div class="arquivo"><span class="arquivo-icone">${esc((a.nome.split(".").pop() || "").toUpperCase())}</span>
        <div><div class="item-titulo">${esc(a.nome)}${i === 0 ? ' <span class="muted">· mais recente</span>' : ""}</div>
        <div class="item-sub">${U.fmtTamanho(a.tamanho)} · versão ${esc(a.versao)} · ${esc(a.enviadoPor)} em ${fmtDataHora(a.enviadoEm)}${a.arquivoId ? "" : " · sem arquivo guardado (demonstração)"}</div></div>
        <span class="acoes-arquivo">
          ${a.webUrl ? `<a class="botao pequeno" href="${esc(a.webUrl)}" target="_blank" rel="noopener noreferrer">Abrir no SharePoint</a>` : ""}
          <button class="botao pequeno" type="button" data-acao="baixar-anexo" data-ent="${ent}" data-codigo="${esc(r.codigo)}" data-campo="${c.nome}" data-indice="${indice}"${a.arquivoId ? "" : ' disabled title="Registro de demonstração sem arquivo"'}>Baixar</button>
        </span></div>`).join("") : `<p class="muted">Nenhum arquivo anexado.</p>`}`;
    }).join("");

    // Dependências da ação
    let blocoDeps = "";
    if (ent === "atividades") {
      const deps = (r.dependencias || []).map(c => repo().obter("atividades", c)).filter(Boolean);
      const trava = R().bloqueiaOutras(r, todasAt).map(c => repo().obter("atividades", c));
      if (deps.length || trava.length) {
        blocoDeps = `<section class="bloco"><div class="bloco-cab"><h2>Dependências</h2></div><div class="bloco-corpo">
          ${deps.length ? `<h3 class="secao-titulo">Esta ação depende de</h3><ul class="lista-simples">${deps.map(d => `<li><a class="link" href="${U.rotaRegistro("atividades", d.codigo)}">${esc(d.codigo)} · ${esc(d.nome)}</a> ${tag(d.status)}</li>`).join("")}</ul>` : ""}
          ${trava.length ? `<h3 class="secao-titulo" style="margin-top:12px">Está travando</h3><ul class="lista-simples">${trava.map(d => `<li><a class="link" href="${U.rotaRegistro("atividades", d.codigo)}">${esc(d.codigo)} · ${esc(d.nome)}</a> ${tag(d.status)}</li>`).join("")}</ul>` : ""}
        </div></section>`;
      }
    }

    // Versões da decisão
    let blocoVersoes = "";
    if (e.versionada) {
      const vs = repo().versoes(ent, r.codigo);
      blocoVersoes = `<section class="bloco"><div class="bloco-cab"><h2>Versões</h2><span class="meta">${vs.length}</span></div><div class="bloco-corpo comparar">
        ${vs.map(v => `<div class="versao ${v.situacao === "Vigente" ? "atual" : "antiga"}"><h4>Versão ${esc(v.versao)} · ${fmtData(v.dataDecisao)} ${tag(v.situacao)}</h4><p>${esc(v.decisao).replace(/\n/g, "<br>")}</p>
          ${v.situacao !== "Vigente" && v.situacaoEm ? `<p class="item-sub" style="margin-top:6px">${esc(v.situacao)} em ${fmtDataHora(v.situacaoEm)}${v.motivoRevogacao ? ": " + esc(v.motivoRevogacao) : ""}</p>` : ""}</div>`).join("")}
      </div></section>`;
    }

    // Vínculos
    const ida = refs.filter(c => (Array.isArray(r[c.nome]) ? r[c.nome].length : r[c.nome]));
    const volta = repo().referenciadoPor(ent, r.codigo);
    const blocoVinculos = ida.length || volta.length ? `<section class="bloco"><div class="bloco-cab"><h2>Vínculos</h2></div><div class="bloco-corpo"><dl class="meta-lista">
        ${ida.map(c => `<div><dt>${esc(c.rotulo)}</dt><dd>${U.valor(c, r)}</dd></div>`).join("")}
        ${Object.entries(volta.reduce((m, v) => { const k = `${E()[v.entidade].rotulo} · ${v.campo.rotulo}`; (m[k] = m[k] || { ent: v.entidade, cods: [] }).cods.push(v.registro.codigo); return m; }, {}))
          .map(([k, v]) => `<div><dt>Citado em ${esc(k)}</dt><dd>${vinculos(v.ent, [...new Set(v.cods)])}</dd></div>`).join("")}
      </dl></div></section>` : "";

    const hist = repo().historicoDe(ent, r.codigo);
    const tituloReg = ent === "normas" ? e.titulo(r) : (r[CAMPO_TITULO[ent]] || e.titulo(r));

    return {
      titulo: tituloReg,
      html: `${cabecalho({
        titulo: tituloReg,
        sobre: `${esc(r.codigo)}${e.versionada ? ` · versão ${esc(r.versao)}` : ""} · ${esc(e.singular)}`,
        voltar: { href: voltarHref, texto: ROTULO_MODULO[modulo] || e.rotulo },
        acoes: acoes.join("")
      })}
        <p class="etiquetas">${etiquetas.join(" ")}${complemento ? ` <span class="muted">${complemento}</span>` : ""}</p>
        ${blocoVerificacao}
        <div class="detalhe">
          <div class="pilha">
            ${corpoLongo || corpoAnexos ? `<section class="bloco"><div class="bloco-corpo texto-bloco">${corpoLongo}${corpoAnexos}</div></section>` : ""}
            ${blocoVersoes}${blocoDeps}${blocoVinculos}
            <section class="bloco"><div class="bloco-cab"><h2>Histórico</h2><span class="meta">${hist.length}</span></div>${tabelaHistorico(hist, false)}</section>
          </div>
          <aside class="bloco"><div class="bloco-corpo"><dl class="meta-lista">
            ${curtos.map(c => `<div><dt>${esc(c.rotulo)}</dt><dd>${U.valor(c, r)}</dd></div>`).join("")}
            <div><dt>Cadastrado por</dt><dd>${esc(r.criadoPor)} <span class="muted">${fmtDataHora(r.criadoEm)}</span>${r._autorServidor ? `<div class="item-sub">Gravado no SharePoint por ${esc(r._autorServidor)}</div>` : ""}</dd></div>
            ${r.atualizadoEm ? `<div><dt>Última alteração</dt><dd>${esc(r.atualizadoPor)} <span class="muted">${fmtDataHora(r.atualizadoEm)}</span></dd></div>` : ""}
          </dl></div></aside>
        </div>`
    };
  }

  // ======================================================================
  // Formulário
  // ======================================================================
  function formulario(ent, codigo, modo, params) {
    const e = E()[ent];
    const registro = codigo ? repo().obter(ent, codigo) : null;
    if (codigo && !registro) return naoEncontrado(`${e.rotulo}: ${codigo}`);
    const permitido = modo === "novo" ? pode("criar", ent) : modo === "nova-versao" ? pode("novaVersao", ent, registro) : pode("editar", ent, registro);
    if (!permitido) return semPermissao();
    if (registro && registro.arquivado && modo === "editar") return { titulo: "Registro arquivado", html: `${cabecalho({ titulo: "Registro arquivado", descricao: "Restaure o registro antes de editá-lo." })}` };

    estado.anexosPendentes = {};
    const valores = {};
    if (registro) Object.assign(valores, JSON.parse(JSON.stringify(registro)));
    else e.campos.forEach(c => { if (c.padrao !== undefined) valores[c.nome] = c.padrao; });
    if (modo === "novo" && params) for (const [k, v] of params) if (e.campo(k)) valores[k] = v;
    if (modo === "novo" && ent === "defeitos") valores.abertoEm = valores.abertoEm || R().hojeISO();
    if (modo === "novo" && ent === "pareceres") valores.dataRecebimento = valores.dataRecebimento || R().hojeISO();
    if (modo === "nova-versao") { valores.dataDecisao = R().hojeISO(); valores.aprovador = usuario().nome; }

    const ctx = { registro, usuario: usuario() };
    const campos = e.campos.filter(c => !c.sistema).map(c => U.campoFormulario(ent, c, valores[c.nome], "", ctx)).join("");

    const tituloForm = modo === "novo" ? `Nov${e.genero} ${e.singular}` : modo === "nova-versao" ? `Nova versão de ${registro.codigo}` : `Editar ${registro.codigo}`;
    let aviso = "";
    if (ent === "pareceres" && modo === "novo") aviso = "Todo documento novo entra como Recebido ou Em elaboração. A aprovação interna é feita depois, por um gestor, na tela do documento.";
    if (ent === "pareceres" && registro && registro.status === "Aprovado internamente") aviso = "Este parecer está aprovado. Se você anexar uma nova versão do documento, ele volta para Análise concluída e precisa de nova aprovação.";
    if (modo === "nova-versao") aviso = `A versão ${registro.versao} continuará consultável e passará a Substituída quando você salvar.`;
    if (ent === "decisoes" && modo === "novo") aviso = "Depois de registrada, a decisão não é editada: mudanças entram como nova versão.";
    const voltar = registro ? U.rotaRegistro(ent, registro.codigo) : (ent === "adequacoes" || ent === "testes" || ent === "defeitos" ? `#sistemas/${ent}` : `#${MODULO_DA_ENTIDADE[ent]}`);

    return {
      titulo: tituloForm,
      html: `${cabecalho({ titulo: tituloForm, voltar: { href: voltar, texto: registro ? `${registro.codigo}` : (ROTULO_MODULO[MODULO_DA_ENTIDADE[ent]] || e.rotulo) }, descricao: aviso ? esc(aviso) : "" })}
        <form class="bloco" data-form="${ent}" data-modo="${modo}" data-codigo="${esc(codigo || "")}" novalidate>
          <div class="form-secao"><div class="form-grade">${campos}</div></div>
          <div class="form-rodape">
            <span class="muted">Campos com <span class="obrig">*</span> são obrigatórios.</span>
            <a class="botao" href="${voltar}">Cancelar</a>
            <button class="botao primario" type="submit">${modo === "novo" ? "Salvar" : modo === "nova-versao" ? "Registrar nova versão" : "Salvar alterações"}</button>
          </div>
        </form>`
    };
  }

  function naoEncontrado(oque) {
    return { titulo: "Não encontrado", html: cabecalho({ titulo: "Registro não encontrado", descricao: `${esc(oque)} não existe ou foi removido. <a class="link" href="#visao-geral">Voltar para a visão geral</a>.` }) };
  }
  function semPermissao() {
    return { titulo: "Sem permissão", html: cabecalho({ titulo: "Sem permissão", descricao: `Seu perfil (${esc(usuario().perfil)}) não permite esta operação.` }) };
  }

  return {
    estado, filtrosDe, atualizarLista, MODULO_DA_ENTIDADE,
    visaoGeral, pareceres, plano, impactos, sistemas, legislacao, decisoes, relatorios, relatorio, administracao, busca,
    filtrosDoRelatorio, descricaoFiltros, registrosFiltrados, planilhaDaLista,
    detalhe, formulario, naoEncontrado
  };
})();
