# 📚 Análise Técnica — Clínica Mais Saúde

> Documento de estudo e contexto do projeto. Fonte de consulta rápida sobre estrutura, arquitetura, regras e pontos de atenção. Complementa `clinica-context.md` (convenções) e `requisitos_e_regras.md` (RF/RNF/RN).
>
> Última análise: 2026-08-01

---

## 1. Visão Geral

Sistema **corporativo de gestão clínica** (consultórios/clínicas/hospitais). Cobre o ciclo completo de atendimento: triagem por IA → agendamento inteligente → atendimento → resultados de exame → relatórios. Quatro perfis de usuário: **Administrador, Médico, Enfermeira, Paciente**.

**Monorepo** com backend .NET (Clean Architecture) + frontend React (SPA) + scripts de homologação.

```
PIM_III/
├── ClinicaMaisSaude.API/              # Camada Web (Controllers, Program.cs, JWT, BackgroundService)
├── ClinicaMaisSaude.Application/      # Regras de negócio (Services, DTOs, Interfaces, Validators)
├── ClinicaMaisSaude.Domain/           # Núcleo (Entities, Enums, Interfaces de repositório, Constants)
├── ClinicaMaisSaude.Infrastructure/   # EF Core, DbContext, Migrations, Repositories, Services de infra
├── clinica-frontend/                  # SPA React 19 + TS + Vite + Tailwind
├── homologar-sistema-completo.js      # Suíte E2E (25 validações, roda em <3s)
├── homologar.bat
├── clinica-context.md                 # Convenções e regras invioláveis (guia de código)
└── requisitos_e_regras.md             # RF / RNF / RN (fonte da verdade funcional)
```

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Back-end | C# / **.NET 10** (ASP.NET Core), Clean Architecture, EF Core, FluentValidation |
| Banco | **SQL Server** (EF Core Migrations) |
| Front-end | **React 19** + TypeScript, **Vite 8**, **TailwindCSS v3**, `lucide-react` (ícones), `recharts` (gráficos) |
| IA | **Google Gemini 2.5 Flash** (triagem de sintomas) |
| Auth | **JWT** (HMAC-SHA256): acesso 3h / refresh 7 dias, **BCrypt** para senhas |
| Exportação | **QuestPDF** (PDF), **ClosedXML** (Excel) |

**Restrições de libs no front (invioláveis):** proibido Axios (usar `fetch`), Redux/Zustand/MobX (usar `useState`/`useReducer`), React Query (usar `useEffect`+`fetch`), React Router (navegação por estado — perguntar antes de adicionar).

---

## 3. Arquitetura Back-end (Clean Architecture)

Dependências apontam para dentro: `API → Application → Domain` e `Infrastructure → Application/Domain`.

### 3.1 Domain (núcleo, sem dependências externas)
- **Entidades** (todas com PK `Guid`, exceto exceções abaixo): `Agendamento`, `AgendamentoHistorico`, `Usuario` (arquivo `LoginPortal.cs`), `Paciente`, `Profissional`, `ProfissionalEspecialidade`, `Notificacao`, `RefreshToken`, `StatusAgendamentoLookup`, `UsoInadequadoIA`.
  - **Exceções à regra Guid:** `StatusAgendamentoLookup` (usa `int`) e `ProfissionalEspecialidade` (chave composta).
  - Entidades usam **encapsulamento rígido**: setters `private`, mutação só via métodos de domínio (ex: `Agendamento.AlterarStatus()`, `Usuario.RegistrarFalhaLogin()`, `Paciente.BloquearIA()`). **Sem Data Annotations** — mapeamento via Fluent API no DbContext.
- **Enums:** `EspecialidadeMedica`, `StatusAgendamento`, `TipoConsulta`, `TipoEventoHistorico`, `TipoProfissional`.
- **Constants:** `ClinicaClaims`, `ConfigKeys`, `PerfisUsuario`, `TipoConsultaDuracao`.
- **Interfaces de repositório:** `IAgendamentoRepository`, `IPacienteRepository`, `IProfissionalRepository`, `IUsuarioRepository`, `INotificacaoRepository`.

> ⚠️ **Convenção crítica:** a tabela/entidade de autenticação chama-se **`Usuario`** no código (arquivo `LoginPortal.cs`, tabela `LoginPortal`). Não confundir com `Paciente`. Um `Paciente` referencia opcionalmente um `Usuario` via `UsuarioId` (nullable — pacientes cadastrados pela recepção podem não ter login).

