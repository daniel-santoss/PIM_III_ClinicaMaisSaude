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
                Email = paciente.Email
            };


        }

        // Adicione este método dentro da classe PacienteService
        public async Task<IEnumerable<PacienteResponse>> ObterTodosAsync()
        {
            // 1. Busca todas as entidades de domínio no banco de dados (via Repository ou DbContext)
            var pacientes = await _repository.ObterTodosAsync();

            // 2. Transforma (Mapeia) a lista de Entidades 'Paciente' para uma lista de DTOs 'PacienteResponse'
            var resposta = pacientes.Select(p => new PacienteResponse
            {
                Id = p.Id,
                Nome = p.Nome,
                Cpf = p.Cpf,
                Telefone = p.Telefone,
                Email = p.Email
            });

            // 3. Retorna a lista pronta
            return resposta;
        }
    }
}
