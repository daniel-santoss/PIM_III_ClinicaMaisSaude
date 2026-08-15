using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase4_SituacaoCliente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Lookup de situação + seed (precisa existir antes do FK).
            migrationBuilder.CreateTable(
                name: "SituacaoClienteLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SituacaoClienteLookup", x => x.Id);
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

            // 2. Coluna nova com default Ativo (valor válido para o FK).
            migrationBuilder.AddColumn<int>(
                name: "SituacaoCliente",
                table: "Pacientes",
                type: "int",
                nullable: false,
                defaultValue: 1);

            // 3. Backfill a partir do antigo bool Ativo (e do hack de ban +100 anos no LoginPortal):
            //    ban permanente -> Banido(4); Ativo=1 -> Ativo(1); inativo legado -> Excluido(3).
            migrationBuilder.Sql(@"
                UPDATE p SET SituacaoCliente =
                    CASE
                        WHEN u.BloqueadoAte IS NOT NULL AND DATEDIFF(day, GETUTCDATE(), u.BloqueadoAte) > 3650 THEN 4
                        WHEN p.Ativo = 1 THEN 1
                        ELSE 3
                    END
                FROM [Pacientes] p
                JOIN [LoginPortal] u ON u.Id = p.UsuarioId;");

            // 4. Só agora remove a coluna antiga.
            migrationBuilder.DropColumn(
                name: "Ativo",
                table: "Pacientes");

            // 5. Índice + FK (dados já consistentes com o lookup).
            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_SituacaoCliente",
                table: "Pacientes",
                column: "SituacaoCliente");

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_SituacaoClienteLookup_SituacaoCliente",
                table: "Pacientes",
                column: "SituacaoCliente",
                principalTable: "SituacaoClienteLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_SituacaoClienteLookup_SituacaoCliente",
                table: "Pacientes");

            migrationBuilder.DropTable(
                name: "SituacaoClienteLookup");

            migrationBuilder.DropIndex(
                name: "IX_Pacientes_SituacaoCliente",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "SituacaoCliente",
                table: "Pacientes");

            migrationBuilder.AddColumn<bool>(
                name: "Ativo",
                table: "Pacientes",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }
    }
}
