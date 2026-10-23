# Passo a passo: colocar dados reais no portal e mantê-los salvos

## Antes de começar: por que hoje nada fica salvo

Aberto com duplo clique, o portal roda em **modo demonstração**. Os dados ficam só na memória da página e somem ao recarregar. Isso é proposital: o portal não guarda dados no navegador, porque dados compartilhados entre pessoas e documentos confidenciais precisam ficar num lugar seguro e central.

Para os dados ficarem salvos, o portal precisa ser ligado a um **site do SharePoint** da empresa. Depois disso:
- cada cadastro vira um item numa lista do SharePoint;
- cada arquivo anexado vai para uma biblioteca de documentos;
- tudo fica salvo, com backup, versões e permissões do Microsoft 365.

São necessárias três coisas:

| # | O quê | Quem consegue fazer |
|---|---|---|
| 1 | Um site do SharePoint para o projeto | TI, ou você, se tiver permissão para criar sites |
| 2 | O registro do portal como aplicativo no Entra ID (o "Azure AD") | **Só a TI** (exige administrador do Entra ID) |
| 3 | Preencher o arquivo `js/config.js` com os dados dos itens 1 e 2 | Você |

O caminho completo tem 8 partes. As partes 1 e 7 dependem da TI; as demais você mesmo faz.

---

## Parte 1 — Pedir à TI o site e o registro do aplicativo

### 1.1 O que pedir

Copie, ajuste e envie à TI:

> **Assunto:** Portal da Reforma Tributária — site do SharePoint e registro de aplicativo
>
> Preciso de dois itens para colocar em uso o portal interno de acompanhamento da Reforma Tributária. É uma página web estática que grava dados no SharePoint pelo Microsoft Graph, com o login do próprio usuário.
>
> **1. Site do SharePoint**
> - Site de equipe privado, ex.: `https://<empresa>.sharepoint.com/sites/ReformaTributaria`
> - Eu como proprietário (preciso criar listas pelo portal)
>
> **2. Registro de aplicativo no Entra ID**
> - Nome: Portal Reforma Tributária
> - Contas: somente deste diretório (single tenant)
> - Plataforma: **Aplicativo de página única (SPA)**
> - URI de redirecionamento: `http://localhost:8765/` (testes) e, depois, o endereço definitivo
> - Permissões **delegadas** do Microsoft Graph: `Sites.ReadWrite.All` e `Sites.Manage.All`, com consentimento do administrador, se a política exigir. Se a pasta onde chegam os pareceres estiver num OneDrive pessoal (e não no SharePoint ou no Teams), também `Files.Read.All`
> - Sem segredo de cliente (é uma SPA)
>
> Preciso que me devolvam: **ID do diretório (tenant)**, **ID do aplicativo (cliente)** e o **endereço do site**.
>
> O roteiro técnico completo está no arquivo `implantacao/IMPLANTACAO.md` do projeto.

Anexe ou indique o arquivo [implantacao/IMPLANTACAO.md](../implantacao/IMPLANTACAO.md): ele tem os detalhes técnicos que a TI vai querer ver.

### 1.2 O que você recebe de volta

Três informações. Anote-as:

| Informação | Formato | Exemplo (fictício) |
|---|---|---|
| ID do diretório (tenant ID) | 36 caracteres com hífens | `3f2a1b4c-0000-0000-0000-9d8e7f6a5b4c` |
| ID do aplicativo (client ID) | 36 caracteres com hífens | `a1b2c3d4-0000-0000-0000-112233445566` |
| Endereço do site | `https://….sharepoint.com/sites/…` | `https://empresa.sharepoint.com/sites/ReformaTributaria` |

Nenhum dos três é senha. Podem ficar no arquivo de configuração sem risco.

---

## Parte 2 — Preencher o arquivo de configuração

