using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Autoatendimento de recuperação de senha em 3 passos: solicitar (envia código por e-mail),
    /// validar (troca o código por um reset token) e redefinir (usa o reset token p/ trocar a senha).
    /// </summary>
    public interface IRecuperacaoSenhaService
    {
        /// <summary>
        /// Gera e envia um código para o e-mail cadastrado, SE a conta existir. Sempre silencioso
        /// (não revela existência da conta) — o controller responde a mesma mensagem genérica.
        /// </summary>
        Task SolicitarAsync(SolicitarRecuperacaoRequest request);

        /// <summary>Valida o código e devolve um reset token de uso único. Lança em caso inválido/expirado.</summary>
        Task<ValidarCodigoResponse> ValidarCodigoAsync(ValidarCodigoRequest request);

        /// <summary>Redefine a senha a partir de um reset token válido. Lança em caso inválido/expirado.</summary>
        Task RedefinirSenhaAsync(RedefinirSenhaRequest request);
    }
}
