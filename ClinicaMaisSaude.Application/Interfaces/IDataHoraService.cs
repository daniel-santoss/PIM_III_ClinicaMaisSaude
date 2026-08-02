using System;

namespace ClinicaMaisSaude.Application.Interfaces
{
    /// <summary>
    /// Fonte central de data/hora e de conversão para o fuso de Brasília. Injetável e
    /// testável (evita DateTime.UtcNow e resolução de fuso espalhados/inline pelo código).
    /// </summary>
    public interface IDataHoraService
    {
        /// <summary>Instante atual em UTC.</summary>
        DateTime UtcNow { get; }

        /// <summary>Instante atual já convertido para o horário de Brasília.</summary>
        DateTime AgoraBrasilia { get; }

        /// <summary>Converte um horário UTC para o horário de Brasília.</summary>
        DateTime ParaBrasilia(DateTime utc);
    }
}
