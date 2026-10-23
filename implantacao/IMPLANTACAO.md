# Implantação do Portal da Reforma Tributária (Etapa 4)

Roteiro para a TI colocar o portal em homologação e depois em produção. Nada aqui foi executado num tenant real: siga em homologação primeiro.

## Visão geral

```
Navegador ──(login Entra ID / MSAL)──► Azure Static Web Apps (só arquivos estáticos, exige login)
    │
    └──(Microsoft Graph, token do próprio usuário)──► Site do SharePoint
                                                       ├─ 12 listas RT_* (dados)
                                                       └─ biblioteca RT_Documentos (anexos)
```

O portal não tem servidor próprio nem banco próprio. Os dados e os documentos ficam no SharePoint, sob as políticas de retenção, DLP, auditoria e backup do Microsoft 365 da empresa.

## 1. Site do SharePoint

1. Criar um site de equipe **privado**, sem grupo do Microsoft 365 associado se possível (ex.: `/sites/ReformaTributaria`).
2. Manter o grupo padrão de Membros vazio: o acesso será dado pelos grupos `RT *` criados no passo 4.
3. Se a empresa usa rótulos de confidencialidade, aplicar o rótulo adequado ao site (ex.: Confidencial).

## 2. Registro do aplicativo no Entra ID

1. **Novo registro**, conta somente deste diretório (single tenant).
2. **Plataforma:** Aplicativo de página única (SPA).
   - URIs de redirecionamento: o endereço exato do portal em produção e, para testes, `http://localhost:8765/`.
3. **Permissões delegadas do Microsoft Graph:**
   - `Sites.ReadWrite.All` para o uso diário;
   - `Sites.Manage.All` só para o administrador criar listas.

   Conforme a política do tenant, pode ser preciso consentimento do administrador. Alternativa de menor privilégio: `Sites.Selected` com acesso concedido só a este site (e ao site da pasta de pareceres, se for outro).

   Se a pasta onde chegam os pareceres (`pastaPareceres`) estiver num **OneDrive pessoal**, inclua também `Files.Read.All`. Pastas do SharePoint e do Teams já são cobertas por `Sites.ReadWrite.All`.
4. **Papéis do aplicativo** (opcional, para `perfisPeloEntra: true`). Criar quatro papéis do tipo *Usuários/Grupos*:

   | Nome exibido | Valor |
   |---|---|
   | Administrador do portal | `Portal.Administrador` |
   | Gestor | `Portal.Gestor` |
   | Colaborador | `Portal.Colaborador` |
   | Consulta | `Portal.Consulta` |

   Em *Aplicativos empresariais*, atribuir os papéis a grupos de segurança e ligar "Atribuição obrigatória" para que só quem tem papel consiga entrar.
5. Preencher `js/config.js` com `tenantId`, `clientId`, `siteUrl`, `administradoresIniciais` e, se for o caso, `perfisPeloEntra: true`.

## 3. Criar listas e biblioteca

Entrar no portal com uma conta de administrador e, em **Administração**, clicar em **Criar listas e biblioteca que faltam**. São criadas 12 listas `RT_*` e a biblioteca `RT_Documentos`.

**Ao publicar uma versão nova do portal**, repita o mesmo caminho: **Verificar listas** mostra listas e colunas novas, e **Criar listas e biblioteca que faltam** cria o que faltar. Isso não mexe nos dados que já estão nas listas. Se for criada uma lista nova, rode de novo o script de permissões do passo 4.

## 4. Permissões no SharePoint

As regras de perfil do portal controlam o que a tela oferece. **Quem protege os dados de verdade são as permissões do site**, porque qualquer usuário com acesso ao site pode abrir as listas direto no SharePoint.

Rodar [configurar-permissoes.ps1](configurar-permissoes.ps1) (PowerShell 7 + PnP.PowerShell). O script:

- cria os grupos `RT Administradores`, `RT Gestores`, `RT Colaboradores` e `RT Consulta`;
- quebra a herança de cada lista e aplica a matriz descrita no cabeçalho do script;
- impede a exclusão de itens e versões para todos, exceto administradores;
- deixa o histórico (`RT_Historico`) só com inclusão: ninguém edita registros de auditoria;
- liga o versionamento (100 versões nas listas, 500 na biblioteca).

