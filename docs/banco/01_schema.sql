/* ============================================================================
   Clínica Mais Saúde — Script de criação do schema (SQL Server / T-SQL)
   Artefato de Banco de Dados do PIM IV (rubrica 07).

   Estado final do modelo (equivalente às 22 migrations EF Core InitialCreate..Fase21).
   Ordem: tabelas de referência (lookup) -> identidade -> perfis -> operação.
   Comportamento de exclusão: NO ACTION (Restrict) por padrão; CASCADE/SET NULL
   apenas onde o registro filho não existe sem o pai (marcado em cada FK).

   Para gerar o script canônico/executável direto do modelo:
     dotnet ef migrations script --idempotent \
       --project ClinicaMaisSaude.Infrastructure --startup-project ClinicaMaisSaude.API
   ============================================================================ */

SET NOCOUNT ON;
-- Índices filtrados (ex.: ModeloPadrao = 1) exigem estas opções ligadas.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ------------------------------------------------------------------ */
/* 1. Tabelas de referência (lookup)                                  */
/* ------------------------------------------------------------------ */

CREATE TABLE EspecialidadeLookup (
    Id        INT           NOT NULL CONSTRAINT PK_EspecialidadeLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE RoleUsuarioLookup (
    Id        INT           NOT NULL CONSTRAINT PK_RoleUsuarioLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE SituacaoLookup (
    Id        INT           NOT NULL CONSTRAINT PK_SituacaoLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE StatusAgendamentoLookup (
    Id        INT           NOT NULL CONSTRAINT PK_StatusAgendamentoLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE StatusSolicitacaoLookup (
    Id        INT           NOT NULL CONSTRAINT PK_StatusSolicitacaoLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE TipoConsultaLookup (
    Id        INT           NOT NULL CONSTRAINT PK_TipoConsultaLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE TipoEventoHistoricoLookup (
    Id        INT           NOT NULL CONSTRAINT PK_TipoEventoHistoricoLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE TipoProfissionalLookup (
    Id        INT           NOT NULL CONSTRAINT PK_TipoProfissionalLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE TipoVerificacaoLookup (
    Id        INT           NOT NULL CONSTRAINT PK_TipoVerificacaoLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO
CREATE TABLE TipoViolacaoLookup (
    Id        INT           NOT NULL CONSTRAINT PK_TipoViolacaoLookup PRIMARY KEY,
    Nome      NVARCHAR(50)  NOT NULL,
    Dt_Criado DATETIME2     NOT NULL
);
GO

/* ------------------------------------------------------------------ */
/* 2. Identidade e credencial                                         */
/* ------------------------------------------------------------------ */

CREATE TABLE Pessoas (
    Id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Pessoas PRIMARY KEY,
    Nome           NVARCHAR(100)    NOT NULL,
    Cpf            VARCHAR(11)      NOT NULL,
    Email          NVARCHAR(150)    NOT NULL,
    Telefone       VARCHAR(11)      NULL,
    Dt_Criado      DATETIME2        NOT NULL,
    ult_Atualizacao DATETIME2       NULL
);
GO
CREATE UNIQUE INDEX IX_Pessoas_Cpf   ON Pessoas (Cpf);
CREATE UNIQUE INDEX IX_Pessoas_Email ON Pessoas (Email);
GO

CREATE TABLE LoginPortal (
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LoginPortal PRIMARY KEY,
    PessoaId        UNIQUEIDENTIFIER NULL,
    Role            INT              NOT NULL,
    SenhaHash       NVARCHAR(MAX)    NOT NULL,
    TentativasLogin INT              NOT NULL,
    BloqueadoAte    DATETIME2        NULL,
    BloqueadoIAAte  DATETIME2        NULL,
    UltimoAcesso    DATETIME2        NULL,
    Dt_Criado       DATETIME2        NOT NULL,
    ult_Atualizacao DATETIME2        NULL,
    CONSTRAINT FK_LoginPortal_Pessoas         FOREIGN KEY (PessoaId) REFERENCES Pessoas (Id)           ON DELETE NO ACTION,
    CONSTRAINT FK_LoginPortal_RoleUsuario     FOREIGN KEY (Role)     REFERENCES RoleUsuarioLookup (Id) ON DELETE NO ACTION
);
GO
CREATE INDEX IX_LoginPortal_PessoaId ON LoginPortal (PessoaId);
CREATE INDEX IX_LoginPortal_Role     ON LoginPortal (Role);
GO

CREATE TABLE UsuarioFotos (
    UsuarioId  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_UsuarioFotos PRIMARY KEY,
    FotoBase64 NVARCHAR(MAX)    NOT NULL,
    CONSTRAINT FK_UsuarioFotos_LoginPortal FOREIGN KEY (UsuarioId) REFERENCES LoginPortal (Id) ON DELETE CASCADE
);
GO

/* ------------------------------------------------------------------ */
/* 3. Perfis                                                          */
/* ------------------------------------------------------------------ */

CREATE TABLE Pacientes (
    Id                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Pacientes PRIMARY KEY,
    PessoaId           UNIQUEIDENTIFIER NULL,
    UsuarioId          UNIQUEIDENTIFIER NULL,
    Situacao           INT              NOT NULL CONSTRAINT DF_Pacientes_Situacao DEFAULT 1,
    TemProblemaMemoria BIT              NOT NULL CONSTRAINT DF_Pacientes_TemProblemaMemoria DEFAULT 0,
    Dt_Criado          DATETIME2        NOT NULL,
    ult_Atualizacao    DATETIME2        NULL,
    CONSTRAINT FK_Pacientes_Pessoas     FOREIGN KEY (PessoaId)  REFERENCES Pessoas (Id)        ON DELETE NO ACTION,
    CONSTRAINT FK_Pacientes_LoginPortal FOREIGN KEY (UsuarioId) REFERENCES LoginPortal (Id)    ON DELETE CASCADE,
    CONSTRAINT FK_Pacientes_Situacao    FOREIGN KEY (Situacao)  REFERENCES SituacaoLookup (Id) ON DELETE NO ACTION
);
GO
CREATE INDEX IX_Pacientes_PessoaId ON Pacientes (PessoaId);
CREATE INDEX IX_Pacientes_Situacao ON Pacientes (Situacao);
-- Vínculo 1:1 opcional com a conta: único quando informado (proponente em análise fica sem conta).
CREATE UNIQUE INDEX IX_Pacientes_UsuarioId ON Pacientes (UsuarioId) WHERE UsuarioId IS NOT NULL;
GO

CREATE TABLE Profissionais (
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Profissionais PRIMARY KEY,
    PessoaId        UNIQUEIDENTIFIER NULL,
    UsuarioId       UNIQUEIDENTIFIER NOT NULL,
    Situacao        INT              NOT NULL CONSTRAINT DF_Profissionais_Situacao DEFAULT 1,
    Crm             NVARCHAR(20)     NULL,
    UfCrm           NVARCHAR(2)      NULL,
    Dt_Criado       DATETIME2        NOT NULL,
    ult_Atualizacao DATETIME2        NULL,
    CONSTRAINT FK_Profissionais_Pessoas     FOREIGN KEY (PessoaId)  REFERENCES Pessoas (Id)        ON DELETE NO ACTION,
    CONSTRAINT FK_Profissionais_LoginPortal FOREIGN KEY (UsuarioId) REFERENCES LoginPortal (Id)    ON DELETE CASCADE,
    CONSTRAINT FK_Profissionais_Situacao    FOREIGN KEY (Situacao)  REFERENCES SituacaoLookup (Id) ON DELETE NO ACTION
);
GO
CREATE INDEX IX_Profissionais_PessoaId ON Profissionais (PessoaId);
CREATE INDEX IX_Profissionais_Situacao ON Profissionais (Situacao);
CREATE UNIQUE INDEX IX_Profissionais_UsuarioId ON Profissionais (UsuarioId);
GO

CREATE TABLE ProfissionalEspecialidades (
    ProfissionalId  UNIQUEIDENTIFIER NOT NULL,
    EspecialidadeId INT              NOT NULL,
    CONSTRAINT PK_ProfissionalEspecialidades PRIMARY KEY (ProfissionalId, EspecialidadeId),
    CONSTRAINT FK_ProfEsp_Profissional  FOREIGN KEY (ProfissionalId)  REFERENCES Profissionais (Id)        ON DELETE CASCADE,
    CONSTRAINT FK_ProfEsp_Especialidade FOREIGN KEY (EspecialidadeId) REFERENCES EspecialidadeLookup (Id)  ON DELETE NO ACTION
);
GO
CREATE INDEX IX_ProfissionalEspecialidades_EspecialidadeId ON ProfissionalEspecialidades (EspecialidadeId);
GO

/* ------------------------------------------------------------------ */
/* 4. Autenticação e segurança                                        */
/* ------------------------------------------------------------------ */

CREATE TABLE RefreshTokens (
    Id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RefreshTokens PRIMARY KEY,
    UsuarioId     UNIQUEIDENTIFIER NOT NULL,
    Token         NVARCHAR(255)    NOT NULL,
    JwtId         NVARCHAR(255)    NOT NULL,
    Usado         BIT              NOT NULL,
    Revogado      BIT              NOT NULL,
    Dt_Criado     DATETIME2        NOT NULL,
    Dt_Expiracao  DATETIME2        NOT NULL,
    CONSTRAINT FK_RefreshTokens_LoginPortal FOREIGN KEY (UsuarioId) REFERENCES LoginPortal (Id) ON DELETE CASCADE
);
GO
CREATE UNIQUE INDEX IX_RefreshTokens_Token     ON RefreshTokens (Token);
CREATE INDEX        IX_RefreshTokens_UsuarioId ON RefreshTokens (UsuarioId);
GO

CREATE TABLE UsoInadequadoIA (
    Id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_UsoInadequadoIA PRIMARY KEY,
    UsuarioId     UNIQUEIDENTIFIER NOT NULL,
    TipoViolacao  INT              NOT NULL,
    TextoInserido NVARCHAR(500)    NOT NULL,
    Dt_Criado     DATETIME2        NOT NULL,
    CONSTRAINT FK_UsoInadequadoIA_LoginPortal   FOREIGN KEY (UsuarioId)    REFERENCES LoginPortal (Id)        ON DELETE CASCADE,
    CONSTRAINT FK_UsoInadequadoIA_TipoViolacao  FOREIGN KEY (TipoViolacao) REFERENCES TipoViolacaoLookup (Id) ON DELETE NO ACTION
);
GO
CREATE INDEX IX_UsoInadequadoIA_TipoViolacao ON UsoInadequadoIA (TipoViolacao);
CREATE INDEX IX_UsoInadequadoIA_UsuarioId    ON UsoInadequadoIA (UsuarioId);
GO

/* ------------------------------------------------------------------ */
/* 5. Agendamento e histórico                                         */
/* ------------------------------------------------------------------ */

CREATE TABLE Agendamentos (
    Id                       UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Agendamentos PRIMARY KEY,
    PacienteId               UNIQUEIDENTIFIER NOT NULL,
    ProfissionalId           UNIQUEIDENTIFIER NOT NULL,
    AgendamentoOrigemId      UNIQUEIDENTIFIER NULL,
    EspecialidadeId          INT              NULL,
    Status                   INT              NOT NULL,
    TipoConsulta             INT              NOT NULL,
    TipoProfissional         INT              NOT NULL,
    DataHoraConsulta         DATETIME2        NOT NULL,
    ProbabilidadeFalta       FLOAT            NOT NULL,
    ExigeResultadoPosterior  BIT              NOT NULL,
    ResultadoDisponivel      BIT              NOT NULL,
    ResultadoRetirado        BIT              NOT NULL,
    LembreteManhaEnviado     BIT              NOT NULL CONSTRAINT DF_Agend_LembreteManha DEFAULT 0,
    LembreteDuasHorasEnviado BIT              NOT NULL CONSTRAINT DF_Agend_LembreteDuasHoras DEFAULT 0,
    NotificacaoPendenteGerada BIT             NOT NULL CONSTRAINT DF_Agend_NotifPendente DEFAULT 0,
    RowVersion               ROWVERSION       NOT NULL,
    Dt_Criado                DATETIME2        NOT NULL,
    ult_Atualizacao          DATETIME2        NULL,
    CONSTRAINT FK_Agend_Paciente         FOREIGN KEY (PacienteId)          REFERENCES Pacientes (Id)               ON DELETE NO ACTION,
    CONSTRAINT FK_Agend_Profissional     FOREIGN KEY (ProfissionalId)      REFERENCES Profissionais (Id)           ON DELETE NO ACTION,
    CONSTRAINT FK_Agend_Origem           FOREIGN KEY (AgendamentoOrigemId) REFERENCES Agendamentos (Id)            ON DELETE NO ACTION,
    CONSTRAINT FK_Agend_Especialidade    FOREIGN KEY (EspecialidadeId)     REFERENCES EspecialidadeLookup (Id)     ON DELETE NO ACTION,
    CONSTRAINT FK_Agend_Status           FOREIGN KEY (Status)              REFERENCES StatusAgendamentoLookup (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Agend_TipoConsulta     FOREIGN KEY (TipoConsulta)        REFERENCES TipoConsultaLookup (Id)      ON DELETE NO ACTION,
    CONSTRAINT FK_Agend_TipoProfissional FOREIGN KEY (TipoProfissional)    REFERENCES TipoProfissionalLookup (Id)  ON DELETE NO ACTION
);
GO
CREATE INDEX IX_Agend_AgendamentoOrigemId ON Agendamentos (AgendamentoOrigemId);
CREATE INDEX IX_Agend_EspecialidadeId     ON Agendamentos (EspecialidadeId);
CREATE INDEX IX_Agend_TipoConsulta        ON Agendamentos (TipoConsulta);
CREATE INDEX IX_Agend_TipoProfissional    ON Agendamentos (TipoProfissional);
CREATE INDEX IX_Agend_Paciente_Data       ON Agendamentos (PacienteId, DataHoraConsulta);
CREATE INDEX IX_Agend_Profissional_Data   ON Agendamentos (ProfissionalId, DataHoraConsulta);
CREATE INDEX IX_Agend_Status_Data         ON Agendamentos (Status, DataHoraConsulta);
GO

CREATE TABLE AgendamentoHistoricos (
    Id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AgendamentoHistoricos PRIMARY KEY,
    AgendamentoId  UNIQUEIDENTIFIER NOT NULL,
    TipoEvento     INT              NOT NULL,
    StatusAnterior INT              NULL,
    StatusNovo     INT              NULL,
    DataAnterior   DATETIME2        NULL,
    DataNova       DATETIME2        NULL,
    RealizadoPor   UNIQUEIDENTIFIER NOT NULL,
    Observacao     NVARCHAR(MAX)    NULL,
    Dt_Criado      DATETIME2        NOT NULL,
    CONSTRAINT FK_Hist_Agendamento    FOREIGN KEY (AgendamentoId)  REFERENCES Agendamentos (Id)            ON DELETE NO ACTION,
    CONSTRAINT FK_Hist_StatusAnterior FOREIGN KEY (StatusAnterior) REFERENCES StatusAgendamentoLookup (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Hist_StatusNovo     FOREIGN KEY (StatusNovo)     REFERENCES StatusAgendamentoLookup (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Hist_TipoEvento     FOREIGN KEY (TipoEvento)     REFERENCES TipoEventoHistoricoLookup (Id) ON DELETE NO ACTION
);
GO
CREATE INDEX IX_Hist_AgendamentoId  ON AgendamentoHistoricos (AgendamentoId);
CREATE INDEX IX_Hist_StatusAnterior ON AgendamentoHistoricos (StatusAnterior);
CREATE INDEX IX_Hist_StatusNovo     ON AgendamentoHistoricos (StatusNovo);
CREATE INDEX IX_Hist_TipoEvento     ON AgendamentoHistoricos (TipoEvento);
GO

CREATE TABLE Notificacoes (
    Id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Notificacoes PRIMARY KEY,
    UsuarioId     UNIQUEIDENTIFIER NOT NULL,
    AgendamentoId UNIQUEIDENTIFIER NULL,
    Titulo        NVARCHAR(150)    NOT NULL,
    Mensagem      NVARCHAR(500)    NOT NULL,
    Link          NVARCHAR(255)    NULL,
    Lida          BIT              NOT NULL CONSTRAINT DF_Notificacoes_Lida DEFAULT 0,
    Dt_Criado     DATETIME2        NOT NULL,
    CONSTRAINT FK_Notif_LoginPortal FOREIGN KEY (UsuarioId)     REFERENCES LoginPortal (Id)  ON DELETE CASCADE,
    CONSTRAINT FK_Notif_Agendamento FOREIGN KEY (AgendamentoId) REFERENCES Agendamentos (Id) ON DELETE SET NULL
);
GO
CREATE INDEX IX_Notif_AgendamentoId    ON Notificacoes (AgendamentoId);
CREATE INDEX IX_Notif_Usuario_DtCriado ON Notificacoes (UsuarioId, Dt_Criado);
GO

/* ------------------------------------------------------------------ */
/* 6. Auto-cadastro moderado (Declaração de Saúde)                    */
/* ------------------------------------------------------------------ */

CREATE TABLE ModelosDeclaracaoSaude (
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ModelosDeclaracaoSaude PRIMARY KEY,
    Nome            NVARCHAR(150)    NOT NULL,
    ModeloPadrao    BIT              NOT NULL CONSTRAINT DF_Modelo_Padrao DEFAULT 0,
    Dt_Criado       DATETIME2        NOT NULL,
    ult_Atualizacao DATETIME2        NULL
);
GO
-- No máximo um modelo vigente por vez.
CREATE UNIQUE INDEX IX_Modelo_Padrao_Unico ON ModelosDeclaracaoSaude (ModeloPadrao) WHERE ModeloPadrao = 1;
GO

CREATE TABLE PerguntasDeclaracaoSaude (
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PerguntasDeclaracaoSaude PRIMARY KEY,
    ModeloId        UNIQUEIDENTIFIER NOT NULL,
    Pergunta        NVARCHAR(500)    NOT NULL,
    Ordem           INT              NOT NULL,
    Dt_Criado       DATETIME2        NOT NULL,
    ult_Atualizacao DATETIME2        NULL,
    CONSTRAINT FK_Pergunta_Modelo FOREIGN KEY (ModeloId) REFERENCES ModelosDeclaracaoSaude (Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_Pergunta_Modelo_Ordem ON PerguntasDeclaracaoSaude (ModeloId, Ordem);
GO

CREATE TABLE SolicitacoesCadastro (
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SolicitacoesCadastro PRIMARY KEY,
    PessoaId        UNIQUEIDENTIFIER NOT NULL,
    ModeloId        UNIQUEIDENTIFIER NOT NULL,
    Status          INT              NOT NULL CONSTRAINT DF_Solicitacao_Status DEFAULT 1,
    TermosAceitosEm DATETIME2        NULL,
    TermosVersao    NVARCHAR(20)     NULL,
    MotivoRecusa    NVARCHAR(1000)   NULL,
    Dt_Criado       DATETIME2        NOT NULL,
    ult_Atualizacao DATETIME2        NULL,
    CONSTRAINT FK_Solicitacao_Pessoa FOREIGN KEY (PessoaId) REFERENCES Pessoas (Id)                 ON DELETE NO ACTION,
    CONSTRAINT FK_Solicitacao_Modelo FOREIGN KEY (ModeloId) REFERENCES ModelosDeclaracaoSaude (Id)  ON DELETE NO ACTION,
    CONSTRAINT FK_Solicitacao_Status FOREIGN KEY (Status)   REFERENCES StatusSolicitacaoLookup (Id) ON DELETE NO ACTION
);
GO
CREATE INDEX IX_Solicitacao_ModeloId ON SolicitacoesCadastro (ModeloId);
CREATE INDEX IX_Solicitacao_PessoaId ON SolicitacoesCadastro (PessoaId);
CREATE INDEX IX_Solicitacao_Status   ON SolicitacoesCadastro (Status);
GO

CREATE TABLE RespostasDeclaracaoSaude (
    Id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RespostasDeclaracaoSaude PRIMARY KEY,
    SolicitacaoId UNIQUEIDENTIFIER NOT NULL,
    PerguntaId    UNIQUEIDENTIFIER NOT NULL,
    Resposta      BIT              NOT NULL,
    Detalhe       NVARCHAR(1000)   NULL,
    Dt_Criado     DATETIME2        NOT NULL,
    CONSTRAINT FK_Resposta_Solicitacao FOREIGN KEY (SolicitacaoId) REFERENCES SolicitacoesCadastro (Id)     ON DELETE CASCADE,
    CONSTRAINT FK_Resposta_Pergunta    FOREIGN KEY (PerguntaId)    REFERENCES PerguntasDeclaracaoSaude (Id) ON DELETE NO ACTION
);
GO
CREATE INDEX IX_Resposta_PerguntaId ON RespostasDeclaracaoSaude (PerguntaId);
-- Uma única resposta por pergunta dentro de uma solicitação.
CREATE UNIQUE INDEX IX_Resposta_Solicitacao_Pergunta ON RespostasDeclaracaoSaude (SolicitacaoId, PerguntaId);
GO

/* ------------------------------------------------------------------ */
/* 7. Códigos de verificação (unificados: recuperação/1º acesso/e-mail)*/
/* ------------------------------------------------------------------ */

CREATE TABLE CodigosVerificacao (
    Id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CodigosVerificacao PRIMARY KEY,
    Tipo                INT              NOT NULL,
    Email               NVARCHAR(150)    NOT NULL,
    UsuarioId           UNIQUEIDENTIFIER NULL,
    PessoaId            UNIQUEIDENTIFIER NULL,
    SolicitacaoId       UNIQUEIDENTIFIER NULL,
    CodigoHash          NVARCHAR(64)     NOT NULL,
    ResetTokenHash      NVARCHAR(64)     NULL,
    Tentativas          INT              NOT NULL,
    Usado               BIT              NOT NULL,
    Dt_Criado           DATETIME2        NOT NULL,
    Dt_Expiracao        DATETIME2        NOT NULL,
    Dt_Expiracao_Reset  DATETIME2        NULL,
    CONSTRAINT FK_Codigo_Tipo        FOREIGN KEY (Tipo)          REFERENCES TipoVerificacaoLookup (Id)  ON DELETE NO ACTION,
    CONSTRAINT FK_Codigo_LoginPortal FOREIGN KEY (UsuarioId)     REFERENCES LoginPortal (Id)            ON DELETE NO ACTION,
    CONSTRAINT FK_Codigo_Pessoa      FOREIGN KEY (PessoaId)      REFERENCES Pessoas (Id)                ON DELETE NO ACTION,
    CONSTRAINT FK_Codigo_Solicitacao FOREIGN KEY (SolicitacaoId) REFERENCES SolicitacoesCadastro (Id)   ON DELETE NO ACTION
);
GO
CREATE INDEX IX_Codigo_PessoaId       ON CodigosVerificacao (PessoaId);
CREATE INDEX IX_Codigo_ResetTokenHash ON CodigosVerificacao (ResetTokenHash);
CREATE INDEX IX_Codigo_SolicitacaoId  ON CodigosVerificacao (SolicitacaoId);
CREATE INDEX IX_Codigo_UsuarioId      ON CodigosVerificacao (UsuarioId);
CREATE INDEX IX_Codigo_Tipo_Email     ON CodigosVerificacao (Tipo, Email);
CREATE INDEX IX_Codigo_Tipo_PessoaId  ON CodigosVerificacao (Tipo, PessoaId);
CREATE INDEX IX_Codigo_Tipo_UsuarioId ON CodigosVerificacao (Tipo, UsuarioId);
GO

/* ------------------------------------------------------------------ */
/* 8. Seed das tabelas de referência                                  */
/* ------------------------------------------------------------------ */
DECLARE @seed DATETIME2 = '2026-01-01T00:00:00';

INSERT INTO RoleUsuarioLookup (Id, Nome, Dt_Criado) VALUES
    (1,'Paciente',@seed),(2,'Admin',@seed),(3,'Medico',@seed),(4,'Enfermeira',@seed);

INSERT INTO SituacaoLookup (Id, Nome, Dt_Criado) VALUES
    (1,'Ativo',@seed),(2,'Inativo',@seed),(3,'Excluido',@seed),(4,'Banido',@seed),(5,'EmAnalise',@seed);

INSERT INTO StatusAgendamentoLookup (Id, Nome, Dt_Criado) VALUES
    (0,'Agendado',@seed),(1,'EmAtendimento',@seed),(2,'AguardandoRetorno',@seed),
    (3,'RetornoAgendado',@seed),(4,'Finalizado',@seed),(5,'Faltou',@seed),(6,'Cancelado',@seed);

INSERT INTO StatusSolicitacaoLookup (Id, Nome, Dt_Criado) VALUES
    (1,'EmAnalise',@seed),(2,'Aprovada',@seed),(3,'Recusada',@seed);

INSERT INTO TipoConsultaLookup (Id, Nome, Dt_Criado) VALUES
    (0,'Triagem',@seed),(1,'Exame',@seed),(2,'Vacina',@seed),(3,'ConsultaMedica',@seed),(4,'Retorno',@seed);

INSERT INTO TipoEventoHistoricoLookup (Id, Nome, Dt_Criado) VALUES
    (1,'Criacao',@seed),(2,'MudancaStatus',@seed),(3,'Remarcacao',@seed),(4,'Cancelamento',@seed);

INSERT INTO TipoProfissionalLookup (Id, Nome, Dt_Criado) VALUES
    (0,'Enfermeira',@seed),(1,'Medico',@seed);

INSERT INTO TipoVerificacaoLookup (Id, Nome, Dt_Criado) VALUES
    (1,'RecuperacaoSenha',@seed),(2,'PrimeiroAcesso',@seed),(3,'VerificacaoEmail',@seed);

INSERT INTO TipoViolacaoLookup (Id, Nome, Dt_Criado) VALUES
    (1,'Injecao',@seed),(2,'UsoIndevido',@seed);

INSERT INTO EspecialidadeLookup (Id, Nome, Dt_Criado) VALUES
    (0,'ClinicaGeral',@seed),(1,'MedicinaDeFamilia',@seed),(2,'Pediatria',@seed),
    (3,'GinecologiaEObstetricia',@seed),(4,'Cardiologia',@seed),(5,'Dermatologia',@seed),
    (6,'Endocrinologia',@seed),(7,'Gastroenterologia',@seed),(8,'Neurologia',@seed),
    (9,'OrtopediaETraumatologia',@seed),(10,'Psiquiatria',@seed),(11,'Otorrinolaringologia',@seed),
    (12,'Oftalmologia',@seed),(13,'Urologia',@seed),(14,'Pneumologia',@seed),
    (15,'Reumatologia',@seed),(16,'Geriatria',@seed),(17,'MedicinaEsportiva',@seed);
GO
