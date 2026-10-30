using System.Collections.Generic;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.Interfaces;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Registra os avisos pedidos em vez de enviar e-mail.
    public class AvisoContaFake : IAvisoContaService
    {
        public List<(string Nome, string Antigo, string Novo)> TrocasDeEmail { get; } = new();

        public Task AvisarTrocaDeEmailAsync(string nome, string emailAntigo, string emailNovo)
        {
            TrocasDeEmail.Add((nome, emailAntigo, emailNovo));
            return Task.CompletedTask;
        }
    }
}
