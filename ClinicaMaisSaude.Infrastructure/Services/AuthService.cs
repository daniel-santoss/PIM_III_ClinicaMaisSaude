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

namespace ClinicaMaisSaude.Infrastructure.Services
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

            if (usuario.IsBloqueado() && !usuario.IsAdmin)
            {
                var minutosRestantes = (int)Math.Ceiling((usuario.BloqueadoAte!.Value - DateTime.UtcNow).TotalMinutes);
                
                // Se o bloqueio for de 100 anos (bloqueio permanente)
                if (minutosRestantes > 50000000) 
                {
                    throw new Exception("PERMANENT_BAN:Sua conta foi banida permanentemente devido a violações graves das políticas de segurança.");
                }

                throw new Exception($"Conta bloqueada. Tente novamente em {minutosRestantes} minuto(s).");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash.Trim()))
            {
                usuario.RegistrarFalhaLogin();
                await _context.SaveChangesAsync();

                if (usuario.IsBloqueado() && !usuario.IsAdmin)
                {
                    throw new Exception("Conta bloqueada por excesso de tentativas. Tente novamente em 15 minutos.");
                }

                throw new Exception("Credenciais inválidas.");
            }

            usuario.RegistrarSucessoLogin();

            usuario.AtualizarUltimoAcesso();
            await _context.SaveChangesAsync();

            var perfilProfissional = await _context.Profissionais.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);
            var perfilPaciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);

            // Verificar e consumir flag de penalidade removida
            bool penalidadeRemovida = false;
            if (perfilPaciente?.PenalidadeRemovidaAvisar == true)
            {
                penalidadeRemovida = true;
                perfilPaciente.ConsumarAvisoPenalidade();
                await _context.SaveChangesAsync();
            }

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
            var secretKey = _configuration["JwtConfig:Secret"] ?? throw new InvalidOperationException("JwtConfig:Secret não configurado.");
            var key = Encoding.ASCII.GetBytes(secretKey);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Role, tipoUsuarioStr),
                new Claim("TipoUsuario", tipoUsuarioStr),
                new Claim("IsAdmin", usuario.IsAdmin.ToString().ToLower()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
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
                Expires = DateTime.UtcNow.AddHours(3),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            var jwtToken = tokenHandler.WriteToken(token);
            var refreshToken = new RefreshToken
            {
                Token = Guid.NewGuid().ToString() + Guid.NewGuid().ToString(),
                JwtId = token.Id,
                IsUsed = false,
                IsRevoked = false,
                UsuarioId = usuario.Id,
                AddedDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddDays(7)
            };

            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            return new LoginResponse
            {
                Token = jwtToken,
                Nome = perfilProfissional?.Nome ?? perfilPaciente?.Nome ?? (usuario.IsAdmin ? "Administrador" : "Usuário"),
                RefreshToken = refreshToken.Token,
                UsuarioId = usuario.Id,
                TipoUsuario = tipoUsuarioStr,
                PacienteId = pacienteId,
                ProfissionalId = perfilProfissional?.Id,
                IsAdmin = usuario.IsAdmin,
                PenalidadeRemovida = penalidadeRemovida,
                FotoBase64 = usuario.FotoBase64
            };
        }

        public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var secretKey = _configuration["JwtConfig:Secret"] ?? throw new InvalidOperationException("JwtConfig:Secret não configurado.");
            var key = Encoding.ASCII.GetBytes(secretKey);

            var storedToken = await _context.RefreshTokens.FirstOrDefaultAsync(x => x.Token == request.RefreshToken);

            if (storedToken == null) throw new Exception("Refresh token não existe.");
            if (storedToken.IsUsed) throw new Exception("Refresh token já foi utilizado.");
            if (storedToken.IsRevoked) throw new Exception("Refresh token foi revogado.");
            if (storedToken.ExpiryDate < DateTime.UtcNow) throw new Exception("Refresh token expirado.");

            storedToken.IsUsed = true;
            _context.RefreshTokens.Update(storedToken);
            await _context.SaveChangesAsync();

            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Id == storedToken.UsuarioId);
            if (usuario == null) throw new Exception("Usuário não encontrado.");

            var perfilProfissional = await _context.Profissionais.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);
            var perfilPaciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);

            string tipoUsuarioStr = "Admin";
            Guid? pacienteId = null;

            if (perfilProfissional != null)
                tipoUsuarioStr = perfilProfissional.TipoProfissional.ToString();
            else if (perfilPaciente != null)
            {
                tipoUsuarioStr = "Paciente";
                pacienteId = perfilPaciente.Id;
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Role, tipoUsuarioStr),
                new Claim("TipoUsuario", tipoUsuarioStr),
                new Claim("IsAdmin", usuario.IsAdmin.ToString().ToLower()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (pacienteId.HasValue) claims.Add(new Claim("PacienteId", pacienteId.Value.ToString()));
            if (perfilProfissional != null) claims.Add(new Claim("ProfissionalId", perfilProfissional.Id.ToString()));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(3),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwtToken = tokenHandler.WriteToken(token);

            var refreshToken = new RefreshToken
            {
                Token = Guid.NewGuid().ToString() + Guid.NewGuid().ToString(),
                JwtId = token.Id,
                IsUsed = false,
                IsRevoked = false,
                UsuarioId = usuario.Id,
                AddedDate = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddDays(7)
            };

            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            return new LoginResponse
            {
                Token = jwtToken,
                Nome = perfilProfissional?.Nome ?? perfilPaciente?.Nome ?? (usuario.IsAdmin ? "Administrador" : "Usuário"),
                RefreshToken = refreshToken.Token,
                UsuarioId = usuario.Id,
                TipoUsuario = tipoUsuarioStr,
                PacienteId = pacienteId,
                ProfissionalId = perfilProfissional?.Id,
                IsAdmin = usuario.IsAdmin,
                FotoBase64 = usuario.FotoBase64
            };
        }
    }
}
