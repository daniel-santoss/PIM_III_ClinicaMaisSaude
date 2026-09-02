namespace ClinicaMaisSaude.Application.DTOs.AutoCadastro
{
    /// <summary>Passo 1 do wizard web: pede o código de verificação para o e-mail informado.</summary>
    public class SolicitarVerificacaoEmailRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    /// <summary>Passo 2: confirma o código recebido; devolve um token que prova o e-mail verificado.</summary>
    public class ConfirmarVerificacaoEmailRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Codigo { get; set; } = string.Empty;
    }

    /// <summary>Token de e-mail verificado — exigido depois no envio da solicitação (amarra o e-mail).</summary>
    public class VerificacaoEmailTokenResponse
    {
        public string Token { get; set; } = string.Empty;
    }
}
