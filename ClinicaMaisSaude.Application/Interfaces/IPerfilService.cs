namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IPerfilService
    {
        Task<object?> ObterPerfilAsync(Guid usuarioId, string tipoUsuario);
        Task<string?> AtualizarPerfilAsync(Guid usuarioId, string tipoUsuario, string? nome, string? email, string? telefone);
        Task<string?> AlterarSenhaAsync(Guid usuarioId, string senhaAtual, string novaSenha);
    }
}
