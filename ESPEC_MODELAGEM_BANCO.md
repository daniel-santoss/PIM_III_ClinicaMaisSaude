# Especificação — Refactor de Modelagem do Banco

Clínica Mais Saúde · branch `teste` · base: migration `InitialCreate` consolidada.

Objetivo: consolidar identidade, unificar papéis, fechar furos de integridade referencial, padronizar nomes/lookups e enriquecer o ciclo de vida do cliente. Também serve de artefato para o PIM IV (rubrica 07 — banco/MER).

---

## ⚠️ v2 EM ANDAMENTO (2026-08-30) — este doc descreve o refactor de 8 fases (concluído); um SEGUNDO refactor está em curso

O **user-model v2** (incremental, branch `teste`) revisa parte do que está abaixo. Detalhe
executável completo no plano `~/.claude/plans/peppy-weaving-truffle.md` e na memória
`refactor-modelo-usuario-v2`. **Migrations Fase10..Fase18.** Estado (2026-08-30, topo `74edfe2`):

**✅ Papéis (Thread A):**
- **`TipoUsuario` REMOVIDO** → enum unificado **`RoleUsuario`** {Paciente=1, Admin=2, Medico=3,
  Enfermeira=4} + `RoleUsuarioLookup`. `LoginPortal.Role` NOT NULL é a fonte única do papel. (Fase11/Fase12.)
- **`Profissional.TipoProfissional` REMOVIDO** (Fase13): a categoria do profissional vem do `Role` (via
  `PapeisMap.RoleDoTipo`). O enum `TipoProfissional` + lookup + `Agendamento.TipoProfissional` **sobrevivem**
  só como conceito de **agenda** — "papel da pessoa" ≠ "categoria da consulta".

**✅ Identidade (Thread B) — reversão da decisão "SEM Pessoa":**
- Nova tabela **`Pessoa`** (Nome/Cpf/Email/Telefone, únicos) é a fonte única de identidade. `LoginPortal`
  virou **credencial pura** (SenhaHash+PessoaId+Role+estado de login) — colunas de identidade DROPADAS
  (Fase16). `Paciente`/`Profissional` referenciam `Pessoa`. (Fase14/Fase15/Fase16.)
- **`Paciente.UsuarioId` agora OPCIONAL** (Fase18, índice único FILTRADO): permite o **proponente sem
  login** (auto-cadastro em análise).

**✅ Situação unificada (Fase17):** `SituacaoCliente` + `SituacaoProfissional` fundidos num único enum/lookup
**`Situacao`** {Ativo=1, Inativo=2, Excluido=3, Banido=4, EmAnalise=5} (validade por tipo garantida no domínio).

**✅ Auto-cadastro moderado (Thread D — D1/D2/D3):** 4 tabelas de **Declaração de Saúde** —
`ModeloDeclaracaoSaude` (ModeloPadrao único), `PerguntaDeclaracaoSaude`, `SolicitacaoCadastro`
(Status EmAnalise/Aprovada/Recusada) + `RespostaDeclaracaoSaude` (única por Solicitacao+Pergunta) +
lookup `StatusSolicitacao` (Fase18). Endpoints anônimos GET declaração / POST solicitar (anti-fraude:
CPF checksum + 1 solicitação aberta por CPF + rate-limit por IP generoso). Proponente = Pessoa +
Paciente[EmAnalise] sem login + Solicitacao + Respostas. **D3 (aprovação admin):** endpoints admin
listar/aprovar/recusar as solicitações (state machine Aprovar/Recusar) — sem mudança de schema.

**Fase 0 (pré-Thread A):** `Agendamento` ganhou navegações `Profissional`/`AgendamentoOrigem`; enum
`TipoViolacao` movido p/ `Domain/Enums`; `SituacaoProfissional` Ativo/Inativo (depois unificado em Situacao).

Progresso: 83 testes. **Próximo: D4** (1º acesso) → D5 (editor web) → D6 (fila web) → D7 (mobile).
Pendente do backlog v1: decouplings (tabela `LembreteEnviado`, Value Object `Cpf` — hoje há
o helper `Domain/Common/Cpf`, auditoria com ator).

## 0. Status de implementação (2026-08-15)

Migrations aplicadas no banco local: `InitialCreate` → `Fase1_LookupsEnums` → `Fase2_TipoUsuario`. Testes = **61** (44 Domain + 17 Application). Commits **locais, não pushados**.

