using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using System;

namespace ClinicaMaisSaude.Domain.Services
{
    /// <summary>
    /// Regras da máquina de estados do Agendamento (transições de status permitidas e
    /// restrições de tempo associadas) e de compatibilidade entre tipo de profissional e
    /// tipo de consulta. Lógica pura (sem I/O), extraída do AgendamentoService para ser
    /// diretamente testável — a entidade em si não valida suas próprias transições.
    /// </summary>
    public static class MaquinaEstadosAgendamento
    {
        public static ResultadoValidacao ValidarTransicao(Agendamento agendamento, StatusAgendamento novoStatus, DateTime agora)
        {
            var atual = agendamento.Status;
            var valida = false;

            switch (atual)
            {
                case StatusAgendamento.Agendado:
                    valida = novoStatus == StatusAgendamento.EmAtendimento ||
                             novoStatus == StatusAgendamento.Faltou ||
                             novoStatus == StatusAgendamento.Cancelado;
                    break;
                case StatusAgendamento.EmAtendimento:
                    valida = novoStatus == StatusAgendamento.Finalizado ||
                             (novoStatus == StatusAgendamento.AguardandoRetorno &&
                              agendamento.TipoConsulta == TipoConsulta.ConsultaMedica);
                    break;
                case StatusAgendamento.AguardandoRetorno:
                    valida = novoStatus == StatusAgendamento.RetornoAgendado;
                    break;
                case StatusAgendamento.RetornoAgendado:
                    valida = novoStatus == StatusAgendamento.Finalizado ||
                             novoStatus == StatusAgendamento.Faltou ||
                             novoStatus == StatusAgendamento.Cancelado;
                    break;
            }

            if (!valida)
            {
                if (novoStatus == StatusAgendamento.AguardandoRetorno &&
                    agendamento.TipoConsulta != TipoConsulta.ConsultaMedica)
                {
                    return ResultadoValidacao.Invalida("Apenas consultas médicas podem gerar retorno.");
                }

                return ResultadoValidacao.Invalida($"Transição de '{atual}' para '{novoStatus}' não é permitida.");
            }

            if (novoStatus == StatusAgendamento.EmAtendimento)
            {
                var limiteMinimo = agendamento.DataHoraConsulta.AddMinutes(-15);
                if (agora < limiteMinimo)
                {
                    return ResultadoValidacao.Invalida("Só é possível iniciar o atendimento a partir de 15 minutos antes do horário agendado.");
                }
            }

            if (novoStatus == StatusAgendamento.Faltou && agendamento.DataHoraConsulta > agora)
            {
                return ResultadoValidacao.Invalida("Não é possível registrar falta em agendamento futuro.");
            }

            return ResultadoValidacao.Valida();
        }

        public static ResultadoValidacao ValidarCompatibilidade(TipoProfissional tipo, TipoConsulta consulta)
        {
            var enfermeiraPode = consulta == TipoConsulta.Triagem ||
                                consulta == TipoConsulta.Exame ||
                                consulta == TipoConsulta.Vacina;

            var medicoPode = consulta == TipoConsulta.ConsultaMedica ||
                             consulta == TipoConsulta.Retorno;

            if (tipo == TipoProfissional.Enfermeira && !enfermeiraPode)
                return ResultadoValidacao.Invalida("Profissional não habilitado para este tipo de consulta.");

            if (tipo == TipoProfissional.Medico && !medicoPode)
                return ResultadoValidacao.Invalida("Profissional não habilitado para este tipo de consulta.");

            return ResultadoValidacao.Valida();
        }
    }
}
