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

            // Unicidade de identidade vive na Pessoa (Thread B).
            if (await _context.Pessoas.AnyAsync(p => p.Cpf == cpfLimpo || p.Email == request.Email))
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

            // Telefone é opcional: se informado, sanitiza para só dígitos e exige DDD+9 (11).
            string? telefoneLimpo = null;
            if (!string.IsNullOrWhiteSpace(request.Telefone))
            {
                telefoneLimpo = new string(request.Telefone.Where(char.IsDigit).ToArray());
                if (telefoneLimpo.Length != 11)
                    return new CadastroResult { Sucesso = false, Mensagem = "Telefone inválido. Informe DDD + número (11 dígitos)." };
            }

            // Hash da senha
            var senhaHash = BCrypt.Net.BCrypt.HashPassword(request.Senha);

            // Papel unificado da conta a partir do tipo solicitado (com validação).
            RoleUsuario role;
            if (request.TipoUsuario == PerfisUsuario.Paciente)
                role = RoleUsuario.Paciente;
            else if (request.TipoUsuario == PerfisUsuario.Medico)
                role = RoleUsuario.Medico;
            else if (request.TipoUsuario == PerfisUsuario.Enfermeira)
                role = RoleUsuario.Enfermeira;
            else
                return new CadastroResult { Sucesso = false, Mensagem = "Tipo de usuário inválido." };

            // Identidade (Thread B): a Pessoa é a dona de Nome/Cpf/Email/Telefone. O LoginPortal
            // ainda recebe uma cópia enquanto suas colunas de identidade existirem (removidas no B3).
            var pessoa = new Pessoa(request.Nome, cpfLimpo, request.Email, telefoneLimpo);
            _context.Pessoas.Add(pessoa);

            // Criação da credencial (LoginPortal), vinculada à Pessoa (identidade).
            var novoUsuario = new Usuario(pessoa.Id, senhaHash, role);
            _context.Usuarios.Add(novoUsuario);

            // Criação do perfil associado (magro), vinculado à mesma Pessoa e à conta.
            if (request.TipoUsuario == PerfisUsuario.Paciente)
            {
                var paciente = new Paciente(novoUsuario.Id, request.TemProblemaMemoria);
                paciente.VincularPessoa(pessoa.Id);
                _context.Pacientes.Add(paciente);
            }
            else if (request.TipoUsuario == PerfisUsuario.Medico || request.TipoUsuario == PerfisUsuario.Enfermeira)
            {
                // Categoria vem do Role (definido acima); o Profissional é magro, sem TipoProfissional (Fase A3b).
                var profissional = new Profissional(novoUsuario.Id, request.Crm, request.UfCrm);
                profissional.VincularPessoa(pessoa.Id);
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
            var usuarios = await _context.Usuarios.AsNoTracking().Include(u => u.Pessoa).ToListAsync();

            var resposta = new List<UsuarioResponse>();

            foreach (var u in usuarios)
            {
                // Identidade vem da Pessoa (Thread B); o tipo é o Role (Fase A3).
                string tipo = u.Role.ToString();

                resposta.Add(new UsuarioResponse
                {
                    Id = u.Id,
                    Nome = u.Pessoa?.Nome,
                    Email = u.Pessoa?.Email,
                    Cpf = u.Pessoa?.Cpf,
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
            // Identidade (e-mail de teste) vive na Pessoa (Thread B).
            var testUsers = await _context.Usuarios
                .Where(u => u.Pessoa!.Email.Contains(".homologacao."))
                .Select(u => new { u.Id, u.PessoaId })
                .ToListAsync();

            if (!testUsers.Any()) return;

            var testUserIds = testUsers.Select(u => u.Id).ToList();
            // Identidade (Thread B): a criação passou a gerar uma Pessoa por usuário; o purge
            // precisa removê-las também, senão ficam órfãs.
            var testPessoaIds = testUsers.Where(u => u.PessoaId.HasValue).Select(u => u.PessoaId!.Value).ToList();

            var testPatientIds = await _context.Pacientes
                .Where(p => testUserIds.Contains(p.UsuarioId))
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

            var violacoes = await _context.UsoInadequadoIA
                .Where(v => testUserIds.Contains(v.UsuarioId))
                .ToListAsync();
            _context.UsoInadequadoIA.RemoveRange(violacoes);

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

            if (testPessoaIds.Any())
            {
                var pessoas = await _context.Pessoas
                    .Where(p => testPessoaIds.Contains(p.Id))
                    .ToListAsync();
                _context.Pessoas.RemoveRange(pessoas);
            }

            await _context.SaveChangesAsync();
        }
    }
}
