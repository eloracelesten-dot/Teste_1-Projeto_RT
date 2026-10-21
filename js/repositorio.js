/*
 * Camada de dados.
 *
 * As telas falam só com RT.repositorio. Ele guarda os registros em cache e delega a gravação
 * a um adaptador:
 *   - AdaptadorMemoria: modo demonstração, nada é gravado fora da página;
 *   - AdaptadorSharePoint: listas do SharePoint, via Microsoft Graph, com o token do usuário.
 * Toda criação, edição, aprovação e arquivamento gera um registro no histórico.
 */
window.RT = window.RT || {};

// ---------------------------------------------------------------------------
// Adaptador em memória
// ---------------------------------------------------------------------------
RT.AdaptadorMemoria = class {
  constructor() {
    this.nome = "Demonstração em memória";
    this.persistente = false;
    this.arquivos = new Map(); // id -> File, só enquanto a página estiver aberta
  }
  async enviarArquivo(entidade, codigo, arquivo) {
    const id = "mem-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.arquivos.set(id, arquivo);
    return { arquivoId: id, webUrl: "" };
  }
  async baixarArquivo(anexo) {
    const arquivo = this.arquivos.get(anexo.arquivoId);
    if (!arquivo) throw new Error("Este anexo é um registro de demonstração e não tem arquivo guardado.");
    return arquivo;
  }
  async carregarTudo() {
    const vazio = {};
    for (const ent of Object.keys(RT.esquema)) vazio[ent] = [];
    return vazio;
  }
  async inserir(entidade, registro) { return Object.assign({}, registro); }
  async alterar(entidade, registro, mudancas) { return Object.assign({}, registro, mudancas); }
  async excluir() { }
};

// ---------------------------------------------------------------------------
// Adaptador SharePoint (Microsoft Graph)
// ---------------------------------------------------------------------------
RT.ErroConflito = class extends Error { };