### 3.2 Application (regras de negócio)
- **Services principais:** `AgendamentoService` (**931 linhas — o coração do sistema**), `PacienteService`, `NotificacaoService`, `ProbabilidadeFaltaService`.
- **DTOs:** organizados por domínio em `DTOs/` (Agendamento, Auth, Consulta, Dashboard, Paciente, Perfil...). **Proibido DTO inline em Controller.** Front só conversa via DTOs.
- **Validators:** FluentValidation (`PacienteRequestValidator`, `RemarcarAgendamentoRequestValidator`).
- **Exceptions:** `RateLimitExceededException`.

### 3.3 Infrastructure
- **`ClinicaDbContext`** (mapeamento Fluent API).
- **Services de infra** (dependem de recursos externos): `AuthService` (JWT/BCrypt), `CadastroService`, **`ConsultaService`** (toda a lógica de IA/Gemini), `DashboardService`, `EspecialidadeService`, `PerfilService`, `ProfissionalService`.
- **Repositories** + **Migrations** (~30 migrations, evolução incremental).

> ⚠️ **Regra de isolamento de IA:** lógica de chamada ao Gemini, validação de prompt injection, bloqueio de usuários e registro de violações pertencem **exclusivamente ao `ConsultaService`**. Proibido em Controllers.

### 3.4 API
- **Controllers:** `Agendamentos`, `Auth`, `Consultas`, `Dashboard`, `Especialidades`, `LoginPortal`, `Notificacoes`, `Pacientes`, `Perfil`, `Profissionais`.
- **`Program.cs`:** DI, CORS (libera só `http://localhost:5173`), JWT Bearer, `AddMemoryCache` (usado no rate limit da IA), `UtcDateTimeJsonConverter` (serializa datas sempre com sufixo `Z`).
- **Middleware de segurança customizado:** intercepta toda requisição autenticada e retorna **403** se o usuário estiver bloqueado (`IsBloqueado()`) — bane em tempo real mesmo com token válido.
- **`NotificacaoBackgroundService`** (HostedService): roda a cada **5 min**, gera notificações automáticas:
  - Consulta não finalizada 2h após o horário → avisa o profissional.
  - Lembrete "consulta hoje" (à meia-noite do dia).
  - Lembrete "2h antes da consulta".

---

## 4. Arquitetura Front-end (SPA React)

**Sem React Router.** Navegação é por estado (`abaAtiva` em `App.tsx`) + `window.history.replaceState`. Comunicação entre componentes distantes via **CustomEvents** no `window` (ex: `editarPacienteGlobal`, `navegarAbaGlobal`, `segurancaViolada`, `addToast`).

```
src/
├── App.tsx                 # Orquestrador: auth, abas, notificações, modais globais
├── main.tsx                # Entry (importa fetchInterceptor)
├── fetchInterceptor.ts     # Monkey-patch de window.fetch: refresh-token automático em 401 + toasts globais de erro
├── pages/                  # Telas completas
│   ├── HomePage.tsx            # Landing pública (rota "/")
│   ├── Login.tsx
│   ├── CadastroUsuario.tsx     # Cadastro (usado por admin/enfermeira e auto-cadastro)
│   ├── AgendamentoPaciente.tsx # Fluxo de marcação do PACIENTE (com triagem IA) — 702 linhas
│   ├── MeusAgendamentos.tsx    # Histórico/consultas do paciente
│   ├── AgendamentoList.tsx     # Gestão de agendamentos (médico/enfermeira/admin)
│   ├── PacienteList.tsx        # Gestão de usuários/pacientes
│   ├── Relatorios.tsx          # Dashboard + exportação PDF/Excel
│   └── ViolacoesList.tsx       # Auditoria de segurança da IA (admin)
├── components/             # Reutilizáveis (modais, cards, inputs, layout, perfis)
├── hooks/                  # useToast, useScrollBlock
├── constants/              # api, clinic, especialidades, perfis, status, statusMap, storage
├── types/, utils/          # PacienteResponse, dates, validators
```

- **Estado de sessão:** `localStorage` (chaves centralizadas em `constants/storage.ts`: `authToken`, `refreshToken`, `tipoUsuario`, `isAdmin`, `pacienteId`, `profissionalId`, `fotoBase64`...).
- **`API_URL`** padrão: `http://localhost:5045` (via `VITE_API_URL`).
- **Estética:** "Bold & Purple" (`#7C3AED`), sombras profundas, cantos arredondados, ícones Lucide. Modais já são **responsivos** (bottom-sheet no mobile via `sm:` breakpoints).
- **Resiliência:** `fetchInterceptor` trata 401 (refresh transparente com fila de requisições), 403, 404, 500 globalmente, evitando "tela branca da morte".

---

## 5. Modelo de Domínio Central: Agendamento

