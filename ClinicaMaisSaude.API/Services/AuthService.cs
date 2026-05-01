using BCrypt.Net;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly ClinicaDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(ClinicaDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<LoginResponse> AutenticarAsync(LoginRequest request)
        {
            var cleanIdentificador = request.Identificador.Replace(".", "").Replace("-", "").Trim();
            var emailNormalizado = request.Identificador.Trim().ToLowerInvariant();

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Email == emailNormalizado || u.Cpf == cleanIdentificador);

            if (usuario == null)
            {
                throw new Exception("Credenciais inválidas.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash.Trim()))
            {
                throw new Exception("Credenciais inválidas.");
            }

            usuario.AtualizarUltimoAcesso();
            await _context.SaveChangesAsync();

            var perfilProfissional = await _context.Profissionais.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);
            var perfilPaciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);

            string tipoUsuarioStr = "Admin";
            Guid? pacienteId = null;

            if (perfilProfissional != null)
            {
                tipoUsuarioStr = perfilProfissional.TipoProfissional.ToString();
            }
            else if (perfilPaciente != null)
            {
                tipoUsuarioStr = "Paciente";
                pacienteId = perfilPaciente.Id;
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var secretKey = _configuration["JwtConfig:Secret"] ?? "minha-chave-super-secreta-pim-iii-123456789!?";
            var key = Encoding.ASCII.GetBytes(secretKey);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Role, tipoUsuarioStr),
                new Claim("TipoUsuario", tipoUsuarioStr),
                new Claim("IsAdmin", usuario.IsAdmin.ToString().ToLower())
            };

            if (pacienteId.HasValue)
            {
                claims.Add(new Claim("PacienteId", pacienteId.Value.ToString()));
            }

            if (perfilProfissional != null)
            {
                claims.Add(new Claim("ProfissionalId", perfilProfissional.Id.ToString()));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return new LoginResponse
            {
                Token = tokenHandler.WriteToken(token),
                UsuarioId = usuario.Id,
                TipoUsuario = tipoUsuarioStr,
                PacienteId = pacienteId,
                ProfissionalId = perfilProfissional?.Id,
                IsAdmin = usuario.IsAdmin
            };
        }
    }
}
