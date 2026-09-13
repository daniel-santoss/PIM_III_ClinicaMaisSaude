# Arquitetura em Nuvem, CI/CD e DevOps — Clínica Mais Saúde

Artefato do PIM IV (rubrica 08 — Nuvem e DevOps). Descreve o **plano de execução da infraestrutura**
para implantação da solução e como a esteira de **CI/CD** leva o código do *commit* ao ambiente. O desenho
é **agnóstico de provedor**: cada componente indica os alvos possíveis; a escolha final (§5) é um passo
posterior.

> **Cobertura dos itens exigidos na Etapa 8:** arquitetura em nuvem (§1), serviços utilizados (§2),
> containers (§2 + `Dockerfile`/`docker-compose.yml`), pipeline CI/CD (§3), estratégia de migração (§4),
> **escalabilidade (§7)**, **monitoramento (§8)** e **segurança (§6 + `ARQUITETURA.md` §7)**.

---

## 1. Topologia em nuvem

Cada aplicação do monorepo roda num tipo de serviço diferente. A API já lê **toda** a configuração por
variável de ambiente (ver [`../../DEPLOY.md`](../../DEPLOY.md)), então publicar é configuração — não reescrita.

```mermaid
flowchart TB
    subgraph Users["Usuários"]
      B["Navegador<br/>(paciente / equipe)"]
      P["Celular<br/>(app do paciente)"]
    end

    subgraph Static["Hospedagem estática"]
      WEB["Frontend web<br/>(build Vite → dist/)"]
    end

    subgraph Cloud["Provedor de nuvem"]
      API["API .NET (container)<br/>App Service / Fly / Railway / Render"]
      DB[("SQL Server gerenciado<br/>Azure SQL / container")]
      REDIS[("Redis — opcional<br/>rate-limit distribuído")]
    end

    subgraph Ext["Serviços externos"]
      IA["Google Gemini"]
      SMTP["SMTP (Brevo)"]
    end

    B --> WEB
    B -- HTTPS/JSON + WebSocket --> API
    P -- HTTPS/JSON + WebSocket --> API
    WEB -. chama .-> API
    API --> DB
    API -. opcional .-> REDIS
    API --> IA
    API --> SMTP
```

O **app mobile** não é "hospedado": é compilado (APK/IPA) via **EAS Build (Expo)** e distribuído; ele só
precisa apontar `EXPO_PUBLIC_API_URL` para a URL pública da API.

---

## 2. Componentes e responsabilidades

| Componente | Onde roda | Observações |
|-----------|-----------|-------------|
| **API .NET** | Container num PaaS (Azure App Service, Fly.io, Railway, Render) | Imagem já pronta em [`ClinicaMaisSaude.API/Dockerfile`](../../ClinicaMaisSaude.API/Dockerfile) |
| **Banco** | SQL Server gerenciado | O app é **SQL Server-específico** (rowversion, índices filtrados, procedures T-SQL) → exige SQL Server (Azure SQL) ou um container SQL Server, **não** Postgres |
| **Frontend web** | Hospedagem estática/CDN | `npm run build` → `dist/`; sobe em Netlify, Vercel, Cloudflare Pages ou Azure Static Web Apps |
| **Mobile** | EAS Build | Gera o binário; publicação nas lojas é opcional |
| **Redis** | Opcional | A API funciona sem ele (cai no cache em memória); habilita rate-limit multi-instância |
| **Registry de imagem** | GHCR (GitHub Container Registry) | Neutro — funciona com qualquer provedor |
| **Segredos** | Cofre do provedor + GitHub Secrets | JWT, senha do banco, Gemini, SMTP, pepper |

---

## 3. Esteira CI/CD

