using System;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.Escala;
using ClinicaMaisSaude.Application.DTOs.Profissional;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Services;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ClinicaMaisSaude.Infrastructure.Tests.Services
{
    // Controle da escala 12x36 (calendário, detalhe do dia, ausências) e troca de escala do
    // profissional, contra EF InMemory. As datas são relativas a hoje para respeitar a regra de
    // "não registrar ausência no passado".
    public class EscalaServiceTests : IDisposable
    {
        private readonly ClinicaDbContext _context;
        private readonly EscalaService _service;
        private readonly Guid _adminId;
        private int _sequencia;

        public EscalaServiceTests()
        {
            var options = new DbContextOptionsBuilder<ClinicaDbContext>()
                .UseInMemoryDatabase($"escala-{Guid.NewGuid()}")
                .Options;
            _context = new ClinicaDbContext(options);
            _service = new EscalaService(_context);
            _adminId = SemearUsuario("Admin", RoleUsuario.Admin).Id;
        }

        private static DateTime Hoje => DateTime.UtcNow.AddHours(-3).Date;

        // Próximo dia (a partir de amanhã) em que a escala informada está de plantão.
        private static DateTime ProximoDia(EscalaTrabalho escala)
        {
            var dia = Hoje.AddDays(1);
            return Expediente.EscalaDoDia(dia) == escala ? dia : dia.AddDays(1);
        }

        private Usuario SemearUsuario(string nome, RoleUsuario role)
        {
            _sequencia++;
            var pessoa = new Pessoa(nome, $"0000000000{_sequencia}"[^11..], $"pessoa{_sequencia}@teste.com");
            _context.Pessoas.Add(pessoa);
            var usuario = new Usuario(pessoa.Id, "hash", role);
            _context.Usuarios.Add(usuario);
            _context.SaveChanges();
            return usuario;
        }

        private Profissional SemearProfissional(string nome, RoleUsuario role, EscalaTrabalho escala)
        {
            var usuario = SemearUsuario(nome, role);
            var prof = new Profissional(usuario.Id, escala: escala);
            prof.VincularPessoa(usuario.PessoaId!.Value);
            _context.Profissionais.Add(prof);
            _context.SaveChanges();
            return prof;
        }

        private Agendamento SemearConsulta(Guid profissionalId, DateTime dataHora)
        {
            var usuario = SemearUsuario("Paciente", RoleUsuario.Paciente);
            var paciente = new Paciente(usuario.Id);
            paciente.VincularPessoa(usuario.PessoaId!.Value);
            _context.Pacientes.Add(paciente);
            var agendamento = new Agendamento(paciente.Id, profissionalId, dataHora, TipoProfissional.Medico, TipoConsulta.ConsultaMedica);
            _context.Agendamentos.Add(agendamento);
            _context.SaveChanges();
            return agendamento;
        }

        private Task<EscalaDiaResponse> ObterDia(DateTime dia) => _service.ObterDiaAsync(dia, null, 1, 50);

        [Fact]
        public async Task ObterMes_ContaProfissionaisDePlantaoPorDia()
        {
            SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            SemearProfissional("Dra. Paula", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            SemearProfissional("Enf. Bruno", RoleUsuario.Enfermeira, EscalaTrabalho.Escala2);

            var mes = await _service.ObterMesAsync(2026, 11);

            Assert.Equal(30, mes.Dias.Count);
            var diaEscala1 = mes.Dias.First(d => d.Escala == 1);
            Assert.Equal((2, 0), (diaEscala1.Medicos, diaEscala1.Enfermeiras));
            var diaEscala2 = mes.Dias.First(d => d.Escala == 2);
            Assert.Equal((0, 1), (diaEscala2.Medicos, diaEscala2.Enfermeiras));

            // Cartões: composição de cada escala e o resumo de hoje (mesmo com outro mês aberto).
            var composicao1 = mes.Composicao.Single(c => c.Escala == 1);
            Assert.Equal((2, 0), (composicao1.Medicos, composicao1.Enfermeiras));
            Assert.Equal(Hoje, mes.Hoje.Data);

        }

        [Fact]
        public async Task RegistrarAusencia_FechaOPlantaoEListaAsConsultasARemarcar()
        {
            var dia = ProximoDia(EscalaTrabalho.Escala1);
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            SemearProfissional("Dra. Paula", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            var consulta = SemearConsulta(medico.Id, dia.AddHours(9));

            var resultado = await _service.RegistrarAusenciaAsync(
                new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = dia, Motivo = "Atestado médico" }, _adminId);

            Assert.Equal(1, resultado.ConsultasARemarcar);
            Assert.Equal("Admin", resultado.Ausencia.RegistradoPor);

            var mes = await _service.ObterMesAsync(dia.Year, dia.Month);
            var resumo = mes.Dias.Single(d => d.Data == dia);
            Assert.Equal(1, resumo.Medicos); // só a Dra. Paula continua de plantão
            Assert.Equal(1, resumo.Ausencias);
            Assert.Equal(1, resumo.ConsultasARemarcar);

            var detalhe = await ObterDia(dia);
            Assert.Equal("Atestado médico", detalhe.Profissionais.Itens.Single(p => p.Id == medico.Id).Ausencia?.Motivo);
            var aRemarcar = Assert.Single(detalhe.ConsultasARemarcar);
            Assert.Equal(consulta.Id, aRemarcar.Id);
            Assert.Equal("Ausência", aRemarcar.Motivo);
        }

        [Fact]
        public async Task RegistrarAusencia_ForaDaEscalaDoProfissional_Falha()
        {
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);

            await Assert.ThrowsAsync<BusinessRuleException>(() => _service.RegistrarAusenciaAsync(
                new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = ProximoDia(EscalaTrabalho.Escala2), Motivo = "Folga" }, _adminId));
        }

        [Fact]
        public async Task RegistrarAusencia_DuplicadaOuSemMotivo_Falha()
        {
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            var dia = ProximoDia(EscalaTrabalho.Escala1);
            await _service.RegistrarAusenciaAsync(new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = dia, Motivo = "Folga" }, _adminId);

            await Assert.ThrowsAsync<BusinessRuleException>(() => _service.RegistrarAusenciaAsync(
                new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = dia, Motivo = "De novo" }, _adminId));
            await Assert.ThrowsAsync<ValidationException>(() => _service.RegistrarAusenciaAsync(
                new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = dia.AddDays(2), Motivo = "  " }, _adminId));
        }

        [Fact]
        public async Task RegistrarAusencia_EmDataPassada_RegistraEListaAConsultaQueFicouSemAtendimento()
        {
            // Quem esqueceu de lançar na hora corrige depois: o calendário passa a mostrar a falta.
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            var diaPassado = Hoje.AddDays(-2);
            if (Expediente.EscalaDoDia(diaPassado) != EscalaTrabalho.Escala1) diaPassado = diaPassado.AddDays(-1);
            var consulta = SemearConsulta(medico.Id, diaPassado.AddHours(9));

            await _service.RegistrarAusenciaAsync(
                new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = diaPassado, Motivo = "Faltou sem avisar" }, _adminId);

            var detalhe = await ObterDia(diaPassado);
            Assert.NotNull(detalhe.Profissionais.Itens.Single().Ausencia);
            Assert.Equal(consulta.Id, Assert.Single(detalhe.ConsultasARemarcar).Id);

            var mes = await _service.ObterMesAsync(diaPassado.Year, diaPassado.Month);
            Assert.Equal(1, mes.Dias.Single(d => d.Data == diaPassado).Ausencias);
        }

        [Fact]
        public async Task RemoverAusencia_ReabreOPlantao()
        {
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            var dia = ProximoDia(EscalaTrabalho.Escala1);
            var registrada = await _service.RegistrarAusenciaAsync(
                new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = dia, Motivo = "Folga" }, _adminId);

            await _service.RemoverAusenciaAsync(registrada.Ausencia.Id);

            var detalhe = await ObterDia(dia);
            Assert.Null(detalhe.Profissionais.Itens.Single().Ausencia);
            Assert.Equal(0, await _context.AusenciasProfissional.CountAsync());
        }

        [Fact]
        public async Task ObterMes_ProfissionalAindaNaoComecou_NaoContaAntesDoPrimeiroPlantao()
        {
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            var inicio = ProximoDia(EscalaTrabalho.Escala1).AddDays(2);
            await new ProfissionalService(_context).AtualizarAsync(medico.Id, new ProfissionalUpdateRequest { InicioPlantoes = inicio });

            var antes = await ObterDia(inicio.AddDays(-2));
            var noInicio = await ObterDia(inicio);

            Assert.Empty(antes.Profissionais.Itens);
            Assert.Single(noInicio.Profissionais.Itens);
        }

        [Fact]
        public async Task MudarInicio_ComConsultaFuturaQueFicariaForaDosPlantoes_Bloqueia()
        {
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            SemearConsulta(medico.Id, ProximoDia(EscalaTrabalho.Escala1).AddHours(9));
            var profissionalService = new ProfissionalService(_context);

            await Assert.ThrowsAsync<BusinessRuleException>(() => profissionalService.AtualizarAsync(medico.Id,
                new ProfissionalUpdateRequest { InicioPlantoes = ProximoDia(EscalaTrabalho.Escala2) }));
            Assert.Equal(EscalaTrabalho.Escala1, (await _context.Profissionais.AsNoTracking().SingleAsync(p => p.Id == medico.Id)).Escala);
        }

        [Fact]
        public async Task MudarInicio_TrocaAEscalaEGuardaAsAusenciasQueFicamSemEfeito()
        {
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            var diaAusencia = ProximoDia(EscalaTrabalho.Escala1);
            await _service.RegistrarAusenciaAsync(
                new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = diaAusencia, Motivo = "Compromisso" }, _adminId);

            var novoInicio = ProximoDia(EscalaTrabalho.Escala2);
            await new ProfissionalService(_context).AtualizarAsync(medico.Id, new ProfissionalUpdateRequest { InicioPlantoes = novoInicio });

            var prof = await _context.Profissionais.AsNoTracking().SingleAsync(p => p.Id == medico.Id);
            Assert.Equal((EscalaTrabalho.Escala2, novoInicio), (prof.Escala, prof.InicioPlantoes));
            // A ausência continua guardada, mas o dia deixou de ser plantão: não conta no calendário.
            Assert.Equal(1, await _context.AusenciasProfissional.CountAsync());
            var mes = await _service.ObterMesAsync(diaAusencia.Year, diaAusencia.Month);
            Assert.Equal(0, mes.Dias.Single(d => d.Data == diaAusencia).Ausencias);
        }

        [Fact]
        public async Task ObterDia_PaginaEFiltraOsProfissionaisPorNome()
        {
            var dia = ProximoDia(EscalaTrabalho.Escala1);
            for (var i = 1; i <= 5; i++)
                SemearProfissional($"Enfermeira {i}", RoleUsuario.Enfermeira, EscalaTrabalho.Escala1);
            SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            SemearProfissional("Dra. Paula", RoleUsuario.Medico, EscalaTrabalho.Escala2); // não é deste dia

            var pagina2 = await _service.ObterDiaAsync(dia, null, 2, 4);
            var busca = await _service.ObterDiaAsync(dia, "Carlos", 1, 4);

            Assert.Equal((6, 2), (pagina2.Profissionais.Total, pagina2.Profissionais.Itens.Count));
            Assert.Equal((1, 5), (pagina2.Medicos, pagina2.Enfermeiras));
            Assert.Equal("Dr. Carlos", Assert.Single(busca.Profissionais.Itens).Nome);
        }

        [Fact]
        public async Task BuscarProfissionais_DevolveNoMaximoDezPorNome()
        {
            for (var i = 1; i <= 12; i++)
                SemearProfissional($"Médico {i:00}", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            SemearProfissional("Grazielle", RoleUsuario.Enfermeira, EscalaTrabalho.Escala2);

            Assert.Equal(10, (await _service.BuscarProfissionaisAsync(null)).Count);
            var achados = await _service.BuscarProfissionaisAsync("Graz");
            Assert.Equal(("Grazielle", "Enfermeira"), (Assert.Single(achados).Nome, achados[0].Tipo));
        }

        [Fact]
        public async Task ObterMesDoProfissional_MarcaPlantoesAusenciaEConsultas()
        {
            var medico = SemearProfissional("Dr. Carlos", RoleUsuario.Medico, EscalaTrabalho.Escala1);
            var dia = ProximoDia(EscalaTrabalho.Escala1);
            SemearConsulta(medico.Id, dia.AddHours(9));
            await _service.RegistrarAusenciaAsync(new RegistrarAusenciaRequest { ProfissionalId = medico.Id, Data = dia, Motivo = "Folga" }, _adminId);

            var mes = await _service.ObterMesDoProfissionalAsync(medico.Id, dia.Year, dia.Month);

            var diaDaAusencia = mes.Dias.Single(d => d.Data == dia);
            Assert.True(diaDaAusencia.Plantao);
            Assert.Equal(1, diaDaAusencia.Consultas);
            Assert.Equal("Folga", diaDaAusencia.Ausencia?.Motivo);
            // Dias seguidos alternam entre plantão e folga.
            Assert.All(mes.Dias.Zip(mes.Dias.Skip(1)), par => Assert.NotEqual(par.First.Plantao, par.Second.Plantao));
        }

        public void Dispose() => _context.Dispose();
    }
}
