using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace ClinicaMaisSaude.Application.Services
{
    public class PacienteService : IPacienteService
    {
        private readonly IPacienteRepository _repository;
        private readonly IProfissionalRepository _profissionalRepository;
        private readonly IAgendamentoRepository _agendamentoRepository;

        public PacienteService(IPacienteRepository pacienteRepository, IProfissionalRepository profissionalRepository, IAgendamentoRepository agendamentoRepository)
        {
            _repository = pacienteRepository;
            _profissionalRepository = profissionalRepository;
            _agendamentoRepository = agendamentoRepository;
        }

        public Task<PacienteResponse> AdicionarAsync(PacienteRequest request)
        {
            // A identidade (Nome/Cpf/Email/Telefone) vive no LoginPortal e todo paciente
            // exige uma conta. Criar paciente "solto" (sem login) deixou de existir — o
            // cadastro passa pelo fluxo integrado (/api/LoginPortal/cadastro).
            throw new BusinessRuleException("Pacientes são criados junto da conta de acesso. Utilize o cadastro (/api/LoginPortal/cadastro).");
        }

        public async Task<PacienteResponse?> ObterPorIdAsync(Guid id)
        {
            var paciente = await _repository.ObterPorIdAsync(id);
            if (paciente == null) return null;

            return new PacienteResponse
            {
                Id = paciente.Id,
                Nome = paciente.Usuario?.Nome,
                Cpf = paciente.Usuario?.Cpf,
                Telefone = paciente.Usuario?.Telefone,
                Email = paciente.Usuario?.Email,
                TemProblemaMemoria = paciente.TemProblemaMemoria,
                UsuarioId = paciente.UsuarioId,
                Tipo = "Paciente",
                FotoBase64 = paciente.Usuario?.FotoBase64
            };
        }

        // Adicione este método dentro da classe PacienteService
        public async Task<IEnumerable<PacienteResponse>> ObterTodosAsync(string? nome = null, string? cpf = null, bool incluirProfissionais = false)
        {
            var pacientes = await _repository.ObterTodosAsync(nome, cpf);

            var resposta = pacientes.Select(p => new PacienteResponse
            {
                Id = p.Id,
                Nome = p.Usuario?.Nome,
                Cpf = p.Usuario?.Cpf,
                Telefone = p.Usuario?.Telefone,
                Email = p.Usuario?.Email,
                TemProblemaMemoria = p.TemProblemaMemoria,
                UsuarioId = p.UsuarioId,
                Tipo = "Paciente",
                UltimoAcesso = p.Usuario?.UltimoAcesso,
                IsBanidoPermanente = p.SituacaoCliente == SituacaoCliente.Banido,
                FotoBase64 = p.Usuario?.FotoBase64
            }).ToList();

            if (incluirProfissionais)
            {
                var profissionais = await _profissionalRepository.ObterTodosAsync();

                // Filtrar por nome/cpf se os filtros foram passados
                if (!string.IsNullOrWhiteSpace(nome))
                {
                    profissionais = profissionais.Where(p => p.Usuario.Nome.Contains(nome, StringComparison.OrdinalIgnoreCase));
                }
                if (!string.IsNullOrWhiteSpace(cpf))
                {
                    profissionais = profissionais.Where(p => p.Usuario.Cpf.Contains(cpf));
                }

                foreach (var prof in profissionais)
                {
                    resposta.Add(new PacienteResponse
                    {
                        Id = prof.Id,
                        Nome = prof.Usuario.Nome,
                        Cpf = prof.Usuario.Cpf,
                        Telefone = prof.Usuario.Telefone ?? "-",
                        Email = prof.Usuario.Email,
                        UsuarioId = prof.UsuarioId,
                        Tipo = prof.Usuario?.Role.ToString() ?? prof.TipoProfissional.ToString(),
                        UltimoAcesso = prof.Usuario.UltimoAcesso,
                        IsBanidoPermanente = prof.Usuario?.BloqueadoAte.HasValue == true && (prof.Usuario.BloqueadoAte.Value - DateTime.UtcNow).TotalDays > 3650,
                        FotoBase64 = prof.Usuario?.FotoBase64
                    });
                }
            }

            return resposta.OrderBy(r => r.Nome);
        }

        public async Task<DTOs.PagedResult<PacienteResponse>> ObterTodosPaginadoAsync(string? nome, string? cpf, bool incluirProfissionais, int page, int pageSize)
        {
            var (items, totalCount) = await _repository.ObterTodosPaginadoAsync(nome, cpf, page, pageSize);

            var resposta = items.Select(p => new PacienteResponse
            {
                Id = p.Id,
                Nome = p.Usuario?.Nome,
                Cpf = p.Usuario?.Cpf,
                Telefone = p.Usuario?.Telefone,
                Email = p.Usuario?.Email,
                TemProblemaMemoria = p.TemProblemaMemoria,
                UsuarioId = p.UsuarioId,
                Tipo = "Paciente",
                UltimoAcesso = p.Usuario?.UltimoAcesso,
                IsBanidoPermanente = p.SituacaoCliente == SituacaoCliente.Banido,
                FotoBase64 = p.Usuario?.FotoBase64
            }).ToList();

            if (incluirProfissionais)
            {
                var profissionais = await _profissionalRepository.ObterTodosAsync();

                if (!string.IsNullOrWhiteSpace(nome))
                    profissionais = profissionais.Where(p => p.Usuario.Nome.Contains(nome, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrWhiteSpace(cpf))
                    profissionais = profissionais.Where(p => p.Usuario.Cpf.Contains(cpf));

                foreach (var prof in profissionais)
                {
                    resposta.Add(new PacienteResponse
                    {
                        Id = prof.Id,
                        Nome = prof.Usuario.Nome,
                        Cpf = prof.Usuario.Cpf,
                        Telefone = prof.Usuario.Telefone ?? "-",
                        Email = prof.Usuario.Email,
                        UsuarioId = prof.UsuarioId,
                        Tipo = prof.Usuario?.Role.ToString() ?? prof.TipoProfissional.ToString(),
                        UltimoAcesso = prof.Usuario.UltimoAcesso,
                        IsBanidoPermanente = prof.Usuario?.BloqueadoAte.HasValue == true && (prof.Usuario.BloqueadoAte.Value - DateTime.UtcNow).TotalDays > 3650,
                        FotoBase64 = prof.Usuario?.FotoBase64
                    });
                }
                
                // Recalculate if we added profissionais
                totalCount += profissionais.Count();
            }

            // Client requests sorted by name
            resposta = resposta.OrderBy(r => r.Nome).ToList();

            // Apply pagination limit again in memory if we merged profissionais
            if (incluirProfissionais && resposta.Count > pageSize)
            {
                 // Since we fetched professionals separately, the page skip/take must be done on the merged list.
                 // This is a tradeoff for merging two separate repositories into one response.
                 resposta = resposta.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            }

            return new DTOs.PagedResult<PacienteResponse>
            {
                Items = resposta,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PacienteResponse> AtualizarAsync(Guid id, PacienteRequest request)
        {
            var paciente = await _repository.ObterPorIdAsync(id);

            if (paciente == null)
                throw new NotFoundException("Paciente não encontrado.");

            // Dados de identidade são atualizados no LoginPortal; o perfil só guarda o clínico.
            if (paciente.Usuario != null)
            {
                if (!string.IsNullOrWhiteSpace(request.Nome))
                    paciente.Usuario.AtualizarNome(request.Nome);
                if (!string.IsNullOrWhiteSpace(request.Email))
                    paciente.Usuario.AtualizarEmail(request.Email.Trim().ToLowerInvariant());
                if (!string.IsNullOrWhiteSpace(request.Telefone))
                    paciente.Usuario.AtualizarTelefone(request.Telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", ""));
            }
            paciente.Atualizar(request.TemProblemaMemoria);

            await _repository.AtualizarAsync(paciente);

            return new PacienteResponse
            {
                Id = paciente.Id,
                Nome = paciente.Usuario?.Nome,
                Cpf = paciente.Usuario?.Cpf,
                Telefone = paciente.Usuario?.Telefone,
                Email = paciente.Usuario?.Email,
                TemProblemaMemoria = paciente.TemProblemaMemoria,
                UsuarioId = paciente.UsuarioId,
                FotoBase64 = paciente.Usuario?.FotoBase64
            };
        }

        public async Task DesativarAsync(Guid id)
        {
            var paciente = await _repository.ObterPorIdAsync(id);

            if (paciente == null)
                throw new NotFoundException("Paciente não encontrado.");

            paciente.Desativar();
            await _repository.AtualizarAsync(paciente);
        }

        public async Task<IEnumerable<PacienteResponse>> ObterInativosAsync(int dias)
        {
            var corte = DateTime.UtcNow.AddDays(-dias);
            var todosPacientes = await _repository.ObterTodosAsync();
            var todosAgendamentos = await _agendamentoRepository.ObterTodosAsync();

            var inativos = todosPacientes
                .Where(p => p.EstaAtivo)
                .Where(p => !todosAgendamentos.Any(a => a.PacienteId == p.Id && a.DtCriado >= corte))
                .Select(p => new PacienteResponse
                {
                    Id = p.Id,
                    Nome = p.Usuario?.Nome,
                    Cpf = p.Usuario?.Cpf,
                    Telefone = p.Usuario?.Telefone,
                    Email = p.Usuario?.Email,
                    UsuarioId = p.UsuarioId,
                    Tipo = "Paciente",
                    FotoBase64 = p.Usuario?.FotoBase64
                })
                .ToList();

            return inativos;
        }
    }
}
