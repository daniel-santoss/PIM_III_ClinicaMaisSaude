using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Tests.Common
{
    // Detecção do tipo da busca: dígitos (com ou sem máscara) buscam por CPF; o resto, por nome.
    public class CpfTests
    {
        [Theory]
        [InlineData("390", true)]
        [InlineData("390.533.447-05", true)]
        [InlineData(" 39053344705 ", true)]
        [InlineData("Ana", false)]
        [InlineData("Ana 2", false)]
        [InlineData("..-", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        public void EhTermoDeBusca(string? termo, bool esperado)
        {
            Assert.Equal(esperado, Cpf.EhTermoDeBusca(termo));
        }
    }
}
