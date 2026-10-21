/* ============================================================================
   Clínica Mais Saúde — Procedures e Triggers (SQL Server / T-SQL)
   Artefato de Banco de Dados do PIM IV (rubrica 07).

   Requer o schema de 01_schema.sql já criado.

   ⚠️ Nota sobre o EF Core: os triggers abaixo escrevem em outras tabelas a partir
   de UPDATE. O SQL Server desabilita a cláusula OUTPUT em tabelas com trigger; se
   estes objetos forem aplicados ao MESMO banco usado pelo EF, declare o trigger no
   modelo — por exemplo:
       modelBuilder.Entity<Agendamento>()
                   .ToTable(t => t.HasTrigger("TR_Agendamentos_AuditarStatus"));
   para o EF trocar o caminho de escrita. Como ARTEFATO de banco (script isolado) os
   objetos funcionam sem qualquer ajuste.
   ============================================================================ */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ------------------------------------------------------------------ */
/* TRIGGER 1 — Auditoria automática de mudança de status do agendamento */
/*   A cada troca de Status, grava um evento append-only em             */
/*   AgendamentoHistoricos (TipoEvento = 2 = MudancaStatus).            */
/* ------------------------------------------------------------------ */
IF OBJECT_ID('TR_Agendamentos_AuditarStatus', 'TR') IS NOT NULL
    DROP TRIGGER TR_Agendamentos_AuditarStatus;
GO
CREATE TRIGGER TR_Agendamentos_AuditarStatus
ON Agendamentos
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(Status) RETURN;

    INSERT INTO AgendamentoHistoricos
        (Id, AgendamentoId, TipoEvento, StatusAnterior, StatusNovo, DataAnterior, DataNova, RealizadoPor, Observacao, Dt_Criado)
    SELECT
        NEWID(),
        i.Id,
        2,                                   -- MudancaStatus
        d.Status,                            -- status anterior
        i.Status,                            -- status novo
        NULL, NULL,
        CAST(0x0 AS UNIQUEIDENTIFIER),        -- ator "sistema" (trigger); a app grava o ator real quando disponível
        N'Mudança de status registrada automaticamente (trigger).',
        SYSUTCDATETIME()
    FROM inserted i
    INNER JOIN deleted d ON d.Id = i.Id
    WHERE i.Status <> d.Status;
END;
GO

/* ------------------------------------------------------------------ */
/* TRIGGER 2 — updated-at no nível do banco (Pacientes)                */
/*   Carimba ult_Atualizacao em toda alteração. Complementa o carimbo  */
/*   da aplicação (SaveChangesAsync) — garante a coluna mesmo em UPDATE */
/*   feito por script/procedure fora do EF.                            */
/* ------------------------------------------------------------------ */
IF OBJECT_ID('TR_Pacientes_UltAtualizacao', 'TR') IS NOT NULL
    DROP TRIGGER TR_Pacientes_UltAtualizacao;
GO
CREATE TRIGGER TR_Pacientes_UltAtualizacao
ON Pacientes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p
       SET ult_Atualizacao = SYSUTCDATETIME()
      FROM Pacientes p
      INNER JOIN inserted i ON i.Id = p.Id;
END;
GO

/* ------------------------------------------------------------------ */
/* PROCEDURE 1 — Aprovar / recusar solicitação de auto-cadastro         */
/*   Máquina de estados: EmAnalise(1) -> Aprovada(2) | Recusada(3).     */
/*   Bloqueia transições inválidas. A criação da conta em si permanece  */
/*   na aplicação (define senha no 1º acesso).                          */
/* ------------------------------------------------------------------ */
IF OBJECT_ID('SP_AprovarSolicitacaoCadastro', 'P') IS NOT NULL
    DROP PROCEDURE SP_AprovarSolicitacaoCadastro;
GO
CREATE PROCEDURE SP_AprovarSolicitacaoCadastro
    @SolicitacaoId UNIQUEIDENTIFIER,
    @Aprovar       BIT,
    @Motivo        NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StatusAtual INT =
        (SELECT Status FROM SolicitacoesCadastro WHERE Id = @SolicitacaoId);

    IF @StatusAtual IS NULL
    BEGIN
        THROW 51000, 'Solicitação não encontrada.', 1;
        RETURN;
    END;
    IF @StatusAtual <> 1   -- só uma solicitação EmAnalise pode ser decidida
    BEGIN
        THROW 51001, 'A solicitação não está em análise (já foi decidida).', 1;
        RETURN;
    END;
    IF @Aprovar = 0 AND (@Motivo IS NULL OR LTRIM(RTRIM(@Motivo)) = N'')
    BEGIN
        THROW 51002, 'Informe o motivo da recusa.', 1;
        RETURN;
    END;

    UPDATE SolicitacoesCadastro
       SET Status          = CASE WHEN @Aprovar = 1 THEN 2 ELSE 3 END,
           MotivoRecusa    = CASE WHEN @Aprovar = 1 THEN NULL ELSE @Motivo END,
           ult_Atualizacao = SYSUTCDATETIME()
     WHERE Id = @SolicitacaoId;

    SELECT Id, Status, MotivoRecusa, ult_Atualizacao
      FROM SolicitacoesCadastro
     WHERE Id = @SolicitacaoId;
END;
GO

/* ------------------------------------------------------------------ */
/* PROCEDURE 2 — Relatório de faltas (no-show) por profissional        */
/*   Agrega, no período, total de consultas, faltas (Status = 5) e a   */
/*   taxa de faltas por profissional. Insumo para gestão de agenda.    */
/* ------------------------------------------------------------------ */
IF OBJECT_ID('SP_RelatorioFaltasPorProfissional', 'P') IS NOT NULL
    DROP PROCEDURE SP_RelatorioFaltasPorProfissional;
GO
CREATE PROCEDURE SP_RelatorioFaltasPorProfissional
    @Inicio DATETIME2,
    @Fim    DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        pr.Id                                   AS ProfissionalId,
        pe.Nome                                 AS Profissional,
        COUNT(*)                                AS TotalAgendamentos,
        SUM(CASE WHEN a.Status = 5 THEN 1 ELSE 0 END) AS Faltas,
        CAST(100.0 * SUM(CASE WHEN a.Status = 5 THEN 1 ELSE 0 END) / COUNT(*)
             AS DECIMAL(5,2))                   AS TaxaFaltasPct
    FROM Agendamentos a
    INNER JOIN Profissionais pr ON pr.Id = a.ProfissionalId
    LEFT  JOIN Pessoas       pe ON pe.Id = pr.PessoaId
    WHERE a.DataHoraConsulta >= @Inicio
      AND a.DataHoraConsulta <  @Fim
    GROUP BY pr.Id, pe.Nome
    ORDER BY TaxaFaltasPct DESC, TotalAgendamentos DESC;
END;
GO
