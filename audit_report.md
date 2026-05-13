# Auditoria Completa — ClinicaMaisSaude

Análise de conformidade com `clinica-context.md`, boas práticas, Clean Architecture e HTML semântico.

---

## Legenda de Severidade

| Símbolo | Significado |
|---|---|
| 🔴 | **Violação** — Quebra regra inviolável do `clinica-context.md` |
| 🟡 | **Problema** — Bug, falha lógica ou má prática |
| 🟢 | **Sugestão** — Melhoria de qualidade/manutenibilidade |

---

## 1. Camada Domain

### ✅ Pontos Positivos
- Todas as entidades usam `Guid` como PK — conforme regra.
- Domínio sem Data Annotations — conforme regra.
- Enums alinhados com `agendamento-logica.md`.
- Setters privados nas entidades (encapsulamento correto).

### Achados

| # | Sev | Arquivo | Problema |
|---|---|---|---|
| D1 | 🟡 | [AgendamentoHistorico.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Domain/Entities/AgendamentoHistorico.cs#L42) | `Dt_Criado = DateTime.Now` usa hora local. Todas as outras entidades usam `DateTime.UtcNow`. Inconsistência que pode causar divergência de fuso horário. |
| D2 | 🟡 | [Paciente.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Domain/Entities/Paciente.cs#L17) | Referencia `virtual Usuario` mas a classe `Usuario` está no arquivo `LoginPortal.cs`. O nome do arquivo diverge do conteúdo — dificulta navegação. |
| D3 | 🟢 | [Paciente.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Domain/Entities/Paciente.cs#L49-L51) | Métodos `AtualizarNome`, `AtualizarEmail`, `AtualizarTelefone` duplicam a lógica do `Atualizar()`. Redundância desnecessária. |
| D4 | 🟡 | [Agendamento.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Domain/Entities/Agendamento.cs#L6-L52) | Falta construtor `protected Agendamento() {}` para EF Core. `Profissional` e `AgendamentoHistorico` têm, mas `Agendamento` e `Paciente` não. O EF pode falhar ao materializar entidades em cenários de lazy loading. |
| D5 | 🟡 | [StatusAgendamentoLookup.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Domain/Entities/StatusAgendamentoLookup.cs#L7-L9) | Setters públicos (`{ get; set; }`) na entidade de domínio. Fere encapsulamento que as demais entidades seguem. |
| D6 | 🟢 | [Agendamento.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Domain/Entities/Agendamento.cs#L38-L41) | `AlterarStatus()` não valida a transição de estado internamente. Toda validação está no Service. O domínio deveria proteger seus próprios invariantes (DDD). |

---

## 2. Camada Application

### ✅ Pontos Positivos
- DTOs separados em Request/Response — conforme regra.
- Sanitização de CPF/Telefone feita no Service (backend) — conforme regra.
- FluentValidation para `PacienteRequest` — boa prática.

### Achados

| # | Sev | Arquivo | Problema |
|---|---|---|---|
| A1 | 🔴 | [RemarcarAgendamentoRequest.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/DTOs/Agendamento/RemarcarAgendamentoRequest.cs#L8-L12) | **Usa Data Annotations** (`[Required]`, `[MinLength]`). O `clinica-context.md` especifica FluentValidation. Inconsistente com o padrão do projeto. |
| A2 | 🟡 | [AgendamentoService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Services/AgendamentoService.cs#L385-L386) | **Problema de performance grave**: dentro do `foreach` de `DelegarProfissionalAsync`, chama `ObterTodosAsync()` para CADA profissional para contar carga. N profissionais = N queries full-table. |
| A3 | 🟡 | [AgendamentoService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Services/AgendamentoService.cs#L407) | `ExisteConflito()` chama `ObterTodosAsync()` (busca TODOS os agendamentos) e filtra em memória. Deveria ser uma query filtrada no banco. Chamado múltiplas vezes por request. |
| A4 | 🟡 | [AgendamentoService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Services/AgendamentoService.cs#L50-L53) | Validação de Retorno busca `ObterTodosAsync()` e filtra em memória. Poderia ser uma query específica no repositório. |
| A5 | 🟡 | [AgendamentoService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Services/AgendamentoService.cs#L542) | `MarcarResultadoDisponivelAsync` busca TODOS os agendamentos (`ObterTodosAsync`) e depois faz `.FirstOrDefault(a => a.Id == id)` em memória. Deveria usar `ObterPorIdAsync(id)`. |
| A6 | 🟡 | [AgendamentoService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Services/AgendamentoService.cs#L45) | Usa `DateTime.Now` para comparação. Inconsistente — entidades usam `DateTime.UtcNow`. Vai falhar em servidores com timezone diferente. Mesmo problema nas linhas 123, 216, 326, 480, 486. |
| A7 | 🟢 | [PacienteService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Services/PacienteService.cs#L162-L163) | `ObterInativosAsync()` carrega TODOS os pacientes e TODOS os agendamentos em memória para filtrar. Performance ruim com muitos registros. |
| A8 | 🟡 | [ICadastroService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Interfaces/ICadastroService.cs#L15-L28) | `CadastroResult` e `UsuarioResponse` estão definidos dentro do arquivo de interface. Deveriam estar em DTOs separados por consistência arquitetural. |
| A9 | 🟢 | [IPacienteService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Application/Interfaces/IPacienteService.cs#L2) | Importa `ClinicaMaisSaude.Domain.Entities` na interface da Application. A camada Application não deveria expor entidades de domínio nas interfaces públicas (isolamento de camadas). |
| A10 | 🟡 | Geral | Todos os erros de negócio lançam `throw new Exception(...)` genérico. Não há exception customizada. Dificulta tratamento diferenciado no controller (400 vs 404 vs 409). |

---

## 3. Camada Infrastructure

### ✅ Pontos Positivos
- Mapeamento via Fluent API no DbContext — conforme regra.
- `.AsNoTracking()` em todas as queries GET dos repositórios — conforme regra.
- Relacionamentos configurados corretamente (FK, Cascade, Restrict).

### Achados

| # | Sev | Arquivo | Problema |
|---|---|---|---|
| I1 | 🟡 | [AgendamentoRepository.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Infrastructure/Repositories/AgendamentoRepository.cs#L27-L29) | `ObterPorIdAsync` usa `FindAsync()` que **não** inclui navegações (Paciente). Quando o Service tenta acessar `agendamento.Paciente.Nome`, pode dar `NullReferenceException`. |
| I2 | 🟡 | [PacienteRepository.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Infrastructure/Repositories/PacienteRepository.cs#L24-L26) | `ObterPorIdAsync` usa `FindAsync()` sem `.Include(p => p.Usuario)`. O `PacienteService.ObterTodosAsync()` acessa `p.Usuario?.UltimoAcesso` — funciona na lista, mas não no `ObterPorIdAsync`. |
| I3 | 🟡 | [ProfissionalRepository.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Infrastructure/Repositories/ProfissionalRepository.cs#L32-L36) | `ObterPorIdAsync` não usa `.AsNoTracking()`. Viola regra de performance para GETs. |
| I4 | 🟡 | [UsuarioRepository.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Infrastructure/Repositories/UsuarioRepository.cs#L28-L36) | `ObterNomeUsuarioAsync` faz 3 queries sequenciais sem `.AsNoTracking()`. Viola regra de performance. |
| I5 | 🟡 | [AgendamentoRepository.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.Infrastructure/Repositories/AgendamentoRepository.cs#L61-L65) | `ExisteAgendamentoNoHorarioAsync` verifica apenas horário exato, mas `AgendamentoService.ExisteConflito` verifica sobreposição com duração. Método no repositório nunca é usado — código morto. |

---

## 4. Camada API

### ✅ Pontos Positivos
- JWT configurado com claims tipadas (TipoUsuario, PacienteId, ProfissionalId).
- Autorização por role/claim nos endpoints.
- CORS configurado.

### Achados

| # | Sev | Arquivo | Problema |
|---|---|---|---|
| C1 | 🔴 | [EspecialidadesController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/EspecialidadesController.cs#L16) | Injeta `ClinicaDbContext` diretamente no Controller. **Viola Clean Architecture** — Controller deveria depender apenas de interfaces da Application. |
| C2 | 🔴 | [PerfilController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/PerfilController.cs#L14) | Injeta `ClinicaDbContext` diretamente no Controller. Mesma violação de C1. |
| C3 | 🔴 | [ProfissionaisController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/ProfissionaisController.cs#L13) | Injeta `ClinicaDbContext` diretamente no Controller. Mesma violação. |
| C4 | 🔴 | [AuthService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Services/AuthService.cs) e [CadastroService.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Services/CadastroService.cs) | Services implementados na camada **API** em vez da **Application**. Violam isolamento de camadas — a API deveria ser apenas ponto de entrada HTTP. |
| C5 | 🟡 | [PacientesController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/PacientesController.cs#L10-L12) | Sem `[Authorize]` no controller. Os endpoints `CriarPaciente`, `ObterPorId`, `AtualizarPaciente`, `DesativarPaciente`, `ObterInativos` estão todos abertos sem autenticação. |
| C6 | 🟡 | [PerfilController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/PerfilController.cs#L105) | `_context.Entry(profissional).Property(p => p.Nome).CurrentValue = request.Nome.Trim()` — manipula estado do EF Core diretamente no controller, bypassando o domínio. |
| C7 | 🟡 | [AgendamentosController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/AgendamentosController.cs#L194-L210) | `MarcarResultadoDisponivel` faz `ObterPorIdAsync` + `MarcarResultadoDisponivelAsync` — duas buscas para o mesmo ID (a segunda busca internamente novamente). |
| C8 | 🟡 | [LoginPortalController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/LoginPortalController.cs#L92-L95) | `ResetSenhaRequest` definido solto no final do arquivo do controller. Deveria estar nos DTOs da Application. |
| C9 | 🟡 | [ConsultasController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/ConsultasController.cs#L23-L26) | `SugerirTipoRequest` classe definida dentro do Controller. Mesmo problema de C8. |
| C10 | 🟡 | [Program.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Program.cs#L39) | Chave JWT hardcoded como fallback: `"minha-chave-super-secreta-pim-iii-123456789!?"`. Se `appsettings.json` não tiver a config, roda com chave fixa. Risco de segurança. |
| C11 | 🟡 | [ConsultasController.cs](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/ClinicaMaisSaude.API/Controllers/ConsultasController.cs#L97-L98) | `Console.WriteLine` em produção para debug da resposta da Gemini API. Deveria usar `ILogger`. |

---

## 5. Frontend

### ✅ Pontos Positivos
- Usa `fetch` nativo (sem Axios) — conforme regra.
- Usa `useState`/`useEffect` (sem Redux/Zustand) — conforme regra.
- TailwindCSS v3 — conforme regra.
- Validações de CPF/telefone no frontend são apenas UX, sanitização real está no backend — conforme regra.

### Achados

| # | Sev | Arquivo | Problema |
|---|---|---|---|
| F1 | 🟡 | [index.html](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/index.html#L2) | `<html lang="en">` — deveria ser `lang="pt-BR"` para um sistema brasileiro. Afeta acessibilidade e SEO. |
| F2 | 🟡 | [index.html](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/index.html#L7) | `<title>clinica-frontend</title>` — título genérico de boilerplate. Deveria ser "Clínica Mais Saúde". |
| F3 | 🟡 | [index.html](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/index.html) | Falta `<meta name="description">` para SEO básico. |
| F4 | 🟡 | [App.tsx](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/src/App.tsx#L53) | `useState<any>(null)` — usa `any` para `pacienteParaEditar`. Deveria ser tipado (TypeScript perde valor com `any`). |
| F5 | 🟡 | [App.tsx](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/src/App.tsx#L56-L61) | Comunicação entre componentes via `window.addEventListener("editarPacienteGlobal")` — CustomEvent global. Antipattern em React. Deveria usar props/callbacks ou Context. |
| F6 | 🟡 | [App.tsx](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/src/App.tsx#L12-L17) | `PacienteRequest` interface definida mas nunca usada. Código morto. |
| F7 | 🟡 | [App.tsx](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/src/App.tsx#L76) | Sem HTML semântico. Toda a estrutura é `<div>`. Deveria usar `<header>`, `<nav>`, `<main>`, `<section>`, `<aside>` para acessibilidade. |
| F8 | 🟢 | [App.tsx](file:///c:/Users/buzzy/OneDrive/Documentos/PIM_III/clinica-frontend/src/App.tsx#L76) | Não existe `role="navigation"` ou `aria-label` nos elementos interativos. Acessibilidade básica ausente. |

---

## 6. Resumo por Categoria

| Categoria | 🔴 Violações | 🟡 Problemas | 🟢 Sugestões |
|---|---|---|---|
| Domain | 0 | 4 | 2 |
| Application | 1 | 7 | 2 |
| Infrastructure | 0 | 4 | 0 |
| API | 4 | 7 | 0 |
| Frontend | 0 | 7 | 1 |
| **Total** | **5** | **29** | **5** |

---

## 7. Top 5 — Ações Prioritárias

1. **🔴 Mover AuthService e CadastroService** da camada API para Application (C4)
2. **🔴 Remover injeção de DbContext nos Controllers** — criar Services/Interfaces para Perfil, Especialidades, Profissionais (C1, C2, C3)
3. **🟡 Corrigir queries N+1 e full-table scans** no AgendamentoService — `ExisteConflito` e `DelegarProfissionalAsync` (A2, A3)
4. **🟡 Adicionar `[Authorize]` ao PacientesController** (C5)
5. **🟡 Padronizar DateTime.UtcNow** em todo o projeto (D1, A6)

---

---

## 8. Auditoria Detalhada — Componentes Frontend (.tsx)

### 8.1 Conformidade com `clinica-context.md`
- ✅ Todos usam `fetch` nativo (sem Axios)
- ✅ Todos usam `useState`/`useEffect` (sem Redux, Zustand ou React Query)
- ✅ Lucide-react como biblioteca de ícones — consistente
- ✅ Nenhum `react-router` — SPA single-view com abas, conforme a implementação atual

### 8.2 Achados por Componente

#### Login.tsx ✅ Componente bem estruturado
| # | Sev | Problema |
|---|---|---|
| FC1 | 🟡 | L48: URL hardcoded `http://localhost:5045`. Deveria usar variável de ambiente (`import.meta.env.VITE_API_URL`). **Problema repetido em TODOS os 13 componentes.** |
| FC2 | 🟡 | L66: `catch (err: any)` — usa `any` no catch. Deveria tipar como `Error` ou `unknown`. |

#### CadastroUsuario.tsx
| # | Sev | Problema |
|---|---|---|
| FC3 | 🟡 | L33-34: Linhas em branco desnecessárias entre `opcoesPerfil` e `handleSubmit`. Ruído no código. |
| FC4 | 🟡 | L70: `setCrm` não é resetado após cadastro bem-sucedido (campos CRM e UF mantêm valores antigos). |

#### AgendamentoCard.tsx ✅ Componente limpo e bem tipado
| # | Sev | Problema |
|---|---|---|
| FC5 | 🟡 | L31: `onRemarcar: (agenda: any) => void` — usa `any` quando deveria usar a interface `AgendamentoResponse`. |

#### MeusAgendamentos.tsx
| # | Sev | Problema |
|---|---|---|
| FC6 | 🟡 | L9: `useState<any[]>([])` — array de agendamentos sem tipagem. Deveria reutilizar `AgendamentoResponse` de `AgendamentoList.tsx`. |
| FC7 | 🟡 | L35-43: `getStatusColor` usa valores "Pendente" e "Confirmado" que **não existem** na máquina de estados do backend. Status reais são "Agendado", "EmAtendimento" etc. Este mapeamento nunca vai colorir corretamente. |
| FC8 | 🟡 | L73: Exibe `a.status` diretamente ("EmAtendimento") em vez do nome amigável ("Em Atendimento"). Os outros componentes usam `MapNomesStatus`. Inconsistência visual. |

#### PerfilPaciente.tsx
| # | Sev | Problema |
|---|---|---|
| FC9 | 🟡 | L6: `useState<any>(null)` — paciente sem tipagem. Deveria ter interface `PerfilPacienteData`. |
| FC10 | 🟡 | L161: Botão "Confirmar" exclusão de conta não tem `onClick` handler implementado — clica e nada acontece. **Funcionalidade morta.** |

#### PerfilMedico.tsx
| # | Sev | Problema |
|---|---|---|
| FC11 | 🟡 | L7: `useState<any>(null)` — mesma falta de tipagem. |
| FC12 | 🟢 | L106-127: Função `alterarSenha` é duplicação exata de `PerfilPaciente.alterarSenha`. Deveria ser extraída para hook `useAlterarSenha()`. |
| FC13 | 🟡 | L147-158: Modal de mensagem é **cópia exata** do modal em `PerfilPaciente`, `AgendamentoList`, e `AgendamentoPaciente`. Código duplicado 4 vezes. |

#### AgendamentoFormCriar.tsx
| # | Sev | Problema |
|---|---|---|
| FC14 | 🟡 | L44: `sugestaoIA` tipado como `any`. Deveria ter interface `SugestaoIAResponse`. |
| FC15 | 🟢 | L7-13: Função `obterMinDate()` duplicada em `ModalRemarcar.tsx` (linhas 4-10). Deveria ser extraída para `utils/dates.ts`. |

#### AgendamentoPaciente.tsx (624 linhas)
| # | Sev | Problema |
|---|---|---|
| FC16 | 🟡 | Componente tem **624 linhas** — viola princípio de responsabilidade única. Contém 4 "passos" de wizard que poderiam ser componentes separados. |
| FC17 | 🟡 | L18: `sugestaoIA` tipado como `any`. Mesmo problema de FC14. |
| FC18 | 🟡 | L36: `agendamentosAnteriores` tipado como `any[]`. Sem tipagem forte. |
| FC19 | 🟡 | L213-225: Modal de mensagem renderizado **dentro** do stepper de progresso (dentro de `<div className="flex items-center">`). Posicionamento incorreto no DOM — deveria estar no nível raiz do componente. |

#### AgendamentoList.tsx (406 linhas)
| # | Sev | Problema |
|---|---|---|
| FC20 | 🟡 | L211-214: Card de estatística exibe `+12%` como valor estático hardcoded. Não reflete dados reais — engana o usuário. |
| FC21 | 🟡 | L391: `window.dispatchEvent(new CustomEvent("editarPacienteGlobal"))` — reforça o antipattern de comunicação global via DOM events (já reportado como F5). |

#### PacienteList.tsx (680 linhas)
| # | Sev | Problema |
|---|---|---|
| FC22 | 🟡 | Componente tem **680 linhas** — o mais longo do projeto. Combina tabela, 3 modais (edição, exclusão, reset senha), filtros e estatísticas. Deveria ser dividido. |
| FC23 | 🟡 | L124, L155: Usa `alert()` nativo para erros em vez do modal estilizado que o resto da app utiliza. Inconsistência de UX. |
| FC24 | 🟡 | L497-503: Paginação com botões "Anterior" e "Próxima" que **não fazem nada** (sem handler, sem lógica de paginação). UI fake. |
| FC25 | 🟡 | L300-302: Botão "Ver lista detalhada" de inativos sem `onClick` handler. Outra funcionalidade morta. |

#### MapNomesStatus — Duplicação
| # | Sev | Problema |
|---|---|---|
| FC26 | 🟢 | O dicionário `MapNomesStatus` é definido **3 vezes** idêntico em: `AgendamentoCard.tsx`, `AgendamentoFiltros.tsx` e `ModalHistorico.tsx`. Deveria estar em `constants/statusMap.ts`. |

#### ModalRemarcar.tsx ✅ / ModalHistorico.tsx ✅ / AgendamentoFiltros.tsx ✅
Componentes pequenos, bem focados, sem achados significativos além dos já reportados.

---

## 9. Resumo Final Atualizado

| Categoria | 🔴 Violações | 🟡 Problemas | 🟢 Sugestões |
|---|---|---|---|
| Domain | 0 | 4 | 2 |
| Application | 1 | 7 | 2 |
| Infrastructure | 0 | 5 | 0 |
| API | 4 | 7 | 0 |
| Frontend (Estrutura) | 0 | 7 | 1 |
| Frontend (Componentes) | 0 | 22 | 4 |
| **Total** | **5** | **52** | **9** |

---

## 10. Top 10 — Ações Prioritárias

| # | Sev | Ação | IDs |
|---|---|---|---|
| 1 | 🔴 | Mover `AuthService` e `CadastroService` da API para Application | C4 |
| 2 | 🔴 | Remover injeção de `DbContext` dos controllers — criar Services | C1, C2, C3 |
| 3 | 🔴 | Substituir Data Annotations por FluentValidation em `RemarcarAgendamentoRequest` | A1 |
| 4 | 🟡 | Corrigir queries N+1 no `AgendamentoService` | A2, A3, A5 |
| 5 | 🟡 | Adicionar `[Authorize]` ao `PacientesController` | C5 |
| 6 | 🟡 | Padronizar `DateTime.UtcNow` em todo o backend | D1, A6 |
| 7 | 🟡 | Extrair URL da API para variável de ambiente `VITE_API_URL` | FC1 |
| 8 | 🟡 | Corrigir `MeusAgendamentos.getStatusColor` com status reais | FC7, FC8 |
| 9 | 🟡 | Remover funcionalidades mortas (paginação fake, botões sem handler, exclusão sem onClick) | FC10, FC24, FC25 |
| 10 | 🟡 | Eliminar duplicações: `MapNomesStatus`, `obterMinDate`, modal de mensagem, `alterarSenha` | FC12, FC13, FC15, FC26 |

---

## 11. Notas Finais

> **HTML Semântico**: O frontend inteiro é construído com `<div>` genéricos. Não existe uso de `<header>`, `<main>`, `<nav>`, `<section>`, `<aside>`, `<article>`. Isso impacta acessibilidade (leitores de tela) e SEO.

> **Acessibilidade**: Nenhum componente usa `aria-label`, `role`, ou atributos ARIA. Labels de formulário existem mas nem todos estão associados via `htmlFor`/`id`.

> **Segurança**: O `PacientesController` está completamente aberto (sem `[Authorize]`). Qualquer pessoa pode criar, editar, deletar e listar pacientes sem autenticação.

> **Performance Backend**: O padrão de carregar TODOS os registros via `ObterTodosAsync()` e filtrar em memória é o problema de performance mais crítico e recorrente do projeto.
