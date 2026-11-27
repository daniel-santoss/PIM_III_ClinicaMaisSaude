using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <summary>
    /// Os "momentos do sistema" (criado em, atualizado em, último acesso, bloqueios, vencimentos)
    /// eram gravados em UTC; a partir daqui o sistema todo grava no horário de Brasília (Relogio).
    /// Esta migration converte o que já existe. O horário da consulta, as datas do histórico de
    /// remarcação, as ausências e o primeiro plantão já estavam no horário de Brasília e ficam
    /// como estão. O SQL Server só conhece o nome Windows do fuso: "E. South America Standard
    /// Time" é o mesmo America/Sao_Paulo, inclusive nos períodos com horário de verão.
    /// </summary>
    public partial class Fase26_HorarioBrasilia : Migration
    {
        private const string FusoSql = "E. South America Standard Time";

        private static readonly (string Tabela, string Coluna)[] Momentos =
        {
            ("AgendamentoHistoricos", "Dt_Criado"),
            ("Agendamentos", "Dt_Criado"),
            ("Agendamentos", "ult_Atualizacao"),
            ("AusenciasProfissional", "Dt_Criado"),
            ("CodigosVerificacao", "Dt_Criado"),
            ("CodigosVerificacao", "Dt_Expiracao"),
            ("CodigosVerificacao", "Dt_Expiracao_Reset"),
            ("LoginPortal", "Dt_Criado"),
            ("LoginPortal", "UltimoAcesso"),
            ("LoginPortal", "BloqueadoAte"),
            ("LoginPortal", "BloqueadoIAAte"),
            ("LoginPortal", "ult_Atualizacao"),
            ("ModelosDeclaracaoSaude", "Dt_Criado"),
            ("ModelosDeclaracaoSaude", "ult_Atualizacao"),
            ("Notificacoes", "Dt_Criado"),
            ("Pacientes", "Dt_Criado"),
            ("Pacientes", "ult_Atualizacao"),
            ("PerguntasDeclaracaoSaude", "Dt_Criado"),
            ("PerguntasDeclaracaoSaude", "ult_Atualizacao"),
            ("Pessoas", "Dt_Criado"),
            ("Pessoas", "ult_Atualizacao"),
            ("Profissionais", "Dt_Criado"),
            ("Profissionais", "ult_Atualizacao"),
            ("RefreshTokens", "Dt_Criado"),
            ("RefreshTokens", "Dt_Expiracao"),
            ("RespostasDeclaracaoSaude", "Dt_Criado"),
            ("SolicitacoesCadastro", "Dt_Criado"),
            ("SolicitacoesCadastro", "ult_Atualizacao"),
            ("SolicitacoesCadastro", "TermosAceitosEm"),
            ("SolicitacoesCadastroHistorico", "Dt_Criado"),
            ("UsoInadequadoIA", "Dt_Criado"),
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var (tabela, coluna) in Momentos)
                migrationBuilder.Sql(
                    $"UPDATE [{tabela}] SET [{coluna}] = CONVERT(datetime2, ([{coluna}] AT TIME ZONE 'UTC') AT TIME ZONE '{FusoSql}') " +
                    $"WHERE [{coluna}] IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (tabela, coluna) in Momentos)
                migrationBuilder.Sql(
                    $"UPDATE [{tabela}] SET [{coluna}] = CONVERT(datetime2, ([{coluna}] AT TIME ZONE '{FusoSql}') AT TIME ZONE 'UTC') " +
                    $"WHERE [{coluna}] IS NOT NULL;");
        }
    }
}
