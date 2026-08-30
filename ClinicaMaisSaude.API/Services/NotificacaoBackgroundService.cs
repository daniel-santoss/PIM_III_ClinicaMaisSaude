using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
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
            var notificador = scope.ServiceProvider.GetRequiredService<INotificadorTempoReal>();

            // Notificações criadas neste ciclo, para push em tempo real após o commit.
            var novasNotificacoes = new List<Notificacao>();

            var agora = DateTime.UtcNow;

            // Janela temporal: todas as regras (lembrete de hoje, 2h antes, "não finalizada"
            // = DataHora+2h no passado recente) caem numa faixa curta em torno de agora.
            // Sem esse filtro, a query cresceria indefinidamente conforme a base acumula.
            var inicioJanela = agora.AddDays(-2);
            var fimJanela = agora.AddDays(2);

            // Busca os agendamentos pendentes ou em atendimento (não finalizados/cancelados) na janela.
            var agendamentos = await dbContext.Agendamentos
                .Include(a => a.Paciente).ThenInclude(p => p.Pessoa)
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
                        var msg = $"Consulta de {a.Paciente.Pessoa?.Nome} em {a.DataHoraConsulta:dd/MM/yyyy} às {a.DataHoraConsulta:HH:mm} não foi finalizada. Atualize o status.";
                        var notificacao = new Notificacao(profissional.UsuarioId, "Consulta não finalizada", msg, a.Id, link: $"agendamentos?id={a.Id}");
                        
                        dbContext.Notificacoes.Add(notificacao);
                        novasNotificacoes.Add(notificacao);
                        a.MarcarNotificacaoPendenteGerada();
                    }
                }

                // Lembrete: No dia da consulta a partir das 00:00 (LembreteManha)
                if (!a.LembreteManhaEnviado && a.DataHoraConsulta.Date == agora.Date)
                {
                    var msg = $"Sua consulta de {a.TipoConsulta} está agendada para hoje às {a.DataHoraConsulta:HH:mm}.";
                    var notificacao = new Notificacao(a.Paciente.UsuarioId!.Value,"Você tem consulta hoje", msg, a.Id, link: $"agendamentos?id={a.Id}");

                    dbContext.Notificacoes.Add(notificacao);
                    novasNotificacoes.Add(notificacao);
                    a.MarcarLembreteManhaEnviado();
                }

                // Lembrete: 2 horas antes da consulta
                var duasHorasAntes = a.DataHoraConsulta.AddHours(-2);
                if (!a.LembreteDuasHorasEnviado && agora >= duasHorasAntes && agora < a.DataHoraConsulta)
                {
                    var msg = $"Sua consulta está marcada para hoje às {a.DataHoraConsulta:HH:mm}. Não esqueça!";
                    var notificacao = new Notificacao(a.Paciente.UsuarioId!.Value,"Lembrete de consulta", msg, a.Id, link: $"agendamentos?id={a.Id}");

                    dbContext.Notificacoes.Add(notificacao);
                    novasNotificacoes.Add(notificacao);
                    a.MarcarLembreteDuasHorasEnviado();
                }
            }

            await dbContext.SaveChangesAsync(stoppingToken);

            // Após o commit, empurra cada notificação ao respectivo usuário em tempo real.
            foreach (var notificacao in novasNotificacoes)
            {
                await notificador.NotificarAsync(notificacao);
            }
        }
    }
}