- ✅ **Fase 1 — commitada** (`Feat(db): Fase 1 - lookups dos enums`): 5 tabelas de lookup (`TipoProfissionalLookup`, `EspecialidadeLookup`, `TipoConsultaLookup`, `TipoEventoHistoricoLookup`, `TipoViolacaoLookup`) + 9 FKs. **Decisão real:** entidades e tabelas mantiveram o **sufixo `Lookup`** (padrão do `StatusAgendamentoLookup`), NÃO renomeei (o entity-name colidiria com o enum). `StatusAgendamentoLookup` NÃO foi renomeado.
- ✅ **Fase 2 — commitada** (`Feat(auth): Fase 2 - papel unificado TipoUsuario`): enum `TipoUsuario`{Paciente=1,Profissional=2,Admin=3} + `TipoUsuarioLookup`; `LoginPortal.IsAdmin` removido; migration com backfill.
  - **Desvio importante do plano:** o "admin libera tudo" virou **regra central** — `AdminSuperusuarioHandler` (`ClinicaMaisSaude.API/Authorization/`, registrado no `Program.cs`) faz o admin satisfazer QUALQUER `[Authorize]`. Por isso os `[Authorize(Roles = Medico + "," + Enfermeira)]` **ficaram intactos** (não troquei por `Profissional+Admin`).
  - **Papel no JWT continua GRANULAR** (Medico/Enfermeira/Paciente/Admin) no claim `Role` e `TipoUsuario` — necessário porque regras de negócio distinguem Medico de Enfermeira (ex.: AgendamentosController). O `usuario.TipoUsuario` (coluna) é que é grosso. Admin é explícito na derivação (antes caía em "Medico" via o perfil Dr. Admin).
  - Checagens manuais `IsAdmin` → `User.IsInRole(PerfisUsuario.Admin)`. Claim/constante `ClinicaClaims.IsAdmin` removida. `LoginResponse.IsAdmin` mantido, derivado (`TipoUsuario==Admin`).
- ✅ **Fase 3 — commitada** (`Feat(db): Fase 3 - identidade consolidada no LoginPortal`): `LoginPortal` (Usuario) vira dono de **Nome/Telefone** (além de Cpf/Email); `Paciente` perde `Nome/Cpf/Telefone/Email` e `UsuarioId` vira **obrigatório + índice único (1:1)**; `Profissional` perde `Nome`. Migration `Fase3_IdentidadeLoginPortal` com **backfill** (copia Nome/Telefone dos perfis p/ LoginPortal ANTES de dropar; Nome = COALESCE(prof, pac, 'Usuário')) e `UsuarioId` not-null. Build 0 erros, **61 testes verdes**, homologação E2E VERDE (só IA em 503 — ambiental).
  - **Desvios/decisões reais da Fase 3:**
    - **`PacienteService.AdicionarAsync` desativado** (lança `BusinessRuleException`): criar paciente "solto" (sem login) deixou de existir — não há onde guardar identidade. O `POST /api/Pacientes` não é usado pelo front nem pela homologação (cadastro é via `/api/LoginPortal/cadastro`). `PUT /api/Pacientes/{id}` (`AtualizarAsync`) passou a gravar Nome/Email/Telefone no LoginPortal (homologação T2.7 verde).
    - **Login por email NÃO foi trocado ainda** (o lookup em `AuthService` segue `Email == x || Cpf == x`, e o DTO segue `LoginRequest.Identificador`). O rename `Identificador→Email` + email-only é cross-cutting (front web + mobile enviam `identificador`), então ficou **deferido** para não quebrar contrato — decisão de risco. Reavaliar com o usuário se ainda quer CPF fora do login.
    - `CadastroRequest` não tem Telefone → `Usuario.Telefone` nasce nulo no cadastro (era placeholder `00000000000` no Paciente antes).
