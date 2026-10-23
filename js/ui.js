/*
 * Componentes de interface: formatação, etiquetas, campos de formulário, modal e avisos.
 * Todo texto vindo dos registros passa por esc() antes de entrar no HTML.
 */
window.RT = window.RT || {};

RT.ui = (function () {
  const esc = v => String(v === undefined || v === null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function fmtData(iso) {
    if (!iso) return "";
    const [a, m, d] = String(iso).slice(0, 10).split("-");
    return d && m && a ? `${d}/${m}/${a}` : esc(iso);
  }
  function fmtDataCurta(iso) { return iso ? fmtData(iso).slice(0, 5) : ""; }
  function fmtDataHora(iso) {
    if (!iso) return "";
    return `${fmtData(iso)} ${String(iso).slice(11, 16)}`;
  }
  function fmtTamanho(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  }

  const CLASSES = {
    "Concluída": "t-concluida", "Aprovado internamente": "t-aprovado", "Vigente": "t-vigente", "Adequado": "t-adequado",
    "Implantada": "t-implantada", "Aprovado": "t-aprovado", "Corrigido": "t-concluida", "Avaliada": "t-concluida",
    "Em andamento": "t-andamento", "Em execução": "t-execucao", "Em tratamento": "t-tratamento", "Em desenvolvimento": "t-desenvolvimento", "Em avaliação": "t-andamento",
    "Em validação": "t-validacao", "Em teste": "t-teste", "Análise concluída": "t-analise", "Aguarda reteste": "t-validacao",
    "Bloqueada": "t-bloqueada", "Atrasada": "t-atrasada", "Reprovado": "t-reprovado", "Revogada": "t-revogada", "Aberto": "t-aberto",
    "Não iniciada": "t-naoiniciada", "Não iniciado": "t-naoiniciada", "Recebido": "t-recebido", "Identificado": "t-identificado",
    "Cancelada": "t-cancelada", "Cancelado": "t-cancelada", "Não avaliada": "t-naoiniciada", "Não aplicável": "t-cancelada", "Arquivado": "t-cancelada",
    "Em elaboração": "t-elaboracao", "Em correção": "t-correcao", "Bloqueado": "t-elaboracao",
    "Substituída": "t-substituida",
    "Aguardando resposta": "t-elaboracao", "Respondida": "t-concluida", "Em revisão": "t-validacao"
  };
  const tag = valor => valor ? `<span class="tag ${CLASSES[valor] || "t-naoiniciada"}">${esc(valor)}</span>` : "";

  const PRIO = { "Crítica": "prio-critica", "Alta": "prio-alta", "Média": "prio-media", "Baixa": "prio-baixa" };
  const prio = valor => valor ? `<span class="prio ${PRIO[valor] || ""}">${esc(valor)}</span>` : "";

  const NAT = { "Legal confirmado": ["n-legal", "Legal"], "Previsão oficial": ["n-previsao", "Previsão"], "Interno": ["n-interno", "Interno"] };
  const natureza = valor => valor && NAT[valor] ? `<span class="natureza ${NAT[valor][0]}" title="${esc(valor)}">${NAT[valor][1]}</span>` : "";

  function rotaRegistro(entidade, codigo) { return `#${entidade}/${encodeURIComponent(codigo)}`; }

  function linkRegistro(entidade, codigo, texto) {
    const r = RT.repositorio.obter(entidade, codigo);
    if (!r) return `<span class="vinculo vinculo-quebrado" title="Registro não encontrado">${esc(codigo)}</span>`;
    return `<a class="link" href="${rotaRegistro(entidade, codigo)}">${esc(texto || codigo)}</a>`;
  }

  function vinculos(entidade, codigos) {
    if (!codigos || !codigos.length) return `<span class="muted">—</span>`;
    return `<span class="vinculos">${codigos.map(c => {
      const r = RT.repositorio.obter(entidade, c);
      if (!r) return `<span class="vinculo vinculo-quebrado" title="Registro não encontrado">${esc(c)}</span>`;
      return `<a class="vinculo" href="${rotaRegistro(entidade, c)}" title="${esc(RT.esquema[entidade].titulo(r))}">${esc(c)}</a>`;
    }).join("")}</span>`;
  }

  function progresso(pct) {
    const v = Math.max(0, Math.min(100, Number(pct) || 0));
    return `<div class="progresso"><span class="progresso-trilho"><span style="width:${v}%"></span></span><span class="num">${v}%</span></div>`;
  }

  // Valor de um campo para exibição
  function valor(campo, registro) {
    const v = registro[campo.nome];
    const vazio = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
    if (vazio) return `<span class="muted">—</span>`;
    switch (campo.tipo) {
      case "data": return fmtData(v);
      case "textoLongo": return esc(v).replace(/\n/g, "<br>");
      case "opcao": return campo.nome === "status" || campo.nome === "situacao" ? tag(v)
        : ["prioridade", "criticidade", "severidade"].includes(campo.nome) ? prio(v)
        : campo.nome === "natureza" ? natureza(v) + " " + esc(v) : esc(v);
      case "multiOpcao": return esc(v.join(" · "));
      case "ref": return linkRegistro(campo.entidade, v);
      case "refs": return vinculos(campo.entidade, v);
      case "url": return `<a class="link" href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v)} ↗</a>`;
      case "booleano": return v ? "Sim" : "Não";
      case "numero": return campo.nome === "percentual" ? progresso(v) : esc(v);
      case "anexos": return `${v.length} arquivo${v.length > 1 ? "s" : ""}`;
      case "interacoes": return `${v.length} registro${v.length > 1 ? "s" : ""}`;
      default: return esc(v);
    }
  }

  // ---------- Formulário ----------
  function opcoesUsuarios(atual) {
    const nomes = RT.repositorio.listar("usuarios").filter(u => u.ativo !== false).map(u => u.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
    if (atual && !nomes.includes(atual)) nomes.unshift(atual);
    return nomes;
  }

  function campoFormulario(entidade, campo, valorAtual, erro, ctx) {
    const id = `f-${campo.nome}`;
    const obrig = campo.obrigatorio ? ` <span class="obrig" aria-hidden="true">*</span>` : "";
    const attrs = `id="${id}" name="${campo.nome}"${campo.obrigatorio ? " required" : ""}${erro ? ' aria-invalid="true"' : ""} aria-describedby="${id}-msg"`;
    const largo = ["textoLongo", "refs", "multiOpcao", "anexos"].includes(campo.tipo) || campo.nome === "titulo" || campo.nome === "nome" || campo.nome === "assunto";
    let entrada = "";
    const v = valorAtual === undefined || valorAtual === null ? "" : valorAtual;

    switch (campo.tipo) {
      case "textoLongo":
        entrada = `<textarea ${attrs} rows="4">${esc(v)}</textarea>`; break;
      case "numero":
        entrada = `<input ${attrs} type="number" value="${esc(v)}"${campo.min !== undefined ? ` min="${campo.min}"` : ""}${campo.max !== undefined ? ` max="${campo.max}"` : ""}>`; break;
      case "data":
        entrada = `<input ${attrs} type="date" value="${esc(v)}">`; break;
      case "email":
        entrada = `<input ${attrs} type="email" value="${esc(v)}" maxlength="255">`; break;
      case "url":
        entrada = `<input ${attrs} type="url" value="${esc(v)}" placeholder="https://" maxlength="255">`; break;
      case "booleano":
        entrada = `<label class="check"><input type="checkbox" id="${id}" name="${campo.nome}"${v ? " checked" : ""}> ${esc(campo.rotulo)}</label>`;
        return `<div class="campo${largo ? " inteiro" : ""}">${entrada}<span class="erro-msg" id="${id}-msg">${esc(erro || "")}</span></div>`;
      case "opcao": {
        const opcoes = campo.nome === "status" ? RT.regras.opcoesDeStatus(entidade, ctx.registro, ctx.usuario) : campo.opcoes;
        entrada = `<select ${attrs}><option value="">Selecione</option>${opcoes.map(o => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
        break;
      }
      case "usuario":
        entrada = `<select ${attrs}><option value="">${campo.obrigatorio ? "Selecione" : "Ninguém definido"}</option>${opcoesUsuarios(v).map(n => `<option${n === v ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
        break;
      case "ref": {
        const regs = RT.repositorio.listar(campo.entidade).filter(r => !RT.esquema[campo.entidade].versionada || r.situacao === "Vigente");
        entrada = `<select ${attrs}><option value="">Selecione</option>${regs.map(r => `<option value="${esc(r.codigo)}"${r.codigo === v ? " selected" : ""}>${esc(r.codigo)} · ${esc(RT.esquema[campo.entidade].titulo(r))}</option>`).join("")}</select>`;
        break;
      }
      case "multiOpcao": {
        const sel = Array.isArray(v) ? v : [];
        entrada = `<div class="grupo-check" role="group" aria-labelledby="${id}-rot">${campo.opcoes.map(o => `<label class="check"><input type="checkbox" name="${campo.nome}" value="${esc(o)}"${sel.includes(o) ? " checked" : ""}> ${esc(o)}</label>`).join("")}</div>`;
        return `<div class="campo inteiro"><span class="rotulo" id="${id}-rot">${esc(campo.rotulo)}${obrig}</span>${entrada}<span class="erro-msg" id="${id}-msg">${esc(erro || "")}</span></div>`;
      }
      case "refs": {
        const sel = Array.isArray(v) ? v : [];
        const regs = RT.repositorio.listar(campo.entidade)
          .filter(r => r.codigo !== (ctx.registro && ctx.registro.codigo) || campo.entidade !== entidade)
          .filter(r => !RT.esquema[campo.entidade].versionada || r.situacao === "Vigente");
        entrada = regs.length
          ? `<div class="lista-check" role="group" aria-labelledby="${id}-rot">${regs.map(r => `<label class="check"><input type="checkbox" name="${campo.nome}" value="${esc(r.codigo)}"${sel.includes(r.codigo) ? " checked" : ""}> <span class="codigo">${esc(r.codigo)}</span> ${esc(RT.esquema[campo.entidade].titulo(r))}</label>`).join("")}</div>`
          : `<p class="muted">Nenhum registro cadastrado em ${esc(RT.esquema[campo.entidade].rotulo)}.</p>`;
        return `<div class="campo inteiro"><span class="rotulo" id="${id}-rot">${esc(campo.rotulo)}${obrig}</span>${entrada}<span class="erro-msg" id="${id}-msg">${esc(erro || "")}</span></div>`;
      }
      case "anexos": {
        const lista = Array.isArray(v) ? v : [];
        entrada = `
          <div class="anexos-atuais">${lista.length ? lista.map(a => `<div class="arquivo-linha"><span class="arquivo-icone">${esc((a.nome.split(".").pop() || "").toUpperCase())}</span><span>${esc(a.nome)} <span class="muted">· ${fmtTamanho(a.tamanho)} · versão ${esc(a.versao)} · ${esc(a.enviadoPor)} em ${fmtData(a.enviadoEm)}</span></span></div>`).join("") : `<p class="muted">Nenhum arquivo anexado.</p>`}</div>
          <input type="file" id="${id}" data-anexos="${campo.nome}" multiple accept="${RT.listas.extensoesAnexo.map(e => "." + e).join(",")}">
          <div class="anexos-novos" data-anexos-novos="${campo.nome}"></div>
          <span class="ajuda">${RT.listas.extensoesAnexo.join(", ").toUpperCase()}, até ${RT.config.anexoMaxMB} MB. O portal confere o conteúdo real do arquivo, não só a extensão. ${RT.config.modoSharePoint ? "Os arquivos são enviados à biblioteca do SharePoint quando você salvar." : "No modo demonstração, o arquivo fica disponível só enquanto a página estiver aberta."}</span>`;
        return `<div class="campo inteiro"><label class="rotulo" for="${id}">${esc(campo.rotulo)}</label>${entrada}<span class="erro-msg" id="${id}-msg">${esc(erro || "")}</span></div>`;
      }
      default:
        entrada = `<input ${attrs} type="text" value="${esc(v)}"${campo.max ? ` maxlength="${campo.max}"` : ""}${campo.formato === "mesAno" ? ' placeholder="MM/AAAA" inputmode="numeric"' : ""}>`;
    }
    const ajuda = campo.ajuda ? `<span class="ajuda">${esc(campo.ajuda)}</span>` : "";
    return `<div class="campo${largo ? " inteiro" : ""}"><label for="${id}">${esc(campo.rotulo)}${obrig}</label>${entrada}${ajuda}<span class="erro-msg" id="${id}-msg">${esc(erro || "")}</span></div>`;
  }

  function lerFormulario(form, entidade, anexosPendentes) {
    const ent = RT.esquema[entidade];
    const dados = {};
    for (const c of ent.campos) {
      if (c.sistema) continue;
      if (c.tipo === "multiOpcao" || c.tipo === "refs") {
        dados[c.nome] = [...form.querySelectorAll(`input[name="${c.nome}"]:checked`)].map(i => i.value);
      } else if (c.tipo === "booleano") {
        const el = form.querySelector(`[name="${c.nome}"]`);
        dados[c.nome] = el ? el.checked : false;
      } else if (c.tipo === "anexos") {
        continue; // tratado por quem chama
      } else {
        const el = form.querySelector(`[name="${c.nome}"]`);
        if (!el) continue;
        dados[c.nome] = c.tipo === "numero" ? (el.value === "" ? "" : Number(el.value)) : el.value.trim();
      }
    }
    return dados;
  }

  function mostrarErros(form, erros) {
    form.querySelectorAll(".erro-msg").forEach(e => { e.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    let primeiro = null;
    for (const [nome, msg] of Object.entries(erros)) {
      const alvo = form.querySelector(`#f-${nome}-msg`);
      if (alvo) alvo.textContent = msg;
      const el = form.querySelector(`#f-${nome}`) || form.querySelector(`[name="${nome}"]`);
      if (el) { el.setAttribute("aria-invalid", "true"); primeiro = primeiro || el; }
    }
    if (primeiro) primeiro.focus();
  }

  // ---------- Modal ----------
  function modal({ titulo, texto, campos, confirmar, perigo, cancelar }) {
    return new Promise(resolve => {
      const raiz = document.getElementById("modal");
      raiz.innerHTML = `
        <div class="modal-fundo" data-fechar></div>
        <form class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" novalidate>
          <h2 id="modal-titulo">${esc(titulo)}</h2>
          ${texto ? `<p class="modal-texto">${texto}</p>` : ""}
          ${(campos || []).map(c => `<div class="campo"><label for="m-${c.nome}">${esc(c.rotulo)}${c.obrigatorio ? ' <span class="obrig">*</span>' : ""}</label>${c.tipo === "textoLongo" ? `<textarea id="m-${c.nome}" name="${c.nome}" rows="${c.linhas || 3}">${esc(c.valor || "")}</textarea>` : `<input id="m-${c.nome}" name="${c.nome}" type="${c.tipo === "data" ? "date" : "text"}" value="${esc(c.valor || "")}" autocomplete="off">`}<span class="erro-msg"></span></div>`).join("")}
          <div class="modal-acoes">
            <button type="button" class="botao" data-fechar>${esc(cancelar || "Cancelar")}</button>
            <button type="submit" class="botao ${perigo ? "perigo" : "primario"}">${esc(confirmar || "Confirmar")}</button>
          </div>
        </form>`;
      raiz.hidden = false;
      const form = raiz.querySelector("form");
      const anterior = document.activeElement;
      const fechar = resultado => {
        raiz.hidden = true; raiz.innerHTML = "";
        document.removeEventListener("keydown", tecla);
        if (anterior && anterior.focus) anterior.focus();
        resolve(resultado);
      };
      const tecla = e => {
        if (e.key === "Escape") fechar(null);
        // Mantém o foco do teclado dentro da janela enquanto ela estiver aberta
        if (e.key === "Tab") {
          const focaveis = [...form.querySelectorAll("input, textarea, button")];
          const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
          if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
          else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
        }
      };
      document.addEventListener("keydown", tecla);
      raiz.querySelectorAll("[data-fechar]").forEach(el => el.addEventListener("click", () => fechar(null)));
      form.addEventListener("submit", e => {
        e.preventDefault();
        const valores = {};
        let ok = true;
        for (const c of campos || []) {
          const el = form.querySelector(`[name="${c.nome}"]`);
          valores[c.nome] = el.value.trim();
          const msg = el.parentElement.querySelector(".erro-msg");
          msg.textContent = "";
          if (c.obrigatorio && !valores[c.nome]) { msg.textContent = "Campo obrigatório."; ok = false; }
          if (c.igual && valores[c.nome] !== c.igual) { msg.textContent = `Digite ${c.igual} para confirmar.`; ok = false; }
        }
        if (ok) fechar(valores);
      });
      const foco = form.querySelector("input, textarea") || form.querySelector("button[type=submit]");
      foco.focus();
    });
  }

  // ---------- Avisos ----------
  function toast(mensagem, tipo) {
    const raiz = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = `toast ${tipo || ""}`;
    el.setAttribute("role", tipo === "erro" ? "alert" : "status");
    el.textContent = mensagem;
    raiz.appendChild(el);
    setTimeout(() => el.remove(), tipo === "erro" ? 9000 : 4500);
  }

  return {
    esc, fmtData, fmtDataCurta, fmtDataHora, fmtTamanho, tag, prio, natureza, linkRegistro, vinculos, progresso, valor,
    rotaRegistro, campoFormulario, lerFormulario, mostrarErros, modal, toast
  };
})();
