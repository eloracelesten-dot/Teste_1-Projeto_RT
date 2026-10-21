# Operação do portal

Tarefas do dia a dia do administrador e da TI depois da implantação. A implantação inicial está em [IMPLANTACAO.md](IMPLANTACAO.md).

## Usuários e perfis

| Tarefa | Como |
|---|---|
| Dar acesso a uma pessoa | Incluir no grupo `RT *` do perfil no SharePoint. Se `perfisPeloEntra` estiver ligado, atribuir também o papel no Entra ID. Cadastrar em Administração › Usuários, com a área. |
| Mudar o perfil | Trocar de grupo no SharePoint (e de papel no Entra ID) e ajustar o perfil em Administração › Usuários. |
| Tirar o acesso | Remover dos grupos e do papel; em Administração › Usuários, desmarcar "Ativo". Não exclua o usuário: o nome dele continua no histórico. |
| Revisão periódica | A cada trimestre, conferir os membros dos grupos `RT *` e a lista de usuários. |

Os gestores na lista de usuários são a base da "Aprovação verificada". Manter a lista atualizada evita aprovações marcadas como não verificadas.

## Publicar uma nova versão

1. Rodar os testes: `http://localhost:8765/tests/` deve mostrar todos passando.
2. Gerar o pacote:
   ```bash
   powershell -ExecutionPolicy Bypass -File implantacao\empacotar.ps1
   ```
   O pacote sai em `dist\portal-rt-<data-hora>.zip`. O script confere a MSAL.js, avisa se o `config.js` está em modo demonstração e coloca a versão no endereço dos scripts, para os navegadores não usarem arquivos antigos.
3. Publicar o conteúdo do pacote no Static Web Apps, primeiro em homologação.
4. Depois de publicar, abrir o portal e conferir a Visão geral e um cadastro de teste.

Para voltar à versão anterior, publique de novo o pacote anterior, que fica guardado em `dist\`.

## Dados de demonstração

Antes de entrar em produção: Administração › **Remover dados de demonstração**, digitando REMOVER. Só registros marcados como demonstração são excluídos.

Para treinar a equipe num site de homologação: Administração › **Carregar dados de demonstração**.

## Rotina de backup e recuperação

| Frequência | Ação |
|---|---|
| Contínua | Versionamento das listas e da biblioteca (ligado pelo script de permissões) e lixeira do site (93 dias) |
| Mensal | Exportar em Excel a trilha de alterações e os relatórios principais e guardar na área do projeto |
| Semestral | Teste de restauração: excluir um item de teste em homologação, recuperar pela lixeira e conferir o histórico |
| Sempre | Política de retenção do Microsoft Purview no site (definida pela TI) |

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "A lista RT_… não existe no site" | Listas não criadas | Administrador: Administração › Criar listas e biblioteca que faltam |
| "SharePoint respondeu 403" | Pessoa sem permissão naquela lista | Conferir os grupos `RT *` da pessoa |
| "SharePoint respondeu 401" ou volta para o login | Token expirado ou consentimento faltando | Entrar de novo; se persistir, conferir as permissões do aplicativo no Entra ID |
| "Outra pessoa alterou este registro…" | Duas pessoas editaram ao mesmo tempo | Recarregar a página e refazer a alteração |
| Aviso de códigos repetidos em Administração | Dois cadastros simultâneos no mesmo módulo | Arquivar o registro duplicado e cadastrar de novo |
| "Aprovação não verificada" | Aprovação gravada fora do portal ou por quem não está como Gestor na lista | Conferir quem aprovou; se correto, ajustar o perfil na lista e aprovar de novo pelo portal |
| Tela antiga depois de uma publicação | Cache do navegador | Recarregar com Ctrl+F5; conferir se o pacote foi gerado pelo `empacotar.ps1` |
| "A biblioteca de login da Microsoft não carregou" | Arquivo `js/vendor` ausente na publicação | Publicar o pacote completo gerado pelo script |
| Sessão encerrada sozinha | 30 minutos sem uso | Entrar de novo; o tempo é ajustável em `sessaoMinutos` no `config.js` |

## Personalização

| O quê | Onde |
|---|---|
| Nome do portal | `nomePortal` em `js/config.js` |
| Logotipo | `logo` em `js/config.js` (caminho de uma imagem publicada junto) |
| Cores | Variáveis `--marca-*` (índigo) e `--acento-*` (verde-azulado) no início do CSS do `index.html` |
| Áreas, categorias, sistemas, unidades | `RT.listas` em `js/esquema.js` |
| Tempo de sessão, tamanho máximo de anexo | `sessaoMinutos` e `anexoMaxMB` em `js/config.js` |

Depois de qualquer mudança: rodar os testes e gerar um novo pacote.

Novas opções em listas de escolha precisam existir também na coluna da lista do SharePoint. As colunas aceitam valores digitados, então o portal não falha, mas o filtro do SharePoint só oferece as opções originais.