- ✅ **Fase 4 — commitada** (`Feat(db): Fase 4 - situacao_Cliente substitui o bool Ativo`): `Paciente.Ativo` (bool) → `Paciente.SituacaoCliente` (enum→lookup `SituacaoClienteLookup` {Ativo=1,Desativado=2,Excluido=3,Banido=4}). Métodos: `Desativar()`→Desativado (admin, reversível), `Excluir()`→Excluido (self-service), `Banir()`→Banido (permanente), `Reativar()`→Ativo; `EstaAtivo` (== Ativo). Login e **middleware** (Program.cs) bloqueiam paciente não-ativo. Ban de IA de paciente vira `Banir()`; `RemoverPenalidade` reativa. Migration `Fase4_SituacaoCliente` com backfill (Ativo/ban +100 anos → SituacaoCliente). Build 0 erros, **63 testes**, homologação VERDE (só IA 503).
  - **Desvio real da Fase 4:** o ban permanente vira `SituacaoCliente=Banido` **para pacientes**; **staff (profissional/admin) sem perfil de paciente ainda cai no `Usuario.BloquearPermanentemente()` (+100 anos)** como fallback — o hack não morreu 100% porque Banido só existe no Paciente. Aceitável (o ban de IA é feature voltada a pacientes). Reavaliar se quiser banir staff via outra via.
- ✅ **Fase 5 — commitada** (`Feat(db): Fase 5 - FKs faltantes em Agendamento`): FKs `ProfissionalId`→Profissionais, `AgendamentoOrigemId`→Agendamentos (self), `EspecialidadeId`→EspecialidadeLookup — todas **Restrict**. `Agendamento.EspecialidadeId` mudou de `int?` → `EspecialidadeMedica?` (casa com o FK; `DefinirEspecialidade` converte do `int?` do DTO). Build 0 erros, **63 testes**, homologação VERDE (ciclo de agendamento + purge respeitam as FKs).
- ✅ **Fase 6 — commitada** (`Feat(db): Fase 6 - penalidade de IA na conta + notificacao`): `BloqueadoIAAte` migra `Paciente`→`LoginPortal` (+ `BloquearIA`/`IsIABloqueada`/`DesbloquearIA`). `PenalidadeRemovidaAvisar` **deixa de existir** — ao perdoar, o admin gera `Notificacao("Penalidade removida")` + push SignalR. Removidos: `ConsumarAvisoPenalidade`, o consumo no `AuthService`, `LoginResponse.PenalidadeRemovida`. Migration `Fase6_PenalidadeIA` com backfill. Build 0 erros, **63 testes**, homologação VERDE.
  - **Nota de contrato:** a projeção de violações (`ObterViolacoesAsync`) mantém o campo `PenalidadeRemovidaAguardandoLogin` retornando **constante `false`** (o front `ViolacoesList.tsx` ainda o lê); `IABloqueadaAte` agora vem do LoginPortal. O front pode ser simplificado depois. `Login.tsx` degrada de boa (sem `penalidadeRemovida` → sem modal; o aviso vira notificação no feed).
- ✅ **Fase 7 — commitada** (`Feat(db): Fase 7 - ult_Atualizacao`): interface `IAuditavel` (`UltAtualizacao` + `MarcarAtualizacao`) em `Usuario`/`Paciente`/`Profissional`/`Agendamento`; carimbo central `CarimbarAtualizacao()` no `SaveChangesAsync` (entries `Modified`). Coluna `ult_Atualizacao` (datetime2 null). Lookups e append-only fora. Build 0 erros, **63 testes**, homologação VERDE.
- ✅ **Fase 8 — commitada** (`Feat(db): Fase 8 - nomenclatura`): RefreshToken pt-BR (`IsUsed`→`Usado`, `IsRevoked`→`Revogado`, `AddedDate`→`Dt_Criado`, `ExpiryDate`→`Dt_Expiracao`, via `RenameColumn` sem perda); DbSet `ViolacoesIA`→`UsoInadequadoIA` (só código, tabela já era `UsoInadequadoIA`). Build 0 erros, **63 testes**, homologação VERDE (refresh token ok).

### 🏁 REFACTOR COMPLETO — todas as 8 fases feitas
Migrations aplicadas: `InitialCreate` → `Fase1_LookupsEnums` → `Fase2_TipoUsuario` → `Fase3_IdentidadeLoginPortal` → `Fase4_SituacaoCliente` → `Fase5_FksAgendamento` → `Fase6_PenalidadeIA` → `Fase7_UltAtualizacao` → `Fase8_Nomenclatura`. Tudo pushado na `teste`. Pendências conhecidas (não do refactor): validação de IA capada por falta de chave Gemini nesta máquina; itens de contrato adiados (login por email/DTO `Identificador`, front `ViolacoesList`/`Login` que podem ser simplificados) — ver notas nas fases.

