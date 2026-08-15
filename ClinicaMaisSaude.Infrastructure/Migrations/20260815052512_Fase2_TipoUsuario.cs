using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase2_TipoUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Tabela de lookup + seed (precisa existir antes do FK).
            migrationBuilder.CreateTable(
                name: "TipoUsuarioLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoUsuarioLookup", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "TipoUsuarioLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Paciente" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Profissional" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Admin" }
                });

            // 2. Coluna nova com default Paciente (valor válido para o FK).
            migrationBuilder.AddColumn<int>(
                name: "TipoUsuario",
                table: "LoginPortal",
                type: "int",
                nullable: false,
                defaultValue: 1);

            // 3. Backfill a partir do IsAdmin (ainda existe) e da presença de perfil:
            //    admin -> Admin(3); tem Profissional -> Profissional(2); resto fica Paciente(1).
            migrationBuilder.Sql("UPDATE [LoginPortal] SET [TipoUsuario] = 3 WHERE [IsAdmin] = 1;");
            migrationBuilder.Sql(
                "UPDATE [LoginPortal] SET [TipoUsuario] = 2 " +
                "WHERE [IsAdmin] = 0 AND [Id] IN (SELECT [UsuarioId] FROM [Profissionais]);");

            // 4. Só agora remove a coluna antiga.
            migrationBuilder.DropColumn(
                name: "IsAdmin",
                table: "LoginPortal");

            // 5. Índice + FK (dados já consistentes com o lookup).
            migrationBuilder.CreateIndex(
                name: "IX_LoginPortal_TipoUsuario",
                table: "LoginPortal",
                column: "TipoUsuario");

            migrationBuilder.AddForeignKey(
                name: "FK_LoginPortal_TipoUsuarioLookup_TipoUsuario",
                table: "LoginPortal",
                column: "TipoUsuario",
                principalTable: "TipoUsuarioLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoginPortal_TipoUsuarioLookup_TipoUsuario",
                table: "LoginPortal");

            migrationBuilder.DropTable(
                name: "TipoUsuarioLookup");

            migrationBuilder.DropIndex(
                name: "IX_LoginPortal_TipoUsuario",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "TipoUsuario",
                table: "LoginPortal");

            migrationBuilder.AddColumn<bool>(
                name: "IsAdmin",
                table: "LoginPortal",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
