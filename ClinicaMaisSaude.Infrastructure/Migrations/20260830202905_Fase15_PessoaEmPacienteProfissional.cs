using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase15_PessoaEmPacienteProfissional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PessoaId",
                table: "Profissionais",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PessoaId",
                table: "Pacientes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_PessoaId",
                table: "Profissionais",
                column: "PessoaId");

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_PessoaId",
                table: "Pacientes",
                column: "PessoaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_Pessoas_PessoaId",
                table: "Pacientes",
                column: "PessoaId",
                principalTable: "Pessoas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_Pessoas_PessoaId",
                table: "Profissionais",
                column: "PessoaId",
                principalTable: "Pessoas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Backfill (Fase B2a): cada Paciente/Profissional aponta para a mesma Pessoa da sua conta.
            // Válido porque a Fase B1 criou cada Pessoa reusando o Id do LoginPortal — e UsuarioId
            // referencia justamente esse Id. Após isto, todo perfil existente tem PessoaId preenchido.
            migrationBuilder.Sql(@"UPDATE [Pacientes] SET [PessoaId] = [UsuarioId];");
            migrationBuilder.Sql(@"UPDATE [Profissionais] SET [PessoaId] = [UsuarioId];");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_Pessoas_PessoaId",
                table: "Pacientes");

            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_Pessoas_PessoaId",
                table: "Profissionais");

            migrationBuilder.DropIndex(
                name: "IX_Profissionais_PessoaId",
                table: "Profissionais");

            migrationBuilder.DropIndex(
                name: "IX_Pacientes_PessoaId",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "PessoaId",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "PessoaId",
                table: "Pacientes");
        }
    }
}
