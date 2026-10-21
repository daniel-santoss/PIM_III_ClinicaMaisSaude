# Sprint Backlog — Clínica Mais Saúde

Registro dos *sprints* executados, derivado do histórico real de commits (abr–set/2026). Cada sprint tem
**objetivo (meta)**, **itens entregues** (com o épico/história do [Product Backlog](PRODUCT_BACKLOG.md)) e
**incremento**. O projeto foi conduzido em cadência incremental — cada fase entregou software funcionando.

> Convenção: os sprints agrupam o trabalho por tema/período. A referência de datas alimenta o
> [Cronograma](CRONOGRAMA.md).

---

## Sprint 0 — Fundação (07–26/abr/2026)
**Meta:** estabelecer a arquitetura e o esqueleto funcional (backend + web).
- E8-01 — Clean Architecture (Domain/Application/Infrastructure/API), EF Core, 1ª migration.
- E1-01 — Login; E7-01 — cadastro de usuários; validações de campos.
- E2-01 — Agendamento base (profissional, tipo, status); front React inicial.

**Incremento:** sistema web mínimo com login, cadastro e agendamento.

---

## Sprint 1 — Agendamento & Experiência (29/abr–02/mai/2026)
**Meta:** tornar o agendamento completo e usável.
- E2-02 — Remarcar; E2-04 — linha do tempo/histórico das consultas.
- Filtros por status/data/tipo; visualização dos dados do paciente no card.
- E1-03 — Reset de senha (1ª versão); melhorias de design e divisão da tela de agendamentos.

**Incremento:** CRUD de agendamento com filtros, histórico e perfis.

---

## Sprint 2 — IA, Especialidades & Segurança (mai/2026)
**Meta:** diferenciar o produto com triagem inteligente e reforçar segurança.
- E3-01 — Triagem por IA (sugestão de tipo por sintomas); E3-02 — escudo anti-injeção.
- Especialidades médicas; E1-03 — redefinição de senha; ajustes de IA e de regras de negócio.
- Refinamento do design do login.

**Incremento:** triagem por IA operante e catálogo de especialidades.

---

## Sprint 3 — Estabilização & Regras (mai–jun/2026)
**Meta:** consolidar regras de negócio e corrigir arestas.
- Ajustes de regras de agendamento; correções de bugs de remarcação; refinos de UI.

**Incremento:** base estável para a evolução seguinte.

---

## Sprint 4 — Refactor de Modelagem (15–16/ago/2026)
**Meta:** sanar dívidas do modelo de dados (integridade, lookups, nomes).
- E1-04/E1-07 — 8 fases: lookups de enums, papel unificado, identidade no `LoginPortal`,
  `Situacao` (lookup), FKs faltantes em `Agendamento`, penalidade de IA na conta, `ult_Atualizacao`,
  nomenclatura. Migrations consolidadas em `InitialCreate` + `Fase1..Fase8`.

**Incremento:** schema com integridade referencial real e base para os artefatos de banco.

---

## Sprint 5 — App Mobile v1 (16–25/ago/2026)
**Meta:** entregar o app do paciente (Expo/React Native).
- E6-01 — scaffold Expo, camada de API (refresh single-flight), auth (bloqueia não-pacientes).
- E2 — Minhas Consultas (listar/cancelar/remarcar); E6-05 — agendar via IA e manual.
- E6-03 — Perfil (dados, foto, senha); E6-04 — exclusão de conta; E6-02 — Home + badge de não-lidas.
- E1-05 — biometria/app-lock; re-skin "navy"; Configurações.

**Incremento:** app v1 funcionalmente completo (falta apenas push FCM).

---

## Sprint 6 — Recuperação de Senha & Shell Web (29/ago/2026)
**Meta:** autoatendimento de senha e refino do shell administrativo.
- E1-03 — recuperação de senha por código (API + web + mobile) + infra de e-mail reutilizável (9 testes).
- Sidebar recolhível (hover) + notificações na barra lateral.

**Incremento:** recuperação de senha ponta a ponta e navegação web renovada.

---

## Sprint 7 — User-model v2 + Auto-cadastro (backend) (30–31/ago/2026)
**Meta:** fundação do auto-cadastro moderado e finalização do modelo de papéis/identidade.
- Thread A — `RoleUsuario` unificado (remove `TipoUsuario`/`TipoProfissional`).
- Thread B — tabela `Pessoa` (identidade única); `LoginPortal` vira credencial pura.
- E4-01/02/05/06 — Threads D1–D4: tabelas da Declaração de Saúde, endpoints anônimos, aprovação admin,
  primeiro acesso; E4-07 — D5: editor admin da DS (backend + web).

**Incremento:** auto-cadastro moderado operante no backend + editor da DS.

---

## Sprint 8 — Auto-cadastro Ponta a Ponta + Wizard (01–02/set/2026)
**Meta:** completar o auto-cadastro (web + mobile) com verificação de e-mail e LGPD.
- E4-05 — D6: fila web de aprovação; E4-01/09 — D7: mini-cadastro e 1º acesso no mobile.
- E4-03/04 — wizard web (termos→dados→verificação de e-mail→DS); verificação de e-mail por código.
- Unificação dos 3 códigos de e-mail em `CodigoVerificacao` (Fase20) + consentimento (Fase21).

**Incremento:** auto-cadastro completo com wizard e confirmação de e-mail.

---

## Sprint 9 — Correções & Artefatos PIM IV (07/set/2026)
**Meta:** corrigir regressão do mobile, popular a DS e produzir artefatos de banco.
- E4-09 — **fix mobile**: auto-cadastro replicado em wizard (destravado após o endurecimento do backend).
- E4-02 — **30 perguntas oficiais da DS** semeadas; E4-08 — "colar várias perguntas" no editor.
- E8/Banco — artefatos do PIM IV: `docs/banco/` (MER, DDL, procedures/triggers) validados no LocalDB.

**Incremento:** produto alinhado (web+mobile) e artefatos de banco versionados.

---

## Próximos sprints (planejados — frente PIM IV)

| Sprint | Meta | Itens |
|--------|------|-------|
| S10 | **Documentação ágil** | Product/Sprint Backlog, Kanban, Cronograma (este pacote) |
| S11 | **Acessibilidade & responsabilidade social** | Auditoria a11y (web+mobile), seção de inclusão (E8-06) |
| S12 | **Nuvem & CD** | Deploy real, pipeline de CD, diagrama de arquitetura (E8-05) |
| S13 | **Monografia ABNT** | Integrar caracterização, planejamento, arquitetura, banco e telas |
