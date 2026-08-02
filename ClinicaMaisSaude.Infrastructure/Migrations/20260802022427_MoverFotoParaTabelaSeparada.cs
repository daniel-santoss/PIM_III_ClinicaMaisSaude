using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MoverFotoParaTabelaSeparada : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Cria a tabela separada de fotos.
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

            // 2. Migra as fotos existentes para a nova tabela (antes de dropar a coluna).
            migrationBuilder.Sql(
                "INSERT INTO UsuarioFotos (UsuarioId, FotoBase64) " +
                "SELECT Id, FotoBase64 FROM LoginPortal WHERE FotoBase64 IS NOT NULL AND FotoBase64 <> '';");

            // 3. Remove a coluna antiga da tabela de login.
            migrationBuilder.DropColumn(
                name: "FotoBase64",
                table: "LoginPortal");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 1. Recria a coluna na tabela de login.
            migrationBuilder.AddColumn<string>(
                name: "FotoBase64",
                table: "LoginPortal",
                type: "nvarchar(max)",
                nullable: true);

            // 2. Copia as fotos de volta para a coluna.
            migrationBuilder.Sql(
                "UPDATE lp SET lp.FotoBase64 = uf.FotoBase64 " +
                "FROM LoginPortal lp INNER JOIN UsuarioFotos uf ON uf.UsuarioId = lp.Id;");

            // 3. Remove a tabela separada.
            migrationBuilder.DropTable(
                name: "UsuarioFotos");
        }
    }
}