**⚠️ Validação de IA capada:** o Gemini não está configurado nesta máquina → endpoint de IA dá 503; a FASE 9 da homologação (injeção/ban) falha por isso (ambiental, não do refactor). O resto da homologação dá veredito VERDE.

### Receita operacional (validar cada fase)
```bash
# 1. LocalDB às vezes trava com sqlservr.exe órfão → matar + start:
powershell -Command "Get-Process sqlservr -EA SilentlyContinue | Stop-Process -Force"; sqllocaldb start MSSQLLocalDB
export PATH="$HOME/.dotnet/tools:$PATH"                    # dotnet-ef
export PATH="/c/Program Files/nodejs:$PATH"               # node
# 2. build + migration + testes:
dotnet build ClinicaMaisSaude.slnx --nologo
dotnet ef migrations add <Nome> --project ClinicaMaisSaude.Infrastructure --startup-project ClinicaMaisSaude.API
dotnet ef database update --project ClinicaMaisSaude.Infrastructure --startup-project ClinicaMaisSaude.API
dotnet test ClinicaMaisSaude.slnx --nologo                # exit 0 = passou (saída não é capturada; confie no exit code)
# 3. homologação E2E (API em background + curl --retry, SEM 'sleep' de shell que é bloqueado):
#    dotnet run --project ClinicaMaisSaude.API --no-build --urls http://localhost:5045   (run_in_background)
#    curl --retry 40 --retry-connrefused --max-time 60 http://localhost:5045/swagger/index.html
#    node homologar-sistema-completo.js   (o script faz "pristine purge" no fim, preserva o admin)
#    encerrar: powershell Get-Process ClinicaMaisSaude.API | Stop-Process -Force
```
Sempre encerrar a API antes de buildar (senão "arquivo bloqueado"). Autor de commit: Daniel Vinicius; terminar msg com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## 1. Decisões travadas

1. **Sem tabela `Pessoa`.** Não há paciente sem login → o `LoginPortal` é o dono da identidade (Nome/Cpf/Email/Telefone) além da credencial.
2. **Login por email apenas.** CPF deixa de autenticar (continua como identidade, unique). `LoginRequest.Identificador` → `Email`.
3. **`Paciente` e `Profissional` continuam tabelas separadas** — perfis magros que referenciam `LoginPortal` (`UsuarioId` obrigatório, unique).
4. **Papel grosso `TipoUsuario` = { Paciente, Profissional, Admin }** (substitui `IsAdmin`). Sub-tipo **Enfermeira/Medico fica em `Profissional.TipoProfissional`**.
5. **Todos os enums viram tabelas de lookup** (padrão `StatusAgendamentoLookup`).
6. **`situacao_Cliente` = lookup próprio** no `Paciente`: **Ativo · Desativado · Excluido · Banido**. Substitui o boolean `Ativo` (não há mais bool de ativo em lugar nenhum).
7. **`ult_Atualizacao`** (updated-at, datetime) nas tabelas mutáveis, carimbado automático no `SaveChangesAsync`.
8. **Nome da tabela `LoginPortal` mantido.** **`UsoInadequadoIA` mantido** (alinhar só o `DbSet`, hoje `ViolacoesIA`, para bater com a tabela — só código).
9. **`Dt_Criado` mantido.** Só corrigir inconsistências gritantes (RefreshToken em inglês).
10. **Flags de lembrete no `Agendamento` ficam** como estão (uso local, sem drift).
11. **Plano / ficha de saúde / `emAvaliacao` = BACKLOG** (feature nova, fora deste refactor — ver §12).

---

## 2. Modelo-alvo — tabelas principais

### `LoginPortal` — identidade + credencial
| Coluna | Tipo | Nota |
|--------|------|------|
| `Id` | Guid (PK) | |
| `Nome` | nvarchar(100), req | 🆕 de Paciente/Profissional |
| `Cpf` | varchar(11), unique, req | identidade (não loga) |
| `Email` | nvarchar(150), unique, req | **login** |
| `Telefone` | varchar(11), null | 🆕 de Paciente |
| `SenhaHash` | nvarchar(max), req | |
| `TipoUsuarioId` | int, FK→`TipoUsuario` | 🆕 substitui `IsAdmin` |
| `TentativasLogin` | int | trava de login (temporária) |
| `BloqueadoAte` | datetime2, null | trava de login (temporária) |
| `BloqueadoIAAte` | datetime2, null | 🆕 de Paciente — penalidade IA (temporária) |
| `UltimoAcesso` | datetime2, null | |
| `ult_Atualizacao` | datetime2, null | 🆕 updated-at automático |
| `Dt_Criado` | datetime2 | |

