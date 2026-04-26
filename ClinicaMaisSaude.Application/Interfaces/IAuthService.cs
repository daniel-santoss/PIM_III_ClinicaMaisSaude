using ClinicaMaisSaude.Application.DTOs.Auth;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Application.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponse> AutenticarAsync(LoginRequest request);
    }
}
