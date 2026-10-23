/*
 * Configuração do portal.
 *
 * Com os campos do SharePoint em branco, o portal roda em MODO DEMONSTRAÇÃO:
 * dados fictícios em memória, que voltam ao estado inicial ao recarregar a página.
 *
 * Para gravar no SharePoint, preencha tenantId, clientId e siteUrl (os três são obrigatórios)
 * e o seu e-mail em administradoresIniciais, depois que a TI:
 *   1. criar o site do SharePoint que vai guardar as listas;
 *   2. registrar o aplicativo no Entra ID como "Aplicativo de página única (SPA)",
 *      com o endereço do portal como URI de redirecionamento;
 *   3. conceder as permissões delegadas do Microsoft Graph listadas em implantacao/IMPLANTACAO.md.
 * Passo a passo com exemplos: docs/PASSO-A-PASSO-DADOS-REAIS.md, Parte 2.
 * Nenhum segredo é guardado aqui: tenantId e clientId são identificadores públicos.
 * Regras de escrita: textos entre aspas, uma vírgula no fim de cada linha, listas entre [ ].
 */
window.RT = window.RT || {};

RT.config = {
  // Identidade visual. O logotipo padrão está embutido no index.html; para trocar,
  // informe o caminho de uma imagem publicada junto com o portal (ex.: "img/logo.png").
  // As cores ficam nas variáveis --marca-* no início do CSS do index.html.
  nomePortal: "Portal da Reforma Tributária",
  logo: "",
  logoTextoAlternativo: "Grupo Equatorial Energia",

  // ID do locatário (tenant) do Entra ID. Ex.: "00000000-0000-0000-0000-000000000000"
  tenantId: "",

  // ID do aplicativo (client) registrado no Entra ID.
  clientId: "",

  // Endereço do site do SharePoint. Ex.: "https://empresa.sharepoint.com/sites/ReformaTributaria"
  siteUrl: "",

  // E-mails que entram como Administrador enquanto a lista de usuários estiver vazia.
  administradoresIniciais: [],

  // Prefixo dos nomes das listas criadas no site.
  prefixoListas: "RT_",

  // Biblioteca de documentos onde ficam os anexos (recebe o prefixo acima).
  bibliotecaDocumentos: "Documentos",

  // Pasta do SharePoint, Teams ou OneDrive onde chegam os pareceres. Cole o endereço da pasta
  // (aberta no navegador) ou um link de compartilhamento dela. Em branco, o botão
  // "Documentos da pasta" só oferece a escolha de arquivos do computador.
  pastaPareceres: "",
  pastaIncluirSubpastas: true,

  // Tamanho máximo de anexo, em MB.
  anexoMaxMB: 50,

  // Minutos sem uso até a sessão do portal ser encerrada (modo SharePoint).
  sessaoMinutos: 30,

  // true: o perfil vem dos papéis (app roles) atribuídos no Entra ID.
  // false: o perfil vem da lista de usuários do portal.
  perfisPeloEntra: false,

  // Valor de cada papel no registro do aplicativo -> perfil do portal
  papeisEntra: {
    "Portal.Administrador": "Administrador",
    "Portal.Gestor": "Gestor",
    "Portal.Colaborador": "Colaborador",
    "Portal.Consulta": "Consulta"
  }
};

RT.config.modoSharePoint = Boolean(RT.config.tenantId && RT.config.clientId && RT.config.siteUrl);