Depois, colocar as pessoas nos grupos `RT *` conforme o perfil, e cadastrar as mesmas pessoas em Administração › Usuários.

### Controles que dependem do servidor

| Risco | Proteção |
|---|---|
| Alguém alterar dados pelo SharePoint, fora do portal | Permissões por lista do passo 4 |
| Alguém marcar um parecer como aprovado sem ser gestor | O portal só considera a aprovação verificada quando o registro no histórico foi gravado (segundo o próprio SharePoint) por alguém cadastrado como Gestor. Caso contrário, mostra "Aprovação não verificada" |
| Alteração ou exclusão do histórico | Nível "RT Adicionar sem editar" na lista de histórico |
| Exclusão acidental | Sem permissão de exclusão para não administradores; lixeira do SharePoint |
| Arquivo malicioso | O portal confere extensão, tamanho e assinatura do arquivo. Recomendado ligar o Microsoft Defender para Office 365 (Anexos Seguros para SharePoint) |
| Acesso anônimo ao portal | Static Web Apps com login obrigatório (passo 5) e nenhum dado nos arquivos estáticos |

## 5. Hospedagem (Azure Static Web Apps)

1. Criar um Static Web App no plano **Standard** (o plano gratuito não permite restringir o login ao tenant da empresa).
2. Gerar o pacote com `implantacao\empacotar.ps1` e publicar só o conteúdo dele. O pacote leva apenas `index.html`, `js/` e `staticwebapp.config.json`; testes, documentação e scripts ficam de fora. Veja [OPERACAO.md](OPERACAO.md).
3. Em [staticwebapp.config.json](../staticwebapp.config.json), trocar `<TENANT_ID>`. Criar as configurações `AAD_CLIENT_ID` e `AAD_CLIENT_SECRET` com um segundo registro de aplicativo (tipo Web), usado só pela plataforma para exigir login antes de servir qualquer arquivo.
4. O mesmo arquivo define cabeçalhos de segurança. A Content-Security-Policy só permite scripts do próprio site e conexões com Graph, login da Microsoft e SharePoint.
5. Incluir o endereço definitivo como URI de redirecionamento SPA no registro do passo 2.

A biblioteca de login (MSAL.js 3.28.1) é servida junto com o portal, em `js/vendor/`. SHA-256 do arquivo: `81FC17A81C9C822131DB9BF3A3CB64FF35A5096B8E6B059EF18B2439CEAF058F`.

Alternativa: qualquer servidor web interno com HTTPS e autenticação integrada serve, desde que aplique cabeçalhos equivalentes.

## 6. Backup e recuperação

| O quê | Como |
|---|---|
| Item alterado por engano | Histórico de versões da lista (passo 4) ou histórico do portal |
| Item ou arquivo excluído | Lixeira do site (1º e 2º estágio, até 93 dias) |
| Perda maior | Política de retenção do Microsoft Purview aplicada ao site e, se contratado, Microsoft 365 Backup |
| Auditoria | Log de auditoria do Microsoft Purview (acessos e alterações no SharePoint) e lista `RT_Historico` |

Teste de restauração recomendado a cada semestre: excluir um item de teste, recuperar pela lixeira e conferir o histórico.

## 7. Antes da produção

- [ ] Testes automatizados (`/tests/`) todos passando na versão a publicar
- [ ] Roteiro de testes com usuários de [TESTES.md](TESTES.md) aplicado em homologação
- [ ] Login testado em homologação com uma pessoa de cada perfil
- [ ] Script de permissões rodado e conferido lista a lista
- [ ] Colaborador consegue editar só o que deve e não consegue excluir
- [ ] Anexo enviado, baixado e visível na biblioteca `RT_Documentos`
- [ ] Aprovação de parecer aparece como "verificada"
- [ ] Dados de demonstração removidos (Administração)
- [ ] Área tributária conferiu normas e marcos legais
