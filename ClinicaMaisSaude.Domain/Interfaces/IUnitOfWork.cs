using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Domain.Interfaces
{
    /// <summary>
    /// Executa um conjunto de operações de escrita dentro de uma única transação atômica.
    /// Se qualquer passo falhar, todas as alterações são desfeitas (rollback), evitando
    /// estados parcialmente persistidos (ex.: agendamento criado sem histórico/notificação).
    /// </summary>
    public interface IUnitOfWork
    {
        Task ExecuteInTransactionAsync(Func<Task> operacao);
        Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operacao);
    }
}
