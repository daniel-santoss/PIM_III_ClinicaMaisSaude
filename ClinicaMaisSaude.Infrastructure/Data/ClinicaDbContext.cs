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

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.ConfigureWarnings(w =>
                w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }


        public DbSet<Paciente> Pacientes { get; set; }
        public DbSet<Agendamento> Agendamentos { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Profissional> Profissionais { get; set; }
        public DbSet<StatusAgendamentoLookup> StatusAgendamentoLookup { get; set; }
        public DbSet<AgendamentoHistorico> AgendamentoHistoricos { get; set; }
        public DbSet<ProfissionalEspecialidade> ProfissionalEspecialidades { get; set; }
        public DbSet<UsoInadequadoIA> ViolacoesIA { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
        public DbSet<Notificacao> Notificacoes { get; set; } = null!;

        // Método que intercepta a criação das tabelas no SQL Server
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<UsoInadequadoIA>().ToTable("UsoInadequadoIA");

            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Paciente>(entidade =>
            {
                entidade.Property(p => p.Nome).HasMaxLength(100).IsRequired();
                entidade.Property(p => p.Cpf).HasColumnType("varchar(11)").IsRequired();
                entidade.Property(p => p.Telefone).HasColumnType("varchar(11)").IsRequired();
                entidade.Property(p => p.Email).HasMaxLength(150).IsRequired();
                entidade.Property(p => p.Ativo).HasDefaultValue(true);
                entidade.Property(p => p.TemProblemaMemoria).HasDefaultValue(false);
                entidade.Property(p => p.DtCriado).HasColumnName("Dt_Criado");
                // Busca por CPF (exact match no cadastro/login e StartsWith na listagem).
                entidade.HasIndex(p => p.Cpf);
            });

            modelBuilder.Entity<Agendamento>(entidade =>
            {
                entidade.HasKey(a => a.Id);
                entidade.Property(a => a.DataHoraConsulta).IsRequired();
                entidade.Property(a => a.TipoProfissional).IsRequired();
                entidade.Property(a => a.TipoConsulta).IsRequired();
                entidade.Property(a => a.Status).IsRequired();
                entidade.Property(a => a.EspecialidadeId).IsRequired(false);
                entidade.Property(a => a.NotificacaoPendenteGerada).HasDefaultValue(false);
                entidade.Property(a => a.LembreteManhaEnviado).HasDefaultValue(false);
                entidade.Property(a => a.LembreteDuasHorasEnviado).HasDefaultValue(false);
                entidade.Property(a => a.DtCriado).HasColumnName("Dt_Criado");

                // Índices para os caminhos de acesso quentes (agenda do profissional,
                // consultas do paciente, varredura por status), sempre com a data como
                // chave secundária para cobrir a ordenação por DataHoraConsulta.
                entidade.HasIndex(a => new { a.ProfissionalId, a.DataHoraConsulta });
                entidade.HasIndex(a => new { a.PacienteId, a.DataHoraConsulta });
                entidade.HasIndex(a => new { a.Status, a.DataHoraConsulta });

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

            modelBuilder.Entity<ProfissionalEspecialidade>(entidade =>
            {
                entidade.HasKey(pe => new { pe.ProfissionalId, pe.EspecialidadeId });
                entidade.HasOne(pe => pe.Profissional)
                    .WithMany(p => p.Especialidades)
                    .HasForeignKey(pe => pe.ProfissionalId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<UsoInadequadoIA>(entidade =>
            {
                entidade.ToTable("UsoInadequadoIA");
                entidade.HasKey(a => a.Id);
                entidade.Property(a => a.TipoViolacao).IsRequired();
                entidade.Property(a => a.TextoInserido).IsRequired().HasMaxLength(500);
                entidade.Property(a => a.DtCriado).HasColumnName("Dt_Criado");

                entidade.HasOne(a => a.Usuario)
                    .WithMany(u => u.Violacoes)
                    .HasForeignKey(a => a.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<RefreshToken>(entidade =>
            {
                entidade.ToTable("RefreshTokens");
                entidade.HasKey(r => r.Id);
                entidade.Property(r => r.Token).IsRequired().HasMaxLength(255);
                entidade.Property(r => r.JwtId).IsRequired().HasMaxLength(255);
                // Todo refresh faz WHERE Token = @token; único evita table scan e duplicidade.
                entidade.HasIndex(r => r.Token).IsUnique();
                entidade.HasOne(r => r.Usuario)
                    .WithMany()
                    .HasForeignKey(r => r.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Notificacao>(entidade =>
            {
                entidade.ToTable("Notificacoes");
                entidade.HasKey(n => n.Id);
                entidade.Property(n => n.Titulo).IsRequired().HasMaxLength(150);
                entidade.Property(n => n.Mensagem).IsRequired().HasMaxLength(500);
                entidade.Property(n => n.Link).HasMaxLength(255).IsRequired(false);
                entidade.Property(n => n.Lida).HasDefaultValue(false);
                entidade.Property(n => n.DtCriado).HasColumnName("Dt_Criado");
                // Polling a cada 60s: WHERE UsuarioId = @id ORDER BY DtCriado DESC.
                entidade.HasIndex(n => new { n.UsuarioId, n.DtCriado });

                entidade.HasOne<Usuario>()
                    .WithMany()
                    .HasForeignKey(n => n.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);

                entidade.HasOne<Agendamento>()
                    .WithMany()
                    .HasForeignKey(n => n.AgendamentoId)
                    .OnDelete(DeleteBehavior.SetNull);
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
                entidade.Property(u => u.FotoBase64).HasColumnType("nvarchar(max)").IsRequired(false);
                // O administrador inicial é criado em runtime por AdminSeeder (senha via
                // configuração), nunca semeado com credencial fixa no código-fonte.
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