RT.AdaptadorSharePoint = class {
  constructor(config, obterToken) {
    this.nome = "SharePoint";
    this.persistente = true;
    this.config = config;
    this.obterToken = obterToken;
    this.siteId = null;
    this.listas = null; // displayName -> id
  }

  async graph(metodo, caminho, corpo, cabecalhos, escopos) {
    const url = caminho.startsWith("https://") ? caminho : "https://graph.microsoft.com/v1.0" + caminho;
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      const token = await this.obterToken(escopos);
      const resp = await fetch(url, {
        method: metodo,
        headers: Object.assign({ Authorization: "Bearer " + token, "Content-Type": "application/json", Accept: "application/json" }, cabecalhos || {}),
        body: corpo ? JSON.stringify(corpo) : undefined
      });
      if (resp.status === 429 || resp.status === 503) {
        const espera = Number(resp.headers.get("Retry-After") || 2 ** tentativa);
        await new Promise(r => setTimeout(r, espera * 1000));
        continue;
      }
      if (resp.status === 204) return null;
      const json = await resp.json().catch(() => null);
      if (resp.status === 412) throw new RT.ErroConflito("Outra pessoa alterou este registro depois que você o abriu. Recarregue a página e repita a alteração.");
      if (!resp.ok) {
        const msg = json && json.error ? json.error.message : resp.statusText;
        throw new Error(`SharePoint respondeu ${resp.status}: ${msg}`);
      }
      return json;
    }
    throw new Error("O SharePoint está limitando as requisições. Tente de novo em alguns minutos.");
  }

  nomeLista(entidade) { return this.config.prefixoListas + RT.esquema[entidade].lista; }
  nomeBiblioteca() { return this.config.prefixoListas + this.config.bibliotecaDocumentos; }

  async graphBinario(metodo, caminho, arquivo) {
    const token = await this.obterToken();
    const resp = await fetch("https://graph.microsoft.com/v1.0" + caminho, {
      method: metodo,
      headers: { Authorization: "Bearer " + token, "Content-Type": arquivo.type || "application/octet-stream" },
      body: arquivo
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error(`SharePoint respondeu ${resp.status}: ${json && json.error ? json.error.message : resp.statusText}`);
    return json;
  }

  async driveId() {
    if (this._drive) return this._drive;
    const site = await this.site();
    const mapa = await this.mapaListas();
    const lista = mapa[this.nomeBiblioteca()];
    if (!lista) throw new Error(`A biblioteca ${this.nomeBiblioteca()} não existe no site. Um administrador precisa criá-la em Administração.`);
    const d = await this.graph("GET", `/sites/${site}/lists/${lista}/drive?$select=id`);
    this._drive = d.id;
    return d.id;
  }

  // Cada envio vira um arquivo próprio, em /<módulo>/<código>/, com data e hora no nome.
  // Assim versões antigas nunca são sobrescritas pelo portal.
  async enviarArquivo(entidade, codigo, arquivo, aoProgredir) {
    const drive = await this.driveId();
    const carimbo = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
    const caminho = [RT.esquema[entidade].lista, RT.regras.nomeSeguro(codigo), `${carimbo}_${RT.regras.nomeSeguro(arquivo.name)}`]
      .map(encodeURIComponent).join("/");
    let item;
    if (arquivo.size <= 4 * 1024 * 1024) {
      item = await this.graphBinario("PUT", `/drives/${drive}/root:/${caminho}:/content?@microsoft.graph.conflictBehavior=fail`, arquivo);
    } else {
      const sessao = await this.graph("POST", `/drives/${drive}/root:/${caminho}:/createUploadSession`, { item: { "@microsoft.graph.conflictBehavior": "fail" } });
      const bloco = 320 * 1024 * 10; // múltiplo de 320 KiB, como o Graph exige
      for (let ini = 0; ini < arquivo.size; ini += bloco) {
        const fim = Math.min(ini + bloco, arquivo.size);
        // A URL da sessão já é autorizada: não leva o token
        const resp = await fetch(sessao.uploadUrl, { method: "PUT", headers: { "Content-Range": `bytes ${ini}-${fim - 1}/${arquivo.size}` }, body: arquivo.slice(ini, fim) });
        if (!resp.ok) throw new Error(`O envio de ${arquivo.name} falhou (${resp.status}).`);
        if (aoProgredir) aoProgredir(Math.round((fim / arquivo.size) * 100));
        if (resp.status === 200 || resp.status === 201) item = await resp.json();
      }
    }
    return { arquivoId: item.id, webUrl: item.webUrl || "", driveId: drive };
  }

  async baixarArquivo(anexo) {
    if (!anexo.arquivoId) throw new Error("Este anexo é um registro de demonstração e não tem arquivo guardado.");
    const drive = anexo.driveId || await this.driveId();
    const item = await this.graph("GET", `/drives/${drive}/items/${anexo.arquivoId}?$select=id,name,@microsoft.graph.downloadUrl`);
    const resp = await fetch(item["@microsoft.graph.downloadUrl"]);
    if (!resp.ok) throw new Error(`Não foi possível baixar o arquivo (${resp.status}).`);
    return resp.blob();
  }

  async site() {
    if (this.siteId) return this.siteId;
    const u = new URL(this.config.siteUrl);
    const caminho = u.pathname.replace(/\/$/, "");
    const site = await this.graph("GET", `/sites/${u.hostname}:${caminho}`);
    this.siteId = site.id;
    return this.siteId;
  }

  async mapaListas(recarregar) {
    if (this.listas && !recarregar) return this.listas;
    const site = await this.site();
    const mapa = {};
    let proxima = `/sites/${site}/lists?$select=id,displayName&$top=999`;
    while (proxima) {
      const r = await this.graph("GET", proxima);
      r.value.forEach(l => { mapa[l.displayName] = l.id; });
      proxima = r["@odata.nextLink"];
    }
    this.listas = mapa;
    return mapa;
  }

  // Devolve os nomes das listas e da biblioteca que ainda não existem no site
  async verificarListas() {
    const mapa = await this.mapaListas(true);
    const faltando = Object.keys(RT.esquema).map(ent => this.nomeLista(ent)).filter(n => !mapa[n]);
    if (!mapa[this.nomeBiblioteca()]) faltando.push(this.nomeBiblioteca());
    return faltando;
  }

  definicaoColuna(campo) {
    const base = { name: campo.nome, displayName: campo.rotulo || campo.nome };
    switch (campo.tipo) {
      case "numero": return Object.assign(base, { number: {} });
      case "booleano": return Object.assign(base, { boolean: {} });
      case "opcao": return Object.assign(base, { choice: { choices: campo.opcoes, allowTextEntry: true, displayAs: "dropDownMenu" } });
      case "textoLongo": case "refs": case "multiOpcao": case "anexos":
        return Object.assign(base, { text: { allowMultipleLines: true, linesForEditing: 6 } });
      default: return Object.assign(base, { text: {} });
    }
  }

  async criarListas(aoProgredir) {
    const faltando = await this.verificarListas();
    const site = await this.site();
    for (const nome of faltando) {
      if (aoProgredir) aoProgredir(`Criando ${nome}…`);
      if (nome === this.nomeBiblioteca()) {
        await this.graph("POST", `/sites/${site}/lists`, { displayName: nome, list: { template: "documentLibrary" } }, null, ["Sites.Manage.All"]);
        continue;
      }
      const ent = Object.keys(RT.esquema).find(e => this.nomeLista(e) === nome);
      const colunas = RT.esquema[ent].campos.filter(c => c.nome !== "codigo").map(c => this.definicaoColuna(c));
      await this.graph("POST", `/sites/${site}/lists`, {
        displayName: nome,
        columns: colunas,
        list: { template: "genericList" }
      }, null, ["Sites.Manage.All"]);
    }
    await this.mapaListas(true);
    return faltando;
  }

  paraRegistro(entidade, item) {
    const f = item.fields || {};
    // Autoria informada pelo SharePoint (não pode ser alterada pelo navegador)
    const autor = item.createdBy && item.createdBy.user ? (item.createdBy.user.email || item.createdBy.user.displayName || "") : "";
    const reg = {
      id: "sp" + item.id, _spId: item.id, _etag: item.eTag || f["@odata.etag"], codigo: f.Title || "",
      _autorServidor: autor, _criadoEmServidor: item.createdDateTime || ""
    };
    for (const c of RT.esquema[entidade].campos) {
      if (c.nome === "codigo") continue;
      const v = f[c.nome];
      if (["refs", "multiOpcao", "anexos"].includes(c.tipo)) {
        try { reg[c.nome] = v ? JSON.parse(v) : []; } catch (e) { reg[c.nome] = []; }
      } else if (c.tipo === "booleano") reg[c.nome] = Boolean(v);
      else if (c.tipo === "numero") reg[c.nome] = v === undefined || v === null ? "" : Number(v);
      else reg[c.nome] = v === undefined || v === null ? "" : String(v);
    }
    return reg;
  }

  paraCampos(entidade, dados) {
    const campos = {};
    if ("codigo" in dados) campos.Title = dados.codigo || "-";
    for (const c of RT.esquema[entidade].campos) {
      if (c.nome === "codigo" || !(c.nome in dados)) continue;
      const v = dados[c.nome];
      if (["refs", "multiOpcao", "anexos"].includes(c.tipo)) campos[c.nome] = JSON.stringify(v || []);
      else if (c.tipo === "booleano") campos[c.nome] = Boolean(v);
      else if (c.tipo === "numero") { if (v !== "" && v !== null && v !== undefined) campos[c.nome] = Number(v); }
      else campos[c.nome] = v === null || v === undefined ? "" : String(v);
    }
    return campos;
  }

  async carregarTudo() {
    const mapa = await this.mapaListas(true);
    const site = await this.site();
    const resultado = {};
    for (const ent of Object.keys(RT.esquema)) {
      resultado[ent] = [];
      const listaId = mapa[this.nomeLista(ent)];
      if (!listaId) continue;
      let proxima = `/sites/${site}/lists/${listaId}/items?expand=fields&$top=500`;
      while (proxima) {
        const r = await this.graph("GET", proxima);
        r.value.forEach(item => resultado[ent].push(this.paraRegistro(ent, item)));
        proxima = r["@odata.nextLink"];
      }
    }
    return resultado;
  }

  async listaId(entidade) {
    const mapa = await this.mapaListas();
    const id = mapa[this.nomeLista(entidade)];
    if (!id) throw new Error(`A lista ${this.nomeLista(entidade)} não existe no site. Um administrador precisa criá-la em Administração.`);
    return id;
  }

  async inserir(entidade, registro) {
    const site = await this.site();
    const lista = await this.listaId(entidade);
    const item = await this.graph("POST", `/sites/${site}/lists/${lista}/items`, { fields: this.paraCampos(entidade, registro) });
    const autor = item.createdBy && item.createdBy.user ? (item.createdBy.user.email || item.createdBy.user.displayName || "") : "";
    return Object.assign({}, registro, { id: "sp" + item.id, _spId: item.id, _etag: item.eTag, _autorServidor: autor, _criadoEmServidor: item.createdDateTime || "" });
  }

  async alterar(entidade, registro, mudancas) {
    const site = await this.site();
    const lista = await this.listaId(entidade);
    const cab = registro._etag ? { "If-Match": registro._etag } : null;
    const r = await this.graph("PATCH", `/sites/${site}/lists/${lista}/items/${registro._spId}/fields`, this.paraCampos(entidade, mudancas), cab);
    return Object.assign({}, registro, mudancas, { _etag: (r && r["@odata.etag"]) || registro._etag });
  }

  async excluir(entidade, registro) {
    const site = await this.site();
    const lista = await this.listaId(entidade);
    await this.graph("DELETE", `/sites/${site}/lists/${lista}/items/${registro._spId}`);
  }
};

// ---------------------------------------------------------------------------
// Repositório
// ---------------------------------------------------------------------------
RT.repositorio = (function () {
  let adaptador = null;
  let cache = {};
  const R = () => RT.regras;

  const copia = v => JSON.parse(JSON.stringify(v));
  const uid = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  async function iniciar(novoAdaptador) {
    adaptador = novoAdaptador;
    cache = await adaptador.carregarTudo();
  }

  // Apaga da memória da aba todos os registros carregados (fim de sessão)
  function descartar() {
    for (const ent of Object.keys(cache)) cache[ent] = [];
  }

  function info() { return { nome: adaptador ? adaptador.nome : "", persistente: adaptador ? adaptador.persistente : false }; }
  function adaptadorAtual() { return adaptador; }

  function listar(entidade, opcoes) {
    const todos = cache[entidade] || [];
    if (opcoes && opcoes.incluirArquivados) return todos;
    return todos.filter(r => !r.arquivado);
  }

  // Para decisões, o código aponta para a versão vigente (ou a mais recente)
  function obter(entidade, codigo) {
    const achados = (cache[entidade] || []).filter(r => r.codigo === codigo);
    if (!achados.length) return null;
    if (RT.esquema[entidade].versionada) {
      return achados.find(r => r.situacao === "Vigente") || achados.sort((a, b) => b.versao - a.versao)[0];
    }
    return achados[0];
  }
  function obterPorId(entidade, id) { return (cache[entidade] || []).find(r => r.id === id) || null; }
  function versoes(entidade, codigo) {
    return (cache[entidade] || []).filter(r => r.codigo === codigo).sort((a, b) => b.versao - a.versao);
  }

  function proximoCodigo(entidade) {
    const ent = RT.esquema[entidade];
    let maior = 0;
    for (const r of cache[entidade] || []) {
      const m = /-(\d+)$/.exec(r.codigo || "");
      if (m) maior = Math.max(maior, Number(m[1]));
    }
    return `${ent.prefixo}-${String(maior + 1).padStart(3, "0")}`;
  }

  // Quem referencia este registro (vínculos no sentido inverso)
  function referenciadoPor(entidade, codigo) {
    const resultado = [];
    for (const [nomeEnt, ent] of Object.entries(RT.esquema)) {
      if (ent.interno) continue;
      for (const c of ent.campos) {
        if ((c.tipo !== "ref" && c.tipo !== "refs") || c.entidade !== entidade) continue;
        for (const r of listar(nomeEnt)) {
          if (ent.versionada && r.situacao !== "Vigente") continue;
          const v = r[c.nome];
          if (v === codigo || (Array.isArray(v) && v.includes(codigo))) resultado.push({ entidade: nomeEnt, campo: c, registro: r });
        }
      }
    }
    return resultado;
  }

  function historicoDe(entidade, codigo) {
    return (cache.historico || []).filter(h => h.entidade === entidade && h.ref === codigo).sort((a, b) => b.data.localeCompare(a.data));
  }

  function diferencas(entidade, antes, depois) {
    const ent = RT.esquema[entidade];
    const mud = [];
    for (const c of ent.campos) {
      if (c.sistema || !(c.nome in depois)) continue;
      const a = JSON.stringify(antes[c.nome] === undefined ? "" : antes[c.nome]);
      const d = JSON.stringify(depois[c.nome] === undefined ? "" : depois[c.nome]);
      if (a !== d) mud.push({ campo: c.rotulo, de: antes[c.nome], para: depois[c.nome] });
    }
    return mud;
  }

  async function registrarHistorico(entidade, ref, acao, usuario, detalhes) {
    const h = {
      id: uid(), codigo: "", entidade, ref, acao, usuario: usuario.nome, data: R().agoraISO(),
      detalhes: detalhes ? JSON.stringify(detalhes) : "", demonstracao: false, arquivado: false,
      criadoPor: usuario.nome, criadoEm: R().agoraISO(), atualizadoPor: "", atualizadoEm: ""
    };
    const gravado = await adaptador.inserir("historico", h);
    cache.historico.push(gravado);
  }

  function limpar(entidade, dados) {
    const ent = RT.esquema[entidade];
    const r = {};
    for (const c of ent.campos) if (c.nome in dados) r[c.nome] = dados[c.nome];
    return r;
  }

  async function criar(entidade, dados, usuario, opcoes) {
    opcoes = opcoes || {};
    const ent = RT.esquema[entidade];
    const base = R().aoSalvar(entidade, dados, null);
    const aviso = base._aviso;
    const agora = R().agoraISO();
    const registro = Object.assign(limpar(entidade, base), {
      id: uid(),
      codigo: opcoes.codigo || proximoCodigo(entidade),
      arquivado: false, motivoArquivamento: "", demonstracao: Boolean(opcoes.demonstracao),
      criadoPor: usuario.nome, criadoEm: agora, atualizadoPor: usuario.nome, atualizadoEm: agora
    });
    if (ent.versionada && !registro.versao) { registro.versao = 1; registro.situacao = "Vigente"; }
    const gravado = await adaptador.inserir(entidade, registro);
    cache[entidade].push(gravado);
    if (!opcoes.semHistorico) await registrarHistorico(entidade, gravado.codigo, opcoes.acao || "Registro criado", usuario);
    return { registro: gravado, aviso };
  }

  async function atualizar(entidade, registro, mudancas, usuario, acao) {
    const base = R().aoSalvar(entidade, Object.assign({}, registro, mudancas), registro);
    const aviso = base._aviso;
    const novos = limpar(entidade, base);
    const diff = diferencas(entidade, registro, novos);
    const sistemaMudou = Object.keys(novos).some(k => {
      const c = RT.esquema[entidade].campo(k);
      return c && c.sistema && JSON.stringify(novos[k]) !== JSON.stringify(registro[k]);
    });
    if (!diff.length && !sistemaMudou) return { registro, aviso: "Nada foi alterado." };

    const somenteMudancas = {};
    for (const k of Object.keys(novos)) if (JSON.stringify(novos[k]) !== JSON.stringify(registro[k])) somenteMudancas[k] = novos[k];
    somenteMudancas.atualizadoPor = usuario.nome;
    somenteMudancas.atualizadoEm = R().agoraISO();

    const gravado = await adaptador.alterar(entidade, registro, somenteMudancas);
    const i = cache[entidade].findIndex(r => r.id === registro.id);
    cache[entidade][i] = gravado;

    let texto = acao;
    if (!texto) {
      const st = diff.find(d => d.campo === "Status" || d.campo === "Status da análise" || d.campo === "Status da adequação" || d.campo === "Status da implementação" || d.campo === "Status da avaliação interna");
      texto = st ? `Status alterado para ${st.para}` : "Registro editado";
    }
    await registrarHistorico(entidade, gravado.codigo, texto, usuario, diff);
    return { registro: gravado, aviso };
  }

  async function arquivar(entidade, registro, motivo, usuario) {
    return atualizar(entidade, registro, { arquivado: true, motivoArquivamento: motivo }, usuario, `Arquivado: ${motivo}`);
  }
  async function restaurar(entidade, registro, usuario) {
    return atualizar(entidade, registro, { arquivado: false, motivoArquivamento: "" }, usuario, "Restaurado do arquivo");
  }

  async function aprovarParecer(registro, usuario) {
    if (!R().pode(usuario, "aprovar", "pareceres", registro)) throw new Error("Somente um gestor pode aprovar pareceres.");
    if (registro.status !== "Análise concluída") throw new Error("Só é possível aprovar um parecer com a análise concluída.");
    return atualizar("pareceres", registro, { status: "Aprovado internamente", aprovadoPor: usuario.nome, aprovadoEm: R().agoraISO() }, usuario, "Aprovado internamente");
  }

  async function novaVersaoDecisao(anterior, dados, usuario) {
    const agora = R().agoraISO();
    const { registro } = await criar("decisoes", Object.assign({}, dados, {
      versao: (versoes("decisoes", anterior.codigo)[0].versao || 1) + 1, situacao: "Vigente"
    }), usuario, { codigo: anterior.codigo, semHistorico: true });
    await atualizar("decisoes", anterior, { situacao: "Substituída", situacaoEm: agora }, usuario,
      `Nova versão registrada (v${registro.versao}). A versão ${anterior.versao} passou a Substituída`);
    return registro;
  }

  async function revogarDecisao(registro, motivo, usuario) {
    return atualizar("decisoes", registro, { situacao: "Revogada", motivoRevogacao: motivo, situacaoEm: R().agoraISO() }, usuario, `Revogada: ${motivo}`);
  }

  // ---------- Dados de demonstração ----------
  function contarDemonstracao() {
    let n = 0;
    for (const ent of Object.keys(cache)) n += cache[ent].filter(r => r.demonstracao).length;
    return n;
  }

  async function carregarDemonstracao(usuario, aoProgredir) {
    const dados = RT.dadosDemo();
    const agora = R().agoraISO();
    for (const [ent, registros] of Object.entries(dados)) {
      for (const r of registros) {
        if (ent === "usuarios" && (cache.usuarios || []).some(x => x.email.toLowerCase() === r.email.toLowerCase())) continue;
        if (ent !== "historico" && r.codigo && (cache[ent] || []).some(x => x.codigo === r.codigo && (x.versao || 1) === (r.versao || 1))) continue;
        const registro = Object.assign({
          id: uid(), arquivado: false, motivoArquivamento: "", demonstracao: true,
          criadoPor: "Carga de demonstração", criadoEm: agora, atualizadoPor: "", atualizadoEm: ""
        }, copia(r));
        if (ent === "historico") registro.codigo = "";
        else if (!registro.codigo) registro.codigo = proximoCodigo(ent);
        if (aoProgredir) aoProgredir(`${RT.esquema[ent].rotulo}: ${r.codigo || r.ref}`);
        const gravado = await adaptador.inserir(ent, registro);
        cache[ent].push(gravado);
      }
    }
    if (usuario) await registrarHistorico("usuarios", "-", "Dados de demonstração carregados", usuario);
  }

  async function removerDemonstracao(usuario, aoProgredir) {
    if (!R().pode(usuario, "removerDemonstracao")) throw new Error("Somente administradores removem dados de demonstração.");
    let removidos = 0;
    for (const ent of Object.keys(cache)) {
      for (const r of cache[ent].filter(x => x.demonstracao)) {
        if (aoProgredir) aoProgredir(`Removendo ${r.codigo || ent}…`);
        await adaptador.excluir(ent, r);
        removidos++;
      }
      cache[ent] = cache[ent].filter(x => !x.demonstracao);
    }
    await registrarHistorico("usuarios", "-", `Dados de demonstração removidos (${removidos} registros)`, usuario);
    return removidos;
  }

  function todos() {
    const r = {};
    for (const ent of Object.keys(cache)) r[ent] = cache[ent];
    return r;
  }

  // Códigos usados por mais de um registro (pode acontecer com cadastros simultâneos)
  function codigosRepetidos() {
    const repetidos = [];
    for (const [ent, e] of Object.entries(RT.esquema)) {
      if (e.interno) continue;
      const vistos = new Map();
      for (const r of cache[ent] || []) {
        const chave = `${r.codigo}#${e.versionada ? r.versao : 1}`;
        vistos.set(chave, (vistos.get(chave) || 0) + 1);
      }
      for (const [chave, n] of vistos) if (n > 1) repetidos.push(`${chave.split("#")[0]} (${e.rotulo})`);
    }
    return repetidos;
  }

  async function enviarArquivo(entidade, codigo, arquivo, usuario, versao, aoProgredir) {
    const hash = await RT.regras.hashArquivo(arquivo);
    const ref = await adaptador.enviarArquivo(entidade, codigo, arquivo, aoProgredir);
    return Object.assign({
      nome: arquivo.name, tamanho: arquivo.size, tipo: arquivo.type || "", versao,
      enviadoPor: usuario.nome, enviadoEm: R().agoraISO(), sha256: hash
    }, ref);
  }

  function baixarArquivo(anexo) { return adaptador.baixarArquivo(anexo); }

  return {
    iniciar, descartar, info, adaptadorAtual, listar, obter, obterPorId, versoes, proximoCodigo, referenciadoPor, historicoDe,
    codigosRepetidos, enviarArquivo, baixarArquivo, registrarAcesso: registrarHistorico,
    criar, atualizar, arquivar, restaurar, aprovarParecer, novaVersaoDecisao, revogarDecisao,
    contarDemonstracao, carregarDemonstracao, removerDemonstracao, todos
  };
})();
