using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase7_UltAtualizacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ult_Atualizacao",
                table: "Profissionais",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ult_Atualizacao",
                table: "Pacientes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ult_Atualizacao",
                table: "LoginPortal",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ult_Atualizacao",
                table: "Agendamentos",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ult_Atualizacao",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "ult_Atualizacao",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "ult_Atualizacao",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "ult_Atualizacao",
                table: "Agendamentos");
        }
    }
}