```mermaid
flowchart LR
    DEV["Commit / PR"] --> CI

    subgraph CI["CI — ci.yml (já ativo)"]
      C1["Backend: build + testes"]
      C2["Frontend: tsc + build"]
      C3["Mobile: tsc"]
    end

    CI -->|verde, em tag/release| CD

    subgraph CD["CD — cd.yml (manual / tag)"]
      D1["Build imagem Docker da API"]
      D2["Push → GHCR"]
      D3["Deploy no provedor *"]
      D4["Aplica migrations no banco *"]
      D5["Build + publish do frontend *"]
    end

    D3 --> RUN["API no ar"]
    D5 --> WEBRUN["Web no ar"]
```

`*` = passos que dependem do provedor/segredos escolhidos (ver §5). O [`cd.yml`](../../.github/workflows/cd.yml)
já implementa o que é **agnóstico** (build + push da imagem para o GHCR e o *artifact* do frontend) e deixa
os passos de deploy/migração **comentados**, prontos para ativar quando o provedor for definido.

### Integração Contínua (CI) — já em produção
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml): a cada *push*/PR em `main`/`teste`, roda em
paralelo o build+testes do backend, o build do frontend e o *typecheck* do mobile. É o **portão de
qualidade** que antecede qualquer deploy.

### Entrega Contínua (CD) — pronta para ativar
[`.github/workflows/cd.yml`](../../.github/workflows/cd.yml): dispara **manualmente** (`workflow_dispatch`)
ou ao publicar uma **tag** `v*` (não roda a cada push, para não gastar minutos nem publicar sem intenção).
Faz o build da imagem da API e o *push* para o GHCR; os passos de deploy/migração são ativados por provedor.

---

## 4. Estratégia de migração de banco

A API **não migra o banco no startup** por padrão (decisão de segurança — evita alteração de schema
inesperada em produção). Duas opções para o CD:

1. **Passo no pipeline (recomendado):** um job `dotnet ef database update` conectado ao banco gerenciado
   via *secret* `PROD_DB_CONNECTION`. Explícito, versionado e auditável. (Esboçado, comentado, no `cd.yml`.)
2. **Migração no startup:** ligar a aplicação automática de migrations ao subir a API. Mais simples, porém
   menos controlado. Alternativa aceitável para ambientes pequenos.

O DDL de referência também está em [`../banco/01_schema.sql`](../banco/01_schema.sql).

---

## 5. Escolha de provedor (decisão pendente)

| Opção | API | Banco | Web | Prós | Contras |
|-------|-----|-------|-----|------|---------|
| **Azure** (recomendado p/ .NET) | App Service (container) | **Azure SQL Database** (gerenciado) | Static Web Apps | "Livro-texto" p/ .NET; SQL Server gerenciado nativo; **Azure for Students** dá crédito | Curva/console maior |
| **Fly.io / Railway** | Container | SQL Server em container (volume) | Netlify/Vercel | Simples e barato | Você gerencia o SQL Server (backup/HA) |
| **Render** | Container | (sem SQL Server gerenciado) | Static Site | Deploy fácil por Git | SQL Server exige container próprio |

**Recomendação:** **Azure** se houver conta de estudante (melhor narrativa e SQL Server gerenciado). Caso
contrário, **Fly.io** (API + SQL Server container) + **Netlify** (web) é o caminho de menor custo.

Ao decidir, preencher no `cd.yml` os passos de deploy e cadastrar os *secrets* do provedor.

---

## 6. Segredos e configuração

Todos já parametrizados (ver [`../../.env.example`](../../.env.example) e [`../../DEPLOY.md`](../../DEPLOY.md)):
`JwtConfig__Secret`, `ConnectionStrings__DefaultConnection`, `GeminiAI__ApiKey`, `Security__CodigoRecuperacaoPepper`,
`EmailConfig__*`, `AdminSeed__*`, `Cors__AllowedOrigins__0`. No CD, vivem em **GitHub Secrets**; em runtime,
no cofre do provedor.

---

## 7. Escalabilidade

A solução foi desenhada para escalar **horizontalmente** (mais instâncias), não só verticalmente:

