<#
.SYNOPSIS
  Configura grupos, níveis de permissão e versionamento das listas do Portal da Reforma Tributária.

.DESCRIPTION
  ATENÇÃO: este script ainda não foi executado em nenhum ambiente. Rode primeiro num site de
  homologação, confira o resultado em Configurações do site > Permissões e só depois use em produção.

  Requisitos:
    - PowerShell 7 e módulo PnP.PowerShell 2.x (Install-Module PnP.PowerShell -Scope CurrentUser)
    - Um aplicativo do Entra ID para o PnP (o aplicativo compartilhado do PnP foi descontinuado)
    - Ser administrador (proprietário) do site
    - As listas RT_* e a biblioteca RT_Documentos já criadas pelo portal (Administração)

  O que o script faz:
    1. Cria os níveis de permissão "RT Editar sem excluir" e "RT Adicionar sem editar".
    2. Cria os grupos RT Administradores, RT Gestores, RT Colaboradores e RT Consulta.
    3. Quebra a herança de permissões de cada lista e aplica a matriz abaixo.
    4. Liga o versionamento das listas e da biblioteca.

  Matriz aplicada:
    Lista             Administradores  Gestores              Colaboradores          Consulta
    Pareceres...      Controle total   Editar sem excluir    Editar sem excluir     Leitura
    (e Atividades, Impactos, Adequacoes, Testes, Defeitos, Normas, Marcos, Documentos)
    Decisoes          Controle total   Editar sem excluir    Leitura                Leitura
    Usuarios          Controle total   Leitura               Leitura                Leitura
    Historico         Controle total   Adicionar sem editar  Adicionar sem editar   Adicionar sem editar

  Ninguém além dos administradores exclui itens. O histórico só recebe inclusões: nem quem
  gravou um registro consegue alterá-lo depois.

.EXAMPLE
  .\configurar-permissoes.ps1 -SiteUrl https://empresa.sharepoint.com/sites/ReformaTributaria -ClientId 00000000-0000-0000-0000-000000000000
#>
param(
  [Parameter(Mandatory = $true)] [string] $SiteUrl,
  [Parameter(Mandatory = $true)] [string] $ClientId,
  [string] $Prefixo = "RT_"
)

$ErrorActionPreference = "Stop"

Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

# ---------- Níveis de permissão ----------
$nivelEditar = "RT Editar sem excluir"
$nivelAdicionar = "RT Adicionar sem editar"

if (-not (Get-PnPRoleDefinition -Identity $nivelEditar -ErrorAction SilentlyContinue)) {
  Add-PnPRoleDefinition -RoleName $nivelEditar -Clone "Contribute" -Exclude DeleteListItems, DeleteVersions `
    -Description "Portal RT: cria e edita itens, sem excluir itens nem versões."
}
if (-not (Get-PnPRoleDefinition -Identity $nivelAdicionar -ErrorAction SilentlyContinue)) {
  Add-PnPRoleDefinition -RoleName $nivelAdicionar -Clone "Read" -Include AddListItems `
    -Description "Portal RT: lê e inclui itens, sem editar nem excluir. Usado no histórico."
}

# ---------- Grupos ----------
$grupos = @{
  Admin        = "RT Administradores"
  Gestor       = "RT Gestores"
  Colaborador  = "RT Colaboradores"
  Consulta     = "RT Consulta"
}
$nivelNoSite = @{ Admin = "Full Control"; Gestor = "Read"; Colaborador = "Read"; Consulta = "Read" }

foreach ($chave in $grupos.Keys) {
  $nome = $grupos[$chave]
  if (-not (Get-PnPGroup -Identity $nome -ErrorAction SilentlyContinue)) {
    New-PnPSiteGroup -Name $nome -PermissionLevels $nivelNoSite[$chave] | Out-Null
    Write-Host "Grupo criado: $nome"
  }
}

# ---------- Listas ----------
$trabalho = @("Pareceres", "Atividades", "Impactos", "Adequacoes", "Testes", "Defeitos", "Normas", "Marcos", "Documentos")
$matriz = @{}
foreach ($l in $trabalho) { $matriz[$l] = @{ Gestor = $nivelEditar; Colaborador = $nivelEditar; Consulta = "Read" } }
$matriz["Decisoes"]  = @{ Gestor = $nivelEditar;   Colaborador = "Read";         Consulta = "Read" }
$matriz["Usuarios"]  = @{ Gestor = "Read";         Colaborador = "Read";         Consulta = "Read" }
$matriz["Historico"] = @{ Gestor = $nivelAdicionar; Colaborador = $nivelAdicionar; Consulta = $nivelAdicionar }

$donos = Get-PnPGroup -AssociatedOwnerGroup

foreach ($lista in $matriz.Keys) {
  $nomeLista = "$Prefixo$lista"
  if (-not (Get-PnPList -Identity $nomeLista -ErrorAction SilentlyContinue)) {
    Write-Warning "Lista $nomeLista não encontrada. Crie as listas pelo portal (Administração) e rode o script de novo."
    continue
  }
  Write-Host "Configurando $nomeLista"
  # Herança quebrada sem copiar permissões: só os grupos abaixo terão acesso
  Set-PnPList -Identity $nomeLista -BreakRoleInheritance -CopyRoleAssignments:$false | Out-Null
  Set-PnPListPermission -Identity $nomeLista -Group $donos.Title -AddRole "Full Control"
  Set-PnPListPermission -Identity $nomeLista -Group $grupos.Admin -AddRole "Full Control"
  foreach ($perfil in @("Gestor", "Colaborador", "Consulta")) {
    Set-PnPListPermission -Identity $nomeLista -Group $grupos[$perfil] -AddRole $matriz[$lista][$perfil]
  }
  $versoes = if ($lista -eq "Documentos") { 500 } else { 100 }
  Set-PnPList -Identity $nomeLista -EnableVersioning $true -MajorVersions $versoes | Out-Null
}

Write-Host ""
Write-Host "Concluído. Próximos passos:"
Write-Host " - Adicione as pessoas aos grupos RT_* conforme o perfil de cada uma."
Write-Host " - Confira se o grupo padrão de Membros do site está vazio: ele teria acesso de edição fora desta matriz."
Write-Host " - Confira o resultado em Configurações do site > Permissões e em cada lista."
