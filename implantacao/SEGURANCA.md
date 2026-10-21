# Controles de segurança do portal

Situação de cada controle ao fim da Etapa 5. "Testado" significa testado no navegador (modo demonstração) ou contra o Microsoft Graph simulado. Nenhum controle foi testado ainda num tenant real.

## Acesso e identidade

| Controle | Onde | Situação |
|---|---|---|
| Login corporativo pelo Entra ID, sem senhas no portal | `js/auth.js` | Implementado; não testado em tenant real |
| Perfil pelos papéis do Entra ID (token assinado) ou pela lista de usuários | `js/app.js` | Testado com papéis simulados |
| Tokens só na sessão da aba (`sessionStorage`), nenhum dado de negócio no navegador | `js/auth.js` | Implementado |
| Sessão encerrada após 30 minutos sem uso (configurável): tokens e dados apagados da aba | `js/app.js` | Testado |
| Nenhum arquivo do portal servido sem login (Static Web Apps) | `staticwebapp.config.json` | Configurado; não publicado |

## Autorização

| Controle | Onde | Situação |
|---|---|---|
| Regras por perfil nas telas: cadastro, edição por área, aprovação, decisões, arquivamento, exportação, trilha de auditoria | `js/regras.js` | Testado nos quatro perfis |
| Permissões por lista no SharePoint: só administradores excluem; histórico só aceita inclusões | `implantacao/configurar-permissoes.ps1` | Escrito; nunca executado |
| Chamadas ao Graph com permissão delegada: o portal só faz o que o usuário já pode fazer no site | `js/repositorio.js` | Implementado |

As regras de tela não são uma barreira de segurança: quem tem acesso ao site pode abrir as listas direto no SharePoint. A barreira são as permissões do site.

## Integridade e rastreabilidade

| Controle | Situação |
|---|---|
| Histórico de criação, edição campo a campo, aprovação, versão, revogação, arquivamento, download, exportação e impressão | Testado |
| Autor de cada gravação informado pelo SharePoint, comparado com o nome gravado pelo portal | Testado com Graph simulado |
| Aprovação de parecer só é "verificada" se gravada por um Gestor, segundo o SharePoint | Testado com Graph simulado |
| Edição simultânea detectada (If-Match) | Testado com Graph simulado |
| Decisões não editáveis: só nova versão ou revogação | Testado |
| Arquivamento com motivo no lugar de exclusão | Testado |
| Trilha de alterações com filtros e exportação, restrita a Gestor e Administrador | Testado |

## Dados e arquivos

| Controle | Situação |
|---|---|
| Todo texto vindo dos registros é escapado antes de ir para a tela | Implementado em `js/ui.js` |
| Planilhas exportadas gravam texto como texto: um valor que começa com `=` não vira fórmula | Testado no Excel |
| Caracteres de controle removidos das planilhas | Testado no Excel |
| Toda planilha leva uma aba "Sobre" com quem gerou, quando, filtros e classificação "Documento interno" | Testado |
| Consulta não exporta nem imprime pelo portal | Testado |
| Anexos: extensão autorizada, tamanho máximo e assinatura do conteúdo conferidos | Testado |
| Anexos com SHA-256 registrado | Testado |
| Anexos nunca sobrescritos pelo portal (nome com data e hora) | Testado com Graph simulado |
| Limite de 10.000 caracteres em textos longos | Testado |
| Content-Security-Policy: scripts só do próprio site; conexões só com Graph, login e SharePoint | Configurado; não publicado |
| Sem bibliotecas de terceiros além da MSAL.js, servida localmente com hash registrado | Implementado |

## Pendente de configuração na empresa

- Rodar o script de permissões em homologação e conferir.
- Publicar no Static Web Apps com login obrigatório restrito ao tenant.
- Ativar o log de auditoria do Microsoft Purview e uma política de retenção para o site.
- Avaliar o Defender para Office 365 (Anexos Seguros) na biblioteca de documentos.
- Revisar periodicamente quem está nos grupos `RT *` e na lista de usuários.
