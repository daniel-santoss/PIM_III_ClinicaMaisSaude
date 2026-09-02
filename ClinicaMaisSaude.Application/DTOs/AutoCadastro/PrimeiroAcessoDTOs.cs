namespace ClinicaMaisSaude.Application.DTOs.AutoCadastro
{
    /// <summary>Passo 1 do 1º acesso: proponente aprovado pede o código (CPF ou e-mail cadastrado).</summary>
    public class SolicitarPrimeiroAcessoRequest
    {
        public string Identificador { get; set; } = string.Empty;
    }

    /// <summary>Passo 2: confirma o código recebido + o CPF; devolve um reset token de uso único.</summary>
    public class ConfirmarPrimeiroAcessoRequest
    {
        public string Cpf { get; set; } = string.Empty;
        public string Codigo { get; set; } = string.Empty;
    }

    /// <summary>Passo 3: define a senha de acesso com o reset token do passo 2 (cria a conta).</summary>
    public class DefinirSenhaPrimeiroAcessoRequest
    {
        public string ResetToken { get; set; } = string.Empty;
        public string NovaSenha { get; set; } = string.Empty;
    }
}
