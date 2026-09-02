using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase21_ConsentimentoTermos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TermosAceitosEm",
                table: "SolicitacoesCadastro",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TermosVersao",
                table: "SolicitacoesCadastro",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TermosAceitosEm",
                table: "SolicitacoesCadastro");

            migrationBuilder.DropColumn(
                name: "TermosVersao",
                table: "SolicitacoesCadastro");
        }
    }
}
