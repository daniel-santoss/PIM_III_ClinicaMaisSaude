using System;
using System.Security.Cryptography;
using System.Text;

namespace ClinicaMaisSaude.Infrastructure.Services
{
    /// <summary>
    /// Primitivos de criptografia compartilhados pelos fluxos de código de e-mail de uso único
    /// (recuperação de senha e primeiro acesso). Centraliza o formato do código, o HMAC-SHA256+pepper
    /// (o código curto NUNCA é guardado em claro) e o reset token de alta entropia (guardado como
    /// SHA-256). As POLÍTICAS de cada fluxo (expiração, nº de tentativas, throttle) ficam em cada
    /// serviço — aqui mora só a cripto, que precisa ser idêntica nos dois.
    /// </summary>
    public static class CodigoVerificacaoCripto
    {
        // Alfabeto sem caracteres ambíguos (0/O, 1/I/L). 32 símbolos → divide 256 sem viés de módulo.
        private const string Alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        public const int TamanhoCodigo = 6;

        /// <summary>Gera um código de 6 chars com RNG criptográfico (alfabeto sem ambíguos).</summary>
        public static string GerarCodigo()
        {
            Span<byte> bytes = stackalloc byte[TamanhoCodigo];
            RandomNumberGenerator.Fill(bytes);
            var chars = new char[TamanhoCodigo];
            for (int i = 0; i < TamanhoCodigo; i++)
                chars[i] = Alfabeto[bytes[i] % Alfabeto.Length];
            return new string(chars);
        }

        /// <summary>HMAC-SHA256(código maiúsculo, pepper). O código é case-insensitive p/ o usuário.</summary>
        public static byte[] HashCodigoBytes(string codigo, string pepper)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(pepper));
            return hmac.ComputeHash(Encoding.UTF8.GetBytes(codigo.Trim().ToUpperInvariant()));
        }

        public static string HashCodigoHex(string codigo, string pepper) =>
            Convert.ToHexString(HashCodigoBytes(codigo, pepper));

        /// <summary>Reset token de 256 bits (hex) — o segredo em claro, entregue só ao cliente.</summary>
        public static string GerarResetToken() =>
            Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

        /// <summary>SHA-256(reset token) em hex — o que fica guardado no banco.</summary>
        public static string HashResetTokenHex(string token) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }
}
