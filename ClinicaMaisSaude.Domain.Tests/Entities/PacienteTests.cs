using System;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;

namespace ClinicaMaisSaude.Domain.Tests.Entities
{
    // Invariantes de situação do paciente (Situacao). O login passou a bloquear
    // pacientes não-ativos (desativado/excluído/banido), então estes contratos
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
            Assert.Equal(Situacao.Ativo, paciente.Situacao);
            Assert.True(paciente.EstaAtivo);
        }

        [Fact]
        public void Desativar_TornaContaDesativada()
        {
            var paciente = NovoPaciente();

            paciente.Desativar();

            Assert.Equal(Situacao.Inativo, paciente.Situacao);
            Assert.False(paciente.EstaAtivo);
        }

        [Fact]
        public void Excluir_TornaContaExcluida()
        {
            var paciente = NovoPaciente();

            paciente.Excluir();

            Assert.Equal(Situacao.Excluido, paciente.Situacao);
            Assert.False(paciente.EstaAtivo);
        }

        [Fact]
        public void Banir_TornaContaBanida()
        {
            var paciente = NovoPaciente();

            paciente.Banir();

            Assert.Equal(Situacao.Banido, paciente.Situacao);
            Assert.False(paciente.EstaAtivo);
        }

        [Fact]
        public void Reativar_VoltaParaAtivo()
        {
            var paciente = NovoPaciente();
            paciente.Banir();

            paciente.Reativar();

            Assert.Equal(Situacao.Ativo, paciente.Situacao);
            Assert.True(paciente.EstaAtivo);
        }

        [Fact]
        public void AtualizarDados_NaoReativaContaEncerrada()
        {
            var paciente = NovoPaciente();
            paciente.Excluir();

            // Editar o perfil não deve "ressuscitar" uma conta encerrada.
            paciente.Atualizar(true);

            Assert.False(paciente.EstaAtivo);
        }
    }
}
