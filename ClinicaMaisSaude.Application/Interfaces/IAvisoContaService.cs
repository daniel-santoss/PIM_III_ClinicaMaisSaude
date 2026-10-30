using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Avisos por e-mail sobre mudanças sensíveis na conta (feitas pelo próprio usuário ou pela clínica).
    /// O envio é "melhor esforço": falhar o e-mail não desfaz a alteração.
    /// </summary>
    public interface IAvisoContaService
    {
        /// <summary>
        /// Avisa o endereço antigo e o novo que o e-mail da conta mudou: o antigo descobre uma troca
        /// que não pediu; no novo, a falta do aviso revela um endereço digitado errado.
        /// </summary>
        Task AvisarTrocaDeEmailAsync(string nome, string emailAntigo, string emailNovo);
    }
}
