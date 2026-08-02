using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Services
{
    public class NotificacaoBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<NotificacaoBackgroundService> _logger;

        public NotificacaoBackgroundService(IServiceProvider serviceProvider, ILogger<NotificacaoBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessarNotificacoesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro ao processar notificações no BackgroundService.");
                }

                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task ProcessarNotificacoesAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();

            var agora = DateTime.UtcNow;

            // Janela temporal: todas as regras (lembrete de hoje, 2h antes, "não finalizada"
            // = DataHora+2h no passado recente) caem numa faixa curta em torno de agora.
            // Sem esse filtro, a query cresceria indefinidamente conforme a base acumula.
            var inicioJanela = agora.AddDays(-2);
            var fimJanela = agora.AddDays(2);

            // Busca os agendamentos pendentes ou em atendimento (não finalizados/cancelados) na janela.
            var agendamentos = await dbContext.Agendamentos
                .Include(a => a.Paciente)
                .Where(a => (a.Status == StatusAgendamento.Agendado || a.Status == StatusAgendamento.EmAtendimento)
                            && a.DataHoraConsulta >= inicioJanela && a.DataHoraConsulta <= fimJanela)
                .ToListAsync(stoppingToken);

            foreach (var a in agendamentos)
            {
                // Regra de Consulta Não Finalizada: DataHora + 2h < agora
                if (!a.NotificacaoPendenteGerada && a.DataHoraConsulta.AddHours(2) < agora)
                {
                    // Buscar o UsuárioId vinculado a este profissional para notificá-lo
                    var profissional = await dbContext.Profissionais.FirstOrDefaultAsync(p => p.Id == a.ProfissionalId, stoppingToken);
                    if (profissional != null)
                    {
                        var msg = $"Consulta de {a.Paciente.Nome} em {a.DataHoraConsulta:dd/MM/yyyy} às {a.DataHoraConsulta:HH:mm} não foi finalizada. Atualize o status.";
                        var notificacao = new Notificacao(profissional.UsuarioId, "Consulta não finalizada", msg, a.Id, link: $"agendamentos?id={a.Id}");
                        
                        dbContext.Notificacoes.Add(notificacao);
                        a.MarcarNotificacaoPendenteGerada();
                    }
                }

                // Lembrete: No dia da consulta a partir das 00:00 (LembreteManha)
                if (!a.LembreteManhaEnviado && a.Paciente.UsuarioId.HasValue && a.DataHoraConsulta.Date == agora.Date)
                {
                    var msg = $"Sua consulta de {a.TipoConsulta} está agendada para hoje às {a.DataHoraConsulta:HH:mm}.";
                    var notificacao = new Notificacao(a.Paciente.UsuarioId.Value, "Você tem consulta hoje", msg, a.Id, link: $"agendamentos?id={a.Id}");

                    dbContext.Notificacoes.Add(notificacao);
                    a.MarcarLembreteManhaEnviado();
                }

                // Lembrete: 2 horas antes da consulta
                var duasHorasAntes = a.DataHoraConsulta.AddHours(-2);
                if (!a.LembreteDuasHorasEnviado && a.Paciente.UsuarioId.HasValue && agora >= duasHorasAntes && agora < a.DataHoraConsulta)
                {
                    var msg = $"Sua consulta está marcada para hoje às {a.DataHoraConsulta:HH:mm}. Não esqueça!";
                    var notificacao = new Notificacao(a.Paciente.UsuarioId.Value, "Lembrete de consulta", msg, a.Id, link: $"agendamentos?id={a.Id}");

                    dbContext.Notificacoes.Add(notificacao);
                    a.MarcarLembreteDuasHorasEnviado();
                }
            }

            await dbContext.SaveChangesAsync(stoppingToken);
        }
    }
}
