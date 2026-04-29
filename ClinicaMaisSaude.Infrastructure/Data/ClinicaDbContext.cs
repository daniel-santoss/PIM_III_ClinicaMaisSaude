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
        public DbSet<AgendamentoHistorico> AgendamentoHistoricos { get; set; }

        // Método que intercepta a criação das tabelas no SQL Server
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Paciente>(entidade =>
            {
                entidade.Property(p => p.Nome).HasMaxLength(100).IsRequired();
                entidade.Property(p => p.Cpf).HasColumnType("varchar(11)").IsRequired();
                entidade.Property(p => p.Telefone).HasColumnType("varchar(11)").IsRequired();
                entidade.Property(p => p.Email).HasMaxLength(150).IsRequired();
                entidade.Property(p => p.Ativo).HasDefaultValue(true);
                entidade.Property(p => p.DtCriado).HasColumnName("Dt_Criado");
            });

            modelBuilder.Entity<Agendamento>(entidade =>
            {
                entidade.HasKey(a => a.Id);
                entidade.Property(a => a.DataHoraConsulta).IsRequired();
                entidade.Property(a => a.TipoProfissional).IsRequired();
                entidade.Property(a => a.TipoConsulta).IsRequired();
                entidade.Property(a => a.Status).IsRequired();
                entidade.Property(a => a.DtCriado).HasColumnName("Dt_Criado");

                entidade.HasOne(a => a.Paciente)
                    .WithMany(p => p.Agendamentos)
                    .HasForeignKey(a => a.PacienteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AgendamentoHistorico>(entidade =>
            {
                entidade.HasKey(h => h.Id);
                entidade.Property(h => h.TipoEvento).IsRequired();
                entidade.Property(h => h.RealizadoPor).IsRequired();
                entidade.Property(h => h.Dt_Criado).IsRequired();

                entidade.HasOne(h => h.Agendamento)
                    .WithMany()
                    .HasForeignKey(h => h.AgendamentoId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Usuario>(entidade =>
            {
                entidade.ToTable("LoginPortal");
                entidade.HasKey(u => u.Id);
                entidade.HasIndex(u => u.Email).IsUnique();
                entidade.HasIndex(u => u.Cpf).IsUnique();
                entidade.Property(u => u.Email).IsRequired().HasMaxLength(150);
                entidade.Property(u => u.Cpf).IsRequired().HasMaxLength(14);
                entidade.Property(u => u.SenhaHash).IsRequired();
                entidade.Property(u => u.IsAdmin).HasDefaultValue(false);
                entidade.Property(u => u.DtCriado).HasColumnName("Dt_Criado");

                // SEED do Admin
                var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
                entidade.HasData(new Usuario(
                    adminId, 
                    "admin@clinicamaissaude.com.br", 
                    "00000000000", 
                    "$2a$11$DaDuHHaqAhlkdCbeVcw6l.ttRvVjLZ8AnOcXvugreEbhe0C1K1YPK", // admin123
                    true, 
                    new DateTime(2026, 04, 26, 0, 0, 0, DateTimeKind.Utc)
                ));
            });

            modelBuilder.Entity<Profissional>(entidade =>
            {
                entidade.HasKey(p => p.Id);
                entidade.Property(p => p.TipoProfissional).IsRequired();
                entidade.Property(p => p.Nome).IsRequired().HasMaxLength(100);
                entidade.Property(p => p.Crm).HasMaxLength(20);
                entidade.Property(p => p.UfCrm).HasMaxLength(2);
                entidade.Property(p => p.DtCriado).HasColumnName("Dt_Criado");

                entidade.HasOne(p => p.Usuario)
                    .WithMany()
                    .HasForeignKey(p => p.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);

                var adminProfissionalId = Guid.Parse("22222222-2222-2222-2222-222222222222");
                var adminUsuarioId = Guid.Parse("11111111-1111-1111-1111-111111111111");
                entidade.HasData(new Profissional(
                    adminProfissionalId,
                    adminUsuarioId,
                    TipoProfissional.Medico,
                    "Dr. Admin",
                    "123456",
                    "SP",
                    new DateTime(2026, 04, 26, 0, 0, 0, DateTimeKind.Utc)
                ));
            });

            modelBuilder.Entity<StatusAgendamentoLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");

                var statusValores = Enum.GetValues(typeof(StatusAgendamento))
                                        .Cast<StatusAgendamento>()
                                        .Select(s => new StatusAgendamentoLookup
                                        {
                                            Id = s,
                                            Nome = s.ToString(),
                                            DtCriado = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                                        });

                entidade.HasData(statusValores);
            });
        }
    }
}