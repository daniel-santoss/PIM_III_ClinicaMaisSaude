using Microsoft.AspNetCore.Authorization.Infrastructure;

namespace ClinicaMaisSaude.API.Authorization
{
    /// <summary>
    /// Operações sobre um agendamento, avaliadas pelo <see cref="AgendamentoAuthorizationHandler"/>
    /// (autorização baseada em recurso do ASP.NET Core).
    /// </summary>
    public static class OperacoesAgendamento
    {
        /// <summary>Ver o agendamento e o seu histórico.</summary>
        public static readonly OperationAuthorizationRequirement Ler = new() { Name = nameof(Ler) };

        /// <summary>Mudar o status (o paciente só pode cancelar — regra checada no controller).</summary>
        public static readonly OperationAuthorizationRequirement AlterarStatus = new() { Name = nameof(AlterarStatus) };

        public static readonly OperationAuthorizationRequirement Remarcar = new() { Name = nameof(Remarcar) };

        /// <summary>Editar, excluir e conduzir o exame — exclusivo do profissional delegado.</summary>
        public static readonly OperationAuthorizationRequirement Gerenciar = new() { Name = nameof(Gerenciar) };

        /// <summary>Ver a probabilidade de falta — dado interno da equipe, nunca do paciente.</summary>
        public static readonly OperationAuthorizationRequirement VerRisco = new() { Name = nameof(VerRisco) };
    }
}
