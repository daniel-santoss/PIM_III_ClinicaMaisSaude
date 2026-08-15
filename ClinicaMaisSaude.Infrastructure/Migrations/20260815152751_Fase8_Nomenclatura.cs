using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase8_Nomenclatura : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsUsed",
                table: "RefreshTokens",
                newName: "Usado");

            migrationBuilder.RenameColumn(
                name: "IsRevoked",
                table: "RefreshTokens",
                newName: "Revogado");

            migrationBuilder.RenameColumn(
                name: "ExpiryDate",
                table: "RefreshTokens",
                newName: "Dt_Expiracao");

            migrationBuilder.RenameColumn(
                name: "AddedDate",
                table: "RefreshTokens",
                newName: "Dt_Criado");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Usado",
                table: "RefreshTokens",
                newName: "IsUsed");

            migrationBuilder.RenameColumn(
                name: "Revogado",
                table: "RefreshTokens",
                newName: "IsRevoked");

            migrationBuilder.RenameColumn(
                name: "Dt_Expiracao",
                table: "RefreshTokens",
                newName: "ExpiryDate");

            migrationBuilder.RenameColumn(
                name: "Dt_Criado",
                table: "RefreshTokens",
                newName: "AddedDate");
        }
    }
}
