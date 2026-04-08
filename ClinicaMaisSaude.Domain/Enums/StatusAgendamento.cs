using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Domain.Enums
{
    public enum StatusAgendamento
    {
        Agendado,
        AguardandoAtendimento,
        EmAtendimento,
        Concluido,
        Faltou
    }
}
