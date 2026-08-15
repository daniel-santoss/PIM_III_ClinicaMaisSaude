using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase5_FksAgendamento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_AgendamentoOrigemId",
                table: "Agendamentos",
                column: "AgendamentoOrigemId");

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_EspecialidadeId",
                table: "Agendamentos",
                column: "EspecialidadeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_Agendamentos_AgendamentoOrigemId",
                table: "Agendamentos",
                column: "AgendamentoOrigemId",
                principalTable: "Agendamentos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_EspecialidadeLookup_EspecialidadeId",
                table: "Agendamentos",
                column: "EspecialidadeId",
                principalTable: "EspecialidadeLookup",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_Profissionais_ProfissionalId",
                table: "Agendamentos",
                column: "ProfissionalId",
                principalTable: "Profissionais",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Agendamentos_Agendamentos_AgendamentoOrigemId",
                table: "Agendamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Agendamentos_EspecialidadeLookup_EspecialidadeId",
                table: "Agendamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Agendamentos_Profissionais_ProfissionalId",
                table: "Agendamentos");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_AgendamentoOrigemId",
                table: "Agendamentos");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_EspecialidadeId",
                table: "Agendamentos");
        }
    }
}
