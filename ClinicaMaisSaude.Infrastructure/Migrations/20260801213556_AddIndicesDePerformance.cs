using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIndicesDePerformance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_PacienteId",
                table: "Agendamentos");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_Cpf",
                table: "Pacientes",
                column: "Cpf");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId_Dt_Criado",
                table: "Notificacoes",
                columns: new[] { "UsuarioId", "Dt_Criado" });

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_PacienteId_DataHoraConsulta",
                table: "Agendamentos",
                columns: new[] { "PacienteId", "DataHoraConsulta" });

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_ProfissionalId_DataHoraConsulta",
                table: "Agendamentos",
                columns: new[] { "ProfissionalId", "DataHoraConsulta" });

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_Status_DataHoraConsulta",
                table: "Agendamentos",
                columns: new[] { "Status", "DataHoraConsulta" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_Pacientes_Cpf",
                table: "Pacientes");

            migrationBuilder.DropIndex(
                name: "IX_Notificacoes_UsuarioId_Dt_Criado",
                table: "Notificacoes");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_PacienteId_DataHoraConsulta",
                table: "Agendamentos");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_ProfissionalId_DataHoraConsulta",
                table: "Agendamentos");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_Status_DataHoraConsulta",
                table: "Agendamentos");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_PacienteId",
                table: "Agendamentos",
                column: "PacienteId");
        }
    }
}
