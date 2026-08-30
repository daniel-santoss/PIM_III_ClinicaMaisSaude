using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Auto-cadastro moderado (Thread D, fluxo anônimo). Anti-fraude leve — a avaliação presencial é
    /// o backstop real: CPF checksum + 1 solicitação aberta por CPF (dedupe por pessoa). O rate-limit
    /// por IP (anti-flood generoso) fica na borda (policy do controller), não aqui.
    /// </summary>
    public class AutoCadastroService : IAutoCadastroService
    {
        private readonly ClinicaDbContext _context;

        public AutoCadastroService(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<ModeloDeclaracaoSaudeResponse?> ObterDeclaracaoVigenteAsync()
        {
            var modelo = await _context.ModelosDeclaracaoSaude
                .AsNoTracking()
                .Include(m => m.Perguntas)
                .FirstOrDefaultAsync(m => m.ModeloPadrao);

            if (modelo == null) return null;

            return new ModeloDeclaracaoSaudeResponse
            {
                ModeloId = modelo.Id,
                Nome = modelo.Nome,
                Perguntas = modelo.Perguntas
                    .OrderBy(p => p.Ordem)
                    .Select(p => new PerguntaDeclaracaoResponse { PerguntaId = p.Id, Pergunta = p.Pergunta, Ordem = p.Ordem })
                    .ToList()
            };
        }

        public async Task<CadastroResult> SolicitarAsync(SolicitacaoCadastroRequest request)
        {
            // ---- Normalização + validações de forma ----
            var nome = (request.Nome ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nome))
                return Falha("Informe o nome completo.");

            var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                return Falha("Informe um e-mail válido.");

            var cpf = Cpf.Sanitizar(request.Cpf);
            if (!Cpf.EhValido(cpf))
                return Falha("O CPF informado não é matematicamente válido.");

            string? telefone = null;
            if (!string.IsNullOrWhiteSpace(request.Telefone))
            {
                telefone = new string(request.Telefone.Where(char.IsDigit).ToArray());
                if (telefone.Length != 11)
                    return Falha("Telefone inválido. Informe DDD + número (11 dígitos).");
            }

            // ---- Modelo de DS: precisa ser o vigente (padrão) ----
            var modelo = await _context.ModelosDeclaracaoSaude
                .Include(m => m.Perguntas)
                .FirstOrDefaultAsync(m => m.Id == request.ModeloId);
            if (modelo == null)
                return Falha("Declaração de saúde não encontrada. Recarregue o formulário.");
            if (!modelo.ModeloPadrao)
                return Falha("A declaração de saúde foi atualizada. Recarregue o formulário e responda novamente.");

            // ---- Respostas: cobrir exatamente as perguntas do modelo; "Sim" exige detalhe ----
            var perguntaIds = modelo.Perguntas.Select(p => p.Id).ToHashSet();
            var respostas = request.Respostas ?? new List<RespostaDeclaracaoItem>();
            var respondidas = respostas.Select(r => r.PerguntaId).ToHashSet();

            if (respostas.Count != respondidas.Count)
                return Falha("Há respostas duplicadas para a mesma pergunta.");
            if (!perguntaIds.SetEquals(respondidas))
                return Falha("Responda todas as perguntas da declaração de saúde (e apenas elas).");
            foreach (var r in respostas)
            {
                if (r.Resposta && string.IsNullOrWhiteSpace(r.Detalhe))
                    return Falha("As respostas \"Sim\" exigem um detalhamento.");
            }

            // ---- Anti-fraude / dedupe por pessoa (CPF) ----
            var pessoa = await _context.Pessoas.FirstOrDefaultAsync(p => p.Cpf == cpf);

            if (pessoa != null)
            {
                var jaTemConta = await _context.Usuarios.AnyAsync(u => u.PessoaId == pessoa.Id);
                if (jaTemConta)
                    return Falha("Já existe uma conta com este CPF. Use o acesso ou a recuperação de senha.");

                var solicitacaoAberta = await _context.SolicitacoesCadastro
                    .AnyAsync(s => s.PessoaId == pessoa.Id && s.Status == StatusSolicitacao.EmAnalise);
                if (solicitacaoAberta)
                    return Falha("Já existe uma solicitação em análise para este CPF. Aguarde o contato da clínica.");
            }

            // E-mail é único (identidade): não pode colidir com OUTRA pessoa.
            var emailDeOutro = await _context.Pessoas
                .AnyAsync(p => p.Email == email && (pessoa == null || p.Id != pessoa.Id));
            if (emailDeOutro)
                return Falha("Este e-mail já está em uso.");

            // ---- Criação/reuso: Pessoa + Paciente (proponente) + Solicitação + Respostas ----
            if (pessoa == null)
            {
                pessoa = new Pessoa(nome, cpf, email, telefone);
                _context.Pessoas.Add(pessoa);
            }
            else
            {
                // Reaplicação (solicitação anterior recusada): reaproveita a Pessoa (CPF único).
                pessoa.AtualizarNome(nome);
                pessoa.AtualizarEmail(email);
                pessoa.AtualizarTelefone(telefone);
            }

            var pacienteExistente = await _context.Pacientes.FirstOrDefaultAsync(p => p.PessoaId == pessoa.Id);
            if (pacienteExistente == null)
            {
                var proponente = Paciente.NovoProponente(pessoa.Id, request.TemProblemaMemoria);
                _context.Pacientes.Add(proponente);
            }
            else
            {
                pacienteExistente.ReabrirComoProponente(request.TemProblemaMemoria);
            }

            var solicitacao = new SolicitacaoCadastro(pessoa.Id, modelo.Id);
            _context.SolicitacoesCadastro.Add(solicitacao);

            foreach (var r in respostas)
            {
                _context.RespostasDeclaracaoSaude.Add(
                    new RespostaDeclaracaoSaude(solicitacao.Id, r.PerguntaId, r.Resposta, r.Detalhe));
            }

            await _context.SaveChangesAsync();

            return new CadastroResult
            {
                Sucesso = true,
                Mensagem = "Solicitação enviada! Compareça à clínica para a avaliação. Você será avisado por e-mail sobre a decisão."
            };
        }

        private static CadastroResult Falha(string mensagem) =>
            new CadastroResult { Sucesso = false, Mensagem = mensagem };
    }
}
