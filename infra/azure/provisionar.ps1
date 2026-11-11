<#
.SYNOPSIS
  Cria (ou atualiza) a infraestrutura da Clínica Mais Saúde no Azure. Idempotente: pode
  rodar de novo sem duplicar nada nem trocar os segredos já gerados.

.DESCRIPTION
  Recursos (ver docs/nuvem/ARQUITETURA_NUVEM.md):
    - Grupo de recursos            rg-clinicamaissaude
    - Azure SQL Basic (5 DTU)      sql-clinica-<sufixo> / ClinicaMaisSaudeDb
    - App Service Linux B1         clinicamaissaude-api-<sufixo> (container da API vindo do GHCR, Always On)
    - Storage (site estático) x2   clinicaweb<sufixo> (portal) e clinicaapp<sufixo> (mobile web)

  Segredos gerados aqui (JWT, pepper, senha do SQL) vão direto para as configurações do
  App Service e nunca são impressos. Os segredos que só você conhece (senha do admin, chave
  da Gemini, SMTP) são definidos à parte — ver infra/azure/README.md.

  Pré-requisito: Azure CLI instalado e `az login` feito.

.EXAMPLE
  ./infra/azure/provisionar.ps1 -Sufixo edu
#>
param(
    [string]$Sufixo = "edu",
    # Cada assinatura Azure for Students tem sua lista de regiões permitidas (política
    # "Allowed resource deployment regions"). A atual (nov/2026) libera o Brazil South.
    [string]$Regiao = "brazilsouth"
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/comum.ps1"

$n = Get-NomesRecursos -Sufixo $Sufixo

Write-Etapa "Provedores de recursos"
# Assinaturas novas precisam registrar cada serviço antes do primeiro uso (é gratuito).
foreach ($provedor in @("Microsoft.Sql", "Microsoft.Web", "Microsoft.Storage")) {
    $estado = Invoke-Az provider show -n $provedor --query registrationState -o tsv
    if ($estado -ne "Registered") { Invoke-Az provider register -n $provedor --wait -o none }
}

Write-Etapa "Grupo de recursos"
if (-not (Test-Az group show -n $n.Grupo)) { Invoke-Az group create -n $n.Grupo -l $Regiao -o none }

# ---------------------------------------------------------------- Banco
Write-Etapa "Azure SQL"
$senhaSql = $null
if (-not (Test-Az sql server show -g $n.Grupo -n $n.SqlServidor)) {
    $senhaSql = New-SenhaSql
    Invoke-Az sql server create -g $n.Grupo -n $n.SqlServidor -l $Regiao `
        -u $n.SqlUsuario -p $senhaSql --minimal-tls-version 1.2 -o none
}

# "Permitir serviços do Azure" (0.0.0.0) — o App Service acessa o banco por aqui.
Invoke-Az sql server firewall-rule create -g $n.Grupo -s $n.SqlServidor -n PermitirServicosAzure `
    --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none

if (-not (Test-Az sql db show -g $n.Grupo -s $n.SqlServidor -n $n.Banco)) {
    # Basic (5 DTU, 2 GB): preço fixo de ~US$ 5/mês. Não usar a oferta serverless gratuita:
    # o serviço de lembretes consulta o banco a cada 5 min, o banco nunca pausa, a cota grátis
    # acaba em ~2 dias e o excedente (BillOverUsage) consumiu todo o crédito em nov/2026.
    Invoke-Az sql db create -g $n.Grupo -s $n.SqlServidor -n $n.Banco `
        -e Basic -c 5 --max-size 2GB --backup-storage-redundancy Local -o none
}

# ---------------------------------------------------------------- API
Write-Etapa "App Service (plano B1 Linux + API)"
if (-not (Test-Az appservice plan show -g $n.Grupo -n $n.Plano)) {
    Invoke-Az appservice plan create -g $n.Grupo -n $n.Plano --is-linux --sku B1 -l $Regiao -o none
}

if (-not (Test-Az webapp show -g $n.Grupo -n $n.Api)) {
    # Nasce com uma imagem pública qualquer; a da API entra no publicar.ps1 (após o 1º build).
    Invoke-Az webapp create -g $n.Grupo -p $n.Plano -n $n.Api `
        --container-image-name "mcr.microsoft.com/dotnet/samples:aspnetapp" -o none
}

Invoke-Az webapp config set -g $n.Grupo -n $n.Api --always-on true --web-sockets-enabled true `
    --http20-enabled true --min-tls-version 1.2 -o none
Invoke-Az webapp update -g $n.Grupo -n $n.Api --https-only true -o none

# ---------------------------------------------------------------- Front-ends
Write-Etapa "Sites estáticos no Storage (portal web e app mobile no navegador)"
# Static Web Apps não existe nas regiões que a assinatura libera; o site estático do Storage
# serve os mesmos arquivos (centavos por mês). As rotas da SPA (ex.: /agendar) não são
# arquivos: o documento de "404" é o próprio index.html, e o roteador do front resolve.
foreach ($conta in @($n.Web, $n.AppWeb)) {
    if (-not (Test-Az storage account show -g $n.Grupo -n $conta)) {
        Invoke-Az storage account create -g $n.Grupo -n $conta -l $Regiao --sku Standard_LRS `
            --kind StorageV2 --min-tls-version TLS1_2 -o none
    }
    Invoke-Az storage blob service-properties update --account-name $conta --auth-mode key `
        --static-website --index-document index.html --404-document index.html -o none
}
$urlWeb = (Invoke-Az storage account show -g $n.Grupo -n $n.Web --query primaryEndpoints.web -o tsv).TrimEnd("/")
$urlAppWeb = (Invoke-Az storage account show -g $n.Grupo -n $n.AppWeb --query primaryEndpoints.web -o tsv).TrimEnd("/")
$urlApi = "https://" + (Invoke-Az webapp show -g $n.Grupo -n $n.Api --query defaultHostName -o tsv)

# ---------------------------------------------------------------- Configuração da API
Write-Etapa "Configurações da API"
$atuais = @{}
(Invoke-AzJson webapp config appsettings list -g $n.Grupo -n $n.Api) |
    ForEach-Object { $atuais[$_.name] = $true }

$config = [ordered]@{
    "ASPNETCORE_ENVIRONMENT"               = "Production"
    "WEBSITES_PORT"                        = "8080"
    # O App Service termina o TLS; sem isto a API enxergaria http e o IP do proxy.
    "ASPNETCORE_FORWARDEDHEADERS_ENABLED"  = "true"
    "AdminSeed__Email"                     = "admin@clinicamaissaude.com.br"
    "AdminSeed__Cpf"                       = "00000000000"
    "Cors__AllowedOrigins__0"              = $urlWeb
    "Cors__AllowedOrigins__1"              = $urlAppWeb
}
# Segredos gerados só na primeira vez (rodar de novo não invalida sessões nem códigos).
if (-not $atuais.ContainsKey("JwtConfig__Secret")) { $config["JwtConfig__Secret"] = New-Segredo 48 }
if (-not $atuais.ContainsKey("Security__CodigoRecuperacaoPepper")) { $config["Security__CodigoRecuperacaoPepper"] = New-Segredo 32 }
# Sem a string de conexão (ex.: a 1ª execução parou no meio), redefine a senha do SQL e grava.
if (-not $senhaSql -and -not $atuais.ContainsKey("ConnectionStrings__DefaultConnection")) {
    $senhaSql = New-SenhaSql
    Invoke-Az sql server update -g $n.Grupo -n $n.SqlServidor -p $senhaSql -o none
}
if ($senhaSql) {
    $config["ConnectionStrings__DefaultConnection"] =
        "Server=tcp:$($n.SqlServidor).database.windows.net,1433;Initial Catalog=$($n.Banco);" +
        "User ID=$($n.SqlUsuario);Password=$senhaSql;Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;"
}
Set-AppSettings -Grupo $n.Grupo -App $n.Api -Valores $config

Write-Host ""
Write-Host "Pronto." -ForegroundColor Green
Write-Host "  API:        $urlApi"
Write-Host "  Portal web: $urlWeb"
Write-Host "  App (web):  $urlAppWeb"
Write-Host "Próximo passo: definir os segredos pessoais e rodar ./infra/azure/publicar.ps1 (ver infra/azure/README.md)."
