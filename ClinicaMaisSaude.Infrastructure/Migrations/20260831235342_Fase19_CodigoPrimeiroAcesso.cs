using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase19_CodigoPrimeiroAcesso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CodigosPrimeiroAcesso",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PessoaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SolicitacaoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CodigoHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Dt_Expiracao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Usado = table.Column<bool>(type: "bit", nullable: false),
                    Tentativas = table.Column<int>(type: "int", nullable: false),
                    ResetTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Dt_Expiracao_Reset = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodigosPrimeiroAcesso", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodigosPrimeiroAcesso_Pessoas_PessoaId",
                        column: x => x.PessoaId,
                        principalTable: "Pessoas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CodigosPrimeiroAcesso_SolicitacoesCadastro_SolicitacaoId",
                        column: x => x.SolicitacaoId,
                        principalTable: "SolicitacoesCadastro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosPrimeiroAcesso_PessoaId",
                table: "CodigosPrimeiroAcesso",
                column: "PessoaId");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosPrimeiroAcesso_ResetTokenHash",
                table: "CodigosPrimeiroAcesso",
                column: "ResetTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosPrimeiroAcesso_SolicitacaoId",
                table: "CodigosPrimeiroAcesso",
                column: "SolicitacaoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodigosPrimeiroAcesso");
        }
    }
}
