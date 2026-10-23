/*
 * Pareceres a partir de uma pasta de documentos.
 *
 * Lista os arquivos da pasta configurada (SharePoint, Teams ou OneDrive) ou escolhidos no
 * computador, mostra quais ainda não viraram parecer e cadastra os selecionados: o documento
 * é copiado para a biblioteca do portal e o parecer guarda o link do original.
 * Título e data são sugeridos pelo arquivo; o restante é preenchido por quem cadastra.
 * Nada do conteúdo do documento é interpretado ou resumido automaticamente.
 */
window.RT = window.RT || {};

RT.pasta = (function () {
  const U = RT.ui;
  const { esc, fmtData, fmtTamanho } = U;
  const repo = () => RT.repositorio;
  const R = () => RT.regras;
  const CAMPOS_EDITAVEIS = ["titulo", "tipo", "categoria", "origem", "area", "dataRecebimento", "descricao"];

  const estado = () => RT.telas.estado.pasta || (RT.telas.estado.pasta = { arquivos: null, locais: [], selecionados: {}, linhas: {}, erros: {}, comum: {} });

  function extensao(nome) { return (String(nome).split(".").pop() || "").toLowerCase(); }
  const aceito = nome => RT.listas.extensoesAnexo.includes(extensao(nome));

  // Arquivos que já viraram parecer, pelo identificador do original guardado no anexo
  function jaCadastrados() {
    const mapa = new Map();
    for (const p of repo().listar("pareceres", { incluirArquivados: true })) {
      for (const a of p.anexos || []) if (a.origemId) mapa.set(a.origemId, p.codigo);
    }
    return mapa;
  }

  function sugestao(item) {
    const titulo = item.nome.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 255);
    return {
      titulo,
      tipo: extensao(item.nome) === "pptx" ? "Apresentação" : "",
      categoria: "", origem: "", area: "", descricao: "",
      dataRecebimento: item.data ? String(item.data).slice(0, 10) : R().hojeISO(),
      status: "Recebido", unidades: [], anexos: []
    };
  }

  function todosOsItens() {
    const st = estado();
    return (st.arquivos || []).concat(st.locais);
  }

  // ---------- Fontes ----------
  async function carregarPasta() {
    const st = estado();
    const adaptador = repo().adaptadorAtual();
    if (!adaptador.listarPasta) throw new Error("A leitura da pasta do SharePoint só funciona com o portal ligado ao SharePoint.");
    if (!RT.config.pastaPareceres) throw new Error("Nenhuma pasta configurada: preencha pastaPareceres em js/config.js.");
    const r = await adaptador.listarPasta(RT.config.pastaPareceres, RT.config.pastaIncluirSubpastas);
    st.raiz = r.raiz;
    st.truncado = r.truncado;
    st.arquivos = r.arquivos.map(a => Object.assign({}, a, {
      fonte: "pasta", data: a.criadoEm, obter: () => adaptador.baixarItemDaPasta(a)
    }));
  }

  function adicionarLocais(files) {
    const st = estado();
    for (const f of files) {
      const origemId = `local:${f.name}:${f.size}:${f.lastModified}`;
      if (st.locais.some(x => x.origemId === origemId)) continue;
      st.locais.push({
        origemId, nome: f.name, tamanho: f.size, caminho: "", fonte: "computador",
        data: f.lastModified ? R().isoLocal(new Date(f.lastModified)) : "", autor: "", webUrl: "", obter: async () => f
      });
    }
  }

  function selecionar(origemId, marcado) {
    const st = estado();
    const item = todosOsItens().find(i => i.origemId === origemId);
    if (!item) return;
    if (marcado) {
      st.selecionados[origemId] = true;
      if (!st.linhas[origemId]) st.linhas[origemId] = sugestao(item);
    } else {
      delete st.selecionados[origemId];
      delete st.erros[origemId];
    }
  }

  function selecionarTodosNovos(marcado) {
    const cadastrados = jaCadastrados();
    todosOsItens().filter(i => aceito(i.nome) && !cadastrados.has(i.origemId)).forEach(i => selecionar(i.origemId, marcado));
  }

  function aplicarComum() {
    const st = estado();
    for (const id of Object.keys(st.selecionados)) {
      for (const [k, v] of Object.entries(st.comum)) if (v) st.linhas[id][k] = v;
    }
  }

  // ---------- Validação e cadastro ----------
  function validarSelecionados() {
    const st = estado();
    st.erros = {};
    for (const id of Object.keys(st.selecionados)) {
      const erros = R().validar("pareceres", st.linhas[id], {});
      if (Object.keys(erros).length) st.erros[id] = erros;
    }
    return Object.keys(st.selecionados).filter(id => !st.erros[id]);
  }

  async function cadastrar(usuario, aoProgredir) {
    if (!R().pode(usuario, "criar", "pareceres")) throw new Error("Seu perfil não permite cadastrar pareceres.");
    const st = estado();
    const validos = validarSelecionados();
    const itens = todosOsItens();
    const cadastrados = jaCadastrados();
    const gravados = [], falhas = [];
    for (let i = 0; i < validos.length; i++) {
      const id = validos[i];
      const item = itens.find(x => x.origemId === id);
      if (aoProgredir) aoProgredir(i + 1, validos.length, item.nome);
      if (cadastrados.has(id)) { falhas.push({ nome: item.nome, motivo: `já foi cadastrado como ${cadastrados.get(id)}` }); continue; }
      try {
        const arquivo = await item.obter();
        const problema = R().validarAnexo(arquivo) || await R().validarConteudoAnexo(arquivo);
        if (problema) throw new Error(problema);
        const codigo = repo().proximoCodigo("pareceres");
        const anexo = await repo().enviarArquivo("pareceres", codigo, arquivo, usuario, 1);
        Object.assign(anexo, { origemId: item.origemId, origemUrl: item.webUrl || "", origemCaminho: `${item.caminho || ""}${item.nome}` });
        const dados = Object.assign({}, st.linhas[id], { anexos: [anexo] });
        const origem = item.fonte === "pasta" ? `pasta de documentos (${item.caminho || ""}${item.nome})` : `arquivo do computador (${item.nome})`;
        const { registro } = await repo().criar("pareceres", dados, usuario, { codigo, acao: `Cadastrado a partir de ${origem}` });
        gravados.push(registro.codigo);
        delete st.selecionados[id];
        delete st.linhas[id];
      } catch (e) {
        falhas.push({ nome: item.nome, motivo: e.message });
      }
    }
    st.resultado = { gravados, falhas, comErro: Object.keys(st.erros).length };
    return st.resultado;
  }

  // ---------- Tela ----------
  function tela() {
    const usuario = RT.telas.estado.usuario;
    if (!R().pode(usuario, "criar", "pareceres")) {
      return { titulo: "Sem permissão", html: `<div class="cabecalho"><div><h1>Sem permissão</h1><p>Seu perfil (${esc(usuario.perfil)}) não permite cadastrar pareceres.</p></div></div>` };
    }
    const st = estado();
    const sp = repo().info().persistente;
    const cadastrados = jaCadastrados();
    const itens = todosOsItens();
    const aceitos = itens.filter(i => aceito(i.nome));
    const ignorados = itens.length - aceitos.length;
    const novos = aceitos.filter(i => !cadastrados.has(i.origemId));
    const visiveis = st.mostrarCadastrados ? aceitos : novos;
    const selecionados = Object.keys(st.selecionados);
    const E = RT.esquema.pareceres;

    // Origem dos arquivos
    let origem;
    if (!sp) origem = `<p class="texto-corrido">No modo demonstração não há pasta do SharePoint para ler. Use a escolha de arquivos do computador para experimentar o fluxo.</p>`;
    else if (!RT.config.pastaPareceres) origem = `<p class="texto-corrido">Nenhuma pasta configurada. Para ler a pasta de pareceres da equipe, a TI ou o administrador preenche <span class="codigo">pastaPareceres</span> em <span class="codigo">js/config.js</span> com o endereço da pasta.</p>`;
    else if (st.erroPasta) origem = `<div class="aviso erro" style="margin:0"><p>${esc(st.erroPasta)}</p></div>`;
    else if (!st.arquivos) origem = `<p class="texto-corrido">Lendo a pasta…</p>`;
    else origem = `<p class="texto-corrido">Pasta: <a class="link" href="${esc(st.raiz.webUrl)}" target="_blank" rel="noopener noreferrer">${esc(st.raiz.nome)} ↗</a>${RT.config.pastaIncluirSubpastas ? ", com subpastas" : ""}. ${st.arquivos.length} arquivo${st.arquivos.length === 1 ? "" : "s"}${st.truncado ? " (lista limitada aos primeiros 1.000)" : ""}.</p>`;

    const blocoOrigem = `<section class="bloco">
      <div class="bloco-cab"><h2>De onde vêm os arquivos</h2>${sp && RT.config.pastaPareceres ? `<button type="button" class="botao pequeno" data-acao="pasta-atualizar">Atualizar lista</button>` : ""}</div>
      <div class="bloco-corpo">${origem}
        <div class="campo" style="max-width:420px;margin-top:12px"><label for="pasta-locais">Ou escolha arquivos do computador</label>
          <input id="pasta-locais" type="file" multiple accept="${RT.listas.extensoesAnexo.map(e => "." + e).join(",")}" data-pasta-locais></div>
      </div></section>`;

    // Lista de arquivos
    const linhasArquivos = visiveis.map(i => {
      const cod = cadastrados.get(i.origemId);
      const marcado = Boolean(st.selecionados[i.origemId]);
      return `<tr>
        <td>${cod ? "" : `<label class="sr-only" for="sel-${esc(i.origemId)}">Selecionar ${esc(i.nome)}</label><input type="checkbox" id="sel-${esc(i.origemId)}" data-pasta-selecionar="${esc(i.origemId)}"${marcado ? " checked" : ""}>`}</td>
        <td><div class="item-titulo">${esc(i.nome)}</div><div class="item-sub">${esc(i.fonte === "pasta" ? (i.caminho || "pasta principal") : "do computador")}${i.autor ? " · " + esc(i.autor) : ""}</div></td>
        <td class="data">${fmtData(i.data)}</td>
        <td class="num">${fmtTamanho(i.tamanho)}</td>
        <td>${cod ? `<a class="link" href="${U.rotaRegistro("pareceres", cod)}">Já cadastrado: ${esc(cod)}</a>` : `<span class="tag t-recebido">Novo</span>`}</td>
        <td>${i.webUrl ? `<a class="link" href="${esc(i.webUrl)}" target="_blank" rel="noopener noreferrer">Abrir ↗</a>` : ""}</td>
      </tr>`;
    }).join("");
    const todosMarcados = novos.length > 0 && novos.every(i => st.selecionados[i.origemId]);
    const blocoArquivos = `<section class="bloco">
      <div class="bloco-cab"><h2>Arquivos</h2><span class="meta">${novos.length} novo${novos.length === 1 ? "" : "s"} · ${aceitos.length - novos.length} já cadastrado${aceitos.length - novos.length === 1 ? "" : "s"}${ignorados ? ` · ${ignorados} em formato não aceito` : ""}</span></div>
      <div class="bloco-corpo" style="padding-bottom:8px">
        <label class="alternar"><input type="checkbox" data-pasta-mostrar-cadastrados${st.mostrarCadastrados ? " checked" : ""}><span class="alternar-trilho"></span>Mostrar também os já cadastrados</label>
      </div>
      ${visiveis.length ? `<div class="tabela-wrap"><table>
        <thead><tr><th><label class="sr-only" for="sel-todos">Selecionar todos os novos</label><input type="checkbox" id="sel-todos" data-pasta-selecionar-todos${todosMarcados ? " checked" : ""}></th><th>Arquivo</th><th>Data</th><th class="num">Tamanho</th><th>Situação</th><th></th></tr></thead>
        <tbody>${linhasArquivos}</tbody></table></div>`
        : `<div class="vazio">${itens.length ? "Todos os arquivos já foram cadastrados." : "Nenhum arquivo para mostrar."}</div>`}
    </section>`;

    // Completar e cadastrar
    let blocoCadastro = "";
    if (selecionados.length) {
      const opcoes = (lista, valor, vazio) => `<option value="">${esc(vazio || "Selecione")}</option>${lista.map(o => `<option${o === valor ? " selected" : ""}>${esc(o)}</option>`).join("")}`;
      const tipos = E.campo("tipo").opcoes;
      const comum = st.comum;
      const barra = `<div class="filtros" style="padding:0 0 14px;border:0">
          <div class="campo"><label for="comum-tipo">Tipo</label><select id="comum-tipo" data-pasta-comum="tipo">${opcoes(tipos, comum.tipo, "Manter")}</select></div>
          <div class="campo"><label for="comum-categoria">Categoria</label><select id="comum-categoria" data-pasta-comum="categoria">${opcoes(RT.listas.categorias, comum.categoria, "Manter")}</select></div>
          <div class="campo"><label for="comum-origem">Consultoria ou origem</label><input id="comum-origem" type="text" maxlength="255" value="${esc(comum.origem || "")}" data-pasta-comum="origem"></div>
          <div class="campo"><label for="comum-area">Área responsável</label><select id="comum-area" data-pasta-comum="area">${opcoes(RT.listas.areas, comum.area, "Manter")}</select></div>
          <div class="campo campo-fim"><button type="button" class="botao" data-acao="pasta-aplicar">Aplicar aos ${selecionados.length} selecionados</button></div>
        </div>`;
      const itens = todosOsItens();
      const linhas = selecionados.map(id => {
        const item = itens.find(x => x.origemId === id);
        const d = st.linhas[id];
        const err = st.erros[id] || {};
        const marca = campo => err[campo] ? ' aria-invalid="true"' : "";
        const uid = id.replace(/[^a-zA-Z0-9]/g, "_");
        return `<tr class="${Object.keys(err).length ? "linha-alerta" : ""}">
          <td><div class="item-titulo">${esc(item ? item.nome : id)}</div>${Object.keys(err).length ? `<div class="item-sub alerta-texto">${esc(Object.entries(err).map(([k, v]) => `${E.campo(k).rotulo}: ${v}`).join(" "))}</div>` : ""}</td>
          <td><label class="sr-only" for="t-${uid}">Título</label><input id="t-${uid}" type="text" maxlength="255" value="${esc(d.titulo)}" data-pasta-campo="titulo" data-id="${esc(id)}"${marca("titulo")}></td>
          <td><label class="sr-only" for="ti-${uid}">Tipo</label><select id="ti-${uid}" data-pasta-campo="tipo" data-id="${esc(id)}"${marca("tipo")}>${opcoes(tipos, d.tipo)}</select></td>
          <td><label class="sr-only" for="c-${uid}">Categoria</label><select id="c-${uid}" data-pasta-campo="categoria" data-id="${esc(id)}"${marca("categoria")}>${opcoes(RT.listas.categorias, d.categoria)}</select></td>
          <td><label class="sr-only" for="o-${uid}">Origem</label><input id="o-${uid}" type="text" maxlength="255" value="${esc(d.origem)}" data-pasta-campo="origem" data-id="${esc(id)}"${marca("origem")}></td>
          <td><label class="sr-only" for="a-${uid}">Área</label><select id="a-${uid}" data-pasta-campo="area" data-id="${esc(id)}"${marca("area")}>${opcoes(RT.listas.areas, d.area)}</select></td>
          <td><label class="sr-only" for="d-${uid}">Recebido em</label><input id="d-${uid}" type="date" value="${esc(d.dataRecebimento)}" data-pasta-campo="dataRecebimento" data-id="${esc(id)}"${marca("dataRecebimento")}></td>
          <td><label class="sr-only" for="ds-${uid}">Descrição e objetivo</label><textarea id="ds-${uid}" rows="2" data-pasta-campo="descricao" data-id="${esc(id)}"${marca("descricao")}>${esc(d.descricao)}</textarea></td>
        </tr>`;
      }).join("");
      blocoCadastro = `<section class="bloco">
        <div class="bloco-cab"><h2>Completar e cadastrar</h2><span class="meta">${selecionados.length} selecionado${selecionados.length === 1 ? "" : "s"}</span></div>
        <div class="bloco-corpo">
          <p class="texto-corrido">Título e data foram sugeridos pelo arquivo; confira. Os demais campos você preenche, linha a linha ou com "Aplicar". Todos entram como <strong>Recebido</strong>; a análise e a aprovação seguem pelo portal.</p>
          ${barra}
          <div class="tabela-wrap tabela-cadastro"><table>
            <thead><tr><th>Arquivo</th><th>Título *</th><th>Tipo *</th><th>Categoria *</th><th>Origem *</th><th>Área *</th><th>Recebido em *</th><th>Descrição e objetivo *</th></tr></thead>
            <tbody>${linhas}</tbody></table></div>
          <div class="acoes" style="margin-top:14px"><button type="button" class="botao primario" data-acao="pasta-cadastrar">Cadastrar ${selecionados.length} parecer${selecionados.length === 1 ? "" : "es"}</button></div>
        </div></section>`;
    }

    let blocoResultado = "";
    if (st.resultado) {
      const r = st.resultado;
      blocoResultado = `<div class="verificacao ${r.falhas.length || r.comErro ? "falha" : "ok"}" role="status" style="margin:0 0 16px">
        <strong>${r.gravados.length} parecer${r.gravados.length === 1 ? "" : "es"} cadastrado${r.gravados.length === 1 ? "" : "s"}</strong>${r.gravados.length ? `: ${r.gravados.map(c => `<a class="link" href="${U.rotaRegistro("pareceres", c)}">${esc(c)}</a>`).join(", ")}` : ""}.
        ${r.comErro ? ` ${r.comErro} selecionado${r.comErro === 1 ? "" : "s"} com campos a corrigir (marcados abaixo).` : ""}
        ${r.falhas.map(f => `<br>${esc(f.nome)}: ${esc(f.motivo)}`).join("")}</div>`;
    }

    return {
      titulo: "Documentos da pasta",
      html: `<a class="link voltar" href="#pareceres">← Pareceres e estudos</a>
        <div class="cabecalho"><div><h1>Documentos da pasta</h1><p>Transforme os arquivos recebidos em pareceres. O documento é copiado para a biblioteca do portal e o parecer guarda o link do original. Arquivos já cadastrados ficam marcados e não se repetem.</p></div></div>
        ${blocoResultado}
        <div class="pilha">${blocoOrigem}${blocoArquivos}${blocoCadastro}</div>`
    };
  }

  return { CAMPOS_EDITAVEIS, estado, carregarPasta, adicionarLocais, selecionar, selecionarTodosNovos, aplicarComum, validarSelecionados, cadastrar, jaCadastrados, sugestao, tela };
})();
