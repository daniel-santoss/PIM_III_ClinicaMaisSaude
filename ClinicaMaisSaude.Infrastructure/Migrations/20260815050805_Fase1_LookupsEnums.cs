using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase1_LookupsEnums : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EspecialidadeLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EspecialidadeLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TipoConsultaLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoConsultaLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TipoEventoHistoricoLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoEventoHistoricoLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TipoProfissionalLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoProfissionalLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TipoViolacaoLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoViolacaoLookup", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "EspecialidadeLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 0, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "ClinicaGeral" },
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "MedicinaDeFamilia" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Pediatria" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "GinecologiaEObstetricia" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Cardiologia" },
                    { 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Dermatologia" },
                    { 6, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Endocrinologia" },
                    { 7, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Gastroenterologia" },
                    { 8, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Neurologia" },
                    { 9, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "OrtopediaETraumatologia" },
                    { 10, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Psiquiatria" },
                    { 11, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Otorrinolaringologia" },
                    { 12, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Oftalmologia" },
                    { 13, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Urologia" },
                    { 14, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Pneumologia" },
                    { 15, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Reumatologia" },
                    { 16, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Geriatria" },
                    { 17, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "MedicinaEsportiva" }
                });

            migrationBuilder.InsertData(
                table: "TipoConsultaLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 0, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Triagem" },
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Exame" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Vacina" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "ConsultaMedica" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Retorno" }
                });

            migrationBuilder.InsertData(
                table: "TipoEventoHistoricoLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Criacao" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "MudancaStatus" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Remarcacao" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Cancelamento" }
                });

            migrationBuilder.InsertData(
                table: "TipoProfissionalLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 0, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Enfermeira" },
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Medico" }
                });

            migrationBuilder.InsertData(
                table: "TipoViolacaoLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Injecao" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "UsoIndevido" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_UsoInadequadoIA_TipoViolacao",
                table: "UsoInadequadoIA",
                column: "TipoViolacao");

            migrationBuilder.CreateIndex(
                name: "IX_ProfissionalEspecialidades_EspecialidadeId",
                table: "ProfissionalEspecialidades",
                column: "EspecialidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_TipoProfissional",
                table: "Profissionais",
                column: "TipoProfissional");

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_TipoConsulta",
                table: "Agendamentos",
                column: "TipoConsulta");

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_TipoProfissional",
                table: "Agendamentos",
                column: "TipoProfissional");

            migrationBuilder.CreateIndex(
                name: "IX_AgendamentoHistoricos_StatusAnterior",
                table: "AgendamentoHistoricos",
                column: "StatusAnterior");

            migrationBuilder.CreateIndex(
                name: "IX_AgendamentoHistoricos_StatusNovo",
                table: "AgendamentoHistoricos",
                column: "StatusNovo");

            migrationBuilder.CreateIndex(
                name: "IX_AgendamentoHistoricos_TipoEvento",
                table: "AgendamentoHistoricos",
                column: "TipoEvento");

            migrationBuilder.AddForeignKey(
                name: "FK_AgendamentoHistoricos_StatusAgendamentoLookup_StatusAnterior",
                table: "AgendamentoHistoricos",
                column: "StatusAnterior",
                principalTable: "StatusAgendamentoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AgendamentoHistoricos_StatusAgendamentoLookup_StatusNovo",
                table: "AgendamentoHistoricos",
                column: "StatusNovo",
                principalTable: "StatusAgendamentoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AgendamentoHistoricos_TipoEventoHistoricoLookup_TipoEvento",
                table: "AgendamentoHistoricos",
                column: "TipoEvento",
                principalTable: "TipoEventoHistoricoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_StatusAgendamentoLookup_Status",
                table: "Agendamentos",
                column: "Status",
                principalTable: "StatusAgendamentoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_TipoConsultaLookup_TipoConsulta",
                table: "Agendamentos",
                column: "TipoConsulta",
                principalTable: "TipoConsultaLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_TipoProfissionalLookup_TipoProfissional",
                table: "Agendamentos",
                column: "TipoProfissional",
                principalTable: "TipoProfissionalLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_TipoProfissionalLookup_TipoProfissional",
                table: "Profissionais",
                column: "TipoProfissional",
                principalTable: "TipoProfissionalLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProfissionalEspecialidades_EspecialidadeLookup_EspecialidadeId",
                table: "ProfissionalEspecialidades",
                column: "EspecialidadeId",
                principalTable: "EspecialidadeLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UsoInadequadoIA_TipoViolacaoLookup_TipoViolacao",
                table: "UsoInadequadoIA",
                column: "TipoViolacao",
                principalTable: "TipoViolacaoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AgendamentoHistoricos_StatusAgendamentoLookup_StatusAnterior",
                table: "AgendamentoHistoricos");

            migrationBuilder.DropForeignKey(
                name: "FK_AgendamentoHistoricos_StatusAgendamentoLookup_StatusNovo",
                table: "AgendamentoHistoricos");

            migrationBuilder.DropForeignKey(
                name: "FK_AgendamentoHistoricos_TipoEventoHistoricoLookup_TipoEvento",
                table: "AgendamentoHistoricos");

            migrationBuilder.DropForeignKey(
                name: "FK_Agendamentos_StatusAgendamentoLookup_Status",
                table: "Agendamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Agendamentos_TipoConsultaLookup_TipoConsulta",
                table: "Agendamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Agendamentos_TipoProfissionalLookup_TipoProfissional",
                table: "Agendamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_TipoProfissionalLookup_TipoProfissional",
                table: "Profissionais");

            migrationBuilder.DropForeignKey(
                name: "FK_ProfissionalEspecialidades_EspecialidadeLookup_EspecialidadeId",
                table: "ProfissionalEspecialidades");

            migrationBuilder.DropForeignKey(
                name: "FK_UsoInadequadoIA_TipoViolacaoLookup_TipoViolacao",
                table: "UsoInadequadoIA");

            migrationBuilder.DropTable(
                name: "EspecialidadeLookup");

            migrationBuilder.DropTable(
                name: "TipoConsultaLookup");

            migrationBuilder.DropTable(
                name: "TipoEventoHistoricoLookup");

            migrationBuilder.DropTable(
                name: "TipoProfissionalLookup");

            migrationBuilder.DropTable(
                name: "TipoViolacaoLookup");

            migrationBuilder.DropIndex(
                name: "IX_UsoInadequadoIA_TipoViolacao",
                table: "UsoInadequadoIA");

            migrationBuilder.DropIndex(
                name: "IX_ProfissionalEspecialidades_EspecialidadeId",
                table: "ProfissionalEspecialidades");

            migrationBuilder.DropIndex(
                name: "IX_Profissionais_TipoProfissional",
                table: "Profissionais");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_TipoConsulta",
                table: "Agendamentos");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_TipoProfissional",
                table: "Agendamentos");

            migrationBuilder.DropIndex(
                name: "IX_AgendamentoHistoricos_StatusAnterior",
                table: "AgendamentoHistoricos");

            migrationBuilder.DropIndex(
                name: "IX_AgendamentoHistoricos_StatusNovo",
                table: "AgendamentoHistoricos");

            migrationBuilder.DropIndex(
                name: "IX_AgendamentoHistoricos_TipoEvento",
                table: "AgendamentoHistoricos");
        }
    }
}
