using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Verificação de posse do e-mail no auto-cadastro (wizard web): antes da Declaração de Saúde, o
    /// proponente prova que o e-mail é dele confirmando um código. O <see cref="ConfirmarAsync"/> emite
    /// um token de curta duração que o envio final da solicitação exige (amarrando o e-mail verificado).
    /// </summary>
    public interface IVerificacaoEmailService
    {
        Task SolicitarAsync(SolicitarVerificacaoEmailRequest request);
        Task<VerificacaoEmailTokenResponse> ConfirmarAsync(ConfirmarVerificacaoEmailRequest request);
    }
}
