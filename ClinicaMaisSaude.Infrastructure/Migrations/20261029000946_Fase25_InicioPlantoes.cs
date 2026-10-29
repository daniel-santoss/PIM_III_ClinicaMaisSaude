using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase25_InicioPlantoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "InicioPlantoes",
                table: "Profissionais",
                type: "date",
                nullable: false,
                defaultValue: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // Backfill: os profissionais existentes "já trabalham" desde o primeiro dia da escala deles
            // a partir da referência (01/01/2026 = Escala 1, 02/01/2026 = Escala 2) — nada muda na agenda.
            migrationBuilder.Sql("UPDATE Profissionais SET InicioPlantoes = DATEADD(day, Escala - 1, '2026-01-01');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InicioPlantoes",
                table: "Profissionais");
        }
    }
}
