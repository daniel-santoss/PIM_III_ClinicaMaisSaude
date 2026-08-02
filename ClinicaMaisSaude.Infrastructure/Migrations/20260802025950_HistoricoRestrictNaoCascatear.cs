using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HistoricoRestrictNaoCascatear : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AgendamentoHistoricos_Agendamentos_AgendamentoId",
                table: "AgendamentoHistoricos");

            migrationBuilder.AddForeignKey(
                name: "FK_AgendamentoHistoricos_Agendamentos_AgendamentoId",
                table: "AgendamentoHistoricos",
                column: "AgendamentoId",
                principalTable: "Agendamentos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AgendamentoHistoricos_Agendamentos_AgendamentoId",
                table: "AgendamentoHistoricos");

            migrationBuilder.AddForeignKey(
                name: "FK_AgendamentoHistoricos_Agendamentos_AgendamentoId",
                table: "AgendamentoHistoricos",
                column: "AgendamentoId",
                principalTable: "Agendamentos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
