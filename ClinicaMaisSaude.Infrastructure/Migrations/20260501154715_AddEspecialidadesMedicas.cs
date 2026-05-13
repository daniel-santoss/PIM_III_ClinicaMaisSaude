using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEspecialidadesMedicas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FotoUrl",
                table: "Pacientes");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProfissionalEspecialidades");

            migrationBuilder.AddColumn<string>(
                name: "FotoUrl",
                table: "Pacientes",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
