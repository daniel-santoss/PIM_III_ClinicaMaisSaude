# Guia de Convenções — Clínica Mais Saúde

Convenções de código e de trabalho do monorepo. Vale para quem for escrever código no projeto (pessoa ou assistente de IA).
As regras de negócio (agendamento, máquina de estados, IA, limites) estão em [`requisitos_e_regras.md`](requisitos_e_regras.md) — não duplicar aqui.

---

## Estrutura do monorepo

| Pasta | Conteúdo |
|---|---|
| `ClinicaMaisSaude.Domain` | Entidades, enums, interfaces de repositório, serviços de domínio puros (ex.: máquina de estados) |
| `ClinicaMaisSaude.Application` | DTOs, interfaces de serviço, exceções tipadas, validadores (FluentValidation), serviços de aplicação |
| `ClinicaMaisSaude.Infrastructure` | `ClinicaDbContext`, migrations, repositórios, serviços que usam banco/e-mail/IA, gateways externos |
| `ClinicaMaisSaude.API` | Controllers, `Program.cs`, middleware, SignalR hub |
| `*.Tests` | xUnit — Domain, Application (fakes em memória), Infrastructure (EF InMemory) e API (handlers de autorização) |
| `clinica-frontend` | Web (React 19 + Vite + Tailwind) — admin, médico, enfermeira e paciente |
| `clinica-mobile` | App Expo/React Native — **somente pacientes** |
| `docs/` | Artefatos do PIM IV (banco, ágil, acessibilidade, nuvem, monografia) |

Dependências apontam para dentro: `API → Application → Domain` e `Infrastructure → Application/Domain`.

---

## Princípios de trabalho

1. **Pensar antes de codar.** Havendo ambiguidade, apresentar as interpretações e perguntar. Se existir abordagem mais simples, dizer antes de implementar.
2. **Simplicidade.** O mínimo de código que resolve. Sem abstração para uso único, sem configurabilidade não pedida.
3. **Mudanças cirúrgicas.** Tocar só no necessário. Não refatorar o que não está quebrado; código morto não relacionado é mencionado, não apagado.
4. **Ler antes de consumir.** Nunca supor nomes de propriedades, rotas ou contratos — ler os arquivos existentes.
5. **Verificar.** Toda mudança termina compilando e com os checks da seção "Verificação" passando.

---

## Backend (.NET)

### Modelagem
- **PK `Guid`** em toda entidade (gerado na aplicação, sequencial). Exceções: tabelas de *lookup* de enums (`int`) e `ProfissionalEspecialidade` (chave composta).
- **Domain sem Data Annotations.** Mapeamento só via Fluent API no `ClinicaDbContext`.
- Entidades encapsuladas: setters privados, mutação por métodos de domínio.
- **Identidade:** `Pessoa` é dona de Nome/CPF/E-mail/Telefone. `LoginPortal` (entidade `Usuario`) é a credencial: senha, `Role`, bloqueios e foto. `Paciente` e `Profissional` são perfis que apontam para a `Pessoa`. Não renomear a tabela `LoginPortal`.
- Colunas de data: `Dt_Criado` na criação; `ult_Atualizacao` é carimbada automaticamente para entidades `IAuditavel`.

### Camadas e contratos
- O front só conversa por **DTOs** (`Application/DTOs/<Domínio>/`). Proibido declarar DTO dentro de controller.
- **Sanitização de máscaras** (CPF, telefone) só no backend. O front envia o dado bruto.
- Erros por **exceções tipadas** (`Application/Exceptions`) → `GlobalExceptionHandler` devolve `ProblemDetails` com o status certo. Não usar `throw new Exception` nem regra codificada em string.
- **Nomes:** `Buscar*` garante existência (lança 404); `Obter*` pode devolver `null`.
- **Autorização por papel** com `[Authorize(Roles=...)]`; o admin passa em qualquer requisito pelo `AdminSuperusuarioHandler`.
- **Autorização por recurso** ("é dono?") fica na API, nunca na Application: o controller carrega o recurso e chama `IAuthorizationService.AuthorizeAsync(User, recurso, operacao)`, e a regra vive num handler em `API/Authorization` (ex.: `AgendamentoAuthorizationHandler` + `OperacoesAgendamento`). Recurso de terceiro responde 404. Claims são lidas por `ClaimsPrincipalExtensions` / `ClinicaControllerBase`.
- **Abstração com parcimônia:** interface só quando cruza fronteira externa (rede, e-mail, IA), tem 2+ implementações ou precisa de fake em teste. Dividir uma classe grande ≠ criar interface. Não criar repositório para toda entidade.

