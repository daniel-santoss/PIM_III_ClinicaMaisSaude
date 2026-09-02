using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Primeiro acesso do auto-cadastro moderado (Thread D — D4). O proponente APROVADO (Pessoa sem
    /// conta + SolicitacaoCadastro aprovada) pede um código por e-mail, confirma com o CPF e define a
    /// senha — só então a conta (Usuario) é criada e o Paciente é ativado. Reusa a máquina de código
    /// de e-mail da recuperação de senha (mesma cripto), mas o desfecho é criar a conta, não trocá-la.
    /// </summary>
    public interface IPrimeiroAcessoService
    {
        /// <summary>Passo 1: envia o código ao e-mail do proponente aprovado (silencioso/genérico).</summary>
        Task SolicitarAsync(SolicitarPrimeiroAcessoRequest request);

        /// <summary>Passo 2: valida código + CPF e devolve um reset token de uso único.</summary>
        Task<ValidarCodigoResponse> ConfirmarAsync(ConfirmarPrimeiroAcessoRequest request);

        /// <summary>Passo 3: cria a conta com a senha definida e ativa o paciente.</summary>
        Task DefinirSenhaAsync(DefinirSenhaPrimeiroAcessoRequest request);
    }
}
