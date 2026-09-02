using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase11_RoleUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "LoginPortal",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RoleUsuarioLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleUsuarioLookup", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "RoleUsuarioLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Paciente" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Admin" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Medico" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Enfermeira" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoginPortal_Role",
                table: "LoginPortal",
                column: "Role");

            migrationBuilder.AddForeignKey(
                name: "FK_LoginPortal_RoleUsuarioLookup_Role",
                table: "LoginPortal",
                column: "Role",
                principalTable: "RoleUsuarioLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Backfill do papel unificado a partir da taxonomia antiga (TipoUsuario +
            // Profissional.TipoProfissional): Paciente->Paciente, Admin->Admin,
            // Profissional Medico(1)->Medico, Enfermeira(0)->Enfermeira. Nada ainda LÊ
            // Role (Fase A2); a coluna é preenchida só para a transição.
            migrationBuilder.Sql(@"
                UPDATE lp SET Role = CASE
                        WHEN lp.TipoUsuario = 1 THEN 1
                        WHEN lp.TipoUsuario = 3 THEN 2
                        WHEN lp.TipoUsuario = 2 THEN (CASE pr.TipoProfissional WHEN 1 THEN 3 WHEN 0 THEN 4 END)
                    END
                FROM LoginPortal lp
                LEFT JOIN Profissionais pr ON pr.UsuarioId = lp.Id
                WHERE lp.Role IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoginPortal_RoleUsuarioLookup_Role",
                table: "LoginPortal");

            migrationBuilder.DropTable(
                name: "RoleUsuarioLookup");

            migrationBuilder.DropIndex(
                name: "IX_LoginPortal_Role",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "LoginPortal");
        }
    }
}
