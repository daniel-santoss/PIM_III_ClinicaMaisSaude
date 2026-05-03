using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
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

        public async Task<PacienteResponse> AdicionarAsync(PacienteRequest request)
        {
            var pacienteExistente = await _repository.ObterPorCpfAsync(request.Cpf);

            if (pacienteExistente != null)
            {
                throw new Exception("Já existe um cadastro para o CPF informado.");
            }

            var paciente = new Paciente(
                request.Nome,
                request.Cpf.Replace(".", "").Replace("-", ""),
                request.Telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", ""),
                request.Email);
            
            await _repository.AdicionarAsync(paciente);

            return new PacienteResponse
            {
                Id = paciente.Id,
                Nome = paciente.Nome,
                Cpf = paciente.Cpf,
                Telefone = paciente.Telefone,
                Email = paciente.Email,
                UsuarioId = paciente.UsuarioId
            };


        }

        public async Task<PacienteResponse?> ObterPorIdAsync(Guid id)
        {
            var paciente = await _repository.ObterPorIdAsync(id);
            if (paciente == null) return null;

            return new PacienteResponse
            {
                Id = paciente.Id,
                Nome = paciente.Nome,
                Cpf = paciente.Cpf,
                Telefone = paciente.Telefone,
                Email = paciente.Email,
                UsuarioId = paciente.UsuarioId,
                Tipo = "Paciente"
            };
        }

        // Adicione este método dentro da classe PacienteService
        public async Task<IEnumerable<PacienteResponse>> ObterTodosAsync(string? nome = null, string? cpf = null, bool incluirProfissionais = false)
        {
            var pacientes = await _repository.ObterTodosAsync(nome, cpf);

            var resposta = pacientes.Select(p => new PacienteResponse
            {
                Id = p.Id,
                Nome = p.Nome,
                Cpf = p.Cpf,
                Telefone = p.Telefone,
                Email = p.Email,
                UsuarioId = p.UsuarioId,
                Tipo = "Paciente",
                UltimoAcesso = p.Usuario?.UltimoAcesso
            }).ToList();

            if (incluirProfissionais)
            {
                var profissionais = await _profissionalRepository.ObterTodosAsync();
                
                // Filtrar por nome/cpf se os filtros foram passados
                if (!string.IsNullOrWhiteSpace(nome))
                {
                    profissionais = profissionais.Where(p => p.Nome.Contains(nome, StringComparison.OrdinalIgnoreCase));
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
                        Nome = prof.Nome,
                        Cpf = prof.Usuario.Cpf,
                        Telefone = "-", // Profissionais não têm telefone no perfil atual
                        Email = prof.Usuario.Email,
                        UsuarioId = prof.UsuarioId,
                        Tipo = prof.TipoProfissional.ToString(),
                        UltimoAcesso = prof.Usuario.UltimoAcesso
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
                Nome = p.Nome,
                Cpf = p.Cpf,
                Telefone = p.Telefone,
                Email = p.Email,
                UsuarioId = p.UsuarioId,
                Tipo = "Paciente",
                UltimoAcesso = p.Usuario?.UltimoAcesso
            }).ToList();

            if (incluirProfissionais)
            {
                var profissionais = await _profissionalRepository.ObterTodosAsync();

                if (!string.IsNullOrWhiteSpace(nome))
                    profissionais = profissionais.Where(p => p.Nome.Contains(nome, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrWhiteSpace(cpf))
                    profissionais = profissionais.Where(p => p.Usuario.Cpf.Contains(cpf));

                foreach (var prof in profissionais)
                {
                    resposta.Add(new PacienteResponse
                    {
                        Id = prof.Id,
                        Nome = prof.Nome,
                        Cpf = prof.Usuario.Cpf,
                        Telefone = "-",
                        Email = prof.Usuario.Email,
                        UsuarioId = prof.UsuarioId,
                        Tipo = prof.TipoProfissional.ToString(),
                        UltimoAcesso = prof.Usuario.UltimoAcesso
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
                throw new Exception("Paciente não encontrado.");

            paciente.Atualizar(
                request.Nome,
                paciente.Cpf,
                request.Telefone.Replace("(", "").Replace(")", "").Replace("-", "").Replace(" ", ""),
                request.Email);

            await _repository.AtualizarAsync(paciente);

            return new PacienteResponse
            {
                Id = paciente.Id,
                Nome = paciente.Nome,
                Cpf = paciente.Cpf,
                Telefone = paciente.Telefone,
                Email = paciente.Email,
                UsuarioId = paciente.UsuarioId
            };
        }

        public async Task DesativarAsync(Guid id)
        {
            var paciente = await _repository.ObterPorIdAsync(id);

            if (paciente == null)
                throw new Exception("Paciente não encontrado.");

            paciente.Desativar();
            await _repository.AtualizarAsync(paciente);
        }

        public async Task<IEnumerable<PacienteResponse>> ObterInativosAsync(int dias)
        {
            var corte = DateTime.UtcNow.AddDays(-dias);
            var todosPacientes = await _repository.ObterTodosAsync();
            var todosAgendamentos = await _agendamentoRepository.ObterTodosAsync();

            var inativos = todosPacientes
                .Where(p => p.Ativo)
                .Where(p => !todosAgendamentos.Any(a => a.PacienteId == p.Id && a.DtCriado >= corte))
                .Select(p => new PacienteResponse
                {
                    Id = p.Id,
                    Nome = p.Nome,
                    Cpf = p.Cpf,
                    Telefone = p.Telefone,
                    Email = p.Email,
                    UsuarioId = p.UsuarioId,
                    Tipo = "Paciente"
                })
                .ToList();

            return inativos;
        }
    }
}
