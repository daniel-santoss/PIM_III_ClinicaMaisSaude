using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlterarViolacoesIAParaUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DECLARE @ConstraintName nvarchar(200);
                SELECT @ConstraintName = name 
                FROM sys.foreign_keys 
                WHERE parent_object_id = OBJECT_ID('UsoInadequadoIA') 
                  AND referenced_object_id = OBJECT_ID('Pacientes');

                IF @ConstraintName IS NOT NULL
                BEGIN
                    EXEC('ALTER TABLE [UsoInadequadoIA] DROP CONSTRAINT [' + @ConstraintName + ']');
                END
            ");

            migrationBuilder.RenameColumn(
                name: "PacienteId",
                table: "UsoInadequadoIA",
                newName: "UsuarioId");

            migrationBuilder.Sql(@"
                -- Map old PacienteId to UsuarioId
                UPDATE u
                SET u.[UsuarioId] = p.[UsuarioId]
                FROM [UsoInadequadoIA] u
                INNER JOIN [Pacientes] p ON u.[UsuarioId] = p.[Id]
                WHERE p.[UsuarioId] IS NOT NULL;

                -- Delete any orphans that don't match any LoginPortal (Usuario) Id
                DELETE FROM [UsoInadequadoIA]
                WHERE [UsuarioId] NOT IN (SELECT [Id] FROM [LoginPortal]);
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UsoInadequadoIA_PacienteId' AND object_id = OBJECT_ID('UsoInadequadoIA'))
                BEGIN
                    DROP INDEX [IX_UsoInadequadoIA_PacienteId] ON [UsoInadequadoIA];
                END
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AbusosIA_PacienteId' AND object_id = OBJECT_ID('UsoInadequadoIA'))
                BEGIN
                    DROP INDEX [IX_AbusosIA_PacienteId] ON [UsoInadequadoIA];
                END
            ");

            migrationBuilder.CreateIndex(
                name: "IX_UsoInadequadoIA_UsuarioId",
                table: "UsoInadequadoIA",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_UsoInadequadoIA_LoginPortal_UsuarioId",
                table: "UsoInadequadoIA",
                column: "UsuarioId",
                principalTable: "LoginPortal",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UsoInadequadoIA_LoginPortal_UsuarioId",
                table: "UsoInadequadoIA");

            migrationBuilder.RenameColumn(
                name: "UsuarioId",
                table: "UsoInadequadoIA",
                newName: "PacienteId");

            migrationBuilder.DropIndex(
                name: "IX_UsoInadequadoIA_UsuarioId",
                table: "UsoInadequadoIA");

            migrationBuilder.CreateIndex(
                name: "IX_UsoInadequadoIA_PacienteId",
                table: "UsoInadequadoIA",
                column: "PacienteId");

            migrationBuilder.AddForeignKey(
                name: "FK_UsoInadequadoIA_Pacientes_PacienteId",
                table: "UsoInadequadoIA",
                column: "PacienteId",
                principalTable: "Pacientes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
