using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Services
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
            if (request.TipoUsuario == "Medico")
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

            // Criação da identidade (LoginPortal)
            var novoUsuario = new Usuario(request.Email, cpfLimpo, senhaHash);
            _context.Usuarios.Add(novoUsuario);

            // Criação do perfil associado
            if (request.TipoUsuario == "Paciente")
            {
                var paciente = new Paciente(request.Nome, cpfLimpo, "00000000000", request.Email);
                paciente.VincularUsuario(novoUsuario.Id);
                _context.Pacientes.Add(paciente);
            }
            else if (request.TipoUsuario == "Medico" || request.TipoUsuario == "Enfermeira")
            {
                var tipo = request.TipoUsuario == "Medico" ? TipoProfissional.Medico : TipoProfissional.Enfermeira;
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
            var usuarios = await _context.Usuarios.ToListAsync();
            var profissionais = await _context.Profissionais.ToListAsync();
            var pacientes = await _context.Pacientes.ToListAsync();

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
                    tipo = "Paciente";
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
            
            _context.Usuarios.Update(usuario);
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
    }
}
