using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase6_PenalidadeIA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Coluna nova no LoginPortal (penalidade de IA passa a viver na conta).
            migrationBuilder.AddColumn<DateTime>(
                name: "BloqueadoIAAte",
                table: "LoginPortal",
                type: "datetime2",
                nullable: true);

            // 2. Backfill: copia o bloqueio de IA do Paciente para o LoginPortal ANTES de dropar.
            migrationBuilder.Sql(@"
                UPDATE u SET BloqueadoIAAte = p.BloqueadoIAAte
                FROM [LoginPortal] u
                JOIN [Pacientes] p ON p.UsuarioId = u.Id
                WHERE p.BloqueadoIAAte IS NOT NULL;");

            // 3. Remove as colunas antigas do Paciente (PenalidadeRemovidaAvisar deixou de existir).
            migrationBuilder.DropColumn(
                name: "BloqueadoIAAte",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "PenalidadeRemovidaAvisar",
                table: "Pacientes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BloqueadoIAAte",
                table: "LoginPortal");

            migrationBuilder.AddColumn<DateTime>(
                name: "BloqueadoIAAte",
                table: "Pacientes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PenalidadeRemovidaAvisar",
                table: "Pacientes",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
