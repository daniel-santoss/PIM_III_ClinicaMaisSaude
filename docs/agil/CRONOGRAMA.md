# Cronograma — Clínica Mais Saúde

Linha do tempo do desenvolvimento (derivada do histórico de commits) e o planejamento até a entrega da
**monografia do PIM IV em 14/11/2026**. Datas de desenvolvimento são reais; as da frente de documentação
são estimativas.

## Diagrama de Gantt

```mermaid
gantt
    title Clínica Mais Saúde — PIM III (execução) → PIM IV (documentação)
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    excludes weekends

    section Execução (PIM III)
    S0 Fundação (arquitetura, login, agenda)      :done, s0, 2026-04-07, 2026-04-26
    S1 Agendamento & experiência                  :done, s1, 2026-04-29, 2026-05-02
    S2 IA, especialidades & segurança             :done, s2, 2026-05-03, 2026-05-31
    S3 Estabilização & regras                     :done, s3, 2026-06-01, 2026-06-30
    S4 Refactor de modelagem (8 fases)            :done, s4, 2026-08-15, 2026-08-16
    S5 App Mobile v1 (Expo)                        :done, s5, 2026-08-16, 2026-08-25
    S6 Recuperação de senha & shell web           :done, s6, 2026-08-29, 2026-08-29
    S7 User-model v2 + auto-cadastro (backend)    :done, s7, 2026-08-30, 2026-08-31
    S8 Auto-cadastro ponta a ponta + wizard       :done, s8, 2026-09-01, 2026-09-02
    S9 Correções & artefatos de banco (PIM IV)    :done, s9, 2026-09-07, 2026-09-07

    section Documentação (PIM IV)
    S10 Documentação PIM IV, a11y & qualidade     :done,   s10, 2026-09-07, 2026-09-20
    S11 Paridade mobile, segurança & UX           :done,   s11, 2026-10-20, 2026-10-25
    S12 Publicação em nuvem (Azure)               :done,   s12, 2026-10-25, 2026-10-26
    S13 Monografia ABNT + APK                     :active, s13, 2026-10-26, 2026-11-10
    Revisão final & entrega                       :crit,   s14, 2026-11-10, 4d
    Entrega da monografia                         :milestone, m1, 2026-11-14, 0d
```

## Marcos (milestones)

| Data | Marco |
|------|-------|
| 08/04/2026 | 1ª migration EF Core; fundação da Clean Architecture |
| 26/04/2026 | Login, cadastro e agendamento base (web) |
| mai/2026 | Triagem por IA + especialidades + recuperação de senha (v1) |
| 16/08/2026 | Refactor de modelagem consolidado (`InitialCreate` + 8 fases) |
| 25/08/2026 | App Mobile v1 funcionalmente completo |
| 29/08/2026 | Recuperação de senha self-service (API+web+mobile) |
| 31/08/2026 | Auto-cadastro moderado no backend + editor da DS |
| 02/09/2026 | Auto-cadastro ponta a ponta com wizard e verificação de e-mail |
| 07/09/2026 | Correções mobile · 30 perguntas da DS · **artefatos de banco (PIM IV)** |
| 13/09/2026 | Documentação ágil, acessibilidade (VLibras) e plano de nuvem concluídos |
| 24/10/2026 | Expo SDK 58 · **autorização por recurso** na API |
| 25/10/2026 | **Sistema publicado no Azure** (API, banco, portal e app web) |
| **14/11/2026** | **Entrega da monografia do PIM IV** (ABNT) |

## Frente restante até a entrega

1. **Monografia ABNT** — integrar as entregas de outubro (publicação no Azure, autorização por recurso,
   sessão curta, termos LGPD v2.0) e revisar capa, sumário e contagem de páginas.
2. **APK do app Android** (EAS Build) — app instalável para a demonstração.
3. **Revisão final e entrega** em 14/11/2026.

> **Observação de método:** o projeto usou fluxo incremental contínuo (estilo Kanban) em vez de sprints de
> duração fixa. O agrupamento em "S0…S13" é uma leitura *a posteriori* para fins de documentação e não
> reflete cerimônias formais de Scrum.
