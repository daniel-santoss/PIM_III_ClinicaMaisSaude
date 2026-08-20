# 🔧 Análise de Robustez, Segurança, Escalabilidade e Manutenção

> Diagnóstico técnico do Clínica Mais Saúde com foco em **robustez, segurança, escalabilidade e manutenibilidade**, incluindo a **camada de banco de dados**. Cada achado tem severidade, arquivo/linha, o problema e a correção recomendada.
>
> Data: 2026-08-01 · Base: `main` @ 2a0b100

---

## 📌 ESTADO DA IMPLEMENTAÇÃO (handoff — atualizado 2026-08-02)

Trabalho na branch **`teste`** (push feito). **Merge só no final.** Cada melhoria = 1 commit pequeno + push, validado com `homologar.bat` (E2E, veredito verde a cada etapa).

### ✅ Fase 1 COMPLETA
- **GUID sequencial (COMB)** — resolve #4/#1.3 (parte PK). `Domain/Common/SequentialGuid.cs`.
- **Índices de performance** (§1.1) — migration `AddIndicesDePerformance`.
- **Credencial admin fora do código** (§3.1) — `AdminSeeder` runtime + migration `RemoverSeedAdminHardcoded`.
- **Middleware global de exceções + exceções tipadas** (§3.2/§4.1) — `API/Middleware/GlobalExceptionHandler.cs`, `Application/Exceptions/*`. Migrados: Auth, Agendamento, Consulta/IA, Paciente, Especialidades, Notificações, Profissionais. Cadastro/Perfil/Dashboard deixados no padrão Result (já limpos).

### ✅ Fase 2 COMPLETA
- **§2.1 Fim dos scans de tabela inteira** (`46f4647`) — `ExisteConflito`/`ExisteConflitoPaciente`/`DelegarProfissionalAsync` deixaram de chamar `ObterTodosAsync()` (inclusive dentro de loop). Novos métodos filtrados no `IAgendamentoRepository` + helper `HaSobreposicao`.
- **§2.3 Transação atômica (Unit of Work)** (`c3b02a7` + `7a4a053`) — `IUnitOfWork`/`UnitOfWork` sobre transação EF Core; envolve criação, AlterarStatus, Remarcar e ConcluirExame. Fixture obsoleto da homologação corrigido (`0150d2b`).
- **§1.3 Concorrência otimista (`RowVersion`)** (`fce0ebe`) — token rowversion em Agendamento + migration `AddRowVersionAgendamento`; `DbUpdateConcurrencyException` → `ConflictException` → HTTP 409.
- **§2.2 Rate-limit distribuído** — **IMPLEMENTADO** (`8ce1355`, decisão de portfólio). `ConsultaService` migrado para `IDistributedCache`; Redis via `ConnectionStrings:Redis` com fallback automático em memória; `docker-compose.yml` + README. Testado: fallback (homologação verde) + 6ª chamada → 429.

### ⏭️ PRÓXIMO — Fase 3 (manutenibilidade/dados) ou Fase 4 (mobile React Native)
Fase 2 encerrada. Próximas fases conforme prioridade do usuário.

### Pendências avulsas
- `git rm --cached ClinicaMaisSaude.API/appsettings.Development.json` (trackeado apesar do .gitignore).
- Sem reescrita de histórico git (decidido). Secret scanning: pendente ativar no GitHub.

> Detalhe completo em memória `refactor-progresso.md`. Convenções front: `formatErrorMessage` (useToast) já lê ProblemDetails; `fetchInterceptor` trata 401/403/404/500, componentes tratam 400. Encerrar a API (`Stop-Process ClinicaMaisSaude.API`) antes de buildar.

---

**Legenda de severidade:** 🔴 Crítico · 🟠 Alto · 🟡 Médio · 🔵 Baixo/Evolutivo

---

## 🎯 Resumo Executivo (Top 8 por impacto)

