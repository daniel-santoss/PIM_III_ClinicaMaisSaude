using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase20_UnificarCodigoVerificacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodigosPrimeiroAcesso");

            migrationBuilder.DropTable(
                name: "CodigosRecuperacaoSenha");

            migrationBuilder.CreateTable(
                name: "TipoVerificacaoLookup",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoVerificacaoLookup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CodigosVerificacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tipo = table.Column<int>(type: "int", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PessoaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SolicitacaoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
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
                    table.PrimaryKey("PK_CodigosVerificacao", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodigosVerificacao_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CodigosVerificacao_Pessoas_PessoaId",
                        column: x => x.PessoaId,
                        principalTable: "Pessoas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CodigosVerificacao_SolicitacoesCadastro_SolicitacaoId",
                        column: x => x.SolicitacaoId,
                        principalTable: "SolicitacoesCadastro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CodigosVerificacao_TipoVerificacaoLookup_Tipo",
                        column: x => x.Tipo,
                        principalTable: "TipoVerificacaoLookup",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "TipoVerificacaoLookup",
                columns: new[] { "Id", "Dt_Criado", "Nome" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "RecuperacaoSenha" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "PrimeiroAcesso" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "VerificacaoEmail" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosVerificacao_PessoaId",
                table: "CodigosVerificacao",
                column: "PessoaId");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosVerificacao_ResetTokenHash",
                table: "CodigosVerificacao",
                column: "ResetTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosVerificacao_SolicitacaoId",
                table: "CodigosVerificacao",
                column: "SolicitacaoId");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosVerificacao_Tipo_Email",
                table: "CodigosVerificacao",
                columns: new[] { "Tipo", "Email" });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosVerificacao_Tipo_PessoaId",
                table: "CodigosVerificacao",
                columns: new[] { "Tipo", "PessoaId" });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosVerificacao_Tipo_UsuarioId",
                table: "CodigosVerificacao",
                columns: new[] { "Tipo", "UsuarioId" });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosVerificacao_UsuarioId",
                table: "CodigosVerificacao",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodigosVerificacao");

            migrationBuilder.DropTable(
                name: "TipoVerificacaoLookup");

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
                    Dt_Expiracao_Reset = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResetTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Tentativas = table.Column<int>(type: "int", nullable: false),
                    Usado = table.Column<bool>(type: "bit", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "CodigosRecuperacaoSenha",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CodigoHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Dt_Expiracao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Dt_Expiracao_Reset = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResetTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Tentativas = table.Column<int>(type: "int", nullable: false),
                    Usado = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodigosRecuperacaoSenha", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodigosRecuperacaoSenha_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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

            migrationBuilder.CreateIndex(
                name: "IX_CodigosRecuperacaoSenha_ResetTokenHash",
                table: "CodigosRecuperacaoSenha",
                column: "ResetTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosRecuperacaoSenha_UsuarioId",
                table: "CodigosRecuperacaoSenha",
                column: "UsuarioId");
        }
    }
}
