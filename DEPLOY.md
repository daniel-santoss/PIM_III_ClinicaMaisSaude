# Deploy — Clínica Mais Saúde

Guia para hospedar a aplicação. Hoje o projeto roda **local/LAN**; nada está publicado.
A API (.NET 10) já lê **toda** a configuração via `IConfiguration`, que inclui variáveis de
ambiente — então em produção **não há segredo no código**: tudo vem do ambiente.

> Convenção: seções aninhadas viram env var com **`__`** (duplo underscore).
> Ex.: `JwtConfig:Secret` → `JwtConfig__Secret`; item de array → `Cors__AllowedOrigins__0`.

## 1. Variáveis de ambiente da API (produção)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | sim | `Production` |
| `ConnectionStrings__DefaultConnection` | sim | String de conexão do SQL Server |
| `JwtConfig__Secret` | **sim** | Chave HMAC do JWT (≥ 32 chars). App falha ao subir se ausente |
| `JwtConfig__Issuer` | não | Default `ClinicaMaisSaude` |
| `JwtConfig__Audience` | não | Default `ClinicaMaisSaudeApp` |
| `AdminSeed__Email` | sim | E-mail do admin semeado no 1º boot |
| `AdminSeed__Cpf` | sim | CPF do admin |
| `AdminSeed__Password` | **sim (prod)** | Senha do admin. Em produção o boot falha se não definida (sem fallback `admin123`) |
| `Security__CodigoRecuperacaoPepper` | **sim** | Pepper (HMAC) da recuperação de senha. Gere com `openssl rand -base64 32` |
| `EmailConfig__Host` | p/ enviar e-mail | Servidor SMTP (ex.: `smtp-relay.brevo.com`). Se vazio, o código só é logado |
| `EmailConfig__Port` | não | Default `587` |
| `EmailConfig__User` | p/ enviar e-mail | Login SMTP |
| `EmailConfig__Password` | p/ enviar e-mail | Chave/senha SMTP |
| `EmailConfig__From` | p/ enviar e-mail | Remetente verificado |
| `EmailConfig__FromName` | não | Default `Clínica Mais Saúde` |
| `EmailConfig__LogoUrl` | não | URL pública da logo no e-mail (evita anexo no Gmail) |
| `GeminiAI__ApiKey` | p/ triagem IA | Chave do Gemini |
| `GeminiAI__Model` | não | Default `gemini-2.5-flash` |
| `Cors__AllowedOrigins__0` | sim | URL do front-end (ex.: `https://app.suaclinica.com`). Adicione `__1`, `__2`… p/ mais |
| `ConnectionStrings__Redis` | não | Se definido, usa Redis p/ rate-limit distribuído (multi-instância); senão, cache em memória |

## 2. Front-end e mobile (build-time)

- **Web (Vite)** — definidas no build: `VITE_API_URL` (URL pública da API), `VITE_ADMIN_EMAIL`, `VITE_MAX_PROMPT_LENGTH`.
- **Mobile (Expo)** — `EXPO_PUBLIC_API_URL` (URL pública da API; embutida no bundle).

## 3. Banco de dados (migrações)

O app **não** migra sozinho — só semeia o admin. Aplique o schema na base de produção antes/junto do deploy:

```bash
dotnet ef database update \
  --project ClinicaMaisSaude.Infrastructure \
  --startup-project ClinicaMaisSaude.API \
  --connection "<sua_connection_string_de_producao>"
```

(Ou gere o script idempotente: `dotnet ef migrations script --idempotent -o migrate.sql` e rode no banco.)

## 4. Rodar com Docker

```bash
# build (contexto = raiz do repo)
docker build -t clinica-api -f ClinicaMaisSaude.API/Dockerfile .

# run (exemplo; troque os valores)
docker run -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ConnectionStrings__DefaultConnection="Server=...;Database=ClinicaMaisSaude;User Id=...;Password=...;TrustServerCertificate=True" \
  -e JwtConfig__Secret="<32+ chars>" \
  -e AdminSeed__Email="admin@clinicamaissaude.com.br" -e AdminSeed__Cpf="00000000000" -e AdminSeed__Password="<senha>" \
  -e Security__CodigoRecuperacaoPepper="<openssl rand -base64 32>" \
  -e Cors__AllowedOrigins__0="https://app.suaclinica.com" \
  clinica-api
```

Ou a stack completa (API + SQL Server + Redis) via `docker-compose.yml` — ver comentários lá.
Copie `.env.example` para `.env` (gitignored) e preencha os valores.

- A API escuta em **8080** (HTTP). Coloque um proxy/faixa TLS na frente (o provedor costuma cuidar do HTTPS).
- Plataformas que injetam `$PORT` (Render/Railway): rode com `ASPNETCORE_HTTP_PORTS=$PORT`.
- QuestPDF (relatórios PDF) exige `libfontconfig1` no Linux — já incluído na imagem.

## 5. Onde hospedar (opções p/ um PIM)

- **Render / Railway / Fly.io** — grátis/barato, deploy por Dockerfile, banco gerenciado fácil. Ótimo p/ demo.
- **Azure** (App Service + Azure SQL) — tier estudante; casa com o item *Nuvem e DevOps* do PIM IV.
- **VPS + Docker** — mais controle, mais trabalho.

Front-end web: build estático (`npm run build`) → qualquer host estático (Vercel/Netlify/Render Static/Azure Static Web Apps).

## 6. Checklist de go-live

- [ ] Banco de produção criado + migrações aplicadas (§3)
- [ ] Todas as env vars obrigatórias definidas (§1)
- [ ] `Cors__AllowedOrigins__0` = domínio real do front
- [ ] `VITE_API_URL` / `EXPO_PUBLIC_API_URL` apontando p/ a API pública
- [ ] SMTP verificado (remetente confirmado no provedor) + `EmailConfig__LogoUrl` setada
- [ ] Pepper e JWT secret **novos** (não reusar os de dev)
- [ ] HTTPS ativo (proxy do provedor)
