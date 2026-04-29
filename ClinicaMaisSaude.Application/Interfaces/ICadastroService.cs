using ClinicaMaisSaude.Application.DTOs.Auth;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface ICadastroService
    {
        Task<CadastroResult> CadastrarAsync(CadastroRequest request);
        Task<IEnumerable<UsuarioResponse>> ListarUsuariosAsync();
        Task<CadastroResult> RedefinirSenhaAsync(Guid id, string novaSenha);
    }

    public class CadastroResult
    {
        public bool Sucesso { get; set; }
        public string Mensagem { get; set; } = string.Empty;
    }

    public class UsuarioResponse
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string TipoUsuario { get; set; } = string.Empty;
    }
}
