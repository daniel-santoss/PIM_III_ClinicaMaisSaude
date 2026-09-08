# Acessibilidade e Responsabilidade Social — PIM IV

Artefatos das rubricas **04 (responsabilidade social/diversidade)** e insumo da **08 (qualidade)** do PIM IV,
para o sistema **Clínica Mais Saúde**.

| Arquivo | Conteúdo |
|---------|----------|
| [`ACESSIBILIDADE.md`](ACESSIBILIDADE.md) | Auditoria WCAG 2.1 (o que já está implementado + backlog de remediação priorizado) e como testar. |
| [`RESPONSABILIDADE_SOCIAL.md`](RESPONSABILIDADE_SOCIAL.md) | Inclusão e diversidade: VLibras, acessibilidade cognitiva, redução de barreiras, LGPD, IA responsável. |

## Implementado nesta frente

- **VLibras** (tradução para Libras) no portal web — widget oficial do gov.br, validado no preview.
- **Skip link** + landmark `<main>` no shell web (WCAG 2.4.1).
- **Rótulos e estados de acessibilidade** (`accessibilityRole`/`accessibilityState`) na jornada de
  auto-cadastro do app mobile.

Relacionados: documentação ágil em [`../agil/`](../agil/); banco de dados em [`../banco/`](../banco/).
