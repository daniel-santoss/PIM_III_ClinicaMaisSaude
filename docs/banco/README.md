# Artefatos de Banco de Dados — PIM IV (rubrica 07)

Documentação e scripts do banco de dados do sistema **Clínica Mais Saúde**. Gerados a partir do modelo
vigente (EF Core 10, 22 *migrations* `InitialCreate`…`Fase21`) e **validados** contra SQL Server LocalDB.

| Arquivo | Conteúdo |
|---------|----------|
| [`MODELO_DADOS.md`](MODELO_DADOS.md) | MER (diagrama ER em Mermaid), convenções, dicionário de dados das 26 tabelas, tabelas de referência e ciclos de vida. |
| [`01_schema.sql`](01_schema.sql) | Script DDL completo: 26 tabelas (16 de entidade + 10 *lookup*), PKs, 37 FKs, índices (inclui únicos filtrados) e *seed* dos *lookups*. |
| [`02_procedures_triggers.sql`](02_procedures_triggers.sql) | 2 *triggers* (auditoria de status; *updated-at* no banco) + 2 *procedures* (aprovar solicitação; relatório de faltas). |

## Como executar (SQL Server / LocalDB)

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -Q "CREATE DATABASE ClinicaMaisSaude;"
sqlcmd -S "(localdb)\MSSQLLocalDB" -d ClinicaMaisSaude -i docs/banco/01_schema.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -d ClinicaMaisSaude -i docs/banco/02_procedures_triggers.sql
```

> Os scripts ligam `SET QUOTED_IDENTIFIER ON` (necessário para os índices únicos filtrados).

## Relação com o código

O banco real é gerido por *migrations* EF Core — este DDL é o **retrato do estado final** para fins de
documentação. Para regenerar o script canônico direto do modelo:

```bash
dotnet ef migrations script --idempotent \
  --project ClinicaMaisSaude.Infrastructure --startup-project ClinicaMaisSaude.API
```

A especificação de modelagem (histórico do refactor) está em [`../../ESPEC_MODELAGEM_BANCO.md`](../../ESPEC_MODELAGEM_BANCO.md).