### IA (triagem)
- Regras de negócio da triagem (limites, banimento, uso indevido, acolhimento em crise) ficam no `ConsultaService`.
- Prompt, chamada HTTP, parse e detecção de marcadores ficam no gateway `GeminiTriagemGateway` (`ITriagemIaGateway`).
- Proibido colocar lógica de IA, bloqueio de usuário ou registro de violação em controllers.

### Performance
- GET no EF Core com `.AsNoTracking()`.
- Listagens paginadas no servidor com `.Skip()`/`.Take()`.
- Foto de perfil (`UsuarioFoto`) só entra com `Include` nas queries que exibem avatar.

---

## Frontend web (`clinica-frontend`)

- Telas em `src/pages/`, componentes reutilizáveis em `src/components/`, primitivos visuais em `src/components/ui/`, hooks em `src/hooks/`, constantes em `src/constants/`.
- **Design system navy:** seguir [`clinica-frontend/DESIGN_SYSTEM.md`](clinica-frontend/DESIGN_SYSTEM.md). Todo modal novo é envolvido em `<ModalPortal>`.
- `useToast()` retorna `{ success, error, warning }` — chamar `toast.error("...")`, nunca `toast(...)`.
- Bibliotecas proibidas:

| Proibido | Usar no lugar |
|---|---|
| Axios | `fetch` nativo (o `fetchInterceptor` cuida de refresh e erros globais) |
| Redux / MobX / Zustand | `useState` / `useReducer` |
| React Query | `useEffect` + `fetch` |
| React Router | navegação por estado (perguntar antes de mudar) |

---

## Mobile (`clinica-mobile`)

- Rotas por arquivo com **expo-router** (`src/app/(auth)` e `src/app/(app)`). **Não instalar `@react-navigation/*` diretamente** — é incompatível com o expo-router no SDK atual.
- Chamadas à API sempre por `apiFetch` (`src/lib/api.ts`); uma lib por domínio em `src/lib/`; erros via `mensagemErro` (`src/lib/erros.ts`).
- Cores em `src/constants/tema.ts` (mesmo navy do web). Bottom-sheets com `Modal` do React Native.
- Telas secundárias vão no Stack raiz (`src/app/*.tsx`, abertas com `router.push`), nunca como aba escondida com `href: null` (no expo-router 58 ela redireciona para o Início).
- Detalhes de execução e problemas comuns: [`clinica-mobile/README.md`](clinica-mobile/README.md).

---

## Verificação

| Parte | Comando |
|---|---|
| Backend | `dotnet build` e `dotnet test ClinicaMaisSaude.slnx` (só o exit code é confiável na saída) |
| Web | `npm run build` dentro de `clinica-frontend` (= `tsc -b && vite build`, o mesmo do CI). `tsc --noEmit` na raiz dá falso-negativo |
| Mobile | `npx tsc --noEmit` e `npx expo-doctor` dentro de `clinica-mobile` |

Erros `MSB3021/MSB3027` ("arquivo bloqueado") no build significam que a API está rodando — encerrar antes de compilar.

---

## Git

- Trabalho na branch `teste`; integração na `main` por merge `--no-ff`.
- Um commit por mudança lógica, com o autor do projeto como **único autor** (sem trailer `Co-Authored-By`).
