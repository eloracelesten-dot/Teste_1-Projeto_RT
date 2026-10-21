/*
 * Regras de negócio: permissões, validações, transições de status e indicadores.
 *
 * Importante: as permissões aqui controlam o que a tela oferece. A proteção real dos dados
 * fica nas permissões do site e das listas do SharePoint (e, na Etapa 4, no back-end).
 */
window.RT = window.RT || {};

RT.regras = (function () {
  const E = () => RT.esquema;

  // ---------- Datas ----------
  function isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function hojeISO() {
    return isoLocal(new Date());
  }
  function agoraISO() {
    const d = new Date();
    return hojeISO() + "T" + d.toTimeString().slice(0, 8);
  }
  function diasEntre(deISO, ateISO) {
    const a = new Date(deISO.slice(0, 10) + "T00:00:00");
    const b = new Date(ateISO.slice(0, 10) + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  // ---------- Permissões ----------
  const PODE_EDITAR_TUDO = ["Administrador", "Gestor"];

  function camposDeResponsavel(registro) {
    return ["responsavel", "respTecnico", "respTributario", "executadoPor", "aprovador", "criadoPor"]
      .map(c => registro[c]).filter(Boolean);
  }

  function pode(usuario, acao, entidade, registro) {
    if (!usuario) return false;
    const perfil = usuario.perfil;
    if (perfil === "Consulta") return acao === "ver";

    if (entidade === "usuarios" || acao === "administrar") return perfil === "Administrador";
    if (acao === "removerDemonstracao") return perfil === "Administrador";
    if (acao === "aprovar") return perfil === "Gestor";
    if (acao === "exportar") return true; // Consulta já saiu acima: não exporta
    if (acao === "auditoria") return PODE_EDITAR_TUDO.includes(perfil);
    if (entidade === "decisoes" && ["criar", "novaVersao", "revogar"].includes(acao)) return perfil === "Gestor";
    if (entidade === "decisoes" && acao === "editar") return false; // decisões mudam por nova versão
    if (acao === "arquivar") return PODE_EDITAR_TUDO.includes(perfil);
    if (acao === "ver" || acao === "criar") return true;

    if (acao === "editar") {
      if (PODE_EDITAR_TUDO.includes(perfil)) return true;
      if (!registro) return false;
      const areaDoRegistro = [registro.area, registro.frente];
      return areaDoRegistro.includes(usuario.area) || camposDeResponsavel(registro).includes(usuario.nome);
    }
    return false;
  }

  // ---------- Status permitidos no formulário ----------
  function opcoesDeStatus(entidade, registro, usuario) {
    const campo = E()[entidade].campo("status");
    if (!campo) return [];
    if (entidade === "pareceres") {
      // Aprovação só pelo botão "Aprovar internamente"
      const atual = registro && registro.status;
      if (atual === "Aprovado internamente") return ["Aprovado internamente"];
      return campo.opcoes.filter(o => o !== "Aprovado internamente");
    }
    return campo.opcoes;
  }

  // ---------- Validação ----------
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const LIMITE_TEXTO_LONGO = 10000;

  function validar(entidade, dados, contexto) {
    const ent = E()[entidade];
    const erros = {};
    for (const c of ent.campos) {
      if (c.sistema) continue;
      const v = dados[c.nome];
      const vazio = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (c.obrigatorio && vazio) { erros[c.nome] = "Campo obrigatório."; continue; }
      if (vazio) continue;
      if (c.tipo === "texto" && c.max && String(v).length > c.max) erros[c.nome] = `Máximo de ${c.max} caracteres.`;
      if (c.tipo === "textoLongo" && String(v).length > LIMITE_TEXTO_LONGO) erros[c.nome] = `Máximo de ${LIMITE_TEXTO_LONGO.toLocaleString("pt-BR")} caracteres.`;
      if (c.tipo === "numero") {
        const n = Number(v);
        if (Number.isNaN(n)) erros[c.nome] = "Informe um número.";
        else if (c.min !== undefined && n < c.min) erros[c.nome] = `Mínimo ${c.min}.`;
        else if (c.max !== undefined && n > c.max) erros[c.nome] = `Máximo ${c.max}.`;
      }
      if (c.tipo === "data" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) erros[c.nome] = "Data inválida.";
      if (c.tipo === "email" && !reEmail.test(v)) erros[c.nome] = "E-mail inválido.";
      if (c.tipo === "url") {
        try { const u = new URL(v); if (u.protocol !== "https:") erros[c.nome] = "Use um endereço https."; }
        catch (e) { erros[c.nome] = "Endereço inválido."; }
      }
      if (c.tipo === "opcao" && c.opcoes && !c.opcoes.includes(v)) erros[c.nome] = "Opção inválida.";
    }

    // Regras específicas
    if (entidade === "atividades") {
      if (dados.inicio && dados.prazo && dados.prazo < dados.inicio) erros.prazo = "O prazo não pode ser anterior ao início.";
      if (dados.status === "Concluída" && !dados.dataConclusao) erros.dataConclusao = "Informe a data de conclusão.";
      if (dados.status === "Bloqueada" && !dados.riscos) erros.riscos = "Descreva o que está bloqueando a ação.";
      if (dados.status === "Cancelada" && !dados.riscos) erros.riscos = "Registre o motivo do cancelamento.";
      const deps = dados.dependencias || [];
      if (contexto && contexto.codigo && deps.includes(contexto.codigo)) erros.dependencias = "Uma ação não pode depender dela mesma.";
      else if (contexto && contexto.codigo && criaCiclo(contexto.codigo, deps, contexto.atividades || [])) erros.dependencias = "Essa dependência cria um ciclo entre ações.";
    }
    if (entidade === "testes" && ["Aprovado", "Reprovado"].includes(dados.status)) {
      if (!dados.obtido) erros.obtido = "Informe o resultado obtido.";
      if (!dados.executadoEm) erros.executadoEm = "Informe a data de execução.";
      if (!dados.executadoPor) erros.executadoPor = "Informe quem executou.";
    }
    if (entidade === "marcos") {
      if (!dados.data && !dados.dataTexto) erros.data = "Informe a data ou descreva o período.";
      if (dados.natureza === "Legal confirmado" && !dados.norma && !dados.fonte) erros.norma = "Um marco legal precisa indicar a norma ou a fonte.";
    }
    if (entidade === "usuarios" && contexto && contexto.usuarios) {
      const email = String(dados.email || "").toLowerCase();
      const repetido = contexto.usuarios.find(u => u.email.toLowerCase() === email && u.id !== contexto.id);
      if (repetido) erros.email = "Já existe um usuário com este e-mail.";
    }
    return erros;
  }

  function criaCiclo(codigo, novasDeps, atividades) {
    const mapa = new Map(atividades.map(a => [a.codigo, a.dependencias || []]));
    mapa.set(codigo, novasDeps);
    const visitados = new Set();
    const pilha = [...novasDeps];
    while (pilha.length) {
      const atual = pilha.pop();
      if (atual === codigo) return true;
      if (visitados.has(atual)) continue;
      visitados.add(atual);
      pilha.push(...(mapa.get(atual) || []));
    }
    return false;
  }

  function validarAnexo(arquivo) {
    const ext = (arquivo.name.split(".").pop() || "").toLowerCase();
    if (!RT.listas.extensoesAnexo.includes(ext)) return `Formato .${ext} não autorizado. Use ${RT.listas.extensoesAnexo.join(", ").toUpperCase()}.`;
    if (arquivo.size > RT.config.anexoMaxMB * 1024 * 1024) return `O arquivo passa de ${RT.config.anexoMaxMB} MB.`;
    if (arquivo.size === 0) return "O arquivo está vazio.";
    return "";
  }

  // Confere os primeiros bytes do arquivo: a extensão sozinha não garante o formato
  async function validarConteudoAnexo(arquivo) {
    const ext = (arquivo.name.split(".").pop() || "").toLowerCase();
    const cab = new Uint8Array(await arquivo.slice(0, 1024).arrayBuffer());
    const comeca = (...bytes) => bytes.every((b, i) => cab[i] === b);
    const zip = () => comeca(0x50, 0x4b, 0x03, 0x04);
    const assinatura = {
      pdf: () => comeca(0x25, 0x50, 0x44, 0x46),
      docx: zip, xlsx: zip, pptx: zip,
      png: () => comeca(0x89, 0x50, 0x4e, 0x47),
      jpg: () => comeca(0xff, 0xd8, 0xff), jpeg: () => comeca(0xff, 0xd8, 0xff),
      csv: () => !cab.includes(0)
    };
    return assinatura[ext] && assinatura[ext]() ? "" : `O conteúdo de ${arquivo.name} não corresponde a um arquivo .${ext}.`;
  }

  async function hashArquivo(arquivo) {
    if (!(window.crypto && crypto.subtle)) return "";
    const h = await crypto.subtle.digest("SHA-256", await arquivo.arrayBuffer());
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Remove caracteres que o SharePoint não aceita em nomes de arquivo e pasta
  function nomeSeguro(nome) {
    return String(nome).replace(/["*:<>?/\\|#%~&{}]/g, "_").replace(/^[\s.]+|[\s.]+$/g, "").slice(0, 180) || "arquivo";
  }

  // A aprovação só vale se houver registro no histórico gravado por um gestor.
  // No modo SharePoint, quem gravou é informado pelo próprio SharePoint, não pelo navegador.
  function verificarAprovacao(parecer, historico, usuarios, autoriaDoServidor) {
    if (parecer.status !== "Aprovado internamente") return null;
    const registro = historico
      .filter(h => h.entidade === "pareceres" && h.ref === parecer.codigo && h.acao === "Aprovado internamente")
      .sort((a, b) => b.data.localeCompare(a.data))[0];
    if (!registro) return { ok: false, texto: "Não há registro desta aprovação no histórico." };
    if (!autoriaDoServidor) return { ok: true, texto: `Aprovação registrada por ${registro.usuario} nesta sessão de demonstração.` };
    const autor = String(registro._autorServidor || "").toLowerCase();
    if (!autor) return { ok: false, texto: "O SharePoint não informou quem gravou a aprovação." };
    const gestor = usuarios.find(u => u.perfil === "Gestor" && u.ativo !== false &&
      (String(u.email).toLowerCase() === autor || String(u.nome).toLowerCase() === autor));
    if (!gestor) return { ok: false, texto: `A aprovação foi gravada por ${registro._autorServidor}, que não consta como Gestor na lista de usuários.` };
    return { ok: true, texto: `Aprovação confirmada pelo SharePoint: gravada por ${gestor.nome}.` };
  }

  // ---------- Ajustes automáticos antes de gravar ----------
  function aoSalvar(entidade, dados, anterior) {
    const d = Object.assign({}, dados);
    if (entidade === "atividades") {
      if (d.status === "Concluída") d.percentual = 100;
      if (d.status !== "Concluída") d.dataConclusao = "";
      d.percentual = Number(d.percentual || 0);
    }
    if (entidade === "pareceres" && anterior && anterior.status === "Aprovado internamente") {
      // Nova versão do documento exige nova aprovação
      const versoesAntes = (anterior.anexos || []).length;
      if ((d.anexos || []).length > versoesAntes) {
        d.status = "Análise concluída";
        d.aprovadoPor = "";
        d.aprovadoEm = "";
        d._aviso = "Um novo arquivo foi anexado: o parecer voltou para Análise concluída e precisa de nova aprovação.";
      }
    }
    if (entidade === "testes" && d.status === "Não iniciado") {
      d.executadoEm = d.executadoEm || "";
    }
    return d;
  }

  // ---------- Derivados ----------
  const encerrada = a => a.status === "Concluída" || a.status === "Cancelada";

  function atrasada(a, hoje) {
    return !encerrada(a) && a.prazo && a.prazo < (hoje || hojeISO());
  }

  function bloqueiaOutras(a, atividades) {
    if (encerrada(a)) return [];
    return atividades.filter(o => !encerrada(o) && (o.dependencias || []).includes(a.codigo)).map(o => o.codigo);
  }

  function dependenciasPendentes(a, atividades) {
    return (a.dependencias || []).filter(cod => {
      const dep = atividades.find(x => x.codigo === cod);
      return dep && !encerrada(dep);
    });
  }

  // ---------- Indicadores da Visão geral ----------
  function indicadores(dados) {
    const hoje = hojeISO();
    const ativos = lista => lista.filter(r => !r.arquivado);
    const at = ativos(dados.atividades);
    const pt = ativos(dados.pareceres);
    const im = ativos(dados.impactos);
    const as = ativos(dados.adequacoes);
    const ct = ativos(dados.testes);
    const df = ativos(dados.defeitos);

    const contar = (lista, campo, valores) => Object.fromEntries(valores.map(v => [v, lista.filter(r => r[campo] === v).length]));

    const atStatus = contar(at, "status", RT.listas.statusAtividade);
    const validas = at.filter(a => a.status !== "Cancelada");
    const concluidas = atStatus["Concluída"];

    const daquiA30 = new Date(); daquiA30.setDate(daquiA30.getDate() + 30);
    const limite30 = isoLocal(daquiA30);

    return {
      hoje,
      atividades: {
        total: at.length,
        status: atStatus,
        concluidas,
        emAndamento: atStatus["Em andamento"] + atStatus["Em validação"],
        emValidacao: atStatus["Em validação"],
        naoIniciadas: atStatus["Não iniciada"],
        bloqueadas: atStatus["Bloqueada"],
        canceladas: atStatus["Cancelada"],
        atrasadas: at.filter(a => atrasada(a, hoje)).length,
        criticasAbertas: at.filter(a => a.prioridade === "Crítica" && !encerrada(a)).length,
        travando: at.filter(a => bloqueiaOutras(a, at).length).length,
        vencem30: at.filter(a => !encerrada(a) && a.prazo >= hoje && a.prazo <= limite30).length,
        percentual: validas.length ? Math.round((concluidas / validas.length) * 100) : 0,
        frentes: new Set(at.map(a => a.frente)).size
      },
      pareceres: {
        total: pt.length,
        status: contar(pt, "status", RT.listas.statusParecer),
        semResponsavel: pt.filter(p => !p.responsavel && p.status === "Recebido")
      },
      impactos: {
        total: im.length,
        alta: im.filter(i => i.criticidade === "Alta").length,
        adequados: im.filter(i => i.status === "Adequado" || i.status === "Não aplicável").length,
        porArea: RT.listas.areas.map(area => {
          const da = im.filter(i => i.area === area);
          return { area, total: da.length, ...contar(da, "criticidade", RT.listas.criticidades), adequados: da.filter(i => i.status === "Adequado" || i.status === "Não aplicável").length };
        })
      },
      adequacoes: {
        total: as.length,
        implantadas: as.filter(a => a.status === "Implantada").length,
        pendentes: as.filter(a => a.status !== "Implantada").length,
        status: contar(as, "status", RT.listas.statusAdequacao)
      },
      testes: {
        total: ct.length,
        status: contar(ct, "status", RT.listas.statusTeste),
        executados: ct.filter(t => ["Aprovado", "Reprovado", "Bloqueado"].includes(t.status)).length,
        reprovadosPorSistema: (() => {
          const m = {};
          ct.filter(t => t.status === "Reprovado").forEach(t => {
            const a = as.find(x => x.codigo === t.adequacao);
            const s = a ? a.sistema : "Sem adequação";
            m[s] = (m[s] || 0) + 1;
          });
          return Object.entries(m).sort((a, b) => b[1] - a[1]);
        })()
      },
      defeitosAbertos: df.filter(d => !["Corrigido", "Cancelado"].includes(d.status)),
      evolucao: evolucao(at)
    };
  }

  // Percentual concluído no fim de cada mês, calculado pelas datas das ações:
  // realizado = ações com data de conclusão até o fim do mês; linha de base = ações com prazo até o fim do mês.
  function evolucao(atividades, meses) {
    meses = meses || 6;
    const validas = atividades.filter(a => a.status !== "Cancelada");
    const total = validas.length || 1;
    const hoje = new Date();
    const pontos = [];
    for (let i = meses - 1; i >= 0; i--) {
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
      const corte = i === 0 ? hojeISO() : isoLocal(fim);
      const realizado = validas.filter(a => a.status === "Concluída" && a.dataConclusao && a.dataConclusao <= corte).length;
      const previsto = validas.filter(a => a.prazo && a.prazo <= corte).length;
      const mes = fim.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      pontos.push({
        mes,
        rotulo: `${mes}/${String(fim.getFullYear()).slice(2)}`,
        realizado: Math.round((realizado / total) * 100),
        previsto: Math.round((previsto / total) * 100)
      });
    }
    return pontos;
  }

  return {
    isoLocal, hojeISO, agoraISO, diasEntre, pode, opcoesDeStatus, validar, validarAnexo, aoSalvar,
    validarConteudoAnexo, hashArquivo, nomeSeguro, verificarAprovacao,
    atrasada, encerrada, bloqueiaOutras, dependenciasPendentes, indicadores, evolucao, criaCiclo
  };
})();
