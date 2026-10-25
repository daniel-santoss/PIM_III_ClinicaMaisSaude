# Funções compartilhadas pelos scripts de infra/azure. Compatível com Windows PowerShell 5.1.

# Azure CLI: usa o do PATH ou o caminho padrão do instalador (o PATH só atualiza em terminais novos).
$script:Az = (Get-Command az -ErrorAction SilentlyContinue).Source
if (-not $script:Az) { $script:Az = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" }
if (-not (Test-Path $script:Az)) { throw "Azure CLI não encontrado. Instale com: winget install -e --id Microsoft.AzureCLI" }

# Nomes dos recursos num só lugar (os globais precisam ser únicos no Azure, daí o sufixo).
function Get-NomesRecursos([string]$Sufixo) {
    [pscustomobject]@{
        Grupo       = "rg-clinicamaissaude"
        SqlServidor = "sql-clinica-$Sufixo"
        SqlUsuario  = "clinicaadmin"
        Banco       = "ClinicaMaisSaudeDb"
        Plano       = "plan-clinicamaissaude"
        Api         = "clinicamaissaude-api-$Sufixo"
        Web         = "clinicamaissaude-web-$Sufixo"
        AppWeb      = "clinicamaissaude-app-$Sufixo"
    }
}

function Write-Etapa([string]$Texto) { Write-Host "==> $Texto" -ForegroundColor Cyan }

# Executa o az e falha com mensagem clara se o comando der erro. Devolve a saída.
function Invoke-Az {
    $saida = & $script:Az @args
    if ($LASTEXITCODE -ne 0) { throw "Falhou: az $($args[0..2] -join ' ') ..." }
    return $saida
}

# Executa o az com saída JSON e devolve o objeto (no PS 5.1 o JSON chega linha a linha).
function Invoke-AzJson {
    $saida = Invoke-Az @args -o json
    return (($saida -join "`n") | ConvertFrom-Json)
}

# True se o comando az terminar com sucesso (usado para checar se um recurso já existe).
function Test-Az {
    $ErrorActionPreference = "Continue"   # no PS 5.1, stderr redirecionado viraria exceção
    & $script:Az @args -o none 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

# Segredo aleatório criptograficamente seguro, em Base64.
function New-Segredo([int]$Bytes = 32) {
    $b = New-Object byte[] $Bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return [Convert]::ToBase64String($b)
}

# Senha do SQL: só letras e dígitos (passa intacta pelo az.cmd e pela string de conexão),
# com maiúscula, minúscula e dígito garantidos pela regra de complexidade do Azure SQL.
function New-SenhaSql([int]$Tamanho = 32) {
    $alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".ToCharArray()
    $b = New-Object byte[] $Tamanho
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    $senha = -join ($b | ForEach-Object { $alfabeto[$_ % $alfabeto.Length] })
    return "Aa9" + $senha
}

# Grava app settings via arquivo temporário: os valores não aparecem na linha de comando
# nem na saída (o az devolveria todas as configurações em texto puro).
function Set-AppSettings([string]$Grupo, [string]$App, [System.Collections.IDictionary]$Valores) {
    if ($Valores.Count -eq 0) { return }
    $lista = foreach ($k in $Valores.Keys) { [pscustomobject]@{ name = $k; value = [string]$Valores[$k]; slotSetting = $false } }
    $arquivo = Join-Path ([IO.Path]::GetTempPath()) ("appsettings-" + [guid]::NewGuid() + ".json")
    try {
        [IO.File]::WriteAllText($arquivo, (ConvertTo-Json @($lista) -Depth 3), (New-Object Text.UTF8Encoding $false))
        Invoke-Az webapp config appsettings set -g $Grupo -n $App --settings "@$arquivo" -o none | Out-Null
    }
    finally {
        Remove-Item $arquivo -Force -ErrorAction SilentlyContinue
    }
}
