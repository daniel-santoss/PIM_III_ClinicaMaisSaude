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

            var paciente = new Paciente(request.Nome, request.Cpf, request.Telefone, request.Email);
            
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
    }
}
