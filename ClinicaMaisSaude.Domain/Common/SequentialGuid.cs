using System;
using System.Threading;

namespace ClinicaMaisSaude.Domain.Common
{
    /// <summary>
    /// Gera GUIDs sequenciais na ordenação do SQL Server (padrão COMB), evitando a
    /// fragmentação do índice clusterizado causada por GUIDs totalmente aleatórios.
    ///
    /// Os 8 bytes altos (0-7) permanecem aleatórios — preserva a não-enumerabilidade
    /// exigida pela segurança do domínio. Os bytes 8-15, que o SQL Server usa como
    /// mais significativos na ordenação, recebem um contador monotônico semeado pelo
    /// horário UTC, tornando os inserts fisicamente crescentes no disco.
    ///
    /// Algoritmo portado do SequentialGuidValueGenerator do EF Core (MIT).
    /// </summary>
    public static class SequentialGuid
    {
        private static long _counter = DateTime.UtcNow.Ticks;

        public static Guid Next()
        {
            var guidBytes = Guid.NewGuid().ToByteArray();
            var counterBytes = BitConverter.GetBytes(Interlocked.Increment(ref _counter));

            if (!BitConverter.IsLittleEndian)
            {
                Array.Reverse(counterBytes);
            }

            guidBytes[08] = counterBytes[1];
            guidBytes[09] = counterBytes[0];
            guidBytes[10] = counterBytes[7];
            guidBytes[11] = counterBytes[6];
            guidBytes[12] = counterBytes[5];
            guidBytes[13] = counterBytes[4];
            guidBytes[14] = counterBytes[3];
            guidBytes[15] = counterBytes[2];

            return new Guid(guidBytes);
        }
    }
}
