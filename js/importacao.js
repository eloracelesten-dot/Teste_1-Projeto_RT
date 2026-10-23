/*
 * Importação de planilhas Excel (.xlsx).
 *
 * Fluxo: baixar o modelo do módulo -> preencher -> enviar -> conferir colunas ->
 * validação linha a linha -> gravar só as linhas válidas, com histórico.
 * O arquivo é lido no navegador, sem biblioteca externa. Nada é gravado antes da
 * confirmação.
 */
window.RT = window.RT || {};

RT.importacao = (function () {
  const LIMITE_LINHAS = 2000;
  const LIMITE_MB = 10;
  const ENTIDADES = ["pareceres", "perguntas", "atividades", "impactos", "adequacoes", "testes", "defeitos", "normas", "marcos", "decisoes", "usuarios"];
  const dec = new TextDecoder();
  const E = () => RT.esquema;
  const repo = () => RT.repositorio;
  const R = () => RT.regras;

  // =====================================================================
  // Leitura do arquivo .xlsx
  // =====================================================================
  async function abrirZip(buffer) {
    const b = new Uint8Array(buffer);
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let fim = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break; }
    }
    if (fim < 0) throw new Error("O arquivo não é uma planilha .xlsx válida.");
    const total = dv.getUint16(fim + 10, true);
    let p = dv.getUint32(fim + 16, true);
    const entradas = {};
    for (let k = 0; k < total; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("A planilha está corrompida.");
      const n = dv.getUint16(p + 28, true), x = dv.getUint16(p + 30, true), c = dv.getUint16(p + 32, true);
      entradas[dec.decode(b.subarray(p + 46, p + 46 + n))] = {
        metodo: dv.getUint16(p + 10, true), tamanho: dv.getUint32(p + 20, true), local: dv.getUint32(p + 42, true)
      };
      p += 46 + n + x + c;
    }
    async function ler(nome) {
      const e = entradas[nome.replace(/^\//, "")];
      if (!e) return null;
      const ini = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
      const dados = b.subarray(ini, ini + e.tamanho);
      if (e.metodo === 0) return dec.decode(dados);
      if (e.metodo === 8) {
        if (typeof DecompressionStream === "undefined") throw new Error("Este navegador não consegue ler planilhas compactadas. Use o Edge ou o Chrome atualizados.");
        const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Response(fluxo).text();
      }
      throw new Error("A planilha usa um tipo de compactação não suportado.");
    }
    return { ler };
  }

  const xml = texto => {
    const doc = new DOMParser().parseFromString(texto, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("A planilha tem conteúdo inválido.");
    return doc;
  };
  const tags = (el, nome) => [...el.getElementsByTagNameNS("*", nome)];
  const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  // Texto de uma célula ou string compartilhada, ignorando a guia fonética (rPh)
  const textoDe = el => tags(el, "t").filter(t => !t.parentNode || t.parentNode.localName !== "rPh").map(t => t.textContent).join("");

  function indiceColuna(ref) {
    const letras = /^[A-Z]+/.exec(ref)[0];
    let n = 0;
    for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  // Formatos de número que representam datas
  function estilosDeData(stylesXml) {
    if (!stylesXml) return new Set();
    const doc = xml(stylesXml);
    const personalizados = {};
    tags(doc, "numFmt").forEach(f => { personalizados[f.getAttribute("numFmtId")] = f.getAttribute("formatCode") || ""; });
    const ehData = id => {
      const n = Number(id);
      if ((n >= 14 && n <= 22) || (n >= 45 && n <= 47)) return true;
      const codigo = (personalizados[id] || "").replace(/"[^"]*"|\[[^\]]*\]|\\./g, "");
      return /[dy]/i.test(codigo) || /m{3,}/i.test(codigo);
    };
    const xfs = tags(doc, "cellXfs")[0];
    const resultado = new Set();
    if (xfs) tags(xfs, "xf").forEach((xf, i) => { if (ehData(xf.getAttribute("numFmtId"))) resultado.add(String(i)); });
    return resultado;
  }

  // Devolve [{ nome, linhas: [[{ v, data } | null, ...], ...] }]
  async function lerPlanilha(arquivo) {
    if (!/\.xlsx$/i.test(arquivo.name)) throw new Error("Envie um arquivo .xlsx (Excel). Planilhas .xls antigas podem ser salvas como .xlsx pelo próprio Excel.");
    if (arquivo.size > LIMITE_MB * 1024 * 1024) throw new Error(`A planilha passa de ${LIMITE_MB} MB.`);
    const zip = await abrirZip(await arquivo.arrayBuffer());
    const workbook = await zip.ler("xl/workbook.xml");
    if (!workbook) throw new Error("O arquivo não é uma planilha do Excel.");
    const rels = xml(await zip.ler("xl/_rels/workbook.xml.rels") || "<Relationships/>");
    const alvos = {};
    tags(rels, "Relationship").forEach(r => { alvos[r.getAttribute("Id")] = r.getAttribute("Target"); });
    const compartilhadas = [];
    const sst = await zip.ler("xl/sharedStrings.xml");
    if (sst) tags(xml(sst), "si").forEach(si => compartilhadas.push(textoDe(si)));
    const datas = estilosDeData(await zip.ler("xl/styles.xml"));

    const abas = [];
    for (const s of tags(xml(workbook), "sheet")) {
      const id = s.getAttributeNS(NS_REL, "id") || s.getAttribute("r:id");
      let alvo = alvos[id] || "";
      alvo = alvo.startsWith("/") ? alvo.slice(1) : "xl/" + alvo.replace(/^\.\//, "");
      const conteudo = await zip.ler(alvo);
      if (!conteudo) continue;
      const linhas = [];
      for (const row of tags(xml(conteudo), "row")) {
        const indice = Number(row.getAttribute("r")) - 1;
        const linha = [];
        tags(row, "c").forEach((c, pos) => {
          const ref = c.getAttribute("r");
          const col = ref ? indiceColuna(ref) : pos;
          const tipo = c.getAttribute("t");
          const vEl = tags(c, "v")[0];
          const bruto = vEl ? vEl.textContent : "";
          let v;
          if (tipo === "s") v = compartilhadas[Number(bruto)] || "";
          else if (tipo === "inlineStr") v = textoDe(c);
          else if (tipo === "b") v = bruto === "1";
          else if (tipo === "str" || tipo === "e") v = bruto;
          else v = bruto === "" ? "" : Number(bruto);
          linha[col] = (v === "" || v === undefined) ? null : { v, data: typeof v === "number" && datas.has(c.getAttribute("s") || "0") };
        });
        linhas[indice] = linha;
      }
      abas.push({ nome: s.getAttribute("name"), linhas: Array.from(linhas, l => l || []) });
    }
    if (!abas.length) throw new Error("A planilha não tem abas com dados.");
    return abas;
  }

  // =====================================================================
  // Colunas importáveis e modelo
  // =====================================================================
  function camposImportaveis(ent) {
    return E()[ent].campos.filter(c => !c.sistema && c.tipo !== "anexos");
  }

  const normalizar = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, "").replace(/[*:]/g, "").replace(/\s+/g, " ").trim();

  function cabecalhoDoCampo(c) { return c.rotulo + (c.obrigatorio ? " *" : ""); }

  // Associa cada coluna da planilha a um campo, pelo nome do cabeçalho
  function mapearAutomatico(ent, cabecalho) {
    const campos = camposImportaveis(ent);
    return cabecalho.map(h => {
      const n = normalizar(h);
      if (!n) return "";
      if (n === "codigo") return "codigo";
      const achado = campos.find(c => normalizar(c.rotulo) === n || normalizar(c.nome) === n);
      return achado ? achado.nome : "";
    });
  }

  function descricaoFormato(c) {
    switch (c.tipo) {
      case "data": return "Data (célula de data do Excel ou dd/mm/aaaa)";
      case "numero": return `Número${c.min !== undefined ? ` de ${c.min} a ${c.max}` : ""}`;
      case "opcao": return "Uma das opções da coluna ao lado";
      case "multiOpcao": return "Uma ou mais opções, separadas por ponto e vírgula";
      case "usuario": return "Nome de um usuário cadastrado no portal";
      case "ref": return `Código de ${E()[c.entidade].singular} já cadastrad${E()[c.entidade].genero} ou desta planilha`;
      case "refs": return `Códigos de ${E()[c.entidade].rotulo.toLowerCase()}, separados por ponto e vírgula`;
      case "email": return "E-mail";
      case "url": return "Endereço começando com https://";
      case "booleano": return "Sim ou Não";
      case "textoLongo": return "Texto (até 10.000 caracteres)";
      default: return c.formato === "mesAno" ? "Mês e ano no formato MM/AAAA (ex.: 03/2026)" : c.max ? `Texto (até ${c.max} caracteres)` : "Texto";
    }
  }

  function opcoesTexto(ent, c) {
    if (c.nome === "status" && ent === "pareceres") return c.opcoes.filter(o => o !== "Aprovado internamente").join("; ");
    if (c.opcoes) return c.opcoes.join("; ");
    return "";
  }

  function modelo(ent) {
    const e = E()[ent];
    const campos = camposImportaveis(ent);
    const prefixo = e.prefixo;
    const instrucoes = [
      { rotulo: "Coluna", tipo: "texto" }, { rotulo: "Obrigatória", tipo: "texto" },
      { rotulo: "Formato", tipo: "texto" }, { rotulo: "Valores aceitos", tipo: "texto" }
    ];
    const linhasInstrucoes = [["Código", "Não", `Deixe em branco para o portal gerar (${prefixo}-001, ${prefixo}-002…). Preencha só para manter códigos que já existem ou para citar esta linha em outra.`, `${prefixo}-000`]]
      .concat(campos.map(c => [c.rotulo, c.obrigatorio ? "Sim" : "Não", descricaoFormato(c), opcoesTexto(ent, c)]));
    const sobre = {
      titulo: `Modelo de importação · ${e.rotulo}`,
      linhas: [
        ["Como usar", "Preencha a aba de dados, uma linha por registro, sem mudar os títulos das colunas. Depois envie em Importar planilha."],
        ["Colunas", "Veja a aba Instruções: o que é obrigatório e os valores aceitos em cada coluna."],
        ["Anexos", "Arquivos não entram pela planilha: anexe pelo portal depois da importação."],
        ["Limite", `Até ${LIMITE_LINHAS} linhas e ${LIMITE_MB} MB por arquivo.`],
        ["Classificação", "Documento interno."]
      ]
    };
    const secoes = [
      { titulo: e.rotulo, colunas: [{ rotulo: "Código", tipo: "texto" }].concat(campos.map(c => ({ rotulo: cabecalhoDoCampo(c), tipo: c.tipo === "data" ? "data" : "texto" }))), linhas: [] },
      { titulo: "Instruções", colunas: instrucoes, linhas: linhasInstrucoes }
    ];
    return RT.xlsx.gerar(secoes, sobre);
  }

  // =====================================================================
  // Conversão e validação de cada linha
  // =====================================================================
  const sem = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  function dataDeSerial(n) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function dataValida(a, m, d) {
    const dt = new Date(Date.UTC(a, m - 1, d));
    return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  // Converte o valor da célula para o formato do campo. Devolve { valor } ou { erro }
  function converter(ent, c, cel, contexto) {
    const vazio = cel === null || cel === undefined || (typeof cel.v === "string" && !cel.v.trim());
    if (vazio) return { valor: c.tipo === "refs" || c.tipo === "multiOpcao" ? [] : c.tipo === "booleano" ? (c.padrao !== undefined ? c.padrao : false) : (c.padrao !== undefined ? c.padrao : "") };
    const v = cel.v;
    const texto = typeof v === "string" ? v.trim() : String(v);
    const lista = () => texto.split(/[;,\n]/).map(x => x.trim()).filter(Boolean);

    switch (c.tipo) {
      case "data": {
        if (typeof v === "number") return { valor: dataDeSerial(v) };
        let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
        if (m && dataValida(+m[3], +m[2], +m[1])) return { valor: `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` };
        m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
        if (m && dataValida(+m[1], +m[2], +m[3])) return { valor: texto };
        return { erro: `data inválida "${texto}" (use dd/mm/aaaa)` };
      }
      case "numero": {
        // Célula com formato de porcentagem chega como fração (60% = 0,6)
        if (typeof v === "number") return { valor: c.nome === "percentual" && v > 0 && v < 1 ? Math.round(v * 100) : v };
        const limpo = texto.replace("%", "").replace(/\s/g, "");
        const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
        return Number.isNaN(n) ? { erro: `"${texto}" não é um número` } : { valor: n };
      }
      case "opcao": {
        const opcoes = c.nome === "status" ? R().opcoesDeStatus(ent, null, null) : c.opcoes;
        const achada = opcoes.find(o => sem(o) === sem(texto));
        if (achada) return { valor: achada };
        if (ent === "pareceres" && c.nome === "status" && sem(texto) === sem("Aprovado internamente")) {
          return { erro: "um parecer não entra aprovado: a aprovação é feita no portal, por um gestor" };
        }
        return { erro: `"${texto}" não é uma opção válida (${opcoes.join(", ")})` };
      }
      case "multiOpcao": {
        const valores = [], erradas = [];
        texto.split(/[;\n,]/).map(x => x.trim()).filter(Boolean).forEach(x => {
          const achada = c.opcoes.find(o => sem(o) === sem(x));
          if (achada) valores.push(achada); else erradas.push(x);
        });
        return erradas.length ? { erro: `opções inválidas: ${erradas.join(", ")}` } : { valor: [...new Set(valores)] };
      }
      case "usuario": {
        const u = contexto.usuarios.find(x => sem(x.nome) === sem(texto) || sem(x.email) === sem(texto));
        return u ? { valor: u.nome } : { erro: `"${texto}" não está cadastrado como usuário` };
      }
      case "ref": {
        const cod = texto.toUpperCase();
        return contexto.existe(c.entidade, cod) ? { valor: cod } : { erro: `${cod} não existe em ${E()[c.entidade].rotulo}` };
      }
      case "refs": {
        const cods = [...new Set(lista().map(x => x.toUpperCase()))];
        const faltam = cods.filter(x => !contexto.existe(c.entidade, x));
        return faltam.length ? { erro: `não existem em ${E()[c.entidade].rotulo}: ${faltam.join(", ")}` } : { valor: cods };
      }
      case "booleano": {
        if (typeof v === "boolean") return { valor: v };
        if (["sim", "s", "x", "1", "true", "verdadeiro"].includes(sem(texto))) return { valor: true };
        if (["nao", "n", "0", "false", "falso"].includes(sem(texto))) return { valor: false };
        return { erro: `"${texto}" deveria ser Sim ou Não` };
      }
      default:
        // Mês e ano: o Excel costuma transformar "03/2026" numa data
        if (c.formato === "mesAno") {
          if (typeof v === "number") { const iso = dataDeSerial(v); return { valor: `${iso.slice(5, 7)}/${iso.slice(0, 4)}` }; }
          const m = /^(\d{1,2})[\/.-](\d{4})$/.exec(texto);
          if (m && +m[1] >= 1 && +m[1] <= 12) return { valor: `${m[1].padStart(2, "0")}/${m[2]}` };
          return { erro: `"${texto}" deveria estar no formato MM/AAAA` };
        }
        // Data digitada numa coluna de texto: guarda como dd/mm/aaaa, não como número de série
        return { valor: typeof v === "number" && cel.data ? dataDeSerial(v).split("-").reverse().join("/") : texto };
    }
  }

  // Valida todas as linhas. Devolve { linhas: [{ numero, dados, codigo, erros, avisos }], ignoradas }
  function validar(ent, aba, mapeamento) {
    const e = E()[ent];
    const campos = camposImportaveis(ent);
    const corpo = aba.linhas.slice(1);
    const linhasUteis = corpo.map((l, i) => ({ celulas: l, numero: i + 2 }))
      .filter(x => x.celulas.some(c => c && !(typeof c.v === "string" && !c.v.trim())));
    if (linhasUteis.length > LIMITE_LINHAS) throw new Error(`A planilha tem ${linhasUteis.length} linhas; o limite é ${LIMITE_LINHAS} por importação.`);

    const colCodigo = mapeamento.indexOf("codigo");
    const existentes = new Set(repo().listar(ent, { incluirArquivados: true }).map(r => r.codigo));

    // 1º passo: códigos (informados ou gerados) para permitir vínculos entre linhas da mesma planilha
    const padrao = new RegExp(`^${e.prefixo}-\\d{3,}$`);
    let maior = 0;
    const numeroDe = cod => { const m = /-(\d+)$/.exec(cod); return m ? Number(m[1]) : 0; };
    existentes.forEach(c => { maior = Math.max(maior, numeroDe(c)); });
    const informados = linhasUteis.map(x => {
      const cel = colCodigo >= 0 ? x.celulas[colCodigo] : null;
      return cel ? String(cel.v).trim().toUpperCase() : "";
    });
    informados.forEach(c => { if (padrao.test(c)) maior = Math.max(maior, numeroDe(c)); });
    const vistos = new Map();
    const codigos = informados.map(c => c || `${e.prefixo}-${String(++maior).padStart(3, "0")}`);
    codigos.forEach((c, i) => vistos.set(c, (vistos.get(c) || 0) + 1));
    const novosDoLote = new Set(codigos);

    const contexto = {
      usuarios: repo().listar("usuarios").filter(u => u.ativo !== false),
      existe: (entAlvo, cod) => Boolean(repo().obter(entAlvo, cod)) || (entAlvo === ent && novosDoLote.has(cod))
    };

    // 2º passo: conversão e regras de cada linha
    const resultado = linhasUteis.map((x, i) => {
      const erros = [], avisos = [];
      const dados = {};
      const codigo = codigos[i];
      if (informados[i]) {
        if (!padrao.test(codigo)) erros.push(`Código: "${codigo}" deveria seguir o padrão ${e.prefixo}-001`);
        else if (existentes.has(codigo)) erros.push(`Código: ${codigo} já existe no portal`);
      }
      if (vistos.get(codigo) > 1) erros.push(`Código: ${codigo} aparece em mais de uma linha`);

      const comErroDeFormato = new Set();
      for (const c of campos) {
        const col = mapeamento.indexOf(c.nome);
        const r = converter(ent, c, col >= 0 ? x.celulas[col] : null, contexto);
        if (r.erro) { erros.push(`${c.rotulo}: ${r.erro}`); comErroDeFormato.add(c.nome); }
        else dados[c.nome] = r.valor;
      }
      // Regras do cadastro manual, para mostrar todos os problemas da linha de uma vez
      const ctx = {
        codigo, atividades: ent === "atividades" ? lote().concat(repo().listar("atividades")) : repo().listar("atividades"),
        usuarios: repo().listar("usuarios", { incluirArquivados: true })
      };
      const regras = R().validar(ent, dados, ctx);
      for (const [campo, msg] of Object.entries(regras)) {
        if (!comErroDeFormato.has(campo)) erros.push(`${(e.campo(campo) || {}).rotulo || campo}: ${msg}`);
      }
      // Provável duplicidade com registro já existente (não impede a gravação)
      const titulo = sem(e.titulo(dados) || "");
      if (titulo && repo().listar(ent).some(r => sem(e.titulo(r) || "") === titulo)) avisos.push("Já existe um registro com o mesmo título.");
      return { numero: x.numero, codigo, dados, erros, avisos };
    });

    // As ações do próprio lote entram na checagem de dependências circulares
    function lote() { return linhasUteis.map((x, i) => ({ codigo: codigos[i], dependencias: dependenciasDaLinha(x) })); }
    function dependenciasDaLinha(x) {
      const col = mapeamento.indexOf("dependencias");
      const cel = col >= 0 ? x.celulas[col] : null;
      return cel ? String(cel.v).split(/[;,\n]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];
    }

    return { linhas: resultado, ignoradas: corpo.length - linhasUteis.length };
  }

  // =====================================================================
  // Gravação
  // =====================================================================
  async function gravar(ent, validacao, usuario, nomeArquivo, aoProgredir) {
    const validas = validacao.linhas.filter(l => !l.erros.length);
    const gravadas = [], falhas = [];
    for (let i = 0; i < validas.length; i++) {
      const l = validas[i];
      if (aoProgredir) aoProgredir(i + 1, validas.length);
      // Confere de novo: alguém pode ter cadastrado o mesmo código depois da validação
      if (repo().obter(ent, l.codigo)) { falhas.push({ numero: l.numero, motivo: `${l.codigo} foi cadastrado por outra pessoa durante a importação` }); continue; }
      try {
        const dados = Object.assign({}, l.dados);
        E()[ent].campos.filter(c => c.tipo === "anexos").forEach(c => { dados[c.nome] = []; });
        const { registro } = await repo().criar(ent, dados, usuario, { codigo: l.codigo, acao: `Importado da planilha ${nomeArquivo} (linha ${l.numero})` });
        gravadas.push(registro.codigo);
      } catch (e) {
        falhas.push({ numero: l.numero, motivo: e.message });
      }
    }
    return { gravadas, falhas };
  }

  function relatorioDeErros(ent, aba, validacao) {
    const cab = aba.linhas[0] || [];
    const colunas = [{ rotulo: "Linha", tipo: "numero" }, { rotulo: "Situação", tipo: "texto" }, { rotulo: "Problemas", tipo: "texto" }]
      .concat(cab.map(h => ({ rotulo: h ? String(h.v) : "", tipo: "texto" })));
    const linhas = validacao.linhas.filter(l => l.erros.length || l.avisos.length).map(l => {
      const original = aba.linhas[l.numero - 1] || [];
      return [l.numero, l.erros.length ? "Com erro" : "Com aviso", l.erros.concat(l.avisos).join("\n")]
        .concat(cab.map((_, i) => original[i] ? (original[i].data ? dataDeSerial(original[i].v) : original[i].v) : ""));
    });
    return RT.xlsx.gerar([{ titulo: "Linhas com problemas", colunas, linhas }], {
      titulo: `Relatório da importação · ${E()[ent].rotulo}`,
      linhas: [["Linhas com erro", String(validacao.linhas.filter(l => l.erros.length).length)], ["Como corrigir", "Corrija na planilha original e envie de novo. As linhas sem erro já gravadas não devem ser reenviadas."]]
    });
  }

  return {
    ENTIDADES, LIMITE_LINHAS, lerPlanilha, camposImportaveis, mapearAutomatico, modelo, validar, gravar, relatorioDeErros,
    converter, dataDeSerial
  };
})();
