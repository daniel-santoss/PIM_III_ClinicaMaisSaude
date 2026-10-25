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
param([string]$Sufixo = "dvs")

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
do {
    $senha = Ler-Senha "Nova senha do administrador (mín. 10 caracteres)"
    $confirma = Ler-Senha "Confirme a senha"
    $ok = ($senha.Length -ge 10) -and ($senha -ceq $confirma)
    if (-not $ok) { Write-Host "Senhas diferentes ou curtas demais. Tente de novo." -ForegroundColor Yellow }
} until ($ok)
$valores["AdminSeed__Password"] = $senha

# Gemini e SMTP a partir do user-secrets da API (o pepper de dev NÃO vai: produção tem o seu).
$csproj = "$PSScriptRoot/../../ClinicaMaisSaude.API/ClinicaMaisSaude.API.csproj"
$id = ([xml](Get-Content $csproj)).Project.PropertyGroup.UserSecretsId | Where-Object { $_ } | Select-Object -First 1
$arquivo = "$env:APPDATA\Microsoft\UserSecrets\$id\secrets.json"
if (Test-Path $arquivo) {
    $segredos = Get-Content $arquivo -Raw | ConvertFrom-Json
    foreach ($secao in @("GeminiAI", "EmailConfig")) {
        $obj = $segredos.$secao
        if ($obj) { $obj.PSObject.Properties | ForEach-Object { $valores["${secao}__$($_.Name)"] = [string]$_.Value } }
    }
}
else {
    Write-Host "user-secrets não encontrado: a triagem por IA e o envio de e-mail ficam desligados." -ForegroundColor Yellow
}

Set-AppSettings -Grupo $n.Grupo -App $n.Api -Valores $valores
Invoke-Az webapp restart -g $n.Grupo -n $n.Api -o none
Write-Host "Segredos definidos ($($valores.Count) configurações). A API foi reiniciada." -ForegroundColor Green