1. Abra a pasta do projeto: `Teste 1 - Projeto Site RT`.
2. Entre na pasta `js` e abra o arquivo **`config.js`** com o Bloco de Notas ou o VS Code. Clique com o botão direito › Abrir com.
3. Localize estas linhas e preencha **entre as aspas**:

   ```js
   tenantId: "3f2a1b4c-0000-0000-0000-9d8e7f6a5b4c",
   clientId: "a1b2c3d4-0000-0000-0000-112233445566",
   siteUrl: "https://empresa.sharepoint.com/sites/ReformaTributaria",
   ```

4. Na linha `administradoresIniciais`, coloque **o seu e-mail corporativo**. Isso garante que você entre como administrador na primeira vez, antes de existir qualquer usuário cadastrado:

   ```js
   administradoresIniciais: ["seu.nome@empresa.com.br"],
   ```

5. **Pasta onde chegam os pareceres.** Se a equipe guarda os pareceres numa pasta do SharePoint, Teams ou OneDrive, cole o endereço dela em `pastaPareceres`:
   - abra a pasta no navegador e copie o endereço da barra; ou
   - no SharePoint, use **Copiar link** na pasta.

   ```js
   pastaPareceres: "https://empresa.sharepoint.com/sites/ReformaTributaria/Documentos%20Compartilhados/Pareceres",
   ```

   No Teams, a pasta de um canal fica em **Arquivos** › **Abrir no SharePoint**: copie o endereço que abrir.
6. Salve o arquivo (Ctrl+S). No Bloco de Notas, confira se a codificação é **UTF-8**.

**Cuidados**
- Não apague vírgulas nem aspas. Cada linha termina com vírgula.
- O `siteUrl` é o endereço do site, sem `/SitePages/…` ou `/Lists/…` no final.
- Se algum dos três campos ficar vazio, o portal continua em modo demonstração.

---

## Parte 3 — Abrir o portal ligado ao SharePoint (no seu computador)

O login da Microsoft não funciona com o arquivo aberto por duplo clique. É preciso abrir o portal por um endereço `http://localhost`.

1. Confira se o Python está instalado. Abra o PowerShell e digite:
   ```bash
   python --version
   ```
   Deve aparecer algo como `Python 3.13`. Se não aparecer, peça à TI para instalar o Python.
2. No Explorador de Arquivos, abra a pasta do projeto. Clique na barra de endereço, digite `powershell` e tecle Enter: o PowerShell abre já nessa pasta.
3. Rode:
   ```bash
   python -m http.server 8765 --bind 127.0.0.1
   ```
   **Deixe essa janela aberta** enquanto usar o portal. Fechá-la desliga o portal no seu computador.
4. No Edge ou no Chrome, acesse **`http://localhost:8765`**.
5. Aparece a tela "Entre com sua conta corporativa". Clique em **Entrar com a conta corporativa** e use seu login da empresa.
6. Se aparecer um pedido de permissão da Microsoft, aceite. Se ele disser que é preciso aprovação de um administrador, peça à TI o consentimento do item 1.1.

**Como saber que deu certo**
- A faixa "Modo demonstração" no topo **não aparece mais**.
- No canto superior direito aparece **seu nome** e um botão **Sair**, em vez de "Simular acesso como".
- Em **Administração** › "Onde os dados estão", aparece **Conectado** e o endereço do site.

Neste momento o portal está vazio. Isso é esperado: as listas ainda não existem.

---

## Parte 4 — Criar as listas no SharePoint

Feito uma única vez, por você como administrador.

1. No portal, vá em **Administração** (último item do menu).
2. Clique em **Verificar listas**. Deve aparecer "Faltam 13": são 12 listas e 1 biblioteca de documentos.
3. Clique em **Criar listas e biblioteca que faltam**. Aguarde a mensagem de progresso.
4. Se a Microsoft pedir uma permissão adicional (`Sites.Manage.All`), aceite. O portal só usa essa permissão para criar as listas.
5. Clique de novo em **Verificar listas**. Deve aparecer "Todas as listas e a biblioteca de documentos existem no site".
6. Recarregue a página (F5).

