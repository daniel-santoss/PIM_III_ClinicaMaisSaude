<#
.SYNOPSIS
  Cria (ou atualiza) a infraestrutura da Clínica Mais Saúde no Azure. Idempotente: pode
  rodar de novo sem duplicar nada nem trocar os segredos já gerados.

.DESCRIPTION
  Recursos (ver docs/nuvem/ARQUITETURA_NUVEM.md):
    - Grupo de recursos            rg-clinicamaissaude
    - Azure SQL (oferta gratuita)  sql-clinica-<sufixo> / ClinicaMaisSaudeDb
    - Container Registry (Basic)   acrclinica<sufixo>          (imagem da API, build na nuvem)
    - App Service Linux B1         clinicamaissaude-api-<sufixo> (container da API, Always On)
    - Static Web Apps (Free) x2    clinicamaissaude-web-<sufixo> (portal) e -app-<sufixo> (mobile web)

  Segredos gerados aqui (JWT, pepper, senha do SQL) vão direto para as configurações do
  App Service e nunca são impressos. Os segredos que só você conhece (senha do admin, chave
  da Gemini, SMTP) são definidos à parte — ver infra/azure/README.md.

  Pré-requisito: Azure CLI instalado e `az login` feito.

.EXAMPLE
  ./infra/azure/provisionar.ps1 -Sufixo dvs
#>
param(
    [string]$Sufixo = "dvs",
    # A assinatura Azure for Students só permite regiões dos EUA, e o East US 2 não aceitava
    # novos servidores SQL (out/2026): por isso Central US.
    [string]$Regiao = "centralus",
    # Static Web Apps só existe em algumas regiões (o conteúdo é servido por CDN global).
    [string]$RegiaoStatic = "eastus2"
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/comum.ps1"

$n = Get-NomesRecursos -Sufixo $Sufixo

Write-Etapa "Provedores de recursos"
# Assinaturas novas precisam registrar cada serviço antes do primeiro uso (é gratuito).
foreach ($provedor in @("Microsoft.Sql", "Microsoft.Web", "Microsoft.ContainerRegistry")) {
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
    # Oferta gratuita: 100 mil vCore-segundos + 32 GB por mês. Se a cota acabar, segue
    # cobrando do crédito (BillOverUsage) em vez de pausar o banco no meio da apresentação.
    Invoke-Az sql db create -g $n.Grupo -s $n.SqlServidor -n $n.Banco `
        -e GeneralPurpose -f Gen5 -c 2 --compute-model Serverless `
        --use-free-limit --free-limit-exhaustion-behavior BillOverUsage -o none
}

# ---------------------------------------------------------------- Registro de imagens
Write-Etapa "Container Registry"
if (-not (Test-Az acr show -g $n.Grupo -n $n.Registro)) {
    Invoke-Az acr create -g $n.Grupo -n $n.Registro --sku Basic -l $Regiao --admin-enabled false -o none
}

# ---------------------------------------------------------------- API
Write-Etapa "App Service (plano B1 Linux + API)"
if (-not (Test-Az appservice plan show -g $n.Grupo -n $n.Plano)) {
    Invoke-Az appservice plan create -g $n.Grupo -n $n.Plano --is-linux --sku B1 -l $Regiao -o none
}

$imagem = "$($n.Registro).azurecr.io/clinica-api:latest"
if (-not (Test-Az webapp show -g $n.Grupo -n $n.Api)) {
    # Nasce com uma imagem pública qualquer; a da API entra no publicar.ps1 (após o 1º build).
    Invoke-Az webapp create -g $n.Grupo -p $n.Plano -n $n.Api `
        --container-image-name "mcr.microsoft.com/dotnet/samples:aspnetapp" -o none
}

# Identidade gerenciada com permissão de leitura no registro (sem senha de registro).
$principal = Invoke-Az webapp identity assign -g $n.Grupo -n $n.Api --query principalId -o tsv
$idRegistro = Invoke-Az acr show -g $n.Grupo -n $n.Registro --query id -o tsv
# (consultas JMESPath com @, | ou aspas quebram no az.cmd do Windows: filtra-se no PowerShell)
$papeis = Invoke-AzJson role assignment list --assignee $principal --scope $idRegistro --role AcrPull
if (@($papeis).Count -eq 0) {
    Invoke-Az role assignment create --assignee-object-id $principal --assignee-principal-type ServicePrincipal `
        --role AcrPull --scope $idRegistro -o none
}
Invoke-Az webapp config set -g $n.Grupo -n $n.Api --always-on true --web-sockets-enabled true `
    --http20-enabled true --min-tls-version 1.2 -o none
$idApi = Invoke-Az webapp show -g $n.Grupo -n $n.Api --query id -o tsv
Invoke-Az resource update --ids "$idApi/config/web" --set properties.acrUseManagedIdentityCreds=true -o none
Invoke-Az webapp update -g $n.Grupo -n $n.Api --https-only true -o none

# ---------------------------------------------------------------- Front-ends
Write-Etapa "Static Web Apps (portal web e app mobile no navegador)"
foreach ($swa in @($n.Web, $n.AppWeb)) {
    if (-not (Test-Az staticwebapp show -g $n.Grupo -n $swa)) {
        Invoke-Az staticwebapp create -g $n.Grupo -n $swa -l $RegiaoStatic --sku Free -o none
    }
}
$urlWeb = "https://" + (Invoke-Az staticwebapp show -g $n.Grupo -n $n.Web --query defaultHostname -o tsv)
$urlAppWeb = "https://" + (Invoke-Az staticwebapp show -g $n.Grupo -n $n.AppWeb --query defaultHostname -o tsv)
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
