/*
 * Gerador de planilhas Excel (.xlsx) sem bibliotecas externas.
 * Monta o pacote Office Open XML (um ZIP sem compressão) com uma aba por seção.
 * Textos são gravados como texto literal: nada que comece com "=" vira fórmula.
 */
window.RT = window.RT || {};

RT.xlsx = (function () {
  const enc = new TextEncoder();

  // ---------- ZIP (método "stored") ----------
  const tabelaCrc = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = tabelaCrc[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function dataDos(d) {
    return {
      hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
      data: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }
  function zip(arquivos, tipo) {
    const partes = [], central = [];
    const dt = dataDos(new Date());
    let deslocamento = 0;
    for (const a of arquivos) {
      const nome = enc.encode(a.nome);
      const dados = typeof a.dados === "string" ? enc.encode(a.dados) : a.dados;
      const crc = crc32(dados);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true); local.setUint16(10, dt.hora, true); local.setUint16(12, dt.data, true);
      local.setUint32(14, crc, true); local.setUint32(18, dados.length, true); local.setUint32(22, dados.length, true);
      local.setUint16(26, nome.length, true); local.setUint16(28, 0, true);
      partes.push(new Uint8Array(local.buffer), nome, dados);

      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
      cd.setUint16(10, 0, true); cd.setUint16(12, dt.hora, true); cd.setUint16(14, dt.data, true);
      cd.setUint32(16, crc, true); cd.setUint32(20, dados.length, true); cd.setUint32(24, dados.length, true);
      cd.setUint16(28, nome.length, true); cd.setUint32(42, deslocamento, true);
      central.push(new Uint8Array(cd.buffer), nome);
      deslocamento += 30 + nome.length + dados.length;
    }
    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
    fim.setUint32(12, tamCentral, true); fim.setUint32(16, deslocamento, true);
    return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], { type: tipo });
  }

  // ---------- Planilha ----------
  const xml = v => String(v === undefined || v === null ? "" : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function coluna(n) {
    let s = "";
    for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
  }

  // AAAA-MM-DD -> número de série do Excel
  function serialData(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return null;
    return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000;
  }

  // Estilos: 0 normal · 1 cabeçalho · 2 data · 3 texto com quebra · 4 título
  function celula(ref, valor, tipo) {
    if (valor === undefined || valor === null || valor === "") return `<c r="${ref}"/>`;
    if (tipo === "numero" && typeof valor === "number" && isFinite(valor)) return `<c r="${ref}"><v>${valor}</v></c>`;
    if (tipo === "data") {
      const s = serialData(valor);
      if (s !== null) return `<c r="${ref}" s="2"><v>${s}</v></c>`;
    }
    const texto = Array.isArray(valor) ? valor.join(", ") : String(valor);
    const estilo = texto.includes("\n") ? ' s="3"' : "";
    return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${xml(texto)}</t></is></c>`;
  }

  function planilha(secao) {
    const cols = secao.colunas;
    const linhas = secao.linhas;
    const larguras = cols.map((c, i) => {
      const maior = Math.max(String(c.rotulo).length, ...linhas.map(l => {
        const v = l[i];
        if (c.tipo === "data") return 10;
        return String(Array.isArray(v) ? v.join(", ") : (v === undefined || v === null ? "" : v)).split("\n")[0].length;
      }));
      return Math.min(60, Math.max(8, maior + 2));
    });
    const ultima = coluna(Math.max(cols.length - 1, 0));
    const cab = `<row r="1">${cols.map((c, i) => `<c r="${coluna(i)}1" t="inlineStr" s="1"><is><t xml:space="preserve">${xml(c.rotulo)}</t></is></c>`).join("")}</row>`;
    const corpo = linhas.map((l, j) => `<row r="${j + 2}">${cols.map((c, i) => celula(`${coluna(i)}${j + 2}`, l[i], c.tipo)).join("")}</row>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${cab}${corpo}</sheetData>
${linhas.length ? `<autoFilter ref="A1:${ultima}${linhas.length + 1}"/>` : ""}
</worksheet>`;
  }

  // Aba "Sobre": título, geração, filtros e aviso de documento interno
  function planilhaSobre(info) {
    const linhas = [[info.titulo], [""], ...info.linhas.map(l => l)];
    const corpo = linhas.map((l, j) => `<row r="${j + 1}">${l.map((v, i) => {
      const ref = `${coluna(i)}${j + 1}`;
      if (j === 0) return `<c r="${ref}" t="inlineStr" s="4"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      return celula(ref, v, "texto");
    }).join("")}</row>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="80" customWidth="1"/></cols>
<sheetData>${corpo}</sheetData></worksheet>`;
  }

  function nomeAba(nome, usados) {
    let base = String(nome).replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Planilha";
    let n = base, i = 2;
    while (usados.has(n.toLowerCase())) { const suf = ` (${i++})`; n = base.slice(0, 31 - suf.length) + suf; }
    usados.add(n.toLowerCase());
    return n;
  }

  // secoes: [{ titulo, colunas: [{rotulo, tipo}], linhas: [[...]] }]
  // sobre: { titulo, linhas: [[rótulo, valor], ...] }
  function gerar(secoes, sobre) {
    const usados = new Set();
    const abas = [{ nome: nomeAba("Sobre", usados), conteudo: planilhaSobre(sobre) }]
      .concat(secoes.map(s => ({ nome: nomeAba(s.titulo, usados), conteudo: planilha(s) })));

    const arquivos = [
      { nome: "[Content_Types].xml", dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
</Types>` },
      { nome: "_rels/.rels", dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
      { nome: "xl/workbook.xml", dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${abas.map((a, i) => `<sheet name="${xml(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>` },
      { nome: "xl/_rels/workbook.xml.rels", dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
      { nome: "xl/styles.xml", dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF33296D"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF33296D"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>` }
    ].concat(abas.map((a, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, dados: a.conteudo })));

    return zip(arquivos, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  function baixar(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  return { gerar, baixar, crc32 };
})();