**Conferir no SharePoint:** abra o endereço do site › **Conteúdo do site**. Devem aparecer:
- 12 listas `RT_Pareceres`, `RT_Perguntas`, `RT_Atividades`, `RT_Impactos`, `RT_Adequacoes`, `RT_Testes`, `RT_Defeitos`, `RT_Normas`, `RT_Marcos`, `RT_Decisoes`, `RT_Usuarios` e `RT_Historico`;
- a biblioteca `RT_Documentos`.

> **Não** clique em "Carregar dados de demonstração" neste site, que é o de dados reais. Se clicar por engano, use **Remover dados de demonstração** (Parte 8).

---

## Parte 5 — Cadastrar as pessoas

O perfil de cada pessoa define o que ela pode fazer. Cadastre-as antes de chamar a equipe.

1. **Administração** › **Novo usuário**.
2. Preencha:
   - **Nome** e **e-mail corporativo**, exatamente como no login da Microsoft;
   - **Área**;
   - **Perfil**: Administrador, Gestor, Colaborador ou Consulta;
   - **Ativo** marcado.
3. Clique em **Salvar**. Repita para cada pessoa.
4. Cadastre **você mesmo** primeiro, como Administrador.

**Quem deve ser Gestor:** quem aprova pareceres e registra decisões. A "Aprovação verificada" só aparece quando quem aprovou consta como **Gestor** nesta lista.

**Atenção:** o Administrador configura o portal, mas **não aprova pareceres**, por desenho. Se você também for aprovar, cadastre-se como **Gestor** e peça que outra pessoa seja o Administrador. Ou mantenha seu e-mail em `administradoresIniciais` só enquanto a lista estiver vazia.

---

## Parte 6 — Cadastrar os dados reais

### 6.1 Em que ordem

Os módulos se ligam uns aos outros: uma ação aponta para um parecer, um teste aponta para uma adequação. Por isso a ordem importa. Siga esta, para que, ao cadastrar algo, aquilo a que ele se liga já exista:

| Ordem | Módulo | Onde | Botão |
|---|---|---|---|
| 1 | Normas | Legislação e cronograma | **Nova norma** |
| 2 | Marcos do cronograma | Legislação e cronograma | **Novo marco** |
| 3 | Pareceres e estudos | Pareceres e estudos | **Novo parecer** |
| 4 | Ações do plano | Plano de implementação | **Nova ação** |
| 5 | Impactos | Mapeamento de impactos | **Novo impacto** |
| 6 | Adequações sistêmicas | Sistemas e testes › Adequações | **Nova adequação** |
| 7 | Cenários de teste | Sistemas e testes › Cenários de teste | **Novo cenário** |
| 8 | Defeitos | Sistemas e testes › Defeitos | **Novo defeito** (ou "Registrar defeito" num teste reprovado) |
| 9 | Decisões | Decisões e diretrizes | **Registrar decisão** |
| 10 | Perguntas e respostas | Perguntas e respostas | **Nova pergunta** |

Se não der para seguir a ordem, não tem problema: cadastre e depois volte em **Editar** para marcar os vínculos.

### 6.2 Como preencher cada cadastro

Vale para todos os módulos:
- Campos com <span style="color:#b8322a">*</span> são obrigatórios. O portal não deixa salvar sem eles e marca em vermelho o que falta.
- O **código** (PT-001, AT-001…) é criado pelo portal ao salvar. Não precisa inventar.
- Ao salvar, o registro vai na hora para o SharePoint, com seu nome e a data. Não existe botão "publicar".

Dicas por módulo:

**Normas**
- Cadastre só normas publicadas.
- O **Link para a fonte oficial** é obrigatório e precisa começar com `https://`.

**Marcos**
- Escolha a **natureza** com cuidado:
  - **Legal confirmado:** está em norma publicada. Exige indicar a norma ou a fonte;
  - **Previsão oficial:** depende de regulamentação ainda não publicada;
  - **Interno:** prazo do próprio projeto.
