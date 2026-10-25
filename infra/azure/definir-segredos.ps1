<#
.SYNOPSIS
  Define na API do Azure os segredos que só você conhece. Rode você mesmo, no seu terminal.

.DESCRIPTION
  - Senha do administrador: pedida aqui, com entrada oculta (não fica no histórico nem em arquivo).
  - Chave da Gemini e SMTP (EmailConfig:*): copiados do seu user-secrets local, sem exibir os valores.
  Nada é impresso na tela. Depois, a API é reiniciada para semear o admin com a senha nova.

.EXAMPLE
  ./infra/azure/definir-segredos.ps1 -Sufixo dvs
#>
param(
    [string]$Sufixo = "dvs",
    # Só recopia Gemini/SMTP do user-secrets, sem pedir (nem alterar) a senha do admin.
    [switch]$ApenasChaves
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/comum.ps1"
$n = Get-NomesRecursos -Sufixo $Sufixo

function Ler-Senha([string]$Rotulo) {
    $seguro = Read-Host $Rotulo -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$valores = [ordered]@{}

# Senha do admin (mín. 10 caracteres; confirmação).
if (-not $ApenasChaves) {
    do {
        $senha = Ler-Senha "Nova senha do administrador (mín. 10 caracteres)"
        $confirma = Ler-Senha "Confirme a senha"
        $ok = ($senha.Length -ge 10) -and ($senha -ceq $confirma)
        if (-not $ok) { Write-Host "Senhas diferentes ou curtas demais. Tente de novo." -ForegroundColor Yellow }
    } until ($ok)
    $valores["AdminSeed__Password"] = $senha
}

# Gemini e SMTP a partir do user-secrets da API (o pepper de dev NÃO vai: produção tem o seu).
$csproj = "$PSScriptRoot/../../ClinicaMaisSaude.API/ClinicaMaisSaude.API.csproj"
$id = ([xml](Get-Content $csproj)).Project.PropertyGroup.UserSecretsId | Where-Object { $_ } | Select-Object -First 1
$arquivo = "$env:APPDATA\Microsoft\UserSecrets\$id\secrets.json"
if (Test-Path $arquivo) {
    # O user-secrets guarda as chaves achatadas ("GeminiAI:ApiKey"), mas aceita também seções aninhadas.
    $segredos = Get-Content $arquivo -Raw | ConvertFrom-Json
    $pares = foreach ($p in $segredos.PSObject.Properties) {
        if ($p.Value -is [pscustomobject]) {
            foreach ($q in $p.Value.PSObject.Properties) { [pscustomobject]@{ Chave = "$($p.Name):$($q.Name)"; Valor = $q.Value } }
        }
        else { [pscustomobject]@{ Chave = $p.Name; Valor = $p.Value } }
    }
    foreach ($par in $pares) {
        if ($par.Chave -match '^(GeminiAI|EmailConfig):') { $valores[$par.Chave -replace ':', '__'] = [string]$par.Valor }
    }
}
else {
    Write-Host "user-secrets não encontrado: a triagem por IA e o envio de e-mail ficam desligados." -ForegroundColor Yellow
}

Set-AppSettings -Grupo $n.Grupo -App $n.Api -Valores $valores
Invoke-Az webapp restart -g $n.Grupo -n $n.Api -o none
Write-Host "Segredos definidos ($($valores.Count) configurações). A API foi reiniciada." -ForegroundColor Green
