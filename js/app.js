/*
 * Inicialização, rotas e eventos.
 * Rotas (após o #):
 *   visao-geral · pareceres · plano · impactos · sistemas[/aba] · legislacao · decisoes · relatorios · administracao
 *   busca?q=termo
 *   <entidade>/novo[?campo=valor] · <entidade>/<código> · <entidade>/<código>/editar · decisoes/<código>/nova-versao
 */
window.RT = window.RT || {};

RT.app = (function () {
  // Cópia local da MSAL.js 3.28.1 (SHA-256 no README): o portal não depende de CDN em produção
  const MSAL_URL = "js/vendor/msal-browser-3.28.1.min.js";
  const T = () => RT.telas;
  const U = RT.ui;
  const conteudo = () => document.getElementById("conteudo");

  // ---------- Usuário ----------
  function identificarUsuario(conta) {
    const email = (conta.username || "").toLowerCase();
    const cadastrado = RT.repositorio.listar("usuarios").find(u => u.email.toLowerCase() === email && u.ativo !== false);
    if (RT.config.perfisPeloEntra) {
      // Ordem de precedência quando a pessoa tem mais de um papel
      const ordem = ["Administrador", "Gestor", "Colaborador", "Consulta"];
      const perfis = RT.auth.papeis().map(p => RT.config.papeisEntra[p]).filter(Boolean);
      const perfil = ordem.find(p => perfis.includes(p)) || "Consulta";
      return {
        nome: (cadastrado && cadastrado.nome) || conta.name || conta.username, email: conta.username,
        area: cadastrado ? cadastrado.area : "", perfil,
        origemPerfil: perfis.length ? "papel atribuído no Entra ID" : "sem papel no Entra ID: acesso somente para consulta"
      };
    }
    if (cadastrado) return Object.assign({}, cadastrado, { origemPerfil: "lista de usuários do portal" });
    const inicial = RT.config.administradoresIniciais.map(e => e.toLowerCase()).includes(email);
    return {
      nome: conta.name || conta.username, email: conta.username, area: "",
      perfil: inicial ? "Administrador" : "Consulta",
      origemPerfil: inicial ? "administrador inicial definido em config.js" : "não cadastrado: acesso somente para consulta"
    };
  }

  function definirUsuario(u) {
    T().estado.usuario = u;
    const alvo = document.getElementById("usuario");
    const iniciais = (u.nome || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
    if (RT.config.modoSharePoint) {
      alvo.innerHTML = `<div class="avatar" aria-hidden="true">${U.esc(iniciais)}</div>
        <div class="usuario-texto"><div class="usuario-nome">${U.esc(u.nome)}</div><div class="usuario-perfil">${U.esc(u.perfil)}</div></div>
        <button type="button" class="botao pequeno" data-acao="sair">Sair</button>`;
    } else {
      const opcoes = RT.repositorio.listar("usuarios").filter(x => x.ativo !== false)
        .map(x => `<option value="${U.esc(x.email)}"${x.email === u.email ? " selected" : ""}>${U.esc(x.nome)} · ${U.esc(x.perfil)}</option>`).join("");
      alvo.innerHTML = `<div class="avatar" aria-hidden="true">${U.esc(iniciais)}</div>
        <div class="simular"><label for="seletor-usuario">Simular acesso como</label><select id="seletor-usuario">${opcoes}</select></div>`;
    }
  }

  // ---------- Rotas ----------
  function lerRota() {
    const bruto = decodeURIComponent(location.hash.replace(/^#/, ""));
    const [caminho, consulta] = bruto.split("?");
    return { partes: caminho.split("/").filter(Boolean), params: new URLSearchParams(consulta || "") };
  }

  let sessaoEncerrada = false;

  function render() {
    if (sessaoEncerrada) return;
    if (/(^|&)(code|error)=/.test(location.hash.replace(/^#/, ""))) return; // retorno do login
    const { partes, params } = lerRota();
    const [a, b, c] = partes;
    const ents = RT.esquema;
    let tela, modulo = a || "visao-geral";

    try {
      if (!a || a === "visao-geral") tela = T().visaoGeral();
      else if (a === "busca") tela = T().busca(params.get("q") || "");
      else if (ents[a] && !ents[a].interno && b === "novo") { tela = T().formulario(a, null, "novo", params); modulo = T().MODULO_DA_ENTIDADE[a]; }
      else if (ents[a] && !ents[a].interno && b && c === "editar") { tela = T().formulario(a, b, "editar"); modulo = T().MODULO_DA_ENTIDADE[a]; }
      else if (a === "decisoes" && b && c === "nova-versao") { tela = T().formulario(a, b, "nova-versao"); modulo = "decisoes"; }
      else if (ents[a] && !ents[a].interno && b && a !== "sistemas") { tela = T().detalhe(a, b); modulo = T().MODULO_DA_ENTIDADE[a]; }
      else if (a === "pareceres") tela = T().pareceres();
      else if (a === "plano" || a === "atividades") { tela = T().plano(); modulo = "plano"; }
      else if (a === "impactos") tela = T().impactos();
      else if (a === "sistemas") tela = T().sistemas(b);
      else if (["adequacoes", "testes", "defeitos"].includes(a)) { tela = T().sistemas(a); modulo = "sistemas"; }
      else if (a === "legislacao" || a === "normas" || a === "marcos") { tela = T().legislacao(); modulo = "legislacao"; }
      else if (a === "decisoes") tela = T().decisoes();
      else if (a === "relatorios") tela = b ? T().relatorio(b) : T().relatorios();
      else if (a === "administracao" || a === "usuarios") { tela = T().administracao(); modulo = "administracao"; }
      else tela = T().naoEncontrado(a);
    } catch (erro) {
      console.error(erro);
      tela = { titulo: "Erro", html: `<div class="aviso erro"><p><strong>Não foi possível abrir esta tela.</strong> ${U.esc(erro.message)}</p></div>` };
    }

    conteudo().innerHTML = tela.html;
    document.title = `${tela.titulo} · ${RT.config.nomePortal}`;
    document.querySelectorAll(".nav-item").forEach(el => {
      const ativo = el.dataset.modulo === modulo;
      el.classList.toggle("ativo", ativo);
      if (ativo) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
    });
    const q = params.get("q");
    if (a === "busca" && q) document.getElementById("busca-global").value = q;
  }

  function ir(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }

  // ---------- Ações ----------
  async function executar(rotulo, fn) {
    try { return await fn(); }
    catch (e) { console.error(e); U.toast(`${rotulo}: ${e.message}`, "erro"); return null; }
  }

  const usuario = () => T().estado.usuario;

  const acoes = {
    "ordenar"(el) {
      const f = T().filtrosDe(el.dataset.ent);
      if (f.ordem.campo === el.dataset.campo) f.ordem.dir *= -1; else f.ordem = { campo: el.dataset.campo, dir: 1 };
      T().atualizarLista(el.dataset.ent);
      const novo = document.querySelector(`[data-acao="ordenar"][data-ent="${el.dataset.ent}"][data-campo="${el.dataset.campo}"]`);
      if (novo) novo.focus();
    },
    "limpar-filtros"(el) {
      const ent = el.dataset.ent;
      const ordem = T().filtrosDe(ent).ordem;
      T().estado.filtros[ent] = { busca: "", campos: {}, de: "", ate: "", arquivados: false, ordem };
      render();
    },
    "filtro-rapido"(el) {
      T().filtrosDe(el.dataset.ent).campos[el.dataset.campo] = el.dataset.valor;
      render();
    },
    "plano-vista"(el) { T().estado.plano.vista = el.dataset.valor; render(); },
    "plano-destaque"(el) { T().estado.plano.destaque = el.dataset.valor; render(); },
    "matriz"(el) {
      const f = T().filtrosDe("impactos");
      const mesmo = f.campos.area === el.dataset.area && f.campos.criticidade === el.dataset.crit;
      f.campos.area = mesmo ? "" : el.dataset.area;
      f.campos.criticidade = mesmo ? "" : el.dataset.crit;
      render();
      const lista = document.querySelector('[data-lista="impactos"]');
      if (lista && !mesmo) lista.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    async "arquivar"(el) {
      const ent = el.dataset.ent;
      const reg = RT.repositorio.obter(ent, el.dataset.codigo);
      const r = await U.modal({
        titulo: `Arquivar ${reg.codigo}`,
        texto: "O registro sai das listas e dos indicadores, mas continua consultável com o filtro “Incluir arquivados”. Nada é excluído.",
        campos: [{ nome: "motivo", rotulo: "Motivo do arquivamento", tipo: "textoLongo", obrigatorio: true }],
        confirmar: "Arquivar"
      });
      if (!r) return;
      await executar("Não foi possível arquivar", async () => {
        await RT.repositorio.arquivar(ent, reg, r.motivo, usuario());
        U.toast(`${reg.codigo} arquivado.`);
        render();
      });
    },
    async "restaurar"(el) {
      const ent = el.dataset.ent;
      const reg = RT.repositorio.obter(ent, el.dataset.codigo);
      await executar("Não foi possível restaurar", async () => {
        await RT.repositorio.restaurar(ent, reg, usuario());
        U.toast(`${reg.codigo} restaurado.`);
        render();
      });
    },
    async "aprovar"(el) {
      const reg = RT.repositorio.obter("pareceres", el.dataset.codigo);
      const r = await U.modal({
        titulo: `Aprovar ${reg.codigo} internamente`,
        texto: `Você confirma que leu o documento e aprova <strong>${U.esc(reg.titulo)}</strong> como posição interna? A aprovação fica registrada com seu nome e a data.`,
        confirmar: "Aprovar"
      });
      if (!r) return;
      await executar("Não foi possível aprovar", async () => {
        await RT.repositorio.aprovarParecer(reg, usuario());
        U.toast(`${reg.codigo} aprovado internamente.`);
        render();
      });
    },
    async "revogar"(el) {
      const reg = RT.repositorio.obter("decisoes", el.dataset.codigo);
      const r = await U.modal({
        titulo: `Revogar ${reg.codigo}`,
        texto: "A decisão deixa de valer e continua consultável como Revogada.",
        campos: [{ nome: "motivo", rotulo: "Motivo da revogação", tipo: "textoLongo", obrigatorio: true }],
        confirmar: "Revogar", perigo: true
      });
      if (!r) return;
      await executar("Não foi possível revogar", async () => {
        await RT.repositorio.revogarDecisao(reg, r.motivo, usuario());
        U.toast(`${reg.codigo} revogada.`);
        render();
      });
    },
    "remover-anexo"(el) {
      const lista = T().estado.anexosPendentes[el.dataset.campo] || [];
      lista.splice(Number(el.dataset.indice), 1);
      desenharAnexosPendentes(el.dataset.campo);
    },
    async "remover-demo"() {
      const n = RT.repositorio.contarDemonstracao();
      const r = await U.modal({
        titulo: "Remover dados de demonstração",
        texto: `Isto exclui definitivamente os ${n} registros marcados como demonstração${RT.config.modoSharePoint ? " das listas do SharePoint" : ""}. Registros reais não são afetados.`,
        campos: [{ nome: "confirmacao", rotulo: "Digite REMOVER para confirmar", obrigatorio: true, igual: "REMOVER" }],
        confirmar: "Remover", perigo: true
      });
      if (!r) return;
      await executar("Não foi possível remover", async () => {
        const total = await RT.repositorio.removerDemonstracao(usuario(), msg => progresso(msg));
        progresso("");
        U.toast(`${total} registros de demonstração removidos.`);
        definirUsuarioAposMudanca();
        render();
      });
    },
    async "carregar-demo"() {
      const r = await U.modal({ titulo: "Carregar dados de demonstração", texto: "Cria nas listas os registros fictícios de demonstração, marcados como tal. Registros com o mesmo código não são duplicados.", confirmar: "Carregar" });
      if (!r) return;
      await executar("Não foi possível carregar", async () => {
        await RT.repositorio.carregarDemonstracao(usuario(), msg => progresso(msg));
        progresso("");
        U.toast("Dados de demonstração carregados.");
        render();
      });
    },
    async "verificar-listas"() {
      await executar("Não foi possível verificar", async () => {
        const faltando = await RT.repositorio.adaptadorAtual().verificarListas();
        mostrarResultadoListas(faltando.length
          ? `Faltam ${faltando.length}: ${faltando.join(", ")}.`
          : "Todas as listas e a biblioteca de documentos existem no site.");
      });
    },
    async "baixar-anexo"(el) {
      const reg = RT.repositorio.obter(el.dataset.ent, el.dataset.codigo);
      const anexo = (reg[el.dataset.campo] || [])[Number(el.dataset.indice)];
      if (!anexo) return;
      el.disabled = true;
      await executar("Não foi possível baixar", async () => {
        const blob = await RT.repositorio.baixarArquivo(anexo);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = anexo.nome;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        // O registro do download não pode impedir o download
        RT.repositorio.registrarAcesso(el.dataset.ent, reg.codigo, `Arquivo baixado: ${anexo.nome}`, usuario())
          .catch(e => console.warn("Download não registrado no histórico:", e));
      });
      el.disabled = false;
    },
    async "criar-listas"() {
      await executar("Não foi possível criar as listas", async () => {
        const criadas = await RT.repositorio.adaptadorAtual().criarListas(msg => progresso(msg));
        progresso("");
        mostrarResultadoListas(criadas.length ? `Listas criadas: ${criadas.length}. Recarregue a página para começar a usar.` : "Nenhuma lista precisava ser criada.");
      });
    },
    "limpar-relatorio"(el) {
      T().estado.relatorios[el.dataset.rel] = undefined;
      render();
    },
    async "exportar-relatorio"(el) {
      const d = RT.relatorios.def(el.dataset.rel);
      if (!RT.regras.pode(usuario(), "exportar") || (d.restrito && !RT.regras.pode(usuario(), "auditoria"))) return;
      await executar("Não foi possível exportar", async () => {
        const r = d.gerar(T().filtrosDoRelatorio(d));
        const sobre = folhaSobre(d.titulo, T().descricaoFiltros(d), r.resumo);
        RT.xlsx.baixar(RT.xlsx.gerar(r.secoes, sobre), `RT_${d.id}_${RT.regras.hojeISO()}.xlsx`);
        await registrarExportacao(d.id, `Relatório exportado em Excel: ${d.titulo}`);
      });
    },
    async "exportar-lista"(el) {
      const ent = el.dataset.ent;
      if (!RT.regras.pode(usuario(), "exportar")) return;
      await executar("Não foi possível exportar", async () => {
        const p = T().planilhaDaLista(ent);
        const rotulo = RT.esquema[ent].rotulo;
        RT.xlsx.baixar(RT.xlsx.gerar(p.secoes, folhaSobre(rotulo, p.filtros, [{ rotulo: "Registros", valor: p.total }])), `RT_${ent}_${RT.regras.hojeISO()}.xlsx`);
        await registrarExportacao(`lista:${ent}`, `Lista exportada em Excel: ${rotulo} (${p.total} registros)`);
      });
    },
    async "imprimir"(el) {
      if (!RT.regras.pode(usuario(), "exportar")) return;
      let titulo, filtros, ref;
      if (el.dataset.rel) {
        const d = RT.relatorios.def(el.dataset.rel);
        titulo = d.titulo; filtros = T().descricaoFiltros(d); ref = d.id;
      } else {
        const p = T().planilhaDaLista(el.dataset.ent);
        titulo = RT.esquema[el.dataset.ent].rotulo; filtros = p.filtros; ref = `lista:${el.dataset.ent}`;
      }
      const u = usuario();
      document.getElementById("cabecalho-impressao").innerHTML = `
        <strong>${U.esc(RT.config.nomePortal)} · ${U.esc(titulo)}</strong>
        <span>Gerado em ${U.fmtDataHora(RT.regras.agoraISO())} por ${U.esc(u.nome)} (${U.esc(u.perfil)}) · Filtros: ${U.esc(filtros)}</span>
        <span>Documento interno. ${RT.repositorio.info().persistente ? "" : "Dados de demonstração, fictícios."}</span>`;
      await registrarExportacao(ref, `Impressão ou PDF: ${titulo}`);
      window.print();
    },
    // O link não pode mudar o # da página, que é a rota: só move o foco
    "pular-conteudo"() { conteudo().focus(); },
    "entrar"() { RT.auth.entrar(); },
    "sair"() { RT.auth.sair(); }
  };

  // Aba "Sobre" de toda planilha exportada: rastreabilidade de quem gerou e com quais filtros
  function folhaSobre(titulo, filtros, resumo) {
    const u = usuario();
    return {
      titulo: `${RT.config.nomePortal} · ${titulo}`,
      linhas: [
        ["Gerado em", U.fmtDataHora(RT.regras.agoraISO())],
        ["Gerado por", `${u.nome} (${u.perfil})`],
        ["Filtros", filtros],
        ["Origem dos dados", RT.repositorio.info().persistente ? `SharePoint · ${RT.config.siteUrl}` : "Modo demonstração: dados fictícios"],
        ["Classificação", "Documento interno. Não compartilhar fora da empresa."],
        [""],
        ...resumo.map(x => [x.rotulo, String(x.valor)])
      ]
    };
  }

  // Exportar não pode falhar por causa do registro, mas o registro é tentado sempre
  async function registrarExportacao(ref, texto) {
    try { await RT.repositorio.registrarAcesso("relatorios", ref, texto, usuario()); }
    catch (e) { console.warn("Exportação não registrada no histórico:", e); }
  }

  function mostrarResultadoListas(texto) {
    const el = document.getElementById("resultado-listas");
    if (el) { el.hidden = false; el.textContent = texto; }
  }

  function progresso(msg) {
    const el = document.getElementById("progresso");
    el.hidden = !msg;
    el.textContent = msg;
  }

  function definirUsuarioAposMudanca() {
    const atual = usuario();
    if (RT.config.modoSharePoint) return;
    const ainda = RT.repositorio.listar("usuarios").find(u => u.email === atual.email);
    if (!ainda) {
      // Sem os usuários de demonstração, segue como administrador anônimo da sessão
      definirUsuario({ nome: atual.nome, email: atual.email, area: atual.area, perfil: atual.perfil });
    }
  }

  // ---------- Anexos no formulário ----------
  function desenharAnexosPendentes(campo) {
    const alvo = document.querySelector(`[data-anexos-novos="${campo}"]`);
    if (!alvo) return;
    const lista = T().estado.anexosPendentes[campo] || [];
    alvo.innerHTML = lista.map((a, i) => `<div class="arquivo-linha novo"><span class="arquivo-icone">${U.esc((a.nome.split(".").pop() || "").toUpperCase())}</span><span>${U.esc(a.nome)} <span class="muted">· ${U.fmtTamanho(a.tamanho)} · será enviado ao salvar como versão ${a.versao}</span></span><button type="button" class="botao-texto" data-acao="remover-anexo" data-campo="${campo}" data-indice="${i}">Remover</button></div>`).join("");
  }

  async function aoEscolherArquivos(input) {
    const campo = input.dataset.anexos;
    const form = input.closest("form");
    const ent = form.dataset.form;
    const reg = form.dataset.codigo ? RT.repositorio.obter(ent, form.dataset.codigo) : null;
    const existentes = reg ? (reg[campo] || []) : [];
    const pend = T().estado.anexosPendentes[campo] = T().estado.anexosPendentes[campo] || [];
    const erros = [];
    const arquivos = [...input.files];
    input.value = "";
    for (const arq of arquivos) {
      const erro = RT.regras.validarAnexo(arq) || await RT.regras.validarConteudoAnexo(arq);
      if (erro) { erros.push(erro.startsWith(arq.name) || erro.includes(arq.name) ? erro : `${arq.name}: ${erro}`); continue; }
      pend.push({ nome: arq.name, tamanho: arq.size, versao: existentes.length + pend.length + 1, _arquivo: arq });
    }
    const msg = document.getElementById(`f-${campo}-msg`);
    if (msg) msg.textContent = erros.join(" ");
    desenharAnexosPendentes(campo);
  }

  // ---------- Gravação de formulário ----------
  async function salvarFormulario(form) {
    const ent = form.dataset.form;
    const modo = form.dataset.modo;
    const codigo = form.dataset.codigo;
    const registro = codigo ? RT.repositorio.obter(ent, codigo) : null;
    const dados = U.lerFormulario(form, ent);

    const camposAnexo = RT.esquema[ent].campos.filter(c => c.tipo === "anexos");
    for (const c of camposAnexo) {
      const atuais = registro && modo === "editar" ? (registro[c.nome] || []) : [];
      dados[c.nome] = atuais.concat(T().estado.anexosPendentes[c.nome] || []);
    }

    const ctx = {
      codigo: modo === "editar" ? codigo : null,
      id: registro && modo === "editar" ? registro.id : null,
      atividades: RT.repositorio.listar("atividades"),
      usuarios: RT.repositorio.listar("usuarios", { incluirArquivados: true })
    };
    const erros = RT.regras.validar(ent, dados, ctx);
    if (Object.keys(erros).length) {
      U.mostrarErros(form, erros);
      U.toast(`Corrija ${Object.keys(erros).length} campo${Object.keys(erros).length === 1 ? "" : "s"} antes de salvar.`, "erro");
      return;
    }
    U.mostrarErros(form, {});

    const botao = form.querySelector('button[type="submit"]');
    const textoBotao = botao.textContent;
    botao.disabled = true; botao.textContent = "Salvando…";
    const resultado = await executar("Não foi possível salvar", async () => {
      // Primeiro os arquivos: se algum envio falhar, o registro não é gravado
      const codigoAlvo = modo === "novo" ? RT.repositorio.proximoCodigo(ent) : codigo;
      const pendentes = camposAnexo.reduce((n, c) => n + (T().estado.anexosPendentes[c.nome] || []).length, 0);
      let enviados = 0;
      for (const c of camposAnexo) {
        const lista = [];
        for (const a of dados[c.nome]) {
          if (!a._arquivo) { lista.push(a); continue; }
          enviados++;
          botao.textContent = `Enviando arquivo ${enviados} de ${pendentes}…`;
          lista.push(await RT.repositorio.enviarArquivo(ent, codigoAlvo, a._arquivo, usuario(), a.versao,
            p => { botao.textContent = `Enviando arquivo ${enviados} de ${pendentes} (${p}%)…`; }));
        }
        dados[c.nome] = lista;
      }
      botao.textContent = "Salvando…";
      if (modo === "novo") return RT.repositorio.criar(ent, dados, usuario(), { codigo: codigoAlvo });
      if (modo === "nova-versao") return { registro: await RT.repositorio.novaVersaoDecisao(registro, dados, usuario()) };
      return RT.repositorio.atualizar(ent, registro, dados, usuario());
    });
    botao.disabled = false; botao.textContent = textoBotao;
    if (!resultado) return;
    T().estado.anexosPendentes = {};
    if (ent === "usuarios" && usuario().email === resultado.registro.email && !RT.config.modoSharePoint) definirUsuario(resultado.registro);
    U.toast(resultado.aviso || (modo === "novo" ? `${resultado.registro.codigo} cadastrado.` : "Alterações salvas."));
    ir(U.rotaRegistro(ent, resultado.registro.codigo));
  }

  // ---------- Quadro (arrastar e soltar) ----------
  async function moverCartao(codigo, status) {
    const reg = RT.repositorio.obter("atividades", codigo);
    if (!reg || reg.status === status) return;
    if (!RT.regras.pode(usuario(), "editar", "atividades", reg)) { U.toast("Seu perfil não permite alterar esta ação.", "erro"); return; }
    const mudancas = { status };
    if ((status === "Bloqueada" || status === "Cancelada") && !reg.riscos) {
      const r = await U.modal({
        titulo: `${status === "Bloqueada" ? "Bloquear" : "Cancelar"} ${reg.codigo}`,
        campos: [{ nome: "motivo", rotulo: status === "Bloqueada" ? "O que está bloqueando a ação?" : "Motivo do cancelamento", tipo: "textoLongo", obrigatorio: true }],
        confirmar: "Confirmar"
      });
      if (!r) return;
      mudancas.riscos = r.motivo;
    }
    if (status === "Concluída") mudancas.dataConclusao = RT.regras.hojeISO();
    await executar("Não foi possível mover", async () => {
      await RT.repositorio.atualizar("atividades", reg, mudancas, usuario());
      U.toast(`${reg.codigo} movida para ${status}.`);
      render();
    });
  }

  // ---------- Eventos ----------
  function ligarEventos() {
    window.addEventListener("hashchange", render);

    document.addEventListener("click", ev => {
      const el = ev.target.closest("[data-acao]");
      if (!el || el.tagName === "INPUT") return;
      const fn = acoes[el.dataset.acao];
      if (fn) { ev.preventDefault(); fn(el, ev); }
    });

    document.addEventListener("input", ev => {
      const el = ev.target;
      if (el.dataset.filtro === "busca") {
        T().filtrosDe(el.dataset.ent).busca = el.value;
        T().atualizarLista(el.dataset.ent);
      }
    });

    document.addEventListener("change", ev => {
      const el = ev.target;
      if (el.dataset.filtro) {
        const f = T().filtrosDe(el.dataset.ent);
        if (el.dataset.filtro === "campo") f.campos[el.dataset.campo] = el.value;
        if (el.dataset.filtro === "de") f.de = el.value;
        if (el.dataset.filtro === "ate") f.ate = el.value;
        if (el.dataset.filtro === "arquivados") f.arquivados = el.checked;
        if (el.dataset.filtro !== "busca") render();
        const mesmo = document.getElementById(el.id);
        if (mesmo) mesmo.focus();
      }
      if (el.dataset.acao === "decisoes-historico") { T().estado.decisoes.historico = el.checked; render(); }
      if (el.dataset.filtroRel) {
        T().filtrosDoRelatorio(RT.relatorios.def(el.dataset.filtroRel))[el.dataset.campo] = el.value;
        render();
        const mesmo = document.getElementById(el.id);
        if (mesmo) mesmo.focus();
      }
      if (el.dataset.anexos) aoEscolherArquivos(el);
      if (el.id === "seletor-usuario") {
        const u = RT.repositorio.listar("usuarios").find(x => x.email === el.value);
        if (u) { definirUsuario(u); render(); U.toast(`Agora você vê o portal como ${u.nome} (${u.perfil}).`); }
      }
    });

    document.addEventListener("submit", ev => {
      const form = ev.target;
      if (form.dataset.form) { ev.preventDefault(); salvarFormulario(form); }
      if (form.id === "form-busca") {
        ev.preventDefault();
        const q = document.getElementById("busca-global").value.trim();
        if (q) ir(`#busca?q=${encodeURIComponent(q)}`);
      }
    });

    // Arrastar e soltar no quadro
    let arrastando = null;
    document.addEventListener("dragstart", ev => {
      const card = ev.target.closest && ev.target.closest(".kcard[data-codigo]");
      if (!card) return;
      arrastando = card.dataset.codigo;
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", arrastando);
      card.classList.add("arrastando");
    });
    document.addEventListener("dragend", ev => {
      const card = ev.target.closest && ev.target.closest(".kcard");
      if (card) card.classList.remove("arrastando");
      document.querySelectorAll(".kcoluna.alvo").forEach(c => c.classList.remove("alvo"));
      arrastando = null;
    });
    document.addEventListener("dragover", ev => {
      const col = ev.target.closest && ev.target.closest(".kcoluna");
      if (!col || !arrastando) return;
      ev.preventDefault();
      document.querySelectorAll(".kcoluna.alvo").forEach(c => { if (c !== col) c.classList.remove("alvo"); });
      col.classList.add("alvo");
    });
    document.addEventListener("drop", ev => {
      const col = ev.target.closest && ev.target.closest(".kcoluna");
      if (!col || !arrastando) return;
      ev.preventDefault();
      const codigo = arrastando;
      arrastando = null;
      col.classList.remove("alvo");
      moverCartao(codigo, col.dataset.status);
    });
  }

  // ---------- Sessão por inatividade (modo SharePoint) ----------
  function controlarSessao() {
    const limite = (RT.config.sessaoMinutos || 30) * 60000;
    let ultimo = Date.now();
    const marcar = () => { ultimo = Date.now(); };
    ["click", "keydown", "scroll", "pointermove"].forEach(ev => document.addEventListener(ev, marcar, { passive: true }));
    const verificar = setInterval(async () => {
      if (Date.now() - ultimo < limite) return;
      clearInterval(verificar);
      sessaoEncerrada = true;
      RT.repositorio.descartar();
      await RT.auth.encerrarLocal();
      conteudo().innerHTML = `<div class="login"><div class="bloco login-caixa">
        <h1>Sessão encerrada</h1>
        <p>Por segurança, a sessão foi encerrada depois de ${RT.config.sessaoMinutos} minutos sem uso. Os dados carregados foram descartados desta aba.</p>
        <button type="button" class="botao primario" data-acao="recarregar">Entrar de novo</button>
      </div></div>`;
      document.getElementById("usuario").innerHTML = "";
    }, 30000);
    acoes["recarregar"] = () => location.reload();
  }

  // ---------- Inicialização ----------
  function carregarScript(src) {
    return new Promise((ok, falha) => {
      const s = document.createElement("script");
      s.src = src; s.crossOrigin = "anonymous";
      s.onload = ok; s.onerror = () => falha(new Error(`Não foi possível carregar ${src}`));
      document.head.appendChild(s);
    });
  }

  function telaLogin() {
    conteudo().innerHTML = `<div class="login"><div class="bloco login-caixa">
      <h1>${U.esc(RT.config.nomePortal)}</h1>
      <p>Entre com sua conta corporativa para acessar os dados do projeto.</p>
      <button type="button" class="botao primario" data-acao="entrar">Entrar com a conta corporativa</button>
    </div></div>`;
  }

  function mostrarFaixaModo() {
    const faixa = document.getElementById("faixa-modo");
    if (RT.config.modoSharePoint) {
      faixa.hidden = true;
      return;
    }
    faixa.hidden = false;
    faixa.innerHTML = `<strong>Modo demonstração.</strong> Os registros são fictícios e ficam só nesta página: o que você cadastrar some ao recarregar. Use “Simular acesso como” para testar os perfis.`;
  }

  function aplicarIdentidade() {
    const c = RT.config;
    document.querySelector(".marca-nome").textContent = c.nomePortal;
    const img = document.querySelector(".marca-logo img");
    if (c.logo) img.src = c.logo;
    img.alt = c.logoTextoAlternativo || c.nomePortal;
  }

  async function iniciar() {
    aplicarIdentidade();
    ligarEventos();
    mostrarFaixaModo();
    try {
      if (RT.config.modoSharePoint) {
        await carregarScript(MSAL_URL);
        const conta = await RT.auth.iniciar();
        if (!conta) { telaLogin(); return; }
        progresso("Carregando dados do SharePoint…");
        await RT.repositorio.iniciar(new RT.AdaptadorSharePoint(RT.config, RT.auth.token));
        progresso("");
        definirUsuario(identificarUsuario(conta));
        if (location.hash.includes("code=")) history.replaceState(null, "", location.pathname);
        controlarSessao();
      } else {
        await RT.repositorio.iniciar(new RT.AdaptadorMemoria());
        await RT.repositorio.carregarDemonstracao(null);
        definirUsuario(RT.repositorio.listar("usuarios").find(u => u.perfil === "Gestor"));
      }
    } catch (e) {
      console.error(e);
      progresso("");
      conteudo().innerHTML = `<div class="aviso erro"><p><strong>Não foi possível iniciar o portal.</strong> ${U.esc(e.message)}</p></div>`;
      return;
    }
    render();
  }

  return { iniciar, render, ir, identificarUsuario, controlarSessao };
})();

document.addEventListener("DOMContentLoaded", RT.app.iniciar);
