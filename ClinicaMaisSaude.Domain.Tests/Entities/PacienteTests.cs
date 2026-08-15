using System;
using ClinicaMaisSaude.Domain.Entities;

namespace ClinicaMaisSaude.Domain.Tests.Entities
{
    // Invariantes de ativação/encerramento do paciente. O login passou a bloquear
    // pacientes inativos (soft-delete = exclusão de conta), então estes contratos
    // sustentam essa regra de segurança.
    public class PacienteTests
    {
        // Identidade (Nome/Cpf/Telefone/Email) vive no LoginPortal; o Paciente só referencia a conta.
        private static Paciente NovoPaciente() =>
            new(Guid.NewGuid());

        [Fact]
        public void Paciente_NasceAtivo()
        {
            var paciente = NovoPaciente();
            Assert.True(paciente.Ativo);
        }

        [Fact]
        public void Desativar_TornaPacienteInativo()
        {
            var paciente = NovoPaciente();

            paciente.Desativar();

            Assert.False(paciente.Ativo);
        }

        [Fact]
        public void Desativar_EhIdempotente()
        {
            var paciente = NovoPaciente();

            paciente.Desativar();
            paciente.Desativar();

            Assert.False(paciente.Ativo);
        }

        [Fact]
        public void AtualizarDados_NaoReativaContaEncerrada()
        {
            var paciente = NovoPaciente();
            paciente.Desativar();

            // Editar o perfil não deve "ressuscitar" uma conta encerrada.
            paciente.Atualizar(true);

            Assert.False(paciente.Ativo);
        }
    }
}
