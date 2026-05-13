using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenomearTabelaUsoInadequadoIA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Executado apenas se a tabela AbusosIA ainda existir (idempotente)
            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'[AbusosIA]', 'U') IS NOT NULL
                BEGIN
                    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AbusosIA_Pacientes_PacienteId')
                        ALTER TABLE [AbusosIA] DROP CONSTRAINT [FK_AbusosIA_Pacientes_PacienteId];

                    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'PK_AbusosIA')
                        ALTER TABLE [AbusosIA] DROP CONSTRAINT [PK_AbusosIA];

                    EXEC sp_rename N'[AbusosIA]', N'UsoInadequadoIA';

                    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AbusosIA_PacienteId')
                        EXEC sp_rename N'[UsoInadequadoIA].[IX_AbusosIA_PacienteId]', N'IX_UsoInadequadoIA_PacienteId', N'INDEX';

                    ALTER TABLE [UsoInadequadoIA] ADD CONSTRAINT [PK_UsoInadequadoIA] PRIMARY KEY ([Id]);

                    ALTER TABLE [UsoInadequadoIA] ADD CONSTRAINT [FK_UsoInadequadoIA_Pacientes_PacienteId]
                        FOREIGN KEY ([PacienteId]) REFERENCES [Pacientes] ([Id]) ON DELETE CASCADE;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UsoInadequadoIA_Pacientes_PacienteId",
                table: "UsoInadequadoIA");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UsoInadequadoIA",
                table: "UsoInadequadoIA");

            migrationBuilder.RenameTable(
                name: "UsoInadequadoIA",
                newName: "AbusosIA");

            migrationBuilder.RenameIndex(
                name: "IX_UsoInadequadoIA_PacienteId",
                table: "AbusosIA",
                newName: "IX_AbusosIA_PacienteId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AbusosIA",
                table: "AbusosIA",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AbusosIA_Pacientes_PacienteId",
                table: "AbusosIA",
                column: "PacienteId",
                principalTable: "Pacientes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
