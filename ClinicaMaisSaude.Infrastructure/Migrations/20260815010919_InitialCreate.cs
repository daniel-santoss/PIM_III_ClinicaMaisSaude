using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LoginPortal",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Cpf = table.Column<string>(type: "varchar(11)", nullable: false),
                    SenhaHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsAdmin = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UltimoAcesso = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TentativasLogin = table.Column<int>(type: "int", nullable: false),
                    BloqueadoAte = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoginPortal", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StatusAgendamentoLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusAgendamentoLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Pacientes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Cpf = table.Column<string>(type: "varchar(11)", nullable: false),
                    Telefone = table.Column<string>(type: "varchar(11)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Ativo = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    TemProblemaMemoria = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BloqueadoIAAte = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PenalidadeRemovidaAvisar = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pacientes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pacientes_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Profissionais",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoProfissional = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Crm = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UfCrm = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: true),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Profissionais", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Profissionais_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    JwtId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    IsUsed = table.Column<bool>(type: "bit", nullable: false),
                    IsRevoked = table.Column<bool>(type: "bit", nullable: false),
                    AddedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsoInadequadoIA",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoViolacao = table.Column<int>(type: "int", nullable: false),
                    TextoInserido = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsoInadequadoIA", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsoInadequadoIA_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsuarioFotos",
                columns: table => new
                {
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FotoBase64 = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioFotos", x => x.UsuarioId);
                    table.ForeignKey(
                        name: "FK_UsuarioFotos_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Agendamentos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DataHoraConsulta = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PacienteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfissionalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoProfissional = table.Column<int>(type: "int", nullable: false),
                    TipoConsulta = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AgendamentoOrigemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EspecialidadeId = table.Column<int>(type: "int", nullable: true),
                    ProbabilidadeFalta = table.Column<double>(type: "float", nullable: false),
                    ResultadoDisponivel = table.Column<bool>(type: "bit", nullable: false),
                    ExigeResultadoPosterior = table.Column<bool>(type: "bit", nullable: false),
                    ResultadoRetirado = table.Column<bool>(type: "bit", nullable: false),
                    NotificacaoPendenteGerada = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LembreteManhaEnviado = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LembreteDuasHorasEnviado = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agendamentos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Agendamentos_Pacientes_PacienteId",
                        column: x => x.PacienteId,
                        principalTable: "Pacientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProfissionalEspecialidades",
                columns: table => new
                {
                    ProfissionalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EspecialidadeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfissionalEspecialidades", x => new { x.ProfissionalId, x.EspecialidadeId });
                    table.ForeignKey(
                        name: "FK_ProfissionalEspecialidades_Profissionais_ProfissionalId",
                        column: x => x.ProfissionalId,
                        principalTable: "Profissionais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AgendamentoHistoricos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AgendamentoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoEvento = table.Column<int>(type: "int", nullable: false),
                    StatusAnterior = table.Column<int>(type: "int", nullable: true),
                    StatusNovo = table.Column<int>(type: "int", nullable: true),
                    DataAnterior = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DataNova = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Observacao = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RealizadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgendamentoHistoricos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgendamentoHistoricos_Agendamentos_AgendamentoId",
                        column: x => x.AgendamentoId,
                        principalTable: "Agendamentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Notificacoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Titulo = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Mensagem = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AgendamentoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Link = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Lida = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notificacoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notificacoes_Agendamentos_AgendamentoId",
                        column: x => x.AgendamentoId,
                        principalTable: "Agendamentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Notificacoes_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "StatusAgendamentoLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 0, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Agendado" },
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "EmAtendimento" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "AguardandoRetorno" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "RetornoAgendado" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Finalizado" },
                    { 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Faltou" },
                    { 6, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Cancelado" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgendamentoHistoricos_AgendamentoId",
                table: "AgendamentoHistoricos",
                column: "AgendamentoId");

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_PacienteId_DataHoraConsulta",
                table: "Agendamentos",
                columns: new[] { "PacienteId", "DataHoraConsulta" });

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_ProfissionalId_DataHoraConsulta",
                table: "Agendamentos",
                columns: new[] { "ProfissionalId", "DataHoraConsulta" });

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_Status_DataHoraConsulta",
                table: "Agendamentos",
                columns: new[] { "Status", "DataHoraConsulta" });

            migrationBuilder.CreateIndex(
                name: "IX_LoginPortal_Cpf",
                table: "LoginPortal",
                column: "Cpf",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoginPortal_Email",
                table: "LoginPortal",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_AgendamentoId",
                table: "Notificacoes",
                column: "AgendamentoId");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId_Dt_Criado",
                table: "Notificacoes",
                columns: new[] { "UsuarioId", "Dt_Criado" });

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_Cpf",
                table: "Pacientes",
                column: "Cpf",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_UsuarioId",
                table: "Profissionais",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UsuarioId",
                table: "RefreshTokens",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_UsoInadequadoIA_UsuarioId",
                table: "UsoInadequadoIA",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgendamentoHistoricos");

            migrationBuilder.DropTable(
                name: "Notificacoes");

            migrationBuilder.DropTable(
                name: "ProfissionalEspecialidades");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "StatusAgendamentoLookup");

            migrationBuilder.DropTable(
                name: "UsoInadequadoIA");

            migrationBuilder.DropTable(
                name: "UsuarioFotos");

            migrationBuilder.DropTable(
                name: "Agendamentos");

            migrationBuilder.DropTable(
                name: "Profissionais");

            migrationBuilder.DropTable(
                name: "Pacientes");

            migrationBuilder.DropTable(
                name: "LoginPortal");
        }
    }
}
