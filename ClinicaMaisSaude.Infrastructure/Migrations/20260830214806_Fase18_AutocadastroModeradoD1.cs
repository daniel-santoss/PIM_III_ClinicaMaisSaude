using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase18_AutocadastroModeradoD1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes");

            migrationBuilder.AlterColumn<Guid>(
                name: "UsuarioId",
                table: "Pacientes",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.CreateTable(
                name: "ModelosDeclaracaoSaude",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ModeloPadrao = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ult_Atualizacao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosDeclaracaoSaude", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StatusSolicitacaoLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusSolicitacaoLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PerguntasDeclaracaoSaude",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Pergunta = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Ordem = table.Column<int>(type: "int", nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ult_Atualizacao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerguntasDeclaracaoSaude", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerguntasDeclaracaoSaude_ModelosDeclaracaoSaude_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "ModelosDeclaracaoSaude",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SolicitacoesCadastro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PessoaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    MotivoRecusa = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ult_Atualizacao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitacoesCadastro", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitacoesCadastro_ModelosDeclaracaoSaude_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "ModelosDeclaracaoSaude",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitacoesCadastro_Pessoas_PessoaId",
                        column: x => x.PessoaId,
                        principalTable: "Pessoas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SolicitacoesCadastro_StatusSolicitacaoLookup_Status",
                        column: x => x.Status,
                        principalTable: "StatusSolicitacaoLookup",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RespostasDeclaracaoSaude",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SolicitacaoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PerguntaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Resposta = table.Column<bool>(type: "bit", nullable: false),
                    Detalhe = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RespostasDeclaracaoSaude", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RespostasDeclaracaoSaude_PerguntasDeclaracaoSaude_PerguntaId",
                        column: x => x.PerguntaId,
                        principalTable: "PerguntasDeclaracaoSaude",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RespostasDeclaracaoSaude_SolicitacoesCadastro_SolicitacaoId",
                        column: x => x.SolicitacaoId,
                        principalTable: "SolicitacoesCadastro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "StatusSolicitacaoLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "EmAnalise" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Aprovada" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Recusada" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId",
                unique: true,
                filter: "[UsuarioId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosDeclaracaoSaude_ModeloPadrao",
                table: "ModelosDeclaracaoSaude",
                column: "ModeloPadrao",
                unique: true,
                filter: "[ModeloPadrao] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_PerguntasDeclaracaoSaude_ModeloId_Ordem",
                table: "PerguntasDeclaracaoSaude",
                columns: new[] { "ModeloId", "Ordem" });

            migrationBuilder.CreateIndex(
                name: "IX_RespostasDeclaracaoSaude_PerguntaId",
                table: "RespostasDeclaracaoSaude",
                column: "PerguntaId");

            migrationBuilder.CreateIndex(
                name: "IX_RespostasDeclaracaoSaude_SolicitacaoId_PerguntaId",
                table: "RespostasDeclaracaoSaude",
                columns: new[] { "SolicitacaoId", "PerguntaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacoesCadastro_ModeloId",
                table: "SolicitacoesCadastro",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacoesCadastro_PessoaId",
                table: "SolicitacoesCadastro",
                column: "PessoaId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacoesCadastro_Status",
                table: "SolicitacoesCadastro",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RespostasDeclaracaoSaude");

            migrationBuilder.DropTable(
                name: "PerguntasDeclaracaoSaude");

            migrationBuilder.DropTable(
                name: "SolicitacoesCadastro");

            migrationBuilder.DropTable(
                name: "ModelosDeclaracaoSaude");

            migrationBuilder.DropTable(
                name: "StatusSolicitacaoLookup");

            migrationBuilder.DropIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes");

            migrationBuilder.AlterColumn<Guid>(
                name: "UsuarioId",
                table: "Pacientes",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId",
                unique: true);
        }
    }
}
