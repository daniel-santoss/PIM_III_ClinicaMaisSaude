using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CorrigirValorMedicinaEsportiva : Migration
    {
        // Sem mudança de schema: apenas remapeia o valor do enum MedicinaEsportiva de 18
        // para 17, tornando-o contíguo. O valor 18 era um gap (17 pulado) que causava
        // divergência com o índice usado pelo front-end (indexOf), quebrando essa
        // especialidade na delegação/agendamento.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE ProfissionalEspecialidades SET EspecialidadeId = 17 WHERE EspecialidadeId = 18;");
            migrationBuilder.Sql("UPDATE Agendamentos SET EspecialidadeId = 17 WHERE EspecialidadeId = 18;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE ProfissionalEspecialidades SET EspecialidadeId = 18 WHERE EspecialidadeId = 17;");
            migrationBuilder.Sql("UPDATE Agendamentos SET EspecialidadeId = 18 WHERE EspecialidadeId = 17;");
        }
    }
}
