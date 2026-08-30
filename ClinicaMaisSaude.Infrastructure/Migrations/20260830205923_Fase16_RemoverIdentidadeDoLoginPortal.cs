using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase16_RemoverIdentidadeDoLoginPortal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LoginPortal_Cpf",
                table: "LoginPortal");

            migrationBuilder.DropIndex(
                name: "IX_LoginPortal_Email",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "Cpf",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "Nome",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "Telefone",
                table: "LoginPortal");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cpf",
                table: "LoginPortal",
                type: "varchar(11)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "LoginPortal",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Nome",
                table: "LoginPortal",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Telefone",
                table: "LoginPortal",
                type: "varchar(11)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoginPortal_Cpf",
                table: "LoginPortal",
                column: "Cpf",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoginPortal_Email",
                table: "LoginPortal",
                column: "Email",
                unique: true);
        }
    }
}
