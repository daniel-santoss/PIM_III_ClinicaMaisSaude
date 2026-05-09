using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenomearTabelaUsoInadequadoIA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AbusosIA_Pacientes_PacienteId",
                table: "AbusosIA");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AbusosIA",
                table: "AbusosIA");

            migrationBuilder.RenameTable(
                name: "AbusosIA",
                newName: "UsoInadequadoIA");

            migrationBuilder.RenameIndex(
                name: "IX_AbusosIA_PacienteId",
                table: "UsoInadequadoIA",
                newName: "IX_UsoInadequadoIA_PacienteId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UsoInadequadoIA",
                table: "UsoInadequadoIA",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UsoInadequadoIA_Pacientes_PacienteId",
                table: "UsoInadequadoIA",
                column: "PacienteId",
                principalTable: "Pacientes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UsoInadequadoIA_Pacientes_PacienteId",
                table: "UsoInadequadoIA");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UsoInadequadoIA",
                table: "UsoInadequadoIA");

            migrationBuilder.RenameTable(
                name: "UsoInadequadoIA",
                newName: "AbusosIA");

            migrationBuilder.RenameIndex(
                name: "IX_UsoInadequadoIA_PacienteId",
                table: "AbusosIA",
                newName: "IX_AbusosIA_PacienteId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AbusosIA",
                table: "AbusosIA",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AbusosIA_Pacientes_PacienteId",
                table: "AbusosIA",
                column: "PacienteId",
                principalTable: "Pacientes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