| # | Sev | Achado | Área |
|---|-----|--------|------|
| 1 | 🔴 | `ObterTodosAsync()` (carrega TODA a tabela) chamado dentro de loop na delegação/conflito | Escalabilidade |
| 2 | 🔴 | Sem transação atômica na criação de agendamento (3+ `SaveChanges` soltos) | Robustez |
| 3 | 🔴 | Sem controle de concorrência (race condition → duplo agendamento no mesmo slot) | Robustez/DB |
| 4 | 🔴 | Hash da senha admin commitado no código-fonte (`admin123`) | Segurança |
| 5 | 🟠 | Rate-limit e anti-abuso da IA em `IMemoryCache` (quebra com >1 instância) | Escalabilidade |
| 6 | 🟠 | Índices ausentes nas colunas mais consultadas (data, status, CPF, Token) | DB/Performance |
| 7 | 🟠 | Fluxo de erros por `throw new Exception` + parsing de string ("PERMANENT_BAN:") | Manutenção/Segurança |
| 8 | 🟠 | `FotoBase64` (nvarchar max) na tabela de login, carregada em quase toda query de usuário | DB/Performance |

---

## 1. 🗄️ Banco de Dados

### 1.1 🟠 Índices ausentes nas colunas mais filtradas
Hoje só existem os índices **auto-gerados de FK** (`PacienteId`, `UsuarioId`, `AgendamentoId`) e os únicos de `LoginPortal` (`Cpf`, `Email`). As consultas quentes filtram por colunas **sem índice**:

| Coluna / Tabela | Uso | Recomendação |
|---|---|---|
| `Agendamentos.DataHoraConsulta` | filtro por dia, conflito, background service | Índice (idealmente composto) |
| `Agendamentos.Status` | filtros de listagem e delegação | Índice composto `(ProfissionalId, DataHoraConsulta, Status)` e `(PacienteId, Status)` |
| `Agendamentos.ProbabilidadeFalta` | filtro "risco alto" | Índice ou coluna calculada |
| `RefreshTokens.Token` | **toda** operação de refresh faz `WHERE Token =` sem índice | Índice único |
| `Pacientes.Cpf` | busca | Índice (e único, ver 1.4) |
| `Notificacoes (UsuarioId, Lida)` | polling a cada 60s por usuário | Índice composto |

Sem esses índices, cada operação vira **table scan** — degrada de forma não-linear conforme a base cresce.

### 1.2 🟠 `FotoBase64` como `nvarchar(max)` na tabela de login
`LoginPortal.FotoBase64` guarda a imagem inteira em Base64 **na tabela central de autenticação**. Como `AgendamentoRepository` faz `Include(Paciente).ThenInclude(Usuario)` em quase toda leitura, e `AuthService` devolve a foto no login, **toda listagem de agendamento arrasta as imagens de todos os usuários**. Isso incha payloads e uso de memória.
- **Correção:** mover foto para tabela separada (`UsuarioFoto`) carregada sob demanda, ou — melhor — armazenar em storage de arquivos/CDN e guardar só a URL. Nunca fazer `SELECT` da foto em listagens.

### 1.3 🔴 Ausência de token de concorrência (`RowVersion`)
Nenhuma entidade tem `[Timestamp]/IsRowVersion`. Combinado com o padrão "ler → validar em memória → salvar", dois pacientes podem reservar o **mesmo slot** simultaneamente (a checagem de conflito de um roda antes do commit do outro). Ver também §2.3.
- **Correção:** adicionar `public byte[] RowVersion { get; set; }` + `.IsRowVersion()` em `Agendamento` (e `LoginPortal` para o contador de tentativas de login), e tratar `DbUpdateConcurrencyException`.

### 1.4 🟡 CPF duplicado e com tipos divergentes
CPF existe em `LoginPortal.Cpf` (`nvarchar(14)`) **e** em `Paciente.Cpf` (`varchar(11)`) — tamanhos e tipos diferentes para o mesmo dado. `Paciente.Cpf` não é único.
- **Correção:** padronizar tipo/tamanho, tornar `Paciente.Cpf` único, e definir uma única fonte de verdade (evitar CPF em duas tabelas ou manter sincronizado com constraint).

### 1.5 🟡 `RefreshTokens` cresce indefinidamente
Cada login/refresh **insere** um novo token; os antigos nunca são apagados nem revogados em cadeia. A tabela cresce sem limite e sem índice (§1.1).
- **Correção:** revogar o token anterior ao emitir novo (rotação real), job de limpeza de expirados, índice único em `Token`.

