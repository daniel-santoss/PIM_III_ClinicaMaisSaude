using ClinicaMaisSaude.Application.Exceptions;
using ClinicaMaisSaude.Domain.Common;
using ClinicaMaisSaude.Domain.Entities;
using ClinicaMaisSaude.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ClinicaMaisSaude.Infrastructure.Data
{
    public class ClinicaDbContext : DbContext
    {
        public ClinicaDbContext(DbContextOptions<ClinicaDbContext> options) : base(options) { }

        /// <summary>
        /// Traduz o conflito de concorrência otimista do EF (RowVersion divergente) numa
        /// exceção de domínio, que o middleware mapeia para HTTP 409 com mensagem amigável.
        /// </summary>
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            CarimbarAtualizacao();
            try
            {
                return await base.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw new ConflictException("O registro foi modificado por outra operação. Recarregue os dados e tente novamente.");
            }
        }

        // Carimbo central de updated-at: toda entidade IAuditavel modificada recebe a hora
        // atual em ult_Atualizacao. Fica só aqui (nunca nos serviços) para não haver drift.
        private void CarimbarAtualizacao()
        {
            var agora = DateTime.UtcNow;
            foreach (var entry in ChangeTracker.Entries<IAuditavel>())
            {
                if (entry.State == EntityState.Modified)
                    entry.Entity.MarcarAtualizacao(agora);
            }
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.ConfigureWarnings(w =>
                w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }


        public DbSet<Paciente> Pacientes { get; set; }
        public DbSet<Agendamento> Agendamentos { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Pessoa> Pessoas { get; set; }
        public DbSet<Profissional> Profissionais { get; set; }
        public DbSet<StatusAgendamentoLookup> StatusAgendamentoLookup { get; set; }
        public DbSet<SituacaoClienteLookup> SituacaoClienteLookup { get; set; }
        public DbSet<RoleUsuarioLookup> RoleUsuarioLookup { get; set; }
        public DbSet<TipoProfissionalLookup> TipoProfissionalLookup { get; set; }
        public DbSet<SituacaoProfissionalLookup> SituacaoProfissionalLookup { get; set; }
        public DbSet<EspecialidadeLookup> EspecialidadeLookup { get; set; }
        public DbSet<TipoConsultaLookup> TipoConsultaLookup { get; set; }
        public DbSet<TipoEventoHistoricoLookup> TipoEventoHistoricoLookup { get; set; }
        public DbSet<TipoViolacaoLookup> TipoViolacaoLookup { get; set; }
        public DbSet<AgendamentoHistorico> AgendamentoHistoricos { get; set; }
        public DbSet<ProfissionalEspecialidade> ProfissionalEspecialidades { get; set; }
        public DbSet<UsoInadequadoIA> UsoInadequadoIA { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
        public DbSet<CodigoRecuperacaoSenha> CodigosRecuperacaoSenha { get; set; } = null!;
        public DbSet<Notificacao> Notificacoes { get; set; } = null!;
        public DbSet<UsuarioFoto> UsuarioFotos { get; set; } = null!;

        // Método que intercepta a criação das tabelas no SQL Server
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<UsoInadequadoIA>().ToTable("UsoInadequadoIA");

            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Paciente>(entidade =>
            {
                entidade.Property(p => p.TemProblemaMemoria).HasDefaultValue(false);
                entidade.Property(p => p.DtCriado).HasColumnName("Dt_Criado");
                entidade.Property(p => p.UltAtualizacao).HasColumnName("ult_Atualizacao");

                // Situação do cadastro (substitui o antigo bool Ativo): FK ao lookup, default Ativo.
                entidade.Property(p => p.SituacaoCliente).HasDefaultValue(SituacaoCliente.Ativo);
                entidade.HasOne<SituacaoClienteLookup>()
                    .WithMany()
                    .HasForeignKey(p => p.SituacaoCliente)
                    .OnDelete(DeleteBehavior.Restrict);

                // Identidade (Nome/Cpf/Telefone/Email) vive no LoginPortal. O Paciente é um
                // perfil magro que referencia a conta: UsuarioId obrigatório e único (1:1).
                entidade.HasOne(p => p.Usuario)
                    .WithMany()
                    .HasForeignKey(p => p.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
                entidade.HasIndex(p => p.UsuarioId).IsUnique();

                // Identidade (Thread B, aditivo/nulável na B2a).
                entidade.HasOne(p => p.Pessoa)
                    .WithMany()
                    .HasForeignKey(p => p.PessoaId)
                    .OnDelete(DeleteBehavior.Restrict);
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
                entidade.Property(a => a.UltAtualizacao).HasColumnName("ult_Atualizacao");

                // Token de concorrência otimista: SQL Server gera/atualiza automaticamente
                // uma coluna rowversion a cada UPDATE; o EF a inclui na cláusula WHERE do
                // update e lança DbUpdateConcurrencyException se a linha já mudou.
                entidade.Property(a => a.RowVersion).IsRowVersion();

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

                // Integridade referencial (Fase 5): profissional responsável, cadeia de
                // origem (retorno/remarcação, auto-referência) e especialidade. Agora com
                // navegações explícitas (Fase 0) — mesmas FKs, sem mudança de schema.
                entidade.HasOne(a => a.Profissional)
                    .WithMany()
                    .HasForeignKey(a => a.ProfissionalId)
                    .OnDelete(DeleteBehavior.Restrict);

                entidade.HasOne(a => a.AgendamentoOrigem)
                    .WithMany()
                    .HasForeignKey(a => a.AgendamentoOrigemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entidade.HasOne<EspecialidadeLookup>()
                    .WithMany()
                    .HasForeignKey(a => a.EspecialidadeId)
                    .OnDelete(DeleteBehavior.Restrict);

                // FKs para os lookups de referência (integridade dos enums).
                entidade.HasOne<TipoProfissionalLookup>()
                    .WithMany()
                    .HasForeignKey(a => a.TipoProfissional)
                    .OnDelete(DeleteBehavior.Restrict);

                entidade.HasOne<TipoConsultaLookup>()
                    .WithMany()
                    .HasForeignKey(a => a.TipoConsulta)
                    .OnDelete(DeleteBehavior.Restrict);

                entidade.HasOne<StatusAgendamentoLookup>()
                    .WithMany()
                    .HasForeignKey(a => a.Status)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<AgendamentoHistorico>(entidade =>
            {
                entidade.HasKey(h => h.Id);
                entidade.Property(h => h.TipoEvento).IsRequired();
                entidade.Property(h => h.RealizadoPor).IsRequired();
                entidade.Property(h => h.Dt_Criado).IsRequired();

                // Restrict (não Cascade): a trilha de auditoria (RF09) nunca é apagada
                // automaticamente ao remover um agendamento. A exclusão de agendamento é
                // soft-delete (Cancelado); a limpeza de dados de teste remove o histórico
                // explicitamente antes.
                entidade.HasOne(h => h.Agendamento)
                    .WithMany()
                    .HasForeignKey(h => h.AgendamentoId)
                    .OnDelete(DeleteBehavior.Restrict);

                entidade.HasOne<TipoEventoHistoricoLookup>()
                    .WithMany()
                    .HasForeignKey(h => h.TipoEvento)
                    .OnDelete(DeleteBehavior.Restrict);

                // StatusAnterior/StatusNovo são nullable → relação opcional.
                entidade.HasOne<StatusAgendamentoLookup>()
                    .WithMany()
                    .HasForeignKey(h => h.StatusAnterior)
                    .OnDelete(DeleteBehavior.Restrict);

                entidade.HasOne<StatusAgendamentoLookup>()
                    .WithMany()
                    .HasForeignKey(h => h.StatusNovo)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ProfissionalEspecialidade>(entidade =>
            {
                entidade.HasKey(pe => new { pe.ProfissionalId, pe.EspecialidadeId });
                entidade.HasOne(pe => pe.Profissional)
                    .WithMany(p => p.Especialidades)
                    .HasForeignKey(pe => pe.ProfissionalId)
                    .OnDelete(DeleteBehavior.Cascade);

                entidade.HasOne<EspecialidadeLookup>()
                    .WithMany()
                    .HasForeignKey(pe => pe.EspecialidadeId)
                    .OnDelete(DeleteBehavior.Restrict);
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

                entidade.HasOne<TipoViolacaoLookup>()
                    .WithMany()
                    .HasForeignKey(a => a.TipoViolacao)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<RefreshToken>(entidade =>
            {
                entidade.ToTable("RefreshTokens");
                entidade.HasKey(r => r.Id);
                entidade.Property(r => r.Token).IsRequired().HasMaxLength(255);
                entidade.Property(r => r.JwtId).IsRequired().HasMaxLength(255);
                entidade.Property(r => r.DtCriado).HasColumnName("Dt_Criado");
                entidade.Property(r => r.DtExpiracao).HasColumnName("Dt_Expiracao");
                // Todo refresh faz WHERE Token = @token; único evita table scan e duplicidade.
                entidade.HasIndex(r => r.Token).IsUnique();
                entidade.HasOne(r => r.Usuario)
                    .WithMany()
                    .HasForeignKey(r => r.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CodigoRecuperacaoSenha>(entidade =>
            {
                entidade.ToTable("CodigosRecuperacaoSenha");
                entidade.HasKey(c => c.Id);
                entidade.Property(c => c.CodigoHash).IsRequired().HasMaxLength(64);      // HMAC-SHA256 hex
                entidade.Property(c => c.ResetTokenHash).HasMaxLength(64).IsRequired(false); // SHA-256 hex
                entidade.Property(c => c.DtCriado).HasColumnName("Dt_Criado");
                entidade.Property(c => c.DtExpiracao).HasColumnName("Dt_Expiracao");
                entidade.Property(c => c.DtExpiracaoReset).HasColumnName("Dt_Expiracao_Reset");
                // A redefinição faz WHERE ResetTokenHash = @hash; índice acelera e evita scan.
                entidade.HasIndex(c => c.ResetTokenHash);
                // A validação busca o código ativo mais recente do usuário.
                entidade.HasIndex(c => c.UsuarioId);
                entidade.HasOne(c => c.Usuario)
                    .WithMany()
                    .HasForeignKey(c => c.UsuarioId)
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

            // Identidade da pessoa física (Thread B). Espelha as constraints de identidade que
            // hoje moram no LoginPortal; na expand-phase ambas as tabelas guardam os mesmos dados.
            modelBuilder.Entity<Pessoa>(entidade =>
            {
                entidade.ToTable("Pessoas");
                entidade.HasKey(p => p.Id);
                entidade.HasIndex(p => p.Email).IsUnique();
                entidade.HasIndex(p => p.Cpf).IsUnique();
                entidade.Property(p => p.Nome).IsRequired().HasMaxLength(100);
                entidade.Property(p => p.Email).IsRequired().HasMaxLength(150);
                entidade.Property(p => p.Cpf).HasColumnType("varchar(11)").IsRequired();
                entidade.Property(p => p.Telefone).HasColumnType("varchar(11)");
                entidade.Property(p => p.DtCriado).HasColumnName("Dt_Criado");
                entidade.Property(p => p.UltAtualizacao).HasColumnName("ult_Atualizacao");
            });

            modelBuilder.Entity<Usuario>(entidade =>
            {
                entidade.ToTable("LoginPortal");
                entidade.HasKey(u => u.Id);
                // Identidade (Nome/Cpf/Email/Telefone + índices únicos) migrou para a Pessoa (Fase B3).
                entidade.Property(u => u.SenhaHash).IsRequired();
                entidade.Property(u => u.DtCriado).HasColumnName("Dt_Criado");
                entidade.Property(u => u.UltAtualizacao).HasColumnName("ult_Atualizacao");

                // Papel unificado (Fase A). Fonte única do papel após remover TipoUsuario.
                entidade.HasOne<RoleUsuarioLookup>()
                    .WithMany()
                    .HasForeignKey(u => u.Role)
                    .OnDelete(DeleteBehavior.Restrict);

                // Identidade (Thread B, aditivo/nulável na B1). Login vira credencial da Pessoa.
                entidade.HasOne(u => u.Pessoa)
                    .WithMany()
                    .HasForeignKey(u => u.PessoaId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Foto 1:1 em tabela separada (UsuarioFotos), com PK compartilhada. Só é
                // materializada via .Include(u => u.Foto). Cascade: remover o usuário (ou
                // orfanar a navegação) apaga a linha da foto.
                entidade.HasOne(u => u.Foto)
                    .WithOne()
                    .HasForeignKey<UsuarioFoto>(f => f.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);

                // O administrador inicial é criado em runtime por AdminSeeder (senha via
                // configuração), nunca semeado com credencial fixa no código-fonte.
            });

            modelBuilder.Entity<UsuarioFoto>(entidade =>
            {
                entidade.ToTable("UsuarioFotos");
                entidade.HasKey(f => f.UsuarioId);
                entidade.Property(f => f.FotoBase64).HasColumnType("nvarchar(max)").IsRequired();
            });

            modelBuilder.Entity<Profissional>(entidade =>
            {
                entidade.HasKey(p => p.Id);
                entidade.Property(p => p.Crm).HasMaxLength(20);
                entidade.Property(p => p.UfCrm).HasMaxLength(2);
                entidade.Property(p => p.DtCriado).HasColumnName("Dt_Criado");
                entidade.Property(p => p.UltAtualizacao).HasColumnName("ult_Atualizacao");

                // Situação do profissional (Ativo/Inativo): FK ao lookup, default Ativo.
                // Simetria com Paciente.SituacaoCliente (profissional que sai da clínica).
                entidade.Property(p => p.SituacaoProfissional).HasDefaultValue(SituacaoProfissional.Ativo);
                entidade.HasOne<SituacaoProfissionalLookup>()
                    .WithMany()
                    .HasForeignKey(p => p.SituacaoProfissional)
                    .OnDelete(DeleteBehavior.Restrict);

                entidade.HasOne(p => p.Usuario)
                    .WithMany()
                    .HasForeignKey(p => p.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
                entidade.HasIndex(p => p.UsuarioId).IsUnique();
                // TipoProfissional foi removido do Profissional (Fase A3b) — a categoria vem do Role.
                // O lookup TipoProfissionalLookup permanece, referenciado por Agendamento.

                // Identidade (Thread B, aditivo/nulável na B2a).
                entidade.HasOne(p => p.Pessoa)
                    .WithMany()
                    .HasForeignKey(p => p.PessoaId)
                    .OnDelete(DeleteBehavior.Restrict);
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

            var dtSeedLookup = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

            modelBuilder.Entity<SituacaoClienteLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(SituacaoCliente)).Cast<SituacaoCliente>()
                    .Select(v => new SituacaoClienteLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });

            modelBuilder.Entity<SituacaoProfissionalLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(SituacaoProfissional)).Cast<SituacaoProfissional>()
                    .Select(v => new SituacaoProfissionalLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });

            modelBuilder.Entity<RoleUsuarioLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(RoleUsuario)).Cast<RoleUsuario>()
                    .Select(v => new RoleUsuarioLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });

            modelBuilder.Entity<TipoProfissionalLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(TipoProfissional)).Cast<TipoProfissional>()
                    .Select(v => new TipoProfissionalLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });

            modelBuilder.Entity<EspecialidadeLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(EspecialidadeMedica)).Cast<EspecialidadeMedica>()
                    .Select(v => new EspecialidadeLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });

            modelBuilder.Entity<TipoConsultaLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(TipoConsulta)).Cast<TipoConsulta>()
                    .Select(v => new TipoConsultaLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });

            modelBuilder.Entity<TipoEventoHistoricoLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(TipoEventoHistorico)).Cast<TipoEventoHistorico>()
                    .Select(v => new TipoEventoHistoricoLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });

            modelBuilder.Entity<TipoViolacaoLookup>(entidade =>
            {
                entidade.HasKey(s => s.Id);
                entidade.Property(s => s.Id).HasConversion<int>().ValueGeneratedNever();
                entidade.Property(s => s.Nome).IsRequired().HasMaxLength(50);
                entidade.Property(s => s.DtCriado).HasColumnName("Dt_Criado");
                entidade.HasData(Enum.GetValues(typeof(TipoViolacao)).Cast<TipoViolacao>()
                    .Select(v => new TipoViolacaoLookup { Id = v, Nome = v.ToString(), DtCriado = dtSeedLookup }));
            });
        }
    }
}