- Se a data ainda não existe, deixe **Data** em branco e escreva "Data a confirmar" em **Período ou observação da data**.

**Pareceres**
- O status inicial é **Recebido**. O portal não oferece "Aprovado" no formulário.
- Anexe o arquivo original em **Documento original e versões**. Formatos aceitos: PDF, DOCX, XLSX, PPTX, CSV, PNG e JPG, até 50 MB. O portal confere o conteúdo real do arquivo.
- Para aprovar: um **Gestor** abre o parecer com status **Análise concluída** e clica em **Aprovar internamente**.

- **Período de elaboração:** mês e ano em que o parecer foi feito, no formato `MM/AAAA` (ex.: `03/2026`).
- **Solicitações e retornos:** depois de salvar, abra o parecer e use **Registrar solicitação** (o que foi pedido, a quem) e **Registrar retorno** (o que voltou: versão do parecer, esclarecimento). Os registros formam a linha do tempo do parecer e não são apagados.

**Perguntas e respostas**
- A pergunta entra como **Aguardando resposta**. Para marcar **Respondida**, informe a resposta, quem respondeu e a data.
- Ligue a pergunta aos pareceres e normas que fundamentam a resposta: o parecer passa a mostrar a pergunta nos seus vínculos.

**Ações do plano**
- **Prazo previsto** é obrigatório.
- Para marcar como **Concluída**, informe a data de conclusão.
- Para **Bloqueada** ou **Cancelada**, descreva o motivo em **Riscos e impedimentos**.
- Em **Depende de**, marque as ações que precisam terminar antes.

**Impactos**
- Marque em **Ações para resolução** as ações que tratam o impacto.
- Marque em **Pareceres ou evidências** os documentos que o fundamentam.

**Testes**
- Para registrar **Aprovado** ou **Reprovado**, informe o resultado obtido, quem executou e quando.

**Decisões**
- Depois de salva, a decisão não é editada.
- Para mudar, use **Registrar nova versão**; a anterior fica como "Substituída".

### 6.3 Pareceres que já estão numa pasta: "Documentos da pasta"

Se os pareceres recebidos já estão numa pasta do SharePoint, Teams ou OneDrive, o portal lê essa pasta e transforma os arquivos em pareceres, sem baixar e anexar um por um.

**Antes:** o endereço da pasta precisa estar em `pastaPareceres`, no `js/config.js` (Parte 2, item 5). Quem for cadastrar precisa ter acesso de leitura à pasta.

**Passo a passo**
1. Vá em **Pareceres e estudos** › **Documentos da pasta**.
2. O portal lista os arquivos da pasta, incluindo as subpastas, com nome, subpasta, data e situação:
   - **Novo:** ainda não virou parecer;
   - **Já cadastrado: PT-0xx:** já foi cadastrado e não pode ser repetido.

   Arquivos em formato não aceito (`.msg`, `.zip`, `.xls` antigo…) são contados, mas não aparecem para seleção. Se alguém acabou de pôr arquivos na pasta, clique em **Atualizar lista**.
3. Marque os arquivos que quer cadastrar. A caixa no título da tabela marca todos os novos.
4. Na seção **Completar e cadastrar**, cada arquivo vira uma linha:
   - **Título:** sugerido pelo nome do arquivo (`Parecer_creditos_IBS.pdf` vira "Parecer creditos IBS"). Corrija se precisar;
   - **Recebido em:** sugerido pela data do arquivo na pasta;
   - **Tipo:** sugerido só para apresentações (`.pptx`);
   - **Tipo, Categoria, Origem, Área:** se forem iguais para vários arquivos, preencha uma vez na barra **Aplicar aos selecionados**;
   - **Descrição e objetivo:** preencha em cada linha.
