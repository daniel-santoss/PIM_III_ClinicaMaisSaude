using System;

namespace ClinicaMaisSaude.Domain.Entities
{
    /// <summary>
    /// Foto de perfil do usuário, em Base64, numa tabela separada (1:1 com Usuario).
    /// Fica fora da tabela de login para que as leituras que NÃO precisam da imagem
    /// (delegação, background service, contagens) não arrastem um nvarchar(max) enorme.
    /// Só é carregada quando a query pede explicitamente (.Include(u => u.Foto)).
    /// </summary>
    public class UsuarioFoto
    {
        public Guid UsuarioId { get; private set; }
        public string FotoBase64 { get; private set; }

        protected UsuarioFoto() { } // EF Core

        public UsuarioFoto(Guid usuarioId, string fotoBase64)
        {
            UsuarioId = usuarioId;
            FotoBase64 = fotoBase64;
        }

        public void Atualizar(string fotoBase64)
        {
            FotoBase64 = fotoBase64;
        }
    }
}
