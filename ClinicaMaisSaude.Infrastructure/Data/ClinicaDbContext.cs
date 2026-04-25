using ClinicaMaisSaude.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaMaisSaude.Infrastructure.Data
{
    public class ClinicaDbContext : DbContext
    {
        public ClinicaDbContext(DbContextOptions<ClinicaDbContext> options) : base(options) { }

        public DbSet<Paciente> Pacientes { get; set; }
        public DbSet<Agendamento> Agendamentos { get; set; }

        // Método que intercepta a criação das tabelas no SQL Server
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Paciente>(entidade =>
            {
                entidade.Property(p => p.Nome)
                    .HasMaxLength(100)
                    .IsRequired();

                entidade.Property(p => p.Cpf)
                    .HasColumnType("varchar(11)")
                    .IsRequired();

                entidade.Property(p => p.Telefone)
                    .HasColumnType("varchar(11)")
                    .IsRequired();

                entidade.Property(p => p.Email)
                    .HasMaxLength(150)
                    .IsRequired();

                entidade.Property(p => p.Ativo)
                    .HasDefaultValue(true);
            });

            modelBuilder.Entity<Agendamento>(entidade =>
            {
                entidade.HasKey(a => a.Id);

                entidade.Property(a => a.DataHoraConsulta)
                    .IsRequired();

                entidade.HasOne(a => a.Paciente)
                    .WithMany(p => p.Agendamentos)
                    .HasForeignKey(a => a.PacienteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}