- **API sem estado (*stateless*).** A autenticação é por **JWT** — nenhuma sessão fica na memória do
  servidor. Qualquer réplica atende qualquer requisição, então basta colocar N instâncias atrás de um
  *load balancer* (nativo no App Service / Container Apps / Fly) e habilitar *autoscaling* por CPU ou
  número de requisições.
- **Rate-limit pronto para múltiplas instâncias.** Os contadores usam `IDistributedCache`: com
  `ConnectionStrings:Redis` configurado, o estado é **compartilhado** entre todas as réplicas (limite
  global correto mesmo com N instâncias); sem Redis, cai no cache em memória (instância única, para
  dev/banca). A troca é só configuração — o código do serviço não muda.
- **Tempo real (SignalR).** Para escalar o *push* de notificações além de uma instância, adiciona-se um
  ***backplane*** Redis, que propaga as mensagens entre os nós (mesma dependência Redis já prevista).
- **Banco.** **Azure SQL serverless** ajusta o *compute* automaticamente conforme a carga (com *auto-pause*
  quando ocioso, economizando); *tiers* superiores absorvem picos. Os **índices filtrados** já reduzem o
  custo das consultas quentes (agenda, fila de aprovação).
- **Frontend web.** Como é estático (`dist/` em CDN), escala praticamente sem limite e sem servidor.
- **Assíncrono.** Tarefas recorrentes (ex.: lembretes) rodam num *background service*, desacopladas do
  ciclo de requisição, o que evita segurar *threads* de API sob carga.

---

## 8. Monitoramento

O plano de observabilidade combina o que já existe no código com os recursos do provedor:

- **Logs estruturados.** Toda a aplicação usa `ILogger` (Microsoft.Extensions.Logging). O
  `GlobalExceptionHandler` registra cada falha com um **`TraceId`** e devolve esse mesmo id ao cliente
  (RFC 7807 / *ProblemDetails*) — o erro que o usuário vê é correlacionável 1:1 com a linha de log no
  agregador do provedor.
- **Health checks.** O `docker-compose` já verifica a saúde de **SQL Server** e **Redis**, e a API só
  sobe quando as dependências estão `healthy`. Passo previsto: expor um endpoint **`/health`** na API
  (ASP.NET Core HealthChecks) para o *probe* de *liveness/readiness* do PaaS reiniciar instâncias
  travadas automaticamente.
- **Métricas de negócio (funcional).** O **Dashboard** já expõe indicadores do produto — total de
  agendamentos, **taxa de absenteísmo**, especialidades mais procuradas, fluxo de exames e **auditoria de
  IA** — que funcionam como monitoramento funcional, com exportação em PDF/Excel.
- **Métricas de infraestrutura.** CPU, memória, latência, taxa de erro e volume de requisições vêm do
  painel do provedor (**Application Insights** no Azure; métricas nativas no Fly/Railway), com **alertas**
  configuráveis (ex.: erro 5xx acima de um limiar, banco próximo do limite de DTU).
- **Trilha de auditoria.** Eventos sensíveis já são persistidos: **violações de IA** (`UsoInadequadoIA`)
  e o **histórico de status** de agendamento (via *trigger* → `AgendamentoHistorico`), dando rastro para
  investigação e conformidade (LGPD).

---

## 9. O que falta para publicar de fato

- [ ] Escolher o provedor (§5) e criar a conta.
- [ ] Provisionar o banco gerenciado e obter a *connection string*.
- [ ] Cadastrar os *secrets* (GitHub + provedor).
- [ ] Ativar os passos de deploy/migração no [`cd.yml`](../../.github/workflows/cd.yml).
- [ ] Apontar `EXPO_PUBLIC_API_URL` (mobile) e `VITE_API_URL` (web) para a URL pública.

> Estes passos envolvem conta, credenciais e custo — são executados pelo responsável do projeto. O diagrama,
> o pipeline e a documentação (este pacote) fecham a rubrica 08 na monografia independentemente da publicação.
