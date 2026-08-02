using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PadronizarCpfUnico : Migration
    {
        /// <inheritdoc />
        // SQL bruto de propósito: o AlterColumn do EF gera automaticamente o drop/recreate
        // do índice de CPF usando o nome de CONVENÇÃO (IX_LoginPortal_Cpf), que nunca bateu
        // com o nome real no banco (IX_Usuarios_Cpf — criado com o nome da entidade). Fazer
        // manualmente com os nomes reais evita esse conflito.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IX_Usuarios_Cpf ON LoginPortal;");
            migrationBuilder.Sql("DROP INDEX IX_Pacientes_Cpf ON Pacientes;");
            migrationBuilder.Sql("ALTER TABLE LoginPortal ALTER COLUMN Cpf varchar(11) NOT NULL;");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IX_Usuarios_Cpf ON LoginPortal (Cpf);");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IX_Pacientes_Cpf ON Pacientes (Cpf);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IX_Usuarios_Cpf ON LoginPortal;");
            migrationBuilder.Sql("DROP INDEX IX_Pacientes_Cpf ON Pacientes;");
            migrationBuilder.Sql("ALTER TABLE LoginPortal ALTER COLUMN Cpf nvarchar(14) NOT NULL;");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IX_Usuarios_Cpf ON LoginPortal (Cpf);");
            migrationBuilder.Sql("CREATE INDEX IX_Pacientes_Cpf ON Pacientes (Cpf);");
        }
    }
}
