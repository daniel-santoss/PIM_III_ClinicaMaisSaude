using System.Linq;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <summary>
    /// As lookups espelhadas de enum que começavam em 0 (status do agendamento, tipo de consulta,
    /// tipo de profissional e especialidade) passam a começar em 1, como as demais.
    /// O scaffold do EF apagaria a linha 0 e renomearia as outras, o que quebraria as FKs e
    /// trocaria o significado dos dados existentes. Aqui a chave da lookup e todas as colunas
    /// que a referenciam são deslocadas juntas, preservando cada registro.
    /// </summary>
    public partial class Fase22_LookupsIniciamEmUm : Migration
    {
        private static readonly (string Lookup, (string Tabela, string Coluna)[] Referencias)[] Lookups =
        {
            ("StatusAgendamentoLookup", new[] { ("Agendamentos", "Status"), ("AgendamentoHistoricos", "StatusAnterior"), ("AgendamentoHistoricos", "StatusNovo") }),
            ("TipoConsultaLookup", new[] { ("Agendamentos", "TipoConsulta") }),
            ("TipoProfissionalLookup", new[] { ("Agendamentos", "TipoProfissional") }),
            ("EspecialidadeLookup", new[] { ("Agendamentos", "EspecialidadeId"), ("ProfissionalEspecialidades", "EspecialidadeId") }),
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var (lookup, referencias) in Lookups)
                Deslocar(migrationBuilder, lookup, +1, referencias);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (lookup, referencias) in Lookups)
                Deslocar(migrationBuilder, lookup, -1, referencias);
        }

        // Desliga as FKs que apontam para a lookup, soma o delta na chave e nas colunas que a
        // referenciam (NULL continua NULL) e religa as FKs WITH CHECK, para voltarem a ser confiáveis.
        private static void Deslocar(MigrationBuilder migrationBuilder, string lookup, int delta, (string Tabela, string Coluna)[] referencias)
        {
            var atualizacoes = string.Join("\n", referencias.Select(r =>
                $"UPDATE [{r.Tabela}] SET [{r.Coluna}] = [{r.Coluna}] + ({delta}) WHERE [{r.Coluna}] IS NOT NULL;"));

            migrationBuilder.Sql($@"
DECLARE @sql nvarchar(max) = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_NAME(parent_object_id)) + N' NOCHECK CONSTRAINT ' + QUOTENAME(name) + N';'
FROM sys.foreign_keys WHERE referenced_object_id = OBJECT_ID(N'[{lookup}]');
EXEC sp_executesql @sql;

UPDATE [{lookup}] SET [Id] = [Id] + ({delta});
{atualizacoes}

SET @sql = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_NAME(parent_object_id)) + N' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(name) + N';'
FROM sys.foreign_keys WHERE referenced_object_id = OBJECT_ID(N'[{lookup}]');
EXEC sp_executesql @sql;");
        }
    }
}
