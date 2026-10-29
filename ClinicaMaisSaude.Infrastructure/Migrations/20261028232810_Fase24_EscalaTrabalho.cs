using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase24_EscalaTrabalho : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Escala",
                table: "Profissionais",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "AusenciasProfissional",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProfissionalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Data = table.Column<DateTime>(type: "date", nullable: false),
                    Motivo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RegistradoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AusenciasProfissional", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AusenciasProfissional_LoginPortal_RegistradoPor",
                        column: x => x.RegistradoPor,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AusenciasProfissional_Profissionais_ProfissionalId",
                        column: x => x.ProfissionalId,
                        principalTable: "Profissionais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EscalaTrabalhoLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EscalaTrabalhoLookup", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "EscalaTrabalhoLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Escala1" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Escala2" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_Escala",
                table: "Profissionais",
                column: "Escala");

            migrationBuilder.CreateIndex(
                name: "IX_AusenciasProfissional_Data",
                table: "AusenciasProfissional",
                column: "Data");

            migrationBuilder.CreateIndex(
                name: "IX_AusenciasProfissional_ProfissionalId_Data",
                table: "AusenciasProfissional",
                columns: new[] { "ProfissionalId", "Data" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AusenciasProfissional_RegistradoPor",
                table: "AusenciasProfissional",
                column: "RegistradoPor");

            // Backfill: os profissionais já cadastrados entram todos na Escala 1 (default da coluna).
            // Para nenhum dia ficar sem atendimento, alterna-os entre as duas escalas dentro de cada
            // papel (médicos e enfermeiras), pela ordem de cadastro. O admin ajusta depois na tela.
            migrationBuilder.Sql(@"
WITH Ordenados AS (
    SELECT p.Escala, ROW_NUMBER() OVER (PARTITION BY u.Role ORDER BY p.Dt_Criado, p.Id) AS Ordem
    FROM Profissionais p
    INNER JOIN LoginPortal u ON u.Id = p.UsuarioId
)
UPDATE Ordenados SET Escala = CASE WHEN Ordem % 2 = 1 THEN 1 ELSE 2 END;");

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_EscalaTrabalhoLookup_Escala",
                table: "Profissionais",
                column: "Escala",
                principalTable: "EscalaTrabalhoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_EscalaTrabalhoLookup_Escala",
                table: "Profissionais");

            migrationBuilder.DropTable(
                name: "AusenciasProfissional");

            migrationBuilder.DropTable(
                name: "EscalaTrabalhoLookup");

            migrationBuilder.DropIndex(
                name: "IX_Profissionais_Escala",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "Escala",
                table: "Profissionais");
        }
    }
}
