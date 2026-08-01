using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoverSeedAdminHardcoded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Profissionais",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "LoginPortal",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "LoginPortal",
                columns: new[] { "Id", "BloqueadoAte", "Cpf", "Dt_Criado", "Email", "FotoBase64", "IsAdmin", "SenhaHash", "TentativasLogin", "UltimoAcesso" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), null, "00000000000", new DateTime(2026, 4, 26, 0, 0, 0, 0, DateTimeKind.Utc), "admin@clinicamaissaude.com.br", null, true, "$2a$11$DaDuHHaqAhlkdCbeVcw6l.ttRvVjLZ8AnOcXvugreEbhe0C1K1YPK", 0, null });

            migrationBuilder.InsertData(
                table: "Profissionais",
                columns: new[] { "Id", "Crm", "Dt_Criado", "Nome", "TipoProfissional", "UfCrm", "UsuarioId" },
                values: new object[] { new Guid("22222222-2222-2222-2222-222222222222"), "123456", new DateTime(2026, 4, 26, 0, 0, 0, 0, DateTimeKind.Utc), "Dr. Admin", 1, "SP", new Guid("11111111-1111-1111-1111-111111111111") });
        }
    }
}
