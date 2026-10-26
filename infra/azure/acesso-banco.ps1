<#
.SYNOPSIS
  Dá a você acesso direto ao banco de produção (SSMS / Azure Data Studio). Idempotente.

.DESCRIPTION
  - Define a conta logada no Azure CLI (az login) como administradora Microsoft Entra do
    servidor SQL: no SSMS, autentique com "Microsoft Entra MFA" e o seu e-mail; sem senha nova.
    O login SQL "clinicaadmin" continua existindo e é usado só pela API.
  - Cria/atualiza a regra de firewall "AcessoDev" com o seu IP público atual. Se a sua internet
    trocar de IP, rode de novo. Para revogar: -Remover.

.EXAMPLE
  ./infra/azure/acesso-banco.ps1 -Sufixo dvs
  ./infra/azure/acesso-banco.ps1 -Sufixo dvs -Remover   # tira a regra de firewall
#>
param(
    [string]$Sufixo = "dvs",
    [switch]$Remover
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/comum.ps1"
$n = Get-NomesRecursos -Sufixo $Sufixo
$regra = "AcessoDev"

if ($Remover) {
    Write-Etapa "Removendo a regra de firewall $regra"
    if (Test-Az sql server firewall-rule show -g $n.Grupo -s $n.SqlServidor -n $regra) {
        Invoke-Az sql server firewall-rule delete -g $n.Grupo -s $n.SqlServidor -n $regra -o none
    }
    Write-Host "Acesso direto revogado (o admin Entra continua definido, mas sem regra de firewall não conecta)." -ForegroundColor Green
    return
}

Write-Etapa "Administrador Microsoft Entra do servidor SQL"
$usuario = Invoke-AzJson ad signed-in-user show
Invoke-Az sql server ad-admin create -g $n.Grupo -s $n.SqlServidor `
    --display-name $usuario.userPrincipalName --object-id $usuario.id -o none

Write-Etapa "Firewall: liberando o seu IP"
$ip = (Invoke-RestMethod -Uri "https://api.ipify.org").ToString().Trim()
Invoke-Az sql server firewall-rule create -g $n.Grupo -s $n.SqlServidor -n $regra `
    --start-ip-address $ip --end-ip-address $ip -o none

Write-Host ""
Write-Host "Pronto. No SSMS:" -ForegroundColor Green
Write-Host "  Servidor:      $($n.SqlServidor).database.windows.net"
Write-Host "  Autenticação:  Microsoft Entra MFA"
Write-Host "  Usuário:       $($usuario.userPrincipalName)"
Write-Host "  Banco:         $($n.Banco)  (em Opções > Propriedades da Conexão)"
Write-Host "  IP liberado:   $ip  (regra '$regra')"