```
Agendamento
├── Id (Guid), DataHoraConsulta (UTC), PacienteId, ProfissionalId
├── TipoProfissional (Medico|Enfermeira), TipoConsulta, EspecialidadeId (int?)
├── Status (máquina de estados), AgendamentoOrigemId (Guid? — link de retorno)
├── ProbabilidadeFalta (double), NivelProbabilidadeFalta (Baixa|Média|Alta)
├── Flags de exame: ResultadoDisponivel, ExigeResultadoPosterior, ResultadoRetirado
├── Flags de notificação: NotificacaoPendenteGerada, LembreteManhaEnviado, LembreteDuasHorasEnviado
└── DtCriado (UTC)
```

### 5.1 Máquina de Estados (`StatusAgendamento`)
```
Agendado ──> EmAtendimento ──> Finalizado
   │              └─────────> AguardandoRetorno (só Consulta Médica)
   │                                  └──> RetornoAgendado ──> EmAtendimento / Cancelado / Faltou
   ├──> Cancelado
   └──> Faltou (só se DataHora já passou)
```
- Iniciar atendimento: no máx. **15 min antes** do horário.
- `Faltou`: bloqueado para datas futuras.
- Qualquer transição fora do fluxo é rejeitada.

### 5.2 Regras de Agendamento (resumo — detalhe em `requisitos_e_regras.md` §4)
- **Auto-delegação de profissional:** paciente **nunca** escolhe o profissional (exceto retorno). Backend seleciona o habilitado (matriz de permissões) com **menor carga de consultas ativas** (desempate: total de agendamentos ativos), sem conflito de horário.
- **Matriz de permissões:** Enfermeira → Triagem/Exame/Vacina; Médico → Consulta Médica/Retorno.
- **Duração por tipo:** Vacina 15 / Triagem 20 / Retorno 20 / Exame 30 / Consulta Médica 40 min.
- **Horário:** Seg–Sex 08:00–18:00, almoço 12:00–13:00, sem fim de semana.
- **Limites do paciente:** máx. 2 ativos/dia (Limite A), máx. 3 criações/dia (Limite B), 1 ativo por especialidade, carência de 60 dias por especialidade finalizada, sem retroatividade.
- **Retorno:** só após consulta em `AguardandoRetorno`; herda o `ProfissionalId` de origem (ignora balanceamento).
- Paciente só agenda para si (valida `PacienteId` da claim JWT).
- Toda mudança gera registro imutável em `AgendamentoHistorico` (trilha de auditoria).

### 5.3 Previsão de Faltas (`ProbabilidadeFaltaService`)
Heurística baseada em histórico, sem ML. Soma/subtrai fatores e classifica em Baixa (≤30) / Média (31–60) / Alta (>60):
- **+15%** por falta · **+10%** por cancelamento tardio (>1h após criar, <4 dias da consulta, pelo próprio paciente) · **+5%** por remarcação · **+10%** se antecedência >30 dias · **+20%** se `TemProblemaMemoria`.
- **−10%** por consulta comparecida · **−15%** se últimos 3 agendamentos finalizados · **−10%** se sem faltas e com histórico bom.

---

## 6. IA — Triagem e Segurança (`ConsultaService`)

Fluxo `POST /api/Consultas/sugerir-tipo`:
1. **Rate limit global:** 100 req/hora (via `IMemoryCache`).
2. **Rate limit por usuário:** 5 req/dia.
3. Valida bloqueio de IA do paciente (`IsIABloqueada`).
4. Valida input: 10–300 caracteres.
5. Chama Gemini com **system prompt** rígido (retorna só JSON: `tipoProfissional`, `especialidade`, `tipoConsulta`, `justificativa`). `temperature=0`, `responseMimeType=application/json`, timeout 10s, safetySettings agressivos.
6. **Defesas contra abuso:**
   - **Prompt injection / conteúdo perigoso** (detectado por `finishReason=SAFETY` ou frase-marcador jurídica): **banimento permanente** (`BloquearPermanentemente` = +100 anos), registro em `ViolacoesIA` (tipo `Injecao`), **cancelamento automático de todos os agendamentos futuros**, notificação a todos os admins.
   - **Sintomas irrelevantes** ("Sintomas inválidos"): escalonamento — 2ª violação bloqueia IA 1 dia, 3ª+ bloqueia 7 dias, notifica admins (tipo `UsoIndevido`).

> Toda a inteligência e as penalidades vivem em `ConsultaService`. A justificativa jurídica de injeção cita Art. 154-A CP e LGPD.

---

## 7. Segurança & Autenticação

