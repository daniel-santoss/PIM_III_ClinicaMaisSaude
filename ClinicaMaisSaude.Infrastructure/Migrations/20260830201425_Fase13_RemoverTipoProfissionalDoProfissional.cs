using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase13_RemoverTipoProfissionalDoProfissional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_TipoProfissionalLookup_TipoProfissional",
                table: "Profissionais");

            migrationBuilder.DropIndex(
                name: "IX_Profissionais_TipoProfissional",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "TipoProfissional",
                table: "Profissionais");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TipoProfissional",
                table: "Profissionais",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_TipoProfissional",
                table: "Profissionais",
                column: "TipoProfissional");

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_TipoProfissionalLookup_TipoProfissional",
                table: "Profissionais",
                column: "TipoProfissional",
                principalTable: "TipoProfissionalLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