Removidas: `IsAdmin`. Relação 1:1 `UsuarioFoto` inalterada. **Sem `Ativo`** — a situação da conta de paciente vive em `Paciente.situacao_Cliente`; contas de staff seguem sempre ativas (como hoje).

### `Paciente` — perfil clínico
| Coluna | Tipo | Nota |
|--------|------|------|
| `Id` | Guid (PK) | |
| `UsuarioId` | Guid, FK→`LoginPortal`, unique, **req** | era nullable |
| `TemProblemaMemoria` | bit, default false | |
| `SituacaoClienteId` | int, FK→`SituacaoCliente`, default Ativo | 🆕 substitui o bool `Ativo` |
| `ult_Atualizacao` | datetime2, null | 🆕 updated-at automático |
| `Dt_Criado` | datetime2 | |

Removidas: `Nome`/`Cpf`/`Telefone`/`Email` → `LoginPortal`; `Ativo` → `SituacaoClienteId`; `BloqueadoIAAte` → `LoginPortal`; `PenalidadeRemovidaAvisar` → vira `Notificacao`.

### `Profissional` — perfil profissional
| Coluna | Tipo | Nota |
|--------|------|------|
| `Id` | Guid (PK) | |
| `UsuarioId` | Guid, FK→`LoginPortal`, unique, req | |
| `TipoProfissionalId` | int, FK→`TipoProfissional` | Enfermeira/Medico (enum→lookup) |
| `Crm` | nvarchar(20), null | |
| `UfCrm` | nvarchar(2), null | |
| `ult_Atualizacao` | datetime2, null | 🆕 updated-at automático |
| `Dt_Criado` | datetime2 | |

Removidas: `Nome` → `LoginPortal`.

`Paciente` e `Profissional` ficam simétricos: `Id` + `UsuarioId` + campos próprios + `ult_Atualizacao` + `Dt_Criado`.

---

## 3. Tabelas de lookup (enums → tabelas)

Padrão `StatusAgendamentoLookup`: `Id` (int, `ValueGeneratedNever`) + `Nome` + `Dt_Criado`, seed via `HasData(Enum.GetValues(...))`. **Os `Id` batem com os valores int atuais do enum** para preservar dados já gravados.

| Lookup | Origem | Seed |
|--------|--------|------|
| `StatusAgendamento` | já existe (`StatusAgendamentoLookup`) | — |
| `TipoUsuario` | **enum novo** | 1 Paciente, 2 Profissional, 3 Admin |
| `TipoProfissional` | enum existente | 0 Enfermeira, 1 Medico |
| `Especialidade` | `EspecialidadeMedica` | 0..17 |
| `TipoConsulta` | enum existente | valores do enum |
| `TipoEventoHistorico` | enum existente | 1..4 |
| `TipoViolacao` | enum existente | 1 Injecao, 2 UsoIndevido |
| `SituacaoCliente` | **enum novo** | Ativo, Desativado, Excluido, Banido |

Sugestão: renomear `StatusAgendamentoLookup` → `StatusAgendamento` (as novas ficam sem sufixo `Lookup`).

### `SituacaoCliente` — semântica e transições
| Estado | Significado | Login |
|--------|-------------|-------|
| `Ativo` | normal | acesso total |
| `Desativado` | admin desliga (reversível) | sem acesso até reativar |
| `Excluido` | soft-delete self-service (já existe) | não loga |
| `Banido` | banimento permanente (abuso de IA) — substitui o hack do `BloqueadoAte = +100 anos` | não loga |

Bloqueios **temporários** (`BloqueadoAte` por tentativas, `BloqueadoIAAte` penalidade) **continuam timestamp** — auto-expiram, não são situação.

---

## 4. Integridade referencial — FKs faltantes