- **JWT** HMAC-SHA256, acesso **3h** / refresh **7 dias**. Refresh transparente no front (`fetchInterceptor`).
- **BCrypt** para senhas.
- **Brute force:** 5 tentativas erradas → conta bloqueada 15 min (`Usuario.RegistrarFalhaLogin`).
- **RBAC** por `[Authorize(Roles=...)]`. Claims custom em `ClinicaClaims` (ex: `PacienteId`, `ProfissionalId`).
- **Bloqueio em tempo real:** middleware em `Program.cs` derruba usuário banido (403) a cada requisição.
- **Sanitização** (máscaras CPF/telefone) só no **back-end** (Application/Services). Front envia dados brutos.
- **PKs Guid** — proibido expor IDs sequenciais.
- **Segredos:** `JwtConfig:Secret` e `GeminiApiKey` via configuração/User Secrets (`ConfigKeys`).

---

## 8. Superfície da API (endpoints principais)

Todos exigem `[Authorize]` salvo `Auth/login` e `Auth/refresh`.

| Controller | Endpoints |
|---|---|
| **Auth** | `POST login`, `POST refresh` |
| **Agendamentos** | `POST /`, `GET /` (paginado + filtros), `GET /{id}`, `GET horarios-disponiveis`, `PUT /{id}` (prof/enf), `PATCH /{id}/status`, `PATCH /{id}/remarcar`, `DELETE /{id}` (prof/enf), `GET /{id}/historico`, `PATCH /{id}/concluir-exame`, `PATCH /{id}/resultado-disponivel`, `PATCH /{id}/resultado-retirado`, `GET /{agendamentoId}/probabilidade-falta` |
| **Consultas (IA)** | `POST sugerir-tipo`, `GET violacoes`, `DELETE violacoes/{pacienteId}/penalidade`, `GET violacoes-debug` |
| **Notificacoes** | `GET /`, `PATCH /{id}/lida`, `DELETE /{id}` |
| **Perfil** | `GET /`, `PATCH /`, `PATCH senha`, `POST foto` |
| **Especialidades** | `GET lista`, `GET disponiveis`, `GET minhas`, `PUT minhas` |
| **Pacientes / Profissionais / Dashboard** | CRUD + métricas/relatórios |

**Endpoints relevantes para o PACIENTE** (base da futura versão mobile): login/refresh, sugerir-tipo (IA), horarios-disponiveis, criar/listar/remarcar/cancelar agendamento, meu histórico, probabilidade-falta, notificações, perfil (ver/editar/senha/foto), especialidades lista.

---

## 9. Homologação (E2E)

`homologar.bat` → `homologar-sistema-completo.js`: **25 validações ponta a ponta** (fluxos normais + tentativas de abuso) contra o servidor rodando, relatório interativo no terminal em <3s. Não é framework de teste unitário — é smoke/regressão de integração.

---

## 10. Como Rodar (referência)

```bash
# Back-end (raiz da solução)
dotnet run --project ClinicaMaisSaude.API   # sobe em http://localhost:5045

# Front-end
cd clinica-frontend && npm install && npm run dev   # sobe em http://localhost:5173

# Homologação E2E (com back-end no ar)
homologar.bat
```
Pré-requisitos: SQL Server acessível (connection string `DefaultConnection`), `JwtConfig:Secret` e `GeminiApiKey` configurados.

---

## 11. Pontos de Atenção / Observações Técnicas

- **`AgendamentoService` é grande (931 linhas)** — concentra quase toda a regra de negócio de agendamento. Candidato natural a decomposição (validadores/policies separados).
- **Datas sempre UTC** no backend; conversão para fuso Brasília (`E. South America Standard Time` / `America/Sao_Paulo`) só na borda (ex: mensagens ao usuário).
- **Navegação por estado** no front escala mal conforme telas crescem — sem deep-linking real (só query hacks em notificações).
- **`fetchInterceptor` faz monkey-patch de `window.fetch`** — decisão global que qualquer nova integração herda.
- **Notificações via polling** (front: 60s; background service: 5 min) — não há WebSocket/push real.
- **Foto de perfil em Base64** no banco (`Usuario.FotoBase64`) — simples, mas pesa em payloads.
- **Nomenclatura:** `Usuario` (login) ≠ `Paciente` (dados clínicos). Coluna de criação sempre `Dt_Criado`/`DtCriado`.

---

## 12. Relevância para a Versão Mobile (React Native — só Pacientes)

A futura versão mobile será **simplificada e exclusiva para pacientes**. O backend **já expõe todos os endpoints necessários** (§8) — mobile consome a mesma API REST. Fluxos do paciente a portar:
1. **Login / cadastro** (JWT + refresh).
2. **Triagem por IA** (descrever sintomas → sugestão de especialidade/tipo).
3. **Agendar consulta** (escolher data/horário disponível; profissional é auto-delegado).
4. **Minhas consultas** (histórico, status, remarcar, cancelar).
5. **Notificações** (lembretes, resultados de exame, avisos).
6. **Perfil** (dados, senha, foto).

Detalhamento de melhorias e o plano de portabilidade mobile virão nas próximas etapas (a pedido do usuário).
