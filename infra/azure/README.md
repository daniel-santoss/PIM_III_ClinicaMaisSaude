# Publicação no Azure

Scripts que criam e publicam a Clínica Mais Saúde no Azure (assinatura *Azure for Students*).
A arquitetura e as alternativas estão em [`docs/nuvem/ARQUITETURA_NUVEM.md`](../../docs/nuvem/ARQUITETURA_NUVEM.md).

## O que é criado

| Recurso | Nome | Plano | Custo aprox. |
|---|---|---|---|
| API (.NET, container) | App Service `clinicamaissaude-api-<sufixo>` | Linux **B1**, *Always On*, WebSockets | ~US$ 13/mês |
| Banco | Azure SQL `sql-clinica-<sufixo>` / `ClinicaMaisSaudeDb` | Oferta gratuita (serverless) | US$ 0 dentro da cota |
| Imagens da API | Container Registry `acrclinica<sufixo>` | Basic | ~US$ 5/mês |
| Portal web | Static Web Apps `clinicamaissaude-web-<sufixo>` | Free | US$ 0 |
| App mobile no navegador | Static Web Apps `clinicamaissaude-app-<sufixo>` | Free | US$ 0 |

A API fica sempre ligada porque o serviço de lembretes roda em segundo plano e o SignalR mantém
conexões abertas; num plano gratuito ela "dormiria".

## Passo a passo

Pré-requisitos: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`winget install -e --id Microsoft.AzureCLI`),
`az login`, .NET 10 SDK, Node 22 e o `dotnet-ef`.

1. **Infraestrutura** (idempotente; pode rodar de novo):
   ```powershell
   ./infra/azure/provisionar.ps1 -Sufixo dvs
   ```
   Gera e grava direto na API o segredo do JWT, o *pepper* e a senha do SQL (nada é impresso).

2. **Segredos pessoais** (rode você mesmo; pede a senha do admin com entrada oculta e copia a chave
   da Gemini e o SMTP do seu `user-secrets`):
   ```powershell
   ./infra/azure/definir-segredos.ps1 -Sufixo dvs
   ```

3. **Publicação** (migrations, imagem da API, portal e app):
   ```powershell
   ./infra/azure/publicar.ps1 -Sufixo dvs
   ```
   Para publicar só uma parte: `-Banco`, `-Api`, `-Web` ou `-App`.

## Observações

- **Migrations:** o `publicar.ps1 -Banco` libera o firewall do SQL só para o seu IP durante a
  execução e remove a regra ao final.
- **Segredos:** os valores vão para as *Application settings* do App Service por arquivo temporário,
  sem passar pela linha de comando. Para conferir ou trocar: portal do Azure → App Service →
  *Variáveis de ambiente*.
- **Custo:** acompanhe em *Gerenciamento de Custos*. Para pausar tudo, pare o App Service
  (`az webapp stop -g rg-clinicamaissaude -n clinicamaissaude-api-dvs`); para apagar tudo,
  `az group delete -n rg-clinicamaissaude`.
