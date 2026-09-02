using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase10_SituacaoProfissional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SituacaoProfissional",
                table: "Profissionais",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "SituacaoProfissionalLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SituacaoProfissionalLookup", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "SituacaoProfissionalLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ativo" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Inativo" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_SituacaoProfissional",
                table: "Profissionais",
                column: "SituacaoProfissional");

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_SituacaoProfissionalLookup_SituacaoProfissional",
                table: "Profissionais",
                column: "SituacaoProfissional",
                principalTable: "SituacaoProfissionalLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_SituacaoProfissionalLookup_SituacaoProfissional",
                table: "Profissionais");

            migrationBuilder.DropTable(
                name: "SituacaoProfissionalLookup");

            migrationBuilder.DropIndex(
                name: "IX_Profissionais_SituacaoProfissional",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "SituacaoProfissional",
                table: "Profissionais");
        }
    }
}
