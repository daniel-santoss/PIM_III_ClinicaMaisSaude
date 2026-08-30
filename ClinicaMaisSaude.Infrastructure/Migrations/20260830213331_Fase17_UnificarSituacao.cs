using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase17_UnificarSituacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_SituacaoClienteLookup_SituacaoCliente",
                table: "Pacientes");

            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_SituacaoProfissionalLookup_SituacaoProfissional",
                table: "Profissionais");

            migrationBuilder.DropTable(
                name: "SituacaoClienteLookup");

            migrationBuilder.DropTable(
                name: "SituacaoProfissionalLookup");

            migrationBuilder.RenameColumn(
                name: "SituacaoProfissional",
                table: "Profissionais",
                newName: "Situacao");

            migrationBuilder.RenameIndex(
                name: "IX_Profissionais_SituacaoProfissional",
                table: "Profissionais",
                newName: "IX_Profissionais_Situacao");

            migrationBuilder.RenameColumn(
                name: "SituacaoCliente",
                table: "Pacientes",
                newName: "Situacao");

            migrationBuilder.RenameIndex(
                name: "IX_Pacientes_SituacaoCliente",
                table: "Pacientes",
                newName: "IX_Pacientes_Situacao");

            migrationBuilder.CreateTable(
                name: "SituacaoLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SituacaoLookup", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "SituacaoLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ativo" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Inativo" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Excluido" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Banido" },
                    { 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "EmAnalise" }
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_SituacaoLookup_Situacao",
                table: "Pacientes",
                column: "Situacao",
                principalTable: "SituacaoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_SituacaoLookup_Situacao",
                table: "Profissionais",
                column: "Situacao",
                principalTable: "SituacaoLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_SituacaoLookup_Situacao",
                table: "Pacientes");

            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_SituacaoLookup_Situacao",
                table: "Profissionais");

            migrationBuilder.DropTable(
                name: "SituacaoLookup");

            migrationBuilder.RenameColumn(
                name: "Situacao",
                table: "Profissionais",
                newName: "SituacaoProfissional");

            migrationBuilder.RenameIndex(
                name: "IX_Profissionais_Situacao",
                table: "Profissionais",
                newName: "IX_Profissionais_SituacaoProfissional");

            migrationBuilder.RenameColumn(
                name: "Situacao",
                table: "Pacientes",
                newName: "SituacaoCliente");

            migrationBuilder.RenameIndex(
                name: "IX_Pacientes_Situacao",
                table: "Pacientes",
                newName: "IX_Pacientes_SituacaoCliente");

            migrationBuilder.CreateTable(
                name: "SituacaoClienteLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SituacaoClienteLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SituacaoProfissionalLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SituacaoProfissionalLookup", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "SituacaoClienteLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ativo" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Desativado" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Excluido" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Banido" }
                });

            migrationBuilder.InsertData(
                table: "SituacaoProfissionalLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ativo" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Inativo" }
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_SituacaoClienteLookup_SituacaoCliente",
                table: "Pacientes",
                column: "SituacaoCliente",
                principalTable: "SituacaoClienteLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_SituacaoProfissionalLookup_SituacaoProfissional",
                table: "Profissionais",
                column: "SituacaoProfissional",
                principalTable: "SituacaoProfissionalLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
