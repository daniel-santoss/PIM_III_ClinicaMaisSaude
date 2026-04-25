using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarColunaAtivo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Ativo",
                table: "Pacientes",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Ativo",
                table: "Pacientes");
        }
    }
}
