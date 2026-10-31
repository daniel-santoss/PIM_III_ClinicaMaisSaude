using ClinicaMaisSaude.Domain.Common;

namespace ClinicaMaisSaude.Domain.Tests.Common
{
    // Médicos e enfermeiras só podem ter e-mail no domínio da clínica.
    public class EmailInstitucionalTests
    {
        [Theory]
        [InlineData("maria.souza@clinicamaissaude.com.br", true)]
        [InlineData(" Maria.Souza@ClinicaMaisSaude.com.br ", true)]
        [InlineData("maria@gmail.com", false)]
        [InlineData("maria@clinicamaissaude.com", false)]
        [InlineData("@clinicamaissaude.com.br", false)]
        [InlineData("a@b@clinicamaissaude.com.br", false)]
        [InlineData("maria", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        public void EhInstitucional(string? email, bool esperado)
        {
            Assert.Equal(esperado, EmailInstitucional.EhInstitucional(email));
        }
    }
}
