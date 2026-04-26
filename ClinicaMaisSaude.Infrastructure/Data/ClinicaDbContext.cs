using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;

namespace ClinicaMaisSaude.Infrastructure.Data
{
    public class ClinicaDbContext : DbContext
    {
        public ClinicaDbContext(DbContextOptions<ClinicaDbContext> options) : base(options) { }

        public DbSet<Paciente> Pacientes { get; set; }
        public DbSet<Agendamento> Agendamentos { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Profissional> Profissionais { get; set; }
        public DbSet<StatusAgendamentoLookup> StatusAgendamentoLookup { get; set; }

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

                entidade.Property(a => a.TipoProfissional)
                    .IsRequired();

                entidade.Property(a => a.TipoConsulta)
                    .IsRequired();

                entidade.Property(a => a.Status)
                    .IsRequired();

                entidade.HasOne(a => a.Paciente)
                    .WithMany(p => p.Agendamentos)
                    .HasForeignKey(a => a.PacienteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Usuario>(entidade =>
            {
                entidade.HasKey(u => u.Id);
                entidade.HasIndex(u => u.Email).IsUnique();
                entidade.HasIndex(u => u.Cpf).IsUnique();
                entidade.Property(u => u.Email).IsRequired().HasMaxLength(150);
                entidade.Property(u => u.Cpf).IsRequired().HasMaxLength(14);
                entidade.Property(u => u.SenhaHash).IsRequired();
            });

            modelBuilder.Entity<Profissional>(entidade =>
            {
                entidade.HasKey(p => p.Id);
                entidade.Property(p => p.TipoProfissional).IsRequired();
                entidade.HasOne(p => p.Usuario)
                    .WithMany()
                    .HasForeignKey(p => p.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<StatusAgendamentoLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);

                var statusValores = Enum.GetValues(typeof(StatusAgendamento))
                                        .Cast<StatusAgendamento>()
                                        .Select(s => new StatusAgendamentoLookup
                                        {
                                            Id = s,
                                            Nome = s.ToString()
                                        });

                entidade.HasData(statusValores);
            });
        }
    }
}