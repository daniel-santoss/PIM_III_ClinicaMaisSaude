using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase23_HistoricoSolicitacaoCadastro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SolicitacoesCadastroHistorico",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SolicitacaoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StatusAnterior = table.Column<int>(type: "int", nullable: false),
                    StatusNovo = table.Column<int>(type: "int", nullable: false),
                    Motivo = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RealizadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitacoesCadastroHistorico", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitacoesCadastroHistorico_LoginPortal_RealizadoPor",
                        column: x => x.RealizadoPor,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitacoesCadastroHistorico_SolicitacoesCadastro_SolicitacaoId",
                        column: x => x.SolicitacaoId,
                        principalTable: "SolicitacoesCadastro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitacoesCadastroHistorico_StatusSolicitacaoLookup_StatusAnterior",
                        column: x => x.StatusAnterior,
                        principalTable: "StatusSolicitacaoLookup",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitacoesCadastroHistorico_StatusSolicitacaoLookup_StatusNovo",
                        column: x => x.StatusNovo,
                        principalTable: "StatusSolicitacaoLookup",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacoesCadastroHistorico_RealizadoPor",
                table: "SolicitacoesCadastroHistorico",
                column: "RealizadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacoesCadastroHistorico_SolicitacaoId",
                table: "SolicitacoesCadastroHistorico",
                column: "SolicitacaoId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacoesCadastroHistorico_StatusAnterior",
                table: "SolicitacoesCadastroHistorico",
                column: "StatusAnterior");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacoesCadastroHistorico_StatusNovo",
                table: "SolicitacoesCadastroHistorico",
                column: "StatusNovo");

            // Decisões tomadas antes desta trilha: uma linha por solicitação já decidida, com a data da
            // última atualização e o motivo da recusa. Quem decidiu não foi registrado (fica nulo).
            migrationBuilder.Sql(@"
INSERT INTO SolicitacoesCadastroHistorico (Id, SolicitacaoId, StatusAnterior, StatusNovo, Motivo, RealizadoPor, Dt_Criado)
SELECT NEWID(), s.Id, 1, s.Status, s.MotivoRecusa, NULL, COALESCE(s.ult_Atualizacao, s.Dt_Criado)
FROM SolicitacoesCadastro s
WHERE s.Status <> 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SolicitacoesCadastroHistorico");
        }
    }
}
