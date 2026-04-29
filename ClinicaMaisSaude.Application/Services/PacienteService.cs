using ClinicaMaisSaude.Application.DTOs.Paciente;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Application.Services
{
    public class PacienteService : IPacienteService
    {
        private readonly IPacienteRepository _repository;

        public PacienteService(IPacienteRepository pacienteRepository)
        {
            _repository = pacienteRepository;
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

        // Adicione este método dentro da classe PacienteService
        public async Task<IEnumerable<PacienteResponse>> ObterTodosAsync(string? nome = null, string? cpf = null)
        {
            // 1. Busca todas as entidades de domínio no banco de dados (via Repository ou DbContext)
            var pacientes = await _repository.ObterTodosAsync(nome, cpf);

            // 2. Transforma (Mapeia) a lista de Entidades 'Paciente' para uma lista de DTOs 'PacienteResponse'
            var resposta = pacientes.Select(p => new PacienteResponse
            {
                Id = p.Id,
                Nome = p.Nome,
                Cpf = p.Cpf,
                Telefone = p.Telefone,
                Email = p.Email,
                UsuarioId = p.UsuarioId
            });

            // 3. Retorna a lista pronta
            return resposta;
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
    }
}
