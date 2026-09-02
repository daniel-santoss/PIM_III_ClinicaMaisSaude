using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase14_AddPessoa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PessoaId",
                table: "LoginPortal",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Pessoas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Cpf = table.Column<string>(type: "varchar(11)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Telefone = table.Column<string>(type: "varchar(11)", nullable: true),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ult_Atualizacao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pessoas", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoginPortal_PessoaId",
                table: "LoginPortal",
                column: "PessoaId");

            migrationBuilder.CreateIndex(
                name: "IX_Pessoas_Cpf",
                table: "Pessoas",
                column: "Cpf",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pessoas_Email",
                table: "Pessoas",
                column: "Email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_LoginPortal_Pessoas_PessoaId",
                table: "LoginPortal",
                column: "PessoaId",
                principalTable: "Pessoas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Backfill (Fase B1): cria uma Pessoa por LoginPortal reusando o mesmo Id (simplifica as
            // fases seguintes, onde Paciente/Profissional passam a apontar para Pessoa) e vincula cada
            // credencial à sua Pessoa. Após isto, todo LoginPortal tem PessoaId preenchido.
            migrationBuilder.Sql(@"
                INSERT INTO [Pessoas] ([Id], [Nome], [Cpf], [Email], [Telefone], [Dt_Criado], [ult_Atualizacao])
                SELECT [Id], [Nome], [Cpf], [Email], [Telefone], [Dt_Criado], [ult_Atualizacao] FROM [LoginPortal];");

            migrationBuilder.Sql(@"UPDATE [LoginPortal] SET [PessoaId] = [Id];");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoginPortal_Pessoas_PessoaId",
                table: "LoginPortal");

            migrationBuilder.DropTable(
                name: "Pessoas");

            migrationBuilder.DropIndex(
                name: "IX_LoginPortal_PessoaId",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "PessoaId",
                table: "LoginPortal");
        }
    }
}
