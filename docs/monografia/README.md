# Seções Escritas da Monografia — PIM IV

Textos-base (rascunhos) para a monografia do PIM IV do sistema **Clínica Mais Saúde**. Cada arquivo é uma
seção pronta para revisão e formatação ABNT.

| Arquivo | Seção | Rubrica |
|---------|-------|---------|
| [`CARACTERIZACAO_ORGANIZACAO.md`](CARACTERIZACAO_ORGANIZACAO.md) | Caracterização da organização e diagnóstico | 02 |
| [`PLANEJAMENTO_EMPREENDEDORISMO.md`](PLANEJAMENTO_EMPREENDEDORISMO.md) | Problema, objetivos, público-alvo, proposta de valor, diferenciais | 03 |
| [`ARQUITETURA.md`](ARQUITETURA.md) | Arquitetura do sistema (Clean Architecture, stack, segurança, IA, tempo real) | 05 / 06 / 08 |

## Esqueleto da monografia (ABNT) × artefatos

Estrutura sugerida (20–30 páginas de desenvolvimento) e de onde vem cada conteúdo:

| Capítulo ABNT | Fonte neste repositório |
|---------------|--------------------------|
| Capa, folha de rosto, resumo, *abstract*, sumário | `[a formatar]` |
| 1. Introdução | Sintetizar de `PLANEJAMENTO_EMPREENDEDORISMO.md` (problema/objetivos) |
| 2. Caracterização da organização | [`CARACTERIZACAO_ORGANIZACAO.md`](CARACTERIZACAO_ORGANIZACAO.md) |
| 3. Planejamento e empreendedorismo | [`PLANEJAMENTO_EMPREENDEDORISMO.md`](PLANEJAMENTO_EMPREENDEDORISMO.md) |
| 4. Metodologia (gestão ágil) | [`../agil/`](../agil/) (Product/Sprint Backlog, Kanban, Cronograma) |
| 5. Requisitos e regras de negócio | `../../requisitos_e_regras.md` |
| 6. Arquitetura da solução (web + mobile) | [`ARQUITETURA.md`](ARQUITETURA.md) |
| 7. Banco de dados | [`../banco/`](../banco/) (MER, DDL, procedures/triggers) |
| 8. Segurança e conformidade (LGPD) | `ARQUITETURA.md` §7 + `../acessibilidade/RESPONSABILIDADE_SOCIAL.md` |
| 9. Responsabilidade social e acessibilidade | [`../acessibilidade/`](../acessibilidade/) |
| 10. Nuvem e DevOps | `../../DEPLOY.md` + `ARQUITETURA.md` §10 `[+ diagrama de nuvem a fazer]` |
| 11. Conclusão | `[a escrever — síntese dos resultados]` |
| Referências | `[ABNT — .NET, EF Core, WCAG, LGPD, VLibras, etc.]` |

## Observações

- Os textos refletem o **estado atual** do sistema (design *navy*, SignalR, modelo de identidade pós-refactor,
  auto-cadastro moderado). Documentos de análise mais antigos na raiz (`ANALISE_PROJETO.md`) podem conter
  pontos superados — priorizar estas seções.
- Dados institucionais concretos (razão social, porte, localização) devem ser preenchidos a partir do
  relatório do **PIM III** (marcados como `[…]` em `CARACTERIZACAO_ORGANIZACAO.md`).
