BEGIN TRANSACTION;
ALTER TABLE [Agendamentos] ADD [LembreteDuasHorasEnviado] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [Agendamentos] ADD [LembreteManhaEnviado] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [Agendamentos] ADD [NotificacaoPendenteGerada] bit NOT NULL DEFAULT CAST(0 AS bit);

CREATE TABLE [Notificacoes] (
    [Id] uniqueidentifier NOT NULL,
    [UsuarioId] uniqueidentifier NOT NULL,
    [Titulo] nvarchar(150) NOT NULL,
    [Mensagem] nvarchar(500) NOT NULL,
    [AgendamentoId] uniqueidentifier NULL,
    [Lida] bit NOT NULL DEFAULT CAST(0 AS bit),
    [Dt_Criado] datetime2 NOT NULL,
    CONSTRAINT [PK_Notificacoes] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Notificacoes_Agendamentos_AgendamentoId] FOREIGN KEY ([AgendamentoId]) REFERENCES [Agendamentos] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Notificacoes_LoginPortal_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [LoginPortal] ([Id]) ON DELETE CASCADE
);

CREATE INDEX [IX_Notificacoes_AgendamentoId] ON [Notificacoes] ([AgendamentoId]);

CREATE INDEX [IX_Notificacoes_UsuarioId] ON [Notificacoes] ([UsuarioId]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260509204741_AddNotificacoes', N'10.0.5');

COMMIT;
GO