5. Clique em **Cadastrar N pareceres**. Se faltar algum campo obrigatório, ele fica marcado em vermelho e só as linhas completas são cadastradas. As incompletas continuam selecionadas para você terminar depois.
6. Cada parecer cadastrado:
   - entra como **Recebido**;
   - recebe uma **cópia** do documento na biblioteca do portal, para que mover ou apagar o arquivo na pasta não afete o parecer;
   - guarda o **link do arquivo original** na pasta;
   - registra no histórico "Cadastrado a partir de pasta de documentos (…)".

O portal **não lê o conteúdo** dos documentos para preencher resumo ou conclusões: esses campos continuam sendo preenchidos por quem analisa o parecer.

**Sem pasta configurada**, ou no modo demonstração, a mesma tela aceita **arquivos escolhidos do computador**, com o mesmo fluxo.

### 6.4 Muitos dados em planilhas: tela "Importar planilha"

Se você já tem os dados em Excel, use **Importar planilha** (menu Gestão). A tela confere cada linha com as mesmas regras do cadastro manual e só grava depois da sua confirmação.

**Quem pode:** Gestor e Administrador. Usuários só podem ser importados pelo Administrador.

**Passo 1 — Baixar o modelo**
1. Menu **Importar planilha**.
2. Em **Módulo**, escolha o que vai importar. Por exemplo: Plano de implementação.
3. Clique em **Baixar modelo em Excel**. O arquivo tem três abas:
   - **Sobre:** como usar;
   - **a aba de dados:** com os títulos das colunas. Colunas com `*` são obrigatórias;
   - **Instruções:** cada coluna, se é obrigatória, o formato e os valores aceitos.

**Passo 2 — Preencher**
- **Uma linha por registro**, sem mudar os títulos das colunas. Se você já tem uma planilha, basta renomear os títulos para ficarem iguais aos do modelo, ou associar as colunas no Passo 4.
- **Código:** deixe em branco para o portal gerar. Preencha só para manter códigos antigos (ex.: `AT-120`) ou para uma linha citar outra da mesma planilha. Por exemplo, uma ação que depende de outra ação nova.
- **Datas:** pode usar células de data do Excel ou digitar `dd/mm/aaaa`.
- **Opções** (status, prioridade, área): escreva como está nas Instruções. Maiúsculas e minúsculas e falta de acento não atrapalham: "em andamento" vira "Em andamento".
- **Vários valores** (unidades, vínculos): separe com ponto e vírgula: `Distribuição; Transmissão` ou `AT-012; AT-033`.
- **Responsáveis:** o nome ou o e-mail de alguém já cadastrado em Usuários.
- **Percentual:** `60` ou `60%`.
- **Arquivos:** não entram pela planilha. Anexe-os pelo portal depois.
- **Limite:** 2.000 linhas por arquivo.

**Siga a ordem da seção 6.1 também nas importações.** Por exemplo, importe os pareceres antes das ações que citam esses pareceres. Vínculos com registros que ainda não existem aparecem como erro.

**Passo 3 — Enviar**
Em **Planilha**, escolha o arquivo `.xlsx`. Se ele tiver várias abas, o portal escolhe a de dados e pula "Sobre" e "Instruções". Você pode trocar a aba na lista.

**Passo 4 — Conferir as colunas**
O portal associa cada coluna da planilha a um campo pelo título. Confira a tabela "Coluna da planilha → Campo do portal":
- se alguma coluna ficou como **Ignorar esta coluna** e deveria entrar, escolha o campo certo;
- se aparecer o aviso **Campos obrigatórios sem coluna**, falta uma coluna obrigatória na planilha.

Clique em **Validar linhas**.

