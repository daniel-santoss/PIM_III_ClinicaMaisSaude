# Nuvem e DevOps — PIM IV (rubrica 08)

Artefatos de nuvem, CI/CD e DevOps do sistema **Clínica Mais Saúde**.

| Arquivo | Conteúdo |
|---------|----------|
| [`ARQUITETURA_NUVEM.md`](ARQUITETURA_NUVEM.md) | Topologia em nuvem (diagrama), componentes, esteira CI/CD, estratégia de migração, comparação de provedores e o que falta para publicar. |

## Esteira (visão rápida)

- **CI** — [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml): build + testes (backend, web, mobile) a cada push/PR. **Ativo e verde.**
- **CD** — [`../../.github/workflows/cd.yml`](../../.github/workflows/cd.yml): build + push da imagem da API para o GHCR e build do web; dispara em **tag `v*`** ou **manualmente**. Deploy/migração ficam comentados até a escolha do provedor.
- **Containers** — [`../../ClinicaMaisSaude.API/Dockerfile`](../../ClinicaMaisSaude.API/Dockerfile), [`../../docker-compose.yml`](../../docker-compose.yml).
- **Runbook operacional** — [`../../DEPLOY.md`](../../DEPLOY.md) (variáveis de ambiente e checklist).

## Estado

O que **não depende de provedor** está pronto (CI, imagem Docker, build do web, diagrama e documentação) —
suficiente para a rubrica 08 da monografia. A **publicação real** (escolher provedor, provisionar banco,
cadastrar segredos, ativar o deploy no `cd.yml`) é um passo do responsável do projeto — ver
[`ARQUITETURA_NUVEM.md`](ARQUITETURA_NUVEM.md) §5 e §7.

Relacionados: [`../monografia/ARQUITETURA.md`](../monografia/ARQUITETURA.md) (arquitetura do sistema).
