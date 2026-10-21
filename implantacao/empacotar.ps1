<#
.SYNOPSIS
  Gera o pacote de publicação do portal (pasta e arquivo .zip).

.DESCRIPTION
  Copia só o que vai para o servidor: index.html, js/ e staticwebapp.config.json.
  Ficam de fora testes, documentação, scripts de implantação e configurações locais.
  Também:
    - troca "?v=dev" nos scripts pela versão do pacote, para os navegadores buscarem os arquivos novos;
    - confere o hash da MSAL.js;
    - avisa se o config.js ainda está em modo demonstração.

  Funciona no Windows PowerShell 5.1 e no PowerShell 7.

.EXAMPLE
  .\implantacao\empacotar.ps1
  .\implantacao\empacotar.ps1 -Destino C:\publicacao -Versao 1.0.0
#>
param(
  [string] $Destino = (Join-Path (Split-Path $PSScriptRoot -Parent) "dist"),
  [string] $Versao = (Get-Date -Format "yyyyMMdd-HHmm")
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent
$hashMsal = "81FC17A81C9C822131DB9BF3A3CB64FF35A5096B8E6B059EF18B2439CEAF058F"
$utf8 = New-Object System.Text.UTF8Encoding $false

# ---------- Conferências ----------
$msal = Join-Path $raiz "js\vendor\msal-browser-3.28.1.min.js"
if ((Get-FileHash $msal -Algorithm SHA256).Hash -ne $hashMsal) {
  throw "O arquivo da MSAL.js não confere com o hash registrado. Publicação interrompida."
}

$config = [IO.File]::ReadAllText((Join-Path $raiz "js\config.js"))
$modoDemo = $config -match 'tenantId:\s*""' -or $config -match 'clientId:\s*""' -or $config -match 'siteUrl:\s*""'
if ($modoDemo) {
  Write-Warning "js/config.js está sem tenantId, clientId ou siteUrl: o pacote vai rodar em MODO DEMONSTRAÇÃO."
}
$swa = [IO.File]::ReadAllText((Join-Path $raiz "staticwebapp.config.json"))
if ($swa -match "<TENANT_ID>") {
  Write-Warning "staticwebapp.config.json ainda tem <TENANT_ID>: troque antes de publicar no Static Web Apps."
}

# ---------- Cópia ----------
$pasta = Join-Path $Destino "portal-rt-$Versao"
if (Test-Path $pasta) { throw "A pasta $pasta já existe. Use outra -Versao." }
New-Item -ItemType Directory -Path $pasta | Out-Null
Copy-Item (Join-Path $raiz "index.html") $pasta
Copy-Item (Join-Path $raiz "staticwebapp.config.json") $pasta
Copy-Item (Join-Path $raiz "js") (Join-Path $pasta "js") -Recurse

# Versão nos endereços dos scripts
$index = Join-Path $pasta "index.html"
$html = [IO.File]::ReadAllText($index)
$trocas = ([regex]::Matches($html, '\?v=dev')).Count
$html = $html.Replace("?v=dev", "?v=$Versao")
[IO.File]::WriteAllText($index, $html, $utf8)

# ---------- Compactação ----------
$zip = "$pasta.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($pasta, $zip)

$arquivos = (Get-ChildItem $pasta -Recurse -File).Count
Write-Host "Pacote gerado: $zip"
Write-Host "  Versão: $Versao ($trocas scripts versionados)"
Write-Host "  Arquivos: $arquivos"
Write-Host "  Modo: $(if ($modoDemo) { 'DEMONSTRAÇÃO' } else { 'SharePoint' })"