**Passo 5 — Revisar a validação**
O portal mostra quantas linhas foram lidas, quantas estão **prontas para gravar**, quantas estão **com erro** (não serão gravadas) e quantas estão **com aviso** (serão gravadas, mas merecem atenção). As linhas com problema aparecem primeiro, com o motivo. Exemplos:
- `Responsável pela execução: "Fulano" não está cadastrado como usuário`
- `Prazo previsto: data inválida "31/02/2026"`
- `Depende de: não existem em Plano de implementação: AT-999`
- `Status da análise: um parecer não entra aprovado…` (a aprovação é sempre feita no portal, por um gestor)
- Aviso: `Já existe um registro com o mesmo título` (possível duplicidade)

Para corrigir com calma, clique em **Baixar relatório de problemas**: ele traz as linhas com erro, o motivo e os valores originais.

**Passo 6 — Gravar**
Clique em **Gravar N linhas válidas** e confirme. As linhas com erro são ignoradas. Cada registro gravado:
- vai para o SharePoint, como num cadastro manual;
- fica no histórico com seu nome e o texto "Importado da planilha *arquivo.xlsx* (linha N)".

**Passo 7 — Corrigir e reenviar o que faltou**
Corrija na planilha **só as linhas que deram erro**, apague as que já foram gravadas e envie de novo. Se você reenviar uma linha já gravada, o portal avisa: "Código já existe" quando o código foi informado, ou "mesmo título" quando foi gerado.

### 6.5 Alternativa: colar direto no SharePoint (não recomendada)

A tela de importação é o caminho certo para cargas em lote. Colar direto na lista do SharePoint fica como último recurso, por exemplo se a tela estiver indisponível. Nesse caminho o formato precisa ser exato, senão o portal mostra dados errados.

**Como fazer**
1. No site do SharePoint, abra a lista (ex.: `RT_Atividades`).
2. Clique em **Editar no modo de grade**.
3. Prepare no Excel as colunas na mesma ordem da grade e siga as regras da tabela abaixo.
4. Copie as linhas do Excel e cole na grade (Ctrl+V). Clique em **Sair do modo de grade**.
5. No portal, recarregue a página (F5) e confira os registros.
6. Em **Administração**, confirme que não aparece o aviso de **Códigos repetidos**.

**Regras de formato**

| Coluna | Como preencher | Exemplo |
|---|---|---|
| **Título** | O código do registro, único, com o prefixo do módulo e 3 dígitos | `AT-001` |
| Datas (Prazo, Data de recebimento…) | Texto no formato ano-mês-dia | `2026-11-30` |
| Opções (Status, Prioridade, Área…) | Exatamente como aparece no portal, com acentos | `Em andamento` |
| Vínculos (Depende de, Pareceres, Ações…) | Lista entre colchetes, códigos entre aspas duplas | `["AT-012","AT-033"]` (ou `[]` se vazio) |
| Escolha múltipla (Unidades, Áreas) | Mesmo formato dos vínculos | `["Distribuição","Transmissão"]` |
| Anexos e evidências | Deixe `[]`; anexe os arquivos depois, pelo portal | `[]` |
| Número (Percentual, Ano) | Só o número | `60` |
| Arquivado / Dado de demonstração | **Não** | Não |
| Cadastrado por / Cadastrado em | Seu nome e a data e hora | `Maria Silva` / `2026-10-22T10:00:00` |

Prefixos dos códigos:

| Módulo | Prefixo |
|---|---|
| Pareceres | PT |
| Perguntas e respostas | QA |
| Ações | AT |
| Impactos | IM |
| Adequações | AS |
| Testes | CT |
| Defeitos | DF |
| Normas | NR |
| Marcos | MC |
| Decisões | DC |
| Usuários | US |

Decisões carregadas em lote também precisam de **Versão** = `1` e **Situação** = `Vigente`.

**Limitações da carga pela grade**
- Nada é validado: um valor fora do padrão só aparece como problema depois, no portal.
- Ela não gera histórico no portal, porque o portal não participou da gravação. O SharePoint registra quem colou.
- Arquivos não podem ser colados: anexe-os pelo portal depois.

---

## Parte 7 — Liberar o acesso para a equipe