Na tabela `Agendamentos`, hoje sem FK:
- `ProfissionalId` → `Profissionais` (Restrict).
- `AgendamentoOrigemId` → `Agendamentos` (self; Restrict, nullable).
- `EspecialidadeId` → `Especialidade` (nullable).
- `TipoConsulta` → `TipoConsulta` (lookup).
- `TipoProfissional` (snapshot histórico, **mantido**) → `TipoProfissional` (lookup).

Outras:
- `ProfissionalEspecialidade.EspecialidadeId` → `Especialidade`.
- `AgendamentoHistorico.TipoEvento` → `TipoEventoHistorico`; `StatusAnterior`/`StatusNovo` → `StatusAgendamento` (nullable). `RealizadoPor` → deixado solto (auditoria; FK opcional).
- `UsoInadequadoIA.TipoViolacao` → `TipoViolacao`.

---

## 5. Penalidade de IA

- **`PenalidadeRemovidaAvisar` deixa de existir.** Admin remove a penalidade → cria `Notificacao(usuarioId, "Penalidade removida", …)`. Some a lógica de "avisar no login" (`ConsumarAvisoPenalidade`, checagem no `AuthService`, `LoginResponse.PenalidadeRemovida`). `Lida` cobre o "já avisei"; SignalR empurra.
- **`BloqueadoIAAte` (temporário) migra de `Paciente` → `LoginPortal`** (junto do `BloqueadoAte`; violações em `UsoInadequadoIA` já são por `UsuarioId`).
- **Banimento permanente** deixa de ser `BloqueadoAte = +100 anos` e vira `SituacaoCliente = Banido`.

---

## 6. Nomenclatura (correções gritantes)

- `RefreshTokens`: `IsUsed`→`Usado`, `IsRevoked`→`Revogado`, `AddedDate`→`Dt_Criado`, `ExpiryDate`→`Dt_Expiracao`, `JwtId` mantido. (Opcional: tornar a entidade rica — setters privados.)
- `UsoInadequadoIA`: tabela **mantida**; renomear só o `DbSet ViolacoesIA` → `UsoInadequadoIA` (código).
- `Dt_Criado` mantido; `ult_Atualizacao` como updated-at.

---

## 7. `ult_Atualizacao` (updated-at automático)

- Interface `IAuditavel { DateTime? ult_Atualizacao }` nas 4 entidades mutáveis: `LoginPortal`, `Paciente`, `Profissional`, `Agendamento`.
- Carimbo central no override `SaveChangesAsync` do `ClinicaDbContext`:
  ```csharp
  foreach (var e in ChangeTracker.Entries<IAuditavel>().Where(x => x.State == EntityState.Modified))
      e.Entity.ult_Atualizacao = DateTime.UtcNow;
  ```
- **Não** vai em lookups (imutáveis) nem em append-only (`AgendamentoHistorico`, `UsoInadequadoIA`).

---

## 8. Impacto por camada

- **Domain:** novos enums/lookups (`TipoUsuario`, `SituacaoCliente`, etc.); `Usuario` (LoginPortal) ganha Nome/Telefone/TipoUsuarioId/BloqueadoIAAte/ult_Atualizacao e perde IsAdmin; `Paciente` enxuga e ganha `SituacaoClienteId`; `Profissional.TipoProfissional` vira FK; construtores mudam; interface `IAuditavel`.
- **Infrastructure:** `ClinicaDbContext` (lookups, FKs, carimbo updated-at), `AdminSeeder` (admin com `TipoUsuario=Admin` + Nome), repositórios (`ProfissionalRepository` filtra por lookup; `UsuarioRepository`), `ConsultaService` (troca `u.IsAdmin` por `TipoUsuario==Admin`). Migrations por fase.
- **Application/API:** `AuthService` (login por email; role do `TipoUsuario`; sem claim `IsAdmin`; identidade lida do `LoginPortal`; gating por `SituacaoCliente` do paciente; penalidade vira notificação). Controllers: `IsAdmin` manual → `[Authorize(Roles=...)]`/role. DTOs: `LoginRequest.Identificador`→`Email`; `LoginResponse.IsAdmin` derivado; remove `PenalidadeRemovida`. `ClinicaClaims.IsAdmin` removido.
- **Testes:** ajustar construtores de `Usuario`/`Profissional`/`Paciente` nos fakes e testes de domínio.
- **Front web:** login por email; trata `penalidadeRemovida` → passa a usar o feed de notificações.
- **Mobile:** login já usa identificador (ok com email); baixo impacto.