### 1.6 🟡 Deleção física de agendamento quebra a trilha de auditoria
`DeletarAsync` faz `Remove` real, e o FK de `AgendamentoHistorico → Agendamento` é `Cascade` → **apaga o histórico junto**. Contradiz o requisito RF09 (auditoria imutável).
- **Correção:** soft-delete (status `Cancelado` já existe) ou `DeleteBehavior.Restrict` + arquivamento; nunca cascatear o histórico.

### 1.7 🔵 Seed de dados dentro do `OnModelCreating`
O admin e os lookups são semeados via `HasData` com GUIDs/hash fixos. Funciona, mas mistura seed de segurança com o modelo. Ver §3.1.

---

## 2. 🚀 Escalabilidade & Performance

### 2.1 🔴 `ObterTodosAsync()` dentro de loop (o pior gargalo)
Em `AgendamentoService.DelegarProfissionalAsync` (linha ~668) e `ExisteConflito` (linha ~697), o código chama `_repository.ObterTodosAsync()` — que faz `SELECT * FROM Agendamentos` **com Include de Paciente+Usuario** — e isso ocorre **dentro do `foreach` de profissionais**. Criar 1 agendamento pode ler a tabela inteira N vezes, em memória.
- **Impacto:** com 50 mil agendamentos e 10 profissionais, uma marcação carrega ~500 mil linhas + fotos Base64.
- **Correção:** substituir por consultas SQL direcionadas com `Where` (por profissional, faixa de data, status) e `CountAsync`/`AnyAsync` no banco. A checagem de conflito e a contagem de carga devem ser **queries filtradas**, não varredura em memória.

### 2.2 🟠 Rate-limit e anti-abuso em `IMemoryCache`
`ConsultaService` guarda os contadores globais/por-usuário da IA em `IMemoryCache` (memória local do processo). Idem `BloqueadoAte`/tentativas dependem de estado por instância em alguns pontos.
- **Impacto:** ao escalar horizontalmente (2+ instâncias atrás de load balancer), os limites viram "por instância" — abuso passa; comportamento não-determinístico.
- **Correção:** mover contadores para store distribuído (Redis / `IDistributedCache`) ou para o próprio banco.

> **✅ Decisão (2026-08-02) — documentado, não implementado.** Em instância única (cenário atual do projeto e da apresentação), o `IMemoryCache` funciona corretamente; o problema só se manifesta com 2+ réplicas. Adicionar Redis/`IDistributedCache` introduz uma dependência de infraestrutura (servidor Redis, connection string, container) sem ganho no ambiente-alvo. **Recomendação de deploy** quando/se for escalar horizontalmente:
> 1. Provisionar Redis e registrar `AddStackExchangeRedisCache(...)` (`IDistributedCache`).
> 2. Trocar as leituras/escritas de contador da IA em `ConsultaService` de `IMemoryCache` para `IDistributedCache` (chaves por usuário/global com TTL). A superfície é pequena e isolada nesse serviço.
> 3. Alternativa sem Redis: persistir os contadores/janelas no próprio SQL Server (tabela de rate-limit) — mais lento, porém sem nova dependência.

> **Nota de concorrência (relacionada a §1.3/§2.3) — corrida de slot.** O `RowVersion` (implementado em §1.3) protege *lost update* na **mesma linha** de agendamento (duas edições concorrentes do mesmo registro → 409). Ele **não** impede, sozinho, que duas requisições simultâneas criem **agendamentos diferentes no mesmo horário** (linhas distintas): ambas podem passar pela checagem de conflito antes de qualquer commit. Hoje isso é mitigado pela transação (§2.3) + checagem de conflito, mas a janela de corrida existe. Garantia estrita exigiria uma destas opções (não implementadas por serem custosas/edge para o cenário atual):
> - Isolamento **`Serializable`** na transação de criação (range locks na checagem de conflito) — previne a corrida, ao custo de contenção/deadlocks sob carga.
> - **Índice único filtrado** em `(ProfissionalId, DataHoraConsulta)` para status ativos — barra colisão de horário exato, mas não sobreposições de durações diferentes.

