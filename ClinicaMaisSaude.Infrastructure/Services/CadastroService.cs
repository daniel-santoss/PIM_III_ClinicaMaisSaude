using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    public class CadastroService : ICadastroService
    {
        private readonly ClinicaDbContext _context;

        public CadastroService(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<CadastroResult> CadastrarAsync(CadastroRequest request)
        {
            // Normalização do e-mail (tudo minúsculo)
            request.Email = request.Email.Trim().ToLowerInvariant();

            // Sanitização do CPF (responsabilidade da camada de serviço)
            var cpfLimpo = request.Cpf.Replace(".", "").Replace("-", "").Trim();

            if (cpfLimpo.Length != 11 || !IsCpfValido(cpfLimpo))
            {
                return new CadastroResult { Sucesso = false, Mensagem = "O CPF informado não é matematicamente válido." };
            }

            if (await _context.Usuarios.AnyAsync(u => u.Cpf == cpfLimpo || u.Email == request.Email))
            {
                return new CadastroResult { Sucesso = false, Mensagem = "Já existe um usuário com este CPF ou E-mail." };
            }

            // Validação de CRM obrigatório para Médicos
            if (request.TipoUsuario == PerfisUsuario.Medico)
            {
                if (string.IsNullOrWhiteSpace(request.Crm) || request.Crm.Length != 6 || !request.Crm.All(char.IsDigit))
                {
                    return new CadastroResult { Sucesso = false, Mensagem = "Médicos devem possuir um CRM numérico válido de exatos 6 dígitos." };
                }
                if (string.IsNullOrWhiteSpace(request.UfCrm))
                {
                    return new CadastroResult { Sucesso = false, Mensagem = "UF do CRM é obrigatória para médicos." };
                }
            }

            // Hash da senha
            var senhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha);

            // Papel (grosso) da conta a partir do tipo solicitado.
            TipoUsuario tipoConta;
            if (request.TipoUsuario == PerfisUsuario.Paciente)
                tipoConta = TipoUsuario.Paciente;
            else if (request.TipoUsuario == PerfisUsuario.Medico || request.TipoUsuario == PerfisUsuario.Enfermeira)
                tipoConta = TipoUsuario.Profissional;
            else
                return new CadastroResult { Sucesso = false, Mensagem = "Tipo de usuário inválido." };

            // Criação da identidade (LoginPortal)
            var novoUsuario = new Usuario(request.Email, cpfLimpo, senhaHash, tipoConta);
            _context.Usuarios.Add(novoUsuario);

            // Criação do perfil associado
            if (request.TipoUsuario == PerfisUsuario.Paciente)
            {
                var paciente = new Paciente(request.Nome, cpfLimpo, "00000000000", request.Email, request.TemProblemaMemoria);
                paciente.VincularUsuario(novoUsuario.Id);
                _context.Pacientes.Add(paciente);
            }
            else if (request.TipoUsuario == PerfisUsuario.Medico || request.TipoUsuario == PerfisUsuario.Enfermeira)
            {
                var tipo = request.TipoUsuario == PerfisUsuario.Medico ? TipoProfissional.Medico : TipoProfissional.Enfermeira;
                var profissional = new Profissional(novoUsuario.Id, tipo, request.Nome, request.Crm, request.UfCrm);
                _context.Profissionais.Add(profissional);
            }
            else
            {
                return new CadastroResult { Sucesso = false, Mensagem = "Tipo de usuário inválido." };
            }

            await _context.SaveChangesAsync();
            return new CadastroResult { Sucesso = true, Mensagem = "Usuário cadastrado com sucesso!" };
        }

        public async Task<IEnumerable<UsuarioResponse>> ListarUsuariosAsync()
        {
            var usuarios = await _context.Usuarios.AsNoTracking().ToListAsync();
            var profissionais = await _context.Profissionais.AsNoTracking().ToListAsync();
            var pacientes = await _context.Pacientes.AsNoTracking().ToListAsync();

            var resposta = new List<UsuarioResponse>();

            foreach (var u in usuarios)
            {
                string nome = "Admin (Sistema)";
                string tipo = "Admin";

                var prof = profissionais.FirstOrDefault(p => p.UsuarioId == u.Id);
                var pac = pacientes.FirstOrDefault(p => p.UsuarioId == u.Id);

                if (prof != null)
                {
                    tipo = prof.TipoProfissional.ToString();
                    nome = prof.Nome;
                }
                else if (pac != null)
                {
                    tipo = PerfisUsuario.Paciente;
                    nome = pac.Nome;
                }

                resposta.Add(new UsuarioResponse
                {
                    Id = u.Id,
                    Nome = nome,
                    Email = u.Email,
                    Cpf = u.Cpf,
                    TipoUsuario = tipo
                });
            }

            return resposta;
        }

        public async Task<CadastroResult> RedefinirSenhaAsync(Guid id, string novaSenha)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return new CadastroResult { Sucesso = false, Mensagem = "Usuário não encontrado." };
            }

            var senhaHash = BCrypt.Net.BCrypt.HashPassword(novaSenha);
            usuario.AlterarSenha(senhaHash);

            await _context.SaveChangesAsync();

            return new CadastroResult { Sucesso = true, Mensagem = "Senha redefinida com sucesso." };
        }

        private bool IsCpfValido(string cpf)
        {
            int[] multiplicador1 = new int[9] { 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            int[] multiplicador2 = new int[10] { 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            string tempCpf;
            string digito;
            int soma;
            int resto;

            if (cpf.Distinct().Count() == 1) return false;

            tempCpf = cpf.Substring(0, 9);
            soma = 0;

            for (int i = 0; i < 9; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador1[i];

            resto = soma % 11;
            if (resto < 2) resto = 0;
            else resto = 11 - resto;

            digito = resto.ToString();
            tempCpf = tempCpf + digito;
            soma = 0;
            for (int i = 0; i < 10; i++)
                soma += int.Parse(tempCpf[i].ToString()) * multiplicador2[i];

            resto = soma % 11;
            if (resto < 2) resto = 0;
            else resto = 11 - resto;

            digito = digito + resto.ToString();
            return cpf.EndsWith(digito);
        }

        public async Task PurgeTestsAsync()
        {
            var testUserIds = await _context.Usuarios
                .Where(u => u.Email.Contains(".homologacao."))
                .Select(u => u.Id)
                .ToListAsync();

            if (!testUserIds.Any()) return;

            var testPatientIds = await _context.Pacientes
                .Where(p => p.Email.Contains(".homologacao.") || (p.UsuarioId.HasValue && testUserIds.Contains(p.UsuarioId.Value)))
                .Select(p => p.Id)
                .ToListAsync();

            var testProfessionalIds = await _context.Profissionais
                .Where(p => testUserIds.Contains(p.UsuarioId))
                .Select(p => p.Id)
                .ToListAsync();

            var agendamentoIds = await _context.Agendamentos
                .Where(a => testPatientIds.Contains(a.PacienteId) || testProfessionalIds.Contains(a.ProfissionalId))
                .Select(a => a.Id)
                .ToListAsync();

            if (agendamentoIds.Any())
            {
                var historicos = await _context.AgendamentoHistoricos
                    .Where(h => agendamentoIds.Contains(h.AgendamentoId))
                    .ToListAsync();
                _context.AgendamentoHistoricos.RemoveRange(historicos);

                var agendamentos = await _context.Agendamentos
                    .Where(a => agendamentoIds.Contains(a.Id))
                    .ToListAsync();
                _context.Agendamentos.RemoveRange(agendamentos);
            }

            var violacoes = await _context.ViolacoesIA
                .Where(v => testUserIds.Contains(v.UsuarioId))
                .ToListAsync();
            _context.ViolacoesIA.RemoveRange(violacoes);

            var tokens = await _context.RefreshTokens
                .Where(t => testUserIds.Contains(t.UsuarioId))
                .ToListAsync();
            _context.RefreshTokens.RemoveRange(tokens);

            var notificacoes = await _context.Notificacoes
                .Where(n => testUserIds.Contains(n.UsuarioId))
                .ToListAsync();
            _context.Notificacoes.RemoveRange(notificacoes);

            if (testPatientIds.Any())
            {
                var pacientes = await _context.Pacientes
                    .Where(p => testPatientIds.Contains(p.Id))
                    .ToListAsync();
                _context.Pacientes.RemoveRange(pacientes);
            }

            if (testProfessionalIds.Any())
            {
                var especialidades = await _context.ProfissionalEspecialidades
                    .Where(pe => testProfessionalIds.Contains(pe.ProfissionalId))
                    .ToListAsync();
                _context.ProfissionalEspecialidades.RemoveRange(especialidades);

                var profissionais = await _context.Profissionais
                    .Where(p => testProfessionalIds.Contains(p.Id))
                    .ToListAsync();
                _context.Profissionais.RemoveRange(profissionais);
            }

            var usuarios = await _context.Usuarios
                .Where(u => testUserIds.Contains(u.Id))
                .ToListAsync();
            _context.Usuarios.RemoveRange(usuarios);

            await _context.SaveChangesAsync();
        }
    }
}
