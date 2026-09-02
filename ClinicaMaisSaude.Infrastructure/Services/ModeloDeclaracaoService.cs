using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClinicaMaisSaude.Application.DTOs.AutoCadastro;
using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Editor admin dos modelos de Declaração de Saúde (D5). Regra "o modelo é a versão": um modelo já
    /// usado em solicitações (<see cref="SolicitacaoCadastro"/>) fica travado para mudança estrutural
    /// (perguntas/exclusão) — para trocar a DS vigente, cria-se um novo modelo e define-se como padrão.
    /// A exclusividade do modelo padrão é coordenada aqui (só um padrão por vez).
    /// </summary>
    public class ModeloDeclaracaoService : IModeloDeclaracaoService
    {
        private readonly ClinicaDbContext _context;

        public ModeloDeclaracaoService(ClinicaDbContext context)
        {
            _context = context;
        }

        public async Task<List<ModeloResumoResponse>> ListarModelosAsync()
        {
            var modelos = await _context.ModelosDeclaracaoSaude
                .AsNoTracking()
                .Select(m => new
                {
                    m.Id,
                    m.Nome,
                    m.ModeloPadrao,
                    m.DtCriado,
                    Qtd = m.Perguntas.Count,
                    EmUso = _context.SolicitacoesCadastro.Any(s => s.ModeloId == m.Id)
                })
                .OrderByDescending(m => m.ModeloPadrao)
                .ThenByDescending(m => m.DtCriado)
                .ToListAsync();

            return modelos.Select(m => new ModeloResumoResponse
            {
                Id = m.Id,
                Nome = m.Nome,
                ModeloPadrao = m.ModeloPadrao,
                QtdPerguntas = m.Qtd,
                PossuiSolicitacoes = m.EmUso,
                DtCriado = m.DtCriado
            }).ToList();
        }

        public async Task<ModeloDetalheResponse?> ObterModeloAsync(Guid id)
        {
            var modelo = await _context.ModelosDeclaracaoSaude
                .AsNoTracking()
                .Include(m => m.Perguntas)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (modelo == null) return null;

            var emUso = await _context.SolicitacoesCadastro.AnyAsync(s => s.ModeloId == id);
            return MapDetalhe(modelo, emUso);
        }

        public async Task<ModeloDetalheResponse> CriarModeloAsync(CriarModeloRequest request)
        {
            var nome = (request.Nome ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(nome))
                throw new ValidationException("Informe o nome do modelo.");

            var modelo = new ModeloDeclaracaoSaude(nome, modeloPadrao: false);
            _context.ModelosDeclaracaoSaude.Add(modelo);

            if (request.DefinirComoPadrao)
                await TornarPadraoAsync(modelo);

            await _context.SaveChangesAsync();
            return MapDetalhe(modelo, emUso: false);
        }

        public async Task RenomearModeloAsync(Guid id, string nome)
        {
            var modelo = await ObterOuFalharAsync(id);
            var limpo = (nome ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(limpo))
                throw new ValidationException("Informe o nome do modelo.");
            modelo.Renomear(limpo);
            await _context.SaveChangesAsync();
        }

        public async Task DefinirModeloPadraoAsync(Guid id)
        {
            var modelo = await _context.ModelosDeclaracaoSaude
                .Include(m => m.Perguntas)
                .FirstOrDefaultAsync(m => m.Id == id)
                ?? throw new NotFoundException("Modelo não encontrado.");

            if (modelo.Perguntas.Count == 0)
                throw new ValidationException("Um modelo sem perguntas não pode ser o vigente. Adicione perguntas primeiro.");

            await TornarPadraoAsync(modelo); // já persiste (duas fases)
        }

        public async Task ExcluirModeloAsync(Guid id)
        {
            var modelo = await ObterOuFalharAsync(id);

            if (await _context.SolicitacoesCadastro.AnyAsync(s => s.ModeloId == id))
                throw new ValidationException("Este modelo já foi usado em solicitações e não pode ser excluído (crie um novo).");
            if (modelo.ModeloPadrao)
                throw new ValidationException("Não é possível excluir o modelo vigente. Defina outro como padrão antes.");

            var perguntas = await _context.PerguntasDeclaracaoSaude.Where(p => p.ModeloId == id).ToListAsync();
            _context.PerguntasDeclaracaoSaude.RemoveRange(perguntas);
            _context.ModelosDeclaracaoSaude.Remove(modelo);
            await _context.SaveChangesAsync();
        }

        public async Task<PerguntaAdminResponse> AdicionarPerguntaAsync(Guid modeloId, PerguntaRequest request)
        {
            await GarantirModeloEditavelAsync(modeloId);
            var texto = (request.Pergunta ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(texto))
                throw new ValidationException("O texto da pergunta não pode ser vazio.");

            var maxOrdem = await _context.PerguntasDeclaracaoSaude
                .Where(p => p.ModeloId == modeloId)
                .Select(p => (int?)p.Ordem)
                .MaxAsync() ?? 0;

            var ordem = request.Ordem.GetValueOrDefault() > 0 ? request.Ordem!.Value : maxOrdem + 1;
            var pergunta = new PerguntaDeclaracaoSaude(modeloId, texto, ordem);
            _context.PerguntasDeclaracaoSaude.Add(pergunta);
            await _context.SaveChangesAsync();

            return new PerguntaAdminResponse { Id = pergunta.Id, Pergunta = pergunta.Pergunta, Ordem = pergunta.Ordem };
        }

        public async Task EditarPerguntaAsync(Guid perguntaId, PerguntaRequest request)
        {
            var pergunta = await _context.PerguntasDeclaracaoSaude.FirstOrDefaultAsync(p => p.Id == perguntaId)
                ?? throw new NotFoundException("Pergunta não encontrada.");
            await GarantirModeloEditavelAsync(pergunta.ModeloId);

            var texto = (request.Pergunta ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(texto))
                throw new ValidationException("O texto da pergunta não pode ser vazio.");

            pergunta.Editar(texto, request.Ordem.GetValueOrDefault() > 0 ? request.Ordem!.Value : pergunta.Ordem);
            await _context.SaveChangesAsync();
        }

        public async Task ExcluirPerguntaAsync(Guid perguntaId)
        {
            var pergunta = await _context.PerguntasDeclaracaoSaude.FirstOrDefaultAsync(p => p.Id == perguntaId)
                ?? throw new NotFoundException("Pergunta não encontrada.");
            await GarantirModeloEditavelAsync(pergunta.ModeloId);

            _context.PerguntasDeclaracaoSaude.Remove(pergunta);
            await _context.SaveChangesAsync();
        }

        public async Task ReordenarPerguntasAsync(Guid modeloId, List<Guid> perguntaIdsNaOrdem)
        {
            await GarantirModeloEditavelAsync(modeloId);
            var perguntas = await _context.PerguntasDeclaracaoSaude
                .Where(p => p.ModeloId == modeloId)
                .ToListAsync();

            var ids = perguntaIdsNaOrdem ?? new List<Guid>();
            if (ids.Count != perguntas.Count || ids.Distinct().Count() != perguntas.Count || !ids.All(id => perguntas.Any(p => p.Id == id)))
                throw new ValidationException("A lista de ordenação não corresponde às perguntas do modelo.");

            for (int i = 0; i < ids.Count; i++)
            {
                var pergunta = perguntas.First(p => p.Id == ids[i]);
                pergunta.Editar(pergunta.Pergunta, i + 1);
            }
            await _context.SaveChangesAsync();
        }

        // ----------------- Helpers -----------------

        private async Task<ModeloDeclaracaoSaude> ObterOuFalharAsync(Guid id) =>
            await _context.ModelosDeclaracaoSaude.FirstOrDefaultAsync(m => m.Id == id)
                ?? throw new NotFoundException("Modelo não encontrado.");

        // Bloqueia mudança estrutural em modelo já usado (integridade histórica das respostas).
        private async Task GarantirModeloEditavelAsync(Guid modeloId)
        {
            var existe = await _context.ModelosDeclaracaoSaude.AnyAsync(m => m.Id == modeloId);
            if (!existe) throw new NotFoundException("Modelo não encontrado.");
            if (await _context.SolicitacoesCadastro.AnyAsync(s => s.ModeloId == modeloId))
                throw new ValidationException("Este modelo já foi usado em solicitações. Crie um novo modelo para alterar a declaração.");
        }

        // Torna este o único modelo padrão. Salva em DUAS fases: o índice único FILTRADO em
        // ModeloPadrao=1 não admite duas linhas =1 nem transitoriamente (o EF não garante a ordem
        // dos UPDATEs), então desmarca-se o padrão atual e persiste ANTES de marcar o novo.
        private async Task TornarPadraoAsync(ModeloDeclaracaoSaude modelo)
        {
            var outrosPadrao = await _context.ModelosDeclaracaoSaude
                .Where(m => m.ModeloPadrao && m.Id != modelo.Id)
                .ToListAsync();
            if (outrosPadrao.Count > 0)
            {
                foreach (var outro in outrosPadrao)
                    outro.DefinirComoPadrao(false);
                await _context.SaveChangesAsync();
            }
            modelo.DefinirComoPadrao(true);
            await _context.SaveChangesAsync();
        }

        private static ModeloDetalheResponse MapDetalhe(ModeloDeclaracaoSaude modelo, bool emUso) => new()
        {
            Id = modelo.Id,
            Nome = modelo.Nome,
            ModeloPadrao = modelo.ModeloPadrao,
            PossuiSolicitacoes = emUso,
            Perguntas = modelo.Perguntas
                .OrderBy(p => p.Ordem)
                .Select(p => new PerguntaAdminResponse { Id = p.Id, Pergunta = p.Pergunta, Ordem = p.Ordem })
                .ToList()
        };
    }
}
