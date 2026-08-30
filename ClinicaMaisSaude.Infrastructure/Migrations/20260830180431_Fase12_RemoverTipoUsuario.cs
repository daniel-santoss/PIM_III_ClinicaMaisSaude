using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase12_RemoverTipoUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AlterColumn<int>(
                name: "Role",
                table: "LoginPortal",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Role",
                table: "LoginPortal",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "TipoUsuario",
                table: "LoginPortal",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "TipoUsuarioLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
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
    }
}
