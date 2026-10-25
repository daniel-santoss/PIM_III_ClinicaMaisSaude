<#
.SYNOPSIS
  Publica a Clínica Mais Saúde no Azure (depois do provisionar.ps1).

.DESCRIPTION
  Etapas (todas por padrão; escolha com os switches):
    -Banco  aplica as migrations no Azure SQL (abre o firewall só para o seu IP e fecha ao final)
    -Api    builda a imagem da API na nuvem (az acr build, sem Docker local) e troca o container
    -Web    builda o portal (Vite) apontando para a API pública e publica no Static Web Apps
    -App    exporta o app mobile para web (Expo) e publica no Static Web Apps

.EXAMPLE
  ./infra/azure/publicar.ps1 -Sufixo dvs            # tudo
  ./infra/azure/publicar.ps1 -Sufixo dvs -Api       # só a API
#>
param(
    [string]$Sufixo = "dvs",
    [switch]$Banco,
    [switch]$Api,
    [switch]$Web,
    [switch]$App
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/comum.ps1"

$n = Get-NomesRecursos -Sufixo $Sufixo
$raiz = (Resolve-Path "$PSScriptRoot/../..").Path
if (-not ($Banco -or $Api -or $Web -or $App)) { $Banco = $Api = $Web = $App = $true }

$urlApi = "https://" + (Invoke-Az webapp show -g $n.Grupo -n $n.Api --query defaultHostName -o tsv)

function Get-AppSetting([string]$Nome) {
    # Filtra no PowerShell: consultas com | e aspas quebram no az.cmd do Windows.
    $lista = Invoke-AzJson webapp config appsettings list -g $n.Grupo -n $n.Api
    return ($lista | Where-Object { $_.name -eq $Nome } | Select-Object -First 1).value
}

# Publica uma pasta estática no Static Web Apps. O token vai por variável de ambiente.
function Publicar-Static([string]$NomeSwa, [string]$Pasta) {
    $env:SWA_CLI_DEPLOYMENT_TOKEN = Invoke-Az staticwebapp secrets list -g $n.Grupo -n $NomeSwa --query properties.apiKey -o tsv
    try {
        & npx --yes "@azure/static-web-apps-cli@2" deploy $Pasta --env production
        if ($LASTEXITCODE -ne 0) { throw "Falhou o deploy de $NomeSwa" }
    }
    finally {
        Remove-Item Env:SWA_CLI_DEPLOYMENT_TOKEN -ErrorAction SilentlyContinue
    }
}

if ($Banco) {
    Write-Etapa "Migrations no Azure SQL"
    $ip = (Invoke-RestMethod -Uri "https://api.ipify.org").ToString().Trim()
    $regra = "MigrationsTemporaria"
    Invoke-Az sql server firewall-rule create -g $n.Grupo -s $n.SqlServidor -n $regra `
        --start-ip-address $ip --end-ip-address $ip -o none
    try {
        $conexao = Get-AppSetting "ConnectionStrings__DefaultConnection"
        if (-not $conexao) { throw "ConnectionStrings__DefaultConnection não está configurada na API." }
        & dotnet ef database update --project "$raiz/ClinicaMaisSaude.Infrastructure" `
            --startup-project "$raiz/ClinicaMaisSaude.API" --configuration Release --connection $conexao
        if ($LASTEXITCODE -ne 0) { throw "Falharam as migrations." }
    }
    finally {
        Invoke-Az sql server firewall-rule delete -g $n.Grupo -s $n.SqlServidor -n $regra -o none
    }
}

if ($Api) {
    Write-Etapa "Imagem da API (build no Azure Container Registry)"
    $sha = (& git -C $raiz rev-parse --short HEAD).Trim()
    Push-Location $raiz
    try {
        Invoke-Az acr build -r $n.Registro -t "clinica-api:latest" -t "clinica-api:$sha" `
            -f ClinicaMaisSaude.API/Dockerfile . -o none
    }
    finally { Pop-Location }

    Write-Etapa "Trocando o container da API"
    Invoke-Az webapp config container set -g $n.Grupo -n $n.Api `
        --container-image-name "$($n.Registro).azurecr.io/clinica-api:$sha" `
        --container-registry-url "https://$($n.Registro).azurecr.io" -o none
    Invoke-Az webapp restart -g $n.Grupo -n $n.Api -o none
}

if ($Web) {
    Write-Etapa "Portal web (Vite)"
    Push-Location "$raiz/clinica-frontend"
    try {
        $env:VITE_API_URL = $urlApi
        $env:VITE_ADMIN_EMAIL = "admin@clinicamaissaude.com.br"
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "Falhou o build do portal." }
    }
    finally {
        Remove-Item Env:VITE_API_URL, Env:VITE_ADMIN_EMAIL -ErrorAction SilentlyContinue
        Pop-Location
    }
    Publicar-Static $n.Web "$raiz/clinica-frontend/dist"
}

if ($App) {
    Write-Etapa "App mobile no navegador (Expo web)"
    $saida = Join-Path ([IO.Path]::GetTempPath()) "clinica-app-web"
    Push-Location "$raiz/clinica-mobile"
    try {
        $env:EXPO_PUBLIC_API_URL = $urlApi
        $env:CI = "1"
        & npx expo export -p web --output-dir $saida --clear
        if ($LASTEXITCODE -ne 0) { throw "Falhou o export web do app." }
    }
    finally {
        Remove-Item Env:EXPO_PUBLIC_API_URL, Env:CI -ErrorAction SilentlyContinue
        Pop-Location
    }
    Publicar-Static $n.AppWeb $saida
}

Write-Host ""
Write-Host "Publicado." -ForegroundColor Green
Write-Host "  API: $urlApi"