### 2.3 🔴 Operações multi-etapa sem atomicidade
Na criação de agendamento, `AdicionarAsync` (SaveChanges), `AdicionarHistoricoAsync` (SaveChanges) e `AtualizarAsync(origem)` (SaveChanges) são **commits separados**. Se um falhar no meio, o banco fica inconsistente (agendamento sem histórico, retorno sem origem atualizada).
- **Correção:** envolver a operação em uma transação (`IDbContextTransaction` / `TransactionScope`) e/ou acumular tudo num único `SaveChanges`. Repositórios que dão `SaveChanges` a cada método impedem isso → adotar **Unit of Work**.

### 2.4 🟠 Busca por nome/CPF com `.Contains()`
`ObterTodosPaginadoAsync` filtra `Paciente.Nome.Contains()` / `Cpf.Contains()` → gera `LIKE '%x%'`, não-SARGable, ignora índice. Aceitável em base pequena, custoso em escala.
- **Correção:** `StartsWith` quando possível, ou full-text search para nome.

### 2.5 🟡 Background service sem janela temporal
`NotificacaoBackgroundService` carrega **todos** os `Agendado`/`EmAtendimento` a cada 5 min, sem filtro de data. Cresce indefinidamente.
- **Correção:** filtrar por faixa relevante (ex.: hoje ± 1 dia; e "não finalizados" só das últimas 48h).

### 2.6 🟡 Notificações por polling
Front faz polling 60s + background 5min. Não escala bem e atrasa entregas.
- **Correção evolutiva:** SignalR/WebSocket ou push nativo (relevante para o futuro app mobile).

---

## 3. 🔒 Segurança

### 3.1 🔴 Credencial de admin no código-fonte
`ClinicaDbContext` semeia o admin com hash BCrypt fixo de `admin123` e CPF `00000000000`, versionado no Git.
- **Correção:** criar o admin fora do modelo (script de bootstrap/seeder que lê senha de variável de ambiente na primeira execução), forçar troca no primeiro login, e remover o hash do repositório/histórico.

### 3.2 🟠 Tratamento de erro por `throw new Exception` + parsing de string
Serviços lançam `Exception` genérica; o `AuthService` codifica regra de negócio na **mensagem** (`"PERMANENT_BAN:..."`, contagem de tentativas) que o controller/front precisa interpretar por string.
- **Problemas:** frágil (muda a string, quebra o fluxo), status HTTP imprecisos, vaza informação.
- **Correção:** exceções de domínio tipadas (`CredenciaisInvalidasException`, `ContaBloqueadaException`, `PermanentBanException`) + **middleware global** que mapeia para `ProblemDetails` (RFC 7807) com status correto.

### 3.3 🟠 Enumeração de usuário e mensagens que vazam estado
O login retorna mensagens diferentes para "não encontrado", "senha errada (N tentativas restantes)" e "bloqueado" — permite enumerar contas e sondar o estado de bloqueio. `ViolacoesIA` expõe CPF e o texto inserido nos payloads.
- **Correção:** mensagem genérica de credencial ("usuário ou senha inválidos"), tempo de resposta constante, e minimizar PII nos DTOs de auditoria.

### 3.4 🟠 CORS e configuração de segurança fixos no código
`Program.cs` fixa `WithOrigins("http://localhost:5173")` e `RequireHttpsMetadata = false`. Bom para dev, inseguro em produção.
- **Correção:** origens e flags via configuração por ambiente; `RequireHttpsMetadata = true` em produção; validar `Issuer`/`Audience` (hoje `ValidateIssuer/Audience = false`).

### 3.5 🟡 Sem rate limiting a nível de API
Só a IA tem limite. Login e endpoints públicos não têm proteção contra brute force distribuído (o bloqueio por conta ajuda, mas não cobre varredura de contas).
- **Correção:** `Microsoft.AspNetCore.RateLimiting` (nativo no .NET) por IP/rota.

### 3.6 🟡 Secrets e chave da IA
Garantir que `JwtConfig:Secret` e `GeminiApiKey` nunca entrem no repositório (usar User Secrets/variáveis de ambiente/secret manager). A chave JWT usa `Encoding.ASCII` — preferir `UTF8` e chave ≥ 256 bits.

---

## 4. 🛡️ Robustez / Confiabilidade

