/*
 * Login corporativo pelo Entra ID (MSAL.js) para o modo SharePoint.
 * O token é pedido em nome do usuário: o portal só consegue ler e gravar o que o próprio
 * usuário pode ler e gravar no site do SharePoint.
 */
window.RT = window.RT || {};

RT.auth = (function () {
  const ESCOPO_PADRAO = ["Sites.ReadWrite.All"];
  let app = null;
  let conta = null;

  async function iniciar() {
    if (typeof msal === "undefined") {
      throw new Error("A biblioteca de login da Microsoft (js/vendor/msal-browser-3.28.1.min.js) não carregou.");
    }
    app = new msal.PublicClientApplication({
      auth: {
        clientId: RT.config.clientId,
        authority: `https://login.microsoftonline.com/${RT.config.tenantId}`,
        redirectUri: location.origin + location.pathname
      },
      // Só o token de acesso fica na sessão do navegador; nenhum dado do portal é guardado ali
      cache: { cacheLocation: "sessionStorage" }
    });
    if (app.initialize) await app.initialize();
    const resposta = await app.handleRedirectPromise();
    conta = (resposta && resposta.account) || app.getAllAccounts()[0] || null;
    return conta;
  }

  function entrar() { return app.loginRedirect({ scopes: ESCOPO_PADRAO }); }

  // Encerra a sessão só neste portal: apaga os tokens guardados na aba, sem sair das
  // outras aplicações Microsoft da pessoa
  async function encerrarLocal() {
    if (app && app.clearCache) await app.clearCache({ account: conta });
    conta = null;
  }
  function sair() { return app.logoutRedirect({ account: conta }); }
  function contaAtual() { return conta; }

  // Papéis (app roles) atribuídos ao usuário no Entra ID, vindos do token assinado
  function papeis() {
    return (conta && conta.idTokenClaims && conta.idTokenClaims.roles) || [];
  }

  async function token(escopos) {
    const scopes = escopos || ESCOPO_PADRAO;
    try {
      const r = await app.acquireTokenSilent({ scopes, account: conta });
      return r.accessToken;
    } catch (e) {
      if (e instanceof msal.InteractionRequiredAuthError) {
        await app.acquireTokenRedirect({ scopes, account: conta });
        return new Promise(() => { }); // a página será redirecionada
      }
      throw e;
    }
  }

  return { iniciar, entrar, sair, encerrarLocal, contaAtual, papeis, token };
})();
