/*
 * Microsoft Graph simulado para os testes. Responde só às rotas que o portal usa:
 * site, listas, itens (com paginação, autoria e If-Match), biblioteca, envio simples,
 * sessão de envio em partes e download. Tudo em memória.
 */
window.RT_TESTE = window.RT_TESTE || {};

RT_TESTE.instalarGraphSimulado = function () {
  // `pasta` simula uma pasta compartilhada de outro drive (Teams/SharePoint): itens por id, com filhos
  const G = { listas: {}, seq: 1, arquivos: {}, sessoes: {}, autor: "mariana.costa@exemplo.com.br", chamadas: [], tamanhoPagina: 5, pasta: {}, links: [] };
  G.criarPasta = function (estrutura) {
    // estrutura: { nome, filhos: [ { nome, filhos } | { nome, conteudo: Uint8Array } ] }
    const montar = (no, idPai) => {
      const id = "P" + (G.seq++);
      const item = { id, nome: no.nome, pai: idPai, filhos: [] };
      if (no.filhos) { item.folder = true; no.filhos.forEach(f => item.filhos.push(montar(f, id))); }
      else { item.blob = new Blob([no.conteudo]); item.tamanho = no.conteudo.length; G.arquivos[id] = { blob: item.blob, caminho: no.nome }; }
      G.pasta[id] = item;
      return id;
    };
    G.raizPasta = montar(estrutura, null);
    return G.raizPasta;
  };
  const original = window.fetch;
  const json = (s, b) => new Response(b === null ? null : JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

  window.fetch = async (url, op = {}) => {
    const u = new URL(url, location.href);
    const m = op.method || "GET";
    const cab = op.headers || {};
    G.chamadas.push(`${m} ${u.host}${u.pathname}`);

    if (u.host === "upload.simulado") {
      const s = G.sessoes[u.pathname];
      const [, ini, fim, tot] = cab["Content-Range"].match(/bytes (\d+)-(\d+)\/(\d+)/).map(Number);
      if (ini !== s.recebido) return json(416, { error: { message: "faixa fora de ordem" } });
      s.partes.push(await op.body.arrayBuffer());
      s.recebido = fim + 1;
      if (s.recebido < tot) return json(202, { nextExpectedRanges: [`${s.recebido}-`] });
      const id = "F" + (G.seq++);
      G.arquivos[id] = { blob: new Blob(s.partes), caminho: s.caminho };
      return json(201, { id, webUrl: "https://empresa.sharepoint.com/" + s.caminho });
    }
    if (u.host === "download.simulado") return new Response(G.arquivos[u.pathname.slice(1)].blob, { status: 200 });

    if (!String(cab.Authorization || "").startsWith("Bearer ")) return json(401, { error: { message: "sem token" } });
    const p = decodeURIComponent(u.pathname.replace("/v1.0", ""));
    const corpo = op.body && typeof op.body === "string" ? JSON.parse(op.body) : null;
    const quem = () => ({ user: { email: G.autor, displayName: G.autor } });
    let mm;

    if (m === "GET" && /^\/sites\/[^/]+:\/sites\/RT$/.test(p)) return json(200, { id: "site1" });
    if (m === "GET" && p === "/sites/site1/lists") return json(200, { value: Object.entries(G.listas).map(([id, l]) => ({ id, displayName: l.nome })) });
    if (m === "POST" && p === "/sites/site1/lists") {
      const id = "L" + (G.seq++);
      G.listas[id] = { nome: corpo.displayName, template: corpo.list.template, colunas: corpo.columns || [], itens: [] };
      return json(201, { id });
    }
    if ((mm = p.match(/^\/sites\/site1\/lists\/([^/]+)\/columns$/))) {
      const l = G.listas[mm[1]];
      if (m === "GET") return json(200, { value: [{ name: "Title" }].concat(l.colunas.map(c => ({ name: c.name }))) });
      if (m === "POST") { l.colunas.push(corpo); return json(201, corpo); }
    }
    if ((mm = p.match(/^\/sites\/site1\/lists\/([^/]+)\/drive$/))) {
      return G.listas[mm[1]].template === "documentLibrary" ? json(200, { id: "drive1" }) : json(400, { error: { message: "não é biblioteca" } });
    }
    if ((mm = p.match(/^\/drives\/drive1\/root:\/(.+):\/content$/)) && m === "PUT") {
      if (Object.values(G.arquivos).some(a => a.caminho === mm[1])) return json(409, { error: { message: "nameAlreadyExists" } });
      const id = "F" + (G.seq++);
      G.arquivos[id] = { blob: op.body, caminho: mm[1] };
      return json(201, { id, webUrl: "https://empresa.sharepoint.com/" + mm[1] });
    }
    if ((mm = p.match(/^\/drives\/drive1\/root:\/(.+):\/createUploadSession$/))) {
      const k = "/s" + (G.seq++);
      G.sessoes[k] = { caminho: mm[1], partes: [], recebido: 0 };
      return json(200, { uploadUrl: "https://upload.simulado" + k });
    }
    if ((mm = p.match(/^\/shares\/([^/]+)\/driveItem$/))) {
      G.links.push(mm[1]);
      const raiz = G.pasta[G.raizPasta];
      if (!raiz || !mm[1].startsWith("u!")) return json(404, { error: { message: "itemNotFound" } });
      return json(200, { id: raiz.id, name: raiz.nome, webUrl: "https://empresa.sharepoint.com/pasta", folder: { childCount: raiz.filhos.length }, parentReference: { driveId: "drive2" } });
    }
    if ((mm = p.match(/^\/drives\/drive2\/items\/([^/]+)\/children$/))) {
      const filhos = G.pasta[mm[1]].filhos.map(id => G.pasta[id]);
      const salto = Number(u.searchParams.get("salto") || 0);
      const r = { value: filhos.slice(salto, salto + G.tamanhoPagina).map(f => f.folder
        ? { id: f.id, name: f.nome, folder: { childCount: f.filhos.length } }
        : { id: f.id, name: f.nome, size: f.tamanho, file: { mimeType: "application/octet-stream" }, createdDateTime: "2026-10-15T13:00:00Z", lastModifiedDateTime: "2026-10-16T09:00:00Z", lastModifiedBy: { user: { displayName: "Consultoria Gama" } }, webUrl: "https://empresa.sharepoint.com/pasta/" + f.nome }) };
      if (salto + G.tamanhoPagina < filhos.length) r["@odata.nextLink"] = `https://graph.microsoft.com/v1.0${p}?salto=${salto + G.tamanhoPagina}`;
      return json(200, r);
    }
    if ((mm = p.match(/^\/drives\/[^/]+\/items\/([^/]+)$/))) {
      return G.arquivos[mm[1]] ? json(200, { id: mm[1], "@microsoft.graph.downloadUrl": "https://download.simulado/" + mm[1] }) : json(404, { error: { message: "item não encontrado" } });
    }
    if ((mm = p.match(/^\/sites\/site1\/lists\/([^/]+)\/items$/))) {
      const l = G.listas[mm[1]];
      if (m === "GET") {
        const salto = Number(u.searchParams.get("salto") || 0);
        const pagina = l.itens.slice(salto, salto + G.tamanhoPagina);
        const r = { value: pagina.map(i => ({ id: i.id, eTag: i.etag, createdBy: i.createdBy, createdDateTime: "2026-10-21T12:00:00Z", fields: Object.assign({ "@odata.etag": i.etag }, i.fields) })) };
        if (salto + G.tamanhoPagina < l.itens.length) r["@odata.nextLink"] = `https://graph.microsoft.com/v1.0${p}?expand=fields&salto=${salto + G.tamanhoPagina}`;
        return json(200, r);
      }
      if (m === "POST") {
        for (const k of Object.keys(corpo.fields)) {
          if (k !== "Title" && !l.colunas.find(c => c.name === k)) return json(400, { error: { message: "coluna inexistente " + k } });
        }
        const it = { id: String(G.seq++), etag: '"e,1"', versao: 1, fields: corpo.fields, createdBy: quem() };
        l.itens.push(it);
        return json(201, { id: it.id, eTag: it.etag, createdBy: it.createdBy, createdDateTime: "2026-10-21T12:00:00Z" });
      }
    }
    if ((mm = p.match(/^\/sites\/site1\/lists\/([^/]+)\/items\/([^/]+)\/fields$/)) && m === "PATCH") {
      const it = G.listas[mm[1]].itens.find(i => i.id === mm[2]);
      if (cab["If-Match"] && cab["If-Match"] !== it.etag) return json(412, { error: { message: "precondition failed" } });
      Object.assign(it.fields, corpo);
      it.versao++;
      it.etag = `"e,${it.versao}"`;
      return json(200, Object.assign({ "@odata.etag": it.etag }, it.fields));
    }
    if ((mm = p.match(/^\/sites\/site1\/lists\/([^/]+)\/items\/([^/]+)$/)) && m === "DELETE") {
      const l = G.listas[mm[1]];
      l.itens = l.itens.filter(i => i.id !== mm[2]);
      return new Response(null, { status: 204 });
    }
    return json(404, { error: { message: `rota não simulada: ${m} ${p}` } });
  };

  return { G, restaurar: () => { window.fetch = original; } };
};
