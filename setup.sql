IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408233915_CriacaoInicial'
)
BEGIN
    CREATE TABLE [Agendamentos] (
        [Id] uniqueidentifier NOT NULL,
        [DataHoraConsulta] datetime2 NOT NULL,
        [ProbabilidadeFalta] decimal(18,2) NOT NULL,
        [PacienteId] uniqueidentifier NOT NULL,
        [MedicoId] uniqueidentifier NOT NULL,
        [Status] int NOT NULL,
        CONSTRAINT [PK_Agendamentos] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408233915_CriacaoInicial'
)
BEGIN
    CREATE TABLE [Pacientes] (
        [Id] uniqueidentifier NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [Cpf] nvarchar(max) NOT NULL,
        [Telefone] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Pacientes] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408233915_CriacaoInicial'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260408233915_CriacaoInicial', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408234114_AjusteProbabilidadeParaDouble'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260408234114_AjusteProbabilidadeParaDouble', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260411192429_AdicionandoEmailPaciente'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Agendamentos]') AND [c].[name] = N'ProbabilidadeFalta');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Agendamentos] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [Agendamentos] ALTER COLUMN [ProbabilidadeFalta] float NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260411192429_AdicionandoEmailPaciente'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260411192429_AdicionandoEmailPaciente', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260411224308_SincronizandoModelos'
)
BEGIN
    ALTER TABLE [Pacientes] ADD [Email] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260411224308_SincronizandoModelos'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260411224308_SincronizandoModelos', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260412021304_AjusteTamanhoColunas'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Pacientes]') AND [c].[name] = N'Telefone');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Pacientes] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [Pacientes] ALTER COLUMN [Telefone] varchar(11) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260412021304_AjusteTamanhoColunas'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Pacientes]') AND [c].[name] = N'Nome');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Pacientes] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [Pacientes] ALTER COLUMN [Nome] nvarchar(100) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260412021304_AjusteTamanhoColunas'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Pacientes]') AND [c].[name] = N'Email');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Pacientes] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [Pacientes] ALTER COLUMN [Email] nvarchar(150) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260412021304_AjusteTamanhoColunas'
)
BEGIN
    DECLARE @var4 nvarchar(max);
    SELECT @var4 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Pacientes]') AND [c].[name] = N'Cpf');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [Pacientes] DROP CONSTRAINT ' + @var4 + ';');
    ALTER TABLE [Pacientes] ALTER COLUMN [Cpf] varchar(11) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260412021304_AjusteTamanhoColunas'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260412021304_AjusteTamanhoColunas', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260425174533_AdicionarColunaAtivo'
)
BEGIN
    ALTER TABLE [Pacientes] ADD [Ativo] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260425174533_AdicionarColunaAtivo'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260425174533_AdicionarColunaAtivo', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260425182216_CriacaoTabelaAgendamentos'
)
BEGIN
    CREATE INDEX [IX_Agendamentos_PacienteId] ON [Agendamentos] ([PacienteId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260425182216_CriacaoTabelaAgendamentos'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD CONSTRAINT [FK_Agendamentos_Pacientes_PacienteId] FOREIGN KEY ([PacienteId]) REFERENCES [Pacientes] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260425182216_CriacaoTabelaAgendamentos'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260425182216_CriacaoTabelaAgendamentos', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426161129_RefatoracaoAgendamentos'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD [AgendamentoOrigemId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426161129_RefatoracaoAgendamentos'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD [TipoConsulta] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426161129_RefatoracaoAgendamentos'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD [TipoProfissional] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426161129_RefatoracaoAgendamentos'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260426161129_RefatoracaoAgendamentos', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426163326_AdicionarStatusCancelado'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260426163326_AdicionarStatusCancelado', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    ALTER TABLE [Pacientes] ADD [DtCriado] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    ALTER TABLE [Pacientes] ADD [UsuarioId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD [DtCriado] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD [ProfissionalId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE TABLE [StatusAgendamentoLookup] (
        [Id] int NOT NULL,
        [Nome] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_StatusAgendamentoLookup] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE TABLE [Usuarios] (
        [Id] uniqueidentifier NOT NULL,
        [Email] nvarchar(150) NOT NULL,
        [Cpf] nvarchar(14) NOT NULL,
        [SenhaHash] nvarchar(max) NOT NULL,
        [DtCriado] datetime2 NOT NULL,
        CONSTRAINT [PK_Usuarios] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE TABLE [Profissionais] (
        [Id] uniqueidentifier NOT NULL,
        [UsuarioId] uniqueidentifier NOT NULL,
        [TipoProfissional] int NOT NULL,
        [DtCriado] datetime2 NOT NULL,
        CONSTRAINT [PK_Profissionais] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Profissionais_Usuarios_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Usuarios] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Nome') AND [object_id] = OBJECT_ID(N'[StatusAgendamentoLookup]'))
        SET IDENTITY_INSERT [StatusAgendamentoLookup] ON;
    EXEC(N'INSERT INTO [StatusAgendamentoLookup] ([Id], [Nome])
    VALUES (0, N''Agendado''),
    (1, N''EmAtendimento''),
    (2, N''AguardandoRetorno''),
    (3, N''RetornoAgendado''),
    (4, N''Finalizado''),
    (5, N''Faltou''),
    (6, N''Cancelado'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Nome') AND [object_id] = OBJECT_ID(N'[StatusAgendamentoLookup]'))
        SET IDENTITY_INSERT [StatusAgendamentoLookup] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE INDEX [IX_Pacientes_UsuarioId] ON [Pacientes] ([UsuarioId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE INDEX [IX_Agendamentos_ProfissionalId] ON [Agendamentos] ([ProfissionalId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE INDEX [IX_Profissionais_UsuarioId] ON [Profissionais] ([UsuarioId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Usuarios_Cpf] ON [Usuarios] ([Cpf]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Usuarios_Email] ON [Usuarios] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD CONSTRAINT [FK_Agendamentos_Profissionais_ProfissionalId] FOREIGN KEY ([ProfissionalId]) REFERENCES [Profissionais] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    ALTER TABLE [Pacientes] ADD CONSTRAINT [FK_Pacientes_Usuarios_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [Usuarios] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426182359_ConfigurarAutenticacao'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260426182359_ConfigurarAutenticacao', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [Agendamentos] DROP CONSTRAINT [FK_Agendamentos_Profissionais_ProfissionalId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [Pacientes] DROP CONSTRAINT [FK_Pacientes_Usuarios_UsuarioId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [Profissionais] DROP CONSTRAINT [FK_Profissionais_Usuarios_UsuarioId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    DROP INDEX [IX_Agendamentos_ProfissionalId] ON [Agendamentos];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    DECLARE @var5 nvarchar(max);
    SELECT @var5 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Agendamentos]') AND [c].[name] = N'MedicoId');
    IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [Agendamentos] DROP CONSTRAINT ' + @var5 + ';');
    ALTER TABLE [Agendamentos] DROP COLUMN [MedicoId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [StatusAgendamentoLookup] ADD [Dt_Criado] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [Profissionais] ADD [Crm] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [Profissionais] ADD [UfCrm] nvarchar(2) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    DECLARE @var6 nvarchar(max);
    SELECT @var6 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Agendamentos]') AND [c].[name] = N'ProfissionalId');
    IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [Agendamentos] DROP CONSTRAINT ' + @var6 + ';');
    EXEC(N'UPDATE [Agendamentos] SET [ProfissionalId] = ''00000000-0000-0000-0000-000000000000'' WHERE [ProfissionalId] IS NULL');
    ALTER TABLE [Agendamentos] ALTER COLUMN [ProfissionalId] uniqueidentifier NOT NULL;
    ALTER TABLE [Agendamentos] ADD DEFAULT '00000000-0000-0000-0000-000000000000' FOR [ProfissionalId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [LoginPortal] ADD [IsAdmin] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Cpf', N'Dt_Criado', N'Email', N'IsAdmin', N'SenhaHash') AND [object_id] = OBJECT_ID(N'[LoginPortal]'))
        SET IDENTITY_INSERT [LoginPortal] ON;
    EXEC(N'INSERT INTO [LoginPortal] ([Id], [Cpf], [Dt_Criado], [Email], [IsAdmin], [SenhaHash])
    VALUES (''11111111-1111-1111-1111-111111111111'', N''00000000000'', ''2026-04-26T00:00:00.0000000Z'', N''admin@clinicamaissaude.com.br'', CAST(1 AS bit), N''$2a$11$D7Pz.U9h9.1b20JdE3D2cOeT.t/qO7Z0.v1OqS7P6o9zG0L.21a.K'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Cpf', N'Dt_Criado', N'Email', N'IsAdmin', N'SenhaHash') AND [object_id] = OBJECT_ID(N'[LoginPortal]'))
        SET IDENTITY_INSERT [LoginPortal] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    EXEC(N'UPDATE [StatusAgendamentoLookup] SET [Dt_Criado] = ''2026-01-01T00:00:00.0000000Z''
    WHERE [Id] = 0;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    EXEC(N'UPDATE [StatusAgendamentoLookup] SET [Dt_Criado] = ''2026-01-01T00:00:00.0000000Z''
    WHERE [Id] = 1;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    EXEC(N'UPDATE [StatusAgendamentoLookup] SET [Dt_Criado] = ''2026-01-01T00:00:00.0000000Z''
    WHERE [Id] = 2;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    EXEC(N'UPDATE [StatusAgendamentoLookup] SET [Dt_Criado] = ''2026-01-01T00:00:00.0000000Z''
    WHERE [Id] = 3;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    EXEC(N'UPDATE [StatusAgendamentoLookup] SET [Dt_Criado] = ''2026-01-01T00:00:00.0000000Z''
    WHERE [Id] = 4;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    EXEC(N'UPDATE [StatusAgendamentoLookup] SET [Dt_Criado] = ''2026-01-01T00:00:00.0000000Z''
    WHERE [Id] = 5;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    EXEC(N'UPDATE [StatusAgendamentoLookup] SET [Dt_Criado] = ''2026-01-01T00:00:00.0000000Z''
    WHERE [Id] = 6;
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Crm', N'Dt_Criado', N'TipoProfissional', N'UfCrm', N'UsuarioId') AND [object_id] = OBJECT_ID(N'[Profissionais]'))
        SET IDENTITY_INSERT [Profissionais] ON;
    EXEC(N'INSERT INTO [Profissionais] ([Id], [Crm], [Dt_Criado], [TipoProfissional], [UfCrm], [UsuarioId])
    VALUES (''22222222-2222-2222-2222-222222222222'', N''123456'', ''2026-04-26T00:00:00.0000000Z'', 1, N''SP'', ''11111111-1111-1111-1111-111111111111'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Crm', N'Dt_Criado', N'TipoProfissional', N'UfCrm', N'UsuarioId') AND [object_id] = OBJECT_ID(N'[Profissionais]'))
        SET IDENTITY_INSERT [Profissionais] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [Pacientes] ADD CONSTRAINT [FK_Pacientes_LoginPortal_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [LoginPortal] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    ALTER TABLE [Profissionais] ADD CONSTRAINT [FK_Profissionais_LoginPortal_UsuarioId] FOREIGN KEY ([UsuarioId]) REFERENCES [LoginPortal] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426230238_SyncLoginPortalAndAdmin'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260426230238_SyncLoginPortalAndAdmin', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426231303_UpdateAdminPassword'
)
BEGIN
    EXEC(N'UPDATE [LoginPortal] SET [SenhaHash] = N''$2a$11$D7Pz.U9h9.1b20JdE3D2cOeT.t/qO7Z0.v1OqS7P6o9zG0L.21a.K''
    WHERE [Id] = ''11111111-1111-1111-1111-111111111111'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260426231303_UpdateAdminPassword'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260426231303_UpdateAdminPassword', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429231340_AddAgendamentoHistoricoEProfissionalNome'
)
BEGIN
    ALTER TABLE [Profissionais] ADD [Nome] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429231340_AddAgendamentoHistoricoEProfissionalNome'
)
BEGIN
    CREATE TABLE [AgendamentoHistoricos] (
        [Id] uniqueidentifier NOT NULL,
        [AgendamentoId] uniqueidentifier NOT NULL,
        [TipoEvento] int NOT NULL,
        [StatusAnterior] int NULL,
        [StatusNovo] int NULL,
        [DataAnterior] datetime2 NULL,
        [DataNova] datetime2 NULL,
        [Observacao] nvarchar(max) NULL,
        [RealizadoPor] uniqueidentifier NOT NULL,
        [Dt_Criado] datetime2 NOT NULL,
        CONSTRAINT [PK_AgendamentoHistoricos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AgendamentoHistoricos_Agendamentos_AgendamentoId] FOREIGN KEY ([AgendamentoId]) REFERENCES [Agendamentos] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429231340_AddAgendamentoHistoricoEProfissionalNome'
)
BEGIN
    EXEC(N'UPDATE [LoginPortal] SET [SenhaHash] = N''$2a$11$DaDuHHaqAhlkdCbeVcw6l.ttRvVjLZ8AnOcXvugreEbhe0C1K1YPK''
    WHERE [Id] = ''11111111-1111-1111-1111-111111111111'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429231340_AddAgendamentoHistoricoEProfissionalNome'
)
BEGIN
    EXEC(N'UPDATE [Profissionais] SET [Nome] = N''Dr. Admin''
    WHERE [Id] = ''22222222-2222-2222-2222-222222222222'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429231340_AddAgendamentoHistoricoEProfissionalNome'
)
BEGIN
    CREATE INDEX [IX_AgendamentoHistoricos_AgendamentoId] ON [AgendamentoHistoricos] ([AgendamentoId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429231340_AddAgendamentoHistoricoEProfissionalNome'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260429231340_AddAgendamentoHistoricoEProfissionalNome', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501023846_AjustesFinaisPerfil'
)
BEGIN
    ALTER TABLE [Pacientes] ADD [FotoUrl] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501023846_AjustesFinaisPerfil'
)
BEGIN
    ALTER TABLE [LoginPortal] ADD [UltimoAcesso] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501023846_AjustesFinaisPerfil'
)
BEGIN
    EXEC(N'UPDATE [LoginPortal] SET [UltimoAcesso] = NULL
    WHERE [Id] = ''11111111-1111-1111-1111-111111111111'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501023846_AjustesFinaisPerfil'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260501023846_AjustesFinaisPerfil', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501154715_AddEspecialidadesMedicas'
)
BEGIN
    DECLARE @var7 nvarchar(max);
    SELECT @var7 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Pacientes]') AND [c].[name] = N'FotoUrl');
    IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [Pacientes] DROP CONSTRAINT ' + @var7 + ';');
    ALTER TABLE [Pacientes] DROP COLUMN [FotoUrl];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501154715_AddEspecialidadesMedicas'
)
BEGIN
    CREATE TABLE [ProfissionalEspecialidades] (
        [ProfissionalId] uniqueidentifier NOT NULL,
        [EspecialidadeId] int NOT NULL,
        CONSTRAINT [PK_ProfissionalEspecialidades] PRIMARY KEY ([ProfissionalId], [EspecialidadeId]),
        CONSTRAINT [FK_ProfissionalEspecialidades_Profissionais_ProfissionalId] FOREIGN KEY ([ProfissionalId]) REFERENCES [Profissionais] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501154715_AddEspecialidadesMedicas'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260501154715_AddEspecialidadesMedicas', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501161847_AddResultadoDisponivel'
)
BEGIN
    ALTER TABLE [Agendamentos] ADD [ResultadoDisponivel] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260501161847_AddResultadoDisponivel'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260501161847_AddResultadoDisponivel', N'10.0.5');
END;

COMMIT;
GO

