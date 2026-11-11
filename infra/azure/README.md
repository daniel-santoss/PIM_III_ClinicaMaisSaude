# Publicação no Azure

Scripts que criam e publicam a Clínica Mais Saúde no Azure (assinatura *Azure for Students*).
A arquitetura e as alternativas estão em [`docs/nuvem/ARQUITETURA_NUVEM.md`](../../docs/nuvem/ARQUITETURA_NUVEM.md).

## O que é criado

| Recurso | Nome | Plano | Custo aprox. |
|---|---|---|---|
| API (.NET, container) | App Service `clinicamaissaude-api-<sufixo>` | Linux **B1**, *Always On*, WebSockets | ~US$ 13/mês |
| Banco | Azure SQL `sql-clinica-<sufixo>` / `ClinicaMaisSaudeDb` | **Basic** (5 DTU, 2 GB), preço fixo | ~US$ 5/mês |
| Imagens da API | GitHub Container Registry (`ghcr.io/daniel-santoss/clinica-api`) | Pacote público | US$ 0 |
| Portal web | Storage `clinicaweb<sufixo>` | Site estático | centavos |
| App mobile no navegador | Storage `clinicaapp<sufixo>` | Site estático | centavos |

Não use a oferta gratuita *serverless* do Azure SQL: o serviço de lembretes mantém o banco acordado,
a cota grátis acaba em ~2 dias e o excedente consumiu todo o crédito da primeira assinatura (nov/2026).
A região padrão é Brazil South; se a assinatura recusar (política de regiões permitidas), use `-Regiao`.

A API fica sempre ligada porque o serviço de lembretes roda em segundo plano e o SignalR mantém
conexões abertas; num plano gratuito ela "dormiria".

## Passo a passo

Pré-requisitos: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`winget install -e --id Microsoft.AzureCLI`),
`az login`, .NET 10 SDK, Node 22 e o `dotnet-ef`.

1. **Infraestrutura** (idempotente; pode rodar de novo):
   ```powershell
   ./infra/azure/provisionar.ps1 -Sufixo edu
   ```
   Gera e grava direto na API o segredo do JWT, o *pepper* e a senha do SQL (nada é impresso).

2. **Segredos pessoais** (rode você mesmo; pede a senha do admin com entrada oculta e copia a chave
   da Gemini e o SMTP do seu `user-secrets`):
   ```powershell
   ./infra/azure/definir-segredos.ps1 -Sufixo edu
   ```

3. **Imagem da API:** no GitHub, *Actions → CD → Run workflow* na branch `main`. O pipeline
   builda a imagem e publica no GHCR com a tag `sha-<commit>` (na 1ª vez, deixe o pacote
   `clinica-api` **público** em *Packages → Package settings*; ele não contém segredos).
   A assinatura de estudante bloqueia o build no Azure (ACR Tasks), por isso o build fica no GitHub.

4. **Publicação** (migrations, troca da imagem da API, portal e app):
   ```powershell
   ./infra/azure/publicar.ps1 -Sufixo edu
   ```
   Para publicar só uma parte: `-Banco`, `-Api`, `-Web` ou `-App`. Quando há migration nova, rode `-Banco`
   **antes** de `-Api`: a API nova já espera o schema atualizado.

5. **Acesso direto ao banco** (opcional, para consultar pelo SSMS):
   ```powershell
   ./infra/azure/acesso-banco.ps1 -Sufixo edu
   ```
   Define a sua conta do `az login` como administradora Microsoft Entra do servidor SQL e libera o
   seu IP no firewall (regra `AcessoDev`). No SSMS: servidor `sql-clinica-edu.database.windows.net`,
   autenticação **Microsoft Entra MFA**, banco `ClinicaMaisSaudeDb`. Mudou de IP? Rode de novo.
   Para revogar: `-Remover`.

## Observações

- **Migrations:** o `publicar.ps1 -Banco` libera o firewall do SQL só para o seu IP durante a
  execução e remove a regra ao final.
- **Segredos:** os valores vão para as *Application settings* do App Service por arquivo temporário,
  sem passar pela linha de comando. Para conferir ou trocar: portal do Azure → App Service →
  *Variáveis de ambiente*.
- **Custo:** acompanhe em *Gerenciamento de Custos*. Para pausar tudo, pare o App Service
  (`az webapp stop -g rg-clinicamaissaude -n clinicamaissaude-api-edu`); para apagar tudo,
  `az group delete -n rg-clinicamaissaude`.