Até aqui o portal roda **só no seu computador** (`localhost`): colegas não conseguem abri-lo. Para a equipe usar, a TI precisa:

1. **Aplicar as permissões no site:** rodar `implantacao/configurar-permissoes.ps1`. Ele cria os grupos `RT Gestores`, `RT Colaboradores`, `RT Consulta` e `RT Administradores` e impede exclusões indevidas. Depois, colocar cada pessoa no grupo do seu perfil.
2. **Publicar o portal num endereço da empresa:** você gera o pacote com o comando abaixo e entrega a pasta `dist\` à TI. A TI publica, por exemplo, no Azure Static Web Apps.
   ```bash
   powershell -ExecutionPolicy Bypass -File implantacao\empacotar.ps1
   ```
3. **Liberar o login no endereço definitivo:** incluir esse endereço como URI de redirecionamento no registro do aplicativo.

Depois disso, todos acessam pelo endereço definitivo, e os dados são os mesmos que você já cadastrou: eles estão no SharePoint, não no seu computador.

---

## Parte 8 — Conferir que os dados estão salvos

Faça estes testes depois dos primeiros cadastros:

| Teste | Resultado esperado |
|---|---|
| Recarregar a página (F5) | Os registros continuam lá |
| Fechar o navegador, abrir de novo e entrar | Os registros continuam lá |
| Abrir o site do SharePoint › `RT_Pareceres` | O parecer aparece como item da lista, com o código no Título |
| Abrir `RT_Documentos` › `Pareceres` › `PT-001` | O arquivo anexado está lá |
| Pedir a um colega cadastrado para entrar | Ele vê os mesmos dados |
| Abrir o registro no portal › Histórico | Aparece seu nome e "Gravado no SharePoint por" com seu e-mail |

Para limpar um site em que foram carregados dados fictícios: **Administração** › **Remover dados de demonstração**, digitando `REMOVER`. Só os registros marcados como demonstração são apagados.

---

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| Continua a faixa "Modo demonstração" | Algum dos três campos do `config.js` está vazio, ou o arquivo não foi salvo. Recarregue com Ctrl+F5 |
| A página abre direto, sem pedir login | Você abriu por duplo clique. Use `http://localhost:8765` |
| Erro de login falando em "redirect URI" | O endereço que você usou não está cadastrado no aplicativo. Use exatamente `http://localhost:8765/` ou peça à TI para incluir o endereço |
| "precisa de aprovação do administrador" | A TI precisa dar o consentimento das permissões do Graph |
| "SharePoint respondeu 403" | Sua conta não tem permissão no site ou na lista. Peça à TI para conferir |
| "A lista RT_… não existe no site" | Faça a Parte 4 |
| Você entrou como Consulta | Seu e-mail não está em `administradoresIniciais` nem na lista de usuários. Confira se está escrito igual ao do login |
| "Outra pessoa alterou este registro…" | Alguém editou ao mesmo tempo. Recarregue e refaça a alteração |
| A sessão foi encerrada | Ficou 30 minutos sem uso. Entre de novo; nada se perde, porque os dados já estavam salvos |

---

## Resumo em uma página

1. Peça à TI o site do SharePoint e o registro do aplicativo (Parte 1).
2. Preencha `tenantId`, `clientId`, `siteUrl` e seu e-mail em `js/config.js` (Parte 2).
3. Rode `python -m http.server 8765 --bind 127.0.0.1` na pasta e abra `http://localhost:8765` (Parte 3).
4. Em Administração, crie as listas (Parte 4).
5. Cadastre as pessoas (Parte 5).
6. Cadastre os dados, na ordem: normas, marcos, pareceres, ações, impactos, adequações, testes, defeitos, decisões. Para pareceres que já estão numa pasta, use **Documentos da pasta**; para muitos registros em Excel, **Importar planilha** (Parte 6).
7. Peça à TI as permissões e a publicação para a equipe (Parte 7).
8. Confira que tudo está salvo no SharePoint (Parte 8).