---

## 9. Backfill de dados (nas migrations)

Banco local está praticamente vazio (só o admin do seeder), mas documentado:
- `LoginPortal.Nome` ← `Paciente.Nome`/`Profissional.Nome`; admin sem perfil → "Administrador".
- `LoginPortal.Telefone` ← `Paciente.Telefone`.
- `LoginPortal.TipoUsuarioId` ← `IsAdmin` ? Admin : (tem Profissional ? Profissional : Paciente).
- `LoginPortal.BloqueadoIAAte` ← `Paciente.BloqueadoIAAte`.
- `Paciente.SituacaoClienteId` ← `Ativo` ? Ativo : Excluido (ban de +100 anos → Banido).
- Copiar antes de dropar as colunas de origem.

---

## 10. Plano de execução (fases; cada uma com build + 57 testes + homologação verdes)

1. ✅ **FEITA — Lookups dos enums** (só os 5 com coluna existente; `TipoUsuario` e `SituacaoCliente` foram/vão nas suas fases). Baixo risco.
2. ✅ **FEITA — `TipoUsuario` + remover `IsAdmin`** — papel unificado, JWT, `AdminSuperusuarioHandler`.
3. ✅ **FEITA — Consolidação de identidade no `LoginPortal`** (a maior). Ver §0 para desvios reais (AdicionarAsync desativado; login-email deferido). `Nome` agora sai sempre do `LoginPortal`; migration com backfill aplicada.
4. ✅ **FEITA — `situacao_Cliente`** — lookup + `Paciente.SituacaoCliente`; trocou o bool `Ativo`; gating de login + middleware; ban permanente → `Banido` (staff ainda usa fallback +100 anos — ver §0).
5. ✅ **FEITA — FKs faltantes em `Agendamento`** — ProfissionalId→Profissional, AgendamentoOrigemId→self, EspecialidadeId→Especialidade (Restrict); `int?`→`EspecialidadeMedica?`.
6. ✅ **FEITA — Penalidade de IA** — `BloqueadoIAAte`→LoginPortal; `PenalidadeRemovidaAvisar`→Notificacao (ver §0).
7. ✅ **FEITA — `ult_Atualizacao`** — interface `IAuditavel` + carimbo central no `SaveChangesAsync`.
8. ✅ **FEITA — Nomenclatura** — colunas do `RefreshToken` (`IsUsed`→`Usado` etc.); `DbSet ViolacoesIA`→`UsoInadequadoIA` (tabela mantém nome).

Ordem: 1 ✅ → 2 ✅ → **3** → 4 → (5, 6, 7, 8 independentes). Cada fase = 1 migration + 1 commit na `teste`.

---

## 11. Riscos e mitigação

- **Maior risco: fase 3** (muitos pontos leem `Paciente.Nome`/`Usuario.Email`). Build incremental + testes + homologação a cada passo.
- **Backfill**: local quase vazio, mas escrever o SQL de cópia mesmo assim.
- **Contrato do front**: `LoginResponse.IsAdmin` mantido (derivado); `PenalidadeRemovida` removido exige ajuste no front.
- Cada fase = 1 commit + push na `teste`. Sem reescrita de histórico git.

---

## 12. Backlog (fora deste refactor)

- **Plano / ficha de saúde**: conceito novo. Se "tem plano ativo? sim/não" → bool `planoAtivo`. Se houver avaliação da ficha (`emAvaliacao` → aprovado/recusado) → é um **status de plano próprio + workflow** (tela, endpoint, permissão de quem avalia). Escopar como feature dedicada, não junto da modelagem.
- **Push nativo FCM** (background) + padrão Outbox/Dispatcher para notificações multicanal.
- Refatorar `RefreshToken` para entidade rica (setters privados).

---

## 13. Ganho para o PIM IV (rubrica 07)

MER com integridade referencial real, tabelas de referência (lookup) explícitas, ciclo de vida do cliente modelado, e base limpa para o script SQL (`dotnet ef migrations script`), procedures e triggers (ex.: trigger de auditoria em `AgendamentoHistorico`; trigger que carimba `ult_Atualizacao` no nível do banco, se preferir ao invés do EF).
