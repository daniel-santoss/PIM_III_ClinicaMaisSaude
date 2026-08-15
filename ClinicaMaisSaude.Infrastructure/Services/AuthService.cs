using BCrypt.Net;
using ClinicaMaisSaude.Application.DTOs.Auth;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Constants;
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

        // Hash BCrypt "fantasma" (calculado uma vez) para verificação de tempo constante
        // quando o usuário não existe — evita que o tempo de resposta revele a existência da conta.
        private static readonly string HashFantasma = BCrypt.Net.BCrypt.HashPassword("timing-attack-mitigation");

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
                .Include(u => u.Foto)
                .FirstOrDefaultAsync(u => u.Email == emailNormalizado || u.Cpf == cleanIdentificador);

            if (usuario == null)
            {
                // Verificação "fantasma" com custo equivalente ao BCrypt real: iguala o tempo
                // de resposta ao caso "senha errada", para o tempo não revelar se a conta existe.
                BCrypt.Net.BCrypt.Verify(request.Senha, HashFantasma);
                throw new UnauthorizedException("Credenciais inválidas.");
            }

            if (usuario.IsBloqueado())
            {
                var minutosRestantes = (int)Math.Ceiling((usuario.BloqueadoAte!.Value - DateTime.UtcNow).TotalMinutes);
                
                // Se o bloqueio for de 100 anos (bloqueio permanente)
                if (minutosRestantes > 50000000) 
                {
                    throw new UnauthorizedException("PERMANENT_BAN:Sua conta foi banida permanentemente devido a violações graves das políticas de segurança.");
                }

                throw new UnauthorizedException($"Conta bloqueada. Tente novamente em {minutosRestantes} minuto(s).");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash.Trim()))
            {
                usuario.RegistrarFalhaLogin();
                await _context.SaveChangesAsync();

                if (usuario.IsBloqueado())
                {
                    throw new UnauthorizedException("Conta bloqueada por excesso de tentativas. Tente novamente em 15 minutos.");
                }

                // Mensagem genérica e idêntica ao caso "usuário inexistente": não revela se a
                // conta existe nem quantas tentativas restam (anti-enumeração). O contador e o
                // bloqueio por 5 falhas continuam sendo aplicados internamente (acima).
                throw new UnauthorizedException("Credenciais inválidas.");
            }

            usuario.RegistrarSucessoLogin();

            usuario.AtualizarUltimoAcesso();
            await _context.SaveChangesAsync();

            var perfilProfissional = await _context.Profissionais.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);
            var perfilPaciente = await _context.Pacientes.FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);

            // Conta de paciente encerrada (soft-delete): bloqueia o acesso mesmo com
            // credenciais válidas. Verificado após a senha para não vazar a existência
            // da conta no tempo de resposta.
            if (perfilPaciente != null && !perfilPaciente.Ativo)
                throw new UnauthorizedException("Esta conta foi encerrada.");

            // Verificar e consumir flag de penalidade removida
            bool penalidadeRemovida = false;
            if (perfilPaciente?.PenalidadeRemovidaAvisar == true)
            {
                penalidadeRemovida = true;
                perfilPaciente.ConsumarAvisoPenalidade();
                await _context.SaveChangesAsync();
            }

            // Papel para o token: admin é explícito (não mais inferido do perfil);
            // profissional detalha em Medico/Enfermeira (usado por regras de negócio);
            // paciente é paciente. O claim Role dirige o [Authorize].
            string tipoUsuarioStr;
            Guid? pacienteId = null;

            if (usuario.TipoUsuario == TipoUsuario.Admin)
            {
                tipoUsuarioStr = PerfisUsuario.Admin;
            }
            else if (perfilProfissional != null)
            {
                tipoUsuarioStr = perfilProfissional.TipoProfissional.ToString();
            }
            else if (perfilPaciente != null)
            {
                tipoUsuarioStr = PerfisUsuario.Paciente;
                pacienteId = perfilPaciente.Id;
            }
            else
            {
                tipoUsuarioStr = usuario.TipoUsuario.ToString();
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var secretKey = _configuration[ConfigKeys.JwtSecret] ?? throw new InvalidOperationException($"{ConfigKeys.JwtSecret} não configurado.");
            var key = Encoding.UTF8.GetBytes(secretKey);
            var issuer = _configuration[ConfigKeys.JwtIssuer] ?? ConfigKeys.JwtIssuerPadrao;
            var audience = _configuration[ConfigKeys.JwtAudience] ?? ConfigKeys.JwtAudiencePadrao;

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Role, tipoUsuarioStr),
                new Claim(ClinicaClaims.TipoUsuario, tipoUsuarioStr),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (pacienteId.HasValue)
            {
                claims.Add(new Claim(ClinicaClaims.PacienteId, pacienteId.Value.ToString()));
            }

            if (perfilProfissional != null)
            {
                claims.Add(new Claim(ClinicaClaims.ProfissionalId, perfilProfissional.Id.ToString()));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(3),
                Issuer = issuer,
                Audience = audience,
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

            await LimparRefreshTokensAsync(usuario.Id);
            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            return new LoginResponse
            {
                Token = jwtToken,
                Nome = usuario.Nome,
                RefreshToken = refreshToken.Token,
                UsuarioId = usuario.Id,
                TipoUsuario = tipoUsuarioStr,
                PacienteId = pacienteId,
                ProfissionalId = perfilProfissional?.Id,
                IsAdmin = usuario.TipoUsuario == TipoUsuario.Admin,
                PenalidadeRemovida = penalidadeRemovida,
                FotoBase64 = usuario.FotoBase64
            };
        }

        // Housekeeping dos refresh tokens do usuário: remove os expirados e os já usados
        // há mais de 1 dia. Evita o crescimento indefinido da tabela; mantém os usados
        // recentes para permitir detecção de reuso (um token roubado reapresentado).
        private async Task LimparRefreshTokensAsync(Guid usuarioId)
        {
            var agora = DateTime.UtcNow;
            var limiteUsados = agora.AddDays(-1);
            await _context.RefreshTokens
                .Where(t => t.UsuarioId == usuarioId &&
                            (t.ExpiryDate < agora || (t.IsUsed && t.AddedDate < limiteUsados)))
                .ExecuteDeleteAsync();
        }

        public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var secretKey = _configuration[ConfigKeys.JwtSecret] ?? throw new InvalidOperationException($"{ConfigKeys.JwtSecret} não configurado.");
            var key = Encoding.UTF8.GetBytes(secretKey);
            var issuer = _configuration[ConfigKeys.JwtIssuer] ?? ConfigKeys.JwtIssuerPadrao;
            var audience = _configuration[ConfigKeys.JwtAudience] ?? ConfigKeys.JwtAudiencePadrao;
            var storedToken = await _context.RefreshTokens.FirstOrDefaultAsync(x => x.Token == request.RefreshToken);

            if (storedToken == null) throw new UnauthorizedException("Refresh token não existe.");
            if (storedToken.IsUsed) throw new UnauthorizedException("Refresh token já foi utilizado.");
            if (storedToken.IsRevoked) throw new UnauthorizedException("Refresh token foi revogado.");
            if (storedToken.ExpiryDate < DateTime.UtcNow) throw new UnauthorizedException("Refresh token expirado.");

            storedToken.IsUsed = true;
            _context.RefreshTokens.Update(storedToken);
            await _context.SaveChangesAsync();

            var usuario = await _context.Usuarios.AsNoTracking().Include(u => u.Foto).FirstOrDefaultAsync(u => u.Id == storedToken.UsuarioId);
            if (usuario == null) throw new UnauthorizedException("Usuário não encontrado.");

            var perfilProfissional = await _context.Profissionais.AsNoTracking().FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);
            var perfilPaciente = await _context.Pacientes.AsNoTracking().FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id);

            string tipoUsuarioStr;
            Guid? pacienteId = null;

            if (usuario.TipoUsuario == TipoUsuario.Admin)
                tipoUsuarioStr = PerfisUsuario.Admin;
            else if (perfilProfissional != null)
                tipoUsuarioStr = perfilProfissional.TipoProfissional.ToString();
            else if (perfilPaciente != null)
            {
                tipoUsuarioStr = PerfisUsuario.Paciente;
                pacienteId = perfilPaciente.Id;
            }
            else
                tipoUsuarioStr = usuario.TipoUsuario.ToString();

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Role, tipoUsuarioStr),
                new Claim(ClinicaClaims.TipoUsuario, tipoUsuarioStr),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (pacienteId.HasValue) claims.Add(new Claim(ClinicaClaims.PacienteId, pacienteId.Value.ToString()));
            if (perfilProfissional != null) claims.Add(new Claim(ClinicaClaims.ProfissionalId, perfilProfissional.Id.ToString()));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(3),
                Issuer = issuer,
                Audience = audience,
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

            await LimparRefreshTokensAsync(usuario.Id);
            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            return new LoginResponse
            {
                Token = jwtToken,
                Nome = usuario.Nome,
                RefreshToken = refreshToken.Token,
                UsuarioId = usuario.Id,
                TipoUsuario = tipoUsuarioStr,
                PacienteId = pacienteId,
                ProfissionalId = perfilProfissional?.Id,
                IsAdmin = usuario.TipoUsuario == TipoUsuario.Admin,
                FotoBase64 = usuario.FotoBase64
            };
        }
    }
}