### 4.1 🟠 Ausência de middleware global de exceções
Não há tratamento centralizado; cada controller lida com erros de forma própria. Falhas inesperadas podem vazar stack trace ou virar 500 sem contexto.
- **Correção:** `IExceptionHandler` / middleware que loga (com `traceId`) e devolve `ProblemDetails` padronizado.

### 4.2 🟡 Fuso horário hardcoded com fallback
`ConsultaService` resolve `E. South America Standard Time` / `America/Sao_Paulo` inline. Frágil entre SOs.
- **Correção:** centralizar num serviço de tempo (`IClock`/`ITimeZoneService`), injetável e testável.

### 4.3 🟡 Cobertura de testes
Só existe a suíte E2E (`homologar-*.js`), que exige o servidor no ar. Não há testes unitários das regras críticas (máquina de estados, delegação, probabilidade de falta).
- **Correção:** xUnit + banco em memória/SQLite para as regras de domínio; manter o E2E como camada de smoke.

### 4.4 🔵 `void CLINIC_NAME; void viewPaciente;` e imports mortos
Sinais de código morto/gambiarra em `App.tsx`. Limpeza pontual.

---

## 5. 🧹 Manutenibilidade

### 5.1 🟠 `AgendamentoService` com 931 linhas (God Service)
Concentra: validações, delegação, conflito, máquina de estados, histórico, exames, paginação. Difícil de testar e evoluir.
- **Correção:** extrair responsabilidades — `AgendamentoValidator`/policies, `DelegacaoProfissionalService`, `ConflitoHorarioService`, `MaquinaEstadosAgendamento`. O service vira orquestrador fino.

### 5.2 🟠 Repositórios acoplados a `SaveChanges` + lógica em `_context` direto nos services de infra
`ConsultaService`/`AuthService`/`DashboardService` usam `ClinicaDbContext` diretamente, furando a abstração de repositório usada em outros pontos. Padrão inconsistente.
- **Correção:** decidir um padrão (Repository + Unit of Work **ou** DbContext direto com Specifications) e aplicar uniformemente.

### 5.3 🟡 DTOs `object`/anônimos na fronteira da IA
`ConsultaService.SugerirTipoAsync` retorna `object` e desserializa para `object`. Perde contrato e type-safety no front.
- **Correção:** DTO tipado de resposta da triagem.

### 5.4 🟡 Navegação por estado + CustomEvents no front
`App.tsx` orquestra abas por `useState` e eventos `window`. Escala mal e dificulta deep-linking (importante para mobile).
- **Correção:** avaliar um roteador leve; padronizar comunicação (context/reducer) em vez de eventos globais.

### 5.5 🔵 Enum `EspecialidadeMedica` com gap (pula 17)
Documentação lista até "Medicina Esportiva (18)" pulando 17 — conferir consistência do enum e mapeamentos.

---

## 6. 🗺️ Roadmap sugerido (ordem de execução)

**Fase 1 — Estabilidade e Segurança (crítico, baixo risco):**
1. Middleware global de exceções + exceções de domínio tipadas (§3.2, §4.1).
2. Remover credencial admin do código; seeder por ambiente (§3.1).
3. Índices de banco (§1.1) + índice/rotação de RefreshToken (§1.5).

**Fase 2 — Correção de escalabilidade:**
4. Refatorar `DelegarProfissionalAsync`/`ExisteConflito` para queries filtradas (§2.1).
5. Transação + Unit of Work na criação de agendamento (§2.3).
6. `RowVersion` + tratamento de concorrência (§1.3).
7. Rate-limit distribuído (§2.2).

**Fase 3 — Manutenibilidade e dados:**
8. Quebrar `AgendamentoService` (§5.1).
9. Foto fora da tabela de login / storage externo (§1.2).
10. Testes unitários das regras críticas (§4.3).

**Fase 4 — Evolução (habilita o mobile):**
11. Notificações em tempo real (SignalR/push) (§2.6).
12. Contratos tipados e roteamento (§5.3, §5.4).

---

> Nota: nada aqui foi alterado no código — é diagnóstico. Posso implementar qualquer item seguindo as convenções do projeto (`clinica-context.md`), começando pela Fase 1.
