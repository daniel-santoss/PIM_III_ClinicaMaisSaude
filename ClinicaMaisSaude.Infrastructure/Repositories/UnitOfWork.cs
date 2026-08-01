using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Repositories
{
    /// <summary>
    /// Implementação de <see cref="IUnitOfWork"/> sobre o <see cref="ClinicaDbContext"/>.
    /// Como o DbContext é registrado com tempo de vida Scoped, todos os repositórios do
    /// mesmo request compartilham esta instância — logo, seus SaveChanges participam da
    /// transação aberta aqui e só são efetivados no Commit.
    /// </summary>
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ClinicaDbContext _context;

        public UnitOfWork(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task ExecuteInTransactionAsync(Func<Task> operacao)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    await operacao();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operacao)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var resultado = await operacao();
                    await transaction.CommitAsync();
                    return resultado;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
    }
}
