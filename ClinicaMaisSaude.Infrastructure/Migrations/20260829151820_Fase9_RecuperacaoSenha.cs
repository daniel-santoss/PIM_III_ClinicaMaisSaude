using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase9_RecuperacaoSenha : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CodigosRecuperacaoSenha",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
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
                    table.PrimaryKey("PK_CodigosRecuperacaoSenha", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodigosRecuperacaoSenha_LoginPortal_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "LoginPortal",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosRecuperacaoSenha_ResetTokenHash",
                table: "CodigosRecuperacaoSenha",
                column: "ResetTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosRecuperacaoSenha_UsuarioId",
                table: "CodigosRecuperacaoSenha",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodigosRecuperacaoSenha");
        }
    }
}
