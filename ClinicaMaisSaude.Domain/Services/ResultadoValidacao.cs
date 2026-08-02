namespace ClinicaMaisSaude.Domain.Services
{
    /// <summary>
    /// Resultado de uma validação de regra de domínio — evita que classes puras do Domain
    /// precisem lançar exceções da camada Application (que ficaria de "cabeça para baixo"
    /// na Clean Architecture). Quem chama decide o que fazer com uma validação inválida
    /// (ex.: o Application converte em BusinessRuleException).
    /// </summary>
    public readonly struct ResultadoValidacao
    {
        public bool EhValida { get; }
        public string? MensagemErro { get; }

        private ResultadoValidacao(bool ehValida, string? mensagemErro)
        {
            EhValida = ehValida;
            MensagemErro = mensagemErro;
        }

        public static ResultadoValidacao Valida() => new(true, null);
        public static ResultadoValidacao Invalida(string mensagemErro) => new(false, mensagemErro);
    }
}
