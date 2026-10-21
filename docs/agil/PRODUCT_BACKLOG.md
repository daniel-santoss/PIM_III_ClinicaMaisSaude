# Product Backlog — Clínica Mais Saúde

Backlog do produto priorizado por **MoSCoW** (Must / Should / Could / Won't), organizado em épicos.
Cada história tem critérios de aceite e situação atual. Derivado do histórico de desenvolvimento
(abr–set/2026) e do roadmap do projeto.

**Legenda de situação:** ✅ Concluído · 🔜 Próximo · 📦 Backlog (planejado, não iniciado)

**Papéis (personas):**
- **Paciente** — usa o app mobile e o portal; agenda, acompanha e se auto-cadastra.
- **Profissional** (Médico/Enfermeira) — atende; consulta a agenda.
- **Administrador** — gere usuários, aprova cadastros, edita a Declaração de Saúde, audita.

---

## Épico E1 — Identidade, Acesso e Segurança

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E1-01 | Como usuário, quero **fazer login** com e-mail/CPF e senha para acessar o sistema. | Must | ✅ |
| E1-02 | Como sistema, quero **JWT + refresh token** com rotação para manter a sessão com segurança. | Must | ✅ |
| E1-03 | Como usuário, quero **recuperar minha senha** por código enviado ao e-mail (autoatendimento). | Must | ✅ |
| E1-04 | Como administrador, quero **papéis** (Paciente/Médico/Enfermeira/Admin) para controlar permissões. | Must | ✅ |
| E1-05 | Como paciente, quero **login biométrico e app-lock** no celular para acesso rápido e seguro. | Should | ✅ |
| E1-06 | Como sistema, quero **bloquear conta após tentativas** de login (anti-brute-force). | Should | ✅ |
| E1-07 | Como sistema, quero **identidade única (`Pessoa`)** separada da credencial para consistência de dados. | Should | ✅ |

**Critérios de aceite (ex. E1-03):** o código expira em 15 min, é de uso único, trava após 5 tentativas;
o e-mail é enviado com identidade visual da clínica; resposta genérica (anti-enumeração de contas).

---

## Épico E2 — Agendamento de Consultas

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E2-01 | Como usuário, quero **agendar uma consulta** escolhendo profissional, tipo e horário. | Must | ✅ |
| E2-02 | Como usuário, quero **remarcar** uma consulta informando novo horário e motivo. | Must | ✅ |
| E2-03 | Como usuário, quero **cancelar** uma consulta. | Must | ✅ |
| E2-04 | Como sistema, quero **registrar histórico** de toda mudança (criação, status, remarcação, cancelamento). | Should | ✅ |
| E2-05 | Como profissional, quero **agendar retorno** vinculado à consulta de origem. | Should | ✅ |
| E2-06 | Como sistema, quero **impedir conflito de horário** por profissional (integridade de agenda). | Must | ✅ |
| E2-07 | Como gestor, quero **prever probabilidade de falta** (no-show) para priorizar lembretes. | Could | ✅ |
| E2-08 | Como sistema, quero **lembretes automáticos** (manhã / 2h antes) da consulta. | Should | ✅ |

**Critérios de aceite (ex. E2-04):** cada transição de status gera um registro *append-only* em
`AgendamentoHistoricos` com status anterior/novo, data e ator (ver trigger em `docs/banco/`).

---

## Épico E3 — Triagem Inteligente (IA)

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E3-01 | Como paciente, quero **descrever sintomas** e receber uma **sugestão de tipo de atendimento**. | Should | ✅ |
| E3-02 | Como sistema, quero **detectar e bloquear injeção de prompt** na entrada do paciente. | Must | ✅ |
| E3-03 | Como sistema, quero **penalizar uso indevido** da IA (bloqueio temporário) e auditar as violações. | Should | ✅ |
| E3-04 | Como administrador, quero **remover penalidade** e avisar o usuário via notificação. | Could | ✅ |

---

## Épico E4 — Auto-cadastro Moderado

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E4-01 | Como proponente, quero **me pré-cadastrar** (mini-cadastro) sem ir à recepção. | Must | ✅ |
| E4-02 | Como proponente, quero **responder a Declaração de Saúde** vigente no cadastro. | Must | ✅ |
| E4-03 | Como proponente, quero **confirmar meu e-mail por código** antes de enviar o cadastro. | Must | ✅ |
| E4-04 | Como proponente, quero **aceitar os termos (LGPD)** com registro de consentimento. | Must | ✅ |
| E4-05 | Como administrador, quero uma **fila de solicitações** para aprovar/recusar (com motivo). | Must | ✅ |
| E4-06 | Como aprovado, quero concluir o **primeiro acesso** por código e definir minha senha. | Must | ✅ |
| E4-07 | Como administrador, quero **editar os modelos e perguntas** da Declaração de Saúde. | Should | ✅ |
| E4-08 | Como administrador, quero **adicionar várias perguntas de uma vez** (colar em lote). | Could | ✅ |
| E4-09 | Como proponente no **app mobile**, quero o mesmo fluxo em wizard (termos→dados→e-mail→DS). | Must | ✅ |

**Critérios de aceite (ex. E4-05):** máquina de estados `EmAnalise → Aprovada | Recusada`; recusa exige
motivo e notifica o proponente por e-mail; um modelo já usado em solicitações fica travado para edição
(integridade histórica das respostas).

---

## Épico E5 — Notificações

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E5-01 | Como usuário, quero um **feed de notificações** (lidas/não lidas) com contador. | Should | ✅ |
| E5-02 | Como usuário, quero **notificações em tempo real** enquanto uso o app (SignalR). | Should | ✅ |
| E5-03 | Como usuário, quero **push nativo** (FCM) mesmo com o app fechado. | Could | 📦 |

---

## Épico E6 — App Mobile do Paciente

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E6-01 | Como paciente, quero um **app** (Expo/React Native) com login, agenda e perfil. | Must | ✅ |
| E6-02 | Como paciente, quero **tela inicial** com próxima consulta e atalhos. | Should | ✅ |
| E6-03 | Como paciente, quero **editar meu perfil e foto** e trocar a senha. | Should | ✅ |
| E6-04 | Como paciente, quero **excluir minha conta** pelo app (exigência das lojas). | Must | ✅ |
| E6-05 | Como paciente, quero **agendar pela IA ou manualmente** (modo avançado). | Should | ✅ |

---

## Épico E7 — Administração e Relatórios

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E7-01 | Como administrador, quero **gerir usuários** (cadastro, edição, desativação). | Must | ✅ |
| E7-02 | Como administrador, quero **auditar violações de IA**. | Should | ✅ |
| E7-03 | Como administrador, quero **relatórios** (ex.: faltas por profissional). | Should | ✅ |
| E7-04 | Como administrador, quero um **painel** com indicadores gerais. | Could | 📦 |

---

## Épico E8 — Arquitetura, Qualidade e DevOps

| ID | História | Prioridade | Situação |
|----|----------|-----------|----------|
| E8-01 | Como equipe, quero **Clean Architecture** (Domain/Application/Infrastructure/API). | Must | ✅ |
| E8-02 | Como equipe, quero **testes automatizados** (unit/integração) cobrindo regras críticas. | Must | ✅ |
| E8-03 | Como equipe, quero **CI** (build + testes + tsc) a cada push. | Should | ✅ |
| E8-04 | Como equipe, quero **artefatos de deploy** (Dockerfile, compose, DEPLOY.md). | Should | ✅ |
| E8-05 | Como equipe, quero **publicar em nuvem** com pipeline de CD. | Could | 📦 |
| E8-06 | Como equipe, quero **acessibilidade** auditada (web + mobile). | Should | 🔜 |

---

## Backlog priorizado (o que falta — visão executiva)

| Prioridade | Item | Épico |
|-----------|------|-------|
| 🔜 Should | Auditoria de acessibilidade (web + mobile) + seção de responsabilidade social | E8-06 |
| 📦 Could | Push nativo FCM (background) | E5-03 |
| 📦 Could | Deploy em nuvem + pipeline de CD + diagrama de arquitetura | E8-05 |
| 📦 Could | Painel administrativo com indicadores | E7-04 |
| 🚫 Won't (agora) | Multi-tenant (múltiplas unidades) · 2º fator no 1º acesso · planos de saúde na home | — |
