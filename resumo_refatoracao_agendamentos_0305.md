# Resumo Técnico: Refatoração do Fluxo de Agendamento (Portal do Paciente e Recepcionista)

*Data de Modificação: 03/05/2026*

Este documento detalha as alterações feitas no sistema de agendamento médico, abordando melhorias de UX/UI, bloqueios lógicos no frontend e enforcement de regras de negócio estritas no backend para consultas do tipo **Retorno**.

---

## 1. Regra de Negócio: Vínculo de Médico em Retornos
**Objetivo:** Garantir que quando um paciente agenda uma consulta do tipo "Retorno" (TipoConsulta = 4), o sistema obrigatoriamente aloque o mesmo profissional da "Consulta de Origem", ignorando a distribuição aleatória/balanceada de profissionais.

### Arquivos Modificados (Backend):
- **`IAgendamentoService.cs`** e **`AgendamentoService.cs`**:
  - Modificado o método `ObterHorariosDisponiveisAsync` para aceitar um novo parâmetro opcional `Guid? origemId`.
  - **Lógica Inserida:** Se `tipoConsulta == Retorno` e `origemId` for fornecido, o repositório busca a consulta de origem no banco de dados e filtra a lista de `profissionais` para retornar **apenas** a agenda (horários disponíveis) daquele médico específico (ID vinculado à origem).
  - Modificado o método `AdicionarAsync` para que, ao salvar um Retorno no banco, a variável `profissionalDelegado` receba diretamente o `origem.ProfissionalId`, travando a consulta ao médico correto e driblando a roleta de médicos livres.

- **`AgendamentosController.cs`**:
  - A rota `GET /api/Agendamentos/horarios-disponiveis` passou a receber o parâmetro `[FromQuery] Guid? origemId` para repassá-lo ao serviço.

### Arquivos Modificados (Frontend):
- **`AgendamentoPaciente.tsx`** e **`AgendamentoFormCriar.tsx`**:
  - **Remoção de Redundância:** A tela (tanto para o Paciente quanto para a Recepcionista) agora **oculta completamente** a etapa de selecionar a "Especialidade Médica" se a opção escolhida for "Retorno". 
  - **Dinamismo da API:** Em vez de passar `especialidadeId`, o frontend dispara a busca de `horarios-disponiveis` enviando `origemId=${origemId}`, fazendo com que o painel de "Quando?" preencha perfeitamente os horários apenas do médico que atendeu a consulta base.

---

## 2. Regra de UX: Filtro Inteligente de Especialidades Disponíveis
**Objetivo:** Impedir que o paciente chegue até a tela de horários para descobrir que "não há médicos disponíveis". A validação deve acontecer visualmente no Passo 2 (Seleção de Especialidade).

### Arquivos Modificados (Backend):
- **`EspecialidadesController.cs`**:
  - **Nova Rota (`GET /api/Especialidades/disponiveis`)**: Como a rota original `/lista` varria todas as opções do enum (mesmo sem médicos contratados), criamos essa rota inteligente. 
  - **Lógica:** Ela faz um `SELECT DISTINCT EspecialidadeId` na tabela de relacionamento `ProfissionalEspecialidades`, retornando um array de inteiros (IDs) de especialidades que possuem no mínimo **um** médico ativo cadastrado.

### Arquivos Modificados (Frontend):
- **`AgendamentoPaciente.tsx`**:
  - **Nova Requisição:** O `useEffect` inicial passou a bater na rota `/api/Especialidades/disponiveis`, salvando o array no estado `especialidadesDisponiveis`.
  - **Layout dos Botões de Especialidade:** 
    - O `.map()` do grid de especialidades agora cruza o ID da especialidade com o array `especialidadesDisponiveis`.
    - Se a especialidade **não** tiver médicos, o botão fica `disabled`, com um estilo esmaecido (`bg-red-50 text-red-400 opacity-70`).
    - Além disso, um **Ícone de Alerta (`AlertTriangle`)** é renderizado dentro do próprio botão.
  - **Feedback Consolidado (UI):** Em vez de tooltips cortados ou textos poluídos, utilizamos um bloco condicional imediatamente abaixo do campo de "Buscar Especialidade...". Se houver qualquer botão visível bloqueado, um aviso legível aparece em destaque:
    *`"As especialidades marcadas não possuem médicos disponíveis no momento."`*
    Isso explica instantaneamente o porquê do botão e do ícone de exclamação estarem na tela, melhorando a fluidez para o paciente.

---

## Resumo Arquitetural
As modificações garantem que a **Fonte da Verdade** permaneça no Backend. O Frontend atua apenas como um motor de visualização responsivo, não sendo mais capaz de enviar requisições de retorno sem o ID de origem, nem capaz de pesquisar agendas de especialidades sem equipe cadastrada.

**Nota (pós-auditoria):** Após revisão, foram corrigidos 5 problemas: `.AsNoTracking()` faltando em `ListarDisponiveis`, validação de status na busca por `origemId`, query duplicada ao banco em `AdicionarAsync`, condição `>= 3` corrigida para `=== 3` em `finalizarAgendamento`, e filtro de especialidades disponíveis adicionado em `AgendamentoFormCriar.tsx` (que originalmente só existia no portal do paciente).
