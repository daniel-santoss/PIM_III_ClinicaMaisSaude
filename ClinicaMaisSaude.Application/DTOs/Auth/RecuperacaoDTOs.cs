namespace ClinicaMaisSaude.Application.DTOs.Auth
{
    /// <summary>Passo 1: informa CPF ou e-mail para receber o código.</summary>
    public class SolicitarRecuperacaoRequest
    {
        public string Identificador { get; set; } = string.Empty;
    }

    /// <summary>Passo 2: envia o código recebido para validação.</summary>
    public class ValidarCodigoRequest
    {
        public string Identificador { get; set; } = string.Empty;
        public string Codigo { get; set; } = string.Empty;
    }

    public class ValidarCodigoResponse
    {
        public string ResetToken { get; set; } = string.Empty;
    }

    /// <summary>Passo 3: define a nova senha usando o reset token do passo 2.</summary>
    public class RedefinirSenhaRequest
    {
        public string ResetToken { get; set; } = string.Empty;
        public string NovaSenha { get; set; } = string.Empty;
    }

    /// <summary>Resposta genérica de mensagem (não revela estado interno).</summary>
    public class MensagemResponse
    {
        public string Mensagem { get; set; } = string.Empty;
    }
}
