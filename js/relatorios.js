/*
 * Relatórios. Cada definição recebe os filtros escolhidos e devolve:
 *   { resumo: [{ rotulo, valor }], secoes: [{ titulo, colunas: [{ rotulo, tipo }], linhas: [[...]] }] }
 * A mesma estrutura é exibida na tela, impressa em PDF e exportada para Excel.
 * Tipos de coluna: texto, numero, data, status.
 */
window.RT = window.RT || {};

RT.relatorios = (function () {
  const repo = () => RT.repositorio;
  const R = () => RT.regras;
  const L = RT.listas;
  const C = (rotulo, tipo) => ({ rotulo, tipo: tipo || "texto" });
  const valores = (ent, campo) => () => [...new Set(repo().listar(ent).flatMap(r => Array.isArray(r[campo]) ? r[campo] : [r[campo]]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const pct = (n, t) => t ? Math.round((n / t) * 100) : 0;
  const naJanela = (data, f) => (!f.de || data >= f.de) && (!f.ate || data <= f.ate);
  const contar = (lista, campo, valor) => lista.filter(r => r[campo] === valor).length;

  function sistemaDoTeste(t) {
    const a = repo().obter("adequacoes", t.adequacao);
    return a ? a.sistema : "";
  }

  const defs = [
    {
      id: "evolucao", titulo: "Evolução geral do projeto",
      descricao: "Percentual concluído por mês, comparado ao previsto pelos prazos, e situação de cada frente.",
      filtros: [{ nome: "frente", rotulo: "Frente", opcoes: () => L.areas }],
      gerar(f) {
        let at = repo().listar("atividades");
        if (f.frente) at = at.filter(a => a.frente === f.frente);
        const validas = at.filter(a => a.status !== "Cancelada");
        const concl = contar(at, "status", "Concluída");
        const ev = R().evolucao(at, 12);
        return {
          resumo: [
            { rotulo: "Ações", valor: at.length },
            { rotulo: "Concluídas", valor: `${concl} (${pct(concl, validas.length)}%)` },
            { rotulo: "Atrasadas", valor: at.filter(a => R().atrasada(a)).length },
            { rotulo: "Bloqueadas", valor: contar(at, "status", "Bloqueada") }
          ],
          secoes: [
            {
              titulo: "Evolução mensal",
              colunas: [C("Mês"), C("Previsto pelos prazos (%)", "numero"), C("Realizado (%)", "numero"), C("Diferença (p.p.)", "numero")],
              linhas: ev.map(p => [p.rotulo, p.previsto, p.realizado, p.realizado - p.previsto])
            },
            {
              titulo: "Situação por frente",
              colunas: [C("Frente"), C("Ações", "numero"), C("Concluídas", "numero"), C("Em andamento", "numero"), C("Não iniciadas", "numero"), C("Bloqueadas", "numero"), C("Atrasadas", "numero"), C("% concluído", "numero")],
              linhas: L.areas.map(area => {
                const da = at.filter(a => a.frente === area);
                const v = da.filter(a => a.status !== "Cancelada").length;
                return [area, da.length, contar(da, "status", "Concluída"), contar(da, "status", "Em andamento") + contar(da, "status", "Em validação"),
                  contar(da, "status", "Não iniciada"), contar(da, "status", "Bloqueada"), da.filter(a => R().atrasada(a)).length, pct(contar(da, "status", "Concluída"), v)];
              }).filter(l => l[1] > 0)
            }
          ]
        };
      }
    },

    {
      id: "atividades", titulo: "Atividades por área e responsável",
      descricao: "Carga de cada área e de cada pessoa, com status, prazos e atrasos.",
      filtros: [
        { nome: "frente", rotulo: "Frente", opcoes: () => L.areas },
        { nome: "responsavel", rotulo: "Responsável", opcoes: valores("atividades", "responsavel") },
        { nome: "status", rotulo: "Status", opcoes: () => L.statusAtividade }
      ],
      gerar(f) {
        let at = repo().listar("atividades");
        if (f.frente) at = at.filter(a => a.frente === f.frente);
        if (f.responsavel) at = at.filter(a => a.responsavel === f.responsavel);
        if (f.status) at = at.filter(a => a.status === f.status);
        const pessoas = [...new Set(at.map(a => a.responsavel))].sort((a, b) => a.localeCompare(b, "pt-BR"));
        return {
          resumo: [
            { rotulo: "Ações", valor: at.length },
            { rotulo: "Responsáveis", valor: pessoas.length },
            { rotulo: "Em aberto", valor: at.filter(a => !R().encerrada(a)).length },
            { rotulo: "Atrasadas", valor: at.filter(a => R().atrasada(a)).length }
          ],
          secoes: [
            {
              titulo: "Por responsável",
              colunas: [C("Responsável"), C("Áreas"), C("Ações", "numero"), C("Em aberto", "numero"), C("Atrasadas", "numero"), C("Críticas em aberto", "numero"), C("Próximo prazo", "data")],
              linhas: pessoas.map(p => {
                const dele = at.filter(a => a.responsavel === p);
                const abertas = dele.filter(a => !R().encerrada(a));
                const proximo = abertas.map(a => a.prazo).filter(Boolean).sort()[0] || "";
                return [p, [...new Set(dele.map(a => a.frente))].join(", "), dele.length, abertas.length, dele.filter(a => R().atrasada(a)).length,
                  abertas.filter(a => a.prioridade === "Crítica").length, proximo];
              })
            },
            {
              titulo: "Ações",
              colunas: [C("Código"), C("Ação"), C("Frente"), C("Responsável"), C("Início", "data"), C("Prazo", "data"), C("Prioridade"), C("Conclusão (%)", "numero"), C("Status", "status"), C("Atrasada")],
              linhas: at.slice().sort((a, b) => (a.prazo || "").localeCompare(b.prazo || "")).map(a => [a.codigo, a.nome, a.frente, a.responsavel, a.inicio, a.prazo, a.prioridade, Number(a.percentual) || 0, a.status, R().atrasada(a) ? "Sim" : "Não"])
            }
          ]
        };
      }
    },

    {
      id: "pendencias", titulo: "Pendências e atrasos",
      descricao: "Ações vencidas, bloqueadas e as que estão travando outras etapas.",
      filtros: [
        { nome: "frente", rotulo: "Frente", opcoes: () => L.areas },
        { nome: "prioridade", rotulo: "Prioridade", opcoes: () => L.prioridades }
      ],
      gerar(f) {
        const todas = repo().listar("atividades");
        let at = todas;
        if (f.frente) at = at.filter(a => a.frente === f.frente);
        if (f.prioridade) at = at.filter(a => a.prioridade === f.prioridade);
        const hoje = R().hojeISO();
        const atrasadas = at.filter(a => R().atrasada(a)).sort((a, b) => a.prazo.localeCompare(b.prazo));
        const bloqueadas = at.filter(a => a.status === "Bloqueada");
        const travando = at.filter(a => R().bloqueiaOutras(a, todas).length);
        return {
          resumo: [
            { rotulo: "Atrasadas", valor: atrasadas.length },
            { rotulo: "Bloqueadas", valor: bloqueadas.length },
            { rotulo: "Travando outras", valor: travando.length }
          ],
          secoes: [
            {
              titulo: "Atrasadas",
              colunas: [C("Código"), C("Ação"), C("Frente"), C("Responsável"), C("Prazo", "data"), C("Dias de atraso", "numero"), C("Prioridade"), C("Status", "status")],
              linhas: atrasadas.map(a => [a.codigo, a.nome, a.frente, a.responsavel, a.prazo, -R().diasEntre(hoje, a.prazo), a.prioridade, a.status])
            },
            {
              titulo: "Bloqueadas",
              colunas: [C("Código"), C("Ação"), C("Responsável"), C("Prazo", "data"), C("Motivo do bloqueio"), C("Ações que dependem dela")],
              linhas: bloqueadas.map(a => [a.codigo, a.nome, a.responsavel, a.prazo, a.riscos, R().bloqueiaOutras(a, todas).join(", ")])
            },
            {
              titulo: "Travando outras",
              colunas: [C("Código"), C("Ação"), C("Responsável"), C("Status", "status"), C("Prazo", "data"), C("Ações travadas")],
              linhas: travando.map(a => [a.codigo, a.nome, a.responsavel, a.status, a.prazo, R().bloqueiaOutras(a, todas).join(", ")])
            }
          ]
        };
      }
    },

    {
      id: "pareceres", titulo: "Pareceres por categoria e status",
      descricao: "Documentos em cada etapa, do recebimento à aprovação interna, com a verificação de quem aprovou.",
      filtros: [
        { nome: "categoria", rotulo: "Categoria", opcoes: () => L.categorias },
        { nome: "de", rotulo: "Recebido de", tipo: "data" },
        { nome: "ate", rotulo: "até", tipo: "data" }
      ],
      gerar(f) {
        let pt = repo().listar("pareceres");
        if (f.categoria) pt = pt.filter(p => p.categoria === f.categoria);
        pt = pt.filter(p => naJanela(p.dataRecebimento, f));
        const hist = repo().listar("historico");
        const usuarios = repo().listar("usuarios", { incluirArquivados: true });
        const servidor = repo().info().persistente;
        return {
          resumo: L.statusParecer.map(s => ({ rotulo: s, valor: contar(pt, "status", s) })),
          secoes: [
            {
              titulo: "Por categoria",
              colunas: [C("Categoria")].concat(L.statusParecer.map(s => C(s, "numero"))).concat([C("Total", "numero")]),
              linhas: L.categorias.map(cat => {
                const da = pt.filter(p => p.categoria === cat);
                return [cat, ...L.statusParecer.map(s => contar(da, "status", s)), da.length];
              }).filter(l => l[l.length - 1] > 0)
            },
            {
              titulo: "Documentos",
              colunas: [C("Código"), C("Título"), C("Tipo"), C("Categoria"), C("Origem"), C("Responsável"), C("Recebido", "data"), C("Prazo", "data"), C("Status", "status"), C("Aprovado por"), C("Aprovação verificada")],
              linhas: pt.slice().sort((a, b) => b.dataRecebimento.localeCompare(a.dataRecebimento)).map(p => {
                const v = R().verificarAprovacao(p, hist, usuarios, servidor);
                return [p.codigo, p.titulo, p.tipo, p.categoria, p.origem, p.responsavel, p.dataRecebimento, p.prazo, p.status, p.aprovadoPor, v ? (v.ok ? "Sim" : "Não") : ""];
              })
            }
          ]
        };
      }
    },

    {
      id: "impactos", titulo: "Impactos por processo",
      descricao: "Matriz de impactos com criticidade, status de adequação e ação vinculada.",
      filtros: [
        { nome: "area", rotulo: "Área", opcoes: () => L.areas },
        { nome: "criticidade", rotulo: "Criticidade", opcoes: () => L.criticidades },
        { nome: "status", rotulo: "Status", opcoes: () => L.statusImpacto }
      ],
      gerar(f) {
        let im = repo().listar("impactos");
        ["area", "criticidade", "status"].forEach(c => { if (f[c]) im = im.filter(i => i[c] === f[c]); });
        return {
          resumo: [
            { rotulo: "Impactos", valor: im.length },
            { rotulo: "Criticidade alta", valor: contar(im, "criticidade", "Alta") },
            { rotulo: "Sem ação vinculada", valor: im.filter(i => !(i.atividades || []).length).length },
            { rotulo: "Adequados", valor: contar(im, "status", "Adequado") }
          ],
          secoes: [
            {
              titulo: "Impactos",
              colunas: [C("Código"), C("Processo"), C("Área"), C("Tipo de operação"), C("Tributo ou regra"), C("Sistema"), C("Mudança necessária"), C("Criticidade"), C("Status", "status"), C("Responsável"), C("Ações"), C("Pareceres")],
              linhas: im.map(i => [i.codigo, i.processo, i.area, i.tipoOperacao, i.tributo, i.sistema, i.mudanca, i.criticidade, i.status, i.responsavel, (i.atividades || []).join(", "), (i.pareceres || []).join(", ")])
            },
            {
              titulo: "Por área",
              colunas: [C("Área")].concat(L.criticidades.map(c => C(c, "numero"))).concat([C("Adequados", "numero"), C("Total", "numero")]),
              linhas: L.areas.map(a => {
                const da = im.filter(i => i.area === a);
                return [a, ...L.criticidades.map(c => contar(da, "criticidade", c)), contar(da, "status", "Adequado"), da.length];
              }).filter(l => l[l.length - 1] > 0)
            }
          ]
        };
      }
    },

    {
      id: "adequacoes", titulo: "Adequações sistêmicas",
      descricao: "Situação de cada sistema, com responsáveis técnico e tributário e resultado dos testes.",
      filtros: [
        { nome: "sistema", rotulo: "Sistema", opcoes: () => L.sistemas },
        { nome: "status", rotulo: "Status", opcoes: () => L.statusAdequacao }
      ],
      gerar(f) {
        let as = repo().listar("adequacoes");
        if (f.sistema) as = as.filter(a => a.sistema === f.sistema);
        if (f.status) as = as.filter(a => a.status === f.status);
        const ct = repo().listar("testes");
        const df = repo().listar("defeitos").filter(d => !["Corrigido", "Cancelado"].includes(d.status));
        return {
          resumo: [
            { rotulo: "Adequações", valor: as.length },
            { rotulo: "Implantadas", valor: contar(as, "status", "Implantada") },
            { rotulo: "Bloqueadas", valor: contar(as, "status", "Bloqueada") }
          ],
          secoes: [
            {
              titulo: "Adequações",
              colunas: [C("Código"), C("Sistema"), C("Requisito"), C("Alteração necessária"), C("Resp. técnico"), C("Resp. tributário"), C("Status", "status"), C("Testes aprovados", "numero"), C("Testes", "numero"), C("Defeitos abertos", "numero")],
              linhas: as.map(a => {
                const seus = ct.filter(t => t.adequacao === a.codigo);
                const def = df.filter(d => seus.some(t => t.codigo === d.teste));
                return [a.codigo, a.sistema, a.requisito, a.alteracao, a.respTecnico, a.respTributario, a.status, contar(seus, "status", "Aprovado"), seus.length, def.length];
              })
            },
            {
              titulo: "Por sistema",
              colunas: [C("Sistema")].concat(L.statusAdequacao.map(s => C(s, "numero"))).concat([C("Total", "numero")]),
              linhas: L.sistemas.map(s => {
                const da = as.filter(a => a.sistema === s);
                return [s, ...L.statusAdequacao.map(st => contar(da, "status", st)), da.length];
              }).filter(l => l[l.length - 1] > 0)
            }
          ]
        };
      }
    },

    {
      id: "testes", titulo: "Testes e resultados",
      descricao: "Cenários executados, reprovações e defeitos em aberto.",
      filtros: [
        { nome: "sistema", rotulo: "Sistema", opcoes: () => L.sistemas },
        { nome: "status", rotulo: "Status", opcoes: () => L.statusTeste },
        { nome: "de", rotulo: "Executado de", tipo: "data" },
        { nome: "ate", rotulo: "até", tipo: "data" }
      ],
      gerar(f) {
        let ct = repo().listar("testes");
        if (f.sistema) ct = ct.filter(t => sistemaDoTeste(t) === f.sistema);
        if (f.status) ct = ct.filter(t => t.status === f.status);
        if (f.de || f.ate) ct = ct.filter(t => t.executadoEm && naJanela(t.executadoEm, f));
        const codigos = new Set(ct.map(t => t.codigo));
        const df = repo().listar("defeitos").filter(d => codigos.has(d.teste));
        return {
          resumo: L.statusTeste.map(s => ({ rotulo: s, valor: contar(ct, "status", s) })),
          secoes: [
            {
              titulo: "Cenários",
              colunas: [C("Código"), C("Cenário"), C("Adequação"), C("Sistema"), C("Dados utilizados"), C("Resultado esperado"), C("Resultado obtido"), C("Status", "status"), C("Executado por"), C("Executado em", "data")],
              linhas: ct.map(t => [t.codigo, t.cenario, t.adequacao, sistemaDoTeste(t), t.dados, t.esperado, t.obtido, t.status, t.executadoPor, t.executadoEm])
            },
            {
              titulo: "Defeitos",
              colunas: [C("Código"), C("Descrição"), C("Cenário"), C("Severidade"), C("Responsável"), C("Aberto em", "data"), C("Status", "status")],
              linhas: df.map(d => [d.codigo, d.descricao, d.teste, d.severidade, d.responsavel, d.abertoEm, d.status])
            }
          ]
        };
      }
    },

    {
      id: "prazos", titulo: "Prazos futuros",
      descricao: "Prazos legais, previsões e entregas internas dos próximos meses, separados por natureza.",
      filtros: [
        { nome: "horizonte", rotulo: "Horizonte", opcoes: () => ["30 dias", "90 dias", "180 dias", "365 dias", "Até 2033"], padrao: "180 dias" },
        { nome: "natureza", rotulo: "Natureza", opcoes: () => L.naturezas.concat(["Ação do plano"]) }
      ],
      gerar(f) {
        const hoje = R().hojeISO();
        const h = f.horizonte || "180 dias";
        const limite = h === "Até 2033" ? "2033-12-31" : R().isoLocal(new Date(Date.now() + parseInt(h, 10) * 86400000));
        const itens = [];
        repo().listar("marcos").forEach(m => {
          if (m.data && (m.data < hoje || m.data > limite)) return;
          itens.push([m.data, m.dataTexto || "", m.natureza, m.titulo, "Marco " + m.codigo, "", ""]);
        });
        repo().listar("atividades").filter(a => !R().encerrada(a) && a.prazo && a.prazo >= hoje && a.prazo <= limite)
          .forEach(a => itens.push([a.prazo, "", "Ação do plano", a.nome, a.codigo, a.responsavel, a.status]));
        const filtrados = itens.filter(i => !f.natureza || i[2] === f.natureza)
          .sort((a, b) => (a[0] || "9999").localeCompare(b[0] || "9999"));
        return {
          resumo: L.naturezas.concat(["Ação do plano"]).map(n => ({ rotulo: n, valor: filtrados.filter(i => i[2] === n).length })),
          secoes: [{
            titulo: "Prazos",
            colunas: [C("Data", "data"), C("Período ou observação"), C("Natureza"), C("Item"), C("Origem"), C("Responsável"), C("Status", "status")],
            linhas: filtrados
          }]
        };
      }
    },

    {
      id: "decisoes", titulo: "Decisões aprovadas",
      descricao: "Decisões vigentes e, se desejado, as versões substituídas e as revogadas.",
      filtros: [
        { nome: "area", rotulo: "Área", opcoes: () => L.areas },
        { nome: "historico", rotulo: "Incluir", opcoes: () => ["Substituídas e revogadas"], vazio: "Só vigentes" }
      ],
      gerar(f) {
        let dc = repo().listar("decisoes");
        if (!f.historico) dc = dc.filter(d => d.situacao === "Vigente");
        if (f.area) dc = dc.filter(d => (d.areas || []).includes(f.area));
        dc = dc.slice().sort((a, b) => a.codigo.localeCompare(b.codigo) || b.versao - a.versao);
        return {
          resumo: L.situacoesDecisao.map(s => ({ rotulo: s, valor: contar(dc, "situacao", s) })),
          secoes: [{
            titulo: "Decisões",
            colunas: [C("Código"), C("Versão", "numero"), C("Assunto"), C("Decisão adotada"), C("Justificativa"), C("Aprovação"), C("Data", "data"), C("Áreas"), C("Situação", "status"), C("Pareceres"), C("Ações")],
            linhas: dc.map(d => [d.codigo, Number(d.versao) || 1, d.assunto, d.decisao, d.justificativa, d.aprovador, d.dataDecisao, (d.areas || []).join(", "), d.situacao, (d.pareceres || []).join(", "), (d.atividades || []).join(", ")])
          }]
        };
      }
    },

    {
      id: "auditoria", titulo: "Trilha de alterações", restrito: true,
      descricao: "Todas as alterações registradas: quem, quando, o quê e, no modo SharePoint, quem gravou segundo o servidor.",
      filtros: [
        { nome: "modulo", rotulo: "Módulo", opcoes: () => Object.values(RT.esquema).filter(e => !e.interno).map(e => e.rotulo).concat(["Relatórios"]) },
        { nome: "usuario", rotulo: "Usuário", opcoes: valores("historico", "usuario") },
        { nome: "de", rotulo: "De", tipo: "data" },
        { nome: "ate", rotulo: "até", tipo: "data" },
        { nome: "texto", rotulo: "Contém", tipo: "texto" }
      ],
      gerar(f) {
        const rotuloModulo = h => h.entidade === "relatorios" ? "Relatórios" : (RT.esquema[h.entidade] ? RT.esquema[h.entidade].rotulo : h.entidade);
        let hs = repo().listar("historico");
        if (f.modulo) hs = hs.filter(h => rotuloModulo(h) === f.modulo);
        if (f.usuario) hs = hs.filter(h => h.usuario === f.usuario);
        hs = hs.filter(h => naJanela(h.data.slice(0, 10), f));
        if (f.texto) { const t = f.texto.toLowerCase(); hs = hs.filter(h => `${h.ref} ${h.acao} ${h.detalhes}`.toLowerCase().includes(t)); }
        hs = hs.slice().sort((a, b) => b.data.localeCompare(a.data));
        const det = h => { try { const d = JSON.parse(h.detalhes || "[]"); return Array.isArray(d) ? d.map(x => `${x.campo}: ${fmt(x.de)} → ${fmt(x.para)}`).join("\n") : ""; } catch (e) { return ""; } };
        const fmt = v => Array.isArray(v) ? (v.map(x => typeof x === "object" ? x.nome : x).join(", ") || "vazio") : (v === "" || v === undefined || v === null ? "vazio" : String(v));
        return {
          resumo: [
            { rotulo: "Registros", valor: hs.length },
            { rotulo: "Usuários", valor: new Set(hs.map(h => h.usuario)).size }
          ],
          secoes: [{
            titulo: "Alterações",
            colunas: [C("Data"), C("Hora"), C("Módulo"), C("Registro"), C("Ação"), C("Detalhes"), C("Usuário"), C("Gravado no SharePoint por")],
            linhas: hs.map(h => [RT.ui.fmtData(h.data), String(h.data).slice(11, 16), rotuloModulo(h), h.ref === "-" ? "" : h.ref, h.acao, det(h), h.usuario, h._autorServidor || ""])
          }]
        };
      }
    }
  ];

  function lista(usuario) {
    return defs.filter(d => !d.restrito || ["Administrador", "Gestor"].includes(usuario.perfil));
  }
  function def(id) { return defs.find(d => d.id === id) || null; }

  return { lista, def };
